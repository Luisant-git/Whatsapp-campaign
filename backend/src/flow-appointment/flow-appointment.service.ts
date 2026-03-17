import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { CentralPrismaService } from '../central-prisma.service';

@Injectable()
export class FlowAppointmentService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private centralPrisma: CentralPrismaService,
  ) {}

  async saveAppointment(data: any, userId: number) {
    const prisma = await this.getTenantClient(userId);
    return (prisma as any).flowAppointment.create({
      data: {
        department: data.department,
        location: data.location,
        date: data.date,
        time: data.time,
        name: data.name,
        email: data.email,
        phone: data.phone,
        moreDetails: data.more_details,
      },
    });
  }

  async saveAppointmentFromFlow(data: any) {
    try {
      console.log('🔍 Raw flow data received:', JSON.stringify(data, null, 2));
      
      // Extract data from nested structure if needed
      let appointmentData = data;
      if (data.screen_data) {
        appointmentData = data.screen_data;
      }
      
      console.log('📋 Processed appointment data:', JSON.stringify(appointmentData, null, 2));
      
      const tenants = await this.centralPrisma.tenant.findMany({ where: { isActive: true } });
      
      if (tenants.length > 0) {
        const tenant = tenants[0];
        const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
        const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
        
        const appointmentRecord = {
          department: appointmentData.department || appointmentData.selected_department || '',
          location: appointmentData.location || appointmentData.selected_location || '',
          date: appointmentData.date || appointmentData.selected_date || '',
          time: appointmentData.time || appointmentData.selected_time || appointmentData.time_slot || '',
          name: appointmentData.name || appointmentData.full_name || '',
          email: appointmentData.email || appointmentData.email_address || '',
          phone: appointmentData.phone || appointmentData.phone_number || '',
          moreDetails: appointmentData.more_details || appointmentData.additional_details || appointmentData.details || null,
        };
        
        console.log('💾 Saving appointment record:', JSON.stringify(appointmentRecord, null, 2));
        
        await (tenantClient as any).flowAppointment.create({
          data: appointmentRecord,
        });
        console.log('✅ Flow appointment saved successfully');
      }
    } catch (error) {
      console.error('❌ Error saving flow appointment:', error);
      throw error;
    }
  }

  async saveAppointmentFromWebhook(responseData: any, phoneNumber: string, phoneNumberId: string) {
    try {
      console.log('Raw responseData:', JSON.stringify(responseData, null, 2));
      
      const tenants = await this.centralPrisma.tenant.findMany({ where: { isActive: true } });
      
      for (const tenant of tenants) {
        const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
        const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
        
        const settings = await (tenantClient as any).whatsAppSettings.findFirst({
          where: { phoneNumberId }
        });
        
        if (settings) {
          await (tenantClient as any).flowAppointment.create({
            data: {
              department: responseData.department || '',
              location: responseData.location || '',
              date: responseData.date || '',
              time: responseData.time || '',
              name: responseData.name || '',
              email: responseData.email || '',
              phone: responseData.phone || phoneNumber,
              moreDetails: responseData.more_details || null,
            },
          });
          console.log('✅ Flow appointment saved successfully');
          return;
        }
      }
    } catch (error) {
      console.error('Error saving flow appointment:', error);
    }
  }

  async getAppointments(userId: number) {
    console.log('🔍 Getting appointments for user/tenant ID:', userId);
    
    try {
      const prisma = await this.getTenantClient(userId);
      const appointments = await (prisma as any).flowAppointment.findMany({
        orderBy: { createdAt: 'desc' },
      });
      
      console.log(`📋 Found ${appointments.length} appointments for tenant ${userId}:`, appointments);
      return appointments;
    } catch (error) {
      console.error('❌ Error getting appointments for tenant', userId, ':', error.message);
      
      // Fallback: try to get appointments from all tenants if user tenant fails
      console.log('🔄 Trying to get appointments from all active tenants...');
      const tenants = await this.centralPrisma.tenant.findMany({ where: { isActive: true } });
      
      for (const tenant of tenants) {
        try {
          const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
          const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
          
          const appointments = await (tenantClient as any).flowAppointment.findMany({
            orderBy: { createdAt: 'desc' },
          });
          
          if (appointments.length > 0) {
            console.log(`✅ Found ${appointments.length} appointments in tenant ${tenant.id} (${tenant.name})`);
            return appointments;
          }
        } catch (tenantError) {
          console.log(`⚠️ No appointments in tenant ${tenant.id}:`, tenantError.message);
        }
      }
      
      return [];
    }
  }
  
  async deleteAppointment(appointmentId: number, userId: number) {
    const prisma = await this.getTenantClient(userId);
    return (prisma as any).flowAppointment.delete({
      where: { id: appointmentId }
    });
  }
  
  async getDepartments() {
    try {
      console.log('🔍 Getting departments from database...');
      const tenants = await this.centralPrisma.tenant.findMany({ where: { isActive: true } });
      console.log(`📊 Found ${tenants.length} active tenants`);
      
      if (tenants.length > 0) {
        const tenant = tenants[0];
        console.log(`🏢 Using tenant: ${tenant.name} (ID: ${tenant.id})`);
        
        const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
        const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
        
        const departments = await (tenantClient as any).flowDepartment.findMany({
          where: { isActive: true }
        });
        
        console.log(`📋 Found ${departments.length} departments:`, departments);
        return departments.map(d => ({ id: d.name, title: d.title }));
      }
      
      console.log('⚠️ No active tenants found, returning empty array');
      return [];
    } catch (error) {
      console.error('❌ Error getting departments:', error.message);
      return [];
    }
  }
  
  async getLocations() {
    const tenants = await this.centralPrisma.tenant.findMany({ where: { isActive: true } });
    if (tenants.length > 0) {
      const tenant = tenants[0];
      const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
      const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
      
      const locations = await (tenantClient as any).flowLocation.findMany({
        where: { isActive: true }
      });
      
      return locations.map(l => ({ id: l.name, title: l.title }));
    }
    return [];
  }
  
  async getTimeSlots() {
    const tenants = await this.centralPrisma.tenant.findMany({ where: { isActive: true } });
    if (tenants.length > 0) {
      const tenant = tenants[0];
      const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
      const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
      
      const timeSlots = await (tenantClient as any).flowTimeSlot.findMany();
      
      return timeSlots.map(t => ({ 
        id: t.time, 
        title: t.title,
        ...(t.isEnabled === false && { enabled: false })
      }));
    }
    return [];
  }
  
  async getDepartmentTitle(name: string): Promise<string> {
    const tenants = await this.centralPrisma.tenant.findMany({ where: { isActive: true } });
    if (tenants.length > 0) {
      const tenant = tenants[0];
      const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
      const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
      
      const dept = await (tenantClient as any).flowDepartment.findFirst({
        where: { name }
      });
      
      return dept?.title || name;
    }
    return name;
  }
  
  async getLocationTitle(name: string): Promise<string> {
    const tenants = await this.centralPrisma.tenant.findMany({ where: { isActive: true } });
    if (tenants.length > 0) {
      const tenant = tenants[0];
      const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
      const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
      
      const loc = await (tenantClient as any).flowLocation.findFirst({
        where: { name }
      });
      
      return loc?.title || name;
    }
    return name;
  }

  // Get complete appointment data for flow initialization
  async getCompleteAppointmentData(tenantId?: number) {
    try {
      if (!tenantId) {
        return this.getDefaultAppointmentData();
      }

      // Get tenant database client
      const tenant = await this.centralPrisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) {
        return this.getDefaultAppointmentData();
      }

      const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
      const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);

      // Get departments from database
      const departments = await (tenantClient as any).flowDepartment.findMany({
        where: { isActive: true },
        select: { name: true, title: true }
      });

      // Get locations from database
      const locations = await (tenantClient as any).flowLocation.findMany({
        where: { isActive: true },
        select: { name: true, title: true }
      });

      // Get time slots from database
      const timeSlots = await (tenantClient as any).flowTimeSlot.findMany({
        where: { isEnabled: true },
        select: { time: true, title: true }
      });

      // Generate available dates (next 14 days)
      const dates = this.generateAvailableDates(14);

      return {
        departments: departments.map(d => ({ id: d.name, title: d.title })),
        locations: locations.map(l => ({ id: l.name, title: l.title })),
        dates: dates,
        time_slots: timeSlots.map(t => ({ id: t.time, title: t.title }))
      };
    } catch (error) {
      console.error('Error fetching complete appointment data:', error);
      return this.getDefaultAppointmentData();
    }
  }

  // Get user information from contacts or previous interactions
  async getUserInfo(phoneNumber: string, tenantId?: number) {
    try {
      if (!tenantId) {
        return { phone: phoneNumber };
      }

      // Get tenant database client
      const tenant = await this.centralPrisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) {
        return { phone: phoneNumber };
      }

      const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
      const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);

      // Try to find user in contacts
      const contact = await (tenantClient as any).contact.findFirst({
        where: { 
          OR: [
            { phone: phoneNumber },
            { phone: phoneNumber.replace(/^\+/, '') }, // Try without +
            { phone: `+${phoneNumber}` } // Try with +
          ]
        },
        select: { name: true, email: true, phone: true }
      });

      if (contact) {
        return {
          name: contact.name,
          email: contact.email,
          phone: contact.phone || phoneNumber
        };
      }

      // Try to find in previous flow appointments
      const previousAppointment = await (tenantClient as any).flowAppointment.findFirst({
        where: { phone: phoneNumber },
        orderBy: { createdAt: 'desc' },
        select: { name: true, email: true, phone: true }
      });

      if (previousAppointment) {
        return {
          name: previousAppointment.name,
          email: previousAppointment.email,
          phone: previousAppointment.phone
        };
      }

      return { phone: phoneNumber };
    } catch (error) {
      console.error('Error fetching user info:', error);
      return { phone: phoneNumber };
    }
  }

  // Generate available dates
  private generateAvailableDates(days: number): Array<{id: string, title: string}> {
    const dates: Array<{id: string, title: string}> = [];
    const today = new Date();
    
    for (let i = 1; i <= days; i++) { // Start from tomorrow
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dateStr = date.toISOString().split('T')[0];
      const dateTitle = date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: '2-digit', 
        year: 'numeric' 
      });
      
      dates.push({
        id: dateStr,
        title: dateTitle
      });
    }
    
    return dates;
  }

  private getDefaultAppointmentData() {
    return {
      departments: [
        { id: 'sales', title: 'Sales Department' },
        { id: 'support', title: 'Customer Support' },
        { id: 'technical', title: 'Technical Support' },
        { id: 'billing', title: 'Billing & Accounts' }
      ],
      locations: [
        { id: 'new_york', title: 'New York Office' },
        { id: 'london', title: 'London Office' },
        { id: 'singapore', title: 'Singapore Office' },
        { id: 'remote', title: 'Remote/Online' }
      ],
      dates: this.generateAvailableDates(7),
      time_slots: [
        { id: '09:00', title: '9:00 AM' },
        { id: '10:00', title: '10:00 AM' },
        { id: '11:00', title: '11:00 AM' },
        { id: '14:00', title: '2:00 PM' },
        { id: '15:00', title: '3:00 PM' },
        { id: '16:00', title: '4:00 PM' }
      ]
    };
  }

  private async getTenantClient(userId: number) {
    const tenant = await this.centralPrisma.tenant.findUnique({ where: { id: userId } });
    if (!tenant) throw new Error('Tenant not found');
    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
    return this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
  }
}
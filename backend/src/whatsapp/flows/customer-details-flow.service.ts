import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../tenant-prisma.service';
import { CentralPrismaService } from '../../central-prisma.service';

@Injectable()
export class CustomerDetailsFlowService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private centralPrisma: CentralPrismaService,
  ) {}

  async saveCustomerDetailsFromFlow(data: any, flowToken?: string) {
    try {
      console.log('🔍 Raw customer details from flow:', JSON.stringify(data, null, 2));
      console.log('🔍 Flow token:', flowToken);
      
      // Extract data from nested structure if needed
      let customerData = data;
      if (data.screen_data) {
        customerData = data.screen_data;
      }
      
      console.log('📋 Processed customer data:', JSON.stringify(customerData, null, 2));
      
      const customerRecord = {
        customerName: customerData.customer_name || customerData.customerName || '',
        customerAddress: customerData.customer_address || customerData.customerAddress || '',
        customerCity: customerData.customer_city || customerData.customerCity || '',
        customerPincode: customerData.customer_pincode || customerData.customerPincode || '',
        paymentMethod: customerData.payment_method || customerData.paymentMethod || 'cod',
      };
      
      console.log('💾 Customer record to save:', JSON.stringify(customerRecord, null, 2));
      
      // Save to all active tenants to ensure it appears in all dashboards
      const tenants = await this.centralPrisma.tenant.findMany({ where: { isActive: true } });
      
      for (const tenant of tenants) {
        try {
          const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
          const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
          
          // Save customer details (you can create a customerDetails table or use existing customer table)
          // For now, we'll return the data to be handled by the calling service
          console.log(`✅ Customer details processed for tenant ${tenant.id} (${tenant.name})`);
        } catch (tenantError) {
          console.error(`❌ Error processing for tenant ${tenant.id}:`, tenantError.message);
        }
      }
      
      return customerRecord;
    } catch (error) {
      console.error('❌ Error saving customer details from flow:', error);
      throw error;
    }
  }

  async getCustomerByPhone(phone: string, tenantId?: number) {
    try {
      if (!tenantId) {
        // Try to find customer in all tenants
        const tenants = await this.centralPrisma.tenant.findMany({ where: { isActive: true } });
        
        for (const tenant of tenants) {
          try {
            const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
            const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
            
            // Check if the client has the required table/method
            if (!(tenantClient as any).customer) {
              console.log(`⚠️ Customer table not found in tenant ${tenant.id}`);
              continue;
            }
            
            const customer = await (tenantClient as any).customer.findFirst({
              where: { 
                OR: [
                  { customerPhone: phone },
                  { customerPhone: phone.replace(/^\\+/, '') }, // Try without +
                  { customerPhone: `+${phone}` } // Try with +
                ]
              }
            });
            
            if (customer) {
              return customer;
            }
          } catch (tenantError) {
            console.log(`⚠️ No customer found in tenant ${tenant.id}:`, tenantError.message);
          }
        }
        
        return null;
      }
      
      // Get specific tenant
      const tenant = await this.centralPrisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) return null;
      
      const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
      const tenantClient = this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
      
      // Check if the client has the required table/method
      if (!(tenantClient as any).customer) {
        console.log(`⚠️ Customer table not found in tenant ${tenantId}`);
        return null;
      }
      
      const customer = await (tenantClient as any).customer.findFirst({
        where: { 
          OR: [
            { customerPhone: phone },
            { customerPhone: phone.replace(/^\\+/, '') },
            { customerPhone: `+${phone}` }
          ]
        }
      });
      
      return customer;
    } catch (error) {
      console.error('Error fetching customer by phone:', error);
      return null;
    }
  }

  private async getTenantClient(userId: number) {
    const tenant = await this.centralPrisma.tenant.findUnique({ where: { id: userId } });
    if (!tenant) throw new Error('Tenant not found');
    const dbUrl = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}`;
    return this.tenantPrisma.getTenantClient(tenant.id.toString(), dbUrl);
  }
}
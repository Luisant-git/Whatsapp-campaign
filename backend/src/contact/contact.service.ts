import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LabelsGateway } from '../labels/labels.gateway';

@Injectable()
export class ContactService {
  constructor(
    private prisma: PrismaService,
    private labelsGateway: LabelsGateway,
  ) {}

 


 
  private formatPhoneNumber(phone: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    // Always add 91 prefix for 10 digit numbers
    if (cleanPhone.length === 10) {
      return `91${cleanPhone}`;
    }

    return cleanPhone;
  }

  /* ============================
   CREATE CONTACT
   ============================ */
async create(data: any, userId: number) {
  // Format phone number
  const phone = this.formatPhoneNumber(data.phone);

  // Check if contact already exists
  const existing = await this.prisma.contact.findFirst({
    where: { phone, userId },
  });

  if (existing) {
    throw new NotFoundException(
      'Contact with this phone number already exists',
    );
  }

  // Convert DOB/Anniversary to Date objects if provided
  const dob = data.dob ? new Date(data.dob) : null;
  const anniversary = data.anniversary ? new Date(data.anniversary) : null;

  // Build data object
  const contactData: any = {
    name: data.name,
    phone,
    email: data.email,
    place: data.place,
    dob,
    anniversary,
    user: { connect: { id: userId } },
  };

  // Connect or create group if a name was supplied
  if (data.group) {
    contactData.group = {
      connectOrCreate: {
        where: {
          name_userId: {
            name: data.group,
            userId: userId,
          },
        },
        create: {
          name: data.group,
          user: { connect: { id: userId } },
        },
      },
    };

  
  }

  return this.prisma.contact.create({ data: contactData });
}

async findAll(
  userId: number,
  page: number = 1,
  limit: number = 10,
  search: string = '',
) {
  const skip = (page - 1) * limit;

  // 1) Find all phones that have 'stop' label
  const stopLabeled = await this.prisma.chatLabel.findMany({
    where: {
      userId,
      labels: { hasSome: ['Stop', 'stop'] },  // accept both
    },
    select: { phone: true },
  });
  const stopPhones = stopLabeled.map((x) => x.phone);

  // 2) Base where clause, excluding stop phones if any
  const where: any = {
    userId,
    ...(stopPhones.length ? { phone: { notIn: stopPhones } } : {}),
  };

  // 3) Search filters
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      {
        group: {
          name: { contains: search, mode: 'insensitive' },
        },
      },
    ];
  }

  const [contacts, total] = await Promise.all([
    this.prisma.contact.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        group: { select: { name: true } },
      },
    }),
    this.prisma.contact.count({ where }),
  ]);

  return {
    data: contacts,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

  

//  /* ============================
//    FIND SINGLE CONTACT
//    ============================ */
// async getContactById(id: number, userId: number) {
//   const contact = await this.prisma.contact.findFirst({
//     where: {
//       id: id,
//       userId: userId,
//     },
//   });

//   if (!contact) {
//     throw new NotFoundException('Contact not found');
//   }

//   return contact;
// }

  /* ============================
    getCONTACTby group
     ============================ */
     async getContactsByGroup(groupId: number, userId: number) {
      return this.prisma.contact.findMany({
        where: { groupId, userId },
        select: {
          id: true,
          name: true,
          phone: true,
        },
        orderBy: { name: 'asc' },
      });
    }
     


    
  /* ============================
    getBlocklistedContacts
     ============================ */
     async getBlocklistedContacts(userId: number) {
      const labeled = await this.prisma.chatLabel.findMany({
        where: {
          userId,
          labels: { hasSome: ['Stop', 'stop'] },  // accept both
        },
        select: { phone: true },
      });
    
      if (labeled.length === 0) return [];
    
      const phones = labeled.map((l) => l.phone);
    
      const results = await this.prisma.contact.findMany({
        where: { phone: { in: phones }, userId },
        include: { group: true },
      });
    
      return results;
    }

  /* ============================
     UPDATE CONTACT
     ============================ */
     
     async update(id: number, data: any, userId: number) {
      // TEMP: skip getContactById to avoid bad findFirst
      // await this.getContactById(id, userId);
    
      const phone = this.formatPhoneNumber(data.phone);
      const dob = data.dob ? new Date(data.dob) : null;
      const anniversary = data.anniversary ? new Date(data.anniversary) : null;
    
      const updateData: any = {
        name: data.name,
        phone,
        email: data.email,
        place: data.place,
        dob,
        anniversary,
      };
    
      if (data.group) {
        updateData.group = {
          connectOrCreate: {
            where: {
              name_userId: { name: data.group, userId },
            },
            create: {
              name: data.group,
              user: { connect: { id: userId } },
            },
          },
        };
      }
    
      return this.prisma.contact.update({
        where: { id },
        data: updateData,
      });
    }
    
    async remove(id: number, userId: number) {
      // TEMP: skip getContactById
      // await this.getContactById(id, userId);
    
      return this.prisma.contact.delete({
        where: { id },
      });
    }
  /* ============================
     DELIVERY STATS
     ============================ */
  async getDeliveryStats(userId: number) {
    const total = await this.prisma.contact.count({
      where: { userId },
    });

    return {
      delivered: 0,
      failed: 0,
      pending: 0,
    };
  }

  async updateDeliveryStatus(
    phone: string,
    status: string,
    campaignName: string,
    name: string,
    userId: number,
  ) {
    await this.prisma.contact.upsert({
      where: {
        phone_userId: {
          phone,
          userId,
        },
      },
      update: {
        name: name || phone,
        lastMessageDate: new Date(),
      },
      create: {
        name: name || phone,
        phone,
        lastMessageDate: new Date(),
        userId,
        groupId:1, // ✅ REQUIRED FIX
      },
    });
  }
  

  /* ============================
     GROUPS
     ============================ */
     async getGroups(userId: number) {
      const contacts = await this.prisma.contact.findMany({
        where: { userId },
        select: { groupId: true },
        distinct: ['groupId'],
      });
    
      return contacts.map(c => c.groupId);
    }
    
    

  /* ============================
     LABELS
     ============================ */
  async getLabels(userId: number) {
    const labels = await this.prisma.chatLabel.findMany({
      where: { userId },
    });

    const result: Record<string, string[]> = {};
    labels.forEach(label => {
      result[label.phone] = label.labels;
    });

    return result;
  }

  async getCustomLabels(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { customLabels: true },
    });

    return user?.customLabels || [];
  }

  async addCustomLabel(userId: number, label: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { customLabels: true },
    });

    const customLabels = user?.customLabels || [];

    if (!customLabels.includes(label)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { customLabels: [...customLabels, label] },
      });
    }

    return { success: true };
  }

  async deleteCustomLabel(userId: number, label: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { customLabels: true },
    });

    const customLabels = (user?.customLabels || []).filter(
      l => l !== label,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { customLabels },
    });

    // Remove label from all chats
    const chatLabels = await this.prisma.chatLabel.findMany({
      where: { userId },
    });

    for (const chat of chatLabels) {
      if (chat.labels.includes(label)) {
        await this.prisma.chatLabel.update({
          where: { id: chat.id },
          data: { labels: chat.labels.filter(l => l !== label) },
        });
      }
    }

    return { success: true };
  }

  async updateLabels(userId: number, phone: string, labels: string[]) {
    const result = await this.prisma.chatLabel.upsert({
      where: {
        phone_userId: {
          phone,
          userId,
        },
      },
      update: { labels },
      create: { phone, labels, userId },
    });
    
    this.labelsGateway.emitLabelUpdate(userId, phone, labels);
    return result;
  }
  

  async removeLabel(userId: number, phone: string, label: string) {
    const existing = await this.prisma.chatLabel.findUnique({
      where: {
        phone_userId: {
          phone,
          userId,
        },
      },
    });
  
    if (!existing) return { success: true };
  
    const newLabels = existing.labels.filter((l) => l !== label);
    await this.updateLabels(userId, phone, newLabels);
    return { success: true };
  }

  async markManuallyEdited(userId: number, phone: string) {
    await this.prisma.chatLabel.upsert({
      where: { phone_userId: { phone, userId } },
      update: { manuallyEdited: true },
      create: { phone, userId, labels: [], manuallyEdited: true },
    });
    this.labelsGateway.emitManualEdit(userId, phone);
  }

  async getManuallyEditedPhones(userId: number) {
    const records = await this.prisma.chatLabel.findMany({
      where: { userId, manuallyEdited: true },
      select: { phone: true },
    });
    return records.map(r => r.phone);
  }
}

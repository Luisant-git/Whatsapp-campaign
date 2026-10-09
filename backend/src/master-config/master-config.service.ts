import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant-prisma.service';
import { TenantContext } from '../tenant/tenant.decorator';
import { CreateMasterConfigDto, UpdateMasterConfigDto } from './dto/master-config.dto';
import { CentralPrismaService } from '../central-prisma.service';
import { MetaCredentialService, isCentralMetaCredentialEnabled } from '../meta-credential/meta-credential.service';

@Injectable()
export class MasterConfigService {
  constructor(
    private tenantPrisma: TenantPrismaService,
    private centralPrisma: CentralPrismaService,
    private metaCredentialService: MetaCredentialService
  ) {}

  private getPrisma(ctx: TenantContext) {
    return this.tenantPrisma.getTenantClient(ctx.tenantId, ctx.dbUrl);
  }

  async create(createDto: CreateMasterConfigDto, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    return prisma.masterConfig.create({
      data: {
        ...createDto,
        isActive: createDto.isActive ?? true,
      },
    });
  }

  async handleEmbeddedSignup(code: string, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    
    // Read Meta App credentials from environment variables
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const verifyToken = process.env.META_VERIFY_TOKEN || 'default_verify_token';

    if (!appId || !appSecret) {
      throw new BadRequestException('META_APP_ID or META_APP_SECRET is not configured in the server environment');
    }

    // 1. Exchange the code for a System User Access Token
    const tokenResponse = await fetch(`https://graph.facebook.com/v20.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`);
    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      throw new BadRequestException(error.error?.message || 'Failed to exchange code for access token');
    }
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch granular scopes using debug_token to get WABA ID
    const debugResponse = await fetch(`https://graph.facebook.com/v20.0/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`);
    if (!debugResponse.ok) {
      const error = await debugResponse.json();
      throw new BadRequestException(error.error?.message || 'Failed to verify access token');
    }
    const debugData = await debugResponse.json();
    
    const granularScopes = debugData.data?.granular_scopes || [];
    
    // Extract WABA ID from the messaging scope
    const messagingScope = granularScopes.find((scope: any) => scope.scope === 'whatsapp_business_messaging');
    const wabaId = messagingScope?.target_ids?.[0];

    if (!wabaId) {
      throw new BadRequestException('Could not retrieve WABA ID. Please ensure you selected a Business Account during signup.');
    }

    // 3. Fetch Phone Numbers associated with the WABA
    let phoneNumbers: any[] = [];
    const phoneResponse = await fetch(`https://graph.facebook.com/v20.0/${wabaId}/phone_numbers?access_token=${accessToken}`);
    if (phoneResponse.ok) {
      const phoneData = await phoneResponse.json();
      if (phoneData.data && phoneData.data.length > 0) {
        phoneNumbers = phoneData.data;
      }
    }

    if (phoneNumbers.length === 0) {
      throw new BadRequestException('Could not retrieve Phone Numbers. Ensure a phone number is linked to the selected Business Account.');
    }

    const primaryPhoneNumberId = phoneNumbers[0].id;

    // 4. Save to Central Database
    const tenantIdNum = parseInt(tenantContext.tenantId, 10);
    if (!isNaN(tenantIdNum)) {
      // Create or update MetaConnection
      const metaConnection = await this.centralPrisma.metaConnection.upsert({
        where: {
          tenantId_wabaId: { tenantId: tenantIdNum, wabaId }
        },
        update: {
          connectionStatus: 'CONNECTED'
        },
        create: {
          tenantId: tenantIdNum,
          wabaId,
          connectionStatus: 'CONNECTED'
        }
      });

      // Encrypt and store credential
      const encryptedToken = this.metaCredentialService.encrypt(accessToken);
      await this.centralPrisma.metaCredential.upsert({
        where: { connectionId: metaConnection.id },
        update: {
          accessTokenEncrypted: encryptedToken,
          tokenType: 'SYSTEM_USER',
          status: 'ACTIVE'
        },
        create: {
          connectionId: metaConnection.id,
          accessTokenEncrypted: encryptedToken,
          tokenType: 'SYSTEM_USER',
          status: 'ACTIVE'
        }
      });

      // Store all phone numbers
      for (const phone of phoneNumbers) {
        await this.centralPrisma.metaPhoneNumber.upsert({
          where: {
            connectionId_phoneNumberId: { connectionId: metaConnection.id, phoneNumberId: phone.id }
          },
          update: {
            displayNumber: phone.display_phone_number || null,
            verifiedName: phone.verified_name || null,
            qualityRating: phone.quality_rating || null,
            status: 'ACTIVE'
          },
          create: {
            connectionId: metaConnection.id,
            phoneNumberId: phone.id,
            displayNumber: phone.display_phone_number || null,
            verifiedName: phone.verified_name || null,
            qualityRating: phone.quality_rating || null,
            status: 'ACTIVE'
          }
        });
      }

      // Initialize Billing Account for this tenant
      await this.centralPrisma.billingAccount.upsert({
        where: { tenantId: tenantIdNum },
        update: {
          billingMode: 'CUSTOMER_META',
          metaBillingStatus: 'ACTIVE'
        },
        create: {
          tenantId: tenantIdNum,
          billingMode: 'CUSTOMER_META',
          metaBillingStatus: 'ACTIVE'
        }
      });
    }

    // 5. Fallback Write to Legacy MasterConfig (for temporary compatibility)
    return prisma.masterConfig.upsert({
      where: { name: `Meta Connect - ${primaryPhoneNumberId}` },
      update: {
        phoneNumberId: primaryPhoneNumberId,
        wabaId,
        appId,
        accessToken,
        verifyToken,
        isActive: true,
      },
      create: {
        name: `Meta Connect - ${primaryPhoneNumberId}`,
        phoneNumberId: primaryPhoneNumberId,
        wabaId,
        appId,
        accessToken,
        verifyToken,
        isActive: true,
      }
    });
  }

  async getCentralConnection(tenantContext: TenantContext) {
    const tenantIdNum = parseInt(tenantContext.tenantId, 10);
    if (isNaN(tenantIdNum)) {
      return null;
    }

    const connection = await this.centralPrisma.metaConnection.findFirst({
      where: { tenantId: tenantIdNum },
      include: {
        phoneNumbers: true,
      },
    });

    if (!connection) {
      return null;
    }

    const billingAccount = await this.centralPrisma.billingAccount.findUnique({
      where: { tenantId: tenantIdNum },
    });

    return {
      id: connection.id,
      wabaId: connection.wabaId,
      connectionStatus: connection.connectionStatus,
      onboardingStatus: connection.onboardingStatus,
      phoneNumbers: connection.phoneNumbers.map(p => ({
        phoneNumberId: p.phoneNumberId,
        displayNumber: p.displayNumber,
        verifiedName: p.verifiedName,
        qualityRating: p.qualityRating,
        status: p.status,
      })),
      billingAccount: billingAccount ? {
        billingMode: billingAccount.billingMode,
        metaBillingStatus: billingAccount.metaBillingStatus,
      } : null,
    };
  }

  async syncCentralConnection(tenantContext: TenantContext) {
    const tenantIdNum = parseInt(tenantContext.tenantId, 10);
    if (isNaN(tenantIdNum)) {
      throw new BadRequestException('Invalid tenant ID');
    }

    const connection = await this.centralPrisma.metaConnection.findFirst({
      where: { tenantId: tenantIdNum },
      include: {
        credential: true,
        phoneNumbers: true,
      },
    });

    if (!connection) {
      throw new BadRequestException('No central connection found');
    }

    if (!connection.credential || !connection.credential.accessTokenEncrypted) {
      // Missing credentials, mark as disconnected
      await this.centralPrisma.metaConnection.update({
        where: { id: connection.id },
        data: { connectionStatus: 'DISCONNECTED' }
      });
      return this.getCentralConnection(tenantContext);
    }

    let accessToken: string;
    try {
      accessToken = this.metaCredentialService.decrypt(connection.credential.accessTokenEncrypted);
    } catch (e) {
      await this.centralPrisma.metaConnection.update({
        where: { id: connection.id },
        data: { connectionStatus: 'DISCONNECTED' }
      });
      return this.getCentralConnection(tenantContext);
    }

    // Fetch from Meta
    const phoneResponse = await fetch(`https://graph.facebook.com/v20.0/${connection.wabaId}/phone_numbers?access_token=${accessToken}`);
    
    if (!phoneResponse.ok) {
      // Token is likely invalid/expired
      await this.centralPrisma.metaConnection.update({
        where: { id: connection.id },
        data: { connectionStatus: 'DISCONNECTED' }
      });
      return this.getCentralConnection(tenantContext);
    }

    const phoneData = await phoneResponse.json();
    const fetchedPhones = phoneData.data || [];
    const fetchedPhoneIds = fetchedPhones.map((p: any) => p.id);

    // Update connection status
    await this.centralPrisma.metaConnection.update({
      where: { id: connection.id },
      data: { connectionStatus: 'CONNECTED' }
    });

    // Upsert fetched phones
    for (const phone of fetchedPhones) {
      await this.centralPrisma.metaPhoneNumber.upsert({
        where: {
          connectionId_phoneNumberId: { connectionId: connection.id, phoneNumberId: phone.id }
        },
        update: {
          displayNumber: phone.display_phone_number || null,
          verifiedName: phone.verified_name || null,
          qualityRating: phone.quality_rating || null,
          status: 'ACTIVE'
        },
        create: {
          connectionId: connection.id,
          phoneNumberId: phone.id,
          displayNumber: phone.display_phone_number || null,
          verifiedName: phone.verified_name || null,
          qualityRating: phone.quality_rating || null,
          status: 'ACTIVE'
        }
      });
    }

    // Mark removed phones as INACTIVE
    const existingPhones = connection.phoneNumbers;
    for (const ep of existingPhones) {
      if (!fetchedPhoneIds.includes(ep.phoneNumberId)) {
        await this.centralPrisma.metaPhoneNumber.update({
          where: { id: ep.id },
          data: { status: 'INACTIVE' }
        });
      }
    }

    return this.getCentralConnection(tenantContext);
  }

  async disconnectCentralConnection(tenantContext: TenantContext) {
    const tenantIdNum = parseInt(tenantContext.tenantId, 10);
    if (isNaN(tenantIdNum)) {
      throw new BadRequestException('Invalid tenant ID');
    }

    const connection = await this.centralPrisma.metaConnection.findFirst({
      where: { tenantId: tenantIdNum }
    });

    if (!connection) {
      return { success: true, message: 'Already disconnected' };
    }

    // Delete connection (Cascade will delete credentials and phone numbers)
    await this.centralPrisma.metaConnection.delete({
      where: { id: connection.id }
    });

    // Delete billing account too so it resets completely
    try {
      await this.centralPrisma.billingAccount.delete({
        where: { tenantId: tenantIdNum }
      });
    } catch (e) {
      // Ignore if it doesn't exist
    }

    return { success: true, message: 'Disconnected successfully' };
  }

  async getCentralConnectionAnalytics(tenantContext: TenantContext, start?: string, end?: string) {
    const tenantIdNum = parseInt(tenantContext.tenantId, 10);
    if (isNaN(tenantIdNum)) throw new BadRequestException('Invalid tenant ID');

    const connection = await this.centralPrisma.metaConnection.findFirst({
      where: { tenantId: tenantIdNum },
      include: { credential: true }
    });

    if (!connection || !connection.credential?.accessTokenEncrypted) {
      throw new BadRequestException('No active central connection found');
    }

    const accessToken = this.metaCredentialService.decrypt(connection.credential.accessTokenEncrypted);

    let startTs: number;
    let endTs: number;

    if (start && end) {
      startTs = Math.floor(new Date(start).getTime() / 1000);
      endTs = Math.floor(new Date(end).getTime() / 1000);
    } else {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      startTs = Math.floor(firstDay.getTime() / 1000);
      endTs = Math.floor(now.getTime() / 1000);
    }

    let url = `https://graph.facebook.com/v20.0/${connection.wabaId}?fields=currency,pricing_analytics.start(${startTs}).end(${endTs}).granularity(DAILY).dimensions(["PRICING_CATEGORY","PHONE"]),conversation_analytics.start(${startTs}).end(${endTs}).granularity(DAILY).dimensions(["CONVERSATION_CATEGORY"])&access_token=${accessToken}`;
    
    try {
      let response = await fetch(url);
      let data = await response.json();
      
      if (data.error) {
        // Fallback without PHONE dimension
        url = `https://graph.facebook.com/v20.0/${connection.wabaId}?fields=currency,pricing_analytics.start(${startTs}).end(${endTs}).granularity(DAILY).dimensions(["PRICING_CATEGORY"]),conversation_analytics.start(${startTs}).end(${endTs}).granularity(DAILY)&access_token=${accessToken}`;
        response = await fetch(url);
        data = await response.json();
      }

      if (data.error) {
        throw new BadRequestException(data.error.message || 'Failed to fetch analytics from Meta');
      }

      const analyticsObj = data.pricing_analytics || data.conversation_analytics || { data: [] };
      console.log('WABA Analytics Data from Meta:', JSON.stringify(analyticsObj, null, 2));
      return {
        ...analyticsObj,
        currency: data.currency || 'INR'
      };
    } catch (e) {
      console.error('Analytics fetch error:', e);
      throw new BadRequestException('Failed to fetch analytics from Meta');
    }
  }

  async findAll(tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    return prisma.masterConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    return prisma.masterConfig.findUnique({
      where: { id },
    });
  }

  async update(id: number, updateDto: UpdateMasterConfigDto, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    return prisma.masterConfig.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: number, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    return prisma.masterConfig.delete({
      where: { id },
    });
  }

  async saveFeatureAssignments(assignments: any, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    const existing = await prisma.featureAssignment.findFirst();

    if (existing) {
      return prisma.featureAssignment.update({
        where: { id: existing.id },
        data: {
          whatsappChat: assignments.whatsappChat || null,
          aiChatbot: assignments.aiChatbot || null,
          quickReply: assignments.quickReply || null,
          ecommerce: assignments.ecommerce || null,
        },
      });
    }

    return prisma.featureAssignment.create({
      data: {
        whatsappChat: assignments.whatsappChat || null,
        aiChatbot: assignments.aiChatbot || null,
        quickReply: assignments.quickReply || null,
        ecommerce: assignments.ecommerce || null,
      },
    });
  }

  async getFeatureAssignments(tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    const assignment = await prisma.featureAssignment.findFirst();

    return assignment || {
      whatsappChat: '',
      aiChatbot: '',
      quickReply: '',
      ecommerce: '',
    };
  }

  async subscribeToWABA(id: number, tenantContext: TenantContext) {
    const isCentral = isCentralMetaCredentialEnabled();
    let wabaId: string;
    let accessToken: string;
    const prisma = this.getPrisma(tenantContext);

    if (isCentral) {
      try {
        const tenantIdNum = parseInt(tenantContext.tenantId, 10);
        const metaConfig = await this.metaCredentialService.getMetaConfig(tenantIdNum);
        wabaId = metaConfig.wabaId;
        accessToken = metaConfig.accessToken;
      } catch (err) {
        throw new BadRequestException(`Central config error: ${err.message}`);
      }
    } else {
      const config = await prisma.masterConfig.findUnique({ where: { id } });
      if (!config) throw new BadRequestException('Master config not found');
      if (!config.wabaId || !config.accessToken) throw new BadRequestException('WABA ID and Access Token are required');
      wabaId = config.wabaId;
      accessToken = config.accessToken;
    }

    // Subscribe app to WABA
    const subscribeUrl = `https://graph.facebook.com/v20.0/${wabaId}/subscribed_apps`;
    
    try {
      const response = await fetch(subscribeUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new BadRequestException(
          error.error?.message || 'Failed to subscribe to WABA'
        );
      }

      const data = await response.json();
      return {
        success: true,
        message: 'Successfully subscribed app to WABA. Webhooks are now active.',
        data,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to subscribe to WABA: ${error.message}`
      );
    }
  }

  async setAppWebhook(id: number, callbackUrl: string, tenantContext: TenantContext) {
    const prisma = this.getPrisma(tenantContext);
    const config = await prisma.masterConfig.findUnique({ where: { id } });

    // Use environment variables or fallback to legacy config if present
    const verifyToken = process.env.META_VERIFY_TOKEN || (config && config.verifyToken);
    
    if (!verifyToken) {
      throw new BadRequestException('Verify Token is required in the environment or configuration');
    }

    const appId = (process.env.META_APP_ID || (config && config.appId) || '').trim();
    const appSecret = (process.env.META_APP_SECRET || (config && config.appSecret) || '').trim();

    if (!appId || !appSecret) {
      throw new BadRequestException('Meta App ID and App Secret must be configured');
    }

    // Set Webhook for App
    const subscribeUrl = `https://graph.facebook.com/v20.0/${appId}/subscriptions?access_token=${appId}|${appSecret}`;
    
    // Prepare url parameters
    const params = new URLSearchParams({
      object: 'whatsapp_business_account',
      callback_url: callbackUrl,
      verify_token: verifyToken,
      fields: 'messages'
    });
    
    try {
      const response = await fetch(subscribeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new BadRequestException(
          error.error?.message || 'Failed to set app webhook'
        );
      }

      const data = await response.json();
      return {
        success: true,
        message: 'Successfully configured App Webhook URL in Meta.',
        data,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to set app webhook: ${error.message}`
      );
    }
  }
}
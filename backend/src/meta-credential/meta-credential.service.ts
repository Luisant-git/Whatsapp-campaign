import { Injectable, NotFoundException, UnauthorizedException, Logger, InternalServerErrorException } from '@nestjs/common';
import { CentralPrismaService } from '../central-prisma.service';
import * as crypto from 'crypto';

export interface MetaConfig {
  tenantId: number;
  wabaId: string;
  phoneNumberId: string;
  accessToken: string;
  source: string;
}

export function isCentralMetaCredentialEnabled(): boolean {
  const flag = process.env.META_CREDENTIAL_SOURCE;
  if (!flag || flag === 'LEGACY') {
    return false; // Default is strictly LEGACY
  }
  if (flag === 'CENTRAL') {
    return true;
  }
  
  // Log a warning and fallback to legacy if flag is invalid
  Logger.warn(`Invalid META_CREDENTIAL_SOURCE value: "${flag}". Defaulting to LEGACY.`, 'FeatureFlag');
  return false;
}

@Injectable()
export class MetaCredentialService {
  private readonly logger = new Logger(MetaCredentialService.name);
  
  // Use a fixed key for dev, in production read from env
  private readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
    ? Buffer.from(process.env.ENCRYPTION_KEY) 
    : Buffer.from('12345678901234567890123456789012');

  constructor(private centralPrisma: CentralPrismaService) {}

  async getMetaConfig(tenantId: number, phoneNumberId?: string): Promise<MetaConfig> {
    const isCentral = isCentralMetaCredentialEnabled();

    if (!isCentral) {
      return this.resolveLegacyConfig(tenantId, phoneNumberId);
    }

    return this.resolveCentralConfig(tenantId, phoneNumberId);
  }

  private async resolveCentralConfig(tenantId: number, phoneNumberId?: string): Promise<MetaConfig> {
    // 1. Validate tenant exists
    const tenant = await this.centralPrisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    // 2. Fetch connections
    const connections = await this.centralPrisma.metaConnection.findMany({
      where: { tenantId },
      include: {
        credential: true,
        phoneNumbers: true
      }
    });

    if (!connections || connections.length === 0) {
      throw new NotFoundException(`No Meta connection found for tenant ${tenantId}`);
    }

    // For now we assume 1 connection per tenant, or match by phone if provided
    let connection = connections[0];
    
    if (phoneNumberId) {
      const match = connections.find(c => 
        c.phoneNumbers.some(p => p.phoneNumberId === phoneNumberId)
      );
      if (!match) {
        throw new NotFoundException(`Phone number ${phoneNumberId} not authorized for tenant ${tenantId}`);
      }
      connection = match;
    }

    // 3. Validate connection status
    if (connection.connectionStatus !== 'CONNECTED') {
      throw new UnauthorizedException(`Meta connection is not active (Status: ${connection.connectionStatus})`);
    }

    // 4. Validate credential
    const credential = connection.credential;
    if (!credential) {
      throw new NotFoundException(`No credential found for connection ${connection.id}`);
    }

    if (credential.status !== 'ACTIVE') {
      throw new UnauthorizedException(`Credential is inactive (Status: ${credential.status})`);
    }

    // 5. Decrypt
    let decryptedToken: string;
    try {
      decryptedToken = this.decrypt(credential.accessTokenEncrypted);
    } catch (e) {
      this.logger.error(`Failed to decrypt credential for tenant ${tenantId}`);
      throw new InternalServerErrorException('Credential decryption failed');
    }

    // 6. Return unified config
    const resolvedPhone = phoneNumberId || (connection.phoneNumbers.length > 0 ? connection.phoneNumbers[0].phoneNumberId : '');
    
    if (!resolvedPhone) {
      throw new NotFoundException(`No phone numbers mapped to connection ${connection.id}`);
    }

    return {
      tenantId,
      wabaId: connection.wabaId,
      phoneNumberId: resolvedPhone,
      accessToken: decryptedToken,
      source: 'CENTRAL_META_CONNECTION'
    };
  }

  private async resolveLegacyConfig(tenantId: number, phoneNumberId?: string): Promise<MetaConfig> {
    const tenant = await this.centralPrisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    if (!tenant.accessToken || !tenant.wabaId || !tenant.phoneNumberId) {
      throw new NotFoundException(`Legacy credentials incomplete for tenant ${tenantId}`);
    }

    if (phoneNumberId && tenant.phoneNumberId !== phoneNumberId) {
      throw new UnauthorizedException(`Legacy phone number mismatch: requested ${phoneNumberId}, found ${tenant.phoneNumberId}`);
    }

    return {
      tenantId,
      wabaId: tenant.wabaId,
      phoneNumberId: tenant.phoneNumberId,
      accessToken: tenant.accessToken,
      source: 'LEGACY_TENANT_TABLE'
    };
  }

  decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 2) throw new Error('Invalid encrypted format');
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  }

  encrypt(plainText: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }
}

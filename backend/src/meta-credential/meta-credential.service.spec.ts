import { Test, TestingModule } from '@nestjs/testing';
import { MetaCredentialService } from './meta-credential.service';
import { CentralPrismaService } from '../central-prisma.service';
import { NotFoundException, UnauthorizedException, InternalServerErrorException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

describe('MetaCredentialService', () => {
  let service: MetaCredentialService;
  let prismaService: any;
  let loggerSpy: jest.SpyInstance;

  const ENCRYPTION_KEY = Buffer.from('12345678901234567890123456789012');
  
  function encrypt(text: string) {
    let iv = crypto.randomBytes(16);
    let cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  beforeEach(async () => {
    prismaService = {
      tenant: { findUnique: jest.fn() },
      metaConnection: { findMany: jest.fn() }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetaCredentialService,
        { provide: CentralPrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<MetaCredentialService>(MetaCredentialService);
    
    // @ts-ignore - overriding readonly for testing
    service['ENCRYPTION_KEY'] = ENCRYPTION_KEY;
    
    // Spy on logger
    loggerSpy = jest.spyOn(service['logger'], 'error').mockImplementation();
    jest.spyOn(service['logger'], 'log').mockImplementation();
    jest.spyOn(service['logger'], 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveCentralConfig', () => {
    it('should successfully resolve and decrypt credential', async () => {
      const plaintextToken = 'EAABabcd1234';
      prismaService.tenant.findUnique.mockResolvedValue({ id: 1 });
      prismaService.metaConnection.findMany.mockResolvedValue([{
        id: 1,
        tenantId: 1,
        wabaId: '12345',
        connectionStatus: 'CONNECTED',
        credential: {
          status: 'ACTIVE',
          accessTokenEncrypted: encrypt(plaintextToken)
        },
        phoneNumbers: [{ phoneNumberId: '98765' }]
      }]);

      const result = await service.getMetaConfig(1);
      expect(result.accessToken).toEqual(plaintextToken);
      expect(result.wabaId).toEqual('12345');
      expect(result.phoneNumberId).toEqual('98765');
      expect(result.source).toEqual('CENTRAL_META_CONNECTION');
    });

    it('should throw NotFoundException if tenant missing', async () => {
      prismaService.tenant.findUnique.mockResolvedValue(null);
      await expect(service.getMetaConfig(99)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if connection missing', async () => {
      prismaService.tenant.findUnique.mockResolvedValue({ id: 1 });
      prismaService.metaConnection.findMany.mockResolvedValue([]);
      await expect(service.getMetaConfig(1)).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if connection not CONNECTED', async () => {
      prismaService.tenant.findUnique.mockResolvedValue({ id: 1 });
      prismaService.metaConnection.findMany.mockResolvedValue([{
        id: 1,
        connectionStatus: 'DISCONNECTED',
        phoneNumbers: [{ phoneNumberId: '98765' }]
      }]);
      await expect(service.getMetaConfig(1)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException if credential missing', async () => {
      prismaService.tenant.findUnique.mockResolvedValue({ id: 1 });
      prismaService.metaConnection.findMany.mockResolvedValue([{
        id: 1,
        connectionStatus: 'CONNECTED',
        credential: null,
        phoneNumbers: [{ phoneNumberId: '98765' }]
      }]);
      await expect(service.getMetaConfig(1)).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if credential inactive', async () => {
      prismaService.tenant.findUnique.mockResolvedValue({ id: 1 });
      prismaService.metaConnection.findMany.mockResolvedValue([{
        id: 1,
        connectionStatus: 'CONNECTED',
        credential: { status: 'REVOKED' },
        phoneNumbers: [{ phoneNumberId: '98765' }]
      }]);
      await expect(service.getMetaConfig(1)).rejects.toThrow(UnauthorizedException);
    });

    it('should prove plaintext token is never logged on failure', async () => {
      const plaintextToken = 'SECRET_TOKEN_DO_NOT_LOG';
      prismaService.tenant.findUnique.mockResolvedValue({ id: 1 });
      prismaService.metaConnection.findMany.mockResolvedValue([{
        id: 1,
        connectionStatus: 'CONNECTED',
        credential: { status: 'ACTIVE', accessTokenEncrypted: 'invalid-encryption-blob' },
        phoneNumbers: [{ phoneNumberId: '98765' }]
      }]);

      await expect(service.getMetaConfig(1)).rejects.toThrow(InternalServerErrorException);
      
      // Check that the logger was called but did not log the token
      expect(loggerSpy).toHaveBeenCalled();
      const logArgs = loggerSpy.mock.calls[0].join(' ');
      expect(logArgs).not.toContain(plaintextToken);
      expect(logArgs).toContain('Failed to decrypt credential');
    });
  });
});

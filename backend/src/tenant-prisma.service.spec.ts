import { TenantPrismaService } from './tenant-prisma.service';
import { PrismaClient as MockPrismaClient } from '@prisma/client-tenant';

jest.mock('@prisma/client-tenant', () => {
  return {
    PrismaClient: jest.fn(),
  };
});

describe('TenantPrismaService', () => {
  let service: TenantPrismaService;
  const mockClients: any[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    mockClients.length = 0;

    (MockPrismaClient as unknown as jest.Mock).mockImplementation((opts: any) => {
      const client = {
        $connect: jest.fn().mockResolvedValue(undefined),
        $disconnect: jest.fn().mockResolvedValue(undefined),
        $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
        _opts: opts,
      };
      mockClients.push(client);
      return client;
    });

    service = new TenantPrismaService();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('Client Reuse & Connection Limits', () => {
    it('should reuse client for the same tenant and configure pool limit to 2 by default', async () => {
      const dbUrl = 'postgresql://user:pass@localhost:5432/tenant_1';

      const client1 = await service.getTenantClientReady('1', dbUrl);
      const client2 = await service.getTenantClientReady('1', dbUrl);

      expect(client1).toBe(client2);
      expect(MockPrismaClient).toHaveBeenCalledTimes(1);

      // Verify connection_limit=2 is in the datasource url
      const passedUrl = (client1 as any)._opts.datasources.db.url;
      expect(passedUrl).toContain('connection_limit=2');
    });

    it('should respect custom TENANT_DB_POOL_LIMIT environment variable', async () => {
      const oldEnv = process.env.TENANT_DB_POOL_LIMIT;
      process.env.TENANT_DB_POOL_LIMIT = '3';

      try {
        const client = await service.getTenantClientReady('pool-test', 'postgresql://localhost/db');
        expect((client as any)._opts.datasources.db.url).toContain('connection_limit=3');
      } finally {
        process.env.TENANT_DB_POOL_LIMIT = oldEnv;
      }
    });

    it('should create separate clients for different tenants', async () => {
      const client1 = await service.getTenantClientReady('1', 'postgresql://localhost/tenant_1');
      const client2 = await service.getTenantClientReady('2', 'postgresql://localhost/tenant_2');

      expect(client1).not.toBe(client2);
      expect(MockPrismaClient).toHaveBeenCalledTimes(2);
    });
  });

  describe('Concurrent Initialization Races', () => {
    it('should handle concurrent getTenantClientReady calls in a single flight', async () => {
      const dbUrl = 'postgresql://user:pass@localhost:5432/tenant_race';

      // Fire 5 simultaneous calls for the same tenant
      const results = await Promise.all([
        service.getTenantClientReady('tenant_race', dbUrl),
        service.getTenantClientReady('tenant_race', dbUrl),
        service.getTenantClientReady('tenant_race', dbUrl),
        service.getTenantClientReady('tenant_race', dbUrl),
        service.getTenantClientReady('tenant_race', dbUrl),
      ]);

      // All 5 should resolve to the exact same client
      expect(MockPrismaClient).toHaveBeenCalledTimes(1);
      for (const res of results) {
        expect(res).toBe(results[0]);
      }
    });

    it('should reuse the exact same client instance when getTenantClient and getTenantClientReady are called concurrently', async () => {
      const dbUrl = 'postgresql://user:pass@localhost:5432/tenant_concurrent_mix';

      // Simulate connection latency so initClient is genuinely in flight
      let resolveConnect: () => void;
      const connectDelay = new Promise<void>((res) => {
        resolveConnect = res;
      });

      (MockPrismaClient as unknown as jest.Mock).mockImplementationOnce((opts: any) => {
        const client = {
          $connect: jest.fn().mockImplementation(() => connectDelay),
          $disconnect: jest.fn().mockResolvedValue(undefined),
          $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
          _opts: opts,
        };
        mockClients.push(client);
        return client;
      });

      // Start async getTenantClientReady (it enters $connect which is waiting on connectDelay)
      const readyPromise = service.getTenantClientReady('mix_1', dbUrl);

      // Concurrently call getTenantClient synchronously while init is in-flight
      const syncClient1 = service.getTenantClient('mix_1', dbUrl);
      const syncClient2 = service.getTenantClient('mix_1', dbUrl);

      // Release the connection delay
      resolveConnect!();
      const readyClient = await readyPromise;

      // Both sync and async callers MUST receive the exact same client instance
      expect(syncClient1).toBe(readyClient);
      expect(syncClient2).toBe(readyClient);

      // Exactly ONE PrismaClient constructor call was made
      expect(MockPrismaClient).toHaveBeenCalledTimes(1);
    });

    it('should not create duplicate clients when getTenantClient is called first and getTenantClientReady follows', async () => {
      const dbUrl = 'postgresql://user:pass@localhost:5432/tenant_sync_first';

      // Call getTenantClient first (initiates background init)
      const syncClient = service.getTenantClient('sync_first', dbUrl);

      // Immediately await getTenantClientReady
      const readyClient = await service.getTenantClientReady('sync_first', dbUrl);

      // Both must be the exact same instance
      expect(syncClient).toBe(readyClient);
      expect(MockPrismaClient).toHaveBeenCalledTimes(1);
    });

    it('should not create duplicate clients across multiple synchronous getTenantClient calls before async connects', async () => {
      const dbUrl = 'postgresql://user:pass@localhost:5432/tenant_sync_multi';

      // Fire 3 synchronous calls in the same tick
      const client1 = service.getTenantClient('sync_multi', dbUrl);
      const client2 = service.getTenantClient('sync_multi', dbUrl);
      const client3 = service.getTenantClient('sync_multi', dbUrl);

      expect(client1).toBe(client2);
      expect(client2).toBe(client3);
      expect(MockPrismaClient).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cleanup on Connection Failure', () => {
    it('should disconnect failed client and clean up from map when connection fails', async () => {
      (MockPrismaClient as unknown as jest.Mock).mockImplementationOnce((opts: any) => {
        return {
          $connect: jest.fn().mockRejectedValue(new Error('FATAL: sorry, too many clients already')),
          $disconnect: jest.fn().mockResolvedValue(undefined),
          $queryRaw: jest.fn(),
          _opts: opts,
        };
      });

      const dbUrl = 'postgresql://user:pass@localhost:5432/tenant_fail';

      await expect(service.getTenantClientReady('tenant_fail', dbUrl)).rejects.toThrow(
        'FATAL: sorry, too many clients already',
      );

      // Verify the failed client was disconnected to release any partial connections
      const failedClient = mockClients[0] || (MockPrismaClient as unknown as jest.Mock).mock.results[0].value;
      expect(failedClient.$disconnect).toHaveBeenCalled();

      // Ensure subsequent call is not stuck with the failed client and retries
      const retryClient = await service.getTenantClientReady('tenant_fail', dbUrl);
      expect(retryClient).toBeDefined();
    });
  });

  describe('Safe Reconnection without In-Flight Interruption', () => {
    it('should atomically swap client and defer disconnecting old client', async () => {
      jest.useFakeTimers();

      const dbUrl = 'postgresql://user:pass@localhost:5432/tenant_recon';
      const initialClient = await service.getTenantClientReady('recon', dbUrl);

      // Reconnect tenant
      const newClient = await service.reconnectTenant('recon', dbUrl);

      expect(newClient).not.toBe(initialClient);
      // Immediately after swap, old client should NOT be disconnected yet (grace period for in-flight queries)
      expect(initialClient.$disconnect).not.toHaveBeenCalled();

      // Advance timers by grace period (5000ms)
      jest.advanceTimersByTime(5000);
      expect(initialClient.$disconnect).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('Lifecycle Shutdown', () => {
    it('should disconnect all cached clients on module destroy', async () => {
      await service.getTenantClientReady('1', 'postgresql://localhost/t1');
      await service.getTenantClientReady('2', 'postgresql://localhost/t2');

      expect(mockClients.length).toBe(2);

      await service.onModuleDestroy();

      expect(mockClients[0].$disconnect).toHaveBeenCalled();
      expect(mockClients[1].$disconnect).toHaveBeenCalled();
    });
  });
});

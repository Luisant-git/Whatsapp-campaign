import { AutomationCronService } from './automation-cron.service';
import { CentralPrismaService } from '../central-prisma.service';
import { TenantPrismaService } from '../tenant-prisma.service';
import { AutoTemplateSenderService } from './auto-template-sender.service';

describe('AutomationCronService', () => {
  let service: AutomationCronService;
  let mockCentralPrisma: any;
  let mockTenantPrisma: any;
  let mockSender: any;

  beforeEach(() => {
    mockCentralPrisma = {
      tenant: {
        findMany: jest.fn(),
      },
    };

    mockTenantPrisma = {
      getTenantClient: jest.fn(),
    };

    mockSender = {};

    service = new AutomationCronService(
      mockCentralPrisma as unknown as CentralPrismaService,
      mockTenantPrisma as unknown as TenantPrismaService,
      mockSender as unknown as AutoTemplateSenderService,
    );
  });

  describe('Overlapping Cron Prevention', () => {
    it('should prevent overlapping executions of deleteOldCampaigns', async () => {
      let resolveFirstCall: () => void;
      const blockerPromise = new Promise<void>((resolve) => {
        resolveFirstCall = resolve;
      });

      mockCentralPrisma.tenant.findMany.mockImplementation(async () => {
        await blockerPromise;
        return [];
      });

      // Start first execution
      const firstRun = service.deleteOldCampaigns();

      // Attempt second execution while first is in-flight
      const secondRun = service.deleteOldCampaigns();

      // Second run should return immediately without querying central DB again
      await secondRun;
      expect(mockCentralPrisma.tenant.findMany).toHaveBeenCalledTimes(1);

      // Unblock first run
      resolveFirstCall!();
      await firstRun;

      // After completion, next run should be allowed
      mockCentralPrisma.tenant.findMany.mockResolvedValue([]);
      await service.deleteOldCampaigns();
      expect(mockCentralPrisma.tenant.findMany).toHaveBeenCalledTimes(2);
    });

    it('should prevent overlapping executions of runDailyAutomation', async () => {
      let resolveFirstCall: () => void;
      const blockerPromise = new Promise<void>((resolve) => {
        resolveFirstCall = resolve;
      });

      mockCentralPrisma.tenant.findMany.mockImplementation(async () => {
        await blockerPromise;
        return [];
      });

      // Ensure sending hours check allows run
      jest.spyOn(service as any, 'runForTenant').mockResolvedValue(undefined);

      const firstRun = service.runDailyAutomation();
      const secondRun = service.runDailyAutomation();

      await secondRun;
      expect(mockCentralPrisma.tenant.findMany).toHaveBeenCalledTimes(1);

      resolveFirstCall!();
      await firstRun;
    });
  });

  describe('Tenant Error Isolation', () => {
    it('should continue processing other tenants when one tenant fails in runDailyAutomation', async () => {
      const tenants = [
        { id: 1, name: 'Tenant 1', dbUser: 'u1', dbPassword: 'p1', dbHost: 'h1', dbPort: 5432, dbName: 'd1' },
        { id: 2, name: 'Tenant 2', dbUser: 'u2', dbPassword: 'p2', dbHost: 'h2', dbPort: 5432, dbName: 'd2' },
      ];

      mockCentralPrisma.tenant.findMany.mockResolvedValue(tenants);

      const client1 = { id: 'client1' };
      const client2 = { id: 'client2' };

      mockTenantPrisma.getTenantClient
        .mockReturnValueOnce(client1)
        .mockReturnValueOnce(client2);

      const runForTenantSpy = jest.spyOn(service as any, 'runForTenant')
        .mockRejectedValueOnce(new Error('FATAL: connection failure for tenant 1'))
        .mockResolvedValueOnce(undefined);

      await service.runDailyAutomation();

      // Verify that despite tenant 1 failing, tenant 2 was processed
      expect(runForTenantSpy).toHaveBeenCalledTimes(2);
      expect(runForTenantSpy).toHaveBeenNthCalledWith(1, client1, 1, 'd1');
      expect(runForTenantSpy).toHaveBeenNthCalledWith(2, client2, 2, 'd2');
    });

    it('should continue processing other tenants when one tenant fails in deleteOldCampaigns', async () => {
      const tenants = [
        { id: 1, name: 'Tenant 1', dbUser: 'u1', dbPassword: 'p1', dbHost: 'h1', dbPort: 5432, dbName: 'd1' },
        { id: 2, name: 'Tenant 2', dbUser: 'u2', dbPassword: 'p2', dbHost: 'h2', dbPort: 5432, dbName: 'd2' },
      ];

      mockCentralPrisma.tenant.findMany.mockResolvedValue(tenants);

      const client1 = { campaign: { deleteMany: jest.fn().mockRejectedValue(new Error('DB failure')) } };
      const client2 = { campaign: { deleteMany: jest.fn().mockResolvedValue({ count: 5 }) } };

      mockTenantPrisma.getTenantClient
        .mockReturnValueOnce(client1)
        .mockReturnValueOnce(client2);

      await service.deleteOldCampaigns();

      expect(client1.campaign.deleteMany).toHaveBeenCalled();
      expect(client2.campaign.deleteMany).toHaveBeenCalled();
    });
  });
});

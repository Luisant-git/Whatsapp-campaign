import { Logger } from '@nestjs/common';
import { acquireAutomationTenantLock } from './automation-sequence-lock.util';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Client } = require('pg');

jest.mock('pg', () => {
  const mClient = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
  };
  return { Client: jest.fn(() => mClient) };
});

describe('automation-sequence-lock.util', () => {
  const mockLogger = {
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
  } as unknown as Logger;

  let mClientInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mClientInstance = new Client();
  });

  it('fails closed with acquired: false, unavailable: true when database connection fails', async () => {
    mClientInstance.connect.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await acquireAutomationTenantLock(
      'postgresql://user:pass@localhost:5432/db',
      42,
      { waitMs: 0, logger: mockLogger },
    );

    expect(result.acquired).toBe(false);
    expect(result.unavailable).toBe(true);
    expect(typeof result.release).toBe('function');
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Could not establish connection to acquire distributed PostgreSQL advisory lock for tenant 42'),
    );
  });

  it('fails closed with acquired: false, unavailable: true when advisory lock query throws an error', async () => {
    mClientInstance.connect.mockResolvedValueOnce(undefined);
    mClientInstance.query.mockRejectedValueOnce(
      new Error('advisory locks are not supported in transaction pooling mode'),
    );

    const result = await acquireAutomationTenantLock(
      'postgresql://user:pass@localhost:5432/db',
      42,
      { waitMs: 0, logger: mockLogger },
    );

    expect(result.acquired).toBe(false);
    expect(result.unavailable).toBe(true);
    expect(mClientInstance.end).toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Distributed PostgreSQL advisory lock query failed for tenant 42'),
    );
  });

  it('returns acquired: false when another process already holds the advisory lock', async () => {
    mClientInstance.connect.mockResolvedValueOnce(undefined);
    mClientInstance.query.mockResolvedValueOnce({ rows: [{ locked: false }] });

    const result = await acquireAutomationTenantLock(
      'postgresql://user:pass@localhost:5432/db',
      42,
      { waitMs: 0, logger: mockLogger },
    );

    expect(result.acquired).toBe(false);
    expect(result.unavailable).toBeUndefined();
    expect(mClientInstance.end).toHaveBeenCalled();
  });

  it('returns acquired: true and releases the lock properly when acquired successfully', async () => {
    mClientInstance.connect.mockResolvedValueOnce(undefined);
    mClientInstance.query.mockResolvedValueOnce({ rows: [{ locked: true }] });

    const result = await acquireAutomationTenantLock(
      'postgresql://user:pass@localhost:5432/db',
      42,
      { waitMs: 0, logger: mockLogger },
    );

    expect(result.acquired).toBe(true);

    // Call release
    await result.release();
    expect(mClientInstance.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_unlock($1, $2)',
      [1096111695, 42],
    );
    expect(mClientInstance.end).toHaveBeenCalled();

    // Calling release second time is a no-op
    await result.release();
    expect(mClientInstance.query).toHaveBeenCalledTimes(2); // Initial lock + 1 unlock
  });
});

import { Logger } from '@nestjs/common';

// `pg` is a direct backend dependency. Loading it via require keeps this
// utility usable without pulling in a new set of TypeScript types.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Client } = require('pg');

/**
 * PostgreSQL advisory-lock namespace. The second key is the tenant id, so all
 * automation work for one tenant is serialized across processes/instances.
 */
const AUTOMATION_LOCK_NAMESPACE = 1096111695; // fits in PostgreSQL int4
const CONNECTION_TIMEOUT_MS = 5000;
const RETRY_INTERVAL_MS = 250;

export interface AutomationTenantLock {
  acquired: boolean;
  unavailable?: boolean;
  release: () => Promise<void>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Prisma connection strings may contain Prisma-only query parameters. `pg`
 * does not understand them, so strip them before opening the lock connection.
 */
function toPgConnectionString(dbUrl: string): string {
  try {
    const url = new URL(dbUrl);
    for (const key of [
      'schema',
      'connection_limit',
      'pool_timeout',
      'pgbouncer',
      'socket_timeout',
    ]) {
      url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return dbUrl;
  }
}

/**
 * Acquire a database-level lock for a tenant's automation sequences.
 *
 * The lock lives on a dedicated PostgreSQL connection. This is important
 * because Prisma's pool may hand different connections to different queries,
 * which would make session-level advisory locks unreliable.
 *
 * - The scheduled cron uses `waitMs: 0` and simply skips the tenant when the
 *   lock is already held.
 * - The webhook click path waits for the scheduler to finish so it can see the
 *   latest completed step before sending the remaining steps.
 */
export async function acquireAutomationTenantLock(
  dbUrl: string,
  tenantId: number,
  options: { waitMs?: number; logger?: Logger } = {},
): Promise<AutomationTenantLock> {
  const waitMs = Math.max(0, options.waitMs ?? 0);
  const logger = options.logger;

  let client: any;
  try {
    client = new Client({
      connectionString: toPgConnectionString(dbUrl),
      connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    });
    await client.connect();
  } catch (error: any) {
    logger?.error(
      `Could not establish connection to acquire distributed PostgreSQL advisory lock for tenant ${tenantId}. Proceed Next execution aborted to prevent cross-process duplicate delivery.`,
    );
    if (client) {
      await client.end().catch(() => undefined);
    }
    return { acquired: false, unavailable: true, release: async () => undefined };
  }

  let released = false;
  const release = async () => {
    if (released) return;
    released = true;
    try {
      await client.query('SELECT pg_advisory_unlock($1, $2)', [
        AUTOMATION_LOCK_NAMESPACE,
        tenantId,
      ]);
    } catch (error: any) {
      logger?.warn(
        `Could not release automation lock for tenant ${tenantId}: ${error?.message || error}`,
      );
    } finally {
      await client.end().catch(() => undefined);
    }
  };

  try {
    const deadline = Date.now() + waitMs;
    for (;;) {
      const result = await client.query(
        'SELECT pg_try_advisory_lock($1, $2) AS locked',
        [AUTOMATION_LOCK_NAMESPACE, tenantId],
      );

      if (result.rows[0]?.locked) {
        return { acquired: true, release };
      }

      if (Date.now() >= deadline) {
        break;
      }

      await delay(RETRY_INTERVAL_MS);
    }

    await client.end().catch(() => undefined);
    return { acquired: false, release: async () => undefined };
  } catch (error: any) {
    await client.end().catch(() => undefined);
    logger?.error(
      `Distributed PostgreSQL advisory lock query failed for tenant ${tenantId}. Proceed Next execution aborted to prevent cross-process duplicate delivery.`,
    );
    return { acquired: false, unavailable: true, release: async () => undefined };
  }
}

// ─── D1 REST API Client ──────────────────────────────────────────────
// Drop-in replacement for D1 bindings that calls Cloudflare's D1 REST API.
// This lets us use D1 from PartyKit's hosted platform (which doesn't support
// native D1 bindings) by making HTTP requests to the Cloudflare API.
//
// Exposes the same .prepare().bind().first()/.all()/.run() interface
// that db.ts already uses, so no changes needed in the database helpers.

interface D1RestConfig {
  accountId: string;
  databaseId: string;
  apiToken: string;
}

interface D1ApiResponse<T = unknown> {
  result: Array<{
    results: T[];
    success: boolean;
    meta?: Record<string, unknown>;
  }>;
  success: boolean;
  errors: Array<{ message: string }>;
}

// ─── REST API query executor ────────────────────────────────────────

async function executeQuery<T>(
  config: D1RestConfig,
  sql: string,
  params: unknown[] = []
): Promise<{ results: T[]; success: boolean }> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiToken}`,
    },
    body: JSON.stringify({ sql, params }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 REST API error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as D1ApiResponse<T>;
  if (!data.success) {
    throw new Error(`D1 query failed: ${data.errors.map(e => e.message).join(', ')}`);
  }

  // The API returns an array of results (one per statement); take the first
  const first = data.result[0];
  return { results: first?.results ?? [], success: first?.success ?? true };
}

async function executeBatch(
  config: D1RestConfig,
  statements: Array<{ sql: string; params: unknown[] }>
): Promise<Array<{ results: unknown[]; success: boolean }>> {
  // D1 REST API /query only accepts a single statement per request.
  // Execute each statement sequentially to simulate batch behavior.
  const results: Array<{ results: unknown[]; success: boolean }> = [];

  for (const stmt of statements) {
    const result = await executeQuery(config, stmt.sql, stmt.params);
    results.push(result);
  }

  return results;
}

// ─── D1-compatible interface ────────────────────────────────────────

class D1RestPreparedStatement {
  private boundParams: unknown[] = [];

  constructor(
    private config: D1RestConfig,
    private sql: string
  ) {}

  bind(...values: unknown[]): D1RestPreparedStatement {
    const stmt = new D1RestPreparedStatement(this.config, this.sql);
    stmt.boundParams = values;
    return stmt;
  }

  async first<T>(): Promise<T | null> {
    const result = await executeQuery<T>(this.config, this.sql, this.boundParams);
    return result.results[0] ?? null;
  }

  async all<T>(): Promise<{ results: T[]; success: boolean }> {
    return executeQuery<T>(this.config, this.sql, this.boundParams);
  }

  async run(): Promise<{ results: unknown[]; success: boolean }> {
    return executeQuery(this.config, this.sql, this.boundParams);
  }

  // Internal: expose SQL and params for batch operations
  _getSql(): string {
    return this.sql;
  }

  _getParams(): unknown[] {
    return this.boundParams;
  }
}

export class D1RestDatabase {
  private config: D1RestConfig;

  constructor(accountId: string, databaseId: string, apiToken: string) {
    this.config = { accountId, databaseId, apiToken };
  }

  prepare(sql: string): D1RestPreparedStatement {
    return new D1RestPreparedStatement(this.config, sql);
  }

  async batch<T>(statements: D1RestPreparedStatement[]): Promise<Array<{ results: T[]; success: boolean }>> {
    const batch = statements.map(s => ({
      sql: s._getSql(),
      params: s._getParams(),
    }));
    return executeBatch(this.config, batch) as Promise<Array<{ results: T[]; success: boolean }>>;
  }
}

// ─── Factory ────────────────────────────────────────────────────────

/**
 * Creates a D1RestDatabase client from environment variables.
 * Returns null if required credentials are missing.
 */
export function createD1Client(env: Record<string, string | undefined>): D1RestDatabase | null {
  const accountId = env.CF_ACCOUNT_ID;
  const databaseId = env.CF_D1_DATABASE_ID;
  const apiToken = env.CF_D1_API_TOKEN;

  if (!accountId || !databaseId || !apiToken) {
    console.warn(
      '[D1] Missing credentials — database features disabled. Set CF_ACCOUNT_ID, CF_D1_DATABASE_ID, and CF_D1_API_TOKEN.'
    );
    return null;
  }

  return new D1RestDatabase(accountId, databaseId, apiToken);
}

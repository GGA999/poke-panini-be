import pg from 'pg';
import type { User } from '@supabase/supabase-js';
import type { Database } from './database.types.js';

const { Pool } = pg;

type PublicSchema = Database['public'];
type RelationMap = PublicSchema['Tables'] & PublicSchema['Views'];
type RelationName = Extract<keyof RelationMap, string>;
type RowFor<Name extends RelationName> = RelationMap[Name]['Row'];

export interface QueryError {
  code: string;
  message: string;
  details: string | null;
  hint: string | null;
}

interface QueryResponse<Data> {
  data: Data;
  error: QueryError | null;
}

interface OrderOptions {
  ascending?: boolean;
}

type QueryMode = 'many' | 'maybeSingle' | 'single';

interface Filter {
  column: string;
  operator: 'eq' | 'in';
  value: unknown;
}

interface OrderClause {
  column: string;
  ascending: boolean;
}

interface PgErrorLike {
  code?: string;
  message?: string;
  detail?: string;
  hint?: string;
}

export interface SupabaseLikeClient {
  from<Name extends RelationName>(
    relationName: Name
  ): LocalPostgresQueryBuilder<RowFor<Name>>;
  auth: {
    getUser(token: string): Promise<{
      data: { user: User | null };
      error: { message: string } | null;
    }>;
  };
}

function isPgErrorLike(error: unknown): error is PgErrorLike {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  );
}

function toQueryError(error: unknown): QueryError {
  if (isPgErrorLike(error)) {
    return {
      code: error.code ?? 'POSTGRES_ERROR',
      message: error.message ?? 'Errore PostgreSQL.',
      details: error.detail ?? null,
      hint: error.hint ?? null
    };
  }

  return {
    code: 'POSTGRES_ERROR',
    message: 'Errore PostgreSQL.',
    details: null,
    hint: null
  };
}

function quoteIdentifier(identifier: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(identifier)) {
    throw new Error(`Identificatore SQL non valido: ${identifier}`);
  }

  return `"${identifier}"`;
}

function parseColumns(columns: string): string[] {
  return columns
    .split(',')
    .map((column) => column.trim())
    .filter(Boolean);
}

function formatColumns(columns: string[] | null): string {
  if (!columns || columns.length === 0) {
    return '*';
  }

  return columns.map(quoteIdentifier).join(', ');
}

function buildSingleRowError(): QueryError {
  return {
    code: 'PGRST116',
    message: 'La query richiede esattamente una riga.',
    details: null,
    hint: null
  };
}

export class LocalPostgresQueryBuilder<Row extends object>
  implements PromiseLike<QueryResponse<Row[]>>
{
  private columns: string[] | null = null;
  private readonly filters: Filter[] = [];
  private readonly orders: OrderClause[] = [];
  private rowLimit: number | null = null;
  private signal: AbortSignal | null = null;

  constructor(
    private readonly pool: pg.Pool,
    private readonly relationName: string
  ) {}

  select(columns: string): this {
    this.columns = parseColumns(columns);
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.filters.push({ column, operator: 'in', value: values });
    return this;
  }

  order(column: string, options: OrderOptions = {}): this {
    this.orders.push({
      column,
      ascending: options.ascending ?? true
    });
    return this;
  }

  limit(limit: number): this {
    this.rowLimit = limit;
    return this;
  }

  abortSignal(signal: AbortSignal): this {
    this.signal = signal;
    return this;
  }

  maybeSingle(): Promise<QueryResponse<Row | null>> {
    return this.execute('maybeSingle');
  }

  single(): Promise<QueryResponse<Row | null>> {
    return this.execute('single');
  }

  then<TResult1 = QueryResponse<Row[]>, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResponse<Row[]>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute('many').then(onfulfilled, onrejected);
  }

  private async execute(
    mode: 'many'
  ): Promise<QueryResponse<Row[]>>;
  private async execute(
    mode: 'maybeSingle' | 'single'
  ): Promise<QueryResponse<Row | null>>;
  private async execute(
    mode: QueryMode
  ): Promise<QueryResponse<Row[] | Row | null>> {
    if (this.signal?.aborted) {
      return {
        data: mode === 'many' ? [] : null,
        error: {
          code: '57014',
          message: 'Query annullata.',
          details: null,
          hint: null
        }
      };
    }

    if (this.hasEmptyInFilter()) {
      return {
        data: mode === 'many' ? [] : null,
        error: null
      };
    }

    const values: unknown[] = [];
    const sql = this.buildSql(values);

    try {
      const result = await this.pool.query(sql, values);
      const rows = result.rows as Row[];

      if (mode === 'many') {
        return { data: rows, error: null };
      }

      if (mode === 'maybeSingle' && rows.length === 0) {
        return { data: null, error: null };
      }

      if (rows.length !== 1) {
        return {
          data: null,
          error: buildSingleRowError()
        };
      }

      return { data: rows[0] ?? null, error: null };
    } catch (error) {
      return {
        data: mode === 'many' ? [] : null,
        error: toQueryError(error)
      };
    }
  }

  private hasEmptyInFilter(): boolean {
    return this.filters.some(
      (filter) =>
        filter.operator === 'in' &&
        Array.isArray(filter.value) &&
        filter.value.length === 0
    );
  }

  private buildSql(values: unknown[]): string {
    const selectClause = formatColumns(this.columns);
    const relation = `public.${quoteIdentifier(this.relationName)}`;
    const whereClause = this.buildWhereClause(values);
    const orderClause = this.buildOrderClause();
    const limitClause = this.rowLimit === null ? '' : ` limit ${this.rowLimit}`;

    return [
      `select ${selectClause}`,
      `from ${relation}`,
      whereClause,
      orderClause,
      limitClause
    ]
      .filter(Boolean)
      .join(' ');
  }

  private buildWhereClause(values: unknown[]): string {
    const conditions = this.filters.map((filter) => {
      if (filter.operator === 'eq') {
        values.push(filter.value);
        return `${quoteIdentifier(filter.column)} = $${values.length}`;
      }

      if (!Array.isArray(filter.value)) {
        throw new Error('Il filtro IN richiede un array.');
      }

      const placeholders = filter.value.map((value) => {
        values.push(value);
        return `$${values.length}`;
      });

      return `${quoteIdentifier(filter.column)} in (${placeholders.join(', ')})`;
    });

    return conditions.length > 0 ? `where ${conditions.join(' and ')}` : '';
  }

  private buildOrderClause(): string {
    if (this.orders.length === 0) {
      return '';
    }

    const orderBy = this.orders
      .map(
        (order) =>
          `${quoteIdentifier(order.column)} ${order.ascending ? 'asc' : 'desc'}`
      )
      .join(', ');

    return `order by ${orderBy}`;
  }
}

export function createLocalPostgresClient(
  connectionString: string
): SupabaseLikeClient {
  const pool = new Pool({ connectionString });

  return {
    from<Name extends RelationName>(relationName: Name) {
      return new LocalPostgresQueryBuilder<RowFor<Name>>(pool, relationName);
    },
    auth: {
      getUser(token: string) {
        void token;

        return Promise.resolve({
          data: { user: null },
          error: {
            message:
              'Autenticazione Supabase non disponibile con DATABASE_PROVIDER=postgres.'
          }
        });
      }
    }
  };
}

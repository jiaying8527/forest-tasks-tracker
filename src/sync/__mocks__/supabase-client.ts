import type { AppState } from '../../storage/schema';

type Row = { user_id: string; state: AppState; updated_at: string };

export interface RealtimePayload {
  new: Row | null;
}
type RealtimeHandler = (payload: RealtimePayload) => void;

export interface MockSupabase {
  auth: {
    signOut: () => Promise<{ error: null }>;
  };
  from: (table: string) => QueryBuilder;
  channel: (name: string) => MockChannel;
  removeChannel: (channel: MockChannel) => Promise<void>;

  // Test hooks:
  _rows: Map<string, Row>;
  _fail: { next?: { name?: string; message: string } };
  _pushUpdate: (row: Row) => void;
  _signOutCalls: number;
}

interface QueryBuilder {
  select: (_cols: string) => QueryBuilder;
  eq: (col: string, val: string) => QueryBuilder;
  maybeSingle: () => Promise<{ data: Row | null; error: null | { message: string; name?: string } }>;
  single: () => Promise<{ data: Row | null; error: null | { message: string; name?: string } }>;
  insert: (row: Omit<Row, 'updated_at'>) => QueryBuilder;
  upsert: (row: Omit<Row, 'updated_at'>, opts?: unknown) => QueryBuilder;
}

export interface MockChannel {
  on: (event: string, filter: unknown, handler: RealtimeHandler) => MockChannel;
  subscribe: () => MockChannel;
  _handler: RealtimeHandler | null;
  _name: string;
}

export function createMockSupabase(): MockSupabase {
  const rows = new Map<string, Row>();
  const channels = new Map<string, MockChannel>();
  let stamp = 0;
  const nextStamp = () => {
    stamp += 1;
    return `2026-04-17T10:00:${String(stamp).padStart(2, '0')}.000Z`;
  };

  const mock: MockSupabase = {
    _rows: rows,
    _fail: {},
    _signOutCalls: 0,
    _pushUpdate(row) {
      rows.set(row.user_id, row);
      const handler = channels.get(`profile:${row.user_id}`)?._handler;
      handler?.({ new: row });
    },
    auth: {
      signOut: async () => {
        mock._signOutCalls += 1;
        return { error: null };
      },
    },
    from(_table: string): QueryBuilder {
      let filterUserId: string | null = null;
      let pendingRow: Omit<Row, 'updated_at'> | null = null;
      let op: 'select' | 'insert' | 'upsert' | null = null;
      const builder: QueryBuilder = {
        select() { return builder; },
        eq(col, val) {
          if (col === 'user_id') filterUserId = val;
          return builder;
        },
        async maybeSingle() {
          if (mock._fail.next) {
            const err = mock._fail.next; mock._fail.next = undefined;
            return { data: null, error: { message: err.message, name: err.name } };
          }
          const row = filterUserId ? rows.get(filterUserId) ?? null : null;
          return { data: row, error: null };
        },
        async single() {
          if (mock._fail.next) {
            const err = mock._fail.next; mock._fail.next = undefined;
            return { data: null, error: { message: err.message, name: err.name } };
          }
          if (op === 'insert' || op === 'upsert') {
            const row: Row = {
              ...(pendingRow as Omit<Row, 'updated_at'>),
              updated_at: nextStamp(),
            };
            rows.set(row.user_id, row);
            return { data: row, error: null };
          }
          const row = filterUserId ? rows.get(filterUserId) ?? null : null;
          return { data: row, error: null };
        },
        insert(row) {
          op = 'insert';
          pendingRow = row;
          return builder;
        },
        upsert(row) {
          op = 'upsert';
          pendingRow = row;
          return builder;
        },
      };
      return builder;
    },
    channel(name: string) {
      const ch: MockChannel = {
        _handler: null,
        _name: name,
        on(_event, _filter, handler) {
          ch._handler = handler;
          return ch;
        },
        subscribe() {
          return ch;
        },
      };
      channels.set(name, ch);
      return ch;
    },
    async removeChannel(ch) {
      channels.delete(ch._name);
    },
  };

  return mock;
}

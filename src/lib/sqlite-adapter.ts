/**
 * Driver adapter Prisma 6 memakai `node:sqlite` (Node 22+).
 * Dipakai hanya jika query engine native tidak tersedia (mis. binaries.prisma.sh diblokir).
 */
import "server-only";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  ColumnTypeEnum,
  DriverAdapterError,
  type ArgType,
  type ColumnType,
  type IsolationLevel,
  type SqlDriverAdapter,
  type SqlDriverAdapterFactory,
  type SqlQuery,
  type SqlResultSet,
  type Transaction,
  type TransactionOptions,
} from "@prisma/driver-adapter-utils";

const ADAPTER_NAME = "node:sqlite";

type SqliteDb = DatabaseSync;

function sqlitePath(url: string): string {
  const stripped = url.replace(/^file:/, "");
  if (stripped === ":memory:" || stripped.startsWith("/")) return stripped;
  return path.resolve(process.cwd(), stripped);
}

function mapDeclType(declType: string | null): ColumnType | null {
  if (!declType) return null;
  switch (declType.toUpperCase()) {
    case "DECIMAL":
      return ColumnTypeEnum.Numeric;
    case "FLOAT":
      return ColumnTypeEnum.Float;
    case "DOUBLE":
    case "DOUBLE PRECISION":
    case "NUMERIC":
    case "REAL":
      return ColumnTypeEnum.Double;
    case "TINYINT":
    case "SMALLINT":
    case "MEDIUMINT":
    case "INT":
    case "INTEGER":
    case "SERIAL":
    case "INT2":
      return ColumnTypeEnum.Int32;
    case "BIGINT":
    case "UNSIGNED BIG INT":
    case "INT8":
      return ColumnTypeEnum.Int64;
    case "DATETIME":
    case "TIMESTAMP":
      return ColumnTypeEnum.DateTime;
    case "TIME":
      return ColumnTypeEnum.Time;
    case "DATE":
      return ColumnTypeEnum.Date;
    case "TEXT":
    case "CLOB":
    case "CHARACTER":
    case "VARCHAR":
    case "VARYING CHARACTER":
    case "NCHAR":
    case "NATIVE CHARACTER":
    case "NVARCHAR":
      return ColumnTypeEnum.Text;
    case "BLOB":
      return ColumnTypeEnum.Bytes;
    case "BOOLEAN":
      return ColumnTypeEnum.Boolean;
    case "JSONB":
      return ColumnTypeEnum.Json;
    default:
      return null;
  }
}

function inferColumnType(value: unknown): ColumnType {
  switch (typeof value) {
    case "string":
      return ColumnTypeEnum.Text;
    case "bigint":
      return ColumnTypeEnum.Int64;
    case "boolean":
      return ColumnTypeEnum.Boolean;
    case "number":
      return ColumnTypeEnum.UnknownNumber;
    default:
      if (value instanceof ArrayBuffer || value instanceof Uint8Array) return ColumnTypeEnum.Bytes;
      return ColumnTypeEnum.Text;
  }
}

function getColumnTypes(declared: Array<string | null>, rows: unknown[][]): ColumnType[] {
  const types: Array<ColumnType | null> = declared.map(mapDeclType);
  for (let i = 0; i < types.length; i++) {
    if (types[i] !== null) continue;
    for (const row of rows) {
      if (row[i] !== null && row[i] !== undefined) {
        types[i] = inferColumnType(row[i]);
        break;
      }
    }
    if (types[i] === null) types[i] = ColumnTypeEnum.Int32;
  }
  return types as ColumnType[];
}

function mapRow(row: unknown[], columnTypes: ColumnType[]): unknown[] {
  return row.map((value, i) => {
    if (value instanceof ArrayBuffer || value instanceof Uint8Array) {
      return Array.from(new Uint8Array(value));
    }
    if (
      typeof value === "number" &&
      (columnTypes[i] === ColumnTypeEnum.Int32 || columnTypes[i] === ColumnTypeEnum.Int64) &&
      !Number.isInteger(value)
    ) {
      return Math.trunc(value);
    }
    if ((typeof value === "number" || typeof value === "bigint") && columnTypes[i] === ColumnTypeEnum.DateTime) {
      return new Date(Number(value)).toISOString();
    }
    if (typeof value === "bigint") return value.toString();
    return value;
  });
}

function mapArg(arg: unknown, argType: ArgType): unknown {
  if (arg === null || arg === undefined) return null;
  if (typeof arg === "string" && argType.scalarType === "int") return Number.parseInt(arg, 10);
  if (typeof arg === "string" && argType.scalarType === "float") return Number.parseFloat(arg);
  if (typeof arg === "string" && argType.scalarType === "decimal") return Number.parseFloat(arg);
  if (typeof arg === "string" && argType.scalarType === "bigint") return BigInt(arg);
  if (typeof arg === "boolean") return arg ? 1 : 0;
  if (typeof arg === "string" && argType.scalarType === "datetime") arg = new Date(arg);
  if (arg instanceof Date) return arg.toISOString().replace("Z", "+00:00");
  if (typeof arg === "string" && argType.scalarType === "bytes") return Buffer.from(arg, "base64");
  if (Array.isArray(arg) && argType.scalarType === "bytes") return Buffer.from(arg);
  return arg;
}

function convertDriverError(error: unknown): never {
  const e = error as { message?: string; errcode?: number; errstr?: string };
  const message = e.message ?? String(error);
  const code = e.errcode;

  if (code === 5) throw new DriverAdapterError({ kind: "SocketTimeout" });
  if (code === 2067 || code === 1555) {
    const fields = message
      .split("constraint failed: ")
      .at(1)
      ?.split(", ")
      .map((field) => field.split(".").pop()!);
    throw new DriverAdapterError({
      kind: "UniqueConstraintViolation",
      constraint: fields ? { fields } : undefined,
      originalMessage: message,
    });
  }
  if (code === 1299) {
    const fields = message
      .split("constraint failed: ")
      .at(1)
      ?.split(", ")
      .map((field) => field.split(".").pop()!);
    throw new DriverAdapterError({
      kind: "NullConstraintViolation",
      constraint: fields ? { fields } : undefined,
      originalMessage: message,
    });
  }
  if (code === 787 || code === 1811) {
    throw new DriverAdapterError({
      kind: "ForeignKeyConstraintViolation",
      constraint: { foreignKey: {} },
      originalMessage: message,
    });
  }
  if (message.startsWith("no such table")) {
    throw new DriverAdapterError({ kind: "TableDoesNotExist", table: message.split(": ").at(1) });
  }
  if (message.startsWith("no such column")) {
    throw new DriverAdapterError({ kind: "ColumnNotFound", column: message.split(": ").at(1) });
  }
  throw error instanceof Error ? error : new Error(message);
}

class Mutex {
  private tail: Promise<void> = Promise.resolve();
  acquire(): Promise<() => void> {
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const wait = this.tail.then(() => release);
    this.tail = next;
    return wait.then(() => release);
  }
}

class NodeSqliteQueryable {
  readonly provider = "sqlite" as const;
  readonly adapterName = ADAPTER_NAME;
  protected readonly client: SqliteDb;

  constructor(client: SqliteDb) {
    this.client = client;
  }

  async queryRaw(query: SqlQuery): Promise<SqlResultSet> {
    try {
      const args = query.args.map((arg, i) => mapArg(arg, query.argTypes[i]));
      const stmt = this.client.prepare(query.sql);
      const objects = stmt.all(...(args as never[])) as Record<string, unknown>[];
      const columns = typeof stmt.columns === "function" ? stmt.columns() : [];
      const columnNames = columns.length > 0 ? columns.map((c) => c.name) : objects[0] ? Object.keys(objects[0]) : [];
      const declaredTypes = columns.map((c) => c.type ?? null);
      const values = objects.map((row) => columnNames.map((name) => row[name] ?? null));
      const columnTypes = getColumnTypes(declaredTypes, values);
      return {
        columnNames,
        columnTypes,
        rows: values.map((row) => mapRow(row, columnTypes)),
      };
    } catch (e) {
      convertDriverError(e);
    }
  }

  async executeRaw(query: SqlQuery): Promise<number> {
    try {
      const args = query.args.map((arg, i) => mapArg(arg, query.argTypes[i]));
      const result = this.client.prepare(query.sql).run(...(args as never[]));
      return Number(result.changes);
    } catch (e) {
      convertDriverError(e);
    }
  }
}

class NodeSqliteTransaction extends NodeSqliteQueryable implements Transaction {
  readonly options: TransactionOptions;
  private readonly unlock: () => void;

  constructor(client: SqliteDb, options: TransactionOptions, unlock: () => void) {
    super(client);
    this.options = options;
    this.unlock = unlock;
  }

  async commit(): Promise<void> {
    this.unlock();
  }

  async rollback(): Promise<void> {
    this.unlock();
  }
}

class NodeSqliteAdapter extends NodeSqliteQueryable implements SqlDriverAdapter {
  #mutex = new Mutex();

  getConnectionInfo() {
    return { supportsRelationJoins: false, maxBindValues: 999 };
  }

  async executeScript(script: string): Promise<void> {
    try {
      this.client.exec(script);
    } catch (e) {
      convertDriverError(e);
    }
  }

  async startTransaction(isolationLevel?: IsolationLevel): Promise<Transaction> {
    if (isolationLevel && isolationLevel !== "SERIALIZABLE") {
      throw new DriverAdapterError({ kind: "InvalidIsolationLevel", level: isolationLevel });
    }
    const release = await this.#mutex.acquire();
    try {
      this.client.prepare("BEGIN").run();
      return new NodeSqliteTransaction(this.client, { usePhantomQuery: false }, release);
    } catch (e) {
      release();
      convertDriverError(e);
    }
  }

  async dispose(): Promise<void> {
    this.client.close();
  }
}

export class PrismaNodeSqlite implements SqlDriverAdapterFactory {
  readonly provider = "sqlite" as const;
  readonly adapterName = ADAPTER_NAME;
  readonly #url: string;

  constructor(config: { url: string }) {
    this.#url = config.url;
  }

  async connect(): Promise<SqlDriverAdapter> {
    return new NodeSqliteAdapter(new DatabaseSync(sqlitePath(this.#url)));
  }
}

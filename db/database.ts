import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import type DatabaseType from 'better-sqlite3';

const backendRequire = createRequire(
  path.resolve(__dirname, '../backend/package.json')
);
const Database = backendRequire('better-sqlite3') as typeof DatabaseType;

const schemaFilePath = path.resolve(__dirname, 'schema.sql');

let dbInstance: DatabaseType.Database | null = null;
let currentDbPath: string | null = null;

export const initializeDatabase = (
  customPath?: string
): DatabaseType.Database => {
  const resolvedPath =
    customPath ||
    process.env.PADEL_DB_PATH ||
    path.resolve(__dirname, 'padel.db');

  if (dbInstance && currentDbPath === resolvedPath) {
    return dbInstance;
  }

  if (dbInstance) {
    dbInstance.close();
  }

  dbInstance = new Database(resolvedPath);
  currentDbPath = resolvedPath;
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  const schemaSql = fs.readFileSync(schemaFilePath, 'utf-8');
  dbInstance.exec(schemaSql);

  return dbInstance;
};

export const getDb = (): DatabaseType.Database => {
  return initializeDatabase();
};

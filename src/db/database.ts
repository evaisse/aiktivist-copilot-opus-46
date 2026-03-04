import { Database } from "bun:sqlite";
import { join, dirname } from "path";
import { mkdirSync, existsSync } from "fs";

let db: Database | null = null;

export function getDbPath(): string {
  return process.env.DB_PATH || "./data/aiktivist.db";
}

export function getDb(): Database {
  if (!db) {
    const dbPath = getDbPath();
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    db = new Database(dbPath);
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function resetDb(): void {
  db = null;
}

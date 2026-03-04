import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { resetDb, getDb, closeDb } from "../src/db/database";
import { runMigrations } from "../src/db/migrate";

describe("Database and Migrations", () => {
  beforeAll(() => {
    process.env.DB_PATH = "/tmp/test-migrate.db";
    resetDb();
  });

  afterAll(() => {
    closeDb();
    try { require("fs").unlinkSync("/tmp/test-migrate.db"); } catch {}
  });

  test("migrations create all required tables", () => {
    runMigrations();
    const db = getDb();

    const tables = db
      .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r: any) => r.name);

    expect(tables).toContain("users");
    expect(tables).toContain("sessions");
    expect(tables).toContain("conversations");
    expect(tables).toContain("messages");
    expect(tables).toContain("events");
    expect(tables).toContain("_migrations");
  });

  test("migrations are idempotent", () => {
    // Running twice should not throw
    runMigrations();
    runMigrations();
    const db = getDb();
    const migrations = db.query("SELECT * FROM _migrations").all();
    expect(migrations.length).toBe(1);
  });

  test("users table has correct schema", () => {
    const db = getDb();
    const cols = db.query("PRAGMA table_info(users)").all() as any[];
    const colNames = cols.map((c) => c.name);
    expect(colNames).toContain("id");
    expect(colNames).toContain("username");
    expect(colNames).toContain("password_hash");
    expect(colNames).toContain("created_at");
  });

  test("conversations table has correct schema", () => {
    const db = getDb();
    const cols = db.query("PRAGMA table_info(conversations)").all() as any[];
    const colNames = cols.map((c) => c.name);
    expect(colNames).toContain("id");
    expect(colNames).toContain("user_id");
    expect(colNames).toContain("title");
    expect(colNames).toContain("archived");
    expect(colNames).toContain("created_at");
    expect(colNames).toContain("updated_at");
  });

  test("messages table has correct schema", () => {
    const db = getDb();
    const cols = db.query("PRAGMA table_info(messages)").all() as any[];
    const colNames = cols.map((c) => c.name);
    expect(colNames).toContain("id");
    expect(colNames).toContain("conversation_id");
    expect(colNames).toContain("role");
    expect(colNames).toContain("content");
    expect(colNames).toContain("created_at");
  });

  test("events table has correct schema", () => {
    const db = getDb();
    const cols = db.query("PRAGMA table_info(events)").all() as any[];
    const colNames = cols.map((c) => c.name);
    expect(colNames).toContain("id");
    expect(colNames).toContain("conversation_id");
    expect(colNames).toContain("type");
    expect(colNames).toContain("payload");
    expect(colNames).toContain("created_at");
  });

  test("foreign keys are enabled", () => {
    const db = getDb();
    const result = db.query("PRAGMA foreign_keys").get() as any;
    expect(result.foreign_keys).toBe(1);
  });

  test("WAL mode is enabled", () => {
    const db = getDb();
    const result = db.query("PRAGMA journal_mode").get() as any;
    expect(result.journal_mode).toBe("wal");
  });
});

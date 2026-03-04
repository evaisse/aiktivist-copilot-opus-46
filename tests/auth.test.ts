import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { getDb, closeDb, resetDb } from "../src/db/database";
import { runMigrations } from "../src/db/migrate";
import {
  hashPassword,
  verifyPassword,
  createUser,
  findUserByUsername,
  findUserById,
  createSession,
  findSession,
  deleteSession,
} from "../src/services/auth";

describe("Auth Service", () => {
  beforeAll(() => {
    process.env.DB_PATH = "/tmp/test-auth.db";
    resetDb();
    runMigrations();
  });

  afterAll(() => {
    closeDb();
    try { require("fs").unlinkSync("/tmp/test-auth.db"); } catch {}
  });

  test("hashPassword and verifyPassword work correctly", async () => {
    const password = "secret123";
    const hash = await hashPassword(password);
    expect(hash).toBeTruthy();
    expect(hash).not.toBe(password);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  test("createUser and findUserByUsername", async () => {
    const hash = await hashPassword("pass123");
    const id = createUser("testuser", hash);
    expect(id).toBeGreaterThan(0);

    const user = findUserByUsername("testuser");
    expect(user).toBeTruthy();
    expect(user.username).toBe("testuser");
    expect(user.password_hash).toBe(hash);
  });

  test("findUserById", async () => {
    const user = findUserByUsername("testuser");
    const found = findUserById(user.id);
    expect(found).toBeTruthy();
    expect(found.username).toBe("testuser");
  });

  test("createSession and findSession", () => {
    const user = findUserByUsername("testuser");
    const sessionId = createSession(user.id);
    expect(sessionId).toBeTruthy();
    expect(typeof sessionId).toBe("string");

    const session = findSession(sessionId);
    expect(session).toBeTruthy();
    expect(session.user_id).toBe(user.id);
    expect(session.username).toBe("testuser");
  });

  test("deleteSession removes session", () => {
    const user = findUserByUsername("testuser");
    const sessionId = createSession(user.id);
    expect(findSession(sessionId)).toBeTruthy();

    deleteSession(sessionId);
    expect(findSession(sessionId)).toBeNull();
  });

  test("findSession returns null for invalid session", () => {
    expect(findSession("nonexistent")).toBeNull();
  });

  test("duplicate username throws error", async () => {
    const hash = await hashPassword("pass");
    expect(() => createUser("testuser", hash)).toThrow();
  });
});

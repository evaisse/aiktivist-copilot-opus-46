import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { resetDb, closeDb } from "../src/db/database";
import { runMigrations } from "../src/db/migrate";
import { hashPassword, createUser } from "../src/services/auth";
import { createConversation } from "../src/services/conversations";
import { logEvent, getEvents } from "../src/services/events";
import { existsSync, readFileSync, unlinkSync } from "fs";

describe("Events Service", () => {
  let userId: number;
  let convId: string;

  beforeAll(async () => {
    process.env.DB_PATH = "/tmp/test-events.db";
    process.env.EVENTS_DIR = "/tmp/test-events-dir";
    resetDb();
    runMigrations();
    const hash = await hashPassword("pass");
    userId = createUser("evtuser", hash);
    const conv = createConversation(userId);
    convId = conv.id;
  });

  afterAll(() => {
    closeDb();
    try { unlinkSync("/tmp/test-events.db"); } catch {}
    try { unlinkSync("/tmp/test-events-dir/events.jsonl"); } catch {}
    try { require("fs").rmdirSync("/tmp/test-events-dir"); } catch {}
  });

  test("logEvent stores event in database", () => {
    const event = logEvent({
      conversation_id: convId,
      type: "test.event",
      payload: { foo: "bar" },
    });
    expect(event.id).toBeTruthy();
    expect(event.type).toBe("test.event");
    expect(event.payload.foo).toBe("bar");
  });

  test("logEvent writes to JSONL file", () => {
    logEvent({
      conversation_id: convId,
      type: "test.jsonl",
      payload: { data: 123 },
    });
    const jsonlPath = "/tmp/test-events-dir/events.jsonl";
    expect(existsSync(jsonlPath)).toBe(true);
    const lines = readFileSync(jsonlPath, "utf-8").trim().split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(2);
    const last = JSON.parse(lines[lines.length - 1]);
    expect(last.type).toBe("test.jsonl");
    expect(last.payload.data).toBe(123);
  });

  test("getEvents returns events for conversation", () => {
    const events = getEvents(convId);
    expect(events.length).toBeGreaterThanOrEqual(2);
    // Events should be ordered DESC by default
    for (let i = 1; i < events.length; i++) {
      expect(events[i - 1].created_at! >= events[i].created_at!).toBe(true);
    }
  });

  test("getEvents with limit", () => {
    const events = getEvents(convId, 1);
    expect(events.length).toBe(1);
  });

  test("logEvent with null conversation_id", () => {
    const event = logEvent({
      conversation_id: null,
      type: "system.event",
      payload: { message: "global" },
    });
    expect(event.conversation_id).toBeNull();
    expect(event.type).toBe("system.event");
  });

  test("getEvents without conversation_id returns all", () => {
    const events = getEvents(undefined, 100);
    expect(events.length).toBeGreaterThanOrEqual(3);
    const types = events.map((e) => e.type);
    expect(types).toContain("system.event");
  });
});

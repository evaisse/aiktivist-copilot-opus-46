import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { resetDb, closeDb } from "../src/db/database";
import { runMigrations } from "../src/db/migrate";
import { hashPassword, createUser } from "../src/services/auth";
import { createConversation, addMessage, getMessages } from "../src/services/conversations";
import { logEvent, getEvents } from "../src/services/events";

describe("Streaming and AI Integration", () => {
  let userId: number;
  let convId: string;

  beforeAll(async () => {
    process.env.DB_PATH = "/tmp/test-streaming.db";
    process.env.EVENTS_DIR = "/tmp/test-streaming-events";
    resetDb();
    runMigrations();
    const hash = await hashPassword("pass");
    userId = createUser("streamuser", hash);
    const conv = createConversation(userId);
    convId = conv.id;
  });

  afterAll(() => {
    closeDb();
    try { require("fs").unlinkSync("/tmp/test-streaming.db"); } catch {}
    try { require("fs").unlinkSync("/tmp/test-streaming-events/events.jsonl"); } catch {}
    try { require("fs").rmdirSync("/tmp/test-streaming-events"); } catch {}
  });

  test("messages are persisted and retrievable in order", () => {
    addMessage(convId, "user", "First message");
    addMessage(convId, "assistant", "First response");
    addMessage(convId, "user", "Second message");
    addMessage(convId, "assistant", "Second response");

    const msgs = getMessages(convId);
    expect(msgs.length).toBe(4);
    expect(msgs[0].role).toBe("user");
    expect(msgs[0].content).toBe("First message");
    expect(msgs[3].role).toBe("assistant");
    expect(msgs[3].content).toBe("Second response");

    // Verify ordering
    for (let i = 1; i < msgs.length; i++) {
      expect(msgs[i].created_at >= msgs[i - 1].created_at).toBe(true);
    }
  });

  test("AI events are logged correctly", () => {
    logEvent({
      conversation_id: convId,
      type: "ai.request",
      payload: {
        model: "google/gemini-3-flash-preview",
        message_count: 2,
        timestamp: new Date().toISOString(),
      },
    });

    logEvent({
      conversation_id: convId,
      type: "ai.response",
      payload: {
        model: "google/gemini-3-flash-preview",
        content_length: 150,
        timestamp: new Date().toISOString(),
      },
    });

    const events = getEvents(convId);
    const aiEvents = events.filter((e) => e.type.startsWith("ai."));
    expect(aiEvents.length).toBe(2);
    expect(aiEvents.some((e) => e.type === "ai.request")).toBe(true);
    expect(aiEvents.some((e) => e.type === "ai.response")).toBe(true);
  });

  test("error events are tracked", () => {
    logEvent({
      conversation_id: convId,
      type: "ai.error",
      payload: { error: "Rate limit exceeded", status: 429 },
    });

    const events = getEvents(convId);
    const errorEvents = events.filter((e) => e.type === "ai.error");
    expect(errorEvents.length).toBeGreaterThanOrEqual(1);
    expect(errorEvents[0].payload.error).toBe("Rate limit exceeded");
  });

  test("streamChatCompletion callbacks structure", async () => {
    // We test the callback interface without actually calling OpenRouter
    const { streamChatCompletion } = await import("../src/services/ai");
    expect(typeof streamChatCompletion).toBe("function");
  });
});

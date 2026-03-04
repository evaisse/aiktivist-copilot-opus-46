import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { resetDb, closeDb } from "../src/db/database";
import { runMigrations } from "../src/db/migrate";
import { hashPassword, createUser } from "../src/services/auth";
import {
  createConversation,
  listConversations,
  getConversation,
  archiveConversation,
  deleteConversation,
  addMessage,
  getMessages,
  updateConversationTitle,
  touchConversation,
} from "../src/services/conversations";

describe("Conversations Service", () => {
  let userId: number;

  beforeAll(async () => {
    process.env.DB_PATH = "/tmp/test-conv.db";
    resetDb();
    runMigrations();
    const hash = await hashPassword("pass");
    userId = createUser("convuser", hash);
  });

  afterAll(() => {
    closeDb();
    try { require("fs").unlinkSync("/tmp/test-conv.db"); } catch {}
  });

  test("createConversation creates a new conversation", () => {
    const conv = createConversation(userId);
    expect(conv).toBeTruthy();
    expect(conv.id).toBeTruthy();
    expect(conv.user_id).toBe(userId);
    expect(conv.title).toBe("New conversation");
    expect(conv.archived).toBe(0);
  });

  test("createConversation with custom title", () => {
    const conv = createConversation(userId, "My custom title");
    expect(conv.title).toBe("My custom title");
  });

  test("listConversations returns user conversations", () => {
    const convs = listConversations(userId);
    expect(convs.length).toBeGreaterThanOrEqual(2);
    // Should be ordered by updated_at DESC
    for (let i = 1; i < convs.length; i++) {
      expect(convs[i - 1].updated_at >= convs[i].updated_at).toBe(true);
    }
  });

  test("getConversation returns specific conversation", () => {
    const conv = createConversation(userId, "Specific");
    const found = getConversation(conv.id, userId);
    expect(found).toBeTruthy();
    expect(found!.title).toBe("Specific");
  });

  test("getConversation returns null for wrong user", () => {
    const conv = createConversation(userId, "Private");
    const found = getConversation(conv.id, 99999);
    expect(found).toBeNull();
  });

  test("archiveConversation hides from list", () => {
    const conv = createConversation(userId, "To archive");
    archiveConversation(conv.id, userId);
    const convs = listConversations(userId);
    const found = convs.find((c) => c.id === conv.id);
    expect(found).toBeUndefined();
  });

  test("deleteConversation removes conversation", () => {
    const conv = createConversation(userId, "To delete");
    deleteConversation(conv.id, userId);
    const found = getConversation(conv.id, userId);
    expect(found).toBeNull();
  });

  test("updateConversationTitle updates title", () => {
    const conv = createConversation(userId, "Old title");
    updateConversationTitle(conv.id, userId, "New title");
    const found = getConversation(conv.id, userId);
    expect(found!.title).toBe("New title");
  });

  test("addMessage and getMessages work correctly", () => {
    const conv = createConversation(userId, "Chat");
    addMessage(conv.id, "user", "Hello");
    addMessage(conv.id, "assistant", "Hi there!");
    addMessage(conv.id, "user", "How are you?");

    const msgs = getMessages(conv.id);
    expect(msgs.length).toBe(3);
    expect(msgs[0].role).toBe("user");
    expect(msgs[0].content).toBe("Hello");
    expect(msgs[1].role).toBe("assistant");
    expect(msgs[1].content).toBe("Hi there!");
    expect(msgs[2].role).toBe("user");
    expect(msgs[2].content).toBe("How are you?");
  });

  test("touchConversation updates timestamp", () => {
    const conv = createConversation(userId);
    touchConversation(conv.id);
    const after = getConversation(conv.id, userId)!.updated_at;
    expect(after >= conv.updated_at).toBe(true);
  });
});

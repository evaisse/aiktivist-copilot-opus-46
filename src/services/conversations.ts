import { getDb } from "../db/database";

export interface Conversation {
  id: string;
  user_id: number;
  title: string;
  archived: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export function createConversation(userId: number, title?: string): Conversation {
  const db = getDb();
  const id = crypto.randomUUID();
  const t = title || "New conversation";
  db.query(
    "INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)"
  ).run(id, userId, t);
  return db.query("SELECT * FROM conversations WHERE id = ?").get(id) as Conversation;
}

export function listConversations(userId: number): Conversation[] {
  const db = getDb();
  return db
    .query(
      "SELECT * FROM conversations WHERE user_id = ? AND archived = 0 ORDER BY updated_at DESC"
    )
    .all(userId) as Conversation[];
}

export function getConversation(id: string, userId: number): Conversation | null {
  const db = getDb();
  return (
    (db
      .query("SELECT * FROM conversations WHERE id = ? AND user_id = ?")
      .get(id, userId) as Conversation) || null
  );
}

export function archiveConversation(id: string, userId: number): void {
  const db = getDb();
  db.query(
    "UPDATE conversations SET archived = 1, updated_at = datetime('now') WHERE id = ? AND user_id = ?"
  ).run(id, userId);
}

export function deleteConversation(id: string, userId: number): void {
  const db = getDb();
  db.query("DELETE FROM conversations WHERE id = ? AND user_id = ?").run(id, userId);
}

export function updateConversationTitle(id: string, userId: number, title: string): void {
  const db = getDb();
  db.query(
    "UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?"
  ).run(title, id, userId);
}

export function touchConversation(id: string): void {
  const db = getDb();
  db.query("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(id);
}

export function addMessage(
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string
): Message {
  const db = getDb();
  const result = db
    .query(
      "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)"
    )
    .run(conversationId, role, content);
  return db
    .query("SELECT * FROM messages WHERE id = ?")
    .get(Number(result.lastInsertRowid)) as Message;
}

export function getMessages(conversationId: string): Message[] {
  const db = getDb();
  return db
    .query("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
    .all(conversationId) as Message[];
}

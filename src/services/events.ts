import { getDb } from "../db/database";
import { appendFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";

export interface AppEvent {
  id?: number;
  conversation_id: string | null;
  type: string;
  payload: Record<string, any>;
  created_at?: string;
}

const JSONL_DIR = process.env.EVENTS_DIR || "./data";

function ensureJsonlDir(): void {
  if (!existsSync(JSONL_DIR)) {
    mkdirSync(JSONL_DIR, { recursive: true });
  }
}

export function logEvent(event: Omit<AppEvent, "id" | "created_at">): AppEvent {
  const db = getDb();
  const result = db
    .query(
      "INSERT INTO events (conversation_id, type, payload) VALUES (?, ?, ?)"
    )
    .run(
      event.conversation_id,
      event.type,
      JSON.stringify(event.payload)
    );

  const saved = db
    .query("SELECT * FROM events WHERE id = ?")
    .get(Number(result.lastInsertRowid)) as any;

  // Append to JSONL file
  ensureJsonlDir();
  const jsonlPath = join(JSONL_DIR, "events.jsonl");
  const line = JSON.stringify({
    id: saved.id,
    conversation_id: saved.conversation_id,
    type: saved.type,
    payload: JSON.parse(saved.payload),
    created_at: saved.created_at,
  });
  appendFileSync(jsonlPath, line + "\n");

  return {
    ...saved,
    payload: JSON.parse(saved.payload),
  };
}

export function getEvents(conversationId?: string, limit = 100): AppEvent[] {
  const db = getDb();
  let rows: any[];
  if (conversationId) {
    rows = db
      .query(
        "SELECT * FROM events WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?"
      )
      .all(conversationId, limit);
  } else {
    rows = db
      .query("SELECT * FROM events ORDER BY created_at DESC LIMIT ?")
      .all(limit);
  }
  return rows.map((r: any) => ({
    ...r,
    payload: JSON.parse(r.payload),
  }));
}

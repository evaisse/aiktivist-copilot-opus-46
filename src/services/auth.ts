import { getDb } from "../db/database";

export async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, { algorithm: "bcrypt", cost: 10 });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await Bun.password.verify(password, hash);
}

export function createUser(username: string, passwordHash: string): number {
  const db = getDb();
  const result = db
    .query("INSERT INTO users (username, password_hash) VALUES (?, ?)")
    .run(username, passwordHash);
  return Number(result.lastInsertRowid);
}

export function findUserByUsername(username: string): any {
  const db = getDb();
  return db.query("SELECT * FROM users WHERE username = ?").get(username);
}

export function findUserById(id: number): any {
  const db = getDb();
  return db.query("SELECT * FROM users WHERE id = ?").get(id);
}

export function createSession(userId: number): string {
  const db = getDb();
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.query("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(
    id,
    userId,
    expiresAt
  );
  return id;
}

export function findSession(sessionId: string): any {
  const db = getDb();
  return db
    .query(
      "SELECT s.*, u.username FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ? AND s.expires_at > datetime('now')"
    )
    .get(sessionId);
}

export function deleteSession(sessionId: string): void {
  const db = getDb();
  db.query("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

export async function ensureAdminUser(): Promise<void> {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin";
  const existing = findUserByUsername(username);
  if (!existing) {
    const hash = await hashPassword(password);
    createUser(username, hash);
    console.log(`[auth] Admin user '${username}' created.`);
  }
}

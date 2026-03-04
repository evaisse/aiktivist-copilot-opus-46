import { getDb } from "./database";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

export function runMigrations(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const migrationsDir = join(import.meta.dir, "migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const applied = new Set(
    db
      .query("SELECT name FROM _migrations")
      .all()
      .map((r: any) => r.name)
  );

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(migrationsDir, file), "utf-8");
    db.exec(sql);
    db.query("INSERT INTO _migrations (name) VALUES (?)").run(file);
    console.log(`[migrate] Applied: ${file}`);
  }
}

if (import.meta.main) {
  runMigrations();
  console.log("[migrate] Done.");
}

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { resetDb, closeDb } from "../src/db/database";
import { runMigrations } from "../src/db/migrate";
import { ensureAdminUser } from "../src/services/auth";
import { Hono } from "hono";
import { authMiddleware } from "../src/middleware/auth";
import authRoutes from "../src/routes/auth";
import conversationRoutes from "../src/routes/conversations";
import eventRoutes from "../src/routes/events";

describe("Routes Integration", () => {
  let app: Hono;

  beforeAll(async () => {
    process.env.DB_PATH = "/tmp/test-routes.db";
    process.env.EVENTS_DIR = "/tmp/test-routes-events";
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "testpass";
    resetDb();
    runMigrations();
    await ensureAdminUser();

    app = new Hono();
    app.use("*", authMiddleware);
    app.route("/", authRoutes);
    app.route("/", conversationRoutes);
    app.route("/", eventRoutes);
  });

  afterAll(() => {
    closeDb();
    try { require("fs").unlinkSync("/tmp/test-routes.db"); } catch {}
    try { require("fs").unlinkSync("/tmp/test-routes-events/events.jsonl"); } catch {}
    try { require("fs").rmdirSync("/tmp/test-routes-events"); } catch {}
  });

  test("GET /login returns login page", async () => {
    const res = await app.request("/login");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("aiktivist");
    expect(html).toContain("username");
    expect(html).toContain("password");
  });

  test("GET / without auth redirects to /login", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/login");
  });

  test("POST /api/login with valid credentials redirects", async () => {
    const formData = new URLSearchParams();
    formData.append("username", "admin");
    formData.append("password", "testpass");

    const res = await app.request("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/");
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("session=");
  });

  test("POST /api/login with invalid credentials returns 401", async () => {
    const formData = new URLSearchParams();
    formData.append("username", "admin");
    formData.append("password", "wrongpass");

    const res = await app.request("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    expect(res.status).toBe(401);
    const html = await res.text();
    expect(html).toContain("Invalid credentials");
  });

  test("POST /api/login with empty fields returns 400", async () => {
    const formData = new URLSearchParams();
    formData.append("username", "");
    formData.append("password", "");

    const res = await app.request("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    expect(res.status).toBe(400);
  });

  // Helper to get session cookie
  async function getSessionCookie(): Promise<string> {
    const formData = new URLSearchParams();
    formData.append("username", "admin");
    formData.append("password", "testpass");

    const res = await app.request("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const setCookie = res.headers.get("set-cookie") || "";
    const match = setCookie.match(/session=([^;]+)/);
    return match ? match[1] : "";
  }

  test("GET / with valid session returns app page", async () => {
    const sessionId = await getSessionCookie();
    const res = await app.request("/", {
      headers: { Cookie: `session=${sessionId}` },
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("aiktivist");
    expect(html).toContain("New conversation");
  });

  test("POST /api/conversations creates conversation and redirects", async () => {
    const sessionId = await getSessionCookie();
    const res = await app.request("/api/conversations", {
      method: "POST",
      headers: { Cookie: `session=${sessionId}` },
    });

    expect(res.status).toBe(302);
    const location = res.headers.get("location") || "";
    expect(location).toMatch(/^\/c\//);
  });

  test("GET /c/:id returns conversation page", async () => {
    const sessionId = await getSessionCookie();

    // Create a conversation
    const createRes = await app.request("/api/conversations", {
      method: "POST",
      headers: { Cookie: `session=${sessionId}` },
    });
    const convUrl = createRes.headers.get("location") || "";

    // Visit conversation page
    const res = await app.request(convUrl, {
      headers: { Cookie: `session=${sessionId}` },
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("msg-input");
    expect(html).toContain("send-btn");
  });

  test("POST /api/conversations/:id/archive archives conversation", async () => {
    const sessionId = await getSessionCookie();

    const createRes = await app.request("/api/conversations", {
      method: "POST",
      headers: { Cookie: `session=${sessionId}` },
    });
    const convUrl = createRes.headers.get("location") || "";
    const convId = convUrl.split("/c/")[1];

    const res = await app.request(`/api/conversations/${convId}/archive`, {
      method: "POST",
      headers: { Cookie: `session=${sessionId}` },
    });

    expect(res.status).toBe(302);
  });

  test("POST /api/conversations/:id/delete deletes conversation", async () => {
    const sessionId = await getSessionCookie();

    const createRes = await app.request("/api/conversations", {
      method: "POST",
      headers: { Cookie: `session=${sessionId}` },
    });
    const convUrl = createRes.headers.get("location") || "";
    const convId = convUrl.split("/c/")[1];

    const res = await app.request(`/api/conversations/${convId}/delete`, {
      method: "POST",
      headers: { Cookie: `session=${sessionId}` },
    });

    expect(res.status).toBe(302);

    // Verify deleted
    const getRes = await app.request(convUrl, {
      headers: { Cookie: `session=${sessionId}` },
    });
    expect(getRes.status).toBe(302); // Redirects to / since not found
  });

  test("POST /api/logout destroys session and redirects", async () => {
    const sessionId = await getSessionCookie();

    const res = await app.request("/api/logout", {
      method: "POST",
      headers: { Cookie: `session=${sessionId}` },
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/login");

    // Session should now be invalid
    const checkRes = await app.request("/", {
      headers: { Cookie: `session=${sessionId}` },
    });
    expect(checkRes.status).toBe(302);
    expect(checkRes.headers.get("location")).toBe("/login");
  });

  test("GET /api/events returns events list", async () => {
    const sessionId = await getSessionCookie();

    const res = await app.request("/api/events", {
      headers: { Cookie: `session=${sessionId}` },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

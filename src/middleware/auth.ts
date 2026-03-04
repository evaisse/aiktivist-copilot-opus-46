import { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { findSession } from "../services/auth";

export async function authMiddleware(c: Context, next: Next) {
  const path = new URL(c.req.url).pathname;

  // Public routes
  if (path === "/login" || path === "/api/login" || path.startsWith("/static/")) {
    return next();
  }

  const sessionId = getCookie(c, "session");
  if (!sessionId) {
    return c.redirect("/login");
  }

  const session = findSession(sessionId);
  if (!session) {
    return c.redirect("/login");
  }

  c.set("userId", session.user_id);
  c.set("username", session.username);
  return next();
}

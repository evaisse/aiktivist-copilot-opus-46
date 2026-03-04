import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import {
  findUserByUsername,
  verifyPassword,
  createSession,
  deleteSession,
} from "../services/auth";
import { getCookie } from "hono/cookie";
import { loginPage } from "../views/login";
import { logEvent } from "../services/events";

const auth = new Hono();

auth.get("/login", (c) => {
  return c.html(loginPage());
});

auth.post("/api/login", async (c) => {
  const body = await c.req.parseBody();
  const username = String(body.username || "");
  const password = String(body.password || "");

  if (!username || !password) {
    return c.html(loginPage("Username and password required"), 400);
  }

  const user = findUserByUsername(username);
  if (!user) {
    logEvent({
      conversation_id: null,
      type: "auth.login_failed",
      payload: { username, reason: "user_not_found" },
    });
    return c.html(loginPage("Invalid credentials"), 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    logEvent({
      conversation_id: null,
      type: "auth.login_failed",
      payload: { username, reason: "bad_password" },
    });
    return c.html(loginPage("Invalid credentials"), 401);
  }

  const sessionId = createSession(user.id);
  setCookie(c, "session", sessionId, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  logEvent({
    conversation_id: null,
    type: "auth.login",
    payload: { userId: user.id, username },
  });

  return c.redirect("/");
});

auth.post("/api/logout", (c) => {
  const sessionId = getCookie(c, "session");
  if (sessionId) {
    deleteSession(sessionId);
    logEvent({
      conversation_id: null,
      type: "auth.logout",
      payload: { sessionId },
    });
  }
  deleteCookie(c, "session", { path: "/" });
  return c.redirect("/login");
});

export default auth;

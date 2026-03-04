import { Hono } from "hono";
import { getEvents } from "../services/events";

const events = new Hono();

events.get("/api/events", (c) => {
  const conversationId = c.req.query("conversation_id");
  const limit = parseInt(c.req.query("limit") || "100");
  const eventList = getEvents(conversationId || undefined, limit);
  return c.json(eventList);
});

export default events;

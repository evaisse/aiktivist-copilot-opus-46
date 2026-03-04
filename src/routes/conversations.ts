import { Hono } from "hono";
import {
  createConversation,
  listConversations,
  getConversation,
  archiveConversation,
  deleteConversation,
  addMessage,
  getMessages,
  touchConversation,
  updateConversationTitle,
} from "../services/conversations";
import { streamChatCompletion } from "../services/ai";
import { logEvent } from "../services/events";
import { appPage } from "../views/app";
import { conversationPage } from "../views/conversation";

const conversations = new Hono();

// Main page - conversation list
conversations.get("/", (c) => {
  const userId = c.get("userId");
  const convs = listConversations(userId);
  return c.html(appPage(convs, c.get("username")));
});

// Create new conversation
conversations.post("/api/conversations", async (c) => {
  const userId = c.get("userId");
  const conv = createConversation(userId);
  logEvent({
    conversation_id: conv.id,
    type: "conversation.created",
    payload: { userId },
  });
  return c.redirect(`/c/${conv.id}`);
});

// View conversation
conversations.get("/c/:id", (c) => {
  const userId = c.get("userId");
  const conv = getConversation(c.req.param("id"), userId);
  if (!conv) return c.redirect("/");
  const messages = getMessages(conv.id);
  const allConvs = listConversations(userId);
  return c.html(conversationPage(conv, messages, allConvs, c.get("username")));
});

// Archive conversation
conversations.post("/api/conversations/:id/archive", (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  archiveConversation(id, userId);
  logEvent({
    conversation_id: id,
    type: "conversation.archived",
    payload: { userId },
  });
  return c.redirect("/");
});

// Delete conversation
conversations.post("/api/conversations/:id/delete", (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  deleteConversation(id, userId);
  logEvent({
    conversation_id: id,
    type: "conversation.deleted",
    payload: { userId },
  });
  return c.redirect("/");
});

// Send message and get AI response (SSE streaming)
conversations.post("/api/conversations/:id/messages", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const conv = getConversation(id, userId);
  if (!conv) return c.json({ error: "Not found" }, 404);

  const body = await c.req.parseBody();
  const content = String(body.content || "").trim();
  if (!content) return c.json({ error: "Empty message" }, 400);

  // Save user message
  addMessage(id, "user", content);
  touchConversation(id);

  // Auto-title from first message
  if (getMessages(id).length === 1) {
    const title = content.slice(0, 60) + (content.length > 60 ? "…" : "");
    updateConversationTitle(id, userId, title);
  }

  logEvent({
    conversation_id: id,
    type: "message.user",
    payload: { userId, content_length: content.length },
  });

  // Return SSE stream for AI response
  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (event: string, data: string) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
        };

        send("status", JSON.stringify({ state: "thinking" }));

        await streamChatCompletion(id, userId, {
          onChunk(text) {
            send("chunk", JSON.stringify({ text }));
          },
          onDone(fullText) {
            send("done", JSON.stringify({ text: fullText }));
            controller.close();
          },
          onError(error) {
            send("error", JSON.stringify({ error }));
            controller.close();
          },
        });
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    }
  );
});

// Get messages as JSON
conversations.get("/api/conversations/:id/messages", (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const conv = getConversation(id, userId);
  if (!conv) return c.json({ error: "Not found" }, 404);
  const messages = getMessages(id);
  return c.json(messages);
});

export default conversations;

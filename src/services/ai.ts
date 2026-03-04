import { logEvent } from "./events";
import { addMessage, touchConversation, getMessages } from "./conversations";

const DEFAULT_MODEL = "google/gemini-3-flash-preview";

function getBaseUrl(): string {
  return process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
}

function getApiKey(): string {
  return process.env.OPENROUTER_API_KEY || "";
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: string) => void;
}

export async function streamChatCompletion(
  conversationId: string,
  userId: number,
  callbacks: StreamCallbacks
): Promise<void> {
  const messages = getMessages(conversationId);
  const apiMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const model = DEFAULT_MODEL;
  const baseUrl = getBaseUrl();
  const apiKey = getApiKey();

  logEvent({
    conversation_id: conversationId,
    type: "ai.request",
    payload: {
      model,
      message_count: apiMessages.length,
      timestamp: new Date().toISOString(),
    },
  });

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://aiktivist.fly.dev",
        "X-Title": "aiktivist",
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logEvent({
        conversation_id: conversationId,
        type: "ai.error",
        payload: { status: response.status, body: errorBody },
      });
      callbacks.onError(`OpenRouter error: ${response.status} - ${errorBody}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError("No response body");
      return;
    }

    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            callbacks.onChunk(delta);
          }
        } catch {
          // skip unparseable chunks
        }
      }
    }

    // Save assistant message
    addMessage(conversationId, "assistant", fullText);
    touchConversation(conversationId);

    logEvent({
      conversation_id: conversationId,
      type: "ai.response",
      payload: {
        model,
        content_length: fullText.length,
        timestamp: new Date().toISOString(),
      },
    });

    callbacks.onDone(fullText);
  } catch (error: any) {
    logEvent({
      conversation_id: conversationId,
      type: "ai.error",
      payload: { error: error.message },
    });
    callbacks.onError(error.message);
  }
}

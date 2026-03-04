import { baseLayout } from "./layout";
import { Conversation, Message } from "../services/conversations";
import { sidebarHtml, escapeHtml } from "./app";

export function conversationPage(
  conv: Conversation,
  messages: Message[],
  allConversations: Conversation[],
  username: string
): string {
  const messagesHtml = messages
    .map(
      (m) => `
      <div class="message">
        <div class="message-role ${m.role}">${m.role}<span class="message-time">${formatTime(m.created_at)}</span></div>
        <div class="message-content">${escapeHtml(m.content)}</div>
      </div>`
    )
    .join("");

  const scripts = `
  <script>
    const convId = "${conv.id}";
    const textarea = document.getElementById('msg-input');
    const sendBtn = document.getElementById('send-btn');
    const messagesArea = document.getElementById('messages');
    const statusEl = document.getElementById('status');

    // Auto-resize textarea
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    });

    // Send on Enter (Shift+Enter for newline)
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    sendBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sendMessage();
    });

    function scrollToBottom() {
      messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    async function sendMessage() {
      const content = textarea.value.trim();
      if (!content) return;

      // Show user message immediately
      appendMessage('user', content);
      textarea.value = '';
      textarea.style.height = 'auto';
      textarea.disabled = true;
      sendBtn.disabled = true;
      scrollToBottom();

      // Show thinking state
      showStatus('thinking');

      // Create assistant message placeholder
      const assistantEl = appendMessage('assistant', '');
      const contentEl = assistantEl.querySelector('.message-content');
      contentEl.classList.add('streaming-cursor');

      try {
        const formData = new FormData();
        formData.append('content', content);

        const response = await fetch('/api/conversations/' + convId + '/messages', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Request failed: ' + response.status);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              var currentEvent = line.slice(7);
            }
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              if (currentEvent === 'status') {
                showStatus(data.state);
              } else if (currentEvent === 'chunk') {
                hideStatus();
                contentEl.textContent += data.text;
                scrollToBottom();
              } else if (currentEvent === 'done') {
                contentEl.classList.remove('streaming-cursor');
                hideStatus();
              } else if (currentEvent === 'error') {
                contentEl.classList.remove('streaming-cursor');
                showStatus('error: ' + data.error, true);
              }
            }
          }
        }
      } catch (err) {
        showStatus('error: ' + err.message, true);
      } finally {
        contentEl.classList.remove('streaming-cursor');
        textarea.disabled = false;
        sendBtn.disabled = false;
        textarea.focus();
      }
    }

    function appendMessage(role, content) {
      const div = document.createElement('div');
      div.className = 'message';
      div.innerHTML =
        '<div class="message-role ' + role + '">' + role + '</div>' +
        '<div class="message-content">' + escapeHtml(content) + '</div>';
      messagesArea.appendChild(div);
      scrollToBottom();
      return div;
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function showStatus(text, isError) {
      statusEl.textContent = text;
      statusEl.className = 'status-indicator visible' + (isError ? ' error' : '');
    }

    function hideStatus() {
      statusEl.className = 'status-indicator';
    }

    // Scroll to bottom on load
    scrollToBottom();
    textarea.focus();
  </script>`;

  return baseLayout(
    conv.title,
    `
    <div class="app-layout">
      ${sidebarHtml(allConversations, username, conv.id)}
      <div class="main-content">
        <div class="conv-header">
          <span class="conv-title">${escapeHtml(conv.title)}</span>
          <div style="display:flex;gap:0.5rem;">
            <form method="POST" action="/api/conversations/${conv.id}/archive" style="margin:0">
              <button type="submit" class="btn btn-sm" title="Archive">archive</button>
            </form>
            <form method="POST" action="/api/conversations/${conv.id}/delete" style="margin:0"
              onsubmit="return confirm('Delete this conversation?')">
              <button type="submit" class="btn btn-sm btn-danger" title="Delete">delete</button>
            </form>
          </div>
        </div>
        <div id="messages" class="messages-area">
          ${messagesHtml}
        </div>
        <div id="status" class="status-indicator"></div>
        <div class="input-area">
          <div class="input-wrapper">
            <textarea id="msg-input" placeholder="Send a message…" rows="1"></textarea>
            <button id="send-btn" class="btn btn-primary">→</button>
          </div>
        </div>
      </div>
    </div>
    `,
    scripts
  );
}

function formatTime(isoStr: string): string {
  try {
    const d = new Date(isoStr + "Z");
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

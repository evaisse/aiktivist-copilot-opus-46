import { baseLayout } from "./layout";
import { Conversation } from "../services/conversations";

function sidebarHtml(conversations: Conversation[], username: string, activeId?: string): string {
  const items = conversations
    .map(
      (c) =>
        `<a href="/c/${c.id}" class="sidebar-item ${c.id === activeId ? "active" : ""}" title="${escapeHtml(c.title)}">${escapeHtml(c.title)}</a>`
    )
    .join("");

  return `
    <div class="sidebar">
      <div class="sidebar-header">
        <h1>aiktivist</h1>
        <form method="POST" action="/api/conversations" style="margin:0">
          <button type="submit" class="btn btn-primary btn-sm" title="New conversation">+</button>
        </form>
      </div>
      <div class="sidebar-list">
        ${items || '<div style="padding: 1rem; color: var(--fg-muted); font-size: 12px;">No conversations yet</div>'}
      </div>
      <div class="sidebar-footer">
        <span>${escapeHtml(username)}</span>
        <form method="POST" action="/api/logout" style="margin:0">
          <button type="submit" class="btn btn-sm btn-danger">logout</button>
        </form>
      </div>
    </div>`;
}

export function appPage(conversations: Conversation[], username: string): string {
  return baseLayout(
    "Home",
    `
    <div class="app-layout">
      ${sidebarHtml(conversations, username)}
      <div class="main-content">
        <div class="empty-state">
          <h2>Welcome to aiktivist</h2>
          <p>Start a new conversation to interact with an AI agent.</p>
          <form method="POST" action="/api/conversations">
            <button type="submit" class="btn btn-primary">+ New conversation</button>
          </form>
        </div>
      </div>
    </div>
    `
  );
}

export { sidebarHtml, escapeHtml };

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

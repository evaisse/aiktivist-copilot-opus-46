export function baseLayout(title: string, content: string, scripts?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — aiktivist</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,700;1,400&display=swap');

    :root {
      --bg-main: #151816;
      --bg-panel: #1b1f1d;
      --fg-main: #f1f3ee;
      --fg-muted: #8a9188;
      --accent-user: #8ccf2f;
      --accent-keyword: #f0d44a;
      --accent-link: #4aa3ff;
      --border-subtle: #2c3230;
      --danger: #e85545;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      line-height: 1.5;
      background: var(--bg-main);
      color: var(--fg-main);
      min-height: 100vh;
    }

    a { color: var(--accent-link); text-decoration: none; }
    a:hover { text-decoration: underline; }

    .container { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg-main); }
    ::-webkit-scrollbar-thumb { background: var(--border-subtle); border-radius: 3px; }

    /* Layout */
    .app-layout {
      display: flex;
      height: 100vh;
    }

    .sidebar {
      width: 280px;
      min-width: 280px;
      background: var(--bg-panel);
      border-right: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .sidebar-header {
      padding: 1rem;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .sidebar-header h1 {
      font-size: 16px;
      font-weight: 700;
      color: var(--accent-user);
    }

    .sidebar-list {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem 0;
    }

    .sidebar-item {
      display: block;
      padding: 0.5rem 1rem;
      color: var(--fg-main);
      font-size: 13px;
      border-left: 3px solid transparent;
      transition: background 0.1s;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sidebar-item:hover {
      background: rgba(255,255,255,0.03);
      text-decoration: none;
    }

    .sidebar-item.active {
      border-left-color: var(--accent-user);
      background: rgba(140, 207, 47, 0.06);
    }

    .sidebar-footer {
      padding: 0.75rem 1rem;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: var(--fg-muted);
    }

    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.4rem 0.75rem;
      font-family: inherit;
      font-size: 13px;
      border: 1px solid var(--border-subtle);
      border-radius: 4px;
      cursor: pointer;
      background: transparent;
      color: var(--fg-main);
      transition: background 0.1s;
    }

    .btn:hover { background: rgba(255,255,255,0.05); }
    .btn-primary { border-color: var(--accent-user); color: var(--accent-user); }
    .btn-primary:hover { background: rgba(140, 207, 47, 0.1); }
    .btn-danger { border-color: var(--danger); color: var(--danger); }
    .btn-danger:hover { background: rgba(232, 85, 69, 0.1); }
    .btn-sm { padding: 0.2rem 0.5rem; font-size: 12px; }

    /* Messages */
    .messages-area {
      flex: 1;
      overflow-y: auto;
      padding: 1rem 2rem;
    }

    .message {
      margin-bottom: 1.5rem;
      max-width: 800px;
    }

    .message-role {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.25rem;
    }

    .message-role.user { color: var(--accent-user); }
    .message-role.assistant { color: var(--accent-keyword); }
    .message-role.system { color: var(--fg-muted); }

    .message-content {
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.55;
    }

    .message-content code {
      background: rgba(255,255,255,0.06);
      padding: 0.1em 0.3em;
      border-radius: 3px;
      font-size: 13px;
    }

    .message-content pre {
      background: var(--bg-panel);
      border: 1px solid var(--border-subtle);
      border-radius: 4px;
      padding: 0.75rem;
      margin: 0.5rem 0;
      overflow-x: auto;
    }

    /* Input area */
    .input-area {
      padding: 1rem 2rem;
      border-top: 1px solid var(--border-subtle);
      background: var(--bg-panel);
    }

    .input-wrapper {
      display: flex;
      gap: 0.5rem;
      max-width: 800px;
    }

    .input-wrapper textarea {
      flex: 1;
      background: var(--bg-main);
      border: 1px solid var(--border-subtle);
      border-radius: 4px;
      color: var(--accent-user);
      font-family: inherit;
      font-size: 14px;
      padding: 0.6rem 0.75rem;
      resize: none;
      min-height: 42px;
      max-height: 200px;
      line-height: 1.4;
    }

    .input-wrapper textarea:focus {
      outline: none;
      border-color: var(--accent-user);
    }

    .input-wrapper textarea::placeholder {
      color: var(--fg-muted);
    }

    /* Status */
    .status-indicator {
      padding: 0.5rem 2rem;
      font-size: 12px;
      font-style: italic;
      color: var(--fg-muted);
      display: none;
    }

    .status-indicator.visible { display: block; }
    .status-indicator.error { color: var(--danger); font-style: normal; }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: var(--fg-muted);
      text-align: center;
      padding: 2rem;
    }

    .empty-state h2 {
      font-size: 18px;
      color: var(--fg-main);
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      font-size: 13px;
      margin-bottom: 1rem;
    }

    /* Login */
    .login-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }

    .login-box {
      width: 100%;
      max-width: 360px;
      padding: 2rem;
    }

    .login-box h1 {
      color: var(--accent-user);
      font-size: 20px;
      margin-bottom: 0.25rem;
    }

    .login-box .subtitle {
      color: var(--fg-muted);
      font-size: 12px;
      margin-bottom: 2rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      font-size: 12px;
      color: var(--fg-muted);
      margin-bottom: 0.3rem;
    }

    .form-group input {
      width: 100%;
      background: var(--bg-panel);
      border: 1px solid var(--border-subtle);
      border-radius: 4px;
      color: var(--fg-main);
      font-family: inherit;
      font-size: 14px;
      padding: 0.6rem 0.75rem;
    }

    .form-group input:focus {
      outline: none;
      border-color: var(--accent-user);
    }

    .error-message {
      color: var(--danger);
      font-size: 12px;
      margin-bottom: 1rem;
    }

    .login-btn {
      width: 100%;
      padding: 0.6rem;
      font-family: inherit;
      font-size: 14px;
      font-weight: 500;
      background: var(--accent-user);
      color: var(--bg-main);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 0.5rem;
    }

    .login-btn:hover { opacity: 0.9; }

    /* Actions row */
    .conv-actions {
      display: flex;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
    }

    /* Conversation header */
    .conv-header {
      padding: 0.75rem 2rem;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 48px;
    }

    .conv-title {
      font-size: 14px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .sidebar { width: 60px; min-width: 60px; }
      .sidebar-item { padding: 0.5rem; font-size: 0; }
      .sidebar-header h1 { font-size: 0; }
      .sidebar-header h1::first-letter { font-size: 16px; }
      .messages-area { padding: 1rem; }
      .input-area { padding: 1rem; }
      .conv-header { padding: 0.75rem 1rem; }
    }

    /* Streaming cursor */
    .streaming-cursor::after {
      content: '▊';
      animation: blink 0.8s step-end infinite;
      color: var(--accent-user);
    }

    @keyframes blink {
      50% { opacity: 0; }
    }

    /* Timestamp */
    .message-time {
      font-size: 11px;
      color: var(--fg-muted);
      margin-left: 0.5rem;
      font-weight: 400;
    }
  </style>
</head>
<body>
  ${content}
  ${scripts || ""}
</body>
</html>`;
}

import { baseLayout } from "./layout";

export function loginPage(error?: string): string {
  return baseLayout(
    "Login",
    `
    <div class="login-container">
      <div class="login-box">
        <h1>aiktivist</h1>
        <p class="subtitle">AI agent runtime — login to continue</p>
        ${error ? `<p class="error-message">✗ ${error}</p>` : ""}
        <form method="POST" action="/api/login">
          <div class="form-group">
            <label for="username">username</label>
            <input type="text" id="username" name="username" autocomplete="username" required autofocus />
          </div>
          <div class="form-group">
            <label for="password">password</label>
            <input type="password" id="password" name="password" autocomplete="current-password" required />
          </div>
          <button type="submit" class="login-btn">→ authenticate</button>
        </form>
      </div>
    </div>
    `
  );
}

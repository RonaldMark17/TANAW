# TestSprite Setup for Agridata System

This project can be tested with [TestSprite](https://www.testsprite.com/) (AI-powered no-code testing). Follow the steps below to install TestSprite in Cursor and run tests.

## 1. Install TestSprite MCP in Cursor

You need the TestSprite MCP Server so Cursor’s AI can run TestSprite tools.

### Prerequisites

- **Node.js ≥ 22** – [Download](https://nodejs.org/) (run `node --version` to check).
- **TestSprite account** – [Sign up](https://www.testsprite.com/auth/cognito/sign-up).

### Get your API key

1. Sign in to the [TestSprite Dashboard](https://www.testsprite.com/dashboard).
2. Go to **Settings → API Keys**.
3. Click **New API Key** and copy the key.

### Install in Cursor

**Option A – One-click (easiest)**

1. Open **Cursor Settings** (e.g. `Ctrl+Shift+J`).
2. Go to **Tools & Integration**.
3. Use the [one-click install link](cursor://anysphere.cursor-deeplink/mcp/install?name=TestSprite&config=eyJjb21tYW5kIjoibnB4IEB0ZXN0c3ByaXRlL3Rlc3RzcHJpdGUtbWNwQGxhdGVzdCIsImVudiI6eyJBUElfS0VZIjoiIn19), or add the MCP from the marketplace and paste your API key when asked.

**Option B – Manual**

1. **Cursor Settings** → **Tools & Integration** → **Add custom MCP**.
2. Add this (replace `your-api-key` with your real key):

```json
{
  "mcpServers": {
    "TestSprite": {
      "command": "npx",
      "args": ["@testsprite/testsprite-mcp@latest"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

### Cursor sandbox (important)

For TestSprite to work correctly:

1. **Chat → Auto-Run → Auto-Run Mode** → set to **"Ask Every time"** or **"Run Everything"** (not sandbox-only).
2. In **Cursor → Settings → Cursor Settings**, ensure MCP isn’t restricted in a way that blocks TestSprite.

Restart Cursor after adding the MCP. Confirm the TestSprite server shows as connected (e.g. green indicator).

---

## 2. Project details for TestSprite

When TestSprite runs, it will use these details.

| Item        | Value |
|------------|--------|
| **Backend** | Flask API at `http://localhost:5001` |
| **Frontend** | Vite/React in `agridata/` at `http://localhost:5173` (default Vite port) |
| **Backend path** | `c:\Users\ronal\agridata-system\backend` |
| **Frontend path** | `c:\Users\ronal\agridata-system\agridata` |
| **Auth** | Login at `POST /api/auth/login` (email + password). Use a test user if you want login flows tested. |

### Before running tests

1. **Start the backend** (from project root):
   ```bash
   cd backend && python app.py
   ```
   Backend will be at **http://localhost:5001**.

2. **Start the frontend** (optional, for full-stack/UI tests):
   ```bash
   cd agridata && npm run dev
   ```
   Frontend will be at **http://localhost:5173** (or the port Vite prints).

3. **Test user (optional)**  
   If you want TestSprite to test login, create a test user (e.g. via `/api/auth/register` or your seed script) and provide the email/password in the TestSprite configuration when it asks for credentials.

---

## 3. Run tests with TestSprite

After the MCP is installed and your app is running:

1. In Cursor chat, say:
   ```text
   Help me test this project with TestSprite.
   ```
2. The AI will use TestSprite to bootstrap, analyze the codebase, generate test plans, generate and run test code, and report results.
3. Reports and generated tests will appear under `testsprite_tests/` (e.g. `test_results.json`, `report_prompt.json`, HTML reports).

To fix issues found by tests, you can later say:
```text
Help me fix the codebase based on these test results.
```

---

## 4. References

- [TestSprite docs](https://docs.testsprite.com/)
- [MCP installation](https://docs.testsprite.com/mcp/getting-started/installation)
- [Create tests for new projects](https://docs.testsprite.com/mcp/core/create-tests-new-project)

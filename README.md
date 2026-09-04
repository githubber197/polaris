# Polaris

An AI-powered, in-browser IDE. Write, run, and preview code entirely in the browser, get AI-driven code suggestions and quick edits, and let a multi-tool AI agent handle real coding tasks in the background.

> 🔗 **Live demo:** [polaris-ncnn-theta.vercel.app](https://polaris-ncnn-theta.vercel.app/)

## Features

- **Full in-browser IDE** — CodeMirror 6 editor with syntax highlighting, code folding, and a minimap, backed by [WebContainer](https://webcontainer.io/) for real in-browser code execution and a live preview, no local setup required.
- **AI code assistance** — inline AI-powered suggestions and quick edits, powered by Claude, Gemini, and GPT (via the Vercel AI SDK).
- **Autonomous coding agent** — a background AI agent (via [Inngest](https://www.inngest.com/) + [Agent Kit](https://agentkit.inngest.com/)) that can read and write files, run multi-step tasks, and use custom tools to act on your codebase asynchronously.
- **Integrated terminal** — a real terminal (xterm.js) running inside the WebContainer sandbox.
- **Resizable, IDE-style layout** — file explorer, editor, terminal, and preview panes, all resizable via [Allotment](https://github.com/johnwalley/allotment).
- **GitHub integration** — import an existing repository to start working on it, and export/push your changes back.
- **Real-time backend** — projects, files, and conversations are all backed by [Convex](https://www.convex.dev/), so changes sync live.
- **Auth & accounts** — authentication and session management via [Clerk](https://clerk.com/), including GitHub OAuth.
- **Error tracking & observability** — [Sentry](https://sentry.io/) integration across edge and server runtimes, plus LLM-specific monitoring for the AI agent's runs.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org/) (App Router), React 19, TypeScript |
| Backend / Database | [Convex](https://www.convex.dev/) |
| Auth | [Clerk](https://clerk.com/) |
| Background jobs / AI orchestration | [Inngest](https://www.inngest.com/) + [Agent Kit](https://agentkit.inngest.com/) |
| AI providers | Anthropic (Claude), Google (Gemini), OpenAI — via the [Vercel AI SDK](https://sdk.vercel.ai/) |
| Editor | [CodeMirror 6](https://codemirror.net/) |
| In-browser execution | [WebContainer API](https://webcontainer.io/) |
| Terminal | [xterm.js](https://xtermjs.org/) |
| Layout | [Allotment](https://github.com/johnwalley/allotment) (resizable panes) |
| UI | Tailwind CSS, shadcn/ui, Radix UI |
| Error tracking | [Sentry](https://sentry.io/) |
| GitHub integration | [Octokit](https://github.com/octokit/octokit.js) |
| State management | [Zustand](https://github.com/pmndrs/zustand) |

## Getting Started

### Prerequisites

- Node.js 20+
- A [Convex](https://www.convex.dev/) account and project
- A [Clerk](https://clerk.com/) account and application (with GitHub OAuth configured, if you want repo import/export)
- A [Inngest](https://www.inngest.com/) account (for local dev, the Inngest CLI works standalone)
- API keys for at least one AI provider (Anthropic, Google, and/or OpenAI)

### 1. Clone and install

```bash
git clone https://github.com/githubber197/polaris.git
cd polaris
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```dotenv
# Convex
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOYMENT=
POLARIS_CONVEX_INTERNAL_KEY=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# AI Providers
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
OPENAI_API_KEY=

# GitHub (for import/export)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=
```

> ⚠️ Never commit `.env.local` or any real secrets to version control. `POLARIS_CONVEX_INTERNAL_KEY` in particular authorizes server-to-server calls into Convex and should be treated as a sensitive credential.

### 3. Run the app

Polaris needs three processes running concurrently in development:

```bash
# Terminal 1 — Convex backend
npx convex dev

# Terminal 2 — Inngest dev server (background jobs / AI agent)
npx inngest-cli dev

# Terminal 3 — Next.js app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app. The Inngest dev dashboard is available at [http://localhost:8288](http://localhost:8288) for inspecting background job runs.

## Project Structure

```
polaris/
├── convex/          # Convex schema, queries, mutations
├── src/
│   ├── app/         # Next.js App Router pages and API routes
│   ├── features/     # Feature-organized components, hooks, and logic
│   ├── inngest/      # Inngest functions, AI agent tools, and client
│   └── components/   # Shared UI components
└── public/           # Static assets
```

## Deployment

The app is deployed on [Vercel](https://vercel.com/), paired with a production Convex deployment. To deploy your own instance:

```bash
npx convex deploy
```

Then deploy the Next.js app to Vercel and set the same environment variables from `.env.local` in your Vercel project settings, pointing `NEXT_PUBLIC_CONVEX_URL` at your production Convex deployment.

## License

MIT License

Copyright (c) 2026 D Rajeev

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in allcopies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

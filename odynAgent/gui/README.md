# Odyn Agent — Browser GUI

A Next.js web interface for the Odyn AI agent, bringing the full power of local MLX models and agentic tool use to your browser.

## Quick Start

### 1. Install dependencies

```bash
cd gui
npm install
```

### 2. Start the MLX server (for local models)

```bash
python3 -m mlx_lm.server --model mlx-community/Llama-3.2-3B-Instruct-4bit --port 8080
```

### 3. Start the Next.js dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- 🎨 **Beautiful dark UI** — Modern, responsive interface with smooth animations
- 💬 **Chat mode** — Simple conversational interactions with streaming responses
- 🤖 **Agent mode** — Full agentic loop with tool execution (bash, file ops, Python, web search)
- 🔄 **Real-time streaming** — SSE-based streaming for instant token display
- 🛠️ **Tool visualization** — Live display of tool calls, results, and execution status
- 📋 **Task tracking** — Progress bar showing agent task completion
- 🔧 **Model management** — Switch between MLX presets, add custom OpenAI-compatible providers
- ⚙️ **Settings** — Temperature control, mode switching, provider configuration
- 💾 **Session persistence** — Chat history saved to localStorage
- 📝 **Markdown rendering** — Rich message display with syntax-highlighted code blocks

## Architecture

```
Browser  ←→  Next.js API Routes  ←→  MLX Server / Cloud API
              (SSE streaming)           (OpenAI-compatible)
```

### Key Components

- **`/api/chat`** — Server-side API route that handles streaming, agent loop, and tool execution
- **Zustand Store** — Client state management with localStorage persistence
- **SSE Events** — Real-time communication: `token`, `tool_call`, `tool_result`, `step`, `error`, `done`

## Configuration

### Environment Variables

- `BRAVE_API_KEY` — Optional, for web search tool functionality

### Adding Cloud Providers

1. Open the **Model Picker** (sidebar or header)
2. Go to **Add Custom** tab
3. Enter the provider details:
   - **Name**: e.g., "GPT-4o"
   - **Base URL**: e.g., "https://api.openai.com"
   - **Model ID**: e.g., "gpt-4o"
   - **API Key**: Your API key

## Supported Tools (Agent Mode)

| Tool | Description |
|------|-------------|
| `bash` | Execute shell commands |
| `python` | Run Python code |
| `read_file` | Read file contents |
| `write_file` | Create or overwrite files |
| `list_files` | List directory contents |
| `web_search` | Search the web (requires Brave API key) |
| `web_scrape` | Scrape web page content (requires Firecrawl CLI) |

## Tech Stack

- **Next.js 14** (App Router, API Routes)
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Zustand** for state management
- **react-markdown** + remark-gfm for message rendering
- **lucide-react** for icons

## Build for Production

```bash
npm run build
npm start
```

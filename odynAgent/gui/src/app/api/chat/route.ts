import { NextRequest } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// ─── Tool Execution ───────────────────────────────────────────────────

function truncate(str: string, maxLen = 6000): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + `\n... [truncated, ${str.length} total chars]`;
}

function executeTool(
  name: string,
  args: Record<string, unknown>
): { content: string; isError: boolean } {
  const cwd = process.cwd();

  try {
    switch (name) {
      case "bash": {
        const command = (args.command as string) || "";
        if (!command)
          return {
            content: "Error: no command provided",
            isError: true,
          };
        const timeout = ((args.timeout as number) || 30) * 1000;
        try {
          const out = execSync(command, {
            cwd,
            timeout,
            maxBuffer: 1024 * 1024,
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"],
          });
          return {
            content: truncate(out || "(no output)"),
            isError: false,
          };
        } catch (err: any) {
          return {
            content: truncate(
              `${err?.stdout || ""}\n${err?.stderr || err?.message || ""}`.trim() ||
                `Command failed: ${err?.message}`
            ),
            isError: true,
          };
        }
      }

      case "read_file": {
        const filePath = path.resolve(
          cwd,
          (args.path as string) || "."
        );
        if (!fs.existsSync(filePath))
          return {
            content: `File not found: ${filePath}`,
            isError: true,
          };
        const raw = fs.readFileSync(filePath, "utf8");
        const lines = raw.split("\n");
        const offset = ((args.offset as number) || 1) - 1;
        const limit = (args.limit as number) || lines.length;
        return {
          content: truncate(
            lines.slice(offset, offset + limit).join("\n")
          ),
          isError: false,
        };
      }

      case "write_file": {
        const relPath =
          (args.path as string) || (args.file as string) || "";
        const content = (args.content as string) || "";
        if (!relPath)
          return {
            content: "Error: no path provided",
            isError: true,
          };
        const filePath = path.resolve(cwd, relPath);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, String(content), "utf8");
        return {
          content: `Wrote ${String(content).length} bytes to ${relPath}`,
          isError: false,
        };
      }

      case "list_files": {
        const dirPath = path.resolve(cwd, (args.path as string) || ".");
        if (!fs.existsSync(dirPath))
          return {
            content: `Directory not found: ${dirPath}`,
            isError: true,
          };
        const entries: string[] = [];
        const walk = (dir: string, prefix: string) => {
          for (const item of fs.readdirSync(dir, {
            withFileTypes: true,
          })) {
            if (
              item.name === "node_modules" ||
              item.name === ".git" ||
              item.name.startsWith(".next")
            )
              continue;
            const rel = prefix
              ? `${prefix}/${item.name}`
              : item.name;
            if (item.isDirectory()) {
              entries.push(`📁 ${rel}/`);
              if (entries.length < 200)
                walk(path.join(dir, item.name), rel);
            } else entries.push(`  ${rel}`);
          }
        };
        walk(dirPath, "");
        return {
          content: truncate(
            entries.join("\n") || "(empty directory)"
          ),
          isError: false,
        };
      }

      case "python": {
        const code = (args.code as string) || "";
        if (!code)
          return {
            content: "Error: no code provided",
            isError: true,
          };
        try {
          const tmpFile = path.join(cwd, ".odyn_tmp.py");
          fs.writeFileSync(tmpFile, code, "utf8");
          const out = execSync(`python3 ${tmpFile}`, {
            cwd,
            timeout: 30_000,
            maxBuffer: 1024 * 1024,
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"],
          });
          try { fs.unlinkSync(tmpFile); } catch {}
          return {
            content: truncate(out || "(no output)"),
            isError: false,
          };
        } catch (err: any) {
          try { fs.unlinkSync(path.join(cwd, ".odyn_tmp.py")); } catch {}
          return {
            content: truncate(
              `${err?.stdout || ""}\n${err?.stderr || err?.message || ""}`.trim()
            ),
            isError: true,
          };
        }
      }

      case "web_search": {
        const query =
          (args.query as string) || (args.q as string) || "";
        if (!query)
          return {
            content: "Error: no query provided",
            isError: true,
          };
        try {
          const apiKey =
            process.env.BRAVE_API_KEY || "BSAGD6mg7u0HjLnOn4l2GAVtO_Ys74z";
          const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;
          const out = execSync(
            `curl -s -H "X-Subscription-Token: ${apiKey}" "${url}"`,
            { timeout: 15_000, maxBuffer: 1024 * 1024, encoding: "utf8" }
          );
          const data = JSON.parse(out);
          const results = (data.web?.results || [])
            .map(
              (r: any, i: number) =>
                `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.description || ""}`
            )
            .join("\n\n");
          return {
            content: truncate(results || "No results found"),
            isError: false,
          };
        } catch (err: any) {
          return {
            content: `Search failed: ${err?.message}`,
            isError: true,
          };
        }
      }

      case "web_scrape": {
        const url = (args.url as string) || "";
        if (!url)
          return {
            content: "Error: no URL provided",
            isError: true,
          };
        try {
          const onlyMain = (args.onlyMainContent as boolean) ?? true;
          const cmd = `firecrawl scrape "${url}"${onlyMain ? " --only-main-content" : ""}`;
          const out = execSync(cmd, {
            timeout: 30_000,
            maxBuffer: 2 * 1024 * 1024,
            encoding: "utf8",
          });
          return {
            content: truncate(out || "(no content)"),
            isError: false,
          };
        } catch (err: any) {
          return {
            content: `Scrape failed: ${err?.stderr || err?.message}`,
            isError: true,
          };
        }
      }

      default:
        return {
          content: `Unknown tool: ${name}`,
          isError: true,
        };
    }
  } catch (err: any) {
    return {
      content: `Tool error: ${err?.message || err}`,
      isError: true,
    };
  }
}

// ─── Tool Call Parser ─────────────────────────────────────────────────

interface ParsedToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  language?: string;
}

function parseToolCalls(text: string): {
  calls: ParsedToolCall[];
  cleanText: string;
} {
  const calls: ParsedToolCall[] = [];
  const ranges: { start: number; end: number }[] = [];
  let m: RegExpExecArray | null;

  let cleaned = text
    .replace(
      /```(?:python|bash|sh)?\s*\n\s*PYTHON_START/g,
      "PYTHON_START"
    )
    .replace(/PYTHON_END\s*\n\s*```/g, "PYTHON_END")
    .replace(/```(?:json|xml)?\s*\n\s*<tool\s/g, "<tool ")
    .replace(/<\/tool>\s*\n\s*```/g, "</tool>");

  // PYTHON_START ... PYTHON_END
  const pyRe = /PYTHON_START\s*\n([\s\S]*?)\n\s*PYTHON_END/g;
  while ((m = pyRe.exec(cleaned)) !== null) {
    const code = m[1].trim();
    if (code) {
      const origStart = text.indexOf(
        "PYTHON_START",
        ranges.length === 0 ? 0 : ranges[ranges.length - 1].end
      );
      const origEnd =
        text.indexOf("PYTHON_END", Math.max(0, origStart)) +
        "PYTHON_END".length;
      if (origStart >= 0 && origEnd > origStart) {
        ranges.push({ start: origStart, end: origEnd });
      } else {
        ranges.push({ start: m.index, end: m.index + m[0].length });
      }
      calls.push({
        id: `py_${calls.length}`,
        name: "python",
        arguments: { code },
        language: "python",
      });
    }
  }

  // <tool name="..."> JSON </tool>
  const xmlRe = /<tool\s+name=["'](\w+)["']\s*>\s*([\s\S]*?)<\/tool>/g;
  while ((m = xmlRe.exec(cleaned)) !== null) {
    const name = m[1];
    if (!["bash", "read_file", "write_file", "list_files", "python", "web_search", "web_scrape"].includes(name))
      continue;
    try {
      let jsonStr = m[2].trim().replace(/,\s*([}\]])/g, "$1");
      const args = JSON.parse(jsonStr);
      const origStart = text.indexOf(`<tool name="${name}"`, 0);
      const origEnd =
        text.indexOf("</tool>", origStart) + "</tool>".length;
      if (origStart >= 0 && origEnd > origStart) {
        ranges.push({ start: origStart, end: origEnd });
      } else {
        ranges.push({ start: m.index, end: m.index + m[0].length });
      }
      calls.push({
        id: `xml_${calls.length}`,
        name,
        arguments:
          typeof args === "object" && args !== null ? args : {},
      });
    } catch {
      if (name === "bash" || name === "web_search") {
        const simpleMatch = m[2].match(
          /"(?:query|command)"\s*:\s*"([^"]+)"/
        );
        if (simpleMatch) {
          const toolArgs =
            name === "web_search"
              ? { query: simpleMatch[1] }
              : { command: simpleMatch[1] };
          ranges.push({
            start: m.index,
            end: m.index + m[0].length,
          });
          calls.push({
            id: `xml_${calls.length}`,
            name,
            arguments: toolArgs as Record<string, unknown>,
          });
        }
      }
    }
  }

  let clean = text;
  for (const r of ranges.sort((a, b) => b.start - a.start)) {
    clean = clean.slice(0, r.start) + clean.slice(r.end);
  }
  clean = clean.replace(/\n{3,}/g, "\n\n").trim();

  return { calls, cleanText: clean };
}

// ─── System Prompt Builder ────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are Odyn, a helpful AI assistant. You can use tools to complete tasks.

## Tools

### Run code:
PYTHON_START
import os
os.makedirs("my-dir", exist_ok=True)
print("Created directory")
PYTHON_END

### Search web:
<tool name="web_search">
{"query": "search terms"}
</tool>

### Write file:
<tool name="write_file">
{"path": "file.html", "content": "<html>...</html>"}
</tool>

### Read file:
<tool name="read_file">
{"path": "file.txt"}
</tool>

### Run command:
<tool name="bash">
{"command": "ls"}
</tool>

### List files:
<tool name="list_files">
{"path": "."}
</tool>

## Rules
- ALWAYS use tools. NEVER just describe what you will do.
- NEVER wrap tools in backticks.
- NEVER output HTML/code as plain text - use write_file or PYTHON_START.
- Complete ALL tasks before stopping.
CWD: ${process.cwd()}`;
}

// ─── Simple Chat Proxy (non-agent) ───────────────────────────────────

async function proxyChat(
  baseUrl: string,
  model: string,
  apiKey: string | undefined,
  messages: { role: string; content: string }[],
  temperature: number,
  send: (event: string) => void
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `API error ${response.status}: ${body || response.statusText}`
    );
  }

  if (!response.body) throw new Error("No response body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data);
        const token = parsed.choices?.[0]?.delta?.content || "";
        if (token) send(JSON.stringify({ type: "token", content: token }));
      } catch {}
    }
  }

  send(JSON.stringify({ type: "done" }));
}

// ─── Agent Loop ───────────────────────────────────────────────────────

async function runAgentLoop(opts: {
  baseUrl: string;
  model: string;
  apiKey: string | undefined;
  messages: { role: string; content: string }[];
  temperature: number;
  send: (event: string) => void;
}) {
  const { baseUrl, model, apiKey, messages, temperature, send } = opts;
  const MAX_ITER = 20;
  const MAX_RESULT_CHARS = 2000;

  const history = [
    { role: "system" as const, content: buildSystemPrompt() },
    ...messages,
  ];

  let consecutiveNoTool = 0;

  for (let i = 0; i < MAX_ITER; i++) {
    // ── Generate from LLM ─────────────────────────────────────
    let response = "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    try {
      const llmResponse = await fetch(
        `${baseUrl}/v1/chat/completions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            model,
            messages: history,
            stream: true,
            temperature,
          }),
        }
      );

      if (!llmResponse.ok) {
        const body = await llmResponse.text().catch(() => "");
        throw new Error(
          `API error ${llmResponse.status}: ${body || llmResponse.statusText}`
        );
      }

      if (!llmResponse.body) throw new Error("No response body");

      const reader = llmResponse.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: "))
            continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const token =
              parsed.choices?.[0]?.delta?.content || "";
            if (token) {
              response += token;
              send(
                JSON.stringify({ type: "token", content: token })
              );
            }
          } catch {}
        }
      }
    } catch (err: any) {
      send(
        JSON.stringify({
          type: "error",
          message: err?.message || "Generation failed",
        })
      );
      send(JSON.stringify({ type: "done" }));
      return;
    }

    // ── Parse tool calls ───────────────────────────────────────
    const { calls, cleanText } = parseToolCalls(response);

    if (cleanText !== response) {
      send(
        JSON.stringify({
          type: "step",
          step: {
            type: "nudge",
            iteration: i,
            content: "Refining response...",
          },
        })
      );
    }

    history.push({
      role: "assistant",
      content: cleanText,
    });

    // ── Execute tools ──────────────────────────────────────────
    if (calls.length > 0) {
      consecutiveNoTool = 0;

      for (const call of calls) {
        // Send tool_call event
        send(
          JSON.stringify({
            type: "tool_call",
            id: call.id,
            name: call.name,
            arguments: call.arguments,
            iteration: i,
            language: call.language,
          })
        );

        // Execute
        const result = executeTool(call.name, call.arguments);

        // Send tool_result event
        send(
          JSON.stringify({
            type: "tool_result",
            id: call.id,
            content: result.content.slice(0, 1000),
            isError: result.isError,
            iteration: i,
          })
        );

        // Add to history
        history.push({
          role: "user",
          content: result.isError
            ? `[Error] ${result.content.slice(0, MAX_RESULT_CHARS)}`
            : `[Result] ${result.content.slice(0, MAX_RESULT_CHARS)}`,
        });
      }
      continue;
    }

    // ── No tool calls ──────────────────────────────────────────
    consecutiveNoTool++;

    if (consecutiveNoTool >= 2) {
      // Done — the model gave a final response without tools
      send(
        JSON.stringify({
          type: "step",
          step: {
            type: "final",
            iteration: i,
            content: cleanText,
          },
        })
      );
      send(JSON.stringify({ type: "done" }));
      return;
    }

    // Nudge the model to use tools
    const nudge =
      consecutiveNoTool === 1
        ? `You must use a tool to complete the user's request. Use PYTHON_START/PYTHON_END or <tool> tags. What tool do you need?`
        : `IMPORTANT: You MUST output a tool call now. Use one of: PYTHON_START, <tool name="bash">, <tool name="write_file">, <tool name="web_search">. Do NOT just describe what to do.`;

    history.push({ role: "user", content: nudge });
  }

  send(
    JSON.stringify({
      type: "step",
      step: {
        type: "error",
        iteration: MAX_ITER,
        content: `Max iterations (${MAX_ITER}) reached.`,
      },
    })
  );
  send(JSON.stringify({ type: "done" }));
}

// ─── POST Handler ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages,
      provider,
      agentMode = false,
      temperature = 0.7,
    } = body as {
      messages: { role: string; content: string }[];
      provider: {
        type: string;
        baseUrl: string;
        model: string;
        apiKey?: string;
      };
      agentMode?: boolean;
      temperature?: number;
    };

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();
    let streamController: ReadableStreamDefaultController | null = null;
    const send = (event: string) => {
      streamController?.enqueue(
        encoder.encode(`data: ${event}\n\n`)
      );
    };

    let controllerClosed = false;

    const stream = new ReadableStream({
      async start(controller) {
        streamController = controller;
        try {
          if (agentMode) {
            await runAgentLoop({
              baseUrl: provider.baseUrl,
              model: provider.model,
              apiKey: provider.apiKey,
              messages,
              temperature,
              send,
            });
          } else {
            await proxyChat(
              provider.baseUrl,
              provider.model,
              provider.apiKey,
              messages,
              temperature,
              send
            );
          }
        } catch (err: any) {
          if (!controllerClosed) {
            send(
              JSON.stringify({
                type: "error",
                message: err?.message || "Unknown error",
              })
            );
            send(JSON.stringify({ type: "done" }));
          }
        } finally {
          if (!controllerClosed) {
            controller.close();
            controllerClosed = true;
          }
        }
      },
      cancel() {
        controllerClosed = true;
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

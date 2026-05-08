#!/usr/bin/env node
/**
 * odyn — TUI wrapper for MLX Bonsai 8B
 *
 * Spawns odyn-bridge.py (persistent MLX backend) and wraps it
 * in a pi-tui chat interface with streaming token display.
 */

import { spawn, type ChildProcess } from "child_process";
import type { Component, EditorTheme, MarkdownTheme, SelectListTheme } from "@mariozechner/pi-tui";
import { Box, Editor, Key, Loader, Markdown, matchesKey, ProcessTerminal, TUI, truncateToWidth } from "@mariozechner/pi-tui";
import chalk from "chalk";
import * as path from "node:path";
import * as fs from "node:fs";

// ── Paths ────────────────────────────────────────────────────────────────────

const BRIDGE = path.join(path.dirname(fs.realpathSync(process.argv[1])), "..", "odyn-bridge.py");

// ── Theme ────────────────────────────────────────────────────────────────────

const mdTheme: MarkdownTheme = {
	heading: (t) => chalk.bold.cyan(t),
	link: (t) => chalk.blue.underline(t),
	linkUrl: (t) => chalk.dim(t),
	code: (t) => chalk.yellow(t),
	codeBlock: (t) => chalk.green(t),
	codeBlockBorder: (t) => chalk.dim("│ "),
	quote: (t) => chalk.italic(t),
	quoteBorder: (t) => chalk.dim("│ "),
	hr: (t) => chalk.dim(t),
	listBullet: (t) => chalk.cyan(t),
	bold: (t) => chalk.bold(t),
	italic: (t) => chalk.italic(t),
	strikethrough: (t) => chalk.strikethrough(t),
	underline: (t) => chalk.underline(t),
};

const slTheme: SelectListTheme = {
	selectedPrefix: (t) => chalk.magenta(t),
	selectedText: (t) => chalk.bold.magenta(t),
	description: (t) => chalk.dim(t),
	scrollInfo: (t) => chalk.dim(t),
	noMatch: (t) => chalk.dim(t),
};

const edTheme: EditorTheme = {
	borderColor: (t) => chalk.dim(t),
	selectList: slTheme,
};

// ── Banner component ────────────────────────────────────────────────────────────────

class Banner implements Component {
	private lines: string[] = [];
	private w = 0;
	invalidate() { this.w = 0; }
	handleInput() {}
	render(width: number) {
		if (this.w === width && this.lines.length) return this.lines;
		this.w = width;
		const art = [
			chalk.bold.cyan('  ___  ______   ___   _              _    ____ _____ _   _ _____ '),
			chalk.bold.cyan(' / _ \\|  _ \\ \\ / / \\ | |            / \\  / ___| ____| \\ | |_   _|'),
			chalk.bold.cyan('| | | | | | \\ V /|  \\| |  _____    / _ \\| |  _|  _| |  \\| | | |  '),
			chalk.bold.cyan('| |_| | |_| || | | |\\  | |_____|  / ___ \\ |_| | |___| |\\  | | |  '),
			chalk.bold.cyan(' \\___/|____/ |_| |_| \\_|         /_/   \\_\\____|_____|_| \\_| |_|  '),
			'',
		];
		this.lines = art.map(l => truncateToWidth(l, width));
		return this.lines;
	}
}

// ── Chat line component ──────────────────────────────────────────────────────

class ChatLine implements Component {
	private lines: string[] = [];
	private w = 0;
	constructor(private role: "user" | "ai" | "sys" | "err", private text: string) {}
	setContent(t: string) { this.text = t; this.w = 0; }
	getContent() { return this.text; }
	invalidate() { this.w = 0; }
	handleInput() {}
	render(width: number) {
		if (this.w === width && this.lines.length) return this.lines;
		this.w = width;
		this.lines = [];
		const header =
			this.role === "user" ? chalk.blue("▶ You") :
			this.role === "ai"   ? chalk.magenta("◆ Odyn") :
			this.role === "err"  ? chalk.red("✖ Error") :
			chalk.yellow("⚙ System");
		this.lines.push(truncateToWidth(header, width));
		const cw = Math.max(1, width - 2);
		if (this.role === "ai" && this.text.trim()) {
			try {
				this.lines.push(...new Markdown(this.text, 1, 0, mdTheme)
					.render(cw).map(l => truncateToWidth(l, width)));
			} catch {
				this.lines.push(...wrap(this.text, cw).map(l => truncateToWidth(l, width)));
			}
		} else if (this.text.trim()) {
			this.lines.push(...wrap(this.text, cw).map(l => truncateToWidth(l, width)));
		}
		this.lines.push("");
		return this.lines;
	}
}

function wrap(text: string, w: number): string[] {
	if (w <= 0) return [text];
	const out: string[] = []; let cur = "";
	for (const word of text.split(/\s+/)) {
		if (!word) continue;
		if (!cur) cur = word;
		else if (cur.length + 1 + word.length <= w) cur += " " + word;
		else { out.push(cur); cur = word; }
	}
	if (cur) out.push(cur);
	return out.length ? out : [""];
}

// ── MLX backend (persistent python process) ──────────────────────────────────

type StreamCallbacks = {
	onToken: (token: string, fullText: string) => void;
	onDone: (fullText: string) => void;
	onError: (error: string) => void;
};

class Backend {
	private proc: ChildProcess | null = null;
	private buf = "";
	private stderrBuf = "";
	private currentStream: StreamCallbacks | null = null;
	/** Queue for non-streaming responses (clear, reset, errors) */
	private nonStreamQueue: Array<(v: { response?: string; error?: string }) => void> = [];
	onStatus?: (msg: string) => void;

	start(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.proc = spawn("python3", [BRIDGE], { stdio: ["pipe", "pipe", "pipe"] });

			this.proc.stdout?.on("data", (d: Buffer) => {
				this.buf += d.toString();
				this.drain();
			});

			this.proc.stderr?.on("data", (d: Buffer) => {
				this.stderrBuf += d.toString();
				const lines = this.stderrBuf.split("\n");
				this.stderrBuf = lines.pop() || "";
				for (const l of lines) if (l.trim()) this.onStatus?.(l.trim());
			});

			this.proc.on("close", () => {
				// Fail any pending stream
				if (this.currentStream) {
					this.currentStream.onError("Backend exited");
					this.currentStream = null;
				}
				for (const r of this.nonStreamQueue) r({ error: "Backend exited" });
				this.nonStreamQueue = [];
			});

			this.proc.on("error", reject);

			// resolve once we see "Model ready" on stderr
			const check = () => {
				if (this.stderrBuf.includes("Model ready")) {
					this.stderrBuf = "";
					resolve();
				} else {
					setTimeout(check, 100);
				}
			};
			check();
		});
	}

	private drain() {
		const lines = this.buf.split("\n");
		this.buf = lines.pop() || "";
		for (const line of lines) {
			if (!line.trim()) continue;
			try {
				const msg = JSON.parse(line);

				// Streaming token
				if (msg.token !== undefined && this.currentStream) {
					this.currentStream.onToken(msg.token, msg.fullText ?? "");
					continue;
				}

				// Stream done
				if (msg.done && this.currentStream) {
					this.currentStream.onDone(msg.text || "");
					this.currentStream = null;
					continue;
				}

				// Non-streaming response (clear, reset, or legacy)
				const next = this.nonStreamQueue.shift();
				if (next) next({ response: msg.response, error: msg.error });
			} catch { /* skip malformed lines */ }
		}
	}

	/**
	 * Stream a chat prompt. Tokens are delivered via callbacks.
	 * Returns a promise that resolves when generation is complete.
	 */
	askStream(prompt: string, callbacks: StreamCallbacks): Promise<void> {
		return new Promise((resolve) => {
			if (!this.proc?.stdin) {
				callbacks.onError("No backend");
				resolve();
				return;
			}

			// Wrap callbacks to also resolve the promise on done/error
			this.currentStream = {
				onToken: callbacks.onToken,
				onDone: (text) => { callbacks.onDone(text); resolve(); },
				onError: (err) => { callbacks.onError(err); resolve(); },
			};

			this.proc.stdin.write(JSON.stringify({ prompt, action: "chat" }) + "\n");
		});
	}

	/**
	 * Cancel the current stream (e.g. user pressed Ctrl+C during generation).
	 */
	cancelStream() {
		this.currentStream = null;
	}

	clear(): Promise<{ response?: string; error?: string }> {
		return new Promise((resolve) => {
			if (!this.proc?.stdin) { resolve({ error: "No backend" }); return; }
			this.nonStreamQueue.push(resolve);
			this.proc.stdin.write(JSON.stringify({ action: "clear" }) + "\n");
		});
	}

	stop() { this.proc?.kill(); }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
	if (!fs.existsSync(BRIDGE)) {
		console.error(chalk.red(`Bridge not found: ${BRIDGE}`));
		process.exit(1);
	}

	const terminal = new ProcessTerminal();
	const tui = new TUI(terminal);

	// Status line (updated while model loads)
	const banner = new Banner();
	tui.addChild(banner);
	const statusLine = new ChatLine("sys", "");
	tui.addChild(statusLine);

	// Editor will be shown as a persistent overlay pinned to the bottom of the screen
	const editor = new Editor(tui, edTheme);
	const editorOverlay = tui.showOverlay(editor, {
		anchor: "bottom-left",
		width: "100%",
	});

	let generating = false;
	let overlay: ReturnType<typeof tui.showOverlay> | null = null;

	// ── Helpers ─────────────────────────────────────────────────────────

	function setStatus(msg: string) {
		statusLine.setContent(msg);
		tui.requestRender();
	}

	function addLine(role: "user" | "ai" | "sys" | "err", text: string) {
		const line = new ChatLine(role, text);
		tui.children.push(line);
		tui.requestRender();
		return line;
	}

	function showHelp() {
		if (overlay) { overlay.hide(); overlay = null; return; }
		const box = new Box(2, 0, (s: string) => chalk.dim("│") + s + chalk.dim("│"));
		const help: Component = {
			invalidate() {},
			render(w: number) {
				return [
					"",
					truncateToWidth(chalk.bold("📖 Commands"), w),
					"",
					truncateToWidth(chalk.cyan("  /help")  + chalk.dim("    Show this help"), w),
					truncateToWidth(chalk.cyan("  /clear") + chalk.dim("  Clear chat history"), w),
					"",
					truncateToWidth(chalk.dim("  Enter send · Esc close · Ctrl+C exit/cancel"), w),
					"",
				];
			},
			handleInput(data: string) {
				if (matchesKey(data, Key.escape) || matchesKey(data, Key.enter)) {
					overlay?.hide(); overlay = null; tui.setFocus(editor);
				}
			},
		};
		box.addChild(help);
		overlay = tui.showOverlay(box, { anchor: "center", margin: 4 });
		tui.setFocus(help);
	}

	// ── Start backend ───────────────────────────────────────────────────

	const backend = new Backend();
	backend.onStatus = (msg) => {
		setStatus(msg);
		// Keep editor focused through status updates
		tui.setFocus(editor);
	};

	tui.setFocus(editor);
	setStatus("⏳ Loading MLX model...");
	tui.start();

	// Load model in background (editor is already focused and typeable)
	backend.start().then(() => {
		tui.setFocus(editor);
		setStatus("✅ Model ready");
	}).catch((e) => {
		setStatus("❌ Failed: " + String(e));
	});

	// ── Editor submit ───────────────────────────────────────────────────

	editor.onSubmit = async (value: string) => {
		const msg = value.trim();
		if (!msg || generating) return;

		if (msg.toLowerCase() === "/help") {
			showHelp(); editor.setText(""); tui.requestRender(); return;
		}
		if (msg.toLowerCase() === "/clear") {
			backend.clear();
			// remove all chat lines, keep banner + status
			tui.children.splice(2);
			editor.setText(""); tui.requestRender(); return;
		}

		addLine("user", msg);
		editor.setText("");
		tui.requestRender();

		generating = true;
		editor.disableSubmit = true;

		// Create an AI chat line that will be updated in-place as tokens arrive
		const aiLine = addLine("ai", "▌");
		let fullText = "";

		await backend.askStream(msg, {
			onToken(token) {
				fullText += token;
				// Show cursor blink while streaming
				aiLine.setContent(fullText + "▌");
				aiLine.invalidate();
				tui.requestRender();
			},
			onDone(finalText) {
				aiLine.setContent(finalText || "(empty)");
				aiLine.invalidate();
				tui.requestRender();
			},
			onError(error) {
				aiLine.setContent(error);
				aiLine.invalidate();
				tui.requestRender();
			},
		});

		generating = false;
		editor.disableSubmit = false;
		tui.setFocus(editor);
		tui.requestRender();
	};

	// ── Key handler ─────────────────────────────────────────────────────

	tui.addInputListener((data: string) => {
		if (matchesKey(data, Key.ctrl("c"))) {
			if (generating) {
				// Cancel current generation
				backend.cancelStream();
				generating = false;
				editor.disableSubmit = false;
				tui.setFocus(editor);
				tui.requestRender();
				return { consume: true };
			}
			tui.stop(); backend.stop(); process.exit(0);
		}
		if (matchesKey(data, Key.escape) && overlay) {
			overlay.hide(); overlay = null; tui.setFocus(editor);
			return { consume: true };
		}
		return undefined;
	});

	terminal.setTitle("odyn — MLX Bonsai");
}

main().catch((e) => { console.error(chalk.red(String(e))); process.exit(1); });

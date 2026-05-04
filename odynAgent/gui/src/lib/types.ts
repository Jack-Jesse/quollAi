// ─── Chat Message Types ──────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

// ─── Tool & Agent Types ──────────────────────────────────────────────

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  content: string;
  isError: boolean;
}

export type StepType =
  | "tool_call"
  | "tool_result"
  | "final"
  | "error"
  | "todo_update"
  | "nudge"
  | "auto_step";

export interface AgentStep {
  type: StepType;
  iteration: number;
  content: string;
  toolCall?: ToolCall;
  toolResult?: { content: string; isError: boolean };
  language?: string;
  todoItems?: TodoItem[];
}

export interface TodoItem {
  text: string;
  done: boolean;
}

// ─── Provider Types ──────────────────────────────────────────────────

export type ProviderType = "local-mlx" | "local-api" | "cloud-api";

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKey?: string;
  model: string;
  port?: number;
}

// ─── MLX Presets ─────────────────────────────────────────────────────

export const MLX_PRESETS: {
  model: string;
  name: string;
  quant: string;
  size: string;
}[] = [
  {
    model: "prism-ml/Ternary-Bonsai-8B-mlx-2bit",
    name: "Bonsai 8B (2-bit)",
    quant: "2-bit",
    size: "~2GB",
  },
  {
    model: "mlx-community/Llama-3.2-3B-Instruct-4bit",
    name: "Llama 3.2 3B (4-bit)",
    quant: "4-bit",
    size: "~2GB",
  },
  {
    model: "mlx-community/Llama-3-8B-Instruct-4bit",
    name: "Llama 3 8B (4-bit)",
    quant: "4-bit",
    size: "~5GB",
  },
  {
    model: "mlx-community/Qwen2.5-7B-Instruct-4bit",
    name: "Qwen 2.5 7B (4-bit)",
    quant: "4-bit",
    size: "~4GB",
  },
  {
    model: "mlx-community/Mistral-7B-Instruct-v0.3-4bit",
    name: "Mistral 7B v0.3 (4-bit)",
    quant: "4-bit",
    size: "~4GB",
  },
  {
    model: "mlx-community/Phi-4-4bit",
    name: "Phi-4 (4-bit)",
    quant: "4-bit",
    size: "~8GB",
  },
  {
    model: "mlx-community/gemma-3-4b-it-4bit",
    name: "Gemma 3 4B (4-bit)",
    quant: "4-bit",
    size: "~3GB",
  },
  {
    model: "mlx-community/Llama-3.3-70B-Instruct-4bit",
    name: "Llama 3.3 70B (4-bit)",
    quant: "4-bit",
    size: "~40GB",
  },
  {
    model: "mlx-community/Qwen2.5-32B-Instruct-4bit",
    name: "Qwen 2.5 32B (4-bit)",
    quant: "4-bit",
    size: "~18GB",
  },
  {
    model: "mlx-community/DeepSeek-R1-Distill-Qwen-32B-4bit",
    name: "DeepSeek R1 32B (4-bit)",
    quant: "4-bit",
    size: "~18GB",
  },
];

// ─── Default Providers ───────────────────────────────────────────────

export const DEFAULT_PROVIDERS: Provider[] = [
  {
    id: "bonsai-mlx",
    name: "Bonsai 8B (Local MLX)",
    type: "local-mlx",
    baseUrl: "http://localhost:8080",
    model: "prism-ml/Ternary-Bonsai-8B-mlx-2bit",
    port: 8080,
  },
  {
    id: "llama3-mlx",
    name: "Llama 3 8B (Local MLX)",
    type: "local-mlx",
    baseUrl: "http://localhost:8081",
    model: "mlx-community/Llama-3-8B-Instruct-4bit",
    port: 8081,
  },
];

// ─── Chat Session ────────────────────────────────────────────────────

export interface ChatSession {
  id: string;
  title: string;
  providerId: string;
  messages: ChatMessage[];
  steps: AgentStep[];
  createdAt: number;
  updatedAt: number;
}

// ─── SSE Event Types (server → client) ───────────────────────────────

export interface TokenEvent {
  type: "token";
  content: string;
}

export interface ToolCallEvent {
  type: "tool_call";
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  iteration: number;
  language?: string;
}

export interface ToolResultEvent {
  type: "tool_result";
  id: string;
  content: string;
  isError: boolean;
  iteration: number;
}

export interface StepEvent {
  type: "step";
  step: AgentStep;
}

export interface ErrorEvent {
  type: "error";
  message: string;
}

export interface DoneEvent {
  type: "done";
}

export type SSEEvent =
  | TokenEvent
  | ToolCallEvent
  | ToolResultEvent
  | StepEvent
  | ErrorEvent
  | DoneEvent;

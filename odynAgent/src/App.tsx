import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { Header } from './components/Header.js';
import { MessageList } from './components/MessageList.js';
import { TodoDock } from './components/TodoDock.js';
import { PromptInput } from './components/PromptInput.js';
import { LoadingIndicator } from './components/LoadingIndicator.js';
import { SplashScreen } from './components/SplashScreen.js';
import { ModelSelector } from './components/ModelSelector.js';
import { AddProviderForm } from './components/AddProviderForm.js';
import { DownloadScreen } from './components/DownloadScreen.js';
import { useChat } from './hooks/useChat.js';
import { useTerminalSize } from './hooks/useTerminalSize.js';
import { MlxRunner } from './lib/mlx-runner.js';
import {
  AppConfig,
  Provider,
  MLX_PRESETS,
  loadConfig,
  saveConfig,
  getActiveProvider,
  createProvider,
  isModelCached,
} from './lib/config.js';

type Screen = 'chat' | 'models' | 'add-provider' | 'download';
type ChatMode = 'agent' | 'chat';

export default function App() {
  const { exit } = useApp();
  const { width, height } = useTerminalSize();
  const [screen, setScreen] = useState<Screen>('chat');
  const [config, setConfig] = useState<AppConfig>(loadConfig);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [downloadModelId, setDownloadModelId] = useState('');
  const [chatMode, setChatMode] = useState<ChatMode>('agent');
  const runnerRef = useRef<MlxRunner | null>(null);

  const activeProvider = getActiveProvider(config);
  const { state, sendMessage, stopGeneration } = useChat(
    activeProvider,
    config.temperature,
    runnerRef.current
  );

  // ── Start/stop MLX bridge when active provider changes ──────────
  useEffect(() => {
    const p = getActiveProvider(config);

    // Stop any existing runner
    if (runnerRef.current) {
      runnerRef.current.stop();
      runnerRef.current = null;
    }

    if (p.type === 'local-mlx') {
      setConnected(false);
      setConnecting(true);

      const runner = new MlxRunner();
      runnerRef.current = runner;
      runner.start(p);

      // Poll for bridge readiness
      const interval = setInterval(() => {
        if (runner.ready) {
          setConnected(true);
          setConnecting(false);
          clearInterval(interval);
        }
        if (runner.error) {
          setConnected(false);
          setConnecting(false);
          clearInterval(interval);
        }
      }, 300);

      // Timeout — 60s for large model downloads on first run
      const timeout = setTimeout(() => {
        clearInterval(interval);
        if (!runner.ready && !runner.error) {
          // Still loading — don't mark as error, just keep waiting
        }
      }, 60_000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
        runner.stop();
      };
    } else {
      // Non-MLX providers — no bridge needed
      setConnected(true);
      setConnecting(false);
      return () => {};
    }
  }, [config.activeProviderId]);

  // ── Global keybindings ──────────────────────────────────────────
  useInput((input, key) => {
    if (screen !== 'chat') return;
    if (key.ctrl && input === 'm') { setScreen('models'); return; }
    if (key.escape || (key.ctrl && input === 'c')) {
      if (state.isGenerating) { stopGeneration(); }
      else { exit(); process.exit(0); }
    }
  });

  // ── Slash commands ──────────────────────────────────────────────
  const handleSubmit = useCallback(
    (text: string) => {
      if (text.startsWith('/model') || text.startsWith('/models')) { setScreen('models'); return; }
      if (text.startsWith('/help')) { return; }
      if (text.startsWith('/agent')) { setChatMode('agent'); return; }
      if (text.startsWith('/chat')) { setChatMode('chat'); return; }
      // Handle "continue" — resume agent mode
      if (text.toLowerCase().trim() === 'continue' || text.toLowerCase().trim() === 'cont') {
        sendMessage('Continue working on the TODO.md tasks. Pick up where you left off.', true);
        return;
      }
      sendMessage(text, chatMode === 'agent');
    },
    [sendMessage, chatMode],
  );

  // ── Model selector actions ──────────────────────────────────────
  const handleSelectProvider = useCallback((id: string) => {
    const updated = { ...config, activeProviderId: id };
    setConfig(updated);
    saveConfig(updated);
    setScreen('chat');
  }, [config]);

  const handleAddProvider = useCallback(() => setScreen('add-provider'), []);

  const handleDeleteProvider = useCallback((id: string) => {
    const updated = { ...config, providers: config.providers.filter((p) => p.id !== id) };
    if (updated.activeProviderId === id) updated.activeProviderId = updated.providers[0]?.id ?? '';
    if (updated.providers.length === 0) {
      const dp = createProvider({
        name: 'Bonsai 8B (Local MLX)', type: 'local-mlx',
        baseUrl: 'http://localhost:8080', model: 'prism-ml/Ternary-Bonsai-8B-mlx-2bit',
      });
      updated.providers.push(dp);
      updated.activeProviderId = dp.id;
    }
    setConfig(updated);
    saveConfig(updated);
  }, [config]);

  const handleSaveNewProvider = useCallback((provider: Provider) => {
    const updated = { ...config, providers: [...config.providers, provider], activeProviderId: provider.id };
    setConfig(updated);
    saveConfig(updated);
    setScreen('chat');
  }, [config]);

  const handleDownload = useCallback((modelId: string) => {
    setDownloadModelId(modelId);
    setScreen('download');
  }, []);

  const handleDownloadComplete = useCallback(() => setScreen('models'), []);

  const handleAddPreset = useCallback((preset: typeof MLX_PRESETS[number]) => {
    const existing = config.providers.find((p) => p.model === preset.model);
    if (existing) { handleSelectProvider(existing.id); return; }
    if (!isModelCached(preset.model)) {
      setDownloadModelId(preset.model);
      setScreen('download');
      return;
    }
    const newProvider = createProvider({
      name: preset.name, type: 'local-mlx',
      baseUrl: 'http://localhost:8080', model: preset.model, port: 8080,
    });
    handleSaveNewProvider(newProvider);
  }, [config, handleSelectProvider, handleSaveNewProvider]);

  // ── Layout ──────────────────────────────────────────────────────
  const headerH = 105;
  const inputH = 3;
  const statusH = 1;
  // Get latest TODO items from steps
  const todoSteps = state.steps.filter(s => s.type === 'todo_update' && s.todoItems);
  const latestTodo = todoSteps.length > 0 ? todoSteps[todoSteps.length - 1].todoItems! : [];
  // TodoDock height: header (1) + up to 5 tasks + current highlight (1) + padding
  const todoCount = latestTodo.length;
  const todoH = todoCount > 0 ? Math.min(todoCount + 4, 10) : 0;
  const msgH = Math.max(1, height - headerH - inputH - statusH - todoH - 2);

  // ── Screens ─────────────────────────────────────────────────────
  if (state.steps.length === 0) {
    return <SplashScreen width={width} height={height} />;
  }

  if (screen === 'models') {
    return (
      <ModelSelector
        config={config} onSelect={handleSelectProvider} onAdd={handleAddProvider}
        onDelete={handleDeleteProvider} onDownload={handleDownload}
        onAddPreset={handleAddPreset} onBack={() => setScreen('chat')}
        width={width} height={height}
      />
    );
  }

  if (screen === 'add-provider') {
    return (
      <AddProviderForm onSave={handleSaveNewProvider} onCancel={() => setScreen('models')}
        width={width} height={height}
      />
    );
  }

  if (screen === 'download') {
    return (
      <DownloadScreen modelId={downloadModelId} onComplete={handleDownloadComplete}
        width={width} height={height}
      />
    );
  }

  // ── Chat screen ──────────────────────────────────────────────────
  const lastMsg = state.messages[state.messages.length - 1];
  const showSpinner = state.isGenerating && lastMsg?.role === 'assistant' && lastMsg.content === '';
  const bridgeError = activeProvider.type === 'local-mlx' ? runnerRef.current?.error : null;

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Header provider={activeProvider} width={width} connected={connected} />

      <Box flexDirection="column" height={msgH} overflowY="hidden" paddingX={1}>
        {state.messages.length === 0 && (
          <Box flexDirection="column" gap={1} paddingY={1}>
            <Banner width={width} />
            {connecting && (
              <Box gap={1}>
                <Text color="yellow">⏳ Loading model into GPU memory…</Text>
                <Text dimColor>(first run downloads ~2GB, then caches locally)</Text>
              </Box>
            )}
            {bridgeError && (
              <Box flexDirection="column" gap={1}>
                <Text color="red">⚠ {bridgeError}</Text>
                <Text dimColor>Make sure mlx-lm is installed: <Text color="cyan">pip3 install mlx-lm</Text></Text>
              </Box>
            )}
            {!connecting && !bridgeError && (
              <>
                <Text dimColor>Run any MLX model from HuggingFace — fully local, no cloud needed.</Text>
                <Text dimColor />
                <Text bold color="green">Active model:</Text>
                <Text color="white">  {activeProvider.model}</Text>
                <Text dimColor />
                <Text bold>Commands:</Text>
                <Text dimColor>  /model   — Switch models, browse presets, download new ones</Text>
                <Text dimColor>  /agent   — Switch to agent mode (uses tools autonomously)</Text>
                <Text dimColor>  /chat    — Switch to chat mode (no tools, plain conversation)</Text>
                <Text dimColor>  Ctrl+M   — Open model selector</Text>
                <Text dimColor>  Esc      — Interrupt generation / Exit</Text>
                <Text dimColor />
                <Text dimColor>Mode: <Text bold color={chatMode === 'agent' ? 'magenta' : 'cyan'}>{chatMode === 'agent' ? '🤖 Agent' : '💬 Chat'}</Text></Text>
              </>
            )}
          </Box>
        )}
        <MessageList messages={state.messages} steps={state.steps} maxHeight={msgH - 2} />
        {showSpinner && <LoadingIndicator />}
        {state.error && (
          <Box marginTop={1}>
            <Text color="red">⚠ {state.error}</Text>
          </Box>
        )}
      </Box>

      {latestTodo.length > 0 && (
        <TodoDock items={latestTodo} width={width} />
      )}

      <PromptInput
        onSubmit={handleSubmit}
        isGenerating={state.isGenerating || connecting}
        width={width}
      />

      <Box width={width} paddingX={1}>
        <Text dimColor>
          {chatMode === 'agent' ? <Text color="magenta" bold>🤖 Agent</Text> : <Text color="cyan" bold>💬 Chat</Text>}
          <Text dimColor> │ </Text>
          <Text bold>/model</Text> switch │ <Text bold>Esc</Text> {state.isGenerating ? 'interrupt' : 'exit'} │ <Text bold>/agent</Text>/<Text bold>/chat</Text> mode
          {state.isGenerating && <Text color="magenta"> │ ⚡ Step {state.steps.filter(s => s.type === 'tool_call').length}</Text>}
          {state.isGenerating && state.steps.length === 0 && <Text color="yellow"> │ ⚡ Generating…</Text>}
          {connecting && <Text color="yellow"> │ ⏳ Loading model…</Text>}
        </Text>
      </Box>
    </Box>
  );
}

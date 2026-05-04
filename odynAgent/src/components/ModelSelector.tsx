import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { AppConfig, Provider, ProviderType, MLX_PRESETS, isModelCached } from '../lib/config.js';

interface ModelSelectorProps {
  config: AppConfig;
  onSelect: (providerId: string) => void;
  onAdd: () => void;
  onDelete: (providerId: string) => void;
  onDownload: (modelId: string) => void;
  onAddPreset: (preset: typeof MLX_PRESETS[number]) => void;
  onBack: () => void;
  onOpenRouterManager: () => void;
  width: number;
  height: number;
}

type Tab = 'my-models' | 'presets' | 'openrouter';

const TYPE_LABELS: Record<ProviderType, string> = {
  'local-mlx': '🍎 MLX',
  'local-api': '🏠 Local',
  'cloud-api': '☁️  Cloud',
};

export function ModelSelector({ config, onSelect, onAdd, onDelete, onDownload, onAddPreset, onBack, onOpenRouterManager, width, height }: ModelSelectorProps) {
  const [tab, setTab] = useState<Tab>('my-models');
  const [cursor, setCursor] = useState(0);
  const [presetCursor, setPresetCursor] = useState(0);

  const providers = config.providers;
  const presetList = MLX_PRESETS;

  useInput((input, key) => {
    if (key.escape) {
      if (tab === 'presets') { setTab('my-models'); setCursor(0); return; }
      onBack();
      return;
    }
    // Tab switching
    if (input === '1') { setTab('my-models'); setCursor(0); return; }
    if (input === '2') { setTab('presets'); setPresetCursor(0); return; }
    if (input === '3') { setTab('openrouter'); setCursor(0); return; }

    if (tab === 'my-models') {
      if (key.upArrow) setCursor((c) => Math.max(0, c - 1));
      if (key.downArrow) setCursor((c) => Math.min(providers.length - 1, c + 1));
      if (key.return && providers[cursor]) onSelect(providers[cursor].id);
      if (input === 'a' || input === 'A') onAdd();
      if ((input === 'd' || input === 'D') && providers[cursor]) onDelete(providers[cursor].id);
    }

    if (tab === 'openrouter') {
      if (key.return) {
        onOpenRouterManager();
      }
    }

    if (tab === 'presets') {
      if (key.upArrow) setPresetCursor((c) => Math.max(0, c - 1));
      if (key.downArrow) setPresetCursor((c) => Math.min(presetList.length - 1, c + 1));
      if (key.return && presetList[presetCursor]) {
        const preset = presetList[presetCursor];
        // Check if already added
        const existing = providers.find((p) => p.model === preset.model);
        if (existing) {
          onSelect(existing.id);
        } else {
          onAddPreset(preset);
        }
      }
      if ((input === 'w' || input === 'W') && presetList[presetCursor]) {
        onDownload(presetList[presetCursor].model);
      }
    }
  });

  return (
    <Box flexDirection="column" width={width} height={height} borderStyle="round" borderColor="cyan" padding={1}>
      {/* Tabs */}
      <Box gap={2} marginBottom={1}>
        <Text color={tab === 'my-models' ? 'cyan' : 'gray'} bold={tab === 'my-models'}>
          [1] My Models
        </Text>
        <Text color={tab === 'presets' ? 'cyan' : 'gray'} bold={tab === 'presets'}>
          [2] Browse MLX Models
        </Text>
        <Text color={tab === 'openrouter' ? 'cyan' : 'gray'} bold={tab === 'openrouter'}>
          [3] OpenRouter Free Tier
        </Text>
      </Box>

      <Box borderStyle="single" borderColor="gray" paddingX={1} flexDirection="column">
        {tab === 'my-models' && (
          <>
            {providers.length === 0 && (
              <Box paddingY={1}><Text dimColor>No models yet. Press A to add, or browse presets (tab 2).</Text></Box>
            )}
            {providers.map((p, providerIndex) => {
              const isActive = p.id === config.activeProviderId;
              const isHovered = i === cursor;
              const cached = p.type === 'local-mlx' ? isModelCached(p.model) : true;
              return (
                <Box key={p.id} gap={1}>
                  <Text color={isHovered ? 'yellow' : 'gray'}>{isHovered ? '❯' : ' '}</Text>
                  <Text color={isActive ? 'green' : 'white'} bold={isActive}>{p.name}</Text>
                  <Text dimColor>[{TYPE_LABELS[p.type]}]</Text>
                  {p.type === 'local-mlx' && (
                    <Text color={cached ? 'green' : 'red'}>{cached ? '✓ cached' : '⬇ not downloaded'}</Text>
                  )}
                  {isActive && <Text color="green" bold>★</Text>}
                </Box>
              );
            })}
          </>
        )}

        {tab === 'presets' && (
          <>
            <Text dimColor bold>Popular MLX models from HuggingFace:</Text>
            <Text dimColor />
            {presetList.map((preset, presetIndex) => {
              const isHovered = i === presetCursor;
              const cached = isModelCached(preset.model);
              const added = providers.some((p) => p.model === preset.model);
              return (
                <Box key={preset.model} gap={1}>
                  <Text color={isHovered ? 'yellow' : 'gray'}>{isHovered ? '❯' : ' '}</Text>
                  <Text color="white" bold>{preset.name}</Text>
                  <Text dimColor>{preset.quant}</Text>
                  <Text dimColor>{preset.size}</Text>
                  <Text color={cached ? 'green' : 'yellow'}>{cached ? '✓ cached' : '⬇ download'}</Text>
                  {added && <Text color="cyan">+added</Text>}
                </Box>
              );
            })}
          </>
        )}

        {tab === 'openrouter' && (
          <>
            <Text dimColor bold>OpenRouter Free Tier Models:</Text>
            <Text dimColor />
            <Text dimColor>No models needed - automatically routes to best available free model</Text>
            <Text dimColor />
            <Text color="green">✓ No API key required</Text>
            <Text color="green">✓ No daily cost</Text>
            <Text color="yellow">⚠ Rate limits: ~50 requests/day, 20 requests/minute</Text>
            <Text dimColor />
            <Text color="cyan">Press Enter to browse and select OpenRouter provider</Text>
          </>
        )}
      </Box>

      {/* Details panel */}
      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>─────────────────────────────────────────────────</Text>
        {tab === 'my-models' && providers[cursor] && (
          <Box flexDirection="column">
            <Text bold>Details:</Text>
            <Text>  Name: <Text color="white">{providers[cursor].name}</Text></Text>
            <Text>  Type: <Text color="yellow">{providers[cursor].type}</Text></Text>
            <Text>  Model: <Text color="cyan">{providers[cursor].model}</Text></Text>
            <Text>  URL:   <Text color="cyan">{providers[cursor].baseUrl}</Text></Text>
            <Text>  API Key: <Text color={providers[cursor].apiKey ? 'green' : 'gray'}>{providers[cursor].apiKey ? '••••••' : 'none'}</Text></Text>
          </Box>
        )}
        {tab === 'presets' && presetList[presetCursor] && (
          <Box flexDirection="column">
            <Text bold>Model: <Text color="cyan">{presetList[presetCursor].model}</Text></Text>
            <Text>  Quantization: {presetList[presetCursor].quant}  |  Approx size: {presetList[presetCursor].size}</Text>
            <Text>  Full ID: <Text color="gray">{presetList[presetCursor].model}</Text></Text>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box marginTop={1}>
        {tab === 'my-models' && (
          <Text dimColor>[↑/↓] Navigate  [Enter] Activate  [A] Add custom  [D] Delete  [Esc] Back</Text>
        )}
        {tab === 'presets' && (
          <Text dimColor>[↑/↓] Navigate  [Enter] Add & Use  [W] Download only  [Esc] Back</Text>
        )}
        {tab === 'openrouter' && (
          <Text dimColor>[Enter] Open Manager  [Esc] Back</Text>
        )}
      </Box>
    </Box>
  );
}

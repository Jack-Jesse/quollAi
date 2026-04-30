import React from 'react';
import { Box, Text } from 'ink';
import { Provider, ProviderType, MLX_PRESETS } from '../lib/config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO = fs.readFileSync(path.join(__dirname, 'logo.txt'), 'utf8');

const TYPE_COLORS: Record<ProviderType, string> = {
  'local-mlx': 'magenta',
  'local-api': 'cyan',
  'cloud-api': 'yellow',
};

const TYPE_ICONS: Record<ProviderType, string> = {
  'local-mlx': '🍎',
  'local-api': '🏠',
  'cloud-api': '☁️ ',
};

interface HeaderProps {
  provider: Provider;
  width: number;
  connected: boolean;
}

export function Header({ provider, width, connected }: HeaderProps) {
  const typeColor = TYPE_COLORS[provider.type] ?? 'gray';
  const icon = TYPE_ICONS[provider.type] ?? '  ';
  const preset = MLX_PRESETS.find((p) => p.model === provider.model);
  const sizeTag = preset ? ` (${preset.size})` : '';

  const cwd = process.cwd();
  const homeDir = process.env.HOME || '';
  let displayDir = cwd;
  if (homeDir && cwd.startsWith(homeDir)) {
    displayDir = '~' + cwd.slice(homeDir.length);
  }
  const maxDirLen = Math.max(10, Math.floor((width - 60) / 2));
  if (displayDir.length > maxDirLen) {
    displayDir = '…' + displayDir.slice(displayDir.length - maxDirLen + 1);
  }

  // Parse logo lines, trim trailing spaces
  const logoLines = LOGO.split('\n').map(l => l);

  return (
    <Box flexDirection="column" width={width}>
      {/* Top bar: provider info */}
      <Box
        width={width}
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
        justifyContent="space-between"
      >
        <Box gap={1}>
          <Text bold color="cyan">Odyn</Text>
          <Text dimColor>│</Text>
          <Text>{icon}</Text>
          <Text color={typeColor} bold>{provider.name}</Text>
        </Box>
        <Box gap={1}>
          <Text dimColor>{provider.model.length > 35 ? provider.model.slice(0, 35) + '…' : provider.model}{sizeTag}</Text>
          <Text dimColor>│</Text>
          <Text color={connected ? 'green' : 'yellow'}>{connected ? '● connected' : '○ connecting…'}</Text>
        </Box>
      </Box>

      {/* Row with CWD (left) and Logo (right-aligned in a box) */}
      <Box width={width} paddingX={1} justifyContent="space-between">
        <Box>
          <Text dimColor>📂 <Text color="cyan">{displayDir}</Text></Text>
        </Box>
        <Box
          borderStyle="single"
          borderColor="gray"
          paddingX={1}
          flexDirection="column"
          alignItems="flex-end"
        >
          {logoLines.map((line, i) => (
            <Text key={i} color="cyan" dimColor>
              {line}
            </Text>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

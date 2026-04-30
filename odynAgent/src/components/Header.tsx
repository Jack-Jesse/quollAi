import React from 'react';
import { Box, Text } from 'ink';
import { Provider, ProviderType, MLX_PRESETS } from '../lib/config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_SMALL = fs.readFileSync(path.join(__dirname, 'logo-small.txt'), 'utf8');

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

  return (
    <Box flexDirection="row" width={width} borderStyle="single" borderColor="gray">
      {/* Left side: Provider info + CWD */}
      <Box flexDirection="column" width={Math.max(40, width - 40)}>
        <Box paddingX={1} borderBottom={true} borderColor="gray" justifyContent="space-between">
          <Box gap={1}>
            <Text bold color="cyan">Odyn</Text>
            <Text dimColor>│</Text>
            <Text>{icon}</Text>
            <Text color={typeColor} bold>{provider.name}</Text>
          </Box>
          <Box gap={1}>
            <Text dimColor>{provider.model.length > 20 ? provider.model.slice(0, 20) + '…' : provider.model}{sizeTag}</Text>
            <Text dimColor>│</Text>
            <Text color={connected ? 'green' : 'yellow'}>{connected ? '● connected' : '○ connecting…'}</Text>
          </Box>
        </Box>
        <Box paddingX={1} marginTop={1}>
          <Text dimColor>📂 <Text color="cyan">{displayDir}</Text></Text>
        </Box>
      </Box>

      {/* Right side: Tiny Logo */}
      <Box paddingX={1} borderLeft={true} borderColor="gray">
         <Box flexDirection="column">
            {LOGO_SMALL.split('\n').map((line, i) => (
              <Text key={i} color="cyan" dimColor>
                {line}
              </Text>
            ))}
         </Box>
      </Box>
    </Box>
  );
}

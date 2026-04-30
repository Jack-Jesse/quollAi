import React from 'react';
import { Box, Text } from 'ink';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO = fs.readFileSync(path.join(__dirname, 'logo.txt'), 'utf8');

export function SplashScreen({ width, height }: { width: number; height: number }) {
  const logoLines = LOGO.split('\n');
  const logoH = logoLines.length;
  const logoW = Math.max(...logoLines.map(l => l.length));

  return (
    <Box
      width={width}
      height={height}
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      <Box flexDirection="column" alignItems="flex-start">
        {logoLines.map((line, i) => (
          <Text key={i} color="magenta" dimColor>
            {line}
          </Text>
        ))}
      </Box>
      <Box marginTop={2}>
        <Text color="cyan">Welcome to Odyn. Ask me anything to begin.</Text>
      </Box>
    </Box>
  );
}

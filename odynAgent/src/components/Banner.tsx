import React from 'react';
import { Box, Text } from 'ink';

const BANNER_LINES = [
  '     ██╗ ██████╗ ██████╗     ██╗  ██╗██╗   ██╗███╗   ██╗████████╗███████╗██████╗      █████╗ ██╗',
  '     ██║██╔═══██╗██╔══██╗    ██║  ██║██║   ██║████╗  ██║╚══██╔══╝██╔════╝██╔══██╗    ██╔══██╗██║',
  '     ██║██║   ██║██████╔╝    ███████║██║   ██║██╔██╗ ██║   ██║   █████╗  ██████╔╝    ███████║██║',
  '██   ██║██║   ██║██╔══██╗    ██╔══██║██║   ██║██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗    ██╔══██║██║',
  '╚█████╔╝╚██████╔╝██████╔╝    ██║  ██║╚██████╔╝██║ ╚████║   ██║   ███████╗██║  ██║    ██║  ██║██║',
  ' ╚════╝  ╚═════╝ ╚═════╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝    ╚═╝  ╚═╝╚═╝',
];


interface BannerProps {
  width: number;
}

export function Banner({ width }: BannerProps) {
  // If terminal is too narrow, show a compact version
  if (width < 68) {
    return (
      <Box flexDirection="column" alignItems="center">
        <Text bold color="cyan">ODYN AGENT</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {BANNER_LINES.map((line, i) => {
        if (line.trim() === '') return <Text key={i}> </Text>;

        return (
          <Text key={i} color="cyan" bold>
            {line}
          </Text>
        );
      })}
    </Box>
  );
}

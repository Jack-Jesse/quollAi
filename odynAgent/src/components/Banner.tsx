import React from 'react';
import { Box, Text } from 'ink';

const BANNER_LINES = [
  '    ███████    ██████████   █████ █████ ██████   █████           ',
  '  ███░░░░░███ ░░███░░░░███ ░░███ ░░███ ░░██████ ░░███            ',
  ' ███     ░░███ ░███   ░░███ ░░███ ███   ░███░███ ░███            ',
  '░███      ░███ ░███    ░███  ░░█████    ░███░░███░███            ',
  '░███      ░███ ░███    ░███   ░░███     ░███ ░░██████            ',
  '░░███     ███  ░███    ███     ░███     ░███  ░░█████            ',
  ' ░░░███████░   ██████████      █████    █████  ░░█████           ',
  '   ░░░░░░░    ░░░░░░░░░░      ░░░░░    ░░░░░    ░░░░░            ',
  '                                                                  ',
  '                                                                  ',
  '                                                                  ',
  '                     ░▒         ░░                                ',
  '                    ░░▒░░▒▒░▒▒░░▒░▒                               ',
  '                    ░▒░▒▒▓▓░▒▓▒▒░▒░                               ',
  '                      ░▒▒▒░▒░▒▒▒▒                                 ',
  '                      ▒▒░░▒▒▓▓▓▒▒                                 ',
  '                     ░▒▒▒░░░░▒▒▒▒░                                ',
  '                     ▒░░░░░░░░░░░▒░                               ',
  '                     ▒▒░▒░░░░░▒░▒▒░                               ',
  '                      ▒▒▒▒▒▒▒▒▒▒▒░                                ',
  '                       ░░░▒▒▒░▒░                                  ',
  '                                                                  ',
  '   █████████     █████████  ██████████ ██████   █████ ███████████',
  '  ███░░░░░███   ███░░░░░███░░███░░░░░█░░██████ ░░███ ░█░░░███░░░█',
  ' ░███    ░███  ███     ░░░  ░███  █ ░  ░███░███ ░███ ░   ░███  ░ ',
  ' ░███████████ ░███          ░██████    ░███░░███░███     ░███    ',
  ' ░███░░░░░███ ░███    █████ ░███░░█    ░███  ░░██████     ░███    ',
  ' ░███    ░███ ░░███  ░░███  ░███ ░   █ ░███  ░░█████     ░███    ',
  ' █████   █████ ░░█████████  ██████████ █████  ░░█████    █████   ',
  '░░░░░   ░░░░░   ░░░░░░░░░  ░░░░░░░░░░ ░░░░░    ░░░░░    ░░░░░    ',
];

const CYAN_LINES = new Set([0, 11, 23]); // Top, logo, bottom halves first lines
const GREEN_LINES = new Set([7, 21, 30]); // Bottom lines of each half

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
        let color: string = 'cyan';
        if (GREEN_LINES.has(i)) color = 'green';
        else if (line.trim() === '') return <Text key={i}> </Text>;

        return (
          <Text key={i} color={color} bold>
            {line}
          </Text>
        );
      })}
    </Box>
  );
}

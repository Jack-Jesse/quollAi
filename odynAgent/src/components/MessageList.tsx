import React from 'react';
import { Box, Text } from 'ink';
import { ChatMessage } from '../lib/api.js';
import { AgentStep } from '../lib/agent-loop.js';

interface MessageListProps {
  messages: ChatMessage[];
  steps: AgentStep[];
  maxHeight: number;
}

export function MessageList({ messages, steps, maxHeight }: MessageListProps) {
  const visible = messages.filter((m) => m.role !== 'system');

  const allLines: {
    role: 'user' | 'assistant' | 'tool';
    text: string;
    isLabel: boolean;
    isError?: boolean;
  }[] = [];

  // Chat messages
  for (const msg of visible) {
    const role = (msg.role === 'system' ? 'user' : msg.role) as 'user' | 'assistant';
    allLines.push({ role, text: role === 'user' ? ' You' : ' Odyn', isLabel: true });
    for (const line of msg.content.split('\n')) {
      allLines.push({ role, text: line, isLabel: false });
    }
    allLines.push({ role, text: '', isLabel: false });
  }

  // Only show tool calls and results inline — no TODO, no sanity checks, no auto_exec noise
  for (const step of steps) {
    if (step.type === 'tool_call') {
      const icon = step.language === 'python' ? '🐍'
        : step.toolCall?.name === 'web_search' ? '🔍'
        : step.toolCall?.name === 'web_scrape' ? '🌐'
        : '🔧';
      allLines.push({ role: 'tool', text: `${icon} ${step.content}`, isLabel: false });
    } else if (step.type === 'tool_result') {
      const isError = step.toolResult?.isError ?? false;
      for (const line of step.content.split('\n').slice(0, 3)) {
        allLines.push({ role: 'tool', text: `  ${isError ? '❌' : '✅'} ${line}`, isLabel: false, isError });
      }
      if (step.content.split('\n').length > 3) {
        allLines.push({ role: 'tool', text: `  … +${step.content.split('\n').length - 3} lines`, isLabel: false });
      }
    } else if (step.type === 'error') {
      allLines.push({ role: 'tool', text: `⚠ ${step.content}`, isLabel: false, isError: true });
    } else if (step.type === 'nudge') {
      // Only show nudges sparingly in the message list
      if (!step.content.includes('Waiting')) {
        allLines.push({ role: 'tool', text: `🔄 ${step.content}`, isLabel: false });
      }
    } else if (step.type === 'auto_step') {
      const icon = step.toolResult?.isError ? '❌' : '⚡';
      allLines.push({ role: 'tool', text: `${icon} ${step.content}`, isLabel: false });
    }
    // compact, todo_update — NOT shown here
  }

  const rendered = allLines.slice(-maxHeight);

  return (
    <Box flexDirection="column">
      {rendered.map((line, lineIndex) =>
        line.isLabel ? (
          <Box key={`l-${lineIndex}`}>
            <Text bold color={line.role === 'user' ? 'green' : line.role === 'tool' ? 'magenta' : 'blue'}>
              {line.text}
            </Text>
          </Box>
        ) : line.role === 'tool' ? (
          <Text key={`l-${lineIndex}`} dimColor={!line.isError} color={line.isError ? 'red' : undefined}>
            {line.text || ' '}
          </Text>
        ) : (
          <Text key={`l-${lineIndex}`}>{line.text || ' '}</Text>
        )
      )}
    </Box>
  );
}

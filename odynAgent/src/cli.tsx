import React from 'react';
import { render, Text, Box } from 'ink';
import App from './App.js';

// Set environment variable to bypass raw mode issues
process.env.INK_FORCE_NO_RAW_MODE = 'true';

// Handle environments where raw mode is not supported
const options = {
  exitOnCtrlC: false,
  // Disable patchConsole to avoid conflicts in certain environments
  patchConsole: false,
  // Try to use a different input method
  unstable_useInput: false,
};

// New banner for fallback mode
const FALLBACK_BANNER_LINES = [

    '███████    ██████████   █████ █████ ██████   █████      █████████     █████████  ██████████ ██████   █████ ███████████',
  '███░░░░░███ ░░███░░░░███ ░░███ ░░███ ░░██████ ░░███      ███░░░░░███   ███░░░░░███░░███░░░░░█░░██████ ░░███ ░█░░░███░░░█',
 '███     ░░███ ░███   ░░███ ░░███ ███   ░███░███ ░███     ░███    ░███  ███     ░░░  ░███  █ ░  ░███░███ ░███ ░   ░███  ░', 
'░███      ░███ ░███    ░███  ░░█████    ░███░░███░███     ░███████████ ░███          ░██████    ░███░░███░███     ░███',    
'░███      ░███ ░███    ░███   ░░███     ░███ ░░██████     ░███░░░░░███ ░███    █████ ░███░░█    ░███ ░░██████     ░███',   
'░░███     ███  ░███    ███     ░███     ░███  ░░█████     ░███    ░███ ░░███  ░░███  ░███ ░   █ ░███  ░░█████     ░███',    
 '░░░███████░   ██████████      █████    █████  ░░█████    █████   █████ ░░█████████  ██████████ █████  ░░█████    █████',   
   '░░░░░░░    ░░░░░░░░░░      ░░░░░    ░░░░░    ░░░░░    ░░░░░   ░░░░░   ░░░░░░░░░  ░░░░░░░░░░ ░░░░░    ░░░░░    ░░░░░',    
];

function showFallbackBanner() {
  FALLBACK_BANNER_LINES.forEach(line => console.log(line));
  console.log('\nRun any MLX model from HuggingFace — fully local, no cloud needed.');
  console.log('Active model: prism-ml/Ternary-Bonsai-8B-mlx-2bit');
  console.log('Commands: /model (switch models), /agent (agent mode), /chat (chat mode)');
  console.log('Note: Full features require a proper terminal environment.');
  console.log('Press Ctrl+C to exit.');
  
  // Wait for user input or exit
  process.stdin.setRawMode(false);
  process.stdin.resume();
  process.stdin.on('data', (key) => {
    if (key.toString() === '▒') {
      console.log('\nExiting...');
      process.exit(0);
    }
  });
}

// Check if we're in a supported environment
if (process.stdout.isTTY && typeof process.stdin.setRawMode === 'function') {
  // We're in a TTY environment that supports raw mode
  console.log('Starting Odyn Agent in terminal mode...');
  render(<App />, options);
} else if (process.stdout.isTTY) {
  console.warn('Terminal detected but raw mode not supported - using basic mode');
  console.warn('Some interactive features may not work properly');
  render(<App />, options);
} else {
  console.log('Starting Odyn Agent in basic mode...');
  console.log('Full interactive features require a terminal environment.');
  
  // Try to render the app, but fallback to banner-only if it fails
  try {
    // Set up error handling for raw mode issues
    process.stderr.on('data', (data) => {
      if (data.toString().includes('Raw mode is not supported')) {
        console.error('Raw mode error detected, falling back to banner-only mode...');
        showFallbackBanner();
      }
    });
    
    render(<App />, options);
  } catch (error) {
    console.error('Full application failed to render, showing banner only...');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    showFallbackBanner();
    
    // Wait for user input or exit
    process.stdin.setRawMode(false);
    process.stdin.resume();
    process.stdin.on('data', (key) => {
      if (key.toString() === '▒') {
        console.log('\nExiting...');
        process.exit(0);
      }
    });
  }
}
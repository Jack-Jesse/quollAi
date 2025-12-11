# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Mergecogni AI LLM** is a static web-based chat interface for interacting with LLMs, specifically designed to work with Ollama API endpoints. The project is also known as "merge-ai" on GitHub.

## Tech Stack

- **Frontend**: Pure HTML5, CSS3, and vanilla JavaScript
- **CSS Framework**: Tailwind CSS (via CDN)
- **JavaScript Framework**: Alpine.js (via CDN for reactive UI components)
- **Build System**: None (static site)
- **Package Management**: None (uses CDN dependencies)

## Architecture

The application is a client-side only static web application with these key components:

- **index.html**: Main application interface with Alpine.js directives for reactive UI
- **script.js**: Alpine.js application logic (currently empty - needs implementation)
- **styles.css**: Custom CSS animations for mobile menu transitions
- **AGENTS.md**: Development guidelines and code style conventions

### Key Features (UI Only)

The HTML provides a complete UI for:
- Real-time chat interface with message history
- Settings modal with configuration options
- Dark mode toggle
- Mobile-responsive hamburger menu
- Model selection dropdown
- Temperature control slider
- API endpoint configuration
- API key input field
- Typing indicator animation

## Development Commands

```bash
# Run locally - no build process required
open index.html
# or use a live server for development
live-server

# No package.json, no dependencies to install
# No automated tests - manual testing in browser only
```

## Code Implementation Status

**CRITICAL**: The project is currently incomplete. The UI exists but `script.js` is empty (contains only a newline character). All Alpine.js logic needs to be implemented.

## Required Implementation

The `chatApp()` Alpine.js function needs to be created with:

### Core Properties
```javascript
{
  showMenu: false,
  showSettings: false,
  isTyping: false,
  input: '',
  messages: [],
  models: [],
  modelsError: null,
  config: {
    darkMode: false,
    model: '',
    temperature: 0.7,
    endpoint: 'http://localhost:11434/api/chat',
    apiKey: ''
  }
}
```

### Core Methods
- `init()`: Load config from localStorage, fetch available models
- `toggleMenu()`: Mobile menu toggle
- `toggleSettings()`: Settings modal toggle
- `applySettings()`: Apply dark mode changes
- `saveConfig()`: Save configuration to localStorage
- `sendMessage()`: Handle user input and API communication
- `fetchModels()`: Get available models from Ollama endpoint

### API Integration Requirements
- Use fetch API to communicate with Ollama `/api/tags` for model list
- Use fetch API for chat completion with `/api/chat` endpoint
- Handle streaming responses or batch responses
- Implement proper error handling for network failures
- Show typing indicator during API calls

## Development Guidelines

From AGENTS.md:
- Use modern ES6+ syntax with async/await
- Follow Alpine.js conventions for reactive data
- Use semantic HTML5 elements
- Implement mobile-first responsive design
- Handle errors gracefully with try/catch blocks
- Store configuration in localStorage

## Important Notes

- No build process or bundling required
- All dependencies loaded via CDN
- Configuration stored in browser localStorage
- No backend component - pure client-side application
- Designed specifically for Ollama API format but configurable for other endpoints
- Project name discrepancy: Repository is "merge-ai" but app displays "Mergecogni AI LLM"
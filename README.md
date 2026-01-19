# TurboTax Chat-First Filing Experience Demo

A high-fidelity React + TypeScript demo simulating a TurboTax "Chat-First Filing Experience".

## Features

- **Chat-First Interface** - All interactions happen in conversation
- **W-2 Upload** - Integrated upload experience with chat acknowledgment
- **Intelligent Agents** - Executive, Explanation, Deductions, Investments, State Taxes
- **Web Search Simulation** - Simulated search with source citations
- **Streaming Responses** - ChatGPT-style token-by-token streaming
- **Inline Actions** - Clickable buttons that update state immediately
- **Monetization** - Passive upsell suggestions (dismissible)
- **Multi-W-2 Support** - Handle multiple W-2 uploads
- **Professional UI** - TurboTax-style design with animations

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up Gemini API key:
   - Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a `.env` file in the root directory
   - Add your API key: `VITE_GEMINI_API_KEY=your_api_key_here`

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to the URL shown in the terminal (typically `http://localhost:5173`)

## Quick Start

### Option 1: Upload W-2
1. Click "Upload W-2" button below the chat input
2. Select a file (PDF or image)
3. Watch the system acknowledge and process it

### Option 2: Ask Questions
1. Type questions like:
   - "What is the standard deduction?"
   - "How can I reduce my taxes?"
   - "What about my investments?"

### Option 3: Run Demo
1. Click "Start Demo" button in empty state
2. Watch automated flow through all features

## Project Structure

- `/src/App.tsx` - Main application component
- `/src/components/` - UI components (Sidebar, ChatInput, ChatThread, MessageBubble, W2UploadModal)
- `/src/agents/` - Agent system (orchestrator and specialist agents)
- `/src/state/` - Client-side state management
- `/src/tools/` - Web search simulator
- `/src/utils/` - Streaming utilities, W-2 data generator
- `/src/demo/` - Automated demo mode
- `/src/types.ts` - TypeScript type definitions

## Architecture

The app uses an agent-based architecture where:
- The **Executive Agent** routes messages to specialist agents
- Specialist agents handle specific tax topics (deductions, investments, state taxes, etc.)
- The **Agent Orchestrator** manages the flow between agents
- **Monetization Agent** runs passively, suggesting upsells when appropriate
- All state is managed client-side

## Demo Script

See `DEMO_SCRIPT.md` for a comprehensive testing guide covering all features.

## Development Notes

This is a demo application. All agent logic contains TODO comments where production logic would be implemented. The current implementation uses simple keyword-based routing for demonstration purposes.

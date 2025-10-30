# PPYLSE Game Hub

## Overview
A multiplayer gaming platform built with React, TypeScript, Vite, and Express. Features include user authentication, game lobbies, and support for multiple card games (Durak, Monopoly, UNO, and mini-games).

## Project Architecture
- **Frontend**: React 18 + TypeScript + Vite + shadcn/ui components
- **Backend**: Express.js server with SQLite database
- **Port Configuration**:
  - Frontend: `0.0.0.0:5000` (webview)
  - Backend API: `localhost:3001`

## Recent Changes (October 30, 2025)
- Configured for Replit environment
- Updated Vite to bind to `0.0.0.0:5000` for Replit proxy compatibility
- Backend server configured to use `localhost:3001` 
- Set up concurrently to run both frontend and backend together
- Created workflow for development server on port 5000
- Fixed corrupted SQLite database by removing and recreating
- Added comprehensive .gitignore files
- Configured deployment settings for VM deployment

## Project Structure
```
josharubchiski/pyplse-game-hub-main/
├── src/                    # Frontend React source code
├── public/                 # Static assets
├── server.js              # Express backend server
├── vite.config.ts         # Vite configuration
├── package.json           # Dependencies and scripts
└── pyplse_game_hub.db     # SQLite database
```

## Development Setup
1. Dependencies are managed via npm
2. Database automatically initializes on first run
3. Concurrent script runs both frontend and backend
4. Environment variables stored in `.env` file

## Key Features
- User authentication with bcrypt password hashing
- Game lobby system with customizable settings
- Friend system
- Achievements tracking
- Real-time game sessions
- Chat functionality

## Database Schema
- `user_auth`: User credentials
- `profiles`: User profiles with stats
- `friendships`: Friend relationships
- `game_lobbies`: Game room configurations
- `lobby_players`: Players in each lobby
- `game_sessions`: Active game states
- `chat_messages`: In-game chat
- `achievements`: Achievement definitions
- `user_achievements`: User achievement progress

## Technology Stack
- React 18
- TypeScript
- Vite
- Express 5
- better-sqlite3
- shadcn/ui components
- TailwindCSS
- React Router
- TanStack Query

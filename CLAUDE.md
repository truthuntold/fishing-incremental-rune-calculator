# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

- **Start development server**: `npm run dev` - Runs Vite dev server with HMR
- **Build for production**: `npm run build` - TypeScript compilation + Vite build
- **Lint code**: `npm run lint` - Run ESLint on all files
- **Preview production build**: `npm run preview` - Serve production build locally

## Project Architecture

This is a React + TypeScript + Vite application with the following structure:

- **Frontend Framework**: React 19 with TypeScript
- **Build Tool**: Vite with SWC plugin for fast refresh
- **Linting**: ESLint with React hooks and refresh plugins
- **Entry Point**: `src/main.tsx` renders `src/App.tsx`
- **Styling**: CSS modules (App.css, index.css)

The project appears to be intended as a fishing incremental rune calculator based on the repository name, though currently contains the default Vite + React template.

## Development Setup

The project uses modern React with:
- TypeScript strict configuration split across `tsconfig.app.json` and `tsconfig.node.json`
- Vite's SWC plugin for optimized development experience
- React 19 features available
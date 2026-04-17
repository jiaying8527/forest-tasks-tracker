# forest-tasks-tracker Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-17

## Active Technologies
- TypeScript 5.x on Node.js 20.x (build-time only) + React 18, Vite 5, React Router 6 (hash router), nanoid, vite-plugin-pwa (001-forest-tasks-tracker)
- Browser localStorage (primary); IndexedDB planned as fallback only if quota is hi (001-forest-tasks-tracker)
- TypeScript 5.x on Node.js 20.x (build-time only) + React 18, Vite 5, React Router 6, nanoid, vite-plugin-pwa, @supabase/supabase-js ^2.45 (002-cloud-sync)
- Browser localStorage (local cache + source of truth for signed-out users); Supabase Postgres `profiles` table (JSONB snapshot per user) for signed-in sync (002-cloud-sync)

- (001-forest-tasks-tracker)

## Project Structure

```text
src/
tests/
```

## Commands

# Add commands for 

## Code Style

: Follow standard conventions

## Recent Changes
- 002-cloud-sync: Added TypeScript 5.x on Node.js 20.x (build-time only) + React 18, Vite 5, React Router 6, nanoid, vite-plugin-pwa, @supabase/supabase-js ^2.45
- 001-forest-tasks-tracker: Added TypeScript 5.x on Node.js 20.x (build-time only) + React 18, Vite 5, React Router 6 (hash router), nanoid, vite-plugin-pwa

- 001-forest-tasks-tracker: Added

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

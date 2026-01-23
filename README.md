# Antigravity Monorepo

This repository hosts multiple projects under the Antigravity umbrella.

## Current Projects

- **ExpenseFlow** – Premium offline-first expense tracker PWA  
  Location: `/projects/expense-flow`  
  Run: `pnpm --filter expense-flow dev`  
  Build: `pnpm --filter expense-flow build`

## Adding a New Project

1. `mkdir -p projects/my-new-app`
2. `cd projects/my-new-app`
3. `pnpm create vite . --template react-ts`
4. Update `package.json` name to `@antigravity/my-new-app`
5. `pnpm install`
6. Develop as usual: `pnpm --filter my-new-app dev`

## Commands

- `pnpm dev` (runs expense-flow by default, see root package.json)
- `pnpm install`: Install all dependencies
- `pnpm build`: Build all projects (currently runs expense-flow build)

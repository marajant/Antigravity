# Antigravity (ExpenseFlow)

A premium, offline-first expense tracker PWA built with React 19, TypeScript, and Vite.

## Features
- **Offline-First**: Uses IndexedDB (Dexie.js) for robust local storage.
- **OCR Receipt Scanning**: Tesseract.js integration for extracting data from receipts.
- **Glassmorphism UI**: Premium dark-mode design with smooth animations.
- **PWA**: Installable on Desktop and Mobile (iOS/Android).

## Tech Stack
- React 19 + TypeScript
- Vite
- Dexie.js (IndexedDB)
- Tesseract.js (OCR)
- Framer Motion & Recharts
- Tailwind merge + CLSX (for styles)

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```

3. **Build for Production**
   ```bash
   npm run build
   ```

4. **Test**
   ```bash
   npm run test
   ```

## Folder Structure
- `src/components`: Reusable UI components
- `src/lib`: Core logic (Database, OCR, Utils)
- `src/pages`: Application views
- `src/ui`: Shared design system components

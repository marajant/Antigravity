# 🚀 Antigravity (ExpenseFlow)

> **A lightweight, offline-first expense tracker with anti-gravity visuals—smooth, floating UI elements that make financial tracking feel effortless.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8)

## ✨ Features

### Core Functionality
- 📊 **Dashboard Analytics** - Real-time spending trends, category breakdowns, and AI-powered insights
- 📸 **OCR Receipt Scanning** - Automatic extraction of merchant, amount, and date using Tesseract.js
- 📁 **Bulk Import** - Drag & drop multiple receipts or CSV files for batch processing
- 💾 **Offline-First** - All data stored locally in IndexedDB via Dexie.js
- 🔄 **Currency Support** - Multi-currency with conversion rates

### Visual Experience
- 🌌 **Glassmorphism Design** - Frosted glass panels with depth and blur effects
- ✨ **Micro-Animations** - Framer Motion powered transitions and hover effects
- 🎨 **Dark Mode** - Premium dark theme with vibrant accent colors
- 📱 **Responsive** - Works seamlessly on desktop, tablet, and mobile

### PWA Capabilities
- 📲 **Installable** - Add to home screen on iOS/Android
- ⚡ **Fast** - Service worker caching for instant loads
- 🔒 **Secure** - SHA-256 file hashing for duplicate detection

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 7 |
| Styling | Vanilla CSS with CSS Variables |
| Animation | Framer Motion |
| Charts | Recharts |
| Database | Dexie.js (IndexedDB) |
| OCR | Tesseract.js |
| Icons | Lucide React |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/marajant/Antigravity.git
cd Antigravity

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint with type-aware rules |
| `npm run test` | Run unit tests with Vitest |
| `npm run test:ui` | Run tests with visual UI |

## 📁 Project Structure

```
src/
├── components/       # React UI components
│   ├── ui/          # Reusable primitives (Button, etc.)
│   ├── charts/      # Recharts wrappers
│   └── ...          # Feature components
├── lib/             # Utilities & services
│   ├── db.ts        # Dexie database schema
│   ├── ocr.ts       # Tesseract.js wrapper
│   ├── analytics.ts # Calculation helpers
│   └── ...
├── App.tsx          # Main application
├── main.tsx         # Entry point with ErrorBoundary
└── index.css        # Global styles & design tokens
```

## 🎨 Design System

### CSS Variables
```css
--primary: hsl(270, 80%, 60%);      /* Deep Purple */
--bg-color: hsl(240, 15%, 8%);      /* Near Black */
--surface-color: hsl(240, 15%, 12%); /* Dark Surface */
--text-primary: hsl(0, 0%, 95%);    /* White */
```

### Glass Panel Effect
```css
.glass-panel {
  background: hsla(240, 15%, 15%, 0.6);
  backdrop-filter: blur(16px);
  border: 1px solid hsla(0, 0%, 100%, 0.08);
}
```

## 🗺️ Roadmap

- [x] Core expense tracking
- [x] OCR receipt scanning
- [x] Dashboard with charts
- [x] PWA support
- [x] Bulk import
- [ ] Cloud sync (optional)
- [ ] Budget notifications
- [ ] Export to PDF reports
- [ ] Multi-language support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

---

<p align="center">
  Built with ❤️ using React + TypeScript + Vite
</p>

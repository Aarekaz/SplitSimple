<div align="center">

# 🧾 SplitSimple

**A modern, collaborative bill-splitting app with real-time sync and universal sharing**

Split bills with friends effortlessly, whether you're dining out, sharing expenses, or planning group activities.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-79%20passing-success?style=flat)](https://github.com/Aarekaz/splitsimple)

[Features](#-features) • [Quick Start](#-quick-start) • [Demo](#-demo) • [Architecture](#️-architecture) • [Contributing](#-contributing)

</div>

---

## ✨ Features

### 🔗 Universal Sharing & Collaboration
- **Shareable Links** — Generate unique URLs that work for anyone, anywhere
- **Real-time Collaboration** — Multiple people can edit the same bill simultaneously
- **Cloud Sync** — Automatic syncing with visual status indicators
- **No Accounts Required** — Anonymous, temporary bill storage (auto-deletes after ~6 months)

### 💰 Smart Bill Management
- **Intelligent Status System** — Draft → Active → Closed workflow with contextual actions
- **Flexible Splitting** — Split items evenly, by shares, percentage, or exact amounts
- **Tax & Tip Allocation** — Distribute proportionally or evenly among participants
- **Accurate Calculations** — Precision math to avoid "penny problems"

### 🎨 Modern User Experience
- **Clean Interface** — Simplified item entry and intuitive controls
- **Drag & Drop** — Reorder items with smooth animations
- **Auto-collapse** — Focus on active items while keeping interface clean
- **Responsive Design** — Optimized for both desktop and mobile devices

### ⚡ Power Features
- **Keyboard Shortcuts** — `Enter` to add items, `Cmd/Ctrl+D` to duplicate, arrow navigation
- **Export Options** — Copy text summaries or download CSV files
- **Visual Feedback** — Success animations, hover effects, and smooth transitions
- **Persistent State** — Never lose your work with automatic local storage
- **Undo/Redo** — Full history tracking (50 actions)

---

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **pnpm** 9+ (`npm install -g pnpm`)
- **Redis** URL for sharing features (optional for local dev)

### Installation

```bash
# Clone the repository
git clone https://github.com/aarekaz/splitsimple.git
cd splitsimple

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your REDIS_URL
```

### Environment Configuration

Create a `.env.local` file in the root directory:

```ini
# Required for sharing features
REDIS_URL="redis://your-redis-url-here"

# Optional analytics
NEXT_PUBLIC_POSTHOG_KEY="your-posthog-key"
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"

# Optional receipt scanning
OCR_PROVIDER="google"  # or "openai" or "anthropic"
GOOGLE_AI_API_KEY="your-google-ai-key"
OPENAI_API_KEY="your-openai-key"
ANTHROPIC_API_KEY="your-anthropic-key"
```

> **Note:** The app works without Redis for local-only bill management. OCR features fall back to mock data if keys are not provided.

### Development

```bash
# Start the development server
pnpm dev

# Open http://localhost:3000 in your browser
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm dev:clean` | Clear cache and start dev server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint checks |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm test` | Run all tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Generate coverage report |

---

## 🎯 Use Cases

<table>
<tr>
<td width="25%">

**🍽️ Restaurant Bills**

Split dinner costs fairly among friends with per-item tracking

</td>
<td width="25%">

**✈️ Group Trips**

Track shared expenses and settlements for vacations

</td>
<td width="25%">

**🏠 Roommate Expenses**

Fairly divide household costs and utilities

</td>
<td width="25%">

**🎉 Event Planning**

Manage group purchases and contributions

</td>
</tr>
</table>

---

## 🏗️ Architecture

### Tech Stack

<table>
<tr>
<td>

**Frontend**
- Next.js 15 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS v4
- shadcn/ui components
- Radix UI primitives

</td>
<td>

**State & Data**
- React Context + useReducer
- Local Storage persistence
- Redis for cloud sync
- Real-time collaboration
- Undo/Redo system

</td>
<td>

**Developer Experience**
- Jest + React Testing Library
- MSW for API mocking
- GitHub Actions CI/CD
- ESLint + TypeScript strict mode
- Vercel Analytics

</td>
</tr>
</table>

### Project Structure

```
splitsimple/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (sharing, sync)
│   └── page.tsx           # Main bill-splitting page
├── components/            # React components
│   ├── bill/             # Bill management UI
│   ├── mobile/           # Mobile-optimized views
│   └── ui/               # shadcn/ui components
├── contexts/             # React Context providers
│   └── BillContext.tsx   # Global state management
├── lib/                  # Core logic
│   ├── calculations.ts   # Bill splitting math
│   ├── validation.ts     # Input sanitization
│   └── export.ts         # Export utilities
├── hooks/                # Custom React hooks
├── tests/                # Test suite
└── public/               # Static assets
```

### Key Features Implementation

**Mathematical Precision**
- Cent-based calculations to avoid floating-point errors
- Rounding strategies that eliminate "penny problems"
- Proportional distribution algorithms for tax/tip

**Security**
- XSS prevention through input sanitization
- Zod schema validation
- Redis data expiration (6 months)
- No user authentication required

**Real-time Collaboration**
- WebSocket-like sync with Redis pub/sub
- Optimistic UI updates
- Conflict resolution for concurrent edits

**Responsive Design**
- Mobile-first approach
- Dedicated mobile sheets and modals
- Touch-friendly interactions
- Adaptive layouts for all screen sizes

---

## 🧪 Testing & Quality

### Test Coverage

We maintain high test coverage for critical components:

| Module | Coverage | Tests |
|--------|----------|-------|
| `calculations.ts` | 98% | Business logic validation |
| `validation.ts` | 96% | Input sanitization |
| `BillContext.tsx` | 95% | State management |
| **Overall** | **70%+** | **79 passing tests** |

### Running Tests

```bash
# Run all tests
pnpm test

# Watch mode for development
pnpm test:watch

# Generate coverage report
pnpm test:coverage

# Run specific test file
pnpm test calculations
```

### Continuous Integration

Our CI pipeline runs on every push:
- ✅ ESLint code quality checks
- ✅ TypeScript type checking
- ✅ Unit tests with coverage reporting
- ✅ Integration tests with Redis
- ✅ Build verification

---

## 🚢 Deployment

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/aarekaz/splitsimple)

1. **Connect Repository** — Link your GitHub repo to Vercel
2. **Add Redis Database** — Provision Vercel KV or connect external Redis
3. **Configure Environment** — Set `REDIS_URL` in Vercel dashboard
4. **Deploy** — Sharing and collaboration work automatically!

### Manual Deployment

```bash
# Build the application
pnpm build

# Start production server
pnpm start
```

For other platforms (AWS, Google Cloud, etc.), ensure you:
- Set environment variables (especially `REDIS_URL`)
- Configure Redis for sharing features
- Use Node.js 18+ runtime

---

## 📖 Documentation

Additional documentation is available in the repository:

- [**Testing Guide**](README-testing.md) — Comprehensive testing documentation
- [**Infrastructure**](INFRASTRUCTURE.md) — Deployment and scaling guide
- [**Analytics**](ANALYTICS.md) — PostHog integration details
- [**Receipt Scanning**](RECEIPT_SCANNING_SETUP.md) — OCR feature setup
- [**Changelog**](changelog.md) — Version history

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
4. **Run tests** (`pnpm test`)
5. **Commit your changes** (`git commit -m 'Add amazing feature'`)
6. **Push to the branch** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

### Development Guidelines

- Write tests for new features
- Maintain or improve code coverage
- Follow existing code style
- Update documentation as needed
- Keep commits atomic and well-described

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with these amazing open-source projects:

- [Next.js](https://nextjs.org/) — React framework
- [shadcn/ui](https://ui.shadcn.com/) — Component library
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS
- [Radix UI](https://www.radix-ui.com/) — Accessible components
- [dnd-kit](https://dndkit.com/) — Drag and drop
- [Redis](https://redis.io/) — In-memory database

---

<div align="center">

**Made with ❤️ by the SplitSimple team**

[Report Bug](https://github.com/aarekaz/splitsimple/issues) • [Request Feature](https://github.com/aarekaz/splitsimple/issues) • [GitHub](https://github.com/aarekaz/splitsimple)

⭐ Star us on GitHub — it helps!

</div>

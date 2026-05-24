# SplitSimple

A modern, collaborative bill-splitting app with real-time sync and universal sharing. Split bills with friends effortlessly, whether you're dining out, sharing expenses, or planning group activities.

## ✨ Key Features

### 🔗 **Universal Sharing & Collaboration**
*   **Shareable Links**: Generate unique URLs that work for anyone, anywhere
*   **Real-time Collaboration**: Multiple people can edit the same bill simultaneously
*   **Cloud Sync**: Automatic syncing with visual status indicators
*   **No Accounts Required**: Anonymous, temporary bill storage (auto-deletes after ~6 months)

### 💰 **Smart Bill Management**
*   **Flexible Splitting**: Split items evenly, by shares, percentage, or exact amounts
*   **Tax & Tip Allocation**: Distribute proportionally or evenly among participants
*   **Accurate Calculations**: Precision math to avoid "penny problems"

### 🎨 **Modern User Experience**
*   **Clean Interface**: Simplified item entry and intuitive controls
*   **Drag & Drop**: Reorder items with smooth animations
*   **Auto-collapse**: Focus on active items while keeping interface clean
*   **Responsive Design**: Optimized for both desktop and mobile devices

### ⚡ **Power Features**
*   **Keyboard Shortcuts**: `Enter` to add items, `Cmd/Ctrl+D` to duplicate, arrow navigation
*   **Export Options**: Copy text summaries or download CSV files
*   **Visual Feedback**: Success animations, hover effects, and smooth transitions
*   **Persistent State**: Never lose your work with automatic local storage

## 🚀 Getting Started

### Prerequisites
*   Node.js 18+ and pnpm

### Local Development
1.  **Clone and install:**
    ```sh
    git clone https://github.com/aarekaz/splitsimple
    cd splitsimple
    pnpm install
    ```

2.  **Prepare the local D1 database (for sharing features):**
    ```sh
    cp .dev.vars.example .dev.vars
    pnpm db:migrations:apply:local
    ```

3.  **Run the development server:**
    ```sh
    pnpm dev
    ```

4.  **Open [http://localhost:3000](http://localhost:3000)** in your browser

### Development Commands
*   `pnpm dev` - Start development server
*   `pnpm build` - Build for production
*   `pnpm preview` - Build and preview in the Cloudflare Workers runtime
*   `pnpm deploy` - Build and deploy to Cloudflare Workers
*   `pnpm db:migrations:apply:local` - Apply D1 migrations locally
*   `pnpm db:migrations:apply:remote` - Apply D1 migrations to the remote D1 database
*   `pnpm start` - Start production server
*   `pnpm test` - Run all tests
*   `pnpm test:watch` - Run tests in watch mode
*   `pnpm test:coverage` - Run tests with coverage report
*   `pnpm lint` - Check code style
*   `pnpm typecheck` - Run TypeScript checks

### Deployment
Deploy to Cloudflare Workers with D1 for full sharing functionality:
1. Run `pnpm wrangler login`
2. Create the database with `pnpm wrangler d1 create splitsimple`
3. Copy the returned `database_id` into `wrangler.jsonc`
4. Run `pnpm db:migrations:apply:remote`
5. Deploy with `pnpm deploy`

## 🎯 Perfect For

*   **Restaurant bills** - Split dinner costs among friends
*   **Group trips** - Track shared expenses and settlements
*   **Roommate expenses** - Fairly divide household costs
*   **Event planning** - Manage group purchases and contributions

## 🏗️ Architecture

### Core Technologies
*   **Next.js 16** - React framework with App Router
*   **TypeScript** - Type-safe development with strict mode
*   **Tailwind CSS v4** - Modern utility-first styling
*   **Cloudflare D1** - SQLite-backed cloud storage for bill sharing
*   **shadcn/ui** - High-quality component library

### State Management
*   **React Context + useReducer** - Predictable state management
*   **Local Storage** - Persistent bill data
*   **Real-time Sync** - Automatic cloud synchronization
*   **Undo/Redo System** - Full history tracking (50 actions)

### Key Features Implementation
*   **Mathematical Precision** - Cent-based calculations to avoid floating-point errors
*   **XSS Prevention** - Input sanitization and validation
*   **Keyboard Reordering** - Move items through the app's undoable bill state
*   **Responsive Design** - Mobile-first approach with adaptive layouts

## 🧪 Testing & Quality Assurance

### Testing Stack
*   **Jest** - Test framework and coverage reports
*   **React Testing Library** - Component testing utilities
*   **GitHub Actions** - Automated CI/CD pipeline

### Test Coverage
*   **98% calculations.ts** - Business logic validation
*   **96% validation.ts** - Input sanitization and security
*   **95% BillContext.tsx** - State management integrity
*   **Comprehensive test suite** - Component, context, API route, and utility coverage

### Running Tests
```sh
# Run all tests
pnpm test

# Watch mode for development
pnpm test:watch

# Generate coverage report
pnpm test:coverage

# Run specific test file
pnpm test calculations
```

Built with **Next.js**, **TypeScript**, **Tailwind CSS**, and **Cloudflare D1** for a fast, reliable experience.

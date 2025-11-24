# SplitSimple

A modern, collaborative bill-splitting app with real-time sync and universal sharing. Split bills with friends effortlessly, whether you're dining out, sharing expenses, or planning group activities.

## ✨ Key Features

### 🔗 **Universal Sharing & Collaboration**
*   **Shareable Links**: Generate unique URLs that work for anyone, anywhere
*   **Real-time Collaboration**: Multiple people can edit the same bill simultaneously
*   **Cloud Sync**: Automatic syncing with visual status indicators
*   **No Accounts Required**: Anonymous, temporary bill storage (auto-deletes after ~6 months)

### 💰 **Smart Bill Management**
*   **Intelligent Status System**: Draft → Active → Closed workflow with contextual actions
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

2.  **Set up Redis (for sharing features):**
    ```sh
    # Create .env.local with your Redis URL
    echo 'REDIS_URL="your-redis-url-here"' > .env.local
    ```

3.  **Run the development server:**
    ```sh
    pnpm dev
    ```

4.  **Open [http://localhost:3000](http://localhost:3000)** in your browser

### Development Commands
*   `pnpm dev` - Start development server
*   `pnpm build` - Build for production
*   `pnpm start` - Start production server
*   `pnpm test` - Run all tests
*   `pnpm test:watch` - Run tests in watch mode
*   `pnpm test:coverage` - Run tests with coverage report
*   `pnpm lint` - Check code style
*   `pnpm type-check` - Run TypeScript checks

### Deployment
Deploy to Vercel with Redis KV for full sharing functionality:
1. Connect your GitHub repo to Vercel
2. Add a Redis database from Vercel's marketplace
3. Deploy - sharing and collaboration work automatically!

## 🎯 Perfect For

*   **Restaurant bills** - Split dinner costs among friends
*   **Group trips** - Track shared expenses and settlements
*   **Roommate expenses** - Fairly divide household costs
*   **Event planning** - Manage group purchases and contributions

## 🏗️ Architecture

### Core Technologies
*   **Next.js 15** - React framework with App Router
*   **TypeScript** - Type-safe development with strict mode
*   **Tailwind CSS v4** - Modern utility-first styling
*   **Redis** - Cloud storage for bill sharing
*   **shadcn/ui** - High-quality component library

### State Management
*   **React Context + useReducer** - Predictable state management
*   **Local Storage** - Persistent bill data
*   **Real-time Sync** - Automatic cloud synchronization
*   **Undo/Redo System** - Full history tracking (50 actions)

### Key Features Implementation
*   **Mathematical Precision** - Cent-based calculations to avoid floating-point errors
*   **XSS Prevention** - Input sanitization and validation
*   **Drag & Drop** - Smooth item reordering with @dnd-kit
*   **Responsive Design** - Mobile-first approach with adaptive layouts

## 🧪 Testing & Quality Assurance

### Testing Stack
*   **Jest** - Test framework with 70% coverage targets
*   **React Testing Library** - Component testing utilities
*   **MSW** - API mocking for integration tests
*   **GitHub Actions** - Automated CI/CD pipeline

### Test Coverage
*   **98% calculations.ts** - Business logic validation
*   **96% validation.ts** - Input sanitization and security
*   **95% BillContext.tsx** - State management integrity
*   **79 passing tests** - Comprehensive test suite

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

Built with **Next.js**, **TypeScript**, **Tailwind CSS**, and **Redis** for a fast, reliable experience.

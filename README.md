# SplitSimple

A modern, collaborative bill-splitting app with real-time sync and universal sharing. Split bills with friends effortlessly, whether you're dining out, sharing expenses, or planning group activities.

## ✨ Key Features

### 🔗 **Universal Sharing & Collaboration**
*   **Shareable Links**: Generate unique URLs that work for anyone, anywhere
*   **Real-time Collaboration**: Multiple people can edit the same bill simultaneously
*   **Cloud Sync**: Automatic syncing with visual status indicators
*   **No Accounts Required**: Anonymous, temporary bill storage (30-day expiration)

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

Built with **Next.js**, **TypeScript**, **Tailwind CSS**, and **Redis** for a fast, reliable experience.

# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Documentation
- **Contributing Guidelines**: Added comprehensive CONTRIBUTING.md with development workflow, branching strategy, code standards, and PR process
- **API Reference**: Created detailed API_REFERENCE.md documenting all endpoints, error codes, and usage examples
- **Keyboard Shortcuts Guide**: Added KEYBOARD_SHORTCUTS.md with quick reference for all shortcuts and troubleshooting tips

### Added
- **Favicon**: Added a site favicon that matches the header logo for a consistent and professional look.
- **Vercel Web Analytics**: Integrated Vercel's analytics to track page views and user engagement.
- **PostHog Analytics**: Integrated PostHog for detailed user behavior tracking and analytics
- **Admin Dashboard**: Implemented admin panel for viewing and managing all bills with statistics and filtering
- **Enhanced Keyboard Shortcuts**:
  - Use `ArrowUp` and `ArrowDown` to navigate between item input fields.
  - Press `Escape` to exit an input field.
  - Press `Enter` in an item input to create a new item.
  - Press `Ctrl/Cmd+D` to duplicate an item.
  - Press `N` to add new item
  - Press `P` to add new person
  - Press `C` to copy bill summary
  - Press `S` to share bill
  - Press `?` to show keyboard shortcuts help
- **Keyboard Shortcuts Help Dialog**: Added accessible dialog showing all available shortcuts with icons and categories
- **Receipt Scanning**: Implemented OCR support for receipt images with multiple provider options (Google Gemini, OpenAI, Anthropic)
- **HEIC/HEIF Support**: Added support for HEIC/HEIF image formats for receipt scanning
- **Unique Person Colors**: Implemented logic to assign a unique color to each new person, generating random colors if the predefined list is exhausted.
- **Redesigned Footer**: Updated the footer with a modern, integrated design and links to the author's GitHub and the project's source code.
- **Changelog**: Created this file to track all project changes.

### Changed
- **Unified People List**: Refactored the "People" panel to use a single vertical list layout on both mobile and desktop for a more consistent UI.
- **Compact Mobile Totals**: Refactored the mobile "Bill Totals" sheet to use a more compact, card-based layout for better visual structure.
- **Simplified Mobile Totals Bar**: Removed the expandable preview and up/down arrow from the mobile totals bar for a cleaner, more focused UI.
- **Mobile Responsive Layout**:
  - **Redesigned "Settings & Actions" Sheet**: Refactored the mobile sheet to a vertical, touch-friendly layout with grouped sections for a cleaner UX.
  - **Redesigned Mobile Header**: Consolidated the header into a single bar and moved settings and actions into a slide-out sheet for a cleaner mobile view.
- **Streamlined UI & State**:
  - Removed the currency selector to simplify the interface.
  - Integrated Tax and Tip as persistent, editable rows in the items list.
  - Redesigned the main header to be cleaner and more responsive, with primary actions as icons.
- **UI/UX Overhaul**:
  - Redesigned the main page to a cleaner, two-column layout.
  - Merged the "People" management and "Individual Totals" into a single, unified "People" panel.
  - Improved color scheme, typography, and component styling for a more modern look.

### Fixed
- **Keyboard Shortcuts Input Conflict**: Fixed keyboard shortcuts triggering while typing in input fields by detecting active input focus
- **Calculation Accuracy**: Implemented a more robust rounding strategy to eliminate "penny problems" and ensure all totals are mathematically exact.
- **Mobile Totals Bar**: The up/down arrow in the mobile totals bar now correctly expands and collapses the totals preview.
- **Simplified Tax/Tip UI**: Removed the redundant "Tax & Tip Allocation" card from the sidebar to create a single source of truth in the items list.
- **Header Actions**: Corrected the header layout to ensure the "Export" and "Copy" buttons are always visible on both desktop and mobile.
- **New Item Assignment**: New items are now correctly assigned to all people by default.
- **Bill ID UX**: Improved bill lookup and sharing experience

### Polished
- **Content-Aware Mobile Sheet**: The mobile "Bill Totals" sheet now dynamically adjusts its height to fit the content, creating a cleaner and more responsive UI.
- **Mobile Sheet Padding**: Added horizontal padding to the mobile "Bill Totals" sheet for a cleaner, more polished look.

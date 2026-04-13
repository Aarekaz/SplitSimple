# Contributing to SplitSimple

Thank you for your interest in contributing to SplitSimple! This document provides guidelines and information for contributors.

## Table of Contents

- [Development Workflow](#development-workflow)
- [Getting Started](#getting-started)
- [Branching Strategy](#branching-strategy)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Commit Message Guidelines](#commit-message-guidelines)

## Development Workflow

### Prerequisites

- Node.js 18+ and npm/yarn
- Redis (for sharing functionality)
- Git

### Getting Started

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/splitsimple.git
   cd splitsimple
   ```

2. **Install Dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Setup**

   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

   Required environment variables:
   - `UPSTASH_REDIS_REST_URL` - Redis URL for bill sharing
   - `UPSTASH_REDIS_REST_TOKEN` - Redis authentication token
   - Optional OCR provider keys (Google Gemini, OpenAI, or Anthropic)

4. **Start Development Server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Branching Strategy

### Branch Naming Convention

Use descriptive branch names following this pattern:

- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation updates
- `test/description` - Test additions/modifications
- `chore/description` - Maintenance tasks

**Examples:**
```
feature/receipt-scanning
fix/calculation-rounding-error
docs/update-readme
test/add-ledger-tests
```

### Working with Branches

1. **Create a new branch from main:**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. **Keep your branch up to date:**
   ```bash
   git checkout main
   git pull origin main
   git checkout feature/your-feature-name
   git rebase main
   ```

## Code Standards

### TypeScript

- Use TypeScript for all new files
- Enable strict type checking
- Avoid `any` types where possible
- Use interfaces for object shapes

### React Components

- Use functional components with hooks
- Follow the existing component structure
- Keep components focused and single-purpose
- Use meaningful prop names with TypeScript types

### Styling

- Use Tailwind CSS v4 for styling
- Follow existing class naming patterns
- Use the theme configuration for colors and spacing
- Ensure responsive design (mobile-first approach)

### Code Quality

- Run linter before committing:
  ```bash
  npm run lint
  ```

- Format code with Prettier (automatically done on save if configured)

- Keep functions small and focused
- Add comments for complex logic
- Remove unused imports and variables

## Testing Requirements

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Coverage Thresholds

Maintain these minimum coverage levels:
- **Branches:** 70%
- **Functions:** 70%
- **Lines:** 70%
- **Statements:** 70%

### Writing Tests

- Write tests for all new features
- Update tests when modifying existing functionality
- Follow the existing test structure
- Use React Testing Library for component tests
- Use MSW (Mock Service Worker) for API mocking

**Test file naming:**
- Component tests: `ComponentName.test.tsx`
- Utility tests: `utility-name.test.ts`
- API tests: `route.test.ts`

### Test Best Practices

- Test user behavior, not implementation details
- Use `screen.getByRole` over `getByTestId`
- Clean up after tests (timers, mocks, etc.)
- Keep tests isolated and independent

See [README-testing.md](./README-testing.md) for comprehensive testing documentation.

## Pull Request Process

### Before Submitting

1. **Ensure all tests pass:**
   ```bash
   npm test
   ```

2. **Verify the build succeeds:**
   ```bash
   npm run build
   ```

3. **Run the linter:**
   ```bash
   npm run lint
   ```

4. **Update documentation** if you've changed:
   - APIs
   - Configuration
   - Component interfaces
   - User-facing features

### Creating a Pull Request

1. **Push your branch:**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request** on GitHub with:
   - Clear title describing the change
   - Description of what changed and why
   - Screenshots for UI changes
   - Link to related issues

3. **PR Template Structure:**
   ```markdown
   ## Summary
   Brief description of changes

   ## Changes Made
   - List of specific changes
   - Another change

   ## Testing
   - [ ] All existing tests pass
   - [ ] New tests added for new functionality
   - [ ] Manual testing completed

   ## Screenshots (if applicable)
   [Add screenshots here]

   ## Related Issues
   Closes #123
   ```

### PR Review Process

- Wait for automated checks to pass
- Address reviewer feedback promptly
- Keep the PR focused on a single concern
- Squash commits if requested
- Ensure the PR is up to date with main before merging

### Merge Requirements

- ✅ All CI checks passing
- ✅ At least one approval from a maintainer
- ✅ No merge conflicts
- ✅ Tests passing with adequate coverage
- ✅ Documentation updated (if needed)

## Commit Message Guidelines

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, no logic change)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks
- `perf` - Performance improvements

### Examples

```
feat(receipt): add support for HEIC image format

Added HEIC image processing support for receipt scanning
to improve compatibility with iOS devices.

Closes #145
```

```
fix(calculation): correct rounding error in tip calculation

Fixed penny rounding issue when distributing tips across
multiple people by implementing banker's rounding.

Fixes #234
```

```
docs(readme): update installation instructions

Added detailed Redis setup instructions and
troubleshooting section for common issues.
```

### Commit Best Practices

- Write clear, descriptive commit messages
- Keep the subject line under 50 characters
- Use imperative mood ("add" not "added")
- Capitalize the subject line
- Don't end the subject with a period
- Reference issues/PRs in the footer

## Additional Resources

- [README.md](./README.md) - Project overview and setup
- [README.simple.md](./README.simple.md) - Quick start guide
- [README-testing.md](./README-testing.md) - Testing documentation
- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) - Deployment and architecture
- [ANALYTICS.md](./ANALYTICS.md) - Analytics implementation

## Questions or Issues?

- Open an issue on GitHub
- Check existing issues for similar questions
- Review documentation before asking

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Welcome newcomers and help them learn

Thank you for contributing to SplitSimple!

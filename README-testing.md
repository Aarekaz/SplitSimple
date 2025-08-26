# Testing Guide for SplitSimple

This document provides comprehensive information about the testing infrastructure for SplitSimple.

## 🧪 Testing Stack

- **Jest**: JavaScript testing framework
- **React Testing Library**: Testing utilities for React components
- **MSW (Mock Service Worker)**: API mocking for tests
- **ts-jest**: TypeScript support for Jest

## 📁 Test Structure

```
├── jest.config.ts              # Jest configuration
├── jest.setup.ts               # Test setup and global mocks
├── tests/
│   ├── utils/
│   │   └── test-utils.tsx      # Custom render function and utilities
│   └── mocks/
│       ├── handlers.ts         # MSW request handlers
│       └── server.ts           # MSW server setup
├── lib/__tests__/              # Unit tests for business logic
├── components/__tests__/       # Component tests
├── contexts/__tests__/         # Context/state management tests
└── app/api/__tests__/          # API route tests
```

## 🚀 Running Tests

### Basic Commands

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run tests for CI (no watch, with coverage)
pnpm test:ci

# Run tests silently (less output)
pnpm test:silent

# Run tests with verbose output
pnpm test:verbose
```

### Running Specific Tests

```bash
# Run tests in a specific file
pnpm test calculations.test.ts

# Run tests matching a pattern
pnpm test --testNamePattern="validation"

# Run tests in a specific directory
pnpm test lib/

# Run only changed tests
pnpm test --onlyChanged
```

## 📊 Coverage Reports

Coverage reports are generated in the `coverage/` directory:

- `coverage/lcov-report/index.html` - HTML coverage report
- `coverage/lcov.info` - LCOV format for CI tools

### Coverage Thresholds

The project maintains the following minimum coverage thresholds:

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## 🔧 Writing Tests

### Unit Tests (Business Logic)

```typescript
// lib/__tests__/calculations.test.ts
import { evaluatePrice, calculateItemSplits } from '../calculations'
import { createMockItem, createMockPerson, expectCurrencyToBe } from '../../tests/utils/test-utils'

describe('calculations', () => {
  it('should evaluate price expressions correctly', () => {
    expect(evaluatePrice('10 + 5')).toBe(15)
    expect(evaluatePrice('20 / 2')).toBe(10)
  })

  it('should split items evenly without penny problems', () => {
    const person1 = createMockPerson({ id: '1' })
    const person2 = createMockPerson({ id: '2' })
    const item = createMockItem({
      price: '10.01',
      splitWith: ['1', '2'],
      method: 'even'
    })

    const splits = calculateItemSplits(item, [person1, person2])
    
    expectCurrencyToBe(splits['1'], 5.00)
    expectCurrencyToBe(splits['2'], 5.01) // Last person gets remainder
  })
})
```

### Component Tests

```typescript
// components/__tests__/TotalsPanel.test.tsx
import { render, screen, fireEvent } from '../../tests/utils/test-utils'
import { TotalsPanel } from '../TotalsPanel'

describe('TotalsPanel', () => {
  it('should render people list', () => {
    render(<TotalsPanel {...props} />)
    
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('should handle person removal with confirmation', () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
    
    render(<TotalsPanel {...props} />)
    fireEvent.click(screen.getByLabelText('Remove Alice'))
    
    expect(confirmSpy).toHaveBeenCalled()
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'REMOVE_PERSON',
      payload: 'alice-id'
    })
  })
})
```

### API Tests

```typescript
// app/api/bills/__tests__/route.test.ts
import { GET, POST } from '../[id]/route'
import { createMockBill } from '../../../../tests/utils/test-utils'

describe('/api/bills/[id]', () => {
  it('should retrieve bill successfully', async () => {
    const testBill = createMockBill()
    mockRedisClient.get.mockResolvedValue(JSON.stringify(testBill))

    const request = new NextRequest('http://localhost:3000/api/bills/test-id')
    const response = await GET(request, { params: Promise.resolve({ id: 'test-id' }) })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.bill).toEqual(testBill)
  })
})
```

## 🛠️ Test Utilities

### Custom Render Function

Use the custom render function that includes all providers:

```typescript
import { render, screen } from '../../tests/utils/test-utils' // Custom render with providers
```

### Mock Data Factories

```typescript
import { 
  createMockBill, 
  createMockPerson, 
  createMockItem,
  createBillWithPeopleAndItems 
} from '../../tests/utils/test-utils'

const testBill = createMockBill({
  title: 'Test Bill',
  people: [createMockPerson({ name: 'Alice' })],
  items: [createMockItem({ name: 'Pizza', price: '20.00' })]
})
```

### Custom Matchers

```typescript
import { expectCurrencyToBe } from '../../tests/utils/test-utils'

// For floating-point currency comparisons
expectCurrencyToBe(actualAmount, expectedAmount)
```

## 🔍 Mocking

### API Mocking with MSW

API calls are automatically mocked using MSW. Mock responses are defined in `tests/mocks/handlers.ts`:

```typescript
// Override mock response for specific test
import { mockBillUtils } from '../../tests/mocks/handlers'

beforeEach(() => {
  mockBillUtils.clear()
  mockBillUtils.set('test-bill-id', testBill)
})
```

### Component Mocking

```typescript
// Mock external dependencies
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

jest.mock('@/contexts/BillContext', () => ({
  useBill: () => mockBillState,
}))
```

## 🚦 CI/CD Integration

Tests run automatically on:

- **Push** to `main` and `develop` branches
- **Pull requests** to `main` and `develop`

The CI pipeline includes:

1. **Linting** with ESLint
2. **Type checking** with TypeScript
3. **Unit tests** with coverage reporting
4. **Integration tests** with Redis service
5. **Security scanning** with Snyk
6. **Coverage reporting** to Codecov

## 📝 Best Practices

### Writing Good Tests

1. **Follow AAA Pattern**: Arrange, Act, Assert
2. **Test behavior, not implementation**
3. **Use descriptive test names**
4. **Keep tests isolated and independent**
5. **Mock external dependencies**

### Coverage Guidelines

1. **Focus on critical business logic** (calculations, validations)
2. **Test error conditions and edge cases**
3. **Don't test implementation details**
4. **Aim for meaningful coverage, not just high numbers**

### Performance

1. **Use `screen.getByRole()` over `getByTestId()`**
2. **Prefer user-centric queries** (`getByText`, `getByLabelText`)
3. **Clean up mocks in `afterEach()`**
4. **Use `act()` for state updates in tests**

## 🐛 Debugging Tests

### Running Tests in Debug Mode

```bash
# Run tests with Node.js debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# Run specific test file in debug mode
pnpm test --runInBand --no-coverage calculations.test.ts
```

### VS Code Integration

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-coverage"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW Documentation](https://mswjs.io/docs/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 🤝 Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure all existing tests pass
3. Add tests for new functionality
4. Maintain or improve coverage percentage
5. Update this documentation if needed

## ⚠️ Common Issues

### Issue: Tests timeout
**Solution**: Increase timeout in jest.config.ts or use `jest.setTimeout(10000)` in specific tests

### Issue: Mock not working
**Solution**: Ensure mocks are defined before imports and cleared in `afterEach()`

### Issue: Component not rendering
**Solution**: Check if all required props are provided and providers are wrapped correctly

### Issue: API tests failing
**Solution**: Verify MSW handlers are set up correctly and Redis mock is configured
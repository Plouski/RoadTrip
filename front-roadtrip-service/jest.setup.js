// jest.setup.js
require('whatwg-fetch');
require('@testing-library/jest-dom');

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    set: jest.fn(),
  }),
  usePathname: () => '/test-path',
  useParams: () => ({}),
}));

// Mock environment variables
process.env.NEXT_PUBLIC_DB_SERVICE_URL = 'http://localhost:5002';
process.env.NEXT_PUBLIC_AI_SERVICE_URL = 'http://localhost:5003';
process.env.NEXT_PUBLIC_PAYMENT_SERVICE_URL = 'http://localhost:5004';

// Setup fetch mock
global.fetch = jest.fn();

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
  if (global.fetch) {
    global.fetch.mockClear();
  }
});
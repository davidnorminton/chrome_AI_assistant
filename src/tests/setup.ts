import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// Mock Chrome API
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn(),
    },
    sync: {
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
  runtime: {
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    sendMessage: vi.fn(),
  },
} as any;

// Mock fetch
global.fetch = vi.fn();

// Mock performance API
global.performance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000,
  },
} as any;

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock FileReader
const MockFileReader = vi.fn().mockImplementation(() => ({
  readAsDataURL: vi.fn(),
  readAsText: vi.fn(),
  result: null,
  onload: null,
  onerror: null,
}));

// Add static properties to the constructor
(MockFileReader as any).EMPTY = 0;
(MockFileReader as any).LOADING = 1;
(MockFileReader as any).DONE = 2;

global.FileReader = MockFileReader as any;

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');

// Mock URL.revokeObjectURL
global.URL.revokeObjectURL = vi.fn();

// Setup test environment
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
  
  // Reset Chrome API mocks
  (chrome.storage.local.get as any).mockResolvedValue({});
  (chrome.storage.local.set as any).mockResolvedValue(undefined);
  (chrome.tabs.query as any).mockResolvedValue([]);
  (chrome.tabs.sendMessage as any).mockResolvedValue(undefined);
  
  // Reset fetch mock
  (fetch as any).mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({}),
  });
});

// Helper function to mock successful API response
export const mockSuccessfulAPIResponse = (data: any) => {
  (fetch as any).mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue(data),
  });
};

// Helper function to mock failed API response
export const mockFailedAPIResponse = (status: number, message: string) => {
  (fetch as any).mockResolvedValue({
    ok: false,
    status,
    statusText: message,
    json: vi.fn().mockResolvedValue({ error: { message } }),
  });
};

// Helper function to mock Chrome storage
export const mockChromeStorage = (data: any) => {
  (chrome.storage.local.get as any).mockResolvedValue(data);
};

// Helper function to create mock file
export const createMockFile = (name: string, type: string, content: string): File => {
  const file = new File([content], name, { type });
  return file;
};

// Helper function to create mock image file
export const createMockImageFile = (name: string = 'test-image.png'): File => {
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 100, 100);
  }
  
  return new Promise<File>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], name, { type: 'image/png' });
        resolve(file);
      }
    });
  }) as any;
}; 
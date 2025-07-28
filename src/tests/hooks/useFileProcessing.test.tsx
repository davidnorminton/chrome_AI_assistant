import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileProcessing } from '../../hooks/useFileProcessing';

describe('useFileProcessing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useFileProcessing());

    expect(result.current.fileData).toBe(null);
    expect(result.current.fileName).toBe(null);
    expect(result.current.fileType).toBe(null);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.processingFileName).toBe(null);
    expect(result.current.processingFileType).toBe(null);
  });

  it('should set file data correctly', () => {
    const { result } = renderHook(() => useFileProcessing());

    act(() => {
      result.current.setFileData('test data');
    });

    expect(result.current.fileData).toBe('test data');
  });

  it('should set file name correctly', () => {
    const { result } = renderHook(() => useFileProcessing());

    act(() => {
      result.current.setFileName('test.txt');
    });

    expect(result.current.fileName).toBe('test.txt');
  });

  it('should set file type correctly', () => {
    const { result } = renderHook(() => useFileProcessing());

    act(() => {
      result.current.setFileType('text/plain');
    });

    expect(result.current.fileType).toBe('text/plain');
  });

  it('should set processing state correctly', () => {
    const { result } = renderHook(() => useFileProcessing());

    act(() => {
      result.current.setIsProcessing(true);
    });

    expect(result.current.isProcessing).toBe(true);
  });

  it('should clear file state correctly', () => {
    const { result } = renderHook(() => useFileProcessing());

    // Set some state first
    act(() => {
      result.current.setFileData('test data');
      result.current.setFileName('test.txt');
      result.current.setFileType('text/plain');
      result.current.setIsProcessing(true);
      result.current.setProcessingFileName('processing.txt');
      result.current.setProcessingFileType('text/plain');
    });

    // Clear the state
    act(() => {
      result.current.clearFileState();
    });

    expect(result.current.fileData).toBe(null);
    expect(result.current.fileName).toBe(null);
    expect(result.current.fileType).toBe(null);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.processingFileName).toBe(null);
    expect(result.current.processingFileType).toBe(null);
  });

  it('should identify image files correctly', () => {
    const { result } = renderHook(() => useFileProcessing());

    const imageFile = new File([''], 'test.png', { type: 'image/png' });
    const textFile = new File([''], 'test.txt', { type: 'text/plain' });

    expect(result.current.isImageFile(imageFile)).toBe(true);
    expect(result.current.isImageFile(textFile)).toBe(false);
  });

  it('should validate file types correctly', () => {
    const { result } = renderHook(() => useFileProcessing());

    const validFiles = [
      new File([''], 'test.png', { type: 'image/png' }),
      new File([''], 'test.pdf', { type: 'application/pdf' }),
      new File([''], 'test.txt', { type: 'text/plain' }),
      new File([''], 'test.json', { type: 'application/json' }),
      new File([''], 'test.csv', { type: 'text/csv' }),
      new File([''], 'test.md', { type: 'text/markdown' }),
    ];

    const invalidFiles = [
      new File([''], 'test.exe', { type: 'application/x-executable' }),
      new File([''], 'test.zip', { type: 'application/zip' }),
    ];

    validFiles.forEach(file => {
      expect(result.current.isValidFileType(file)).toBe(true);
    });

    invalidFiles.forEach(file => {
      expect(result.current.isValidFileType(file)).toBe(false);
    });
  });

  it('should process text files correctly', async () => {
    const { result } = renderHook(() => useFileProcessing());

    const textFile = new File(['Hello, World!'], 'test.txt', { type: 'text/plain' });

    await act(async () => {
      const processed = await result.current.processFile(textFile);
      expect(processed).toEqual({
        fileData: 'Hello, World!',
        fileName: 'test.txt',
        fileType: 'text/plain',
      });
    });

    expect(result.current.fileData).toBe('Hello, World!');
    expect(result.current.fileName).toBe('test.txt');
    expect(result.current.fileType).toBe('text/plain');
    expect(result.current.isProcessing).toBe(false);
  });

  it('should process image files correctly', async () => {
    const { result } = renderHook(() => useFileProcessing());

    // Create a mock image file with base64 data
    const imageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const imageFile = new File([imageData], 'test.png', { type: 'image/png' });

    // Mock FileReader
    const mockFileReader = {
      readAsDataURL: vi.fn(),
      result: imageData,
      onload: null as any,
    };

    (global.FileReader as any).mockImplementation(() => mockFileReader);

    await act(async () => {
      const processed = await result.current.processFile(imageFile);
      expect(processed).toEqual({
        fileData: imageData,
        fileName: 'test.png',
        fileType: 'image/png',
      });
    });

    expect(result.current.fileData).toBe(imageData);
    expect(result.current.fileName).toBe('test.png');
    expect(result.current.fileType).toBe('image/png');
    expect(result.current.isProcessing).toBe(false);
  });

  it('should handle file processing errors', async () => {
    const { result } = renderHook(() => useFileProcessing());

    const invalidFile = new File([''], 'test.txt', { type: 'text/plain' });

    // Mock FileReader to throw error
    const mockFileReader = {
      readAsDataURL: vi.fn(),
      readAsText: vi.fn().mockImplementation(() => {
        throw new Error('File read error');
      }),
      result: null,
      onload: null as any,
      onerror: null as any,
    };

    (global.FileReader as any).mockImplementation(() => mockFileReader);

    await act(async () => {
      await expect(result.current.processFile(invalidFile)).rejects.toThrow('Failed to process file: File read error');
    });

    expect(result.current.isProcessing).toBe(false);
    expect(result.current.processingFileName).toBe(null);
    expect(result.current.processingFileType).toBe(null);
  });

  it('should handle processing state during file processing', async () => {
    const { result } = renderHook(() => useFileProcessing());

    const textFile = new File(['Hello, World!'], 'test.txt', { type: 'text/plain' });

    // Start processing
    const processPromise = act(async () => {
      return result.current.processFile(textFile);
    });

    // Check that processing state is set during processing
    expect(result.current.isProcessing).toBe(true);
    expect(result.current.processingFileName).toBe('test.txt');
    expect(result.current.processingFileType).toBe('text/plain');

    // Wait for processing to complete
    await processPromise;

    // Check that processing state is cleared after completion
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.processingFileName).toBe(null);
    expect(result.current.processingFileType).toBe(null);
  });

  it('should handle different file types correctly', async () => {
    const { result } = renderHook(() => useFileProcessing());

    const files = [
      { file: new File(['{"key": "value"}'], 'test.json', { type: 'application/json' }), expectedType: 'application/json' },
      { file: new File(['<xml>test</xml>'], 'test.xml', { type: 'application/xml' }), expectedType: 'application/xml' },
      { file: new File(['name,value\ntest,123'], 'test.csv', { type: 'text/csv' }), expectedType: 'text/csv' },
      { file: new File(['# Markdown\nTest content'], 'test.md', { type: 'text/markdown' }), expectedType: 'text/markdown' },
    ];

    for (const { file, expectedType } of files) {
      await act(async () => {
        const processed = await result.current.processFile(file);
        expect(processed.fileType).toBe(expectedType);
        expect(processed.fileName).toBe(file.name);
      });
    }
  });
}); 
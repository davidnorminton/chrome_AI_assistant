import { useState, useCallback } from 'react';
import type { FileProcessingInfo } from '../types';

// Helper function to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to convert file to base64'));
    reader.readAsDataURL(file);
  });
};

interface FileProcessingState {
  fileData: string | null;
  fileName: string | null;
  fileType: string | null;
  isProcessing: boolean;
  processingFileName: string | null;
  processingFileType: string | null;
}

export function useFileProcessing() {
  const [state, setState] = useState<FileProcessingState>({
    fileData: null,
    fileName: null,
    fileType: null,
    isProcessing: false,
    processingFileName: null,
    processingFileType: null,
  });

  const setFileData = useCallback((fileData: string | null) => {
    setState(prev => ({ ...prev, fileData }));
  }, []);

  const setFileName = useCallback((fileName: string | null) => {
    setState(prev => ({ ...prev, fileName }));
  }, []);

  const setFileType = useCallback((fileType: string | null) => {
    setState(prev => ({ ...prev, fileType }));
  }, []);

  const setIsProcessing = useCallback((isProcessing: boolean) => {
    setState(prev => ({ ...prev, isProcessing }));
  }, []);

  const setProcessingFileName = useCallback((processingFileName: string | null) => {
    setState(prev => ({ ...prev, processingFileName }));
  }, []);

  const setProcessingFileType = useCallback((processingFileType: string | null) => {
    setState(prev => ({ ...prev, processingFileType }));
  }, []);

  const clearFileState = useCallback(() => {
    setState({
      fileData: null,
      fileName: null,
      fileType: null,
      isProcessing: false,
      processingFileName: null,
      processingFileType: null,
    });
  }, []);

  // Process uploaded file
  const processFile = useCallback(async (file: File): Promise<{ fileData: string; fileName: string; fileType: string }> => {
    setIsProcessing(true);
    setProcessingFileName(file.name);
    setProcessingFileType(file.type);

    try {
      if (file.type.startsWith('image/')) {
        // Process image files
        const fileData = await fileToBase64(file);
        
        setFileData(fileData);
        setFileName(file.name);
        setFileType(file.type);
        
        return { fileData, fileName: file.name, fileType: file.type };
      } else {
        // Process text files
        const text = await file.text();
        setFileData(text);
        setFileName(file.name);
        setFileType(file.type);
        
        return { fileData: text, fileName: file.name, fileType: file.type };
      }
    } catch (error) {
      console.error('Error processing file:', error);
      throw new Error(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      setProcessingFileName(null);
      setProcessingFileType(null);
    }
  }, []);

  // Check if file is an image
  const isImageFile = useCallback((file: File): boolean => {
    return file.type.startsWith('image/');
  }, []);

  // Check if file is a valid type
  const isValidFileType = useCallback((file: File): boolean => {
    const validTypes = [
      'image/',
      'application/pdf',
      'text/',
      'application/json',
      'application/xml',
      'text/csv',
      'text/markdown',
      'text/yaml',
      'application/yaml',
    ];
    
    return validTypes.some(type => file.type.startsWith(type));
  }, []);

  return {
    // State
    ...state,
    
    // Setters
    setFileData,
    setFileName,
    setFileType,
    setIsProcessing,
    setProcessingFileName,
    setProcessingFileType,
    clearFileState,
    
    // Actions
    processFile,
    isImageFile,
    isValidFileType,
  };
} 
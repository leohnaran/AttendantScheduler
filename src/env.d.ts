/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    loadData: () => Promise<{ success: boolean; data?: any; error?: string }>;
    saveData: (data: any) => Promise<{ success: boolean; error?: string }>;
  };
}

declare module "*.js" {
  const content: any;
  export default content;
}

declare module "*.jsx" {
  const content: any;
  export default content;
}

declare module "*.json" {
  const value: any;
  export default value;
}

// Ensure specific third-party modules without types are covered
declare module '@dnd-kit/core';
declare module '@dnd-kit/sortable';
declare module '@dnd-kit/utilities';
declare module 'react-hot-toast';
declare module 'localforage';
declare module 'html-to-image';
declare module 'crypto-js';
declare module 'exceljs';
declare module 'file-saver';

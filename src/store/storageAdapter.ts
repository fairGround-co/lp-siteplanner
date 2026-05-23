/**
 * Modular Storage Architecture
 * 
 * This file defines the plug-in architecture for persisting application state.
 * Currently it implements a LocalStorage wrapper, but this abstraction allows
 * swapping in IndexedDB, File System access, or Cloud sync in the future
 * without modifying the core Zustand store.
 */

export interface AppStorageAdapter {
  getItem: (name: string) => string | null | Promise<string | null>;
  setItem: (name: string, value: string) => void | Promise<void>;
  removeItem: (name: string) => void | Promise<void>;
}

export function createLocalStorageAdapter(): AppStorageAdapter {
  return {
    getItem: (name: string) => {
      try {
        return localStorage.getItem(name);
      } catch (e) {
        console.warn('Failed to read from localStorage', e);
        return null;
      }
    },
    setItem: (name: string, value: string) => {
      try {
        localStorage.setItem(name, value);
      } catch (e) {
        console.warn('Failed to write to localStorage', e);
      }
    },
    removeItem: (name: string) => {
      try {
        localStorage.removeItem(name);
      } catch (e) {
        console.warn('Failed to remove from localStorage', e);
      }
    }
  };
}

// TODO: Future modular adapters can be exported here
// export function createIndexedDBAdapter(): AppStorageAdapter { ... }
// export function createFileApiAdapter(): AppStorageAdapter { ... }

// The currently active storage plugin for the application
export const activeStorageAdapter = createLocalStorageAdapter();

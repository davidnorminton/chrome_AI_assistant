import type { HistoryItem } from "../types";

const STORAGE_KEY = "extensionHistory";

export async function getHistory(): Promise<HistoryItem[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (data) => {
      resolve(data[STORAGE_KEY] ?? []);
    });
  });
}

export async function addHistory(entry: Omit<HistoryItem, "id" | "timestamp">): Promise<void> {
  const existing = await getHistory();
  const newItem: HistoryItem = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  const updated = [newItem, ...existing];
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: updated }, () => resolve());
  });
}

export async function removeHistory(id: string): Promise<void> {
  const existing = await getHistory();
  const updated = existing.filter((item) => item.id !== id);
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: updated }, () => resolve());
  });
}
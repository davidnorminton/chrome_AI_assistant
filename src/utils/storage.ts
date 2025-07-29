import type { HistoryItem } from "../types";
import { saveHistoryItem, getHistory as getHistoryFromService, deleteHistoryItem } from "../services/storage";

const STORAGE_KEY = "extensionHistory";

export async function getHistory(): Promise<HistoryItem[]> {
  return await getHistoryFromService();
}

export async function addHistory(entry: Omit<HistoryItem, "id" | "timestamp">): Promise<void> {
  console.log('addHistory called with entry:', entry);
  
  const newItem: HistoryItem = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  
  console.log('Created history item:', newItem);
  await saveHistoryItem(newItem);
}

export async function removeHistory(id: string): Promise<void> {
  await deleteHistoryItem(id);
}
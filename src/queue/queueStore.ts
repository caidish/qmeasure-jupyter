/**
 * Queue store for managing sweep queue state
 * Singleton pattern with observer support for React components
 */

import React, { useEffect, useState } from "react";
import { QueueEntry, QueueState } from "../types/queue";

/**
 * Type for store listeners
 */
type Listener = (state: QueueState) => void;

/**
 * Queue store class - singleton pattern
 */
class QueueStore {
  private state: QueueState = {
    entries: [],
    selectedId: undefined,
  };

  private listeners: Set<Listener> = new Set();

  /**
   * Get current state
   */
  getState(): QueueState {
    return this.state;
  }

  /**
   * Subscribe to state changes
   * @param listener - Callback function to be called on state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notify(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }

  /**
   * Add or replace a queue entry
   * @param entry - Queue entry to add or replace
   */
  addOrReplace(entry: QueueEntry): void {
    const existingIndex = this.state.entries.findIndex(
      (e) => e.id === entry.id,
    );

    const now = Date.now();

    if (existingIndex >= 0) {
      // Replace existing entry - preserve createdAt, update modifiedAt
      const existingEntry = this.state.entries[existingIndex];
      this.state = {
        ...this.state,
        entries: [
          ...this.state.entries.slice(0, existingIndex),
          {
            ...entry,
            createdAt: existingEntry.createdAt, // Preserve original creation time
            modifiedAt: now, // Always update modification time
          },
          ...this.state.entries.slice(existingIndex + 1),
        ],
      };
    } else {
      // Add new entry - set both timestamps
      this.state = {
        ...this.state,
        entries: [
          ...this.state.entries,
          {
            ...entry,
            createdAt: entry.createdAt || now, // Use provided or current time
            modifiedAt: now, // Always set modification time
          },
        ],
      };
    }

    this.notify();
  }

  /**
   * Remove a queue entry by ID
   * @param id - ID of entry to remove
   */
  remove(id: string): void {
    this.state = {
      ...this.state,
      entries: this.state.entries.filter((e) => e.id !== id),
      // Clear selection if removed entry was selected
      selectedId:
        this.state.selectedId === id ? undefined : this.state.selectedId,
    };
    this.notify();
  }

  /**
   * Move a queue entry from one position to another
   * @param fromIndex - Source index
   * @param toIndex - Destination index
   */
  move(fromIndex: number, toIndex: number): void {
    // Validate fromIndex
    if (fromIndex < 0 || fromIndex >= this.state.entries.length) {
      return;
    }

    // Allow toIndex === entries.length (drop at end)
    // This is common in drag-and-drop libraries
    if (toIndex < 0 || toIndex > this.state.entries.length) {
      return;
    }

    // No-op if moving to same position
    if (fromIndex === toIndex) {
      return;
    }

    const entries = [...this.state.entries];
    const [movedEntry] = entries.splice(fromIndex, 1);

    // Adjust toIndex if dropping at the end
    const insertIndex = toIndex >= entries.length ? entries.length : toIndex;
    entries.splice(insertIndex, 0, movedEntry);

    this.state = {
      ...this.state,
      entries,
    };
    this.notify();
  }

  /**
   * Clear all queue entries
   */
  clear(): void {
    this.state = {
      entries: [],
      selectedId: undefined,
    };
    this.notify();
  }

  /**
   * Select a queue entry by ID
   * @param id - ID of entry to select (undefined to clear selection)
   */
  select(id?: string): void {
    this.state = {
      ...this.state,
      selectedId: id,
    };
    this.notify();
  }

  /**
   * Get entry by ID
   * @param id - Entry ID
   * @returns Queue entry or undefined
   */
  getEntry(id: string): QueueEntry | undefined {
    return this.state.entries.find((e) => e.id === id);
  }

  /**
   * Get all entries
   * @returns Array of queue entries
   */
  getEntries(): QueueEntry[] {
    return this.state.entries;
  }

  /**
   * Get selected entry
   * @returns Selected queue entry or undefined
   */
  getSelectedEntry(): QueueEntry | undefined {
    if (!this.state.selectedId) return undefined;
    return this.getEntry(this.state.selectedId);
  }
}

/**
 * Singleton instance
 */
const queueStore = new QueueStore();

/**
 * React hook for using queue store in components
 */
export function useQueueStore(): {
  state: QueueState;
  addOrReplace: (entry: QueueEntry) => void;
  remove: (id: string) => void;
  move: (fromIndex: number, toIndex: number) => void;
  clear: () => void;
  select: (id?: string) => void;
  getEntry: (id: string) => QueueEntry | undefined;
  getEntries: () => QueueEntry[];
  getSelectedEntry: () => QueueEntry | undefined;
} {
  const [state, setState] = React.useState<QueueState>(queueStore.getState());

  React.useEffect(() => {
    const unsubscribe = queueStore.subscribe(setState);
    return unsubscribe;
  }, []);

  return {
    state,
    addOrReplace: queueStore.addOrReplace.bind(queueStore),
    remove: queueStore.remove.bind(queueStore),
    move: queueStore.move.bind(queueStore),
    clear: queueStore.clear.bind(queueStore),
    select: queueStore.select.bind(queueStore),
    getEntry: queueStore.getEntry.bind(queueStore),
    getEntries: queueStore.getEntries.bind(queueStore),
    getSelectedEntry: queueStore.getSelectedEntry.bind(queueStore),
  };
}

/**
 * Get store instance for non-React usage
 */
export function getQueueStore(): QueueStore {
  return queueStore;
}

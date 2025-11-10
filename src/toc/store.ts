/**
 * Module-level store for sweep details accessible to the enhancer
 */

import { ParsedSweep } from './parser';

/**
 * Global store of sweep details indexed by {notebook path, cell index, sweep name}
 */
class SweepDetailsStore {
  // Nested map: notebookPath -> cellIndex -> sweepName -> ParsedSweep
  private details = new Map<string, Map<number, Map<string, ParsedSweep>>>();

  /**
   * Store sweep details with unique triple key
   */
  set(notebookPath: string, cellIndex: number, sweepName: string, sweep: ParsedSweep): void {
    let notebookMap = this.details.get(notebookPath);
    if (!notebookMap) {
      notebookMap = new Map();
      this.details.set(notebookPath, notebookMap);
    }

    let cellMap = notebookMap.get(cellIndex);
    if (!cellMap) {
      cellMap = new Map();
      notebookMap.set(cellIndex, cellMap);
    }

    cellMap.set(sweepName, sweep);
  }

  /**
   * Retrieve sweep details by unique triple key
   */
  get(notebookPath: string, cellIndex: number, sweepName: string): ParsedSweep | undefined {
    return this.details.get(notebookPath)?.get(cellIndex)?.get(sweepName);
  }

  /**
   * Check if sweep exists
   */
  has(notebookPath: string, cellIndex: number, sweepName: string): boolean {
    return this.details.get(notebookPath)?.get(cellIndex)?.has(sweepName) ?? false;
  }

  /**
   * @deprecated Ambiguous lookup by name only - use get(path, cellIndex, name) instead
   * Only kept as fallback for items without cell index metadata
   */
  find(notebookPath: string, sweepName: string): ParsedSweep | undefined {
    console.warn('[Sweep Store] Ambiguous find() called - dataset missing cellIndex?', sweepName);
    const notebookMap = this.details.get(notebookPath);
    if (!notebookMap) return undefined;

    for (const cellMap of notebookMap.values()) {
      const sweep = cellMap.get(sweepName);
      if (sweep) {
        return sweep; // Return first match (may be wrong if name is reused!)
      }
    }
    return undefined;
  }

  /**
   * Clear all sweep details for a notebook
   */
  clearNotebook(notebookPath: string): void {
    this.details.delete(notebookPath);
  }

  /**
   * Clear all sweep details
   */
  clear(): void {
    this.details.clear();
  }
}

/**
 * Singleton instance
 */
export const sweepDetailsStore = new SweepDetailsStore();

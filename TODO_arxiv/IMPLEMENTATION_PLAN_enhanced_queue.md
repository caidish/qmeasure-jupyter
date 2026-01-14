# Enhanced Queue Implementation Plan

## Overview
This plan implements two major enhancements to the sweep queue system:
1. **Loop Blocks** - Wrap queue entries in for loops (repeat N times or iterate over values)
2. **Function/Callback Entries** - Insert arbitrary Python functions between sweeps

## Phase 1: Data Model & Type Definitions

### 1.1 Extend Queue Types
**File:** `src/types/queue.ts`
**Lines to modify:** 37-98 (entire file structure)

**Changes:**
```typescript
// Add to line ~8 after existing imports
export type QueueItemType = 'sweep' | 'function' | 'loop';

// Add new interface after DatabaseConfig (after line 32)
/**
 * Queue entry for custom Python function
 */
export interface QueueFunctionEntry {
  id: string;
  queueType: 'function';
  name: string;
  label: string;
  pythonCode: string;
  templateId?: string; // e.g., 'pause', 'flush_db'
  createdAt: number;
  modifiedAt: number;
  icon?: string;
}

/**
 * Queue entry for loop blocks
 */
export interface QueueLoopEntry {
  id: string;
  queueType: 'loop';
  name: string;
  label: string;
  loopKind: 'repeat' | 'values';
  count?: number; // for repeat loops
  values?: string[]; // for value-based loops (Python expressions)
  loopVarName?: string; // variable name for values loop (e.g., 'setpoint')
  body: QueueItem[]; // nested entries
  createdAt: number;
  modifiedAt: number;
  icon?: string;
}

// Update QueueEntry interface (line 37)
export interface QueueSweepEntry {
  id: string;
  queueType: 'sweep';
  name: string;
  sweepType: 'sweep0d' | 'sweep1d' | 'sweep2d' | 'simulsweep' | 'sweepto' | 'gateleakage';
  code: SweepCode;
  params: any;
  database?: DatabaseConfig;
  createdAt: number;
  modifiedAt: number;
  icon?: string;
}

// Create union type for all queue items
export type QueueItem = QueueSweepEntry | QueueFunctionEntry | QueueLoopEntry;

// Keep old QueueEntry as alias for backward compatibility
export type QueueEntry = QueueSweepEntry;

// Update QueueState (line 88)
export interface QueueState {
  entries: QueueItem[]; // Changed from QueueEntry[]
  selectedId?: string;
  selectedPath?: string[]; // For nested selection (e.g., ['loopId', 'entryId'])
}

/**
 * Helper type guards
 */
export function isSweepEntry(item: QueueItem): item is QueueSweepEntry {
  return item.queueType === 'sweep';
}

export function isFunctionEntry(item: QueueItem): item is QueueFunctionEntry {
  return item.queueType === 'function';
}

export function isLoopEntry(item: QueueItem): item is QueueLoopEntry {
  return item.queueType === 'loop';
}
```

**Testing:**
- [ ] TypeScript compilation succeeds
- [ ] Import and use type guards in test file
- [ ] Verify backward compatibility with existing QueueEntry usage

---

## Phase 2: Queue Store Updates

### 2.1 Extend Queue Store with Loop/Function Support
**File:** `src/queue/queueStore.ts`
**Lines to modify:** Throughout (add new methods, update existing)

**Changes:**

```typescript
// Update imports (line 7)
import { QueueItem, QueueSweepEntry, QueueFunctionEntry, QueueLoopEntry, QueueState, isSweepEntry, isLoopEntry } from "../types/queue";

// Add new methods to QueueStore class after move() method (after line 144)

/**
 * Add a loop entry to the queue
 * @param loopEntry - Loop entry to add
 */
addLoop(loopEntry: QueueLoopEntry): void {
  const now = Date.now();
  this.state = {
    ...this.state,
    entries: [
      ...this.state.entries,
      {
        ...loopEntry,
        createdAt: loopEntry.createdAt || now,
        modifiedAt: now,
      },
    ],
  };
  this.notify();
}

/**
 * Update a loop entry
 * @param id - Loop ID
 * @param patch - Partial update
 */
updateLoop(id: string, patch: Partial<QueueLoopEntry>): void {
  const index = this.state.entries.findIndex((e) => e.id === id);
  if (index === -1 || !isLoopEntry(this.state.entries[index])) return;

  const now = Date.now();
  this.state = {
    ...this.state,
    entries: [
      ...this.state.entries.slice(0, index),
      {
        ...this.state.entries[index],
        ...patch,
        modifiedAt: now,
      },
      ...this.state.entries.slice(index + 1),
    ],
  };
  this.notify();
}

/**
 * Add an entry to a loop's body
 * @param loopId - Loop ID
 * @param entry - Entry to add
 * @param position - Optional position (default: end)
 */
addToLoop(loopId: string, entry: QueueItem, position?: number): void {
  const index = this.state.entries.findIndex((e) => e.id === loopId);
  if (index === -1) return;

  const loopEntry = this.state.entries[index];
  if (!isLoopEntry(loopEntry)) return;

  const now = Date.now();
  const newBody = [...loopEntry.body];

  if (position !== undefined && position >= 0 && position <= newBody.length) {
    newBody.splice(position, 0, { ...entry, createdAt: entry.createdAt || now, modifiedAt: now });
  } else {
    newBody.push({ ...entry, createdAt: entry.createdAt || now, modifiedAt: now });
  }

  this.state = {
    ...this.state,
    entries: [
      ...this.state.entries.slice(0, index),
      {
        ...loopEntry,
        body: newBody,
        modifiedAt: now,
      },
      ...this.state.entries.slice(index + 1),
    ],
  };
  this.notify();
}

/**
 * Remove an entry from a loop's body
 * @param loopId - Loop ID
 * @param entryId - Entry ID to remove
 */
removeFromLoop(loopId: string, entryId: string): void {
  const index = this.state.entries.findIndex((e) => e.id === loopId);
  if (index === -1) return;

  const loopEntry = this.state.entries[index];
  if (!isLoopEntry(loopEntry)) return;

  const now = Date.now();
  this.state = {
    ...this.state,
    entries: [
      ...this.state.entries.slice(0, index),
      {
        ...loopEntry,
        body: loopEntry.body.filter((e) => e.id !== entryId),
        modifiedAt: now,
      },
      ...this.state.entries.slice(index + 1),
    ],
  };
  this.notify();
}

/**
 * Move an entry within a loop's body
 * @param loopId - Loop ID
 * @param fromIndex - Source index within loop body
 * @param toIndex - Destination index within loop body
 */
moveWithinLoop(loopId: string, fromIndex: number, toIndex: number): void {
  const index = this.state.entries.findIndex((e) => e.id === loopId);
  if (index === -1) return;

  const loopEntry = this.state.entries[index];
  if (!isLoopEntry(loopEntry)) return;

  const body = [...loopEntry.body];
  if (fromIndex < 0 || fromIndex >= body.length) return;
  if (toIndex < 0 || toIndex > body.length) return;
  if (fromIndex === toIndex) return;

  const [movedEntry] = body.splice(fromIndex, 1);
  const insertIndex = toIndex >= body.length ? body.length : toIndex;
  body.splice(insertIndex, 0, movedEntry);

  const now = Date.now();
  this.state = {
    ...this.state,
    entries: [
      ...this.state.entries.slice(0, index),
      {
        ...loopEntry,
        body,
        modifiedAt: now,
      },
      ...this.state.entries.slice(index + 1),
    ],
  };
  this.notify();
}

/**
 * Get item by path (supports nested access)
 * @param path - Array of IDs representing path to item
 * @returns Queue item or undefined
 */
getItemByPath(path: string[]): QueueItem | undefined {
  if (path.length === 0) return undefined;

  let current: QueueItem | undefined = this.state.entries.find(e => e.id === path[0]);

  for (let i = 1; i < path.length; i++) {
    if (!current || !isLoopEntry(current)) return undefined;
    current = current.body.find(e => e.id === path[i]);
  }

  return current;
}

/**
 * Flatten queue to list (depth-first traversal)
 * Useful for export and display
 */
flattenQueue(): Array<{ item: QueueItem; depth: number; parentPath: string[] }> {
  const result: Array<{ item: QueueItem; depth: number; parentPath: string[] }> = [];

  const traverse = (items: QueueItem[], depth: number, parentPath: string[]) => {
    items.forEach(item => {
      result.push({ item, depth, parentPath: [...parentPath] });
      if (isLoopEntry(item)) {
        traverse(item.body, depth + 1, [...parentPath, item.id]);
      }
    });
  };

  traverse(this.state.entries, 0, []);
  return result;
}
```

**Update useQueueStore hook** (line 204):
```typescript
export function useQueueStore(): {
  state: QueueState;
  addOrReplace: (entry: QueueSweepEntry) => void;
  remove: (id: string) => void;
  move: (fromIndex: number, toIndex: number) => void;
  clear: () => void;
  select: (id?: string) => void;
  getEntry: (id: string) => QueueSweepEntry | undefined;
  getEntries: () => QueueItem[];
  getSelectedEntry: () => QueueSweepEntry | undefined;
  // New methods
  addLoop: (loopEntry: QueueLoopEntry) => void;
  updateLoop: (id: string, patch: Partial<QueueLoopEntry>) => void;
  addToLoop: (loopId: string, entry: QueueItem, position?: number) => void;
  removeFromLoop: (loopId: string, entryId: string) => void;
  moveWithinLoop: (loopId: string, fromIndex: number, toIndex: number) => void;
  getItemByPath: (path: string[]) => QueueItem | undefined;
  flattenQueue: () => Array<{ item: QueueItem; depth: number; parentPath: string[] }>;
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
    addLoop: queueStore.addLoop.bind(queueStore),
    updateLoop: queueStore.updateLoop.bind(queueStore),
    addToLoop: queueStore.addToLoop.bind(queueStore),
    removeFromLoop: queueStore.removeFromLoop.bind(queueStore),
    moveWithinLoop: queueStore.moveWithinLoop.bind(queueStore),
    getItemByPath: queueStore.getItemByPath.bind(queueStore),
    flattenQueue: queueStore.flattenQueue.bind(queueStore),
  };
}
```

**Testing:**
- [ ] Unit test: addLoop() adds loop with empty body
- [ ] Unit test: addToLoop() adds entry to loop body
- [ ] Unit test: removeFromLoop() removes entry from loop body
- [ ] Unit test: moveWithinLoop() reorders entries within loop
- [ ] Unit test: getItemByPath() retrieves nested items
- [ ] Unit test: flattenQueue() produces correct depth-first list
- [ ] Integration test: Create loop, add sweep, verify state

---

## Phase 3: Export Logic with Loops & Functions

### 3.1 Update Export Module
**File:** `src/queue/export.ts`
**Lines to modify:** Entire file (major refactor)

**Create new file:** `src/queue/exportHelpers.ts`

**exportHelpers.ts content:**
```typescript
/**
 * Helper utilities for code export
 */

/**
 * Indent a block of code
 * @param code - Code string
 * @param level - Indentation level (0 = no indent)
 * @returns Indented code
 */
export function indentCode(code: string, level: number): string {
  if (level === 0) return code;

  const indent = "    ".repeat(level); // 4 spaces per level
  return code
    .split("\n")
    .map((line) => (line.trim() ? indent + line : line))
    .join("\n");
}

/**
 * Generate unique function name for queue functions
 * @param id - Entry ID
 * @returns Valid Python function name
 */
export function generateFunctionName(id: string): string {
  // Convert ID to valid Python identifier
  const sanitized = id.replace(/[^a-z0-9_]/gi, "_").toLowerCase();
  return `_func_${sanitized}`;
}

/**
 * Generate unique loop variable name
 * @param id - Loop ID
 * @param kind - Loop kind
 * @returns Valid Python variable name
 */
export function generateLoopVarName(id: string, kind: 'repeat' | 'values'): string {
  const sanitized = id.replace(/[^a-z0-9_]/gi, "_").toLowerCase();
  return kind === 'repeat' ? `i_${sanitized}` : `value_${sanitized}`;
}

/**
 * Escape Python string
 */
export function escapePythonString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

/**
 * Validate Python code syntax (basic check)
 * Returns null if valid, error message if invalid
 */
export function validatePythonSyntax(code: string): string | null {
  // Basic checks
  const lines = code.split("\n");

  // Check for unclosed strings
  let inString = false;
  let stringChar = "";
  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const prevChar = i > 0 ? line[i - 1] : "";

      if ((char === '"' || char === "'") && prevChar !== "\\") {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = "";
        }
      }
    }
  }

  if (inString) {
    return "Unclosed string literal";
  }

  // Check for basic indentation issues (very basic)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const leadingSpaces = line.match(/^( *)/)?.[1].length || 0;

    if (leadingSpaces % 4 !== 0) {
      return `Indentation error on line ${i + 1} (should be multiple of 4 spaces)`;
    }
  }

  return null;
}
```

**Update export.ts:**
```typescript
/**
 * Export queue entries to MeasureIt Python code (with loop and function support)
 */

import {
  QueueItem,
  QueueSweepEntry,
  QueueFunctionEntry,
  QueueLoopEntry,
  DatabaseConfig,
  isSweepEntry,
  isFunctionEntry,
  isLoopEntry,
} from "../types/queue";
import {
  indentCode,
  generateFunctionName,
  generateLoopVarName,
  escapePythonString,
} from "./exportHelpers";

// Keep existing generateDatabaseEntry function (lines 14-19)
// Keep existing generateVarName function (lines 27-35)

/**
 * Export context for tracking state during recursive export
 */
interface ExportContext {
  indentLevel: number;
  sweepVarNames: Map<string, string>; // id -> variable name
  functionNames: Map<string, string>; // id -> function name
  sweepCounter: number;
}

/**
 * Export a single queue item (recursive for loops)
 * @param item - Queue item to export
 * @param ctx - Export context
 * @returns Array of code sections
 */
function exportItem(item: QueueItem, ctx: ExportContext): string[] {
  if (isSweepEntry(item)) {
    return exportSweepEntry(item, ctx);
  } else if (isFunctionEntry(item)) {
    return exportFunctionEntry(item, ctx);
  } else if (isLoopEntry(item)) {
    return exportLoopEntry(item, ctx);
  }
  return [];
}

/**
 * Export a sweep entry
 */
function exportSweepEntry(entry: QueueSweepEntry, ctx: ExportContext): string[] {
  const sections: string[] = [];
  const varName = generateVarName(entry.name, ctx.sweepCounter++);
  ctx.sweepVarNames.set(entry.id, varName);

  // Setup code
  sections.push(`# ${entry.name} (${entry.sweepType})`);
  let setupCode = entry.code.setup;

  // Replace sweep variable name
  const sweepVarMatch = setupCode.match(/^(\w+)\s*=\s*Sweep/m);
  if (sweepVarMatch && sweepVarMatch[1]) {
    const originalVar = sweepVarMatch[1];
    setupCode = setupCode.replace(
      new RegExp(`\\b${originalVar}\\b`, "g"),
      varName,
    );
  }

  sections.push(indentCode(setupCode, ctx.indentLevel));
  sections.push("");

  // Queue append
  if (entry.database) {
    const dbEntry = generateDatabaseEntry(entry.database);
    sections.push(
      indentCode(`sq.append((${dbEntry}, ${varName}))`, ctx.indentLevel),
    );
  } else {
    sections.push(indentCode(`sq.append(${varName})`, ctx.indentLevel));
  }
  sections.push("");

  return sections;
}

/**
 * Export a function entry
 */
function exportFunctionEntry(entry: QueueFunctionEntry, ctx: ExportContext): string[] {
  const sections: string[] = [];
  const funcName = generateFunctionName(entry.id);
  ctx.functionNames.set(entry.id, funcName);

  // Function definition (at indent level 0, will be moved to top)
  sections.push(`# ${entry.name}`);
  sections.push(`def ${funcName}():`);

  // Indent user code
  const userCode = entry.pythonCode.trim();
  if (userCode) {
    sections.push(indentCode(userCode, 1)); // Always indent 1 level for function body
  } else {
    sections.push("    pass");
  }
  sections.push("");

  // Queue append (at current indent level)
  sections.push(indentCode(`sq.append(${funcName})`, ctx.indentLevel));
  sections.push("");

  return sections;
}

/**
 * Export a loop entry (recursive)
 */
function exportLoopEntry(entry: QueueLoopEntry, ctx: ExportContext): string[] {
  const sections: string[] = [];

  // Loop header
  sections.push(`# Loop: ${entry.name}`);

  if (entry.loopKind === 'repeat') {
    const loopVar = generateLoopVarName(entry.id, 'repeat');
    const count = entry.count || 1;
    sections.push(indentCode(`for ${loopVar} in range(${count}):`, ctx.indentLevel));
  } else {
    // values loop
    const loopVar = entry.loopVarName || generateLoopVarName(entry.id, 'values');
    const values = entry.values || [];
    const valuesList = values.join(", ");
    sections.push(indentCode(`for ${loopVar} in [${valuesList}]:`, ctx.indentLevel));
  }

  // Export loop body with increased indent
  const bodyCtx: ExportContext = {
    ...ctx,
    indentLevel: ctx.indentLevel + 1,
  };

  entry.body.forEach((bodyItem) => {
    const bodySections = exportItem(bodyItem, bodyCtx);
    sections.push(...bodySections);
  });

  sections.push("");
  return sections;
}

/**
 * Collect all function definitions from queue
 * Functions need to be defined before queue construction
 */
function collectFunctionDefinitions(entries: QueueItem[]): string[] {
  const sections: string[] = [];
  const ctx: ExportContext = {
    indentLevel: 0,
    sweepVarNames: new Map(),
    functionNames: new Map(),
    sweepCounter: 0,
  };

  const traverse = (items: QueueItem[]) => {
    items.forEach((item) => {
      if (isFunctionEntry(item)) {
        const funcName = generateFunctionName(item.id);
        ctx.functionNames.set(item.id, funcName);

        sections.push(`# ${item.name}`);
        sections.push(`def ${funcName}():`);

        const userCode = item.pythonCode.trim();
        if (userCode) {
          sections.push(indentCode(userCode, 1));
        } else {
          sections.push("    pass");
        }
        sections.push("");
      } else if (isLoopEntry(item)) {
        traverse(item.body);
      }
    });
  };

  traverse(entries);
  return sections;
}

/**
 * Collect required imports from queue
 */
function collectImports(entries: QueueItem[]): {
  sweepTypes: Set<string>;
  needsDatabase: boolean;
  hasFunctions: boolean;
} {
  const sweepTypes = new Set<string>();
  let needsDatabase = false;
  let hasFunctions = false;

  const traverse = (items: QueueItem[]) => {
    items.forEach((item) => {
      if (isSweepEntry(item)) {
        switch (item.sweepType) {
          case "sweep0d":
            sweepTypes.add("Sweep0D");
            break;
          case "sweep1d":
            sweepTypes.add("Sweep1D");
            break;
          case "sweep2d":
            sweepTypes.add("Sweep2D");
            break;
          case "simulsweep":
            sweepTypes.add("SimulSweep");
            break;
          case "gateleakage":
            sweepTypes.add("GateLeakage");
            break;
        }
        if (item.database) {
          needsDatabase = true;
        }
      } else if (isFunctionEntry(item)) {
        hasFunctions = true;
      } else if (isLoopEntry(item)) {
        traverse(item.body);
      }
    });
  };

  traverse(entries);
  return { sweepTypes, needsDatabase, hasFunctions };
}

/**
 * Export queue entries to executable Python code
 * @param entries - Queue entries to export
 * @returns Complete Python script
 */
export function exportSweepQueue(entries: QueueItem[]): string {
  if (entries.length === 0) {
    return "# Empty queue - no sweeps to run\n";
  }

  const sections: string[] = [];

  // Collect imports
  const { sweepTypes, needsDatabase, hasFunctions } = collectImports(entries);
  const sweepImports = Array.from(sweepTypes).sort().join(", ");

  // Header
  sections.push(`# Generated Sweep Queue
# Generated by QMeasure Jupyter Extension
# Total entries: ${entries.length}

from measureit.tools.sweep_queue import SweepQueue${needsDatabase ? ", DatabaseEntry" : ""}
from measureit import ${sweepImports}${needsDatabase ? ", get_path" : ""}
from measureit.tools import ensure_qt
import qcodes as qc

# Initialize station
station = qc.Station.default

# Ensure Qt event loop is running
ensure_qt()

`);

  // Function definitions (if any)
  const functionDefs = collectFunctionDefinitions(entries);
  if (functionDefs.length > 0) {
    sections.push("# ===== Function Definitions =====\n");
    sections.push(...functionDefs);
  }

  // Sweep setup and queue construction
  sections.push("# ===== Build Queue =====\n");
  sections.push("sq = SweepQueue()\n");

  // Export all entries
  const ctx: ExportContext = {
    indentLevel: 0,
    sweepVarNames: new Map(),
    functionNames: new Map(),
    sweepCounter: 0,
  };

  entries.forEach((entry) => {
    const entrySections = exportItem(entry, ctx);
    sections.push(...entrySections);
  });

  // Start the queue
  sections.push("# ===== Run Queue =====\n");
  sections.push('print(f"Starting queue with {len(sq)} entries...")');
  sections.push("sq.start()");
  sections.push('print("Queue completed!")');

  return sections.join("\n");
}

// Keep existing exportSingleEntry function with updates for new types
export function exportSingleEntry(
  entry: QueueItem,
  includeStart: boolean = true,
): string {
  const sections: string[] = [];

  if (isSweepEntry(entry)) {
    sections.push(`# ${entry.name} (${entry.sweepType})`);
    sections.push("");
    sections.push(entry.code.setup);
    sections.push("");

    if (entry.database && includeStart) {
      sections.push("# Database configuration");
      const dbEntry = generateDatabaseEntry(entry.database);
      sections.push(`db_entry = ${dbEntry}`);
      sections.push("");
    }

    if (includeStart) {
      sections.push(entry.code.start);
    }
  } else if (isFunctionEntry(entry)) {
    const funcName = generateFunctionName(entry.id);
    sections.push(`# ${entry.name} (function)`);
    sections.push("");
    sections.push(`def ${funcName}():`);
    sections.push(indentCode(entry.pythonCode.trim() || "pass", 1));

    if (includeStart) {
      sections.push("");
      sections.push(`${funcName}()`);
    }
  } else if (isLoopEntry(entry)) {
    sections.push(`# ${entry.name} (loop - cannot export single loop)`);
    sections.push("# Use 'Export Queue' to export complete loop structure");
  }

  return sections.join("\n");
}
```

**Testing:**
- [ ] Unit test: exportSweepQueue() with simple sweeps (no loops)
- [ ] Unit test: exportSweepQueue() with repeat loop
- [ ] Unit test: exportSweepQueue() with values loop
- [ ] Unit test: exportSweepQueue() with nested loops
- [ ] Unit test: exportSweepQueue() with function entries
- [ ] Unit test: exportSweepQueue() with mixed entries
- [ ] Unit test: Indentation is correct at all levels
- [ ] Unit test: Function definitions appear before queue construction
- [ ] Integration test: Export queue and execute in Python (manual)
- [ ] Integration test: Verify database entries work within loops

---

## Phase 4: UI Components

### 4.1 Create Loop Entry Form
**Create new file:** `src/components/LoopForm.tsx`

```typescript
/**
 * Form component for creating/editing loop entries
 */

import React, { useState } from "react";
import { QueueLoopEntry } from "../types/queue";

interface LoopFormProps {
  initialData?: Partial<QueueLoopEntry>;
  onSave: (data: Partial<QueueLoopEntry>) => void;
  onCancel: () => void;
}

export const LoopForm: React.FC<LoopFormProps> = ({
  initialData,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(initialData?.name || "New Loop");
  const [loopKind, setLoopKind] = useState<'repeat' | 'values'>(
    initialData?.loopKind || 'repeat'
  );
  const [count, setCount] = useState(initialData?.count || 5);
  const [valuesText, setValuesText] = useState(
    initialData?.values?.join(", ") || ""
  );
  const [loopVarName, setLoopVarName] = useState(
    initialData?.loopVarName || "value"
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (loopKind === 'repeat') {
      if (count < 1) {
        newErrors.count = "Count must be at least 1";
      }
    } else {
      if (!valuesText.trim()) {
        newErrors.values = "Values list is required";
      }
      if (!loopVarName.trim()) {
        newErrors.loopVarName = "Variable name is required";
      }
      // Check variable name is valid Python identifier
      if (loopVarName && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(loopVarName)) {
        newErrors.loopVarName = "Invalid Python variable name";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const data: Partial<QueueLoopEntry> = {
      name,
      label: loopKind === 'repeat'
        ? `Repeat ${count}×`
        : `For ${loopVarName} in [${valuesText}]`,
      loopKind,
    };

    if (loopKind === 'repeat') {
      data.count = count;
    } else {
      // Parse values (split by comma, trim)
      data.values = valuesText
        .split(',')
        .map(v => v.trim())
        .filter(v => v);
      data.loopVarName = loopVarName;
    }

    onSave(data);
  };

  return (
    <div className="qmeasure-modal-content">
      <h3>{initialData ? 'Edit Loop' : 'Create Loop'}</h3>

      <div className="qmeasure-form-group">
        <label className="qmeasure-form-label">
          Loop Name<span className="qmeasure-required">*</span>
        </label>
        <input
          type="text"
          className="qmeasure-form-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Temperature Scan"
        />
        {errors.name && (
          <div className="qmeasure-form-error">{errors.name}</div>
        )}
      </div>

      <div className="qmeasure-form-group">
        <label className="qmeasure-form-label">Loop Type</label>
        <select
          className="qmeasure-form-input"
          value={loopKind}
          onChange={(e) => setLoopKind(e.target.value as 'repeat' | 'values')}
        >
          <option value="repeat">Repeat N times</option>
          <option value="values">Iterate over values</option>
        </select>
      </div>

      {loopKind === 'repeat' ? (
        <div className="qmeasure-form-group">
          <label className="qmeasure-form-label">
            Repeat Count<span className="qmeasure-required">*</span>
          </label>
          <input
            type="number"
            className="qmeasure-form-input"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            min="1"
            step="1"
          />
          {errors.count && (
            <div className="qmeasure-form-error">{errors.count}</div>
          )}
          <div className="qmeasure-form-help">
            Number of times to repeat the loop body
          </div>
        </div>
      ) : (
        <>
          <div className="qmeasure-form-group">
            <label className="qmeasure-form-label">
              Variable Name<span className="qmeasure-required">*</span>
            </label>
            <input
              type="text"
              className="qmeasure-form-input"
              value={loopVarName}
              onChange={(e) => setLoopVarName(e.target.value)}
              placeholder="e.g., setpoint, voltage"
            />
            {errors.loopVarName && (
              <div className="qmeasure-form-error">{errors.loopVarName}</div>
            )}
            <div className="qmeasure-form-help">
              Python variable name for loop values
            </div>
          </div>

          <div className="qmeasure-form-group">
            <label className="qmeasure-form-label">
              Values<span className="qmeasure-required">*</span>
            </label>
            <input
              type="text"
              className="qmeasure-form-input"
              value={valuesText}
              onChange={(e) => setValuesText(e.target.value)}
              placeholder="e.g., 0.1, 0.2, 0.3, 0.4"
            />
            {errors.values && (
              <div className="qmeasure-form-error">{errors.values}</div>
            )}
            <div className="qmeasure-form-help">
              Comma-separated Python expressions (e.g., 1, 2, 3 or 'a', 'b', 'c')
            </div>
          </div>
        </>
      )}

      <div className="qmeasure-form-actions">
        <button
          className="qmeasure-button-secondary"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="qmeasure-button"
          onClick={handleSave}
          type="button"
        >
          {initialData ? 'Update' : 'Create'} Loop
        </button>
      </div>
    </div>
  );
};
```

**Testing:**
- [ ] Component renders with empty form
- [ ] Component renders with initialData (edit mode)
- [ ] Switching loop type updates UI
- [ ] Validation works for all fields
- [ ] onSave called with correct data structure
- [ ] onCancel called when cancel clicked

### 4.2 Create Function Entry Form
**Create new file:** `src/components/FunctionForm.tsx`

```typescript
/**
 * Form component for creating/editing function entries
 */

import React, { useState } from "react";
import { QueueFunctionEntry } from "../types/queue";
import { validatePythonSyntax } from "../queue/exportHelpers";

interface FunctionFormProps {
  initialData?: Partial<QueueFunctionEntry>;
  onSave: (data: Partial<QueueFunctionEntry>) => void;
  onCancel: () => void;
}

// Predefined templates
const TEMPLATES: Array<{
  id: string;
  label: string;
  description: string;
  code: string;
}> = [
  {
    id: "pause",
    label: "Pause",
    description: "Pause execution for specified seconds",
    code: `import time\ntime.sleep(10)  # seconds`,
  },
  {
    id: "print",
    label: "Print Message",
    description: "Print a message to console",
    code: `print("Checkpoint reached")`,
  },
  {
    id: "flush_db",
    label: "Flush Database",
    description: "Flush database to disk",
    code: `# Flush current database\nif hasattr(station, 'db'):\n    station.db.flush()`,
  },
  {
    id: "custom",
    label: "Custom Code",
    description: "Write your own Python code",
    code: `# Your custom code here\npass`,
  },
];

export const FunctionForm: React.FC<FunctionFormProps> = ({
  initialData,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(initialData?.name || "Custom Function");
  const [selectedTemplate, setSelectedTemplate] = useState(
    initialData?.templateId || "custom"
  );
  const [pythonCode, setPythonCode] = useState(
    initialData?.pythonCode || TEMPLATES[3].code
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setPythonCode(template.code);
      setName(template.label);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!pythonCode.trim()) {
      newErrors.pythonCode = "Python code is required";
    } else {
      // Basic syntax validation
      const syntaxError = validatePythonSyntax(pythonCode);
      if (syntaxError) {
        newErrors.pythonCode = `Syntax error: ${syntaxError}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const data: Partial<QueueFunctionEntry> = {
      name,
      label: name,
      pythonCode,
      templateId: selectedTemplate,
    };

    onSave(data);
  };

  return (
    <div className="qmeasure-modal-content">
      <h3>{initialData ? 'Edit Function' : 'Add Function'}</h3>

      <div className="qmeasure-form-group">
        <label className="qmeasure-form-label">Template</label>
        <select
          className="qmeasure-form-input"
          value={selectedTemplate}
          onChange={(e) => handleTemplateChange(e.target.value)}
        >
          {TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <div className="qmeasure-form-help">
          {TEMPLATES.find((t) => t.id === selectedTemplate)?.description}
        </div>
      </div>

      <div className="qmeasure-form-group">
        <label className="qmeasure-form-label">
          Function Name<span className="qmeasure-required">*</span>
        </label>
        <input
          type="text"
          className="qmeasure-form-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Pause 10s"
        />
        {errors.name && (
          <div className="qmeasure-form-error">{errors.name}</div>
        )}
      </div>

      <div className="qmeasure-form-group">
        <label className="qmeasure-form-label">
          Python Code<span className="qmeasure-required">*</span>
        </label>
        <textarea
          className="qmeasure-form-input qmeasure-code-editor"
          value={pythonCode}
          onChange={(e) => setPythonCode(e.target.value)}
          rows={10}
          spellCheck={false}
          style={{ fontFamily: 'monospace', fontSize: '13px' }}
        />
        {errors.pythonCode && (
          <div className="qmeasure-form-error">{errors.pythonCode}</div>
        )}
        <div className="qmeasure-form-help">
          Python code to execute (will be wrapped in a function)
        </div>
      </div>

      <div className="qmeasure-form-actions">
        <button
          className="qmeasure-button-secondary"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="qmeasure-button"
          onClick={handleSave}
          type="button"
        >
          {initialData ? 'Update' : 'Add'} Function
        </button>
      </div>
    </div>
  );
};
```

**Testing:**
- [ ] Component renders with template selector
- [ ] Template change updates code and name
- [ ] Custom code can be entered
- [ ] Syntax validation catches basic errors
- [ ] onSave called with correct data

### 4.3 Update Queue Manager for Nested Display
**File:** `src/queue/QueueManager.tsx`
**Lines to modify:** Major refactor throughout

**Key changes:**
1. Replace flat list with recursive component
2. Add loop/function rendering
3. Add "Add Loop" and "Add Function" buttons
4. Support drag-and-drop within loops

**Create helper component file:** `src/queue/QueueItem.tsx`

```typescript
/**
 * Recursive queue item component for nested display
 */

import React from "react";
import {
  QueueItem,
  QueueSweepEntry,
  QueueFunctionEntry,
  QueueLoopEntry,
  isSweepEntry,
  isFunctionEntry,
  isLoopEntry,
} from "../types/queue";

interface QueueItemProps {
  item: QueueItem;
  depth: number;
  index: number;
  parentPath: string[];
  isSelected: boolean;
  onEdit: (item: QueueItem, path: string[]) => void;
  onDelete: (id: string, path: string[]) => void;
  onDuplicate: (item: QueueItem) => void;
  onMoveUp: (index: number, path: string[]) => void;
  onMoveDown: (index: number, path: string[]) => void;
  onAddToLoop?: (loopId: string) => void;
}

export const QueueItemComponent: React.FC<QueueItemProps> = ({
  item,
  depth,
  index,
  parentPath,
  isSelected,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddToLoop,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const itemPath = [...parentPath, item.id];

  const renderIcon = () => {
    if (isSweepEntry(item)) {
      const icons: Record<QueueSweepEntry["sweepType"], string> = {
        sweep0d: "⏱",
        sweep1d: "📊",
        sweep2d: "🗺",
        simulsweep: "⚡",
        sweepto: "🎯",
        gateleakage: "🔒",
      };
      return icons[item.sweepType] || "📊";
    } else if (isFunctionEntry(item)) {
      return "⚙️";
    } else if (isLoopEntry(item)) {
      return isExpanded ? "🔽" : "▶️";
    }
    return "❓";
  };

  const renderLabel = () => {
    if (isSweepEntry(item)) {
      return (
        <>
          <span className="qmeasure-queue-item-name">{item.name}</span>
          <span className="qmeasure-queue-item-type">
            {item.sweepType.toUpperCase()}
          </span>
        </>
      );
    } else if (isFunctionEntry(item)) {
      return (
        <>
          <span className="qmeasure-queue-item-name">{item.name}</span>
          <span className="qmeasure-queue-item-type">FUNC</span>
        </>
      );
    } else if (isLoopEntry(item)) {
      return (
        <>
          <span className="qmeasure-queue-item-name">{item.name}</span>
          <span className="qmeasure-queue-item-loop-label">{item.label}</span>
          <span className="qmeasure-queue-item-type">
            LOOP ({item.body.length})
          </span>
        </>
      );
    }
  };

  const indentStyle = {
    marginLeft: `${depth * 24}px`,
  };

  return (
    <div className="qmeasure-queue-item-container">
      <div
        className={`qmeasure-queue-item ${isSelected ? "selected" : ""}`}
        style={indentStyle}
      >
        <div
          className="qmeasure-queue-item-header"
          onClick={() => {
            if (isLoopEntry(item)) {
              setIsExpanded(!isExpanded);
            }
          }}
        >
          <span className="qmeasure-queue-item-icon">{renderIcon()}</span>
          {renderLabel()}
        </div>

        <div className="qmeasure-queue-item-actions">
          <button
            className="qmeasure-icon-button"
            onClick={() => onMoveUp(index, parentPath)}
            disabled={index === 0}
            title="Move up"
          >
            ↑
          </button>
          <button
            className="qmeasure-icon-button"
            onClick={() => onMoveDown(index, parentPath)}
            title="Move down"
          >
            ↓
          </button>
          <button
            className="qmeasure-icon-button"
            onClick={() => onEdit(item, itemPath)}
            title="Edit"
          >
            ✏️
          </button>
          <button
            className="qmeasure-icon-button"
            onClick={() => onDuplicate(item)}
            title="Duplicate"
          >
            📋
          </button>
          <button
            className="qmeasure-icon-button qmeasure-delete-button"
            onClick={() => onDelete(item.id, parentPath)}
            title="Delete"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Render loop body */}
      {isLoopEntry(item) && isExpanded && (
        <div className="qmeasure-queue-loop-body">
          {item.body.length === 0 && (
            <div
              className="qmeasure-queue-empty-loop"
              style={{ marginLeft: `${(depth + 1) * 24}px` }}
            >
              Empty loop - add sweeps or functions
            </div>
          )}
          {item.body.map((child, childIndex) => (
            <QueueItemComponent
              key={child.id}
              item={child}
              depth={depth + 1}
              index={childIndex}
              parentPath={itemPath}
              isSelected={false} // TODO: implement nested selection
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onAddToLoop={onAddToLoop}
            />
          ))}
          {onAddToLoop && (
            <button
              className="qmeasure-add-to-loop-button"
              style={{ marginLeft: `${(depth + 1) * 24 + 8}px` }}
              onClick={() => onAddToLoop(item.id)}
            >
              + Add to Loop
            </button>
          )}
        </div>
      )}
    </div>
  );
};
```

**Update QueueManager.tsx:**
```typescript
// Add at top with imports
import { QueueItemComponent } from "./QueueItem";
import { LoopForm } from "../components/LoopForm";
import { FunctionForm } from "../components/FunctionForm";
import { QueueItem, isLoopEntry, QueueLoopEntry, QueueFunctionEntry } from "../types/queue";

// Add state for modals
const [showLoopModal, setShowLoopModal] = React.useState(false);
const [showFunctionModal, setShowFunctionModal] = React.useState(false);
const [editingLoop, setEditingLoop] = React.useState<QueueLoopEntry | null>(null);
const [editingFunction, setEditingFunction] = React.useState<QueueFunctionEntry | null>(null);

// Add handler methods
const handleAddLoop = () => {
  setEditingLoop(null);
  setShowLoopModal(true);
};

const handleSaveLoop = (data: Partial<QueueLoopEntry>) => {
  const loopEntry: QueueLoopEntry = {
    id: editingLoop?.id || `loop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    queueType: 'loop',
    name: data.name || 'New Loop',
    label: data.label || '',
    loopKind: data.loopKind || 'repeat',
    count: data.count,
    values: data.values,
    loopVarName: data.loopVarName,
    body: editingLoop?.body || [],
    createdAt: editingLoop?.createdAt || Date.now(),
    modifiedAt: Date.now(),
  };

  const { getQueueStore } = require("./queueStore");
  const store = getQueueStore();

  if (editingLoop) {
    store.updateLoop(loopEntry.id, loopEntry);
  } else {
    store.addLoop(loopEntry);
  }

  setShowLoopModal(false);
  setEditingLoop(null);
};

const handleAddFunction = () => {
  setEditingFunction(null);
  setShowFunctionModal(true);
};

const handleSaveFunction = (data: Partial<QueueFunctionEntry>) => {
  const funcEntry: QueueFunctionEntry = {
    id: editingFunction?.id || `func_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    queueType: 'function',
    name: data.name || 'Custom Function',
    label: data.label || data.name || 'Custom Function',
    pythonCode: data.pythonCode || '',
    templateId: data.templateId,
    createdAt: editingFunction?.createdAt || Date.now(),
    modifiedAt: Date.now(),
  };

  const { getQueueStore } = require("./queueStore");
  const store = getQueueStore();
  store.addOrReplace(funcEntry);

  setShowFunctionModal(false);
  setEditingFunction(null);
};

// Update render to use recursive component and add modals
return (
  <div className="qmeasure-queue-manager">
    <div className="qmeasure-queue-header">
      <h3>Sweep Queue ({entries.length})</h3>
      <div className="qmeasure-queue-actions">
        <button className="qmeasure-button-small" onClick={handleAddLoop}>
          + Loop
        </button>
        <button className="qmeasure-button-small" onClick={handleAddFunction}>
          + Function
        </button>
        <button className="qmeasure-button-small" onClick={handleClear}>
          Clear All
        </button>
        <button className="qmeasure-button" onClick={handleInsertQueue}>
          Insert Queue
        </button>
      </div>
    </div>

    <div className="qmeasure-queue-list">
      {entries.length === 0 ? (
        <div className="qmeasure-queue-empty">
          No entries in queue. Add sweeps, loops, or functions.
        </div>
      ) : (
        entries.map((item, index) => (
          <QueueItemComponent
            key={item.id}
            item={item}
            depth={0}
            index={index}
            parentPath={[]}
            isSelected={selectedId === item.id}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onAddToLoop={undefined} // TODO: implement
          />
        ))
      )}
    </div>

    {/* Loop modal */}
    {showLoopModal && (
      <div className="qmeasure-modal-overlay" onClick={() => setShowLoopModal(false)}>
        <div className="qmeasure-modal" onClick={(e) => e.stopPropagation()}>
          <LoopForm
            initialData={editingLoop || undefined}
            onSave={handleSaveLoop}
            onCancel={() => setShowLoopModal(false)}
          />
        </div>
      </div>
    )}

    {/* Function modal */}
    {showFunctionModal && (
      <div className="qmeasure-modal-overlay" onClick={() => setShowFunctionModal(false)}>
        <div className="qmeasure-modal" onClick={(e) => e.stopPropagation()}>
          <FunctionForm
            initialData={editingFunction || undefined}
            onSave={handleSaveFunction}
            onCancel={() => setShowFunctionModal(false)}
          />
        </div>
      </div>
    )}
  </div>
);
```

**Testing:**
- [ ] Queue renders empty state
- [ ] Queue renders flat list (no loops)
- [ ] Queue renders loops with nested items
- [ ] Loop can be collapsed/expanded
- [ ] Add Loop button opens modal
- [ ] Add Function button opens modal
- [ ] Loop saves correctly
- [ ] Function saves correctly
- [ ] Edit loop/function works
- [ ] Delete works at all levels
- [ ] Move up/down works at all levels

### 4.4 Add CSS Styles
**File:** `style/base.css`
**Add at end of file:**

```css
/* Queue item nesting */
.qmeasure-queue-item-container {
  position: relative;
}

.qmeasure-queue-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--jp-border-color2);
  transition: background-color 0.2s;
}

.qmeasure-queue-item:hover {
  background-color: var(--jp-layout-color2);
}

.qmeasure-queue-item.selected {
  background-color: var(--jp-brand-color3);
}

.qmeasure-queue-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  cursor: pointer;
}

.qmeasure-queue-item-icon {
  font-size: 16px;
  min-width: 20px;
  text-align: center;
}

.qmeasure-queue-item-name {
  font-weight: 500;
  color: var(--jp-ui-font-color1);
}

.qmeasure-queue-item-type {
  font-size: 11px;
  color: var(--jp-ui-font-color2);
  background-color: var(--jp-layout-color3);
  padding: 2px 6px;
  border-radius: 3px;
}

.qmeasure-queue-item-loop-label {
  font-size: 12px;
  color: var(--jp-ui-font-color2);
  font-family: var(--jp-code-font-family);
}

.qmeasure-queue-loop-body {
  border-left: 2px solid var(--jp-border-color1);
  margin-left: 12px;
}

.qmeasure-queue-empty-loop {
  padding: 12px 8px;
  color: var(--jp-ui-font-color2);
  font-style: italic;
  font-size: 13px;
}

.qmeasure-add-to-loop-button {
  padding: 6px 12px;
  margin: 8px 0;
  border: 1px dashed var(--jp-border-color1);
  background-color: transparent;
  color: var(--jp-ui-font-color2);
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.qmeasure-add-to-loop-button:hover {
  border-color: var(--jp-brand-color1);
  color: var(--jp-brand-color1);
  background-color: var(--jp-layout-color2);
}

/* Modal styles */
.qmeasure-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.qmeasure-modal {
  background-color: var(--jp-layout-color1);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.qmeasure-modal-content {
  padding: 24px;
}

.qmeasure-code-editor {
  font-family: var(--jp-code-font-family);
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
}
```

**Testing:**
- [ ] Nested items display with proper indentation
- [ ] Loop body has visual border
- [ ] Hover effects work
- [ ] Modal displays correctly
- [ ] Code editor textarea has monospace font

---

## Phase 5: Integration Testing

### 5.1 Unit Tests
**Create new file:** `tests/queue-enhanced.test.ts`

**Test scenarios:**
- [ ] Type guards work correctly
- [ ] Store methods for loops/functions
- [ ] Export with simple loop
- [ ] Export with nested loops
- [ ] Export with function entries
- [ ] Export with mixed queue
- [ ] Indentation correctness
- [ ] Function definitions before queue

### 5.2 Integration Tests
**Manual testing checklist:**

- [ ] Create repeat loop, add sweep, export, verify Python code
- [ ] Create values loop, add multiple sweeps, export, verify Python code
- [ ] Create nested loops (loop inside loop), export, verify indentation
- [ ] Create function entry, export, verify function definition
- [ ] Mix sweeps, loops, and functions, export, verify complete script
- [ ] Execute exported script in Jupyter with MeasureIt loaded
- [ ] Verify database entries work within loops
- [ ] Verify loop variables accessible in Python
- [ ] Test empty loop export (should work)
- [ ] Test loop with database entries

### 5.3 End-to-End Workflow
- [ ] Build extension: `jlpm build`
- [ ] Install extension: `jupyter labextension develop . --overwrite`
- [ ] Launch JupyterLab
- [ ] Open QMeasure panel
- [ ] Create sweep, add to queue
- [ ] Create repeat loop (3×)
- [ ] Add sweep to loop
- [ ] Add pause function between sweeps
- [ ] Export queue
- [ ] Copy code to notebook
- [ ] Execute (assuming MeasureIt environment)
- [ ] Verify 3 sweeps execute with pause

---

## Phase 6: Documentation

### 6.1 Update README.md
**File:** `README.md`
**Section to add:** "Advanced Queue Features"

```markdown
### Advanced Queue Features

#### Loop Blocks
Wrap sweeps in loops to repeat measurements:

- **Repeat Loops**: Execute sweeps N times
- **Value Loops**: Iterate over a list of values
- Nest loops for complex measurement sequences

Click "+ Loop" in Queue Manager to create a loop.

#### Function Entries
Insert custom Python functions between sweeps:

- Use templates (pause, print, flush database)
- Write custom Python code
- Functions execute between sweeps in queue

Click "+ Function" in Queue Manager to add a function.

#### Example Workflows

**Repeated Temperature Scan:**
1. Create repeat loop (10×)
2. Add 1D sweep inside loop
3. Add pause function (30s) after sweep
4. Export and run

**Multi-Setpoint Characterization:**
1. Create values loop with setpoints: `0.1, 0.2, 0.3`
2. Add multiple sweeps inside loop
3. Each sweep executes at each setpoint
```

### 6.2 Create User Guide
**Create new file:** `docs/QUEUE_GUIDE.md`

**Content:**
- Overview of queue system
- Basic queue operations
- Creating loops (with screenshots/examples)
- Creating functions (with examples)
- Nesting loops
- Export and execution
- Best practices
- Troubleshooting

### 6.3 Update USAGE.md
**File:** `USAGE.md`
**Add section on loops and functions**

---

## Implementation Checklist

### Phase 1: Data Model ✅ (Week 1)
- [ ] Update `queue.ts` types
- [ ] Add type guards
- [ ] Test compilation
- [ ] Verify backward compatibility

### Phase 2: Queue Store ✅ (Week 1-2)
- [ ] Add loop methods to store
- [ ] Add nested access methods
- [ ] Update useQueueStore hook
- [ ] Write unit tests
- [ ] Test with React components

### Phase 3: Export Logic ✅ (Week 2)
- [ ] Create exportHelpers.ts
- [ ] Update export.ts with recursion
- [ ] Add indentation logic
- [ ] Add function definition collection
- [ ] Write export unit tests
- [ ] Test generated Python code

### Phase 4: UI Components ✅ (Week 3-4)
- [ ] Create LoopForm component
- [ ] Create FunctionForm component
- [ ] Create QueueItem recursive component
- [ ] Update QueueManager
- [ ] Add CSS styles
- [ ] Test all components
- [ ] Test modals
- [ ] Test nested rendering

### Phase 5: Integration ✅ (Week 4-5)
- [ ] Write integration tests
- [ ] Manual end-to-end testing
- [ ] Fix bugs found during testing
- [ ] Performance testing (large queues)

### Phase 6: Documentation ✅ (Week 5)
- [ ] Update README.md
- [ ] Create QUEUE_GUIDE.md
- [ ] Update USAGE.md
- [ ] Add code comments
- [ ] Create example workflows

### Phase 7: Polish & Release ✅ (Week 6)
- [ ] Code review
- [ ] Refactor if needed
- [ ] Final testing
- [ ] Update TODO.md
- [ ] Create release notes

---

## Risk Mitigation

### TypeScript Complexity
- **Risk**: Type system becomes too complex with nested unions
- **Mitigation**: Use type guards extensively, test incrementally

### UI Performance
- **Risk**: Recursive rendering slow with deep nesting
- **Mitigation**: Limit nesting depth, add virtual scrolling if needed

### Python Export Bugs
- **Risk**: Generated code has syntax errors
- **Mitigation**: Extensive unit tests, validation helpers

### Backward Compatibility
- **Risk**: Breaking existing queue functionality
- **Mitigation**: Keep QueueEntry alias, comprehensive regression tests

---

## Timeline Estimate

**Total: 6 weeks**

- Week 1: Data model & store (Phases 1-2)
- Week 2: Export logic (Phase 3)
- Week 3-4: UI components (Phase 4)
- Week 4-5: Integration & testing (Phase 5)
- Week 5-6: Documentation & polish (Phases 6-7)

**MVP (Minimum Viable Product): 3 weeks**
- Basic loop support (repeat only)
- Function entries
- Simple export
- Basic UI

**Full Feature Set: 6 weeks**
- Value loops with variable substitution
- Nested loops
- Full UI with drag-and-drop
- Complete documentation

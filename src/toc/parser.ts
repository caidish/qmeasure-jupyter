/**
 * Tree-sitter-based Python parser for extracting sweep parameter details
 */

import Parser from 'web-tree-sitter';

// Import the WASM files - both runtime and grammar
const TREE_SITTER_WASM_URL = new URL('./grammars/tree-sitter.wasm', import.meta.url).href;
const PYTHON_WASM_URL = new URL('./grammars/tree-sitter-python.wasm', import.meta.url).href;

/**
 * Structured sweep metadata for rich rendering
 */
export interface SweepMetrics {
  // Core parameters
  setParam?: string;
  start?: string;
  stop?: string;
  step?: string;

  // GateLeakage specific
  trackParam?: string;
  maxCurrent?: string; // max_I
  limit?: string;

  // Sweep0D specific
  maxTime?: string;
  interDelay?: string;
  plotBin?: string;

  // Sweep2D specific - inner sweep params
  innerSweep?: string; // Full representation for display
  innerParam?: string;
  innerStart?: string;
  innerStop?: string;
  innerStep?: string;

  // Sweep2D specific - outer sweep params
  outerSweep?: string; // Full representation for display
  outerParam?: string;
  outerStart?: string;
  outerStop?: string;
  outerStep?: string;

  // SimulSweep specific
  paramCount?: number; // Number of simultaneous parameters
  paramSummary?: string; // Summary like "instr0.x 0→5 @0.02; instr1.x 0→10 @0.04"
  simulParams?: Array<{
    param: string;
    start: string;
    stop: string;
    step: string;
  }>;

  // Additional parameters
  followParams?: string[];
  xAxisTime?: string;
}

export interface SweepFlags {
  bidirectional?: boolean;
  continual?: boolean;
  plotData?: boolean;
  saveData?: boolean;
  isFastSweep?: boolean; // True for Sweepto/GateLeakage patterns
}

/**
 * Queue-related metadata
 */
export interface QueueMetadata {
  queueVariable?: string; // e.g., "sq"
  position?: number; // Position in queue (0-indexed)
  totalInQueue?: number; // Total sweeps in this queue
  database?: {
    name: string;
    experiment: string;
    sample: string;
  };
}

/**
 * Loop context metadata
 */
export interface LoopContext {
  type: 'for' | 'while';
  variable?: string; // For loop: iteration variable (e.g., "i", "voltage")
  iterable?: string; // For loop: what's being iterated (e.g., "range(10)", "voltages")
  condition?: string; // While loop: loop condition
}

/**
 * Function context metadata
 */
export interface FunctionContext {
  name: string; // Function name
  isAsync?: boolean; // Is it an async function?
}

export interface ParsedSweep {
  type: 'sweep0d' | 'sweep1d' | 'sweep2d' | 'simulsweep' | 'sweepqueue' | 'sweepto' | 'gateleakage';
  name: string;
  metrics: SweepMetrics;
  flags: SweepFlags;
  queue?: QueueMetadata; // Present if sweep is part of a queue
  loop?: LoopContext; // Present if sweep is inside a loop
  function?: FunctionContext; // Present if sweep is inside a function
  notes?: string;
  complete: boolean; // Whether all required params were resolved
  diagnostics?: string[];
}

/**
 * Custom error for parser initialization failures
 */
export class ParserInitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParserInitError';
  }
}

/**
 * Custom error for parse failures
 */
export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

/**
 * Singleton parser manager
 */
class ParserManager {
  private static instance: ParserManager;
  private parser: Parser | null = null;
  private initPromise: Promise<Parser> | null = null;
  private hasError = false;

  private constructor() {}

  static getInstance(): ParserManager {
    if (!ParserManager.instance) {
      ParserManager.instance = new ParserManager();
    }
    return ParserManager.instance;
  }

  async getParser(): Promise<Parser> {
    // Return cached parser if available
    if (this.parser) {
      return this.parser;
    }

    // Return in-flight initialization if happening
    if (this.initPromise) {
      return this.initPromise;
    }

    // Don't retry if we already failed
    if (this.hasError) {
      throw new ParserInitError('Parser initialization previously failed');
    }

    // Start initialization
    this.initPromise = this.initializeParser();

    try {
      this.parser = await this.initPromise;
      return this.parser;
    } catch (err) {
      this.hasError = true;
      this.initPromise = null;
      throw err;
    }
  }

  private async initializeParser(): Promise<Parser> {
    try {
      // Initialize tree-sitter with locateFile hook to find the runtime WASM
      await Parser.init({
        locateFile: (scriptName: string) =>
          scriptName === 'tree-sitter.wasm' ? TREE_SITTER_WASM_URL : scriptName
      });
      const parser = new Parser();
      const lang = await Parser.Language.load(PYTHON_WASM_URL);
      parser.setLanguage(lang);
      return parser;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[Sweep ToC] Failed to initialize tree-sitter parser:', message);
      throw new ParserInitError(`Failed to load Python grammar: ${message}`);
    }
  }
}

/**
 * Cache for parsed results (keyed by source hash)
 */
const parseCache = new Map<string, ParsedSweep[]>();

/**
 * Parse sweeps from a code cell source
 * @param source - Python source code
 * @param notebookQueueEntries - Optional notebook-level queue entries for cross-cell linking
 */
export async function parseSweeps(
  source: string,
  notebookQueueEntries?: QueueEntry[]
): Promise<ParsedSweep[]> {
  // Check cache first (cache key includes queue entries for correctness)
  const cacheKey = notebookQueueEntries
    ? `${hashString(source)}_${hashString(JSON.stringify(notebookQueueEntries))}`
    : hashString(source);

  if (parseCache.has(cacheKey)) {
    return parseCache.get(cacheKey)!;
  }

  try {
    const manager = ParserManager.getInstance();
    const parser = await manager.getParser();

    // Parse the source
    const tree = parser.parse(source);

    // Extract constants from the cell
    const constants = extractConstants(tree.rootNode, source);

    // Extract dictionary variable assignments
    const dictionaries = extractDictionaries(tree.rootNode, source);

    // Find all sweep assignments
    const sweeps = extractSweepCalls(tree.rootNode, source, constants, dictionaries);

    // Use notebook-level queue entries if provided, otherwise extract from this cell
    const queueEntries = notebookQueueEntries || extractQueueEntries(tree.rootNode, source, dictionaries);

    // Link sweeps to queue entries
    linkSweepsToQueue(sweeps, queueEntries);

    // Detect fast sweep patterns
    detectFastSweeps(sweeps);

    // Cache and return
    parseCache.set(cacheKey, sweeps);
    return sweeps;
  } catch (err) {
    if (err instanceof ParserInitError) {
      // Parser not available - return empty array
      return [];
    }
    throw err;
  }
}

/**
 * Extract ONLY queue entries from source (lightweight scan for notebook-level aggregation)
 * This is called before sweep parsing to build a complete queue map across all cells
 */
export async function extractQueueEntriesFromSource(source: string): Promise<QueueEntry[]> {
  try {
    const manager = ParserManager.getInstance();
    const parser = await manager.getParser();

    const tree = parser.parse(source);

    // Extract dictionaries for DatabaseEntry variable resolution
    const dictionaries = extractDictionaries(tree.rootNode, source);

    return extractQueueEntries(tree.rootNode, source, dictionaries);
  } catch (err) {
    if (err instanceof ParserInitError) {
      return [];
    }
    throw err;
  }
}

/**
 * Extract simple constant assignments from AST
 */
function extractConstants(
  node: Parser.SyntaxNode,
  source: string
): Map<string, string> {
  const constants = new Map<string, string>();

  // Walk all assignment nodes
  const cursor = node.walk();
  let reachedRoot = false;

  while (!reachedRoot) {
    if (cursor.nodeType === 'assignment') {
      const assignNode = cursor.currentNode();
      const left = assignNode.childForFieldName('left');
      const right = assignNode.childForFieldName('right');

      if (left && right && left.type === 'identifier') {
        const varName = source.substring(left.startIndex, left.endIndex);

        // Only capture literals
        if (
          right.type === 'integer' ||
          right.type === 'float' ||
          right.type === 'string' ||
          right.type === 'true' ||
          right.type === 'false' ||
          right.type === 'none'
        ) {
          const value = source.substring(right.startIndex, right.endIndex);
          constants.set(varName, value);
        }
      }
    }

    if (cursor.gotoFirstChild()) {
      continue;
    }

    while (!cursor.gotoNextSibling()) {
      if (!cursor.gotoParent()) {
        reachedRoot = true;
        break;
      }
    }
  }

  return constants;
}

/**
 * Extract dictionary variable assignments from AST
 * Returns a map of variable names to their dictionary AST nodes
 */
function extractDictionaries(
  node: Parser.SyntaxNode,
  source: string
): Map<string, Parser.SyntaxNode> {
  const dictionaries = new Map<string, Parser.SyntaxNode>();

  // Walk all assignment nodes
  const cursor = node.walk();
  let reachedRoot = false;

  while (!reachedRoot) {
    if (cursor.nodeType === 'assignment') {
      const assignNode = cursor.currentNode();
      const left = assignNode.childForFieldName('left');
      const right = assignNode.childForFieldName('right');

      if (left && right && left.type === 'identifier' && right.type === 'dictionary') {
        const varName = source.substring(left.startIndex, left.endIndex);
        dictionaries.set(varName, right);
      }
    }

    if (cursor.gotoFirstChild()) {
      continue;
    }

    while (!cursor.gotoNextSibling()) {
      if (!cursor.gotoParent()) {
        reachedRoot = true;
        break;
      }
    }
  }

  return dictionaries;
}

/**
 * Extract DatabaseEntry variable assignments from AST
 * Returns a map of variable names to their database configuration
 */
function extractDatabaseEntries(
  node: Parser.SyntaxNode,
  source: string
): Map<string, { name: string; experiment: string; sample: string }> {
  const dbEntries = new Map<string, { name: string; experiment: string; sample: string }>();

  const cursor = node.walk();
  let reachedRoot = false;

  while (!reachedRoot) {
    if (cursor.nodeType === 'assignment') {
      const assignNode = cursor.currentNode();
      const left = assignNode.childForFieldName('left');
      const right = assignNode.childForFieldName('right');

      if (left && right && left.type === 'identifier' && right.type === 'call') {
        const funcNode = right.childForFieldName('function');
        if (funcNode && funcNode.text === 'DatabaseEntry') {
          const varName = source.substring(left.startIndex, left.endIndex);
          const argsNode = right.childForFieldName('arguments');
          if (argsNode) {
            const database = parseDatabaseEntry(argsNode, source);
            if (database) {
              dbEntries.set(varName, database);
            }
          }
        }
      }
    }

    if (cursor.gotoFirstChild()) {
      continue;
    }

    while (!cursor.gotoNextSibling()) {
      if (!cursor.gotoParent()) {
        reachedRoot = true;
        break;
      }
    }
  }

  return dbEntries;
}

/**
 * Extract sweep call expressions from AST
 */
function extractSweepCalls(
  node: Parser.SyntaxNode,
  source: string,
  constants: Map<string, string>,
  dictionaries: Map<string, Parser.SyntaxNode>
): ParsedSweep[] {
  const sweeps: ParsedSweep[] = [];
  const sweepTypes = ['Sweep0D', 'Sweep1D', 'Sweep2D', 'SimulSweep', 'SweepQueue', 'GateLeakage'];

  const cursor = node.walk();
  let reachedRoot = false;

  while (!reachedRoot) {
    if (cursor.nodeType === 'assignment') {
      const assignNode = cursor.currentNode();
      const left = assignNode.childForFieldName('left');
      const right = assignNode.childForFieldName('right');

      if (left && right && left.type === 'identifier' && right.type === 'call') {
        const varName = source.substring(left.startIndex, left.endIndex);
        const funcNode = right.childForFieldName('function');

        if (funcNode && sweepTypes.includes(funcNode.text)) {
          const sweepType = funcNode.text;
          const argsNode = right.childForFieldName('arguments');

          if (argsNode) {
            const params = extractCallArguments(
              argsNode,
              source,
              constants,
              dictionaries,
              sweepType as any
            );
            const { metrics, flags, complete } = structureSweepData(
              sweepType as any,
              params
            );

            // Detect context (loop and function)
            const loopContext = detectLoopContext(assignNode, source);
            const functionContext = detectFunctionContext(assignNode, source);

            const sweep: ParsedSweep = {
              type: sweepType.toLowerCase() as any,
              name: varName,
              metrics,
              flags,
              complete,
              diagnostics: []
            };

            // Add context metadata if present
            if (loopContext) sweep.loop = loopContext;
            if (functionContext) sweep.function = functionContext;

            console.debug(`[Parser] Detected ${sweepType} '${varName}':`, {
              metrics,
              flags,
              complete,
              loop: loopContext,
              function: functionContext
            });
            sweeps.push(sweep);
          }
        }
      }
    }

    if (cursor.gotoFirstChild()) {
      continue;
    }

    while (!cursor.gotoNextSibling()) {
      if (!cursor.gotoParent()) {
        reachedRoot = true;
        break;
      }
    }
  }

  return sweeps;
}

/**
 * Extract arguments from a call's argument list
 */
function extractCallArguments(
  argsNode: Parser.SyntaxNode,
  source: string,
  constants: Map<string, string>,
  dictionaries: Map<string, Parser.SyntaxNode>,
  sweepType: 'Sweep0D' | 'Sweep1D' | 'Sweep2D' | 'SimulSweep' | 'SweepQueue' | 'GateLeakage'
): Record<string, string> {
  const params: Record<string, string> = {};
  const positionalArgs: string[] = [];
  const positionalNodes: Parser.SyntaxNode[] = []; // Keep nodes for Sweep2D list extraction

  // First pass: collect all arguments
  for (let i = 0; i < argsNode.namedChildCount; i++) {
    const child = argsNode.namedChild(i);
    if (!child) continue;

    if (child.type === 'keyword_argument') {
      const nameNode = child.childForFieldName('name');
      const valueNode = child.childForFieldName('value');

      if (nameNode && valueNode) {
        const key = source.substring(nameNode.startIndex, nameNode.endIndex);
        let value = resolveValue(valueNode, source, constants);
        params[key] = value;
      }
    } else {
      // Positional argument
      const value = resolveValue(child, source, constants);
      positionalArgs.push(value);
      positionalNodes.push(child); // Store node for list extraction
    }
  }

  // Map positional arguments based on sweep type
  if (positionalArgs.length > 0) {
    console.debug(`[Parser] Mapping ${positionalArgs.length} positional args for ${sweepType}:`, positionalArgs);

    switch (sweepType) {
      case 'Sweep1D':
        // Sweep1D(set_param, start, stop, step, ...)
        if (positionalArgs[0] && !params.set_param) params.set_param = positionalArgs[0];
        if (positionalArgs[1] && !params.start) params.start = positionalArgs[1];
        if (positionalArgs[2] && !params.stop) params.stop = positionalArgs[2];
        if (positionalArgs[3] && !params.step) params.step = positionalArgs[3];
        break;

      case 'Sweep2D':
        // Sweep2D([inner_param, inner_start, inner_stop, inner_step], [outer_param, outer_start, outer_stop, outer_step], ...)
        if (positionalNodes[0]) {
          const innerNode = positionalNodes[0];
          if (innerNode.type === 'list' || innerNode.type === 'tuple') {
            const innerParams = extractListParams(innerNode, source, constants);
            if (innerParams[0]) params.inner_param = innerParams[0];
            if (innerParams[1]) params.inner_start = innerParams[1];
            if (innerParams[2]) params.inner_stop = innerParams[2];
            if (innerParams[3]) params.inner_step = innerParams[3];
            params.inner_sweep = positionalArgs[0]; // Full list as string
          } else {
            // If not a list/tuple, store as-is (might be a variable reference)
            params.inner_sweep = positionalArgs[0];
          }
        }
        if (positionalNodes[1]) {
          const outerNode = positionalNodes[1];
          if (outerNode.type === 'list' || outerNode.type === 'tuple') {
            const outerParams = extractListParams(outerNode, source, constants);
            if (outerParams[0]) params.outer_param = outerParams[0];
            if (outerParams[1]) params.outer_start = outerParams[1];
            if (outerParams[2]) params.outer_stop = outerParams[2];
            if (outerParams[3]) params.outer_step = outerParams[3];
            params.outer_sweep = positionalArgs[1]; // Full list as string
          } else {
            // If not a list/tuple, store as-is (might be a variable reference)
            params.outer_sweep = positionalArgs[1];
          }
        }
        break;

      case 'Sweep0D':
        // Sweep0D doesn't typically use positional args for core params
        break;

      case 'SimulSweep':
        // SimulSweep(parameter_dict, **kwargs)
        // First positional arg is the parameter dictionary
        if (positionalNodes[0]) {
          const dictNode = positionalNodes[0];
          if (dictNode.type === 'dictionary') {
            // Inline dictionary literal
            const simulParams = extractSimulSweepDict(dictNode, source, constants);
            params.simul_params = JSON.stringify(simulParams);
          } else if (dictNode.type === 'identifier') {
            // Variable reference - look it up in dictionaries map
            const varName = source.substring(dictNode.startIndex, dictNode.endIndex);
            const dictDefNode = dictionaries.get(varName);
            if (dictDefNode) {
              // Found the dictionary definition - parse it
              const simulParams = extractSimulSweepDict(dictDefNode, source, constants);
              params.simul_params = JSON.stringify(simulParams);
            } else {
              // Dictionary not found in current cell
              params.parameter_dict = varName;
            }
          } else {
            // Some other expression
            params.parameter_dict = positionalArgs[0];
          }
        }
        break;

      case 'GateLeakage':
        // GateLeakage(set_param, track_param, max_I, limit, step, ...)
        if (positionalArgs[0] && !params.set_param) params.set_param = positionalArgs[0];
        if (positionalArgs[1] && !params.track_param) params.track_param = positionalArgs[1];
        if (positionalArgs[2] && !params.max_I) params.max_I = positionalArgs[2];
        if (positionalArgs[3] && !params.limit) params.limit = positionalArgs[3];
        if (positionalArgs[4] && !params.step) params.step = positionalArgs[4];
        break;

      default:
        // For other types, just store first positional as set_param if needed
        if (positionalArgs[0] && !params.set_param) {
          params.set_param = positionalArgs[0];
        }
    }

    console.debug(`[Parser] Mapped params:`, params);
  }

  return params;
}

/**
 * Resolve a value node to a string, substituting constants
 */
function resolveValue(
  node: Parser.SyntaxNode,
  source: string,
  constants: Map<string, string>
): string {
  // If it's an identifier, check if we have a constant for it
  if (node.type === 'identifier') {
    const name = source.substring(node.startIndex, node.endIndex);
    if (constants.has(name)) {
      return constants.get(name)!;
    }
    return name;
  }

  // If it's an attribute (e.g., station.dmm.voltage or instr0.x), handle it
  if (node.type === 'attribute') {
    const text = source.substring(node.startIndex, node.endIndex);
    // Remove common prefixes for cleaner display
    if (text.startsWith('station.')) {
      return text.substring(8); // Remove 'station.' prefix
    }
    return text; // Return as-is for other attributes like instr0.x
  }

  // For literals (integer, float, string, etc.), return the raw text
  if (
    node.type === 'integer' ||
    node.type === 'float' ||
    node.type === 'string' ||
    node.type === 'true' ||
    node.type === 'false' ||
    node.type === 'none'
  ) {
    return source.substring(node.startIndex, node.endIndex);
  }

  // For complex expressions (lists, tuples, calls, etc.), stringify the entire node
  return stringifyNode(node, source);
}

/**
 * Convert any AST node to its source string representation
 */
function stringifyNode(node: Parser.SyntaxNode, source: string): string {
  return source.substring(node.startIndex, node.endIndex);
}

/**
 * Extract parameters from a list/tuple node (for Sweep2D inner/outer sweeps)
 * Returns an array of stringified values
 */
function extractListParams(
  node: Parser.SyntaxNode,
  source: string,
  constants: Map<string, string>
): string[] {
  const params: string[] = [];

  // Handle list or tuple nodes
  if (node.type === 'list' || node.type === 'tuple') {
    for (let i = 0; i < node.namedChildCount; i++) {
      const child = node.namedChild(i);
      if (child) {
        params.push(resolveValue(child, source, constants));
      }
    }
  }

  return params;
}

/**
 * Extract SimulSweep parameter dictionary
 * Parses: {param1: {"start": 0, "stop": 5, "step": 0.02}, param2: {...}}
 */
function extractSimulSweepDict(
  node: Parser.SyntaxNode,
  source: string,
  constants: Map<string, string>
): Array<{ param: string; start: string; stop: string; step: string }> {
  const params: Array<{ param: string; start: string; stop: string; step: string }> = [];

  if (node.type !== 'dictionary') {
    return params;
  }

  // Iterate through dictionary pairs
  for (let i = 0; i < node.namedChildCount; i++) {
    const pair = node.namedChild(i);
    if (!pair || pair.type !== 'pair') continue;

    const keyNode = pair.childForFieldName('key');
    const valueNode = pair.childForFieldName('value');

    if (!keyNode || !valueNode) continue;

    // Extract parameter name from key
    const param = resolveValue(keyNode, source, constants);

    // Extract start/stop/step from value dictionary
    if (valueNode.type === 'dictionary') {
      let start = '';
      let stop = '';
      let step = '';

      for (let j = 0; j < valueNode.namedChildCount; j++) {
        const innerPair = valueNode.namedChild(j);
        if (!innerPair || innerPair.type !== 'pair') continue;

        const innerKey = innerPair.childForFieldName('key');
        const innerValue = innerPair.childForFieldName('value');

        if (!innerKey || !innerValue) continue;

        const keyName = source.substring(innerKey.startIndex, innerKey.endIndex).replace(/['"]/g, '');
        const value = resolveValue(innerValue, source, constants);

        if (keyName === 'start') start = value;
        else if (keyName === 'stop') stop = value;
        else if (keyName === 'step') step = value;
      }

      if (start || stop || step) {
        params.push({ param, start, stop, step });
      }
    }
  }

  return params;
}

/**
 * Structure sweep data into metrics and flags
 */
function structureSweepData(
  type: 'Sweep0D' | 'Sweep1D' | 'Sweep2D' | 'SimulSweep' | 'SweepQueue' | 'GateLeakage',
  params: Record<string, string>
): { metrics: SweepMetrics; flags: SweepFlags; complete: boolean } {
  const metrics: SweepMetrics = {};
  const flags: SweepFlags = {};
  let complete = false;

  // Extract common flags
  if (params.bidirectional === 'True') flags.bidirectional = true;
  if (params.continual === 'True') flags.continual = true;
  if (params.plot_data === 'True') flags.plotData = true;
  if (params.save_data === 'True') flags.saveData = true;

  switch (type) {
    case 'Sweep0D':
      metrics.maxTime = params.max_time;
      metrics.interDelay = params.inter_delay;
      metrics.plotBin = params.plot_bin;
      metrics.xAxisTime = params.x_axis_time;
      complete = true; // Sweep0D has no strictly required params
      break;

    case 'Sweep1D':
      metrics.setParam = params.set_param;
      metrics.start = params.start;
      metrics.stop = params.stop;
      metrics.step = params.step;
      metrics.xAxisTime = params.x_axis_time;
      metrics.interDelay = params.inter_delay;
      complete = !!(metrics.setParam && metrics.start && metrics.stop && metrics.step);
      break;

    case 'Sweep2D':
      // Full list representations
      metrics.innerSweep = params.inner_sweep;
      metrics.outerSweep = params.outer_sweep;

      // Extracted inner sweep parameters
      metrics.innerParam = params.inner_param;
      metrics.innerStart = params.inner_start;
      metrics.innerStop = params.inner_stop;
      metrics.innerStep = params.inner_step;

      // Extracted outer sweep parameters
      metrics.outerParam = params.outer_param;
      metrics.outerStart = params.outer_start;
      metrics.outerStop = params.outer_stop;
      metrics.outerStep = params.outer_step;

      // Complete if we have at least one set of inner or outer params
      complete = !!(
        (metrics.innerParam && metrics.innerStart && metrics.innerStop && metrics.innerStep) ||
        (metrics.outerParam && metrics.outerStart && metrics.outerStop && metrics.outerStep)
      );
      break;

    case 'SimulSweep':
      // Parse the simul_params JSON string
      if (params.simul_params) {
        try {
          const parsedParams = JSON.parse(params.simul_params);
          metrics.simulParams = parsedParams;
          metrics.paramCount = parsedParams.length;

          // Build summary string: "param1 start→stop @step; param2 start→stop @step"
          if (parsedParams.length > 0) {
            metrics.paramSummary = parsedParams
              .map((p: any) => `${p.param} ${p.start}→${p.stop} @${p.step}`)
              .join('; ');
          }

          complete = (metrics.paramCount ?? 0) > 0;
        } catch (e) {
          console.warn('[Parser] Failed to parse SimulSweep params:', e);
          complete = false;
        }
      } else if (params.parameter_dict) {
        // Variable reference - we can't parse it
        metrics.paramSummary = `dict: ${params.parameter_dict}`;
        complete = true; // Assume valid
      }

      // Extract common options
      metrics.interDelay = params.inter_delay;
      metrics.plotBin = params.plot_bin;
      break;

    case 'SweepQueue':
      complete = true;
      break;

    case 'GateLeakage':
      metrics.setParam = params.set_param;
      metrics.trackParam = params.track_param;
      metrics.maxCurrent = params.max_I;
      metrics.limit = params.limit;
      metrics.step = params.step;
      metrics.interDelay = params.inter_delay;
      complete = !!(metrics.setParam && metrics.trackParam && metrics.maxCurrent && metrics.limit && metrics.step);
      flags.isFastSweep = true;
      break;
  }

  return { metrics, flags, complete };
}

/**
 * Detect if a node is inside a loop (for/while)
 * Walks up the parent tree to find loop statements
 */
function detectLoopContext(
  node: Parser.SyntaxNode,
  source: string
): LoopContext | null {
  let current: Parser.SyntaxNode | null = node.parent;

  while (current) {
    if (current.type === 'for_statement') {
      // Extract loop variable and iterable
      // For loop structure: for <left> in <right>:
      const leftNode = current.childForFieldName('left');
      const rightNode = current.childForFieldName('right');

      const variable = leftNode ? source.substring(leftNode.startIndex, leftNode.endIndex) : undefined;
      const iterable = rightNode ? source.substring(rightNode.startIndex, rightNode.endIndex) : undefined;

      return {
        type: 'for',
        variable,
        iterable
      };
    }

    if (current.type === 'while_statement') {
      // Extract condition
      const conditionNode = current.childForFieldName('condition');
      const condition = conditionNode
        ? source.substring(conditionNode.startIndex, conditionNode.endIndex)
        : undefined;

      return {
        type: 'while',
        condition
      };
    }

    current = current.parent;
  }

  return null;
}

/**
 * Detect if a node is inside a function definition
 * Walks up the parent tree to find function_definition
 */
function detectFunctionContext(
  node: Parser.SyntaxNode,
  source: string
): FunctionContext | null {
  let current: Parser.SyntaxNode | null = node.parent;

  while (current) {
    if (current.type === 'function_definition') {
      // Extract function name
      const nameNode = current.childForFieldName('name');
      const name = nameNode ? source.substring(nameNode.startIndex, nameNode.endIndex) : 'unknown';

      // Check if it's an async function
      const isAsync = current.children.some(child => child.type === 'async');

      return {
        name,
        isAsync
      };
    }

    current = current.parent;
  }

  return null;
}

/**
 * Queue entry from parsing sq += (...) statements
 */
export interface QueueEntry {
  queueVariable: string; // e.g., "sq"
  position: number; // 0-indexed position
  sweepVariable: string; // e.g., "s_1D"
  database?: {
    name: string;
    experiment: string;
    sample: string;
  };
}

/**
 * Extract queue entries (sq += ...) from AST
 * Parses patterns like: sq += (DatabaseEntry(...), sweep_obj)
 * @param dictionaries - Variable assignments for resolving DatabaseEntry references
 */
function extractQueueEntries(
  node: Parser.SyntaxNode,
  source: string,
  dictionaries: Map<string, Parser.SyntaxNode>
): QueueEntry[] {
  const entries: QueueEntry[] = [];
  const queuePositions = new Map<string, number>(); // Track position per queue variable

  // Extract DatabaseEntry variable assignments for resolution
  const dbEntries = extractDatabaseEntries(node, source);

  const cursor = node.walk();
  let reachedRoot = false;

  while (!reachedRoot) {
    // Look for augmented assignment (+=)
    if (cursor.nodeType === 'augmented_assignment') {
      const assignNode = cursor.currentNode();
      const left = assignNode.childForFieldName('left');
      const right = assignNode.childForFieldName('right');
      const operator = assignNode.childForFieldName('operator');

      if (
        left &&
        right &&
        operator &&
        left.type === 'identifier' &&
        operator.text === '+='
      ) {
        const queueVar = source.substring(left.startIndex, left.endIndex);

        // Get current position for this queue
        const position = queuePositions.get(queueVar) || 0;
        queuePositions.set(queueVar, position + 1);

        // Parse the right side - should be a tuple (DatabaseEntry(...), sweep_obj)
        const entry = parseQueueAddition(right, source, queueVar, position, dbEntries);
        if (entry) {
          entries.push(entry);
        }
      }
    }

    if (cursor.gotoFirstChild()) {
      continue;
    }

    while (!cursor.gotoNextSibling()) {
      if (!cursor.gotoParent()) {
        reachedRoot = true;
        break;
      }
    }
  }

  return entries;
}

/**
 * Parse a queue addition right-hand side
 * Handles: (DatabaseEntry(...), sweep_obj) or (db_var, sweep_obj) or just sweep_obj
 */
function parseQueueAddition(
  node: Parser.SyntaxNode,
  source: string,
  queueVar: string,
  position: number,
  dbEntries: Map<string, { name: string; experiment: string; sample: string }>
): QueueEntry | null {
  let sweepVariable: string | null = null;
  let database: { name: string; experiment: string; sample: string } | undefined;

  // Case 1: Tuple (DatabaseEntry(...), sweep_obj) or (db_var, sweep_obj)
  if (node.type === 'tuple' || node.type === 'parenthesized_expression') {
    const children = [];
    for (let i = 0; i < node.namedChildCount; i++) {
      const child = node.namedChild(i);
      if (child) children.push(child);
    }

    // Look for DatabaseEntry (inline call or variable reference)
    for (const child of children) {
      if (child.type === 'call') {
        const funcNode = child.childForFieldName('function');
        if (funcNode && funcNode.text === 'DatabaseEntry') {
          // Inline DatabaseEntry call
          const argsNode = child.childForFieldName('arguments');
          if (argsNode) {
            database = parseDatabaseEntry(argsNode, source);
          }
        }
      } else if (child.type === 'identifier') {
        const varName = source.substring(child.startIndex, child.endIndex);

        // Check if this identifier is a DatabaseEntry variable reference
        // Look for: db_var = DatabaseEntry(...)
        if (dbEntries.has(varName)) {
          database = dbEntries.get(varName);
        } else {
          // Otherwise it's the sweep variable
          sweepVariable = varName;
        }
      }
    }
  }
  // Case 2: Just sweep object (no database)
  else if (node.type === 'identifier') {
    sweepVariable = source.substring(node.startIndex, node.endIndex);
  }

  if (sweepVariable) {
    return {
      queueVariable: queueVar,
      position,
      sweepVariable,
      database,
    };
  }

  return null;
}

/**
 * Parse DatabaseEntry arguments
 * Expects: DatabaseEntry(database_name, exp_name, sample_name)
 */
function parseDatabaseEntry(
  argsNode: Parser.SyntaxNode,
  source: string
): { name: string; experiment: string; sample: string } | undefined {
  const args: string[] = [];

  for (let i = 0; i < argsNode.namedChildCount; i++) {
    const child = argsNode.namedChild(i);
    if (child) {
      // Extract string value (remove quotes)
      let value = source.substring(child.startIndex, child.endIndex);
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      args.push(value);
    }
  }

  if (args.length >= 3) {
    return {
      name: args[0],
      experiment: args[1],
      sample: args[2],
    };
  }

  return undefined;
}

/**
 * Link sweeps to queue entries
 * Updates sweep.queue metadata based on queue entries
 */
function linkSweepsToQueue(sweeps: ParsedSweep[], queueEntries: QueueEntry[]): void {
  // Build a map of sweep variable -> queue entry
  const sweepToQueue = new Map<string, QueueEntry>();
  for (const entry of queueEntries) {
    sweepToQueue.set(entry.sweepVariable, entry);
  }

  // Count total sweeps per queue variable
  const queueCounts = new Map<string, number>();
  for (const entry of queueEntries) {
    const current = queueCounts.get(entry.queueVariable) || 0;
    queueCounts.set(entry.queueVariable, current + 1);
  }

  // Update sweeps with queue metadata
  for (const sweep of sweeps) {
    const queueEntry = sweepToQueue.get(sweep.name);
    if (queueEntry) {
      const totalInQueue = queueCounts.get(queueEntry.queueVariable) || 0;
      sweep.queue = {
        queueVariable: queueEntry.queueVariable,
        position: queueEntry.position,
        totalInQueue,
        database: queueEntry.database,
      };
    }
  }
}

/**
 * Detect fast sweep patterns (Sweepto)
 * GateLeakage is detected directly from the constructor now
 */
function detectFastSweeps(sweeps: ParsedSweep[]): void {
  for (const sweep of sweeps) {
    // Sweepto pattern: Sweep1D with start=current_value or start=param.get()
    if (sweep.type === 'sweep1d') {
      const startValue = sweep.metrics.start || '';
      if (
        startValue.includes('current_value') ||
        startValue.includes('.get()') ||
        startValue.includes('get_latest()')
      ) {
        sweep.type = 'sweepto';
        sweep.flags.isFastSweep = true;
        sweep.notes = 'Fast sweep to setpoint';
      }
    }
  }
}

/**
 * Simple string hash for caching
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

# Changelog

All notable changes to the QMeasure Jupyter extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-11-10

### Added

#### Queue Manager (Phase 3)
- **Queue Manager Widget** - Right sidebar panel for managing sweep queues
- **Build Sweep Queues** - Add sweeps to execution queues with "Add to Queue" button in forms
- **Edit Queue Entries** - Modify queued sweeps with form auto-fill and visual editing banner
- **Reorder Queue Entries** - Move entries up/down in queue with position controls
- **Duplicate Queue Entries** - Clone existing queue entries with one click
- **Delete Queue Entries** - Remove entries from queue with confirmation
- **Export Queue Scripts** - Generate complete, runnable Python code for entire queue
- **Database Integration** - Full support for DatabaseEntry configuration in queued sweeps
- **Multi-Cell Queue Support** - Build queues across multiple notebook cells

#### Fast Sweeps (Phase 4)
- **Fast Sweeps Tab** - New dedicated tab in Sweep Manager for quick measurements
- **Sweepto Template** - Quick sweep from current value to target setpoint
  - Automatically reads current parameter value
  - Optimized defaults: `save_data=False`, `plot_data=True`, `plot_bin=1`
  - Generates efficient Sweep1D with minimal configuration
- **GateLeakage Template** - Safe gate voltage sweeps with current monitoring
  - Automatic sweep termination if current exceeds threshold
  - Built-in safety limits for sensitive devices
  - Configurable tracking parameter and inter-step delay

#### Queue Analytics (Phase 5)
- **Cross-Cell Tracking** - Detects sweeps and queue entries across all notebook cells
- **Queue Position Display** - Shows "Position X of Y" for queued sweeps in details panel
- **Two-Pass Parser** - Notebook-wide analysis aggregates queue entries before linking sweeps
- **DatabaseEntry Variable Resolution** - Supports both inline `DatabaseEntry(...)` and variable references
- **Loop Context Detection** - Identifies sweeps defined inside FOR/WHILE loops
  - Shows loop type (FOR/WHILE)
  - Displays iteration variable and iterable (FOR loops)
  - Displays loop condition (WHILE loops)
- **Function Context Detection** - Tracks sweeps defined inside function definitions
  - Shows function name
  - Indicates async functions
- **Fast Sweep Recognition** - Automatically identifies Sweepto and GateLeakage patterns with badges

#### Documentation
- **Comprehensive USAGE.md** - Complete user guide with workflow examples
  - Fast Sweeps documentation with Sweepto and GateLeakage examples
  - Queue Manager documentation with multi-cell workflows
  - Queue Analytics documentation with context detection examples
  - Cross-cell linking explanation
- **Enhanced README.md** - Updated feature summary with all new capabilities
- **Updated TODO.md** - Marked Phases 3-7 as complete

### Fixed

#### Critical Bug Fixes
- **Cross-Cell Queue Linking** - Fixed sweeps defined in one cell not linking to queue entries in another cell
  - Implemented two-pass notebook-wide parsing approach
  - First pass collects all queue entries from all cells
  - Second pass parses sweeps with complete queue context
- **Queue Position Accumulation** - Fixed queue positions resetting to 0 per-cell instead of accumulating notebook-wide
  - Moved position counter to notebook level
  - Positions now correctly accumulate: Cell 1 (position 1) → Cell 2 (position 2) → Cell 3 (positions 3-5)
- **DatabaseEntry Variable Resolution** - Fixed parser only recognizing inline `DatabaseEntry(...)` syntax
  - Added `extractDatabaseEntries()` to scan for DatabaseEntry variable assignments
  - Parser now resolves variable references like `db_entry = DatabaseEntry(...); sq += (db_entry, sweep)`
- **Analytics Metadata Visibility** - Fixed loop/function context metadata not appearing in UI
  - Added dedicated Loop Context section in details panel
  - Added dedicated Function Context section in details panel
  - Enhanced queue badge to show "position X of Y"

### Changed
- **Parser Architecture** - Refactored to support notebook-wide analysis
  - Added `extractQueueEntriesFromSource()` for lightweight queue scanning
  - Modified `parseSweeps()` to accept optional `notebookQueueEntries` parameter
  - Enhanced `linkSweepsToQueue()` to count total sweeps per queue variable
- **Details Panel Layout** - Reorganized to display analytics metadata
  - Queue badges show total count
  - Dedicated sections for loop and function context
  - Fast sweep badges for Sweepto and GateLeakage patterns

### Technical Details
- Tree-sitter AST parsing for accurate Python code analysis
- Parent tree walking for loop/function context detection
- Two-pass notebook scanning for cross-cell queue linking
- Deep cloning with `structuredClone` for queue entry duplication
- localStorage persistence for form state management

## [0.1.0] - 2025-10-XX

### Added
- Initial release
- **Sweep Manager Widget** - Left sidebar panel with form tabs
- **Sweep Forms** - Sweep0D, Sweep1D, Sweep2D, SimulSweep
- **Code Generation** - Generate production-ready Python code from forms
- **Custom Parameters** - Add arbitrary keyword arguments to sweep constructors
- **Follow Parameters** - Support for multiple follow parameters
- **Form Persistence** - Automatic save/restore of form inputs to localStorage
- **Table of Contents** - Automatic detection of sweep definitions in notebooks
- **Details Panel** - Right sidebar showing sweep configuration details
- **Tree-sitter Parser** - AST-based Python code parsing for sweep detection
- **Basic Documentation** - README, USAGE, DEVELOPMENT guides

---

For full documentation, see [USAGE.md](USAGE.md) and [README.md](README.md).

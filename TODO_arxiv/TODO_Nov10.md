# QMeasure Jupyter - Development TODO

## ✅ Week 1: Environment Setup & Scaffold (COMPLETED)
- [x] Initialize project with modern hybrid structure
- [x] Set up TypeScript/React/webpack build pipeline
- [x] Create basic sidebar panel that renders in JupyterLab
- [x] Verify build workflow: `jlpm build` → `pip install -e .`
- [x] Fixed Yarn PnP compatibility issue (switched to node-modules)
- [x] Successfully installed and verified extension in JupyterLab

## ✅ Week 2: Core UI Components (COMPLETED)
- [x] Build SweepManager with tabbed interface
- [x] Create forms for Sweep0D, Sweep1D, Sweep2D
- [x] Implement text inputs for all parameters
- [x] Add client-side validation (numbers, required fields, non-blocking)
- [x] Add "Custom Parameters" key-value component

## ✅ Week 3: Code Generation & Integration (COMPLETED)
- [x] Implement static code templates
- [x] Add template parameter substitution with _required placeholders
- [x] Integrate JupyterLab cell insertion API
- [x] Added toPython() helper for proper Python literal conversion
- [x] Non-blocking validation - generates code even with missing required fields

## 📅 Week 4: Polish & Release
- [x] Custom Parameters component (key-value pairs)
- [x] Integrate custom params into all sweep forms (Sweep0D, Sweep1D, Sweep2D, SimulSweep)
- [x] Update all code generators to pass custom params as constructor kwargs
- [x] Add tooltips and help text (help icons with hover tooltips)
- [x] Implement form persistence (localStorage with reset button)
- [x] Write basic documentation (USAGE.md + enhanced README.md)
- [x] Package and test installation
- [x] Release v0.1.0 to lab for testing

## Current Status

### What's Working
- ✅ Complete JupyterLab extension with sidebar panel
- ✅ Sweep0D, Sweep1D, Sweep2D, SimulSweep forms with all MeasureIt parameters
- ✅ Code generation with _required placeholders for missing fields
- ✅ Direct insertion into Jupyter notebook cells
- ✅ Non-blocking validation (shows errors but still generates code)
- ✅ Proper Python boolean/literal conversion (True/False)
- ✅ SimulSweep form with exactly 2 parameters (required)
- ✅ Deferred start infrastructure for database integration
- ✅ Right sidebar panel for sweep details display
- ✅ Tree-sitter Python parser for sweep detection in notebooks
- ✅ Table of Contents with sweep entries (📍📊🗺️🔄 icons)
- ✅ Positional and keyword argument detection
- ✅ Sweep2D list parameter support
- ✅ Dictionary variable tracking for SimulSweep parameter extraction
- ✅ SimulSweep details panel with parameter table
- ✅ Custom Parameters component with key-value pairs (all forms integrated)
- ✅ Custom parameters passed as constructor kwargs (not method calls)
- ✅ Follow parameters without automatic "station." prefix
- ✅ Form persistence via localStorage with Reset to Defaults button
- ✅ Help icons (?) with hover tooltips on all form fields
- ✅ Comprehensive documentation (README.md + USAGE.md)

### Known Issues
- None currently blocking functionality

### Next Steps
1. Package and test installation process
2. Release v0.1.0 to lab for user testing
3. Gather feedback and iterate on UX
4. Consider Phase 2 features (database integration, live parameter detection)

## Notes
- Using node-modules instead of Yarn PnP for JupyterLab compatibility
- TypeScript configured with `skipLibCheck: true` to avoid dependency type errors
- Extension runs in development mode with symlinked labextension directory

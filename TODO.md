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
- [x] Update all code generators to emit custom_param() calls
- [ ] Add tooltips and help text
- [ ] Implement form persistence (localStorage)
- [ ] Write basic documentation
- [ ] Package and test installation
- [ ] Release v0.1.0 to lab for testing

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
- ✅ Table of Contents with sweep entries (🔄 icon for SimulSweep)
- ✅ Positional and keyword argument detection
- ✅ Sweep2D list parameter support
- ✅ Dictionary variable tracking for SimulSweep parameter extraction
- ✅ SimulSweep details panel with parameter table
- ✅ Custom Parameters component with key-value pairs (all forms integrated)
- ✅ Code generators emit sweep.custom_param() calls for all sweep types

### Known Issues
- None currently blocking functionality

### Next Steps
1. Test the extension in JupyterLab (hard refresh: Cmd+Shift+R)
2. Verify generated code works with MeasureIt
3. Optional: Add tooltips/help text (Week 4)
4. Optional: Implement form persistence (Week 4)

## Notes
- Using node-modules instead of Yarn PnP for JupyterLab compatibility
- TypeScript configured with `skipLibCheck: true` to avoid dependency type errors
- Extension runs in development mode with symlinked labextension directory

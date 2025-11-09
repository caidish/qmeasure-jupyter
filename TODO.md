# QMeasure Jupyter - Development TODO

## ✅ Week 1: Environment Setup & Scaffold (COMPLETED)
- [x] Initialize project with modern hybrid structure
- [x] Set up TypeScript/React/webpack build pipeline
- [x] Create basic sidebar panel that renders in JupyterLab
- [x] Verify build workflow: `jlpm build` → `pip install -e .`
- [x] Fixed Yarn PnP compatibility issue (switched to node-modules)
- [x] Successfully installed and verified extension in JupyterLab

## 🚧 Week 2: Core UI Components (IN PROGRESS)
- [ ] Build SweepManager with tabbed interface (basic structure done)
- [ ] Create forms for Sweep0D, Sweep1D, Sweep2D
- [ ] Implement text inputs for all parameters (no dropdowns yet)
- [ ] Add client-side validation (numbers, required fields)
- [ ] Add "Custom Parameters" key-value component

## 📅 Week 3: Code Generation & Integration
- [ ] Implement static code templates
- [ ] Add template parameter substitution
- [ ] Integrate JupyterLab cell insertion API
- [ ] Add "Copy to Clipboard" fallback option
- [ ] Test with real MeasureIt code execution

## 📅 Week 4: Polish & Release
- [ ] Add tooltips and help text
- [ ] Implement form persistence (localStorage)
- [ ] Write basic documentation
- [ ] Package and test installation
- [ ] Release v0.1.0 to lab for testing

## Current Status

### What's Working
- ✅ Project structure initialized
- ✅ TypeScript/React build pipeline configured
- ✅ Basic sidebar widget renders in JupyterLab
- ✅ Tab interface for sweep types (Sweep0D, Sweep1D, Sweep2D, SimulSweep)
- ✅ Extension successfully installed and enabled

### Known Issues
- None currently

### Next Immediate Steps
1. Create form input components for each sweep type
2. Implement parameter input fields based on TODO_plugin.md specifications
3. Add form validation logic
4. Create custom parameters component

## Notes
- Using node-modules instead of Yarn PnP for JupyterLab compatibility
- TypeScript configured with `skipLibCheck: true` to avoid dependency type errors
- Extension runs in development mode with symlinked labextension directory

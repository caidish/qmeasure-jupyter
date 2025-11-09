# QMeasure-Jupyter: Standalone JupyterLab Extension for MeasureIt

## Project Overview

A **standalone** JupyterLab extension package (`qmeasure-jupyter`) that provides a beginner-friendly GUI for the MeasureIt/QMeasure sweep measurement package. This extension is a **separate package** that installs alongside MeasureIt without any structural conflicts.

## 🚀 Phase 1: MVP - Static Code Generator (Weeks 1-4)

### Core Functionality (Simplified - No Kernel Communication)
- Left sidebar panel labeled "Sweep Manager"
- Template-based code generation for Sweep0D, Sweep1D, Sweep2D, and SimulSweep
- **Manual parameter entry** (text inputs, no auto-discovery)
- Form validation on client-side only
- One-click code insertion into new Jupyter cells
- **100% offline-capable** - no kernel dependency

### Tech Stack

#### Frontend (Self-Contained)
- **Language**: TypeScript 5.0+
- **Framework**: React 18+ with Hooks
- **UI Components**: JupyterLab UI Components + custom React components
- **Styling**: CSS Modules with JupyterLab theme variables
- **State Management**: React Context API (consider Zustand for Phase 2)
- **Build Tools**: webpack 5, jlpm (JupyterLab's yarn)

#### No Backend Required for MVP
- **JupyterLab API**: Version 4.0+ (for UI integration only)
- ~~**Kernel Communication**: Deferred to Phase 2~~
- **Static Templates**: TypeScript-based code generation

### Project Structure (Standalone Package)

```
qmeasure-jupyter/                   # SEPARATE REPOSITORY
├── pyproject.toml                  # Python package metadata
├── package.json                    # NPM package configuration
├── tsconfig.json                   # TypeScript configuration
├── webpack.config.js               # Webpack bundling config
├── README.md                       # User documentation
├── DEVELOPMENT.md                  # Developer documentation
├── LICENSE                         # MIT or similar
├── src/                           # TypeScript source
│   ├── index.ts                   # Extension entry point
│   ├── plugin.ts                  # JupyterLab plugin definition
│   ├── components/                # React components
│   │   ├── SweepManager.tsx      # Main sidebar component
│   │   ├── SweepForm.tsx         # Parameter input form
│   │   ├── TemplateSelector.tsx  # Sweep type selector
│   │   ├── ParameterInput.tsx    # Individual parameter inputs
│   │   └── CustomParams.tsx      # Key-value custom parameters
│   ├── templates/                 # Code templates
│   │   ├── sweep0d.ts            # Sweep0D template
│   │   ├── sweep1d.ts            # Sweep1D template
│   │   ├── sweep2d.ts            # Sweep2D template
│   │   └── simulsweep.ts         # SimulSweep template
│   ├── services/                  # Business logic (MVP simplified)
│   │   ├── CodeGenerator.ts      # Template to code conversion
│   │   └── ValidationService.ts  # Client-side validation only
│   │   # KernelService.ts - DEFERRED TO PHASE 2
│   ├── types/                     # TypeScript type definitions
│   │   └── index.d.ts
│   └── styles/                    # CSS modules
│       └── index.css
├── lib/                           # Compiled JavaScript (gitignored)
├── qmeasure_jupyter/              # Python package wrapper
│   ├── __init__.py
│   └── labextension/              # Built JS assets (auto-generated)
│       ├── package.json
│       └── static/                # Bundled JavaScript
└── tests/                         # Test files
    ├── unit/
    └── integration/
```

## Implementation Roadmap (Revised for Faster MVP)

### Week 1: Environment Setup & Scaffold
- [ ] Initialize project with modern hybrid structure
- [ ] Set up TypeScript/React/webpack build pipeline
- [ ] Create basic sidebar panel that renders in JupyterLab
- [ ] Verify build workflow: `jlpm build` → `pip install -e .`

### Week 2: Core UI Components
- [ ] Build SweepManager with tabbed interface
- [ ] Create forms for Sweep0D, Sweep1D, Sweep2D
- [ ] Implement text inputs for all parameters (no dropdowns yet)
- [ ] Add client-side validation (numbers, required fields)
- [ ] Add "Custom Parameters" key-value component

### Week 3: Code Generation & Integration
- [ ] Implement static code templates
- [ ] Add template parameter substitution
- [ ] Integrate JupyterLab cell insertion API
- [ ] Add "Copy to Clipboard" fallback option
- [ ] Test with real MeasureIt code execution

### Week 4: Polish & Release
- [ ] Add tooltips and help text
- [ ] Implement form persistence (localStorage)
- [ ] Write basic documentation
- [ ] Package and test installation
- [ ] Release v0.1.0 to lab for testing

## Detailed Component Specifications (MVP Simplified)

### 1. SweepManager Component (No Kernel Dependency)

```typescript
interface SweepManagerProps {
  notebookTracker: INotebookTracker;
  // No kernel prop needed for MVP
}

interface SweepManagerState {
  selectedSweepType: 'sweep0d' | 'sweep1d' | 'sweep2d' | 'simulsweep';
  parameters: Record<string, any>;
  customParams: Array<{key: string, value: string}>;
  isGenerating: boolean;
  error: string | null;
}
```

**MVP Features:**
- Tabbed interface for different sweep types
- Simple text/number inputs (no parameter discovery)
- Client-side validation only
- Code preview panel
- "Add Custom Parameter" button
- Copy to clipboard button (backup for cell insertion)

### 2. Parameter Input System (Based on Actual MeasureIt API)

```typescript
interface SweepParameter {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'parameter' | 'boolean' | 'time';
  default: any;
  required: boolean;
  help: string;
  validator?: (value: any) => boolean | string;
  unit?: string;  // For display purposes
}

// Based on actual MeasureIt API from base_sweep.py
interface BaseSweepParameters {
  inter_delay: number;      // Time between data points (default: 0.1)
  save_data: boolean;       // Save to database (default: true)
  plot_data: boolean;       // Live plotting (default: true)
  plot_bin: number;        // Points before plot refresh (default: 1)
  complete_func?: string;   // Function to call on completion
  suppress_output: boolean; // Suppress console output (default: false)
}

// From sweep0d.py: __init__(self, max_time=1e6, *args, **kwargs)
interface Sweep0DParameters extends BaseSweepParameters {
  max_time: number;        // Cutoff time in seconds (default: 1e6)
  follow_params: string[]; // Parameters to track
}

// From sweep1d.py: __init__(self, set_param, start, stop, step, ...)
interface Sweep1DParameters extends BaseSweepParameters {
  set_param: string;       // QCoDeS parameter to sweep
  start: number;           // Start value
  stop: number;            // End value
  step: number;            // Step size
  bidirectional: boolean;  // Sweep both directions (default: false)
  continual: boolean;      // Continuous sweep (default: false)
  x_axis_time: number;     // 0=param, 1=time on x-axis (default: 0)
  err: number;            // Tolerance for rounding (default: 0.01)
  back_multiplier: number; // Step scale after flip (default: 1)
  follow_params: string[]; // Parameters to track
}

// From sweep2d.py: __init__(self, in_params, out_params, ...)
interface Sweep2DParameters extends BaseSweepParameters {
  // Inner sweep parameters [param, start, stop, step]
  in_param: string;
  in_start: number;
  in_stop: number;
  in_step: number;

  // Outer sweep parameters [param, start, stop, step]
  out_param: string;
  out_start: number;
  out_stop: number;
  out_step: number;

  outer_delay: number;     // Delay between outer points
  out_ministeps: number;   // Steps to reach outer setpoint (default: 1)
  err: number;            // Tolerance (default: 0.01)
  back_multiplier: number; // Step scale factor (default: 1)
  update_func?: string;    // Function after inner sweep
  follow_params: string[]; // Parameters to track
}
```

### 3. Code Templates (Based on Actual MeasureIt API)

#### Sweep0D Template
```python
# Generated Sweep0D - Time-based measurement
from measureit.sweep import Sweep0D
import qcodes as qc

# Get station
station = qc.Station.default

# Initialize sweep
sweep = Sweep0D(
    max_time=${max_time},  # seconds
    inter_delay=${inter_delay},  # delay between points
    plot_data=${plot_data},
    save_data=${save_data},
    plot_bin=${plot_bin},
    suppress_output=${suppress_output}
)

# Add parameters to follow
${follow_params.map(p => `sweep.follow_param(station.${p})`).join('\n')}

# Start sweep
sweep.start()
```

#### Sweep1D Template
```python
# Generated Sweep1D - Single parameter sweep
from measureit.sweep import Sweep1D
import qcodes as qc

# Get station and parameter
station = qc.Station.default
set_param = station.${set_param}

# Initialize sweep
sweep = Sweep1D(
    set_param=set_param,
    start=${start},
    stop=${stop},
    step=${step},
    bidirectional=${bidirectional},
    continual=${continual},
    x_axis_time=${x_axis_time},
    err=${err},
    inter_delay=${inter_delay},
    plot_data=${plot_data},
    save_data=${save_data},
    plot_bin=${plot_bin},
    back_multiplier=${back_multiplier},
    suppress_output=${suppress_output}
)

# Add parameters to follow
${follow_params.map(p => `sweep.follow_param(station.${p})`).join('\n')}

# Optional: Set completion function
${complete_func ? `sweep.set_complete_func(${complete_func})` : '# No completion function set'}

# Start sweep
sweep.start()
```

#### Sweep2D Template
```python
# Generated Sweep2D - 2D parameter sweep
from measureit.sweep import Sweep2D
import qcodes as qc

# Get station and parameters
station = qc.Station.default

# Define inner sweep parameters
in_params = [
    station.${in_param},  # parameter
    ${in_start},  # start
    ${in_stop},   # stop
    ${in_step}    # step
]

# Define outer sweep parameters
out_params = [
    station.${out_param},  # parameter
    ${out_start},  # start
    ${out_stop},   # stop
    ${out_step}    # step
]

# Initialize sweep
sweep = Sweep2D(
    in_params=in_params,
    out_params=out_params,
    inter_delay=${inter_delay},
    outer_delay=${outer_delay},
    save_data=${save_data},
    plot_data=${plot_data},
    plot_bin=${plot_bin},
    back_multiplier=${back_multiplier},
    out_ministeps=${out_ministeps},
    err=${err},
    suppress_output=${suppress_output}
)

# Add parameters to follow
${follow_params.map(p => `sweep.follow_param(station.${p})`).join('\n')}

# Optional: Set update function (called after inner sweep)
${update_func ? `sweep.set_update_func(${update_func})` : '# No update function set'}

# Optional: Set completion function (called after outer sweep)
${complete_func ? `sweep.set_complete_func(${complete_func})` : '# No completion function set'}

# Start sweep
sweep.start()
```

#### SimulSweep Template (Bonus - Multiple parameters simultaneously)
```python
# Generated SimulSweep - Sweep multiple parameters simultaneously
from measureit.sweep import SimulSweep
import qcodes as qc

# Get station
station = qc.Station.default

# Define parameters to sweep simultaneously
params = {
    ${Object.entries(params).map(([name, vals]) =>
      `station.${name}: {"start": ${vals.start}, "stop": ${vals.stop}, "step": ${vals.step}}`
    ).join(',\n    ')}
}

# Initialize sweep
sweep = SimulSweep(
    _p=params,
    ${n_steps ? `n_steps=${n_steps},  # Override individual steps` : ''}
    err=${err},
    bidirectional=${bidirectional},
    continual=${continual},
    inter_delay=${inter_delay},
    plot_data=${plot_data},
    save_data=${save_data},
    plot_bin=${plot_bin},
    suppress_output=${suppress_output}
)

# Add parameters to follow
${follow_params.map(p => `sweep.follow_param(station.${p})`).join('\n')}

# Start sweep
sweep.start()
```

### 4. Form Configuration (MVP - Manual Entry)

```typescript
// Form field definitions for each sweep type - MVP uses text inputs
const SWEEP_FORMS = {
  sweep0d: [
    { name: 'max_time', label: 'Max Time (s)', type: 'number', default: 60, min: 0, required: true,
      help: 'Duration of the time-based measurement in seconds' },
    { name: 'inter_delay', label: 'Delay Between Points (s)', type: 'number', default: 0.1, min: 0.001,
      help: 'Time to wait between data points' },
    { name: 'save_data', label: 'Save to Database', type: 'checkbox', default: true },
    { name: 'plot_data', label: 'Live Plotting', type: 'checkbox', default: true },
    { name: 'plot_bin', label: 'Plot Bin Size', type: 'number', default: 1, min: 1,
      help: 'Number of points to collect before updating plot' },
    { name: 'follow_params', label: 'Parameters to Track', type: 'textarea', default: '',
      help: 'Enter parameters (e.g., dmm.voltage, keithley.current) one per line' },
    { name: 'suppress_output', label: 'Suppress Output', type: 'checkbox', default: false }
  ],

  sweep1d: [
    { name: 'set_param', label: 'Parameter to Sweep', type: 'text', required: true,
      help: 'Enter parameter path (e.g., keithley.voltage)' },
    { name: 'start', label: 'Start Value', type: 'number', required: true },
    { name: 'stop', label: 'Stop Value', type: 'number', required: true },
    { name: 'step', label: 'Step Size', type: 'number', required: true,
      help: 'Step will auto-adjust sign based on start/stop' },
    { name: 'bidirectional', label: 'Bidirectional', type: 'boolean', default: false,
      help: 'Sweep back and forth' },
    { name: 'continual', label: 'Continuous', type: 'boolean', default: false },
    { name: 'x_axis_time', label: 'X-Axis', type: 'select', default: 0,
      options: [{value: 0, label: 'Parameter'}, {value: 1, label: 'Time'}] },
    { name: 'err', label: 'Error Tolerance', type: 'number', default: 0.01, min: 0,
      help: 'Tolerance for rounding errors' },
    { name: 'back_multiplier', label: 'Back Multiplier', type: 'number', default: 1,
      help: 'Step size multiplier after direction change' },
    // Inherit base parameters
    ...BASE_FORM_FIELDS
  ],

  sweep2d: [
    // Inner sweep
    { name: 'in_param', label: 'Inner Parameter', type: 'text', required: true,
      group: 'Inner Sweep', help: 'e.g., gate.voltage' },
    { name: 'in_start', label: 'Inner Start', type: 'number', required: true, group: 'Inner Sweep' },
    { name: 'in_stop', label: 'Inner Stop', type: 'number', required: true, group: 'Inner Sweep' },
    { name: 'in_step', label: 'Inner Step', type: 'number', required: true, group: 'Inner Sweep' },

    // Outer sweep
    { name: 'out_param', label: 'Outer Parameter', type: 'text', required: true,
      group: 'Outer Sweep', help: 'e.g., magnet.field' },
    { name: 'out_start', label: 'Outer Start', type: 'number', required: true, group: 'Outer Sweep' },
    { name: 'out_stop', label: 'Outer Stop', type: 'number', required: true, group: 'Outer Sweep' },
    { name: 'out_step', label: 'Outer Step', type: 'number', required: true, group: 'Outer Sweep' },

    { name: 'outer_delay', label: 'Outer Delay (s)', type: 'number', default: 0.1, min: 0 },
    { name: 'out_ministeps', label: 'Outer Mini-steps', type: 'number', default: 1, min: 1,
      help: 'Steps to reach outer setpoint' },
    { name: 'err', label: 'Error Tolerance', type: 'number', default: 0.01, min: 0 },
    { name: 'update_func', label: 'Update Function', type: 'text', required: false,
      help: 'Function to call after each inner sweep' },
    // Inherit base parameters
    ...BASE_FORM_FIELDS
  ]
};

// Common fields shared across sweep types
const BASE_FORM_FIELDS = [
  { name: 'inter_delay', label: 'Inter Delay (s)', type: 'number', default: 0.1, min: 0 },
  { name: 'save_data', label: 'Save Data', type: 'boolean', default: true },
  { name: 'plot_data', label: 'Plot Data', type: 'boolean', default: true },
  { name: 'plot_bin', label: 'Plot Bin', type: 'number', default: 1, min: 1 },
  { name: 'follow_params', label: 'Follow Parameters', type: 'textarea', default: '',
    help: 'Enter one parameter per line (e.g., dmm.voltage)' },
  { name: 'complete_func', label: 'Completion Function', type: 'text', required: false },
  { name: 'suppress_output', label: 'Suppress Output', type: 'boolean', default: false }
];
```

## 🎯 Phase 2: Kernel-Aware Features (Weeks 5-8)

### Features to Add
- **Parameter Auto-Discovery**: Query QCoDeS station for available parameters
- **Dropdown Menus**: Replace text inputs with validated dropdowns
- **Live Parameter Validation**: Check if parameters exist and are settable
- **Intelligent Defaults**: Suggest values based on parameter ranges
- **Real-time Sweep Monitoring**: Show sweep progress and current values

### Kernel Communication Service (Phase 2)

```typescript
// DEFERRED TO PHASE 2 - Not needed for MVP
class KernelService {
  async getAvailableParameters(): Promise<string[]> {
    // Query kernel for QCoDeS station parameters
    const code = `
      import qcodes as qc
      import json
      station = qc.Station.default
      params = []
      if station:
          for comp_name, comp in station.components.items():
              for param_name, param in comp.parameters.items():
                  params.append(f"{comp_name}.{param_name}")
      print(json.dumps(params))
    `;
    return await this.executeCode(code);
  }

  async validateParameter(paramName: string): Promise<boolean> {
    // Validate parameter exists and is settable
  }

  private async executeCode(code: string): Promise<any> {
    // Handle async kernel execution
  }
}
```

## 📊 Phase 3: Advanced Features (Future)

### Additional Features
- Real-time sweep progress visualization
- Live data plots embedded in sidebar
- Pause/resume/stop controls
- Sweep history and re-run capability

### Technical Requirements
- WebSocket connection for real-time updates
- D3.js or Plotly.js for data visualization
- State persistence across JupyterLab sessions

## Phase 3: SweepQueue Manager (Future)

### Additional Features
- Visual queue builder with drag-and-drop
- Queue execution monitoring
- Template saving and sharing
- Advanced scheduling options

### Technical Requirements
- IndexedDB for local storage
- Advanced React state management (Redux/MobX)
- Server-side queue persistence option

## Development Workflow (Standalone Package)

### Initial Setup
```bash
# Create separate project repository
mkdir qmeasure-jupyter && cd qmeasure-jupyter
git init

# Initialize package.json
jlpm init -y

# Install dependencies
jlpm add @jupyterlab/application @jupyterlab/apputils @jupyterlab/notebook
jlpm add @lumino/widgets react react-dom
jlpm add -D typescript webpack webpack-cli ts-loader css-loader style-loader
jlpm add -D @jupyterlab/builder rimraf

# Create TypeScript config
npx tsc --init

# Create Python package structure
mkdir -p qmeasure_jupyter/labextension
touch qmeasure_jupyter/__init__.py
```

### Build Commands
```json
{
  "scripts": {
    "build": "jlpm run build:lib && jlpm run build:labextension",
    "build:lib": "tsc",
    "build:labextension": "jupyter labextension build .",
    "build:dev": "jupyter labextension build --development True .",
    "clean": "rimraf lib qmeasure_jupyter/labextension",
    "watch": "run-p watch:src watch:labextension",
    "watch:src": "tsc -w",
    "watch:labextension": "jupyter labextension watch .",
    "install:extension": "pip install -e ."
  }
}
```

### Development Cycle
1. Clone and setup: `git clone <repo> && cd qmeasure-jupyter`
2. Install deps: `jlpm install`
3. Build: `jlpm run build`
4. Install extension: `pip install -e .`
5. For development: `jlpm run watch` (auto-rebuilds)
6. Test in JupyterLab: `jupyter lab`

## Testing Strategy

### Unit Tests
- Component rendering tests with React Testing Library
- Template generation logic tests
- Parameter validation tests
- Mock JupyterLab API for isolated testing

### Integration Tests
- End-to-end tests with Playwright
- Kernel communication tests
- Cell insertion and execution tests
- Multi-sweep scenario tests

### Test Structure
```typescript
// Example test
describe('SweepManager', () => {
  it('should generate correct Sweep0D code', async () => {
    const params = {
      max_time: 60,
      follow_params: ['dmm.voltage'],
      plot_data: true,
      save_data: true
    };

    const code = await generateSweep0D(params);
    expect(code).toContain('Sweep0D(');
    expect(code).toContain('max_time=60');
  });
});
```

## Distribution Strategy

### Package Configuration (pyproject.toml)
```toml
[build-system]
requires = ["hatchling", "jupyterlab>=4.0.0", "hatch-jupyter-builder>=0.8.2"]
build-backend = "hatchling.build"

[project]
name = "qmeasure-jupyter"
version = "0.1.0"
description = "JupyterLab extension for QMeasure/MeasureIt sweep management"
readme = "README.md"
license = {text = "MIT"}
authors = [{name = "Your Name", email = "your.email@example.com"}]
requires-python = ">=3.8"
dependencies = [
    "jupyterlab>=4.0.0"
]

[project.optional-dependencies]
dev = [
    "qmeasure>=1.1.0",  # For testing with actual package
    "pytest",
    "pytest-cov",
    "ruff",
    "mypy"
]

# No server extension entry point needed for pure frontend extension
# JupyterLab auto-discovers via labextension/ directory

[tool.hatch.build.targets.wheel.shared-data]
"qmeasure_jupyter/labextension" = "share/jupyter/labextensions/qmeasure-jupyter"

[tool.hatch.build.hooks.jupyter-builder]
build-function = "hatch_jupyter_builder.npm_builder"
ensured-targets = ["qmeasure_jupyter/labextension/package.json"]
skip-if-exists = ["qmeasure_jupyter/labextension/static"]
dependencies = ["hatch-jupyter-builder>=0.5.0"]

[tool.hatch.build.hooks.jupyter-builder.build-kwargs]
npm = "jlpm"
build_cmd = "build"
path = "."  # Build from root since it's a standard structure
```

### Release Process
1. Run full test suite
2. Build production bundle: `jlpm run build`
3. Verify labextension assets are generated
4. Update version in package.json and pyproject.toml
5. Build Python wheel: `python -m build`
6. Upload to PyPI: `twine upload dist/*`

### Installation for Users
```bash
# Install QMeasure/MeasureIt first (if not already installed)
pip install qmeasure

# Then install the JupyterLab extension
pip install qmeasure-jupyter

# Or install both together (future)
pip install qmeasure[jupyter]  # Will include qmeasure-jupyter as optional dep
```

## Best Practices & Guidelines

### Code Quality
- TypeScript strict mode enabled
- ESLint + Prettier for consistent formatting
- Pre-commit hooks for linting and tests
- 80%+ code coverage requirement

### Performance
- Lazy load components not immediately visible
- Memoize expensive computations
- Virtual scrolling for long parameter lists
- Debounce form inputs and validations

### Accessibility
- ARIA labels for all interactive elements
- Keyboard navigation support
- High contrast mode compatibility
- Screen reader friendly

### Security
- Sanitize all user inputs before code generation
- Validate parameters server-side
- No arbitrary code execution
- CSP headers for extension resources

## Common Pitfalls to Avoid

1. **State Management**: Don't store sweep state in React only - sync with notebook metadata
2. **Kernel Restarts**: Handle kernel restarts gracefully, re-query parameters
3. **Multiple Notebooks**: Ensure extension works with multiple open notebooks
4. **Performance**: Don't re-render entire form on every input change
5. **Error Handling**: Always provide clear error messages and recovery options

## Success Metrics

### Phase 1 Goals
- [ ] 90% of users can generate working sweep code without documentation
- [ ] <2s load time for sidebar panel
- [ ] Zero crashes in 1000 sweep generations
- [ ] Support for all common MeasureIt sweep patterns

### User Feedback Targets
- Ease of use: 4.5/5 rating
- Time saved vs manual coding: >50%
- Bug reports: <5 per month after stabilization
- Feature adoption: 30% of MeasureIt users within 3 months

## Resources & References

### Documentation
- [JupyterLab Extension Developer Guide](https://jupyterlab.readthedocs.io/en/stable/extension/extension_dev.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [MeasureIt API Reference](https://github.com/nanophys/MeasureIt)

### Example Extensions
- [jupyterlab-git](https://github.com/jupyterlab/jupyterlab-git) - Good reference for sidebar panels
- [jupyterlab-variableInspector](https://github.com/lckr/jupyterlab-variableInspector) - Kernel communication example
- [jupyterlab-code-formatter](https://github.com/ryantam626/jupyterlab_code_formatter) - Code insertion example

### Development Tools
- [JupyterLab Extension Cookiecutter](https://github.com/jupyterlab/extension-cookiecutter-ts)
- [React DevTools Extension](https://react.dev/learn/react-developer-tools)
- [TypeScript Playground](https://www.typescriptlang.org/play)

## Next Steps

1. **Week 1**: Set up development environment and create hello-world extension
2. **Week 2**: Implement basic sidebar with static UI
3. **Week 3**: Add form components and state management
4. **Week 4**: Implement code generation logic
5. **Week 5**: Add kernel communication and parameter discovery
6. **Week 6**: Testing and bug fixes
7. **Week 7**: Documentation and examples
8. **Week 8**: Beta release and user feedback collection

## Questions Resolved ✅

1. **Should we support QCoDeS station auto-discovery or require manual parameter entry?**
   - **Answer**: Manual entry for MVP (Phase 1), auto-discovery in Phase 2

2. **How should we handle custom sweep parameters not in standard templates?**
   - **Answer**: Add "Custom Parameters" key-value component for extra kwargs

3. **Should generated code include error handling boilerplate?**
   - **Answer**: No, keep generated code clean and readable

4. **Do we need offline mode without kernel connection?**
   - **Answer**: Yes! MVP is 100% offline-capable by design

5. **Should we support saving/loading sweep configurations?**
   - **Answer**: Defer to Phase 3 with SweepQueue Manager

## Contact & Collaboration

- **Project Lead**: [TBD]
- **Repository**: https://github.com/nanophys/qmeasure-jupyter (to be created as SEPARATE repo)
- **Main Package**: https://github.com/nanophys/MeasureIt
- **Discussion**: GitHub Issues and Discussions
- **Development Chat**: [TBD - Slack/Discord]
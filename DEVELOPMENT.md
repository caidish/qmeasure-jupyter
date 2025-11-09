# Development Guide for QMeasure Jupyter

## Setup Development Environment

### Prerequisites
- Python >= 3.8
- Node.js (comes with conda/mamba JupyterLab install)
- JupyterLab >= 4.0.0

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/caidish/qmeasure-jupyter.git
cd qmeasure-jupyter

# Activate your conda environment
source ~/miniforge3/etc/profile.d/conda.sh
conda activate instrMCPdev  # or your environment name

# Install dependencies
jlpm install

# Build the TypeScript source
jlpm build:lib

# Install the extension in development mode
jupyter labextension develop . --overwrite

# Verify installation
jupyter labextension list
```

## Development Workflow

### Watch Mode for Development

In one terminal, watch the TypeScript source and automatically rebuild:
```bash
jlpm watch
```

In another terminal, run JupyterLab:
```bash
jupyter lab
```

When you make changes to the TypeScript/React code, the watch command will automatically rebuild, and you can refresh the browser to see changes.

### Manual Build

```bash
# Build TypeScript only
jlpm build:lib

# Build for production (no source maps)
jlpm build:prod
```

### Cleaning

```bash
# Clean compiled TypeScript
jlpm clean

# Clean everything including labextension
jlpm clean:all
```

## Project Structure

```
qmeasure-jupyter/
├── src/                          # TypeScript source code
│   ├── index.ts                  # Extension entry point
│   ├── plugin.ts                 # JupyterLab plugin definition
│   ├── components/               # React components
│   │   └── SweepManager.tsx      # Main sidebar component
│   ├── templates/                # Code generation templates (to be added)
│   ├── services/                 # Business logic (to be added)
│   ├── types/                    # TypeScript type definitions
│   │   └── index.d.ts
│   └── styles/                   # Component styles (unused for now)
├── style/                        # CSS styles
│   ├── base.css                  # Base extension styles
│   ├── index.css                 # Style entry point
│   └── index.js                  # Style loader
├── lib/                          # Compiled JavaScript (gitignored)
├── qmeasure_jupyter/             # Python package
│   ├── __init__.py
│   ├── _version.py
│   └── labextension/             # Built JS assets (symlinked in dev mode)
├── package.json                  # NPM package configuration
├── tsconfig.json                 # TypeScript configuration
├── pyproject.toml                # Python package metadata
└── .yarnrc.yml                   # Yarn configuration (node-modules mode)
```

## Troubleshooting

### Extension Not Loading

1. Check that the extension is installed:
   ```bash
   jupyter labextension list
   ```

2. Check the browser console for errors when JupyterLab loads

3. Rebuild and reinstall:
   ```bash
   jlpm clean:all
   jlpm install
   jlpm build:lib
   jupyter labextension develop . --overwrite
   ```

### Yarn PnP Issues

If you encounter `.pnp.cjs` errors, make sure `.yarnrc.yml` contains:
```yaml
nodeLinker: node-modules
```

Then reinstall dependencies:
```bash
rm -rf .yarn .pnp.* node_modules
jlpm install
```

### TypeScript Compilation Errors

If you see type errors from dependencies, make sure `skipLibCheck: true` is set in `tsconfig.json`.

## Testing

(To be implemented in Week 6)

## Code Style

- TypeScript strict mode enabled
- Use functional React components with hooks
- Follow JupyterLab extension best practices
- Use CSS modules with JupyterLab theme variables

## Next Steps

Week 2 tasks (from TODO_plugin.md):
- Build SweepManager with tabbed interface ✓ (basic version done)
- Create forms for Sweep0D, Sweep1D, Sweep2D
- Implement text inputs for all parameters
- Add client-side validation
- Add "Custom Parameters" key-value component

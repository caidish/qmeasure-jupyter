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

## Publishing and Release

### Prerequisites

- Clean working directory (no uncommitted changes)
- Updated version number in `package.json`
- All tests passing
- Documentation up to date

### Build Production Bundle

Before publishing, build the prebuilt labextension:

```bash
# Clean all build artifacts
jlpm clean:all

# Build production bundle (minified, no source maps)
jlpm build:prod
```

Verify the labextension directory contains compiled assets:

```bash
ls qmeasure_jupyter/labextension/
# Should contain: package.json, static/, schemas/

ls qmeasure_jupyter/labextension/static/
# Should contain: style.js, *.js chunks, *.wasm files, etc.
```

### Build Distribution Packages

Build the wheel and source distribution:

```bash
# Install build tool if needed
pip install build

# Build packages
python -m build
```

This creates:
- `dist/qmeasure_jupyter-X.Y.Z-py3-none-any.whl` (wheel)
- `dist/qmeasure_jupyter-X.Y.Z.tar.gz` (source distribution)

### Verify Package Contents

Inspect the wheel to ensure all assets are included:

```bash
# List wheel contents
python -m zipfile -l dist/qmeasure_jupyter-*.whl | grep labextensions

# Should show:
# - share/jupyter/labextensions/qmeasure-jupyter/package.json
# - share/jupyter/labextensions/qmeasure-jupyter/static/style.js
# - share/jupyter/labextensions/qmeasure-jupyter/static/*.js
# - share/jupyter/labextensions/qmeasure-jupyter/static/*.wasm
# - share/jupyter/labextensions/qmeasure-jupyter/install.json
# - share/jupyter/labextensions/qmeasure-jupyter/schemas/
```

### Test Installation

Test the package in a clean environment:

```bash
# Create test environment
conda create -n test-qmeasure python=3.10 jupyterlab
conda activate test-qmeasure

# Install from wheel
pip install dist/qmeasure_jupyter-*.whl

# Verify extension is recognized
jupyter labextension list
# Should show: qmeasure-jupyter vX.Y.Z enabled OK (python, qmeasure_jupyter)

# Test in JupyterLab
jupyter lab
# Verify: Sweep Manager appears in left sidebar, no console errors
```

### Publish to PyPI

⚠️ **Important**: Test on TestPyPI first!

#### 1. TestPyPI (Recommended for first-time publishing)

```bash
# Install twine
pip install twine

# Upload to TestPyPI
twine upload --repository testpypi dist/*

# Test installation from TestPyPI
pip install --index-url https://test.pypi.org/simple/ qmeasure-jupyter
```

#### 2. PyPI (Production)

```bash
# Upload to PyPI
twine upload dist/*
```

### Complete Release Workflow

```bash
# 1. Ensure clean state
git status  # Should be clean
git pull origin main

# 2. Update version (edit package.json)
# Update "version": "X.Y.Z"

# 3. Commit version bump
git add package.json
git commit -m "Bump version to X.Y.Z"
git push origin main

# 4. Create git tag
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z

# 5. Clean and build
jlpm clean:all
jlpm install
jlpm build:prod

# 6. Build distributions
python -m build

# 7. Test locally
pip install --force-reinstall dist/qmeasure_jupyter-*.whl
jupyter labextension list
# Quick smoke test

# 8. Upload to PyPI
twine upload dist/*

# 9. Verify on PyPI
# Check: https://pypi.org/project/qmeasure-jupyter/

# 10. Test installation from PyPI
pip install --upgrade qmeasure-jupyter
```

### Version Management

The project uses version from `package.json`. When bumping version:

1. Update `package.json`: `"version": "X.Y.Z"`
2. The Python package will automatically use this version (via `hatch-nodejs-version`)
3. Follow semantic versioning:
   - MAJOR: Breaking changes
   - MINOR: New features (backward compatible)
   - PATCH: Bug fixes

### Troubleshooting Publishing

**Issue**: `ensured-targets` not found during build

```bash
# Make sure to run jlpm build:prod before python -m build
jlpm build:prod
```

**Issue**: Old files in wheel

```bash
# Clean everything and rebuild
jlpm clean:all
rm -rf dist/ build/ *.egg-info
jlpm build:prod
python -m build
```

**Issue**: Extension not showing after pip install

```bash
# Check if labextension files are in the right place
python -c "import qmeasure_jupyter; print(qmeasure_jupyter.__file__)"
# Then check: {path}/share/jupyter/labextensions/qmeasure-jupyter/
```

## Next Steps

Week 2 tasks (from TODO_plugin.md):

- Build SweepManager with tabbed interface ✓ (basic version done)
- Create forms for Sweep0D, Sweep1D, Sweep2D
- Implement text inputs for all parameters
- Add client-side validation
- Add "Custom Parameters" key-value component

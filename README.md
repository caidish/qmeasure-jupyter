# QMeasure Jupyter

[![PyPI](https://img.shields.io/pypi/v/qmeasure-jupyter.svg)](https://pypi.org/project/qmeasure-jupyter)

A JupyterLab extension providing a beginner-friendly GUI for the [MeasureIt](https://github.com/nanophys/MeasureIt) sweep measurement package.

## Features

**Phase 1: MVP - Static Code Generator**

- 📊 Support for Sweep0D, Sweep1D, Sweep2D, and SimulSweep
- 📝 Template-based code generation
- ⚡ One-click code insertion into Jupyter cells
- 🔧 Manual parameter entry with client-side validation
- 💾 Form persistence via localStorage
- 📋 Copy to clipboard fallback option

## Requirements

- JupyterLab >= 4.0.0
- Python >= 3.8

## Install

To install the extension, execute:

```bash
pip install qmeasure_jupyter
```

## Uninstall

To remove the extension, execute:

```bash
pip uninstall qmeasure_jupyter
```

## Development Install

Note: You will need NodeJS to build the extension package.

```bash
# Clone the repo to your local environment
cd qmeasure-jupyter

# Install package in development mode
pip install -e ".[dev]"

# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite

# Server extension must be manually installed in develop mode
jupyter server extension enable qmeasure_jupyter

# Rebuild extension TypeScript source after making changes
jlpm build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm watch

# Run JupyterLab in another terminal
jupyter lab
```

## Usage

1. Open JupyterLab
2. Look for "Sweep Manager" in the left sidebar
3. Select your sweep type (Sweep0D, Sweep1D, Sweep2D, or SimulSweep)
4. Fill in the parameters
5. Click "Insert Code" to add the sweep code to a new cell

## Contributing

See [DEVELOPMENT.md](DEVELOPMENT.md) for development guidelines.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

Built for the [MeasureIt](https://github.com/nanophys/MeasureIt) measurement framework, developed at the University of Washington.

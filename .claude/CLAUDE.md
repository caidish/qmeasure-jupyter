# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## General Guidelines

- **Always use conda environment instrMCPdev for testing** by `source ~/miniforge3/etc/profile.d/conda.sh && conda activate instrMCPdev`
- Whenever you need to confirm API of measureit(qmeasure), test it in the conda environment.
- Use context7 for code references, especially for measureit(qmeasure)
- We will use measureit: https://github.com/nanophys/MeasureIt/
- check requirements.txt when new python file is created.
- update pyproject.toml
- when removing features, update readme.md
- Format code when wrapping up: `black`. Check linter.

## About MeasureIt/QMeasure

Here is a note for the agent, based on the `MeasureIt` library and the `instrMCP` templating pattern.

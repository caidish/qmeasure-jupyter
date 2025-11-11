# QMeasure Jupyter - User Guide

## Table of Contents
- [Introduction](#introduction)
- [Getting Started](#getting-started)
- [Creating Sweeps](#creating-sweeps)
  - [Sweep0D - Point Measurements](#sweep0d---point-measurements)
  - [Sweep1D - 1D Parameter Sweeps](#sweep1d---1d-parameter-sweeps)
  - [Sweep2D - 2D Parameter Sweeps](#sweep2d---2d-parameter-sweeps)
  - [SimulSweep - Simultaneous Sweeps](#simulsweep---simultaneous-sweeps)
- [Advanced Features](#advanced-features)
  - [Follow Parameters](#follow-parameters)
  - [Custom Parameters](#custom-parameters)
  - [Form Persistence](#form-persistence)
- [Table of Contents Panel](#table-of-contents-panel)
- [Troubleshooting](#troubleshooting)

---

## Introduction

QMeasure Jupyter is a JupyterLab extension that provides a beginner-friendly graphical interface for creating [MeasureIt](https://github.com/nanophys/MeasureIt) sweep measurements. Instead of manually writing sweep code, you can:

- Fill out forms with measurement parameters
- Generate validated Python code automatically
- Insert code directly into notebook cells
- Track and visualize sweeps across your notebook

This extension is designed for researchers and students who want to focus on their measurements rather than code syntax.

---

## Getting Started

### Opening the Sweep Manager

1. **Launch JupyterLab** and open or create a notebook
2. **Locate the left sidebar** - look for the icon labeled "Sweep Manager" (typically appears as a panel icon)
3. **Click to open** the Sweep Manager panel

The Sweep Manager has two main sections:
- **Top section**: Tabbed interface for creating sweeps (Sweep0D, Sweep1D, Sweep2D, SimulSweep)
- **Bottom section**: Table of Contents showing all sweeps detected in your notebook

### Basic Workflow

```
1. Select sweep type (tab)
2. Fill in parameters
3. Click "Generate Code"
4. Code is inserted into the active notebook cell
5. Run the cell to execute the sweep
```

---

## Creating Sweeps

### Sweep0D - Point Measurements

**Use case**: Measure at a single point without sweeping any parameters.

#### Required Parameters
- **Name**: Variable name for the sweep object (e.g., `s_0D`, `point_measure`)

#### Optional Parameters
- **Inter Delay** (seconds): Delay between measurements
- **Save Data**: Whether to save to database (True/False)
- **Plot Data**: Whether to plot results (True/False)
- **Deferred Start**: Delay sweep start for database initialization

#### Example
```python
# Fill in form:
Name: s_0D
Inter Delay: 0.1
Save Data: True
Plot Data: True

# Generated code:
s_0D = Sweep0D(
    inter_delay=0.1,
    save_data=True,
    plot_data=True,
    defer_start=True
)

# No follow parameters specified

s_0D.start()
```

---

### Sweep1D - 1D Parameter Sweeps

**Use case**: Sweep one parameter through a range (e.g., gate voltage from -1V to 1V).

#### Required Parameters
- **Name**: Variable name for the sweep object
- **Set Parameter**: QCoDeS parameter to sweep (e.g., `station.dac.ch1`)
- **Start**: Starting value
- **Stop**: Ending value
- **Step**: Step size

#### Optional Parameters
- **Bidirectional**: Sweep forward and backward
- **Continual**: Repeat sweep continuously
- **Save Data**: Save to database
- **Plot Data**: Plot results
- **Deferred Start**: Delay sweep start
- **Follow Parameters**: Parameters to measure at each point (comma-separated)
- **Custom Parameters**: Additional kwargs passed to Sweep1D constructor

#### Example: Gate Voltage Sweep
```python
# Fill in form:
Name: gate_sweep
Set Parameter: station.dac.ch1
Start: -1
Stop: 1
Step: 0.1
Follow Parameters: station.dmm.v, station.lockin.X

# Generated code:
set_param = station.dac.ch1

gate_sweep = Sweep1D(
    set_param=set_param,
    start=-1,
    stop=1,
    step=0.1,
    bidirectional=False,
    continual=False,
    save_data=True,
    plot_data=True,
    defer_start=True
)

# Add parameters to follow
gate_sweep.follow_param(station.dmm.v)
gate_sweep.follow_param(station.lockin.X)

gate_sweep.start()
```

---

### Sweep2D - 2D Parameter Sweeps

**Use case**: Nest two 1D sweeps (e.g., gate voltage vs. magnetic field).

#### Required Parameters
- **Name**: Variable name for the sweep object
- **Inner Set Parameter**: Parameter for inner (fast) sweep
- **Outer Set Parameter**: Parameter for outer (slow) sweep
- **Inner Start/Stop/Step**: Range for inner sweep
- **Outer Start/Stop/Step**: Range for outer sweep

#### Optional Parameters
- Same as Sweep1D, plus:
- **Outer Bidirectional**: Whether outer loop is bidirectional
- **Interleave**: Alternative sweeping strategy

#### Example: Gate vs. Field Map
```python
# Fill in form:
Name: gate_field_map
Inner Set Parameter: station.dac.ch1
Outer Set Parameter: station.magnet.field
Inner: start=-1, stop=1, step=0.05
Outer: start=0, stop=0.5, step=0.1

# Generated code:
inner_param = station.dac.ch1
outer_param = station.magnet.field

gate_field_map = Sweep2D(
    in_params={'start': -1, 'stop': 1, 'step': 0.05, 'set_param': inner_param},
    out_params={'start': 0, 'stop': 0.5, 'step': 0.1, 'set_param': outer_param},
    bidirectional=False,
    outer_bidirectional=False,
    interleave=False,
    continual=False,
    save_data=True,
    plot_data=True,
    defer_start=True
)

# No follow parameters specified

gate_field_map.start()
```

---

### SimulSweep - Simultaneous Sweeps

**Use case**: Sweep two parameters simultaneously at the same rate (e.g., maintaining a constant voltage ratio).

#### Required Parameters
- **Name**: Variable name
- **Parameter 1**: First QCoDeS parameter with start, stop, step
- **Parameter 2**: Second QCoDeS parameter with start, stop, step

**Note**: SimulSweep requires exactly 2 parameters.

#### Optional Parameters
- Same as Sweep1D
- **Custom Parameters**: Added to `sweep_args` dictionary

#### Example: Dual Gate Sweep
```python
# Fill in form:
Name: dual_gate
Parameter 1:
  Name: station.dac.ch1
  Start: -1
  Stop: 1
  Step: 0.1
Parameter 2:
  Name: station.dac.ch2
  Start: -0.5
  Stop: 0.5
  Step: 0.05

# Generated code:
parameter_dict = {
    station.dac.ch1: np.arange(-1, 1, 0.1),
    station.dac.ch2: np.arange(-0.5, 0.5, 0.05)
}

sweep_args = {
    "bidirectional": False,
    "save_data": True,
    "plot_data": True,
    "defer_start": True
}

dual_gate = SimulSweep(parameter_dict, **sweep_args)

# Add parameters to follow
# No follow parameters specified

dual_gate.start()
```

---

## Advanced Features

### Follow Parameters

Follow parameters are measured at each point in the sweep but are **not** swept themselves.

**Entry format**: Comma-separated list of QCoDeS parameters
```
station.dmm.voltage, station.lockin.X, station.lockin.Y
```

**Important**: Do NOT add `station.` prefix manually if your parameter path already includes it. Enter the full parameter path exactly as it appears in your station.

**Generated code**:
```python
sweep.follow_param(station.dmm.voltage)
sweep.follow_param(station.lockin.X)
sweep.follow_param(station.lockin.Y)
```

---

### Custom Parameters

Custom parameters allow you to pass additional keyword arguments to the sweep constructor that aren't available in the form.

#### How to Use
1. Click the **"+ Add Parameter"** button
2. Enter **Key** (parameter name)
3. Enter **Value** (Python expression)
4. Click "Generate Code"

#### Examples

**Example 1: Temperature Metadata**
```
Key: temperature
Value: 300
```
Generated:
```python
s_1D = Sweep1D(
    ...,
    temperature=300
)
```

**Example 2: Custom Callback**
```
Key: on_complete
Value: my_callback_function
```
Generated:
```python
s_1D = Sweep1D(
    ...,
    on_complete=my_callback_function
)
```

**Example 3: String Value**
```
Key: sample_name
Value: "Device_A_Run_5"
```
Generated:
```python
s_1D = Sweep1D(
    ...,
    sample_name="Device_A_Run_5"
)
```

**Note**: Values are inserted as-is into the generated code. Use proper Python syntax:
- Strings: `"value"` or `'value'`
- Numbers: `42` or `3.14`
- Variables: `my_variable`
- Expressions: `np.linspace(0, 10, 100)`

---

### Form Persistence

The extension automatically saves your form inputs to your browser's localStorage. This means:

✅ **Form values persist** across JupyterLab sessions
✅ **Per-form storage** - each sweep type has independent saved values
✅ **Automatic saving** - changes are saved as you type

#### Resetting Forms

To clear saved values and return to defaults:
1. Click the **"Reset to Defaults"** button at the bottom of any form
2. Form fields will reset to their default values
3. Saved values are cleared from localStorage

**Storage keys** (for debugging):
- `qmeasure:sweep0d`
- `qmeasure:sweep1d`
- `qmeasure:sweep2d`
- `qmeasure:simulsweep`

---

## Table of Contents Panel

The bottom section of the Sweep Manager shows all sweeps detected in your notebook.

### Features
- **Automatic detection** - scans notebook cells for sweep objects
- **Real-time updates** - updates as you run cells
- **Sweep icons** - Different icons for each sweep type:
  - `📍` Sweep0D
  - `📊` Sweep1D
  - `🗺️` Sweep2D
  - `🔄` SimulSweep
- **Click to view details** - Click any sweep to see its parameters in the right sidebar

### What Information is Shown?
- Sweep name and type
- Parameters being swept
- Start/stop/step values
- Follow parameters
- Custom parameters (if any)

### Limitations
- Only detects sweeps after the cell has been executed
- Requires valid Python syntax (won't detect syntax errors)
- Sweeps defined in imported modules may not be detected

---

## Troubleshooting

### Extension Not Visible

**Problem**: Sweep Manager doesn't appear in JupyterLab sidebar

**Solutions**:
1. Refresh JupyterLab (Cmd+Shift+R on Mac, Ctrl+Shift+F5 on Windows)
2. Verify installation: `jupyter labextension list` should show `qmeasure-jupyter`
3. Reinstall: `pip install --force-reinstall qmeasure-jupyter`

---

### Code Won't Insert

**Problem**: "Generate Code" button doesn't insert code into notebook

**Solutions**:
1. Make sure a notebook is open and active
2. Click on a cell to make it active
3. Try creating a new cell first (click "+" in notebook toolbar)
4. Check browser console for errors (F12)

---

### Missing Required Fields

**Problem**: Code generates with `_required` placeholders like `start=_required_start`

**Cause**: Required field was left empty

**Solution**:
- Fill in all required fields (marked with red asterisk *)
- The extension allows generating code with missing fields to help you see the template
- Replace `_required_*` placeholders with actual values before running

---

### Form Values Not Persisting

**Problem**: Form resets to defaults when reopening JupyterLab

**Solutions**:
1. Check if browser localStorage is enabled
2. Check browser privacy settings (localStorage may be disabled in private mode)
3. Clear browser cache and reload JupyterLab
4. Check browser console for quota exceeded errors

---

### Generated Code Has Errors

**Problem**: Python raises errors when running generated code

**Common Issues**:

1. **Parameter doesn't exist**
   ```
   AttributeError: 'DummyInstrument' object has no attribute 'voltage'
   ```
   **Fix**: Check parameter path - make sure the instrument and parameter exist in your station

2. **Invalid range**
   ```
   ValueError: step must be non-zero
   ```
   **Fix**: Make sure step has a valid non-zero value

3. **Import missing**
   ```
   NameError: name 'np' is not defined
   ```
   **Fix**: Add `import numpy as np` at the top of your notebook

4. **Station not initialized**
   ```
   NameError: name 'station' is not defined
   ```
   **Fix**: Initialize your QCoDeS station before running sweeps

---

### Table of Contents Not Updating

**Problem**: Sweeps don't appear in the ToC panel after running cells

**Solutions**:
1. Make sure cells have been executed (shift+enter)
2. Wait a moment - parsing happens asynchronously
3. Try re-executing the cell
4. Check for syntax errors in the cell

---

## Tips & Best Practices

### Naming Conventions
- Use descriptive names: `gate_sweep` instead of `s1`
- Follow Python variable naming: lowercase with underscores
- Avoid special characters and spaces

### Parameter Paths
- Always use full paths: `station.dac.ch1` not just `ch1`
- For follow parameters, enter the complete parameter path
- Check your station configuration with `station.print_readable_snapshot()`

### Step Sizes
- Choose step sizes that divide evenly into your range
- Smaller steps = more data points = longer sweep time
- Consider your measurement time when choosing step size

### Testing Sweeps
1. Test with a small range first (few points)
2. Verify data quality before running long sweeps
3. Check that follow parameters are updating correctly
4. Monitor plots for expected behavior

### Performance
- Close unused sweeps to free memory: `sweep_name.close()`
- Disable plotting for very long sweeps: `plot_data=False`
- Use `defer_start=True` for database initialization

---

## Further Reading

- [MeasureIt Documentation](https://github.com/nanophys/MeasureIt)
- [QCoDeS Documentation](https://qcodes.github.io/Qcodes/)
- [JupyterLab Documentation](https://jupyterlab.readthedocs.io/)

---

## Getting Help

If you encounter issues not covered in this guide:

1. Check the [GitHub Issues](https://github.com/your-repo/qmeasure-jupyter/issues)
2. Review MeasureIt documentation for sweep API details
3. Ask your lab's QCoDeS expert
4. File a bug report with:
   - JupyterLab version
   - qmeasure-jupyter version
   - Steps to reproduce
   - Error messages (if any)

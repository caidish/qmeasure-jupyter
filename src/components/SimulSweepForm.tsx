/**
 * Form component for SimulSweep parameters
 */

import React, { useState } from "react";
import { FormInput } from "./FormInput";
import { CustomParams, CustomParamEntry } from "./CustomParams";
import {
  FormField,
  SimulSweepParameters,
  SimulSweepParamEntry,
} from "../types";
import {
  usePersistentForm,
  getDefaultValues,
} from "../hooks/usePersistentForm";

interface SimulSweepFormProps {
  onGenerate: (params: SimulSweepParameters) => void;
}

// Global sweep configuration fields
const SIMULSWEEP_GLOBAL_FIELDS: FormField[] = [
  {
    name: "sweep_name",
    label: "Sweep Name",
    type: "text",
    default: "s_simul",
    help: "Variable name for the sweep object (default: s_simul)",
  },
  {
    name: "bidirectional",
    label: "Bidirectional Sweep",
    type: "boolean",
    default: false,
    help: "Sweep back and forth",
  },
  {
    name: "continual",
    label: "Continuous Sweep",
    type: "boolean",
    default: false,
    help: "Continue sweeping indefinitely",
  },
  {
    name: "inter_delay",
    label: "Inter Delay",
    type: "number",
    default: 0.1,
    min: 0,
    unit: "s",
    help: "Time to wait between data points",
  },
  {
    name: "err",
    label: "Error Tolerance",
    type: "number",
    default: 0.01,
    min: 0,
    help: "Tolerance for rounding errors",
  },
  {
    name: "save_data",
    label: "Save to Database",
    type: "boolean",
    default: true,
  },
  {
    name: "plot_data",
    label: "Live Plotting",
    type: "boolean",
    default: true,
  },
  {
    name: "plot_bin",
    label: "Plot Bin Size",
    type: "number",
    default: 1,
    min: 1,
  },
  {
    name: "follow_params",
    label: "Follow Parameters",
    type: "textarea",
    default: "",
    help: "Enter one parameter per line (e.g., dmm.voltage)",
  },
  {
    name: "suppress_output",
    label: "Suppress Output",
    type: "boolean",
    default: false,
  },
];

export const SimulSweepForm: React.FC<SimulSweepFormProps> = ({
  onGenerate,
}) => {
  // Global sweep configuration with persistent storage
  const [values, setValues, resetValues] = usePersistentForm(
    "qmeasure:simulsweep",
    getDefaultValues(SIMULSWEEP_GLOBAL_FIELDS),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customParams, setCustomParams] = useState<CustomParamEntry[]>([]);

  // SimulSweep requires exactly 2 parameters
  const [params, setParams] = useState<SimulSweepParamEntry[]>([
    { paramPath: "", start: 0, stop: 0, step: 0 },
    { paramPath: "", start: 0, stop: 0, step: 0 },
  ]);

  const handleGlobalChange = (name: string, value: any) => {
    setValues({ [name]: value });
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleParamChange = (
    index: number,
    field: keyof SimulSweepParamEntry,
    value: any,
  ) => {
    setParams((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

    // Clear validation error for this parameter
    const errorKey = `param_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate global fields
    SIMULSWEEP_GLOBAL_FIELDS.forEach((field) => {
      const value = values[field.name];

      if (
        field.required &&
        (value === undefined || value === null || value === "")
      ) {
        newErrors[field.name] = "This field is required";
      }

      if (field.type === "number" && value !== undefined && value !== "") {
        if (field.min !== undefined && value < field.min) {
          newErrors[field.name] = `Value must be at least ${field.min}`;
        }
        if (field.max !== undefined && value > field.max) {
          newErrors[field.name] = `Value must be at most ${field.max}`;
        }
      }
    });

    // SimulSweep requires exactly 2 parameters
    if (params.length !== 2) {
      newErrors["params_general"] = "SimulSweep requires exactly 2 parameters";
    }

    // Validate parameters
    params.forEach((param, index) => {
      if (!param.paramPath || param.paramPath.trim() === "") {
        newErrors[`param_${index}_paramPath`] = "Parameter path is required";
      }
      if (param.start === undefined || param.start === null) {
        newErrors[`param_${index}_start`] = "Start value is required";
      }
      if (param.stop === undefined || param.stop === null) {
        newErrors[`param_${index}_stop`] = "Stop value is required";
      }
      if (param.step === undefined || param.step === null || param.step === 0) {
        newErrors[`param_${index}_step`] =
          "Step size is required and must not be zero";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerate = () => {
    // Validate for error display
    validate();

    // Build parameters object
    const simulSweepParams: SimulSweepParameters = {
      sweep_name: values.sweep_name || "s_simul",
      params: params.map((p) => ({
        paramPath: p.paramPath || "_required",
        start: p.start ?? 0,
        stop: p.stop ?? 0,
        step: p.step ?? 0,
      })),
      bidirectional: values.bidirectional ?? false,
      continual: values.continual ?? false,
      inter_delay: values.inter_delay,
      err: values.err ?? 0.01,
      save_data: values.save_data ?? true,
      plot_data: values.plot_data ?? true,
      plot_bin: values.plot_bin,
      suppress_output: values.suppress_output ?? false,
      follow_params: values.follow_params
        ? values.follow_params
            .split("\n")
            .map((p: string) => p.trim())
            .filter((p: string) => p)
        : [],
      custom_params: customParams.filter((p) => p.key.trim() !== ""),
    };

    onGenerate(simulSweepParams);
  };

  return (
    <div className="qmeasure-form">
      <h3>SimulSweep - Simultaneous Parameter Sweep</h3>
      <p className="qmeasure-form-description">
        Sweep exactly 2 parameters simultaneously with independent ranges.
      </p>

      {/* Global Configuration */}
      <div className="qmeasure-form-section">
        <h4>Global Settings</h4>
        {SIMULSWEEP_GLOBAL_FIELDS.map((field) => (
          <FormInput
            key={field.name}
            field={field}
            value={values[field.name]}
            onChange={handleGlobalChange}
            error={errors[field.name]}
          />
        ))}
      </div>

      {/* Parameter List */}
      <div className="qmeasure-form-section">
        <h4>Sweep Parameters (2 required)</h4>
        {errors["params_general"] && (
          <div className="qmeasure-form-error">{errors["params_general"]}</div>
        )}

        {params.map((param, index) => (
          <div key={index} className="qmeasure-param-entry">
            <div className="qmeasure-param-header">
              <span>Parameter {index + 1}</span>
            </div>

            <div className="qmeasure-form-group">
              <label className="qmeasure-form-label">
                Parameter Path
                <span className="qmeasure-required">*</span>
              </label>
              <input
                type="text"
                className="qmeasure-form-input"
                value={param.paramPath}
                onChange={(e) =>
                  handleParamChange(index, "paramPath", e.target.value)
                }
                placeholder="e.g., station.keithley.voltage"
              />
              <div className="qmeasure-form-help">
                Full path to parameter (e.g., station.instrument.param)
              </div>
              {errors[`param_${index}_paramPath`] && (
                <div className="qmeasure-form-error">
                  {errors[`param_${index}_paramPath`]}
                </div>
              )}
            </div>

            <div className="qmeasure-param-row">
              <div className="qmeasure-form-group">
                <label className="qmeasure-form-label">
                  Start<span className="qmeasure-required">*</span>
                </label>
                <input
                  type="number"
                  className="qmeasure-form-input"
                  value={param.start}
                  onChange={(e) =>
                    handleParamChange(index, "start", Number(e.target.value))
                  }
                  step="any"
                />
                {errors[`param_${index}_start`] && (
                  <div className="qmeasure-form-error">
                    {errors[`param_${index}_start`]}
                  </div>
                )}
              </div>

              <div className="qmeasure-form-group">
                <label className="qmeasure-form-label">
                  Stop<span className="qmeasure-required">*</span>
                </label>
                <input
                  type="number"
                  className="qmeasure-form-input"
                  value={param.stop}
                  onChange={(e) =>
                    handleParamChange(index, "stop", Number(e.target.value))
                  }
                  step="any"
                />
                {errors[`param_${index}_stop`] && (
                  <div className="qmeasure-form-error">
                    {errors[`param_${index}_stop`]}
                  </div>
                )}
              </div>

              <div className="qmeasure-form-group">
                <label className="qmeasure-form-label">
                  Step<span className="qmeasure-required">*</span>
                </label>
                <input
                  type="number"
                  className="qmeasure-form-input"
                  value={param.step}
                  onChange={(e) =>
                    handleParamChange(index, "step", Number(e.target.value))
                  }
                  step="any"
                />
                {errors[`param_${index}_step`] && (
                  <div className="qmeasure-form-error">
                    {errors[`param_${index}_step`]}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <CustomParams value={customParams} onChange={setCustomParams} />

      <div className="qmeasure-form-actions">
        <button
          className="qmeasure-button-secondary qmeasure-button-small"
          onClick={resetValues}
          type="button"
        >
          Reset to Defaults
        </button>
        <button className="qmeasure-button" onClick={handleGenerate}>
          Generate Code
        </button>
      </div>
    </div>
  );
};

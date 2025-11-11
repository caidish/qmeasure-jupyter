/**
 * Custom Parameters component for key-value parameter pairs
 */

import React from "react";

export interface CustomParamEntry {
  key: string;
  value: string;
}

interface CustomParamsProps {
  value: CustomParamEntry[];
  onChange: (params: CustomParamEntry[]) => void;
}

export const CustomParams: React.FC<CustomParamsProps> = ({
  value,
  onChange,
}) => {
  const handleAdd = () => {
    onChange([...value, { key: "", value: "" }]);
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleChange = (
    index: number,
    field: "key" | "value",
    newValue: string,
  ) => {
    const updated = [...value];
    updated[index] = { ...updated[index], [field]: newValue };
    onChange(updated);
  };

  // Check for duplicate keys (warning only)
  const getDuplicateKeys = (): Set<string> => {
    const keys = value.map((p) => p.key.trim()).filter((k) => k !== "");
    const duplicates = new Set<string>();
    const seen = new Set<string>();

    keys.forEach((key) => {
      if (seen.has(key)) {
        duplicates.add(key);
      }
      seen.add(key);
    });

    return duplicates;
  };

  const duplicateKeys = getDuplicateKeys();

  return (
    <div className="qmeasure-custom-params">
      <div className="qmeasure-custom-params-header">
        <h4>Custom Parameters</h4>
        <button
          className="qmeasure-button-small"
          onClick={handleAdd}
          type="button"
        >
          + Add Parameter
        </button>
      </div>

      {value.length === 0 ? (
        <div className="qmeasure-custom-params-empty">
          No custom parameters. Click "Add Parameter" to create key-value pairs.
        </div>
      ) : (
        <div className="qmeasure-custom-params-list">
          {value.map((param, index) => {
            const isDuplicate = duplicateKeys.has(param.key.trim());

            return (
              <div key={index} className="qmeasure-custom-param-row">
                <div className="qmeasure-custom-param-inputs">
                  <div className="qmeasure-form-group">
                    <input
                      type="text"
                      className={`qmeasure-form-input ${isDuplicate ? "qmeasure-input-warning" : ""}`}
                      value={param.key}
                      onChange={(e) =>
                        handleChange(index, "key", e.target.value)
                      }
                      placeholder="parameter_name"
                    />
                    {isDuplicate && (
                      <div className="qmeasure-form-warning">Duplicate key</div>
                    )}
                  </div>

                  <span className="qmeasure-custom-param-separator">=</span>

                  <div className="qmeasure-form-group">
                    <input
                      type="text"
                      className="qmeasure-form-input"
                      value={param.value}
                      onChange={(e) =>
                        handleChange(index, "value", e.target.value)
                      }
                      placeholder="value"
                    />
                  </div>
                </div>

                <button
                  className="qmeasure-button-small qmeasure-button-danger"
                  onClick={() => handleRemove(index)}
                  type="button"
                  aria-label="Remove parameter"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="qmeasure-form-help">
        Custom parameters are passed to the sweep using sweep.custom_param(key,
        value). Values can be strings, numbers, or Python expressions.
      </div>
    </div>
  );
};

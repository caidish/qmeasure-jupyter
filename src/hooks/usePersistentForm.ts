/**
 * Custom hook for form state persistence using localStorage
 */

import { useState, useCallback } from "react";

/**
 * Hook that persists form state to localStorage
 * @param storageKey Unique key for localStorage (e.g., 'qmeasure:sweep1d')
 * @param defaults Default values for the form
 * @returns [values, setValues, reset] tuple
 */
export function usePersistentForm<T extends Record<string, any>>(
  storageKey: string,
  defaults: T,
): [T, (update: Partial<T>) => void, () => void] {
  // Initialize state from localStorage or defaults
  const [values, setValuesState] = useState<T>(() => {
    // Check if localStorage is available
    if (typeof window === "undefined" || !window.localStorage) {
      return defaults;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new fields added to forms
        return { ...defaults, ...parsed };
      }
    } catch (e) {
      console.warn(`[usePersistentForm] Failed to load ${storageKey}:`, e);
    }

    return defaults;
  });

  // Update values and persist to localStorage
  const setValues = useCallback(
    (update: Partial<T>) => {
      setValuesState((prev) => {
        const newValues = { ...prev, ...update };

        // Persist to localStorage
        if (typeof window !== "undefined" && window.localStorage) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(newValues));
          } catch (e) {
            // Handle quota exceeded or other errors
            if (e instanceof Error && e.name === "QuotaExceededError") {
              console.warn(
                `[usePersistentForm] localStorage quota exceeded for ${storageKey}`,
              );
            } else {
              console.warn(
                `[usePersistentForm] Failed to save ${storageKey}:`,
                e,
              );
            }
          }
        }

        return newValues;
      });
    },
    [storageKey],
  );

  // Reset to defaults and clear localStorage
  const reset = useCallback(() => {
    setValuesState(defaults);

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {
        console.warn(`[usePersistentForm] Failed to clear ${storageKey}:`, e);
      }
    }
  }, [storageKey, defaults]);

  return [values, setValues, reset];
}

/**
 * Helper to extract default values from form field definitions
 */
export function getDefaultValues(
  fields: Array<{ name: string; default?: any }>,
): Record<string, any> {
  const defaults: Record<string, any> = {};
  fields.forEach((field) => {
    if (field.default !== undefined) {
      defaults[field.name] = field.default;
    }
  });
  return defaults;
}

/**
 * Main Sweep Manager component - sidebar widget
 */

import React, { useState } from 'react';
import { ReactWidget } from '@jupyterlab/ui-components';
import { INotebookTracker } from '@jupyterlab/notebook';
import { SweepType } from '../types';

/**
 * Props for the SweepManagerComponent
 */
interface SweepManagerComponentProps {
  notebookTracker: INotebookTracker;
}

/**
 * Main React component for the Sweep Manager
 */
const SweepManagerComponent: React.FC<SweepManagerComponentProps> = ({
  notebookTracker
}) => {
  const [selectedSweepType, setSelectedSweepType] = useState<SweepType>('sweep1d');

  return (
    <div className="qmeasure-sweep-manager">
      <div className="qmeasure-header">
        <h2>Sweep Manager</h2>
        <p className="qmeasure-subtitle">MeasureIt Code Generator</p>
      </div>

      <div className="qmeasure-tabs">
        <button
          className={`qmeasure-tab ${selectedSweepType === 'sweep0d' ? 'active' : ''}`}
          onClick={() => setSelectedSweepType('sweep0d')}
        >
          Sweep0D
        </button>
        <button
          className={`qmeasure-tab ${selectedSweepType === 'sweep1d' ? 'active' : ''}`}
          onClick={() => setSelectedSweepType('sweep1d')}
        >
          Sweep1D
        </button>
        <button
          className={`qmeasure-tab ${selectedSweepType === 'sweep2d' ? 'active' : ''}`}
          onClick={() => setSelectedSweepType('sweep2d')}
        >
          Sweep2D
        </button>
        <button
          className={`qmeasure-tab ${selectedSweepType === 'simulsweep' ? 'active' : ''}`}
          onClick={() => setSelectedSweepType('simulsweep')}
        >
          SimulSweep
        </button>
      </div>

      <div className="qmeasure-content">
        <p>Selected: {selectedSweepType}</p>
        <p className="qmeasure-info">
          Form components coming soon...
        </p>
      </div>
    </div>
  );
};

/**
 * Lumino Widget wrapper for the React component
 */
export class SweepManagerWidget extends ReactWidget {
  private notebookTracker: INotebookTracker;

  constructor(notebookTracker: INotebookTracker) {
    super();
    this.notebookTracker = notebookTracker;
    this.addClass('qmeasure-widget');
    this.title.label = 'Sweep Manager';
  }

  render(): JSX.Element {
    return <SweepManagerComponent notebookTracker={this.notebookTracker} />;
  }
}

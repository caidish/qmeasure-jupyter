/**
 * Main Sweep Manager component - sidebar widget
 */

import React, { useState } from 'react';
import { ReactWidget } from '@jupyterlab/ui-components';
import { INotebookTracker } from '@jupyterlab/notebook';
import { SweepType, Sweep0DParameters, Sweep1DParameters, Sweep2DParameters, SimulSweepParameters } from '../types';
import { Sweep0DForm } from './Sweep0DForm';
import { Sweep1DForm } from './Sweep1DForm';
import { Sweep2DForm } from './Sweep2DForm';
import { SimulSweepForm } from './SimulSweepForm';
import { DatabaseForm } from './DatabaseForm';
import { generateSweep0D, generateSweep1D, generateSweep2D, generateSimulSweep, renderSweepCode } from '../services/CodeGenerator';

type TabType = SweepType | 'database';

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
  const [selectedTab, setSelectedTab] = useState<TabType>('sweep1d');
  const [lastSweepName, setLastSweepName] = useState<string>('s_1D');
  const [pendingStartCode, setPendingStartCode] = useState<string | null>(null);

  const insertCode = (code: string) => {
    const notebook = notebookTracker.currentWidget?.content;
    if (!notebook) {
      alert('No active notebook found');
      return;
    }

    const model = notebook.model;
    if (!model) {
      alert('No notebook model available');
      return;
    }

    const sharedModel = model.sharedModel;
    const activeIndex = Math.max(0, notebook.activeCellIndex);
    const insertIndex = Math.min(sharedModel.cells.length, activeIndex + 1);

    sharedModel.transact(() => {
      sharedModel.insertCell(insertIndex, {
        cell_type: 'code',
        source: code
      });
    });

    notebook.activeCellIndex = insertIndex;
    const newCell = notebook.widgets[insertIndex];
    if (newCell) {
      void notebook.scrollToCell(newCell, 'center');
    }
    notebook.mode = 'edit';
  };

  const handleGenerate = (params: any) => {
    let sweepCode;
    let sweepName = 's_1D';

    switch (selectedTab as SweepType) {
      case 'sweep0d':
        sweepCode = generateSweep0D(params as Sweep0DParameters);
        sweepName = (params as Sweep0DParameters).sweep_name || 's_0D';
        break;
      case 'sweep1d':
        sweepCode = generateSweep1D(params as Sweep1DParameters);
        sweepName = (params as Sweep1DParameters).sweep_name || 's_1D';
        break;
      case 'sweep2d':
        sweepCode = generateSweep2D(params as Sweep2DParameters);
        sweepName = (params as Sweep2DParameters).sweep_name || 's_2D';
        break;
      case 'simulsweep':
        sweepCode = generateSimulSweep(params as SimulSweepParameters);
        sweepName = (params as SimulSweepParameters).sweep_name || 's_simul';
        break;
      default:
        alert('This sweep type is not yet implemented');
        return;
    }

    // If save_data is true, defer start code until after database setup
    const includeStart = !params.save_data;
    const code = renderSweepCode(sweepCode, includeStart);

    setLastSweepName(sweepName);
    insertCode(code);

    // Store start code for database form if save_data is enabled
    if (params.save_data) {
      setPendingStartCode(sweepCode.start);
      setSelectedTab('database');
    } else {
      setPendingStartCode(null);
    }
  };

  const handleDatabaseGenerate = (code: string) => {
    insertCode(code);
  };

  const renderForm = () => {
    switch (selectedTab) {
      case 'sweep0d':
        return <Sweep0DForm onGenerate={handleGenerate} />;
      case 'sweep1d':
        return <Sweep1DForm onGenerate={handleGenerate} />;
      case 'sweep2d':
        return <Sweep2DForm onGenerate={handleGenerate} />;
      case 'simulsweep':
        return <SimulSweepForm onGenerate={handleGenerate} />;
      case 'database':
        return <DatabaseForm sweepName={lastSweepName} startCode={pendingStartCode} onGenerate={handleDatabaseGenerate} />;
      default:
        return null;
    }
  };

  return (
    <div className="qmeasure-sweep-manager">
      <div className="qmeasure-header">
        <h2>Sweep Manager</h2>
        <p className="qmeasure-subtitle">MeasureIt Code Generator</p>
      </div>

      <div className="qmeasure-tabs">
        <button
          className={`qmeasure-tab ${selectedTab === 'sweep0d' ? 'active' : ''}`}
          onClick={() => setSelectedTab('sweep0d')}
        >
          Sweep0D
        </button>
        <button
          className={`qmeasure-tab ${selectedTab === 'sweep1d' ? 'active' : ''}`}
          onClick={() => setSelectedTab('sweep1d')}
        >
          Sweep1D
        </button>
        <button
          className={`qmeasure-tab ${selectedTab === 'sweep2d' ? 'active' : ''}`}
          onClick={() => setSelectedTab('sweep2d')}
        >
          Sweep2D
        </button>
        <button
          className={`qmeasure-tab ${selectedTab === 'simulsweep' ? 'active' : ''}`}
          onClick={() => setSelectedTab('simulsweep')}
        >
          SimulSweep
        </button>
        <button
          className={`qmeasure-tab ${selectedTab === 'database' ? 'active' : ''}`}
          onClick={() => setSelectedTab('database')}
        >
          Database
        </button>
      </div>

      <div className="qmeasure-content">
        {renderForm()}
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

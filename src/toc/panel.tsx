/**
 * Right sidebar panel for displaying sweep details
 */

import React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { ParsedSweep } from './parser';

/**
 * Icon map for sweep types
 */
const SWEEP_ICONS: Record<string, string> = {
  sweep0d: '⏱',
  sweep1d: '📈',
  sweep2d: '📊',
  simulsweep: '🔄',
  sweepqueue: '📋'
};

/**
 * Props for the details component
 */
interface SweepDetailsProps {
  sweep: ParsedSweep | null;
}

/**
 * React component for sweep details
 */
const SweepDetailsComponent: React.FC<SweepDetailsProps> = ({ sweep }) => {
  if (!sweep) {
    return (
      <div className="jp-SweepDetails-empty">
        <div className="jp-SweepDetails-empty-icon">📊</div>
        <div className="jp-SweepDetails-empty-text">Select a sweep in the Table of Contents to view details</div>
      </div>
    );
  }

  const icon = SWEEP_ICONS[sweep.type] || '📊';
  const typeName = sweep.type.charAt(0).toUpperCase() + sweep.type.slice(1);

  // Build parameter list
  const params: Array<{ label: string; value: string }> = [];
  const { type, metrics, flags } = sweep;

  switch (type) {
    case 'sweep0d':
      if (metrics.maxTime) params.push({ label: 'Max Time', value: `${metrics.maxTime} s` });
      if (metrics.interDelay) params.push({ label: 'Interval', value: `${metrics.interDelay} s` });
      if (metrics.plotBin) params.push({ label: 'Plot Bin', value: metrics.plotBin });
      if (metrics.xAxisTime) params.push({ label: 'X-Axis Time', value: metrics.xAxisTime });
      break;

    case 'sweep1d':
      if (metrics.setParam) params.push({ label: 'Parameter', value: metrics.setParam });
      if (metrics.start) params.push({ label: 'Start', value: metrics.start });
      if (metrics.stop) params.push({ label: 'Stop', value: metrics.stop });
      if (metrics.step) params.push({ label: 'Step', value: metrics.step });
      if (metrics.interDelay) params.push({ label: 'Delay', value: `${metrics.interDelay} s` });
      if (metrics.xAxisTime) params.push({ label: 'X-Axis Time', value: metrics.xAxisTime });
      break;

    case 'sweep2d':
      // Inner sweep parameters
      if (metrics.innerParam) params.push({ label: 'Inner Param', value: metrics.innerParam });
      if (metrics.innerStart) params.push({ label: 'Inner Start', value: metrics.innerStart });
      if (metrics.innerStop) params.push({ label: 'Inner Stop', value: metrics.innerStop });
      if (metrics.innerStep) params.push({ label: 'Inner Step', value: metrics.innerStep });

      // Outer sweep parameters
      if (metrics.outerParam) params.push({ label: 'Outer Param', value: metrics.outerParam });
      if (metrics.outerStart) params.push({ label: 'Outer Start', value: metrics.outerStart });
      if (metrics.outerStop) params.push({ label: 'Outer Stop', value: metrics.outerStop });
      if (metrics.outerStep) params.push({ label: 'Outer Step', value: metrics.outerStep });

      // If no extracted params, show the full list representation
      if (params.length === 0) {
        if (metrics.innerSweep) params.push({ label: 'Inner Sweep', value: metrics.innerSweep });
        if (metrics.outerSweep) params.push({ label: 'Outer Sweep', value: metrics.outerSweep });
      }
      break;

    case 'simulsweep':
      // Show count and global options
      if (metrics.paramCount) params.push({ label: 'Parameters', value: String(metrics.paramCount) });
      if (metrics.interDelay) params.push({ label: 'Inter Delay', value: `${metrics.interDelay} s` });
      if (metrics.plotBin) params.push({ label: 'Plot Bin', value: metrics.plotBin });
      break;
  }

  // Build flags list
  const flagList: Array<{ label: string; icon: string }> = [];
  if (flags.bidirectional) flagList.push({ label: 'Bidirectional', icon: '↔' });
  if (flags.continual) flagList.push({ label: 'Continual', icon: '∞' });
  if (flags.plotData) flagList.push({ label: 'Plot Data', icon: '📊' });
  if (flags.saveData) flagList.push({ label: 'Save Data', icon: '💾' });

  return (
    <div className="jp-SweepDetails-content">
      {/* Header */}
      <div className="jp-SweepDetails-header">
        <span className="jp-SweepDetails-icon">{icon}</span>
        <div className="jp-SweepDetails-title">
          <div className="jp-SweepDetails-type">{typeName}</div>
          <div className="jp-SweepDetails-name">{sweep.name}</div>
        </div>
        {!sweep.complete && (
          <span className="jp-SweepDetails-warning" title="Some parameters missing">
            ⚠
          </span>
        )}
      </div>

      {/* Parameters Section */}
      {params.length > 0 && (
        <div className="jp-SweepDetails-section">
          <div className="jp-SweepDetails-section-title">Parameters</div>
          <div className="jp-SweepDetails-grid">
            {params.map((param, i) => (
              <React.Fragment key={i}>
                <div className="jp-SweepDetails-label">{param.label}</div>
                <div className="jp-SweepDetails-value">{param.value}</div>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Flags Section */}
      {flagList.length > 0 && (
        <div className="jp-SweepDetails-section">
          <div className="jp-SweepDetails-section-title">Flags</div>
          <div className="jp-SweepDetails-flags">
            {flagList.map((flag, i) => (
              <div key={i} className="jp-SweepDetails-flag">
                <span className="jp-SweepDetails-flag-icon">{flag.icon}</span>
                <span className="jp-SweepDetails-flag-label">{flag.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SimulSweep Parameters Table */}
      {type === 'simulsweep' && metrics.simulParams && metrics.simulParams.length > 0 && (
        <div className="jp-SweepDetails-section">
          <div className="jp-SweepDetails-section-title">Sweep Parameters</div>
          <div className="jp-SweepDetails-table">
            <div className="jp-SweepDetails-table-header">
              <div className="jp-SweepDetails-table-cell">Parameter</div>
              <div className="jp-SweepDetails-table-cell">Start</div>
              <div className="jp-SweepDetails-table-cell">Stop</div>
              <div className="jp-SweepDetails-table-cell">Step</div>
            </div>
            {metrics.simulParams.map((p, i) => (
              <div key={i} className="jp-SweepDetails-table-row">
                <div className="jp-SweepDetails-table-cell">{p.param}</div>
                <div className="jp-SweepDetails-table-cell">{p.start}</div>
                <div className="jp-SweepDetails-table-cell">{p.stop}</div>
                <div className="jp-SweepDetails-table-cell">{p.step}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow Parameters (if available) */}
      {metrics.followParams && metrics.followParams.length > 0 && (
        <div className="jp-SweepDetails-section">
          <div className="jp-SweepDetails-section-title">Follow Parameters</div>
          <ul className="jp-SweepDetails-list">
            {metrics.followParams.map((param, i) => (
              <li key={i} className="jp-SweepDetails-list-item">{param}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * Lumino widget wrapper for sweep details panel
 */
export class SweepDetailsPanel extends ReactWidget {
  private sweep: ParsedSweep | null = null;

  constructor() {
    super();
    this.id = 'qmeasure-sweep-details';
    this.title.label = 'Sweep Details';
    this.title.caption = 'QMeasure Sweep Details';
    this.title.closable = true;
    this.addClass('jp-SweepDetailsPanel');
  }

  /**
   * Update the displayed sweep
   */
  updateDetails(sweep: ParsedSweep | null): void {
    this.sweep = sweep;
    this.update();
  }

  /**
   * Clear the panel
   */
  clear(): void {
    this.updateDetails(null);
  }

  protected render(): JSX.Element {
    return <SweepDetailsComponent sweep={this.sweep} />;
  }
}

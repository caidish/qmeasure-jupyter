/**
 * JupyterLab plugin definition for QMeasure Sweep Manager
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { INotebookTracker } from '@jupyterlab/notebook';

import { ICommandPalette } from '@jupyterlab/apputils';

import { SweepManagerWidget } from './components/SweepManager';

/**
 * The plugin registration information.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'qmeasure-jupyter:plugin',
  description: 'JupyterLab extension for QMeasure/MeasureIt sweep management',
  autoStart: true,
  requires: [INotebookTracker],
  optional: [ICommandPalette],
  activate: (
    app: JupyterFrontEnd,
    notebookTracker: INotebookTracker,
    palette: ICommandPalette | null
  ) => {
    console.log('JupyterLab extension qmeasure-jupyter is activated!');

    // Create the sweep manager widget
    const sweepManager = new SweepManagerWidget(notebookTracker);
    sweepManager.id = 'qmeasure-sweep-manager';
    sweepManager.title.caption = 'Sweep Manager';

    // Add widget to left sidebar
    app.shell.add(sweepManager, 'left', { rank: 500 });

    // Add command to toggle visibility
    const command = 'qmeasure:toggle-sweep-manager';
    app.commands.addCommand(command, {
      label: 'Toggle Sweep Manager',
      execute: () => {
        if (sweepManager.isVisible) {
          app.shell.activateById(sweepManager.id);
        }
      }
    });

    // Add command to palette
    if (palette) {
      palette.addItem({
        command,
        category: 'QMeasure'
      });
    }
  }
};

export default plugin;

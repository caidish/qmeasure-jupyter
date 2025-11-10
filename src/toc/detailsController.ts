/**
 * Controller for managing the sweep details panel
 */

import { JupyterFrontEnd } from '@jupyterlab/application';
import { SweepDetailsPanel } from './panel';
import { ParsedSweep } from './parser';

/**
 * Singleton controller for sweep details panel
 */
export class SweepDetailsController {
  private static instance: SweepDetailsController | null = null;
  private panel: SweepDetailsPanel | null = null;
  private app: JupyterFrontEnd | null = null;
  private currentNotebook: string | null = null;

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): SweepDetailsController {
    if (!SweepDetailsController.instance) {
      SweepDetailsController.instance = new SweepDetailsController();
    }
    return SweepDetailsController.instance;
  }

  /**
   * Initialize the controller with the JupyterLab application
   */
  init(app: JupyterFrontEnd): void {
    this.app = app;
    this.panel = new SweepDetailsPanel();

    // Add panel to right sidebar
    app.shell.add(this.panel, 'right', { rank: 700 });

    console.log('[Sweep Details] Controller initialized');
  }

  /**
   * Show sweep details in the panel
   */
  showSweep(sweep: ParsedSweep, notebookPath: string): void {
    if (!this.panel || !this.app) {
      console.warn('[Sweep Details] Controller not initialized');
      return;
    }

    // Update current notebook
    this.currentNotebook = notebookPath;

    // Update panel content
    this.panel.updateDetails(sweep);

    // Activate the panel (make it visible)
    this.app.shell.activateById(this.panel.id);

    console.log('[Sweep Details] Showing sweep:', sweep.name);
  }

  /**
   * Clear panel if the given notebook path matches current
   */
  clearIfNotebook(path: string): void {
    if (this.currentNotebook === path && this.panel) {
      this.panel.clear();
      this.currentNotebook = null;
      console.log('[Sweep Details] Cleared for notebook:', path);
    }
  }

  /**
   * Set current notebook (for tracking)
   */
  setNotebook(path: string): void {
    if (this.currentNotebook !== path && this.panel) {
      // Different notebook, clear panel
      this.panel.clear();
    }
    this.currentNotebook = path;
  }

  /**
   * Deactivate and cleanup
   */
  deactivate(): void {
    if (this.panel && this.app) {
      this.panel.dispose();
      this.panel = null;
    }
    this.app = null;
    this.currentNotebook = null;
    console.log('[Sweep Details] Controller deactivated');
  }
}

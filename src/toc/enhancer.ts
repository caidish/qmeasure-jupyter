/**
 * ToC enhancer that detects sweep headings and connects them to the details panel
 */

import { Widget } from '@lumino/widgets';
import { sweepDetailsStore } from './store';
import { ParsedSweep } from './parser';
import { SweepDetailsController } from './detailsController';

/**
 * Enhancer that detects sweep items in the ToC and wires up click handlers
 */
export class SweepTocEnhancer {
  private observer: MutationObserver | null = null;
  private tocWidget: Widget | null = null;
  private notebookPath: string = '';
  private decoratedItems = new WeakSet<HTMLElement>();
  private controller: SweepDetailsController;

  constructor() {
    this.controller = SweepDetailsController.getInstance();
  }

  /**
   * Activate the enhancer
   */
  activate(tocWidget: Widget, notebookPath: string): void {
    this.tocWidget = tocWidget;
    this.notebookPath = notebookPath;

    // Set current notebook in controller
    this.controller.setNotebook(notebookPath);

    // Attempt to locate the ToC container, retrying a few times if needed
    this.tryInitialize(0);
  }

  /**
   * Deactivate the enhancer
   */
  deactivate(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.tocWidget = null;
    this.decoratedItems = new WeakSet();
    console.log('[Sweep ToC] Enhancer deactivated');
  }

  /**
   * Attempt to find the content container, retrying if it is not yet rendered
   */
  private tryInitialize(attempt: number): void {
    const contentContainer = this.findContentContainer();

    if (!contentContainer) {
      if (attempt < 10) {
        // Retry after a short delay – the widget may not be rendered yet
        window.setTimeout(() => this.tryInitialize(attempt + 1), 100);
      } else {
        console.warn('[Sweep ToC] Could not find ToC content container after multiple attempts');
      }
      return;
    }

    this.setupObserver(contentContainer);
    console.log('[Sweep ToC] Enhancer activated');
  }

  /**
   * Set up decoration and MutationObserver once the container is available
   */
  private setupObserver(contentContainer: HTMLElement): void {
    // Disconnect any existing observer
    if (this.observer) {
      this.observer.disconnect();
    }

    // Initial decoration
    this.decorateSweepItems(contentContainer);

    // Set up MutationObserver to watch for DOM changes
    this.observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          this.decorateSweepItems(contentContainer);
        }
      }
    });

    this.observer.observe(contentContainer, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Find the ToC content container
   */
  private findContentContainer(): HTMLElement | null {
    if (!this.tocWidget) return null;

    const node = this.tocWidget.node;
    console.log('[Sweep ToC] ToC widget node:', node);
    console.log('[Sweep ToC] ToC widget classes:', node.className);

    // Try multiple selectors to find the ToC content
    const selectors = [
      '.jp-TableOfContents-content',
      '.jp-TableOfContents',
      '.toc-content',
      '.jp-toc-content'
    ];

    for (const selector of selectors) {
      const container = node.querySelector(selector) as HTMLElement;
      if (container) {
        console.log(`[Sweep ToC] Found content container with selector: ${selector}`);
        return container;
      }
    }

    // If no specific container found, use the node itself
    console.log('[Sweep ToC] Using widget node as container');
    return node;
  }

  /**
   * Decorate all sweep items in the ToC
   */
  private decorateSweepItems(container: HTMLElement): void {
    // Find all ToC items
    const items = container.querySelectorAll('.jp-tocItem');

    for (const item of Array.from(items)) {
      const htmlItem = item as HTMLElement;

      // Skip if already decorated
      if (this.decoratedItems.has(htmlItem)) {
        continue;
      }

      // Check if this is a sweep item by examining the text content
      const textNode = htmlItem.querySelector('.jp-tocItem-content');
      if (!textNode) continue;

      const dataset = (textNode as HTMLElement).dataset;
      const sweepNameAttr = dataset?.sweepName;
      const sweepTypeAttr = dataset?.sweepType;
      const cellIndexAttr = dataset?.cellIndex;
      const iconAttr = dataset?.sweepIcon;

      // Skip if not a sweep item
      if (!sweepNameAttr || !sweepTypeAttr || !cellIndexAttr) {
        // Fall back to text content parsing if dataset attributes are missing
        const text = textNode.textContent || '';
        const sweepMatch = text.match(/^([⏱📈📊🔄📋])\s+(\w+)/);
        if (!sweepMatch) {
          continue;
        }
        // Cannot determine cell index from text - skip with warning
        console.warn('[Sweep ToC] Item missing dataset attributes - skipping:', text);
        continue;
      }

      const cellIndex = parseInt(cellIndexAttr, 10);
      if (isNaN(cellIndex)) {
        console.warn('[Sweep ToC] Invalid cellIndex attribute:', cellIndexAttr);
        continue;
      }

      // Deterministic lookup using unique triple key
      const sweepData = sweepDetailsStore.get(this.notebookPath, cellIndex, sweepNameAttr);
      if (!sweepData) {
        console.debug(`[Sweep ToC] No data found for sweep at ${this.notebookPath}:${cellIndex}:${sweepNameAttr}`);
        continue;
      }

      // Decorate this item
      this.decorateItem(htmlItem, textNode as HTMLElement, sweepData, iconAttr || '📊', sweepNameAttr);
      this.decoratedItems.add(htmlItem);
    }
  }

  /**
   * Decorate a single sweep item by adding click handler
   */
  private decorateItem(
    item: HTMLElement,
    textNode: HTMLElement,
    sweep: ParsedSweep,
    icon: string,
    name: string
  ): void {
    // Add sweep class to the item
    item.classList.add('jp-TocSweep', 'jp-TocSweep-clickable');
    textNode.classList.add('jp-TocSweep-heading');

    const dataset = (textNode as HTMLElement).dataset ?? {};
    const iconAttr = dataset['sweepIcon'];
    const sweepNameAttr = dataset['sweepName'];

    const resolvedIcon = iconAttr || icon;
    const resolvedName = sweepNameAttr || name;

    // Clear the text node and rebuild it with enhanced markup
    textNode.innerHTML = '';

    // Create structured elements
    const iconSpan = document.createElement('span');
    iconSpan.className = 'jp-TocSweep-icon';
    iconSpan.textContent = resolvedIcon;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'jp-TocSweep-name';
    nameSpan.textContent = resolvedName;

    textNode.appendChild(iconSpan);
    textNode.appendChild(nameSpan);

    // Add warning if incomplete
    if (!sweep.complete) {
      const warning = document.createElement('span');
      warning.className = 'jp-TocSweep-warning';
      warning.textContent = '⚠';
      warning.title = 'Some parameters missing';
      textNode.appendChild(warning);
    }

    // Add click handler to show details in panel
    const clickHandler = (e: MouseEvent) => {
      // Allow default ToC navigation to happen, but also show details
      this.controller.showSweep(sweep, this.notebookPath);
    };

    textNode.addEventListener('click', clickHandler);
  }
}

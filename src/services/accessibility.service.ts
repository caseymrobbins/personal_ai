/**
 * Accessibility Service
 *
 * Provides utilities for WCAG 2.1 AA compliance:
 * - Screen reader announcements (live regions)
 * - Focus management
 * - Keyboard navigation helpers
 * - ARIA utilities
 */

export type AnnouncementPriority = 'polite' | 'assertive';

class AccessibilityService {
  private liveRegion: HTMLDivElement | null = null;
  private initialized = false;

  /**
   * Initialize the accessibility service
   * Creates a live region for screen reader announcements
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    // Create live region for announcements
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'sr-only'; // Screen reader only
    this.liveRegion.style.position = 'absolute';
    this.liveRegion.style.left = '-10000px';
    this.liveRegion.style.width = '1px';
    this.liveRegion.style.height = '1px';
    this.liveRegion.style.overflow = 'hidden';

    document.body.appendChild(this.liveRegion);

    this.initialized = true;
    console.log('[AccessibilityService] Initialized');
  }

  /**
   * Announce a message to screen readers
   */
  announce(message: string, priority: AnnouncementPriority = 'polite'): void {
    if (!this.liveRegion) {
      console.warn('[AccessibilityService] Not initialized, cannot announce');
      return;
    }

    // Update aria-live priority
    this.liveRegion.setAttribute('aria-live', priority);

    // Clear and set new message
    this.liveRegion.textContent = '';

    // Use setTimeout to ensure the announcement is picked up
    setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = message;
      }
    }, 100);

    // Clear after announcement
    setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = '';
      }
    }, 1000);
  }

  /**
   * Focus an element and scroll it into view
   */
  focusElement(element: HTMLElement | null, options?: FocusOptions): void {
    if (!element) {
      return;
    }

    element.focus(options);

    // Ensure element is visible
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }

  /**
   * Get the first focusable element within a container
   */
  getFirstFocusable(container: HTMLElement): HTMLElement | null {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ];

    const selector = focusableSelectors.join(', ');
    return container.querySelector(selector);
  }

  /**
   * Get all focusable elements within a container
   */
  getAllFocusable(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ];

    const selector = focusableSelectors.join(', ');
    return Array.from(container.querySelectorAll(selector));
  }

  /**
   * Trap focus within a container (for modals/dialogs)
   */
  trapFocus(container: HTMLElement, event: KeyboardEvent): void {
    if (event.key !== 'Tab') {
      return;
    }

    const focusableElements = this.getAllFocusable(container);

    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab: moving backwards
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: moving forwards
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  /**
   * Check if an element is visible on screen
   */
  isVisible(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    const viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
    const viewWidth = Math.max(document.documentElement.clientWidth, window.innerWidth);

    return (
      rect.bottom >= 0 &&
      rect.right >= 0 &&
      rect.top < viewHeight &&
      rect.left < viewWidth
    );
  }

  /**
   * Generate a unique ID for ARIA associations
   */
  generateId(prefix: string = 'a11y'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get color contrast ratio between two colors
   */
  getContrastRatio(color1: string, color2: string): number {
    const getLuminance = (color: string): number => {
      // Convert hex to RGB
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;

      // Calculate relative luminance
      const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
      const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
      const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

      return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB;
    };

    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Check if color contrast meets WCAG AA standards
   */
  meetsContrastAA(foreground: string, background: string, isLargeText: boolean = false): boolean {
    const ratio = this.getContrastRatio(foreground, background);
    const threshold = isLargeText ? 3 : 4.5; // WCAG AA: 4.5:1 normal, 3:1 large text
    return ratio >= threshold;
  }

  /**
   * Check if color contrast meets WCAG AAA standards
   */
  meetsContrastAAA(foreground: string, background: string, isLargeText: boolean = false): boolean {
    const ratio = this.getContrastRatio(foreground, background);
    const threshold = isLargeText ? 4.5 : 7; // WCAG AAA: 7:1 normal, 4.5:1 large text
    return ratio >= threshold;
  }

  /**
   * Add keyboard navigation to a list
   */
  enableListNavigation(
    listElement: HTMLElement,
    onSelect?: (element: HTMLElement) => void
  ): () => void {
    const handleKeyDown = (event: KeyboardEvent) => {
      const items = this.getAllFocusable(listElement);
      const currentIndex = items.findIndex(item => item === document.activeElement);

      if (currentIndex === -1) {
        return;
      }

      let nextIndex = currentIndex;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          nextIndex = Math.min(currentIndex + 1, items.length - 1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          nextIndex = Math.max(currentIndex - 1, 0);
          break;
        case 'Home':
          event.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          nextIndex = items.length - 1;
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (onSelect) {
            onSelect(items[currentIndex]);
          }
          return;
        default:
          return;
      }

      if (nextIndex !== currentIndex && items[nextIndex]) {
        items[nextIndex].focus();
      }
    };

    listElement.addEventListener('keydown', handleKeyDown);

    // Return cleanup function
    return () => {
      listElement.removeEventListener('keydown', handleKeyDown);
    };
  }

  /**
   * Create a skip link element
   */
  createSkipLink(targetId: string, label: string): HTMLAnchorElement {
    const skipLink = document.createElement('a');
    skipLink.href = `#${targetId}`;
    skipLink.className = 'skip-link';
    skipLink.textContent = label;

    // Style for skip link (visible on focus)
    skipLink.style.position = 'absolute';
    skipLink.style.top = '-40px';
    skipLink.style.left = '0';
    skipLink.style.background = '#000';
    skipLink.style.color = '#fff';
    skipLink.style.padding = '8px';
    skipLink.style.textDecoration = 'none';
    skipLink.style.zIndex = '10000';
    skipLink.style.transition = 'top 0.2s';

    // Show on focus
    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '0';
    });

    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });

    return skipLink;
  }

  /**
   * Cleanup the service
   */
  destroy(): void {
    if (this.liveRegion && this.liveRegion.parentNode) {
      this.liveRegion.parentNode.removeChild(this.liveRegion);
    }
    this.liveRegion = null;
    this.initialized = false;
  }
}

// Export singleton instance
export const accessibilityService = new AccessibilityService();

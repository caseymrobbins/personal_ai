/**
 * Theme Service for SML Guardian
 *
 * Provides:
 * - Multiple color schemes (dark, light, custom)
 * - Font customization (family, size)
 * - UI density settings (compact, comfortable, spacious)
 * - CSS variable management
 * - LocalStorage persistence
 */

export type ColorScheme = 'dark' | 'light' | 'nord' | 'solarized' | 'monokai' | 'custom';
export type FontFamily = 'system' | 'inter' | 'roboto' | 'jetbrains-mono' | 'custom';
export type FontSize = 'small' | 'medium' | 'large' | 'x-large';
export type UIDensity = 'compact' | 'comfortable' | 'spacious';

export interface ThemeConfig {
  colorScheme: ColorScheme;
  fontFamily: FontFamily;
  customFontFamily?: string;
  fontSize: FontSize;
  density: UIDensity;
  customColors?: CustomColors;
}

export interface CustomColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

const DEFAULT_THEME: ThemeConfig = {
  colorScheme: 'dark',
  fontFamily: 'system',
  fontSize: 'medium',
  density: 'comfortable',
};

class ThemeService {
  private currentTheme: ThemeConfig = DEFAULT_THEME;
  private readonly STORAGE_KEY = 'sml_guardian_theme';

  /**
   * Initialize theme service
   */
  initialize(): void {
    this.loadTheme();
    this.applyTheme();
    console.log('[Theme] Service initialized with:', this.currentTheme);
  }

  /**
   * Get current theme configuration
   */
  getTheme(): ThemeConfig {
    return { ...this.currentTheme };
  }

  /**
   * Update theme configuration
   */
  setTheme(theme: Partial<ThemeConfig>): void {
    this.currentTheme = { ...this.currentTheme, ...theme };
    this.saveTheme();
    this.applyTheme();
    console.log('[Theme] Theme updated:', this.currentTheme);
  }

  /**
   * Apply theme to document
   */
  private applyTheme(): void {
    const root = document.documentElement;

    // Apply color scheme
    this.applyColorScheme(root);

    // Apply font family
    this.applyFontFamily(root);

    // Apply font size
    this.applyFontSize(root);

    // Apply density
    this.applyDensity(root);
  }

  /**
   * Apply color scheme
   */
  private applyColorScheme(root: HTMLElement): void {
    const scheme = this.currentTheme.colorScheme;

    // Set data attribute for CSS targeting
    root.setAttribute('data-color-scheme', scheme);

    // Define color palettes
    const colors = this.getColorPalette(scheme);

    // Apply CSS variables
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
  }

  /**
   * Get color palette for scheme
   */
  private getColorPalette(scheme: ColorScheme): Record<string, string> {
    switch (scheme) {
      case 'dark':
        return {
          primary: '#667eea',
          'primary-hover': '#7b8ef5',
          secondary: '#764ba2',
          background: '#0f0f1e',
          'background-elevated': '#1a1a2e',
          surface: '#16213e',
          'surface-hover': '#1e2a47',
          text: 'rgba(255, 255, 255, 0.95)',
          'text-secondary': 'rgba(255, 255, 255, 0.6)',
          'text-tertiary': 'rgba(255, 255, 255, 0.4)',
          border: 'rgba(255, 255, 255, 0.1)',
          'border-hover': 'rgba(255, 255, 255, 0.2)',
          success: '#48bb78',
          warning: '#ff9f0a',
          error: '#ff3b30',
          info: '#5ac8fa',
        };

      case 'light':
        return {
          primary: '#667eea',
          'primary-hover': '#5568d3',
          secondary: '#764ba2',
          background: '#ffffff',
          'background-elevated': '#f8f9fa',
          surface: '#ffffff',
          'surface-hover': '#f1f3f5',
          text: 'rgba(0, 0, 0, 0.95)',
          'text-secondary': 'rgba(0, 0, 0, 0.6)',
          'text-tertiary': 'rgba(0, 0, 0, 0.4)',
          border: 'rgba(0, 0, 0, 0.1)',
          'border-hover': 'rgba(0, 0, 0, 0.2)',
          success: '#2f855a',
          warning: '#d97706',
          error: '#dc2626',
          info: '#0284c7',
        };

      case 'nord':
        return {
          primary: '#88c0d0',
          'primary-hover': '#a3d4e6',
          secondary: '#81a1c1',
          background: '#2e3440',
          'background-elevated': '#3b4252',
          surface: '#434c5e',
          'surface-hover': '#4c566a',
          text: '#eceff4',
          'text-secondary': '#d8dee9',
          'text-tertiary': '#c0c5ce',
          border: 'rgba(216, 222, 233, 0.15)',
          'border-hover': 'rgba(216, 222, 233, 0.25)',
          success: '#a3be8c',
          warning: '#ebcb8b',
          error: '#bf616a',
          info: '#5e81ac',
        };

      case 'solarized':
        return {
          primary: '#268bd2',
          'primary-hover': '#3fa0e8',
          secondary: '#6c71c4',
          background: '#002b36',
          'background-elevated': '#073642',
          surface: '#073642',
          'surface-hover': '#0e4755',
          text: '#839496',
          'text-secondary': '#657b83',
          'text-tertiary': '#586e75',
          border: 'rgba(131, 148, 150, 0.15)',
          'border-hover': 'rgba(131, 148, 150, 0.25)',
          success: '#859900',
          warning: '#b58900',
          error: '#dc322f',
          info: '#2aa198',
        };

      case 'monokai':
        return {
          primary: '#a6e22e',
          'primary-hover': '#b8ea48',
          secondary: '#f92672',
          background: '#272822',
          'background-elevated': '#2d2e27',
          surface: '#3e3d32',
          'surface-hover': '#49483e',
          text: '#f8f8f2',
          'text-secondary': '#cfcfc2',
          'text-tertiary': '#a8a896',
          border: 'rgba(248, 248, 242, 0.15)',
          'border-hover': 'rgba(248, 248, 242, 0.25)',
          success: '#a6e22e',
          warning: '#e6db74',
          error: '#f92672',
          info: '#66d9ef',
        };

      case 'custom':
        if (this.currentTheme.customColors) {
          const custom = this.currentTheme.customColors;
          return {
            primary: custom.primary,
            'primary-hover': this.lighten(custom.primary, 10),
            secondary: custom.secondary,
            background: custom.background,
            'background-elevated': this.lighten(custom.background, 5),
            surface: custom.surface,
            'surface-hover': this.lighten(custom.surface, 5),
            text: custom.text,
            'text-secondary': custom.textSecondary,
            'text-tertiary': this.adjustOpacity(custom.textSecondary, 0.7),
            border: custom.border,
            'border-hover': this.adjustOpacity(custom.border, 1.5),
            success: custom.success,
            warning: custom.warning,
            error: custom.error,
            info: this.currentTheme.customColors.primary,
          };
        }
        return this.getColorPalette('dark');

      default:
        return this.getColorPalette('dark');
    }
  }

  /**
   * Apply font family
   */
  private applyFontFamily(root: HTMLElement): void {
    const { fontFamily, customFontFamily } = this.currentTheme;

    let fontStack: string;

    switch (fontFamily) {
      case 'system':
        fontStack = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
        break;
      case 'inter':
        fontStack = '"Inter", -apple-system, sans-serif';
        break;
      case 'roboto':
        fontStack = '"Roboto", -apple-system, sans-serif';
        break;
      case 'jetbrains-mono':
        fontStack = '"JetBrains Mono", "Monaco", "Courier New", monospace';
        break;
      case 'custom':
        fontStack = customFontFamily || 'system-ui, sans-serif';
        break;
      default:
        fontStack = 'system-ui, sans-serif';
    }

    root.style.setProperty('--font-family', fontStack);
  }

  /**
   * Apply font size
   */
  private applyFontSize(root: HTMLElement): void {
    const sizes = {
      small: '14px',
      medium: '16px',
      large: '18px',
      'x-large': '20px',
    };

    root.style.setProperty('--base-font-size', sizes[this.currentTheme.fontSize]);
  }

  /**
   * Apply UI density
   */
  private applyDensity(root: HTMLElement): void {
    const densities = {
      compact: {
        spacing: '0.5rem',
        'spacing-sm': '0.25rem',
        'spacing-md': '0.75rem',
        'spacing-lg': '1rem',
        'padding': '0.5rem',
        'padding-sm': '0.25rem',
        'padding-md': '0.75rem',
        'padding-lg': '1rem',
      },
      comfortable: {
        spacing: '1rem',
        'spacing-sm': '0.5rem',
        'spacing-md': '1.5rem',
        'spacing-lg': '2rem',
        'padding': '1rem',
        'padding-sm': '0.5rem',
        'padding-md': '1.5rem',
        'padding-lg': '2rem',
      },
      spacious: {
        spacing: '1.5rem',
        'spacing-sm': '0.75rem',
        'spacing-md': '2rem',
        'spacing-lg': '3rem',
        'padding': '1.5rem',
        'padding-sm': '0.75rem',
        'padding-md': '2rem',
        'padding-lg': '3rem',
      },
    };

    const density = densities[this.currentTheme.density];

    Object.entries(density).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });

    root.setAttribute('data-density', this.currentTheme.density);
  }

  /**
   * Save theme to localStorage
   */
  private saveTheme(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentTheme));
    } catch (err) {
      console.error('[Theme] Failed to save theme:', err);
    }
  }

  /**
   * Load theme from localStorage
   */
  private loadTheme(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        this.currentTheme = { ...DEFAULT_THEME, ...JSON.parse(saved) };
      }
    } catch (err) {
      console.error('[Theme] Failed to load theme:', err);
      this.currentTheme = DEFAULT_THEME;
    }
  }

  /**
   * Reset theme to defaults
   */
  resetTheme(): void {
    this.currentTheme = DEFAULT_THEME;
    this.saveTheme();
    this.applyTheme();
    console.log('[Theme] Reset to default theme');
  }

  /**
   * Helper: Lighten a color
   */
  private lighten(color: string, percent: number): string {
    // Simple lightening for hex colors
    if (color.startsWith('#')) {
      const num = parseInt(color.slice(1), 16);
      const amt = Math.round(2.55 * percent);
      const R = Math.min(255, (num >> 16) + amt);
      const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
      const B = Math.min(255, (num & 0x0000ff) + amt);
      return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }
    return color;
  }

  /**
   * Helper: Adjust opacity
   */
  private adjustOpacity(color: string, factor: number): string {
    if (color.startsWith('rgba')) {
      const parts = color.match(/[\d.]+/g);
      if (parts && parts.length === 4) {
        const alpha = parseFloat(parts[3]) * factor;
        return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${Math.min(1, alpha)})`;
      }
    }
    return color;
  }
}

export const themeService = new ThemeService();

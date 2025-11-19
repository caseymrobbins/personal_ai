/**
 * Language Switcher Component
 *
 * Allows users to select their preferred language
 * - 6 language options: English, Spanish, French, German, Japanese, Chinese
 * - Accessible dropdown with ARIA labels
 * - LocalStorage persistence via i18next
 */

import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

interface Language {
  code: string;
  name: string;
  flag: string;
  native: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸', native: 'English' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', native: 'Español' },
  { code: 'fr', name: 'French', flag: '🇫🇷', native: 'Français' },
  { code: 'de', name: 'German', flag: '🇩🇪', native: 'Deutsch' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', native: '日本語' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳', native: '中文' },
];

export interface LanguageSwitcherProps {
  showLabel?: boolean;
  showNative?: boolean;
  compact?: boolean;
}

export function LanguageSwitcher({
  showLabel = true,
  showNative = false,
  compact = false,
}: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation('common');
  const currentLanguage = languages.find((lang) => lang.code === i18n.language);

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  return (
    <div className="language-switcher">
      {showLabel && (
        <label htmlFor="language-select" className="language-label">
          {t('language')}
        </label>
      )}

      <div className="language-select-wrapper">
        <select
          id="language-select"
          value={i18n.language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className={`language-select ${compact ? 'compact' : ''}`}
          aria-label={t('selectLanguage')}
          title={t('selectLanguage')}
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
              {showNative && ` (${lang.native})`}
            </option>
          ))}
        </select>

        {/* Current language indicator */}
        {currentLanguage && !compact && (
          <div className="language-current" aria-hidden="true">
            <span className="language-flag">{currentLanguage.flag}</span>
            <span className="language-name">{currentLanguage.native}</span>
          </div>
        )}
      </div>

      {/* Screen reader only text */}
      <span className="sr-only" role="status" aria-live="polite">
        {t('common:language')} {t('common:selectLanguage')}: {currentLanguage?.name}
      </span>
    </div>
  );
}

export default LanguageSwitcher;

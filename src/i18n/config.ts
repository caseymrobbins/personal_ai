/**
 * i18n Configuration
 *
 * Internationalization setup using i18next
 * - Language detection (browser language)
 * - Multiple language support
 * - Namespaced translations
 * - LocalStorage persistence
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from './locales/en/common.json';
import enChat from './locales/en/chat.json';
import enSidebar from './locales/en/sidebar.json';
import enSettings from './locales/en/settings.json';
import enAccessibility from './locales/en/accessibility.json';

import esCommon from './locales/es/common.json';
import esChat from './locales/es/chat.json';
import esSidebar from './locales/es/sidebar.json';
import esSettings from './locales/es/settings.json';
import esAccessibility from './locales/es/accessibility.json';

import frCommon from './locales/fr/common.json';
import frChat from './locales/fr/chat.json';
import frSidebar from './locales/fr/sidebar.json';
import frSettings from './locales/fr/settings.json';
import frAccessibility from './locales/fr/accessibility.json';

import deCommon from './locales/de/common.json';
import deChat from './locales/de/chat.json';
import deSidebar from './locales/de/sidebar.json';
import deSettings from './locales/de/settings.json';
import deAccessibility from './locales/de/accessibility.json';

import jaCommon from './locales/ja/common.json';
import jaChat from './locales/ja/chat.json';
import jaSidebar from './locales/ja/sidebar.json';
import jaSettings from './locales/ja/settings.json';
import jaAccessibility from './locales/ja/accessibility.json';

import zhCommon from './locales/zh/common.json';
import zhChat from './locales/zh/chat.json';
import zhSidebar from './locales/zh/sidebar.json';
import zhSettings from './locales/zh/settings.json';
import zhAccessibility from './locales/zh/accessibility.json';

// Configure i18n
const resources = {
  en: {
    common: enCommon,
    chat: enChat,
    sidebar: enSidebar,
    settings: enSettings,
    accessibility: enAccessibility,
  },
  es: {
    common: esCommon,
    chat: esChat,
    sidebar: esSidebar,
    settings: esSettings,
    accessibility: esAccessibility,
  },
  fr: {
    common: frCommon,
    chat: frChat,
    sidebar: frSidebar,
    settings: frSettings,
    accessibility: frAccessibility,
  },
  de: {
    common: deCommon,
    chat: deChat,
    sidebar: deSidebar,
    settings: deSettings,
    accessibility: deAccessibility,
  },
  ja: {
    common: jaCommon,
    chat: jaChat,
    sidebar: jaSidebar,
    settings: jaSettings,
    accessibility: jaAccessibility,
  },
  zh: {
    common: zhCommon,
    chat: zhChat,
    sidebar: zhSidebar,
    settings: zhSettings,
    accessibility: zhAccessibility,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React already handles XSS
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    react: {
      useSuspense: false, // Prevent suspense issues
    },
  });

export default i18n;

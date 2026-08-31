import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import tr from './locales/tr.json';
import en from './locales/en.json';
import da from './locales/da.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            tr: { translation: tr },
            en: { translation: en },
            da: { translation: da },
        },
        fallbackLng: 'en', // Brug engelsk som standard, hvis brugerens sprog ikke understøttes.
        supportedLngs: ['tr', 'en', 'da'], // Kun understøttede sprog.
        nonExplicitSupportedLngs: true,  // Eksempel: Hvis 'tr-TR' eller 'tr-AZ' modtages, matches det automatisk med 'tr'.
        interpolation: {
            escapeValue: false,
        },
        detection: {
            // Kontroller først localStorage; hvis der ikke findes et valg, registreres browserens sprog via navigator.
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'tradingpro_lang',
            // Hvis browsersproget f.eks. er 'tr-TR', bruges kun de første to bogstaver ('tr').
            convertDetectedLanguage: (lng) => {
                if (!lng) return 'en';
                const shortLang = lng.toLowerCase().split('-')[0];
                return ['tr', 'en', 'da'].includes(shortLang) ? shortLang : 'en';
            },
        },
    });

export default i18n;
import React from 'react';
import { useTranslation } from 'react-i18next';
import { preferenceService } from '../Services/preferenceService';

export const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation();

    // Behandler den relevante brugerhandling eller event.
    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const lang = e.target.value;
        i18n.changeLanguage(lang);
        localStorage.setItem('tradingpro_lang', lang);

        // Gem indstillingen i databasen.
        preferenceService.savePreferences({ Language: lang } as any).catch(() => { });
    };

    return (
        <div className="relative inline-block">
            <select
                value={i18n.language.startsWith('da') ? 'da' : i18n.language.startsWith('en') ? 'en' : 'tr'}
                onChange={handleLanguageChange}
                className="bg-transparent border border-gray-500/30 hover:border-gray-500/60 rounded-md px-2 py-1 text-xs font-semibold text-gray-300 outline-none cursor-pointer"
            >
                <option value="tr" className="bg-[#1e222d] text-white">🇹🇷 TR</option>
                <option value="en" className="bg-[#1e222d] text-white">🇬🇧 EN</option>
                <option value="da" className="bg-[#1e222d] text-white">🇩🇰 DA</option>
            </select>
        </div>
    );
};

import React, { useState, useEffect } from 'react';
import { X, RotateCcw, CandlestickChart as CandleIcon, Grid, Sliders, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_CHART_SETTINGS, type ChartVisualSettings } from '../Types/chartSettings';

interface ChartSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: ChartVisualSettings;
    onSave: (newSettings: ChartVisualSettings) => void;
    isDark: boolean;
}

type TabType = 'symbol' | 'grid' | 'priceLine' | 'sound';

export const ChartSettingsModal: React.FC<ChartSettingsModalProps> = ({
    isOpen,
    onClose,
    settings,
    onSave,
    isDark,
}) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabType>('symbol');
    const [formData, setFormularData] = useState<ChartVisualSettings>(() => ({
        ...DEFAULT_CHART_SETTINGS,
        ...settings,
    }));

    useEffect(() => {
        if (settings) {
            setFormularData({
                ...DEFAULT_CHART_SETTINGS,
                ...settings,
            });
        }
    }, [settings, isOpen]);

    if (!isOpen) return null;

    const handleChange = <K extends keyof ChartVisualSettings>(
        key: K,
        value: ChartVisualSettings[K]
    ) => {
        setFormularData((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    // Behandler den relevante brugerhandling eller event.
    const handleReset = () => {
        setFormularData({ ...DEFAULT_CHART_SETTINGS });
    };

    // Behandler den relevante brugerhandling eller event.
    const handleSubmit = (e: React.FormularEvent) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-2xl h-[460px] rounded-xl shadow-2xl border flex flex-col overflow-hidden transition-colors ${isDark
                        ? 'bg-[#131722] border-[#2a2e39] text-gray-200'
                        : 'bg-white border-gray-200 text-gray-800'
                    }`}
            >
                {/* Sidehoved */}
                <div
                    className={`flex items-center justify-between px-5 py-3.5 border-b ${isDark ? 'border-[#2a2e39] bg-[#1e222d]' : 'border-gray-100 bg-gray-50'
                        }`}
                >
                    <div className="flex items-center space-x-2 font-bold text-sm">
                        <Sliders className="w-4 h-4 text-[#2962ff]" />
                        <span>{t('chartSettings.title', 'Grafik & Terminal Indstillingerı')}</span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-md hover:bg-gray-500/10 text-gray-400 hover:text-gray-200 transition-colors"
                        title={t('chartSettings.cancel', 'Kapat')}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Indhold (venstre faner + højre indhold) */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Venstre fanemenu */}
                    <div
                        className={`w-48 p-2 space-y-1 border-r flex flex-col ${isDark ? 'border-[#2a2e39] bg-[#131722]' : 'border-gray-100 bg-gray-50/50'
                            }`}
                    >
                        <button
                            type="button"
                            onClick={() => setActiveTab('symbol')}
                            className={`flex items-center space-x-2.5 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'symbol'
                                    ? 'bg-[#2962ff] text-white shadow-sm'
                                    : 'text-gray-400 hover:bg-gray-500/10 hover:text-gray-200'
                                }`}
                        >
                            <CandleIcon className="w-4 h-4" />
                            <span>{t('chartSettings.tabSymbol', 'Sembol / Mum')}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('grid')}
                            className={`flex items-center space-x-2.5 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'grid'
                                    ? 'bg-[#2962ff] text-white shadow-sm'
                                    : 'text-gray-400 hover:bg-gray-500/10 hover:text-gray-200'
                                }`}
                        >
                            <Grid className="w-4 h-4" />
                            <span>{t('chartSettings.tabGrid', 'Tuval / Izgara')}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('priceLine')}
                            className={`flex items-center space-x-2.5 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'priceLine'
                                    ? 'bg-[#2962ff] text-white shadow-sm'
                                    : 'text-gray-400 hover:bg-gray-500/10 hover:text-gray-200'
                                }`}
                        >
                            <Sliders className="w-4 h-4" />
                            <span>{t('chartSettings.tabPriceLine', 'Fiyat Çizgileri')}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('sound')}
                            className={`flex items-center space-x-2.5 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'sound'
                                    ? 'bg-[#2962ff] text-white shadow-sm'
                                    : 'text-gray-400 hover:bg-gray-500/10 hover:text-gray-200'
                                }`}
                        >
                            <Bell className="w-4 h-4" />
                            <span>{t('chartSettings.tabSound', 'Alarmlar & Ses')}</span>
                        </button>
                    </div>

                    {/* Indhold i højre panel */}
                    <div className="flex-1 p-5 overflow-y-auto">
                        {activeTab === 'symbol' && (
                            <div className="space-y-5">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                    {t('chartSettings.bodyColor', 'Mum Gövdesi ve Renkleri')}
                                </h4>

                                <div className="flex items-center justify-between py-2 border-b border-gray-500/10">
                                    <span className="text-xs font-medium">{t('chartSettings.bodyColor', 'Gövde Rengi (Boğa / Ayı)')}</span>
                                    <div className="flex items-center space-x-4">
                                        <label className="flex items-center space-x-1.5 cursor-pointer">
                                            <input
                                                type="color"
                                                value={formData.upColor}
                                                onChange={(e) => handleChange('upColor', e.target.value)}
                                                className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
                                            />
                                            <span className="text-xs text-[#089981] font-semibold">{t('chartSettings.bullColor', 'Boğa')}</span>
                                        </label>
                                        <label className="flex items-center space-x-1.5 cursor-pointer">
                                            <input
                                                type="color"
                                                value={formData.downColor}
                                                onChange={(e) => handleChange('downColor', e.target.value)}
                                                className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
                                            />
                                            <span className="text-xs text-[#f23645] font-semibold">{t('chartSettings.bearColor', 'Ayı')}</span>
                                        </label>
                                    </div>
                                </div>

                                <label className="flex items-center space-x-2.5 cursor-pointer py-1">
                                    <input
                                        type="checkbox"
                                        checked={formData.showBorders}
                                        onChange={(e) => handleChange('showBorders', e.target.checked)}
                                        className="w-4 h-4 rounded text-[#2962ff] focus:ring-0 cursor-pointer"
                                    />
                                    <span className="text-xs font-medium">{t('chartSettings.showBorders', 'Kenarlıkları Göster (Borders)')}</span>
                                </label>

                                <label className="flex items-center space-x-2.5 cursor-pointer py-1">
                                    <input
                                        type="checkbox"
                                        checked={formData.showWicks}
                                        onChange={(e) => handleChange('showWicks', e.target.checked)}
                                        className="w-4 h-4 rounded text-[#2962ff] focus:ring-0 cursor-pointer"
                                    />
                                    <span className="text-xs font-medium">{t('chartSettings.showWicks', 'Fitilleri Göster (Wicks)')}</span>
                                </label>
                            </div>
                        )}

                        {activeTab === 'grid' && (
                            <div className="space-y-5">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                    {t('chartSettings.tabGrid', 'Izgara ve Çizgiler')}
                                </h4>

                                <label className="flex items-center space-x-2.5 cursor-pointer py-1">
                                    <input
                                        type="checkbox"
                                        checked={formData.showGrid}
                                        onChange={(e) => handleChange('showGrid', e.target.checked)}
                                        className="w-4 h-4 rounded text-[#2962ff] focus:ring-0 cursor-pointer"
                                    />
                                    <span className="text-xs font-medium">{t('chartSettings.showGrid', 'Izgara Çizgilerini Göster')}</span>
                                </label>

                                <div className="flex items-center justify-between py-2 border-b border-gray-500/10">
                                    <span className="text-xs font-medium">{t('chartSettings.gridDark', 'Izgara Rengi (Koyu Tema)')}</span>
                                    <input
                                        type="color"
                                        value={formData.gridColorDark}
                                        onChange={(e) => handleChange('gridColorDark', e.target.value)}
                                        className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
                                    />
                                </div>

                                <div className="flex items-center justify-between py-2 border-b border-gray-500/10">
                                    <span className="text-xs font-medium">{t('chartSettings.gridLight', 'Izgara Rengi (Açık Tema)')}</span>
                                    <input
                                        type="color"
                                        value={formData.gridColorLight}
                                        onChange={(e) => handleChange('gridColorLight', e.target.value)}
                                        className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'priceLine' && (
                            <div className="space-y-5">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                    {t('chartSettings.tabPriceLine', 'Prislinje Indstillingerı')}
                                </h4>

                                <label className="flex items-center space-x-2.5 cursor-pointer py-1">
                                    <input
                                        type="checkbox"
                                        checked={formData.showPriceLine}
                                        onChange={(e) => handleChange('showPriceLine', e.target.checked)}
                                        className="w-4 h-4 rounded text-[#2962ff] focus:ring-0 cursor-pointer"
                                    />
                                    <span className="text-xs font-medium">{t('chartSettings.showPriceLine', 'Son Prislinjeni Göster')}</span>
                                </label>
                            </div>
                        )}

                        {activeTab === 'sound' && (
                            <div className="space-y-5">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                    {t('chartSettings.tabSound', 'Ses ve Bildirimler')}
                                </h4>

                                <label className="flex items-center space-x-2.5 cursor-pointer py-1">
                                    <input
                                        type="checkbox"
                                        checked={formData.soundEnabled ?? true}
                                        onChange={(e) => handleChange('soundEnabled', e.target.checked)}
                                        className="w-4 h-4 rounded text-[#2962ff] focus:ring-0 cursor-pointer"
                                    />
                                    <span className="text-xs font-medium">{t('chartSettings.soundAlert', 'Alarm Tetiklendiğinde Ses Çal')}</span>
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidefod */}
                <div
                    className={`px-5 py-3 border-t flex items-center justify-between ${isDark ? 'border-[#2a2e39] bg-[#1e222d]' : 'border-gray-100 bg-gray-50'
                        }`}
                >
                    <button
                        type="button"
                        onClick={handleReset}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-gray-500/20 hover:bg-gray-500/10 text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{t('chartSettings.reset', 'Sıfırla')}</span>
                    </button>

                    <div className="flex space-x-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-1.5 rounded-lg border border-gray-500/20 hover:bg-gray-500/10 text-xs font-medium transition-colors"
                        >
                            {t('chartSettings.cancel', 'İptal')}
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="px-4 py-1.5 rounded-lg bg-[#2962ff] hover:bg-blue-600 active:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
                        >
                            {t('chartSettings.saveApply', 'Kaydet & Uygula')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

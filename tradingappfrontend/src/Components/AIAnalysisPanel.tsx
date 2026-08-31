import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../Context/ThemeContext';
import type { AiAnalysisResponseDto } from '../Types/ai';

interface AIAnalysisPanelProps {
    isOpen: boolean;
    onClose: () => void;
    symbol: string;
    interval: string;
    analysis: AiAnalysisResponseDto | null;
    loading: boolean;
    onRefresh: () => void;
}

export const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({
    isOpen,
    onClose,
    symbol,
    interval,
    analysis,
    loading,
    onRefresh,
}) => {
    const { t, i18n } = useTranslation();
    const { isDark } = useTheme();

    // Render ikke noget, hvis panelet er lukket.
    if (!isOpen) return null;

    // Datoformatkode ud fra det valgte sprog ('tr-TR', 'en-US', 'da-DK').
    const localeCode = i18n.language.startsWith('da')
        ? 'da-DK'
        : i18n.language.startsWith('en')
            ? 'en-US'
            : 'tr-TR';

    return (
        <aside
            className={`w-80 sm:w-96 h-full p-5 flex flex-col justify-between z-50 shadow-2xl shrink-0 absolute right-0 top-0 bottom-0 border-l transition-colors duration-300 ${isDark ? 'bg-[#111827] border-gray-800 text-gray-200' : 'bg-white border-gray-300 text-gray-800'
                }`}
        >
            <div className="flex flex-col h-full min-h-0">
                {/* Sidehoved / luk-knap */}
                <div
                    className={`flex items-center justify-between pb-4 border-b shrink-0 ${isDark ? 'border-gray-800' : 'border-gray-200'
                        }`}
                >
                    <div className="flex items-center space-x-2.5">
                        <span className="text-xl">🤖</span>
                        <div>
                            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {t('aiPanel.title', 'Piyasa Analizi')}
                            </h3>
                            <p className="text-xs text-gray-400">
                                {symbol} • {interval} {t('aiPanel.timeframe', 'Periyodu')}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`p-1 rounded-lg transition-colors ${isDark
                                ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                        title={t('aiPanel.close', 'Paneli Kapat')}
                    >
                        ✕
                    </button>
                </div>

                {/* Indholdsområde (scrollbart) */}
                <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4 min-h-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-3">
                            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-gray-400 font-medium text-center">
                                {t('aiPanel.loading', 'Yapay zekâ teknik analizi hazırlanıyor...')}
                            </span>
                        </div>
                    ) : analysis ? (
                        <>
                            {/* Informationskort */}
                            <div
                                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-xs ${isDark ? 'bg-[#1f2937]/50 border-gray-800' : 'bg-gray-50 border-gray-200'
                                    }`}
                            >
                                <span className="font-bold text-purple-400">{analysis.symbol}</span>
                                <span className="text-gray-400 text-[11px]">
                                    {analysis.generatedAt &&
                                        new Date(analysis.generatedAt).toLocaleTimeString(localeCode, {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                        })}
                                </span>
                            </div>

                            {/* Vurderingstekst */}
                            <div>
                                <h4 className={`text-xs font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {t('aiPanel.technicalEvaluation', 'Teknik Değerlendirme')}
                                </h4>
                                <div
                                    className={`text-xs leading-relaxed p-4 rounded-xl border whitespace-pre-line shadow-inner font-sans ${isDark
                                            ? 'bg-[#1f2937]/30 border-gray-800/80 text-gray-300'
                                            : 'bg-gray-50 border-gray-200 text-gray-700'
                                        }`}
                                >
                                    {analysis.analysisText}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                            <span className="text-2xl text-gray-400">📊</span>
                            <p className="text-xs text-gray-400">
                                {t('aiPanel.noData', 'Analiz verisi yüklenemedi.')}
                            </p>
                        </div>
                    )}
                </div>

                {/* Nederste del: opdater-knap */}
                <div
                    className={`pt-4 border-t shrink-0 ${isDark ? 'border-gray-800' : 'border-gray-200'
                        }`}
                >
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={loading}
                        className="w-full py-2.5 bg-purple-600/20 hover:bg-purple-600/30 active:scale-[0.98] text-purple-400 text-xs font-semibold rounded-lg transition-all border border-purple-500/30 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className={loading ? 'animate-spin' : ''}>🔄</span>
                        <span>{t('aiPanel.refresh', 'Analizi Yenile')}</span>
                    </button>
                </div>
            </div>
        </aside>
    );
};
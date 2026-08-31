import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Alert } from '../Types/alert';

interface Props {
    alert: Alert | null;
    onClose: () => void;
}

export const TriggeredAlertToast: React.FC<Props> = ({ alert, onClose }) => {
    const { t } = useTranslation();

    if (!alert) return null;

    return (
        <div
            role="alert"
            className="fixed bottom-6 right-6 z-50 flex items-center gap-4 rounded-xl bg-red-950/90 border border-red-500 p-4 shadow-2xl backdrop-blur-md text-white animate-bounce"
        >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 font-bold text-xl">
                🚨
            </div>
            <div>
                <h4 className="font-bold text-sm tracking-wide text-red-300">
                    {t('alerts.triggeredTitle', 'FİYAT ALARMI ÇALDI!')}
                </h4>
                <p className="text-xs text-gray-200">
                    <strong className="text-white">{alert.symbol}</strong>{' '}
                    {t('alerts.targetReached', 'hedef fiyata ulaştı')}:{' '}
                    <span className="font-semibold text-yellow-400 font-mono">
                        ${Number(alert.targetPrice).toLocaleString()}
                    </span>
                </p>
                {alert.note && (
                    <p className="text-[11px] text-gray-400 italic mt-0.5">{alert.note}</p>
                )}
            </div>
            <button
                type="button"
                onClick={onClose}
                aria-label={t('chartSettings.cancel', 'Kapat')}
                className="text-gray-400 hover:text-white pl-2 text-lg transition-colors"
            >
                ✕
            </button>
        </div>
    );
};
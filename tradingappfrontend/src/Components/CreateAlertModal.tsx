import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AlertCondition, CreateAlertRequest } from '../Types/alert';

interface CreateAlertModalProps {
    symbolId: number;
    symbol: string;
    currentPrice?: number;
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: CreateAlertRequest) => Promise<void>;
    isDark?: boolean;
}

export const CreateAlertModal: React.FC<CreateAlertModalProps> = ({
    symbolId,
    symbol,
    currentPrice = 0,
    isOpen,
    onClose,
    onSave,
    isDark = true,
}) => {
    const { t } = useTranslation();
    const [targetPrice, setTargetPrice] = useState<string>('');
    const [condition, setCondition] = useState<AlertCondition>('CROSSES_UP');
    const [note, setNote] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setTargetPrice(currentPrice > 0 ? currentPrice.toString() : '');
            setNote('');
            setCondition('CROSSES_UP');
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [isOpen, currentPrice, symbol]);

    if (!isOpen) {
        return null;
    }

    // Behandler den relevante brugerhandling eller event.
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const numericPrice = parseFloat(targetPrice);

        if (isNaN(numericPrice) || numericPrice <= 0) {
            return;
        }

        setIsSubmitting(true);

        try {
            await onSave({
                symbolId,
                targetPrice: numericPrice,
                condition,
                note: note.trim() ? note.trim() : undefined,
            });

            onClose();
        } catch (err: unknown) {
            console.error('Alarm oluşturulamadı:', err);
        } finally {
            setIsSubmitting(false);
        }
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
                className={`w-full max-w-md rounded-xl shadow-2xl border flex flex-col overflow-hidden transition-colors ${isDark
                        ? 'bg-[#1e222d] border-[#2a2e39] text-gray-200'
                        : 'bg-white border-gray-200 text-gray-800'
                    }`}
            >
                {/* Sidehoved */}
                <div
                    className={`flex items-center justify-between px-5 py-3.5 border-b ${isDark
                            ? 'border-[#2a2e39] bg-[#131722]'
                            : 'border-gray-100 bg-gray-50'
                        }`}
                >
                    <div className="flex items-center space-x-2 font-bold text-sm">
                        <Bell className="w-4 h-4 text-amber-400" />
                        <span>
                            {t('alerts.createTitle', 'Alarm Kur')} ({symbol})
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t('chartSettings.cancel', 'Kapat')}
                        className="p-1 rounded-md hover:bg-gray-500/10 text-gray-400 hover:text-gray-200 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Formular */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                            {t('alerts.targetPrice', 'Hedef Fiyat ($)')}
                        </label>

                        <input
                            type="number"
                            step="any"
                            required
                            value={targetPrice}
                            onChange={(e) => setTargetPrice(e.target.value)}
                            placeholder="65000"
                            className={`w-full text-xs font-mono p-2.5 rounded-lg border outline-none transition-colors ${isDark
                                    ? 'bg-[#131722] border-gray-700 text-white focus:border-blue-500'
                                    : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                                }`}
                        />

                        {currentPrice > 0 && (
                            <span className="text-[11px] text-gray-500 mt-1 block">
                                {t('alerts.currentPrice', 'Anlık Fiyat')}:{' '}
                                <strong className="font-mono">
                                    ${currentPrice}
                                </strong>
                            </span>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                            {t('alerts.condition', 'Koşul')}
                        </label>

                        <select
                            value={condition}
                            onChange={(e) =>
                                setCondition(
                                    e.target.value as AlertCondition
                                )
                            }
                            className={`w-full text-xs p-2.5 rounded-lg border outline-none transition-colors ${isDark
                                    ? 'bg-[#131722] border-gray-700 text-white focus:border-blue-500'
                                    : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                                }`}
                        >
                            <option value="CROSSES_UP">
                                {t(
                                    'alerts.crossesUp',
                                    '▲ Yukarı Kestiğinde (Fiyat >= Hedef)'
                                )}
                            </option>

                            <option value="CROSSES_DOWN">
                                {t(
                                    'alerts.crossesDown',
                                    '▼ Aşağı Kestiğinde (Fiyat <= Hedef)'
                                )}
                            </option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                            {t('alerts.note', 'Not (Opsiyonel)')}
                        </label>

                        <input
                            type="text"
                            placeholder={t(
                                'alerts.notePlaceholder',
                                'Örn: Destek kırılırsa sat'
                            )}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            maxLength={255}
                            className={`w-full text-xs p-2.5 rounded-lg border outline-none transition-colors ${isDark
                                    ? 'bg-[#131722] border-gray-700 text-white focus:border-blue-500'
                                    : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                                }`}
                        />
                    </div>

                    {/* Footer-knapper */}
                    <div
                        className={`flex justify-end space-x-2.5 pt-3 border-t ${isDark
                                ? 'border-[#2a2e39]'
                                : 'border-gray-100'
                            }`}
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg border border-gray-500/20 hover:bg-gray-500/10 text-xs font-medium transition-colors"
                        >
                            {t('chartSettings.cancel', 'İptal')}
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs shadow-sm disabled:opacity-50 transition-colors"
                        >
                            {isSubmitting
                                ? '...'
                                : t('alerts.startAlert', 'Alarmı Başlat')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

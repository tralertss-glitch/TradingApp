import React, { useEffect } from 'react';
import { X, Check } from 'lucide-react';
import type { IndicatorConfig } from '../../Types/indicator';

interface IndicatorsModalProps {
    isOpen: boolean;
    onClose: () => void;
    indicators: IndicatorConfig[];
    onToggleIndicator: (id: string) => void;
    isDark: boolean;
}

export const IndicatorsModal: React.FC<IndicatorsModalProps> = ({
    isOpen,
    onClose,
    indicators,
    onToggleIndicator,
    isDark,
}) => {
    // Listener til lukning med ESC-tasten.
    useEffect(() => {
        // Behandler den relevante brugerhandling eller event.
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
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
                {/* Modal-header */}
                <div
                    className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-[#2a2e39]' : 'border-gray-100'
                        }`}
                >
                    <h3 id="modal-title" className="font-bold text-sm">
                        Teknik Indikatorer
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Kapat"
                        className="p-1 rounded-md hover:bg-gray-500/10 text-gray-400 hover:text-gray-200 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Indikatorliste */}
                <div className="p-3 divide-y divide-gray-500/10 max-h-80 overflow-y-auto space-y-0.5">
                    {indicators.length === 0 ? (
                        <div className="py-8 text-center text-xs text-gray-400">
                            Kullanılabilir indikatör bulunamadı.
                        </div>
                    ) : (
                        indicators.map((ind) => (
                            <div
                                key={ind.id}
                                role="checkbox"
                                aria-checked={ind.enabled}
                                tabIndex={0}
                                onClick={() => onToggleIndicator(ind.id)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        onToggleIndicator(ind.id);
                                    }
                                }}
                                className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer select-none transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#2962ff] ${ind.enabled
                                        ? isDark
                                            ? 'bg-blue-600/15'
                                            : 'bg-blue-50'
                                        : 'hover:bg-gray-500/10'
                                    }`}
                            >
                                <div className="flex items-center space-x-3">
                                    <span
                                        className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                                        style={{ backgroundColor: ind.color }}
                                    />
                                    <div>
                                        <div className="text-xs font-semibold">{ind.name}</div>
                                        <div className="text-[10px] text-gray-400">
                                            {ind.type} {ind.period ? `(Periyot: ${ind.period})` : ''}
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${ind.enabled
                                            ? 'bg-[#2962ff] border-[#2962ff] text-white'
                                            : isDark
                                                ? 'border-gray-700 bg-gray-800'
                                                : 'border-gray-300 bg-white'
                                        }`}
                                >
                                    {ind.enabled && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Modal-footer */}
                <div
                    className={`px-4 py-2.5 border-t flex justify-end ${isDark
                            ? 'border-[#2a2e39] bg-[#131722]'
                            : 'border-gray-100 bg-gray-50'
                        }`}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-lg bg-[#2962ff] hover:bg-blue-600 active:bg-blue-700 text-white text-xs font-semibold transition-colors"
                    >
                        Tamam
                    </button>
                </div>
            </div>
        </div>
    );
};

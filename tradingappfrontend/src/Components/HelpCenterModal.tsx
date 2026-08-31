import React, { useState } from 'react';
import { X, HelpCircle, Send, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HelpCenterModalProps {
    isOpen: boolean;
    onClose: () => void;
    isDark: boolean;
}

export const HelpCenterModal: React.FC<HelpCenterModalProps> = ({
    isOpen,
    onClose,
    isDark,
}) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'faq' | 'contact'>('faq');
    const [sent, setSent] = useState(false);
    const [formData, setFormularData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    });

    if (!isOpen) return null;

    // Behandler den relevante brugerhandling eller event.
    const handleSubmit = (e: React.FormularEvent) => {
        e.preventDefault();
        setSent(true);
        setTimeout(() => {
            setSent(false);
            setFormularData({ name: '', email: '', subject: '', message: '' });
            onClose();
        }, 2000);
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
                className={`w-full max-w-lg rounded-xl shadow-2xl border flex flex-col overflow-hidden transition-colors ${isDark ? 'bg-[#131722] border-[#2a2e39] text-gray-200' : 'bg-white border-gray-200 text-gray-800'
                    }`}
            >
                {/* Sidehoved */}
                <div
                    className={`flex items-center justify-between px-5 py-3.5 border-b ${isDark ? 'border-[#2a2e39] bg-[#1e222d]' : 'border-gray-100 bg-gray-50'
                        }`}
                >
                    <div className="flex items-center space-x-2 font-bold text-sm">
                        <HelpCircle className="w-4 h-4 text-blue-500" />
                        <span>{t('helpCenter.title', 'Yardım Merkezi & Destek')}</span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-md hover:bg-gray-500/10 text-gray-400 hover:text-gray-200"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Faner */}
                <div className={`flex border-b text-xs font-semibold ${isDark ? 'border-[#2a2e39]' : 'border-gray-100'}`}>
                    <button
                        type="button"
                        onClick={() => setActiveTab('faq')}
                        className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${activeTab === 'faq'
                                ? 'border-blue-500 text-blue-500 bg-blue-500/5'
                                : 'border-transparent text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        {t('helpCenter.faqTab', 'Sıkça Sorulan Sorular')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('contact')}
                        className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${activeTab === 'contact'
                                ? 'border-blue-500 text-blue-500 bg-blue-500/5'
                                : 'border-transparent text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        {t('helpCenter.contactTab', 'Bize Ulaşın')}
                    </button>
                </div>

                {/* Indhold */}
                <div className="p-5 max-h-[380px] overflow-y-auto">
                    {activeTab === 'faq' ? (
                        <div className="space-y-4 text-xs">
                            <div className={`p-3 rounded-lg border ${isDark ? 'bg-[#1e222d]/60 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                <h5 className="font-bold text-blue-400 mb-1">❓ {t('helpCenter.faq1Q')}</h5>
                                <p className="text-gray-400 leading-relaxed">{t('helpCenter.faq1A')}</p>
                            </div>

                            <div className={`p-3 rounded-lg border ${isDark ? 'bg-[#1e222d]/60 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                <h5 className="font-bold text-amber-400 mb-1">❓ {t('helpCenter.faq2Q')}</h5>
                                <p className="text-gray-400 leading-relaxed">{t('helpCenter.faq2A')}</p>
                            </div>
                        </div>
                    ) : sent ? (
                        <div className="flex flex-col items-center justify-center py-10 space-y-3 text-center">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-in zoom-in" />
                            <p className="text-xs font-semibold text-emerald-400">{t('helpCenter.successMessage')}</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-gray-400 mb-1">{t('helpCenter.contactName')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormularData({ ...formData, name: e.target.value })}
                                        className={`w-full p-2 rounded-lg border outline-none ${isDark ? 'bg-[#1e222d] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                                            }`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 mb-1">{t('helpCenter.contactEmail')}</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormularData({ ...formData, email: e.target.value })}
                                        className={`w-full p-2 rounded-lg border outline-none ${isDark ? 'bg-[#1e222d] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                                            }`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-400 mb-1">{t('helpCenter.subject')}</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.subject}
                                    onChange={(e) => setFormularData({ ...formData, subject: e.target.value })}
                                    className={`w-full p-2 rounded-lg border outline-none ${isDark ? 'bg-[#1e222d] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                                        }`}
                                />
                            </div>

                            <div>
                                <label className="block text-gray-400 mb-1">{t('helpCenter.message')}</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={formData.message}
                                    onChange={(e) => setFormularData({ ...formData, message: e.target.value })}
                                    className={`w-full p-2 rounded-lg border outline-none resize-none ${isDark ? 'bg-[#1e222d] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                                        }`}
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-colors"
                            >
                                <Send className="w-3.5 h-3.5" />
                                <span>{t('helpCenter.send')}</span>
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

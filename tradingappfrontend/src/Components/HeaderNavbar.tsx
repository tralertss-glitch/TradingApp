import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    User,
    LogOut,
    Plus,
    BarChart2,
    Check,
    ChevronDown,
    Settings,
    Bell,
    Globe,
    Home,
    HelpCircle,
    Send,
    CheckCircle2,
    X,
    TrendingUp
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../Context/ThemeContext';
import { preferenceService } from '../Services/preferenceService';
import { type UserManagementDto } from '../Services/userService';
import { ProfileModal, type UserProfileDto } from './ProfileModal'; // Modalen er importeret.
import type { WatchlistResponseDto } from '../Types/watchlist';
import type { ChartType } from '../Types/candle';
import type { IndicatorConfig } from '../Types/indicator';
import type { Alert } from '../Types/alert';
import type { SymbolResponseDto } from '../Types/symbol';

interface HeaderNavbarProps {
    currentUser: UserProfileDto | null;
    onLogout: () => void;
    watchlists: WatchlistResponseDto[];
    currentSymbol: string;
    currentSymbolId: number;
    currentExchangeCode: string;
    currentInterval: string;
    chartType: ChartType;
    layoutMode: '1x1' | '1x2' | '2x2';
    activeSymbols: SymbolResponseDto[];
    indicators: IndicatorConfig[];
    currentPrice?: number;
    alerts?: Alert[];
    onToggleIndicator: (indicatorId: string) => void;
    onSelectSymbol: (symbol: SymbolResponseDto) => void;
    onSelectInterval: (interval: string) => void;
    onSelectChartType: (type: ChartType) => void;
    onChangeLayout: (mode: '1x1' | '1x2' | '2x2') => void;
    onOpenSettings: () => void;
    onOpenAlertModal: () => void;
    onProfileUpdated?: (updated: UserManagementDto) => void;
}

const TIMEFRAMES = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '1d', '1w', '1mon', '1y'];

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
    currentUser,
    onLogout,
    watchlists,
    currentSymbol,
    currentSymbolId,
    currentExchangeCode,
    currentInterval,
    chartType,
    layoutMode,
    activeSymbols,
    indicators,
    currentPrice,
    alerts = [],
    onToggleIndicator,
    onSelectSymbol,
    onSelectInterval,
    onSelectChartType,
    onChangeLayout,
    onOpenSettings,
    onOpenAlertModal,
    onProfileUpdated,
}) => {
    const { t, i18n } = useTranslation();
    const { isDark, toggleTheme } = useTheme();

    const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isTfOpen, setIsTfOpen] = useState(false);
    const [isChartTypeOpen, setIsChartTypeOpen] = useState(false);
    const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(false);
    const [isLayoutOpen, setIsLayoutOpen] = useState(false);
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Modaler
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [helpTab, setHelpTab] = useState<'faq' | 'contact'>('faq');
    const [helpSent, setHelpSent] = useState(false);
    const [contactFormular, setContactFormular] = useState({ name: '', email: '', subject: '', message: '' });

    const searchRef = useRef<HTMLDivElement>(null);
    const hamburgerRef = useRef<HTMLDivElement>(null);
    const tfRef = useRef<HTMLDivElement>(null);
    const chartTypeRef = useRef<HTMLDivElement>(null);
    const indicatorsRef = useRef<HTMLDivElement>(null);
    const layoutRef = useRef<HTMLDivElement>(null);
    const langRef = useRef<HTMLDivElement>(null);

    const CHART_TYPES: { id: ChartType; label: string; icon: string }[] = useMemo(
        () => [
            { id: 'candles', label: t('header.chartTypes.candles', 'Mumlar (Candles)'), icon: '🕯️' },
            { id: 'bars', label: t('header.chartTypes.bars', 'Çubuklar (Bars)'), icon: '📊' },
            { id: 'line', label: t('header.chartTypes.line', 'Çizgi (Line)'), icon: '📈' },
            { id: 'area', label: t('header.chartTypes.area', 'Alan (Area)'), icon: '⛰️' },
            { id: 'heikin-ashi', label: t('header.chartTypes.heikinAshi', 'Heikin Ashi'), icon: '🇯🇵' },
        ],
        [t]
    );

    const filteredSymbols = useMemo(() => {
        if (!searchTerm.trim()) return activeSymbols;
        const q = searchTerm.toLowerCase();
        return activeSymbols.filter((s) =>
            s.name.toLowerCase().includes(q) ||
            s.exchangeCode.toLowerCase().includes(q) ||
            s.baseAsset.toLowerCase().includes(q) ||
            s.quoteAsset.toLowerCase().includes(q)
        );
    }, [searchTerm, activeSymbols]);

    const activeIndicatorsCount = indicators.filter((i) => i.enabled).length;

    const activeAlertsCount = useMemo(() => {
        return alerts.filter(
            (a) => (a.symbolId === currentSymbolId || a.symbol.toUpperCase() === currentSymbol.toUpperCase()) && a.isActive && !a.isTriggered
        ).length;
    }, [alerts, currentSymbol, currentSymbolId]);

    useEffect(() => {
        // Behandler den relevante brugerhandling eller event.
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (searchRef.current && !searchRef.current.contains(target)) setIsSearchOpen(false);
            if (hamburgerRef.current && !hamburgerRef.current.contains(target)) setIsHamburgerOpen(false);
            if (tfRef.current && !tfRef.current.contains(target)) setIsTfOpen(false);
            if (chartTypeRef.current && !chartTypeRef.current.contains(target)) setIsChartTypeOpen(false);
            if (indicatorsRef.current && !indicatorsRef.current.contains(target)) setIsIndicatorsOpen(false);
            if (layoutRef.current && !layoutRef.current.contains(target)) setIsLayoutOpen(false);
            if (langRef.current && !langRef.current.contains(target)) setIsLangOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Behandler den relevante brugerhandling eller event.
    const handleLanguageChange = (lang: 'tr' | 'en' | 'da') => {
        i18n.changeLanguage(lang);
        localStorage.setItem('tradingpro_lang', lang);
        setIsLangOpen(false);
        preferenceService.savePreferences({ Language: lang } as any).catch(() => { });
    };

    // Behandler den relevante brugerhandling eller event.
    const handleContactSubmit = (e: React.FormularEvent) => {
        e.preventDefault();
        setHelpSent(true);
        setTimeout(() => {
            setHelpSent(false);
            setContactFormular({ name: '', email: '', subject: '', message: '' });
            setIsHelpModalOpen(false);
        }, 2000);
    };

    const totalWatchlistCount = watchlists.reduce((acc, w) => acc + (w.items?.length || 0), 0);

    const currentLangLabel = i18n.language.startsWith('da')
        ? '🇩🇰 DA'
        : i18n.language.startsWith('en')
            ? '🇬🇧 EN'
            : '🇹🇷 TR';

    return (
        <>
            <header
                className={`h-11 px-3 border-b flex items-center justify-between shrink-0 select-none z-40 transition-colors duration-200 ${isDark ? 'bg-[#131722] border-[#2a2e39] text-[#d1d4dc]' : 'bg-white border-gray-200 text-[#131722]'
                    }`}
            >
                {/* VENSTRE KONTROLLER */}
                <div className="flex items-center space-x-1 sm:space-x-2">
                    {/* Hamburgermenu */}
                    <div className="relative" ref={hamburgerRef}>
                        <button
                            type="button"
                            onClick={() => setIsHamburgerOpen(!isHamburgerOpen)}
                            className={`relative p-1.5 rounded hover:bg-gray-500/10 transition-colors flex items-center justify-center ${isDark ? 'text-gray-300' : 'text-gray-700'
                                }`}
                            title={t('header.mainMenu', 'Ana Menü')}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            {totalWatchlistCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-[#f23645] text-white text-[9px] font-black h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center shadow">
                                    {totalWatchlistCount}
                                </span>
                            )}
                        </button>

                        {isHamburgerOpen && (
                            <div
                                className={`absolute top-full left-0 mt-1.5 w-64 rounded-xl shadow-2xl z-50 py-2 divide-y text-xs backdrop-blur-xl ${isDark
                                        ? 'bg-[#1e222d] border border-[#2a2e39] divide-[#2a2e39] text-gray-200'
                                        : 'bg-white border border-gray-200 divide-gray-100 text-gray-800'
                                    }`}
                            >
                                <div className="px-4 py-2 flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <TrendingUp className="h-4 w-4 text-blue-500" />
                                        <span className="font-bold tracking-wide">TradingPro Terminal</span>
                                    </div>
                                    <span className="text-[10px] text-blue-500 font-mono font-bold bg-blue-500/10 px-1.5 py-0.5 rounded">v2.0</span>
                                </div>

                                <div className="p-1 space-y-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setIsHamburgerOpen(false)}
                                        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg hover:bg-blue-500/10 text-blue-400 font-semibold transition-colors"
                                    >
                                        <Home className="w-4 h-4" />
                                        <span>{t('menu.home', 'Ana Sayfa / Terminal')}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsHamburgerOpen(false);
                                            setIsProfileModalOpen(true);
                                        }}
                                        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg hover:bg-gray-500/10 transition-colors font-medium"
                                    >
                                        <User className="w-4 h-4 text-emerald-400" />
                                        <span>{t('menu.profile', 'Profil & Hesap')}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsHamburgerOpen(false);
                                            setIsHelpModalOpen(true);
                                        }}
                                        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg hover:bg-gray-500/10 transition-colors font-medium"
                                    >
                                        <HelpCircle className="w-4 h-4 text-purple-400" />
                                        <span>{t('menu.helpCenter', 'Yardım Merkezi & İletişim')}</span>
                                    </button>
                                </div>

                                <div className="p-1">
                                    <button
                                        type="button"
                                        onClick={toggleTheme}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-500/10 transition-colors font-medium"
                                    >
                                        <span>{isDark ? t('header.darkTheme', '🌙 Koyu Tema') : t('header.lightTheme', '☀️ Açık Tema')}</span>
                                        <span
                                            className={`w-7 h-3.5 flex items-center rounded-full p-0.5 ${isDark ? 'bg-blue-600 justify-end' : 'bg-gray-400 justify-start'
                                                }`}
                                        >
                                            <span className="w-2.5 h-2.5 bg-white rounded-full shadow" />
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Symbolsøgning */}
                    <div className="relative" ref={searchRef}>
                        <button
                            type="button"
                            onClick={() => setIsSearchOpen(true)}
                            className={`flex items-center space-x-2 px-3 py-1 rounded-full font-bold text-xs transition-all border ${isDark
                                    ? 'bg-[#2a2e39]/60 hover:bg-[#2a2e39] border-transparent text-[#2962ff]'
                                    : 'bg-[#e0e3eb]/70 hover:bg-[#e0e3eb] border-transparent text-[#2962ff]'
                                }`}
                        >
                            <span className="tracking-wide text-xs">{currentSymbol}</span><span className="text-[9px] text-gray-500">{currentExchangeCode}</span>
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>

                        {isSearchOpen && (
                            <div
                                className={`absolute top-full left-0 mt-2 w-64 rounded-xl shadow-2xl z-50 p-2 border ${isDark ? 'bg-[#1e222d] border-[#2a2e39] text-gray-200' : 'bg-white border-gray-200 text-gray-800'
                                    }`}
                            >
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder={t('header.searchPlaceholder', 'Sembol ara...')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={`w-full text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 border mb-1.5 font-semibold ${isDark ? 'bg-[#131722] border-gray-700 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'
                                        }`}
                                />
                                <div className="max-h-48 overflow-y-auto divide-y divide-gray-500/10">
                                    {filteredSymbols.map((sym) => (
                                        <button
                                            key={`${sym.exchangeCode}:${sym.id}`}
                                            type="button"
                                            onClick={() => {
                                                onSelectSymbol(sym);
                                                setIsSearchOpen(false);
                                                setSearchTerm('');
                                            }}
                                            className={`w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded transition-colors flex items-center justify-between ${currentSymbolId === sym.id ? 'text-[#2962ff] bg-blue-500/10' : 'hover:bg-gray-500/10'
                                                }`}
                                        >
                                            <span className="flex flex-col"><span>{sym.name}</span><span className="text-[9px] font-medium text-gray-500">{sym.exchangeCode} · {sym.baseAsset}/{sym.quoteAsset}</span></span>
                                            {currentSymbolId === sym.id && <Check className="w-3 h-3 text-[#2962ff]" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsSearchOpen(true)}
                        className="p-1 rounded-full hover:bg-gray-500/10 text-gray-400 hover:text-gray-200 transition-colors"
                        title={t('header.addSymbol', 'Sembol Ekle')}
                    >
                        <Plus className="w-4 h-4" />
                    </button>

                    <div className={`h-4 w-[1px] mx-1 ${isDark ? 'bg-[#2a2e39]' : 'bg-gray-200'}`} />

                    {/* Tidsinterval */}
                    <div className="relative" ref={tfRef}>
                        <button
                            type="button"
                            onClick={() => setIsTfOpen(!isTfOpen)}
                            className="px-2 py-1 rounded text-xs font-semibold text-[#2962ff] hover:bg-gray-500/10 transition-colors flex items-center space-x-1"
                        >
                            <span>{currentInterval}</span>
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                        </button>

                        {isTfOpen && (
                            <div
                                className={`absolute top-full left-0 mt-1 w-24 rounded-lg shadow-xl z-50 py-1 border ${isDark ? 'bg-[#1e222d] border-[#2a2e39]' : 'bg-white border-gray-200'
                                    }`}
                            >
                                {TIMEFRAMES.map((tf) => (
                                    <button
                                        key={tf}
                                        type="button"
                                        onClick={() => {
                                            onSelectInterval(tf);
                                            setIsTfOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-1 text-xs font-semibold transition-colors ${currentInterval === tf ? 'text-[#2962ff] bg-blue-500/10' : 'hover:bg-gray-500/10'
                                            }`}
                                    >
                                        {tf}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className={`h-4 w-[1px] mx-1 ${isDark ? 'bg-[#2a2e39]' : 'bg-gray-200'}`} />

                    {/* Charttype */}
                    <div className="relative" ref={chartTypeRef}>
                        <button
                            type="button"
                            onClick={() => setIsChartTypeOpen(!isChartTypeOpen)}
                            className="p-1.5 rounded hover:bg-gray-500/10 text-gray-300 hover:text-white transition-colors flex items-center space-x-1 text-xs font-semibold"
                        >
                            <span>{CHART_TYPES.find((t) => t.id === chartType)?.icon || '🕯️'}</span>
                            <span className="text-[10px] text-gray-400">▼</span>
                        </button>

                        {isChartTypeOpen && (
                            <div
                                className={`absolute top-full left-0 mt-1 w-48 rounded-xl shadow-2xl z-50 py-1.5 border divide-y divide-gray-500/10 ${isDark ? 'bg-[#1e222d] border-[#2a2e39] text-gray-200' : 'bg-white border-gray-200 text-gray-800'
                                    }`}
                            >
                                {CHART_TYPES.map((type) => (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => {
                                            onSelectChartType(type.id);
                                            setIsChartTypeOpen(false);
                                        }}
                                        className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold transition-colors ${chartType === type.id ? 'text-[#2962ff] bg-blue-500/10' : 'hover:bg-gray-500/10'
                                            }`}
                                    >
                                        <span className="text-sm">{type.icon}</span>
                                        <span>{type.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className={`h-4 w-[1px] mx-1 ${isDark ? 'bg-[#2a2e39]' : 'bg-gray-200'}`} />

                    {/* Indikatorer */}
                    <div className="relative" ref={indicatorsRef}>
                        <button
                            type="button"
                            onClick={() => setIsIndicatorsOpen(!isIndicatorsOpen)}
                            className={`flex items-center space-x-1.5 px-2 py-1 rounded text-xs font-semibold transition-colors ${activeIndicatorsCount > 0
                                    ? 'bg-blue-500/10 text-[#2962ff]'
                                    : isDark
                                        ? 'text-gray-300 hover:bg-gray-500/10'
                                        : 'text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            <BarChart2 className="w-4 h-4 text-[#2962ff]" />
                            <span className="hidden sm:inline">{t('header.indicators', 'Indikatorer')}</span>
                            {activeIndicatorsCount > 0 && (
                                <span className="bg-[#2962ff] text-white text-[10px] font-bold px-1.5 rounded-full">
                                    {activeIndicatorsCount}
                                </span>
                            )}
                            <ChevronDown className="w-3 h-3 opacity-60" />
                        </button>

                        {isIndicatorsOpen && (
                            <div
                                className={`absolute top-full left-0 mt-1.5 w-60 rounded-xl shadow-2xl z-50 p-1.5 border divide-y divide-gray-500/10 ${isDark ? 'bg-[#1e222d] border-[#2a2e39] text-gray-200' : 'bg-white border-gray-200 text-gray-800'
                                    }`}
                            >
                                <div className="px-2.5 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                    {t('header.technicalIndicators', 'Teknik Göstergeler')}
                                </div>
                                <div className="py-1 space-y-0.5">
                                    {indicators.map((ind) => (
                                        <button
                                            key={ind.id}
                                            type="button"
                                            onClick={() => onToggleIndicator(ind.id)}
                                            className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-semibold rounded-lg transition-colors ${ind.enabled
                                                    ? isDark
                                                        ? 'bg-blue-600/15 text-[#2962ff]'
                                                        : 'bg-blue-50 text-[#2962ff]'
                                                    : isDark
                                                        ? 'hover:bg-gray-500/10 text-gray-300'
                                                        : 'hover:bg-gray-100 text-gray-700'
                                                }`}
                                        >
                                            <div className="flex items-center space-x-2.5">
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                                    style={{ backgroundColor: ind.color }}
                                                />
                                                <span>{ind.name}</span>
                                            </div>

                                            <div
                                                className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${ind.enabled
                                                        ? 'bg-[#2962ff] border-[#2962ff] text-white'
                                                        : isDark
                                                            ? 'border-gray-600 bg-gray-800'
                                                            : 'border-gray-300 bg-white'
                                                    }`}
                                            >
                                                {ind.enabled && <Check className="w-3 h-3 stroke-[3]" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={`h-4 w-[1px] mx-1 ${isDark ? 'bg-[#2a2e39]' : 'bg-gray-200'}`} />

                    {/* Layout */}
                    <div className="relative" ref={layoutRef}>
                        <button
                            type="button"
                            onClick={() => setIsLayoutOpen(!isLayoutOpen)}
                            className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-500/10 text-xs font-semibold text-gray-400"
                        >
                            <span>🔲 {layoutMode}</span>
                        </button>

                        {isLayoutOpen && (
                            <div
                                className={`absolute top-full left-0 mt-1 w-32 rounded-lg shadow-xl z-50 py-1 border ${isDark ? 'bg-[#1e222d] border-[#2a2e39]' : 'bg-white border-gray-200'
                                    }`}
                            >
                                {(['1x1', '1x2', '2x2'] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => {
                                            onChangeLayout(mode);
                                            setIsLayoutOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-1.5 text-xs font-semibold ${layoutMode === mode ? 'text-[#2962ff] bg-blue-500/10' : 'hover:bg-gray-500/10'
                                            }`}
                                    >
                                        {mode === '1x1'
                                            ? t('header.layout.single', '1x1 (Tek)')
                                            : mode === '1x2'
                                                ? t('header.layout.sideBySide', '1x2 (Yan Yana)')
                                                : t('header.layout.grid', '2x2 (Grid)')}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Prisalarm */}
                    <div className={`h-4 w-[1px] mx-1 ${isDark ? 'bg-[#2a2e39]' : 'bg-gray-200'}`} />

                    <button
                        type="button"
                        onClick={onOpenAlertModal}
                        className={`relative flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${activeAlertsCount > 0
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
                                : isDark
                                    ? 'text-gray-300 hover:bg-gray-500/10 hover:text-amber-400'
                                    : 'text-gray-700 hover:bg-gray-100 hover:text-amber-600'
                            }`}
                        title={t('header.createAlertTooltip', 'Prisalarm Kur')}
                    >
                        <Bell className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">{t('header.createAlert', 'Alarm')}</span>
                        {activeAlertsCount > 0 && (
                            <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.2 rounded-full">
                                {activeAlertsCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* HØJRE SIDE */}
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                    {currentPrice !== undefined && currentPrice > 0 && (
                        <div className="hidden lg:flex items-center space-x-1.5 mr-1 text-xs font-mono">
                            <span className="text-gray-400">{t('alerts.currentPrice', 'Son')}:</span>
                            <span className="font-bold text-emerald-400">${currentPrice.toLocaleString()}</span>
                        </div>
                    )}

                    {/* Sprogvælger */}
                    <div className="relative" ref={langRef}>
                        <button
                            type="button"
                            onClick={() => setIsLangOpen(!isLangOpen)}
                            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-semibold transition-colors border ${isDark
                                    ? 'border-[#2a2e39] bg-[#1e222d] text-gray-300 hover:bg-gray-500/10'
                                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                                }`}
                            title={t('header.changeLanguage', 'Dil Değiştir')}
                        >
                            <Globe className="w-3.5 h-3.5 text-blue-400" />
                            <span>{currentLangLabel}</span>
                            <ChevronDown className="w-3 h-3 opacity-60" />
                        </button>

                        {isLangOpen && (
                            <div
                                className={`absolute top-full right-0 mt-1 w-28 rounded-lg shadow-xl z-50 py-1 border divide-y divide-gray-500/10 ${isDark ? 'bg-[#1e222d] border-[#2a2e39] text-gray-200' : 'bg-white border-gray-200 text-gray-800'
                                    }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => handleLanguageChange('tr')}
                                    className={`w-full text-left px-3 py-1.5 text-xs font-semibold flex items-center justify-between ${i18n.language.startsWith('tr') ? 'text-[#2962ff] bg-blue-500/10' : 'hover:bg-gray-500/10'
                                        }`}
                                >
                                    <span>🇹🇷 Türkçe</span>
                                    {i18n.language.startsWith('tr') && <Check className="w-3 h-3 text-[#2962ff]" />}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleLanguageChange('en')}
                                    className={`w-full text-left px-3 py-1.5 text-xs font-semibold flex items-center justify-between ${i18n.language.startsWith('en') ? 'text-[#2962ff] bg-blue-500/10' : 'hover:bg-gray-500/10'
                                        }`}
                                >
                                    <span>🇬🇧 English</span>
                                    {i18n.language.startsWith('en') && <Check className="w-3 h-3 text-[#2962ff]" />}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleLanguageChange('da')}
                                    className={`w-full text-left px-3 py-1.5 text-xs font-semibold flex items-center justify-between ${i18n.language.startsWith('da') ? 'text-[#2962ff] bg-blue-500/10' : 'hover:bg-gray-500/10'
                                        }`}
                                >
                                    <span>🇩🇰 Dansk</span>
                                    {i18n.language.startsWith('da') && <Check className="w-3 h-3 text-[#2962ff]" />}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Indstillinger */}
                    <button
                        type="button"
                        onClick={onOpenSettings}
                        className="p-1.5 rounded-lg hover:bg-gray-500/10 text-gray-400 hover:text-white transition-colors"
                        title={t('header.settings', 'Grafik & Arayüz Indstillingerı')}
                    >
                        <Settings className="h-4 w-4" />
                    </button>

                    {/* Profilknap */}
                    <div
                        onClick={() => setIsProfileModalOpen(true)}
                        className={`hidden md:flex items-center space-x-1.5 px-2 py-0.5 rounded border text-xs cursor-pointer hover:border-blue-500/50 transition-colors ${isDark ? 'bg-[#1e222d] border-[#2a2e39]' : 'bg-gray-50 border-gray-200'
                            }`}
                    >
                        <User className="h-3 w-3 text-blue-400" />
                        <span className="font-medium">
                            {currentUser?.firstName || t('header.user', 'Kullanıcı')} {currentUser?.lastName || ''}
                        </span>
                    </div>

                    {/* Log ud */}
                    <button
                        onClick={onLogout}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                        title={t('header.logout', 'Log ud')}
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </header>

            {/* 👤 MODAL TIL BRUGERPROFIL */}
            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                isDark={isDark}
                currentUser={currentUser}
                onLogout={onLogout}
                onProfileUpdated={onProfileUpdated}
            />

            {/* ❓ MODAL TIL HJÆLPECENTER */}
            {isHelpModalOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setIsHelpModalOpen(false)}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={`w-full max-w-lg rounded-xl shadow-2xl border flex flex-col overflow-hidden transition-colors ${isDark ? 'bg-[#131722] border-[#2a2e39] text-gray-200' : 'bg-white border-gray-200 text-gray-800'
                            }`}
                    >
                        <div className={`flex items-center justify-between px-5 py-3.5 border-b ${isDark ? 'border-[#2a2e39] bg-[#1e222d]' : 'border-gray-100 bg-gray-50'
                            }`}>
                            <div className="flex items-center space-x-2 font-bold text-sm">
                                <HelpCircle className="w-4 h-4 text-purple-500" />
                                <span>{t('helpCenter.title', 'Yardım Merkezi & Destek')}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsHelpModalOpen(false)}
                                className="p-1 rounded-md hover:bg-gray-500/10 text-gray-400 hover:text-gray-200"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className={`flex border-b text-xs font-semibold ${isDark ? 'border-[#2a2e39]' : 'border-gray-100'}`}>
                            <button
                                type="button"
                                onClick={() => setHelpTab('faq')}
                                className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${helpTab === 'faq'
                                        ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                                        : 'border-transparent text-gray-400 hover:text-gray-200'
                                    }`}
                            >
                                {t('helpCenter.faqTab', 'Sıkça Sorulan Sorular')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setHelpTab('contact')}
                                className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${helpTab === 'contact'
                                        ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                                        : 'border-transparent text-gray-400 hover:text-gray-200'
                                    }`}
                            >
                                {t('helpCenter.contactTab', 'Bize Ulaşın')}
                            </button>
                        </div>

                        <div className="p-5 max-h-[380px] overflow-y-auto">
                            {helpTab === 'faq' ? (
                                <div className="space-y-4 text-xs">
                                    <div className={`p-3 rounded-lg border ${isDark ? 'bg-[#1e222d]/60 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                        <h5 className="font-bold text-blue-400 mb-1">❓ {t('helpCenter.faq1Q', 'SignalR canlı fiyatlar neden donuyor?')}</h5>
                                        <p className="text-gray-400 leading-relaxed">{t('helpCenter.faq1A', 'İnternet bağlantınızı kontrol edin. Kopma durumunda sistem otomatik olarak 5 saniye içinde yeniden bağlanır.')}</p>
                                    </div>

                                    <div className={`p-3 rounded-lg border ${isDark ? 'bg-[#1e222d]/60 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                        <h5 className="font-bold text-amber-400 mb-1">❓ {t('helpCenter.faq2Q', 'Fiyat alarmları nasıl çalışır?')}</h5>
                                        <p className="text-gray-400 leading-relaxed">{t('helpCenter.faq2A', 'Kurduğunuz hedef fiyat piyasada gerçekleştiğinde sesli ve görsel bildirim alırsınız.')}</p>
                                    </div>
                                </div>
                            ) : helpSent ? (
                                <div className="flex flex-col items-center justify-center py-10 space-y-3 text-center">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-in zoom-in" />
                                    <p className="text-xs font-semibold text-emerald-400">{t('helpCenter.successMessage', 'Mesajınız iletildi.')}</p>
                                </div>
                            ) : (
                                <form onSubmit={handleContactSubmit} className="space-y-3 text-xs">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-gray-400 mb-1">{t('helpCenter.contactName', 'Adınız')}</label>
                                            <input
                                                type="text"
                                                required
                                                value={contactFormular.name}
                                                onChange={(e) => setContactFormular({ ...contactFormular, name: e.target.value })}
                                                className={`w-full p-2 rounded-lg border outline-none ${isDark ? 'bg-[#1e222d] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                                                    }`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-400 mb-1">{t('helpCenter.contactEmail', 'E-Posta')}</label>
                                            <input
                                                type="email"
                                                required
                                                value={contactFormular.email}
                                                onChange={(e) => setContactFormular({ ...contactFormular, email: e.target.value })}
                                                className={`w-full p-2 rounded-lg border outline-none ${isDark ? 'bg-[#1e222d] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                                                    }`}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-gray-400 mb-1">{t('helpCenter.subject', 'Konu')}</label>
                                        <input
                                            type="text"
                                            required
                                            value={contactFormular.subject}
                                            onChange={(e) => setContactFormular({ ...contactFormular, subject: e.target.value })}
                                            className={`w-full p-2 rounded-lg border outline-none ${isDark ? 'bg-[#1e222d] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                                                }`}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-gray-400 mb-1">{t('helpCenter.message', 'Mesajınız')}</label>
                                        <textarea
                                            required
                                            rows={3}
                                            value={contactFormular.message}
                                            onChange={(e) => setContactFormular({ ...contactFormular, message: e.target.value })}
                                            className={`w-full p-2 rounded-lg border outline-none resize-none ${isDark ? 'bg-[#1e222d] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                                                }`}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-colors"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        <span>{t('helpCenter.send', 'Mesajı Gönder')}</span>
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

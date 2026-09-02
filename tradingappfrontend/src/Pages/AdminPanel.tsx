import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {Users, ShieldCheck, ArrowLeft, Search, UserCheck, CheckCircle2, AlertCircle, Loader2, Coins, Plus, RefreshCw, LogOut, Trash2, X, Mail, User as UserIcon, Lock, UserMinus, UserPlus, Activity, KeyRound, Save, Globe, Check} from 'lucide-react';
import { api } from '../Services/api';
import { userService, type UserManagementDto } from '../Services/userService';
import { authService } from '../Services/authService';
import { symbolApi } from '../Services/symbolApi';
import { systemHealthService } from '../Services/systemHealthService';
import { exchangeApi } from '../Services/exchangeApi';
import type { ExchangeResponseDto, SymbolResponseDto } from '../Types/symbol';
import type { SystemHealthDto } from '../Types/systemHealth';
import { getApiErrorMessage } from '../Utils/errorUtils';

interface AdminPanelProps {
    onSwitchToTerminal: () => void;
    onLogout: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onSwitchToTerminal, onLogout }) => {
    const { t, i18n } = useTranslation();
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'health' | 'users' | 'admins' | 'symbols' | 'exchanges' | 'profile'>('health');

    // Tilstand for brugerlister
    const [users, setUsers] = useState<UserManagementDto[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Tilstand for symbolliste
    const [symbols, setSymbols] = useState<SymbolResponseDto[]>([]);
    const [exchanges, setExchanges] = useState<ExchangeResponseDto[]>([]);
    const [selectedExchangeId, setSelectedExchangeId] = useState<number | 'all'>('all');
    const [syncingExchangeCode, setSyncingExchangeCode] = useState<string | null>(null);
    const [loadingSymbols, setLoadingSymbols] = useState(true);
    const [symbolSearchQuery, setSymbolSearchQuery] = useState('');

    // Tilstand for exchange-administration
    const [exchangeFormular, setExchangeFormular] = useState({ code: '', name: '', isActive: true });
    const [editingExchange, setEditingExchange] = useState<ExchangeResponseDto | null>(null);
    const [savingExchange, setSavingExchange] = useState(false);

    const [health, setHealth] = useState<SystemHealthDto | null>(null);
    const [loadingHealth, setLoadingHealth] = useState(true);

    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error'; } | null>(null);

    // Tilstand for modal til ny admin
    const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
    const [adminModalError, setAdminModalError] = useState<string | null>(null);
    const [adminFormular, setAdminFormular] = useState({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        password: ''
    });
    const [creatingAdmin, setCreatingAdmin] = useState(false);

    // Reference til aktiv bruger
    const currentUser = useMemo(() => authService.getCurrentUser(), []);
    const isSuperAdmin = (currentUser?.role || '').toLowerCase() === 'superadmin';

    // Tilstand for opdatering af profil og adgangskode
    const [currentRole, setCurrentRole] = useState<string>(currentUser?.role || 'Admin');
    const [profileFormular, setProfileFormular] = useState({
        firstName: currentUser?.firstName || '',
        lastName: currentUser?.lastName || '',
        username: currentUser?.username || '',
        email: currentUser?.email || ''
    });
    const [savingProfile, setSavingProfile] = useState(false);

    const [passwordFormular, setPasswordFormular] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [savingPassword, setSavingPassword] = useState(false);

    // Skift sprog
    const handleLanguageChange = (lang: 'tr' | 'en' | 'da') => {
        i18n.changeLanguage(lang);
        localStorage.setItem('tradingpro_lang', lang);
        setIsLangMenuOpen(false);
    };

    const currentLangLabel = i18n.language.startsWith('da')
        ? '🇩🇰 DA'
        : i18n.language.startsWith('en')
            ? '🇬🇧 EN'
            : '🇹🇷 TR';

    // 1. Hent profiloplysninger
    const fetchMyProfile = useCallback(async () => {
        try {
            const myProfile = await userService.getMyProfile();
            if (myProfile) {
                setProfileFormular({
                    firstName: myProfile.firstName || '',
                    lastName: myProfile.lastName || '',
                    username: myProfile.username || '',
                    email: myProfile.email || ''
                });
                if (myProfile.role) {
                    setCurrentRole(myProfile.role);
                }
            }
        } catch {
            // Ignorer fejlen uden visning.
        }
    }, []);

    // 2. Hent brugere
    const fetchUsers = useCallback(async () => {
        setLoadingUsers(true);
        try {
            const data = await userService.getAllUsers();
            setUsers(Array.isArray(data) ? data : []);
        } catch (err: unknown) {
            setMessage({ text: getApiErrorMessage(err, t('admin.fetchUsersError')), type: 'error' });
        } finally {
            setLoadingUsers(false);
        }
    }, [t]);

    // Henter de nødvendige data til denne funktion.
    const fetchHealth = useCallback(async () => {
        setLoadingHealth(true);
        try {
            setHealth(await systemHealthService.getHealth());
        } catch (err: unknown) {
            setMessage({ text: getApiErrorMessage(err, t('admin.healthFetchError')), type: 'error' });
        } finally {
            setLoadingHealth(false);
        }
    }, [t]);

    // 3. Hent symboler
    const fetchSymbols = useCallback(async () => {
        setLoadingSymbols(true);
        try {
            const [data, exchangeData] = await Promise.all([
                symbolApi.searchSymbols(),
                exchangeApi.getAdminExchanges(),
            ]);
            setSymbols(Array.isArray(data) ? data : []);
            setExchanges(Array.isArray(exchangeData) ? exchangeData : []);
        } catch {
            setMessage({ text: t('admin.fetchSymbolsError'), type: 'error' });
        } finally {
            setLoadingSymbols(false);
        }
    }, [t]);

    // Håndterer refresh all.
    const refreshAll = useCallback(() => {
        fetchUsers();
        fetchSymbols();
        fetchMyProfile();
        fetchHealth();
    }, [fetchUsers, fetchSymbols, fetchMyProfile, fetchHealth]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            refreshAll();
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [refreshAll]);

    // Rollefortolker
    const getUserRoleString = (role: unknown): string => {
        if (role === 0 || role === '0' || String(role).toLowerCase() === 'user') return 'user';
        if (role === 1 || role === '1' || String(role).toLowerCase() === 'admin') return 'admin';
        if (role === 2 || role === '2' || String(role).toLowerCase() === 'superadmin') return 'superadmin';
        return String(role || '').toLowerCase();
    };

    // Kontroller, at den aktuelle bruger skjules fra listen.
    const isSelfUser = useCallback((user: UserManagementDto) => {
        if (!currentUser && !profileFormular.username && !profileFormular.email) return false;

        const currentUsername = (profileFormular.username || currentUser?.username || '').trim().toLowerCase();
        const currentEmail = (profileFormular.email || currentUser?.email || '').trim().toLowerCase();

        const targetUsername = (user.username || '').trim().toLowerCase();
        const targetEmail = (user.email || '').trim().toLowerCase();

        if (currentUsername && targetUsername && currentUsername === targetUsername) return true;
        if (currentEmail && targetEmail && currentEmail === targetEmail) return true;

        return false;
    }, [currentUser, profileFormular.username, profileFormular.email]);

    // Standardbrugere (ekskl. den aktuelle bruger)
    const standardUsers = useMemo(() => {
        return (users || []).filter(u => !isSelfUser(u) && getUserRoleString(u.role) === 'user');
    }, [users, isSelfUser]);

    // Administratorer (ekskl. den aktuelle Admin/SuperAdmin)
    const adminUsers = useMemo(() => {
        return (users || []).filter(u => !isSelfUser(u) && getUserRoleString(u.role) === 'admin');
    }, [users, isSelfUser]);

    // Skift rolle
    const handleRoleChange = async (user: UserManagementDto, newRole: 'User' | 'Admin') => {
        try {
            await userService.assignRole({ ...user, role: newRole });
            setMessage({
                text: t('admin.roleUpdated', { username: user.username, role: newRole }),
                type: 'success'
            });
            fetchUsers();
        } catch (err: unknown) {
            setMessage({ text: getApiErrorMessage(err, t('admin.roleUpdateError')), type: 'error' });
        }
    };

    // Permanent sletning (hard delete)
    const handleHardDeleteUser = async (userId: number, username: string) => {
        const confirmMsg = t('admin.deleteConfirm', { username });
        if (!window.confirm(confirmMsg)) return;

        try {
            const res = await userService.hardDeleteUser(userId);
            setMessage({ text: res.message || t('admin.userDeleted', { username }), type: 'success' });
            fetchUsers();
        } catch (err: unknown) {
            setMessage({ text: getApiErrorMessage(err, t('admin.userDeleteError')), type: 'error' });
        }
    };

    // Opret ny admin
    const handleCreateAdminSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setAdminModalError(null);
        setCreatingAdmin(true);
        try {
            const currentToken = localStorage.getItem('token');
            const currentUserData = localStorage.getItem('user');

            await api.post('/auth/register', {
                firstName: adminFormular.firstName.trim(),
                lastName: adminFormular.lastName.trim(),
                username: adminFormular.username.trim(),
                email: adminFormular.email.trim(),
                password: adminFormular.password
            });

            if (currentToken) localStorage.setItem('token', currentToken);
            if (currentUserData) localStorage.setItem('user', currentUserData);

            const allUsers = await userService.getAllUsers();
            const created = allUsers.find(
                (u) => (u.email || '').toLowerCase() === adminFormular.email.trim().toLowerCase()
            );

            if (created) {
                await userService.assignRole({ ...created, role: 'Admin' });
            }

            setMessage({ text: t('admin.adminCreatedSuccess', { username: adminFormular.username }), type: 'success' });
            setIsAddAdminOpen(false);
            setAdminFormular({ firstName: '', lastName: '', username: '', email: '', password: '' });
            await fetchUsers();
            setActiveTab('admins');
        } catch (err: unknown) {
            console.error('Admin oluşturma hatası:', err);
            setAdminModalError(
                getApiErrorMessage(err, t('admin.adminCreateError'))
            );
        } finally {
            setCreatingAdmin(false);
        }
    };

    // Opret exchange
    const handleCreateExchange = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const code = exchangeFormular.code.trim().toUpperCase();
        const name = exchangeFormular.name.trim();
        if (!code || !name) return;

        setSavingExchange(true);
        try {
            await exchangeApi.createExchange({ code, name, isActive: exchangeFormular.isActive });
            setExchangeFormular({ code: '', name: '', isActive: true });
            setMessage({ text: t('admin.exchangeCreated', { exchange: code }), type: 'success' });
            await fetchSymbols();
        } catch (err: unknown) {
            setMessage({ text: getApiErrorMessage(err, t('admin.exchangeSaveError')), type: 'error' });
        } finally {
            setSavingExchange(false);
        }
    };

    // Opdater exchange
    const handleUpdateExchange = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingExchange) return;

        setSavingExchange(true);
        try {
            const updated = await exchangeApi.updateExchange(editingExchange.id, {
                code: editingExchange.code.trim().toUpperCase(),
                name: editingExchange.name.trim(),
                isActive: editingExchange.isActive,
            });
            setEditingExchange(null);
            setMessage({ text: t('admin.exchangeUpdated', { exchange: updated.code }), type: 'success' });
            await fetchSymbols();
        } catch (err: unknown) {
            setMessage({ text: getApiErrorMessage(err, t('admin.exchangeSaveError')), type: 'error' });
        } finally {
            setSavingExchange(false);
        }
    };

    // Slet exchange - backend forhindrer af sikkerhedshensyn sletning af exchanges med historik og kræver i stedet deaktivering.
    const handleDeleteExchange = async (exchange: ExchangeResponseDto) => {
        if (!window.confirm(t('admin.exchangeDeleteConfirm', { exchange: exchange.name }))) return;

        try {
            await exchangeApi.deleteExchange(exchange.id);
            setMessage({ text: t('admin.exchangeDeleted', { exchange: exchange.code }), type: 'success' });
            await fetchSymbols();
        } catch (err: unknown) {
            setMessage({ text: getApiErrorMessage(err, t('admin.exchangeDeleteError')), type: 'error' });
        }
    };

    // Opdater profiloplysninger
    const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSavingProfile(true);
        try {
            const payload: Partial<UserManagementDto> = {
                ...profileFormular,
                role: currentRole || currentUser?.role || (isSuperAdmin ? 'SuperAdmin' : 'Admin')
            };

            const updated = await userService.updateMyProfile(payload);
            setMessage({ text: t('admin.profileUpdated'), type: 'success' });

            const updatedUser = { ...currentUser, ...updated };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            fetchUsers();
        } catch (err: unknown) {
            setMessage({
                text: getApiErrorMessage(err, t('admin.profileUpdateError')),
                type: 'error',
            });
        } finally {
            setSavingProfile(false);
        }
    };

    // Opdater adgangskode
    const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (passwordFormular.newPassword !== passwordFormular.confirmPassword) {
            setMessage({ text: t('admin.passwordMismatch'), type: 'error' });
            return;
        }
        setSavingPassword(true);
        try {
            const res = await userService.changePassword({
                currentPassword: passwordFormular.currentPassword,
                newPassword: passwordFormular.newPassword
            });
            setMessage({ text: res.message || t('admin.passwordChanged'), type: 'success' });
            setPasswordFormular({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err: unknown) {
            setMessage({ text: getApiErrorMessage(err, t('admin.passwordChangeError')), type: 'error' });
        } finally {
            setSavingPassword(false);
        }
    };

    // Skift symbolstatus
    const handleToggleSymbol = async (sym: SymbolResponseDto) => {
        const currentStatus = Boolean(sym.isActive);
        const targetStatus = !currentStatus;
        const symName = (sym.name || '').trim();

        try {
            setSymbols(prev =>
                prev.map(s => s.id === sym.id ? { ...s, isActive: targetStatus } : s)
            );
            const result = await symbolApi.toggleSymbolStatus(sym.id, targetStatus);
            setMessage({
                text: result.historicalSyncQueued
                    ? t('admin.symbolHistoricalSyncQueued', { symbol: symName })
                    : t(targetStatus ? 'admin.symbolActivated' : 'admin.symbolDeactivated', {
                        symbol: symName
                    }),
                type: 'success'
            });
        } catch {
            setSymbols(prev =>
                prev.map(s => s.id === sym.id ? { ...s, isActive: currentStatus } : s)
            );
            setMessage({ text: t('admin.symbolUpdateError', { symbol: symName }), type: 'error' });
        }
    };

    // Behandler den relevante brugerhandling eller event.
    const handleSyncExchange = async (exchangeCode: string) => {
        setSyncingExchangeCode(exchangeCode);
        try {
            const result = await symbolApi.syncExchange(exchangeCode);
            setMessage({ text: result.message || t('admin.syncSuccess', { exchange: exchangeCode }), type: 'success' });
            await fetchSymbols();
        } catch (err: unknown) {
            setMessage({ text: getApiErrorMessage(err, t('admin.syncError', { exchange: exchangeCode })), type: 'error' });
        } finally {
            setSyncingExchangeCode(null);
        }
    };

    // Søgefiltre
    const qSearch = (searchQuery || '').trim().toLowerCase();

    const filteredStandardUsers = standardUsers.filter(u => {
        const username = (u.username || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        return username.includes(qSearch) || email.includes(qSearch) || fullName.includes(qSearch);
    });

    const filteredAdminUsers = adminUsers.filter(u => {
        const username = (u.username || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        return username.includes(qSearch) || email.includes(qSearch) || fullName.includes(qSearch);
    });

    const qSym = (symbolSearchQuery || '').trim().toLowerCase();
    const filteredSymbols = (symbols || []).filter(s => {
        if (selectedExchangeId !== 'all' && s.exchangeId !== selectedExchangeId) return false;
        const name = (s.name || '').toLowerCase();
        const base = (s.baseAsset || '').toLowerCase();
        const quote = (s.quoteAsset || '').toLowerCase();
        const exchange = (s.exchangeCode || '').toLowerCase();
        return name.includes(qSym) || base.includes(qSym) || quote.includes(qSym) || exchange.includes(qSym);
    });

    return (
        <div className="min-h-screen bg-[#0b0e14] text-gray-200 p-4 sm:p-8 font-sans select-none">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Øverste header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#21262d]">
                    <div className="flex items-center space-x-3.5">
                        <div className="p-3 bg-purple-600/15 text-purple-400 rounded-2xl border border-purple-500/25 shadow-xl">
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                        <div>
                            <div className="flex items-center space-x-2.5">
                                <h1 className="text-xl font-extrabold text-white tracking-tight">{t('admin.panelTitle')}</h1>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider ${isSuperAdmin
                                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    }`}>
                                    {isSuperAdmin ? 'SUPERADMIN' : 'ADMIN'}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{t('admin.panelSubtitle')}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Sprogvælger */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-[#30363d] bg-[#161b22] hover:bg-[#21262d] text-xs font-semibold text-gray-200 transition-colors shadow-sm"
                            >
                                <Globe className="w-3.5 h-3.5 text-blue-400" />
                                <span>{currentLangLabel}</span>
                            </button>

                            {isLangMenuOpen && (
                                <div className="absolute top-full right-0 mt-1.5 w-32 rounded-xl bg-[#161b22] border border-[#30363d] shadow-2xl p-1.5 space-y-0.5 z-50 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => handleLanguageChange('tr')}
                                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg font-medium transition-colors ${i18n.language.startsWith('tr')
                                            ? 'bg-blue-600/20 text-blue-400'
                                            : 'text-gray-300 hover:bg-[#21262d]'
                                            }`}
                                    >
                                        <span>🇹🇷 Türkçe</span>
                                        {i18n.language.startsWith('tr') && <Check className="w-3 h-3" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleLanguageChange('en')}
                                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg font-medium transition-colors ${i18n.language.startsWith('en')
                                            ? 'bg-blue-600/20 text-blue-400'
                                            : 'text-gray-300 hover:bg-[#21262d]'
                                            }`}
                                    >
                                        <span>🇬🇧 English</span>
                                        {i18n.language.startsWith('en') && <Check className="w-3 h-3" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleLanguageChange('da')}
                                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg font-medium transition-colors ${i18n.language.startsWith('da')
                                            ? 'bg-blue-600/20 text-blue-400'
                                            : 'text-gray-300 hover:bg-[#21262d]'
                                            }`}
                                    >
                                        <span>🇩🇰 Dansk</span>
                                        {i18n.language.startsWith('da') && <Check className="w-3 h-3" />}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Badge for den aktuelle bruger */}
                        <div
                            onClick={() => setActiveTab('profile')}
                            className="flex items-center space-x-2.5 px-3 py-1.5 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] rounded-xl cursor-pointer transition-all shadow-sm"
                            title={t('admin.editProfile')}
                        >
                            <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-xs">
                                {(profileFormular.firstName?.[0] || profileFormular.username?.[0] || 'A').toUpperCase()}
                            </div>
                            <div className="text-left leading-tight">
                                <div className="text-xs font-bold text-white flex items-center space-x-1">
                                    <span>{profileFormular.firstName ? `${profileFormular.firstName} ${profileFormular.lastName}` : profileFormular.username}</span>
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono">@{profileFormular.username}</div>
                            </div>
                        </div>

                        {/* Opdater-knap */}
                        <button
                            type="button"
                            onClick={refreshAll}
                            className="p-2.5 rounded-xl bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-gray-300 transition-colors shadow-sm"
                            title={t('admin.refresh')}
                        >
                            <RefreshCw className={`w-4 h-4 ${loadingUsers || loadingSymbols ? 'animate-spin text-purple-400' : ''}`} />
                        </button>

                        {/* Gå til terminal */}
                        <button
                            type="button"
                            onClick={onSwitchToTerminal}
                            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/25"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>{t('admin.goToTerminal')}</span>
                        </button>

                        {/* Log ud */}
                        <button
                            type="button"
                            onClick={onLogout}
                            className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 transition-colors"
                            title={t('admin.logout')}
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* KPI-statistikkort */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 flex items-center justify-between shadow-lg">
                        <div className="space-y-1">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('admin.registeredUsers')}</span>
                            <div className="text-2xl font-black text-white">{standardUsers.length}</div>
                        </div>
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 flex items-center justify-between shadow-lg">
                        <div className="space-y-1">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('admin.otherAdmins')}</span>
                            <div className="text-2xl font-black text-purple-400">{adminUsers.length}</div>
                        </div>
                        <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 flex items-center justify-between shadow-lg">
                        <div className="space-y-1">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('admin.activeMarkets')}</span>
                            <div className="text-2xl font-black text-emerald-400">
                                {symbols.filter(s => Boolean(s.isActive)).length} <span className="text-xs text-gray-500 font-normal">/ {symbols.length}</span>
                            </div>
                        </div>
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                            <Activity className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                {/* Faner */}
                <div className="flex border-b border-[#21262d] text-xs font-bold gap-8 overflow-x-auto">
                    <button
                        type="button"
                        onClick={() => setActiveTab('health')}
                        className={`pb-3.5 border-b-2 transition-colors flex items-center space-x-2 ${activeTab === 'health' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                    >
                        <Activity className="w-4 h-4" />
                        <span>{t('admin.tabHealth')}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setActiveTab('users'); setSearchQuery(''); }}
                        className={`pb-3.5 border-b-2 transition-colors flex items-center space-x-2 ${activeTab === 'users' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        <Users className="w-4 h-4" />
                        <span>{t('admin.tabUsers')} ({standardUsers.length})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setActiveTab('admins'); setSearchQuery(''); }}
                        className={`pb-3.5 border-b-2 transition-colors flex items-center space-x-2 ${activeTab === 'admins' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        <ShieldCheck className="w-4 h-4" />
                        <span>{t('admin.tabAdmins')} ({adminUsers.length})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('symbols')}
                        className={`pb-3.5 border-b-2 transition-colors flex items-center space-x-2 ${activeTab === 'symbols' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        <Coins className="w-4 h-4" />
                        <span>{t('admin.tabSymbols')} ({symbols.length})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('exchanges')}
                        className={`pb-3.5 border-b-2 transition-colors flex items-center space-x-2 ${activeTab === 'exchanges' ? 'border-sky-500 text-sky-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                    >
                        <Globe className="w-4 h-4" />
                        <span>{t('admin.tabExchanges')} ({exchanges.length})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('profile')}
                        className={`pb-3.5 border-b-2 transition-colors flex items-center space-x-2 ${activeTab === 'profile' ? 'border-amber-500 text-amber-400' : 'border-transparent text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        <KeyRound className="w-4 h-4" />
                        <span>{t('admin.tabProfile')}</span>
                    </button>
                </div>

                {/* Notifikationsbesked */}
                {message && (
                    <div className={`p-3.5 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-200 ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
                        }`}>
                        <div className="flex items-center space-x-2.5">
                            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                            <span className="font-medium">{message.text}</span>
                        </div>
                        <button type="button" onClick={() => setMessage(null)} className="text-gray-400 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {activeTab === 'health' && (
                    <div className="space-y-5">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base font-black text-white">{t('admin.healthTitle')}</h2>
                                <p className="text-xs text-gray-500 mt-1">{t('admin.healthSubtitle')}</p>
                            </div>
                            <button type="button" onClick={fetchHealth} disabled={loadingHealth} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20 disabled:opacity-50 text-xs font-bold">
                                <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
                                {t('admin.refresh')}
                            </button>
                        </div>

                        {loadingHealth && !health ? (
                            <div className="py-24 grid place-items-center bg-[#161b22] border border-[#30363d] rounded-2xl"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>
                        ) : health ? (
                            <>
                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                    {[
                                        [t('admin.healthOverall'), health.status.toLowerCase() === 'healthy' ? t('admin.healthHealthy') : health.status.toLowerCase() === 'degraded' ? t('admin.healthDegraded') : t('admin.healthUnhealthy'), health.status.toLowerCase() === 'healthy'],
                                        [t('admin.healthDatabase'), health.databaseHealthy ? t('admin.healthOnline') : t('admin.healthOffline'), health.databaseHealthy],
                                        [t('admin.healthTimescale'), health.timescaleHealthy ? t('admin.healthOnline') : t('admin.healthOffline'), health.timescaleHealthy],
                                        [t('admin.healthHypertable'), health.candlesHypertableHealthy ? t('admin.healthReady') : t('admin.healthProblem'), health.candlesHypertableHealthy],
                                        [t('admin.healthActiveSymbols'), t('admin.healthSymbolCount', { count: health.activeSymbolCount }), health.activeSymbolCount > 0],
                                    ].map(([label, value, ok]) => (
                                        <div key={String(label)} className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">{String(label)}</span>
                                                {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                                            </div>
                                            <div className={`mt-2 text-lg font-black ${ok ? 'text-emerald-300' : 'text-rose-300'}`}>{String(value)}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                                    <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden">
                                        <div className="px-4 py-3 border-b border-[#30363d] text-xs font-black text-white">{t('admin.healthExchangeRuntime')}</div>
                                        <div className="divide-y divide-[#30363d]">
                                            {health.exchanges.map((exchange) => (
                                                <div key={exchange.exchangeCode} className="p-4 grid grid-cols-2 md:grid-cols-6 gap-3 items-center text-xs">
                                                    <div className="md:col-span-2">
                                                        <div className="font-black text-white">{exchange.exchangeName}</div>
                                                        <div className="text-[10px] text-gray-500 font-mono">{exchange.exchangeCode}</div>
                                                    </div>
                                                    <div><div className="text-[9px] uppercase text-gray-500">{t('admin.healthRealtime')}</div><div className={exchange.realtimeConnected ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{exchange.realtimeConnected ? t('admin.healthConnected') : t('admin.healthDisconnected')}</div></div>
                                                    <div><div className="text-[9px] uppercase text-gray-500">{t('admin.healthHistorical')}</div><div className={exchange.historicalSyncRunning ? 'text-amber-300 font-bold' : 'text-gray-300 font-bold'}>{exchange.historicalSyncRunning ? t('admin.healthSyncing') : t('admin.healthIdle')}</div></div>
                                                    <div><div className="text-[9px] uppercase text-gray-500">{t('admin.healthSymbols')}</div><div className="text-white font-bold">{exchange.activeSymbolCount}</div></div>
                                                    <div><div className="text-[9px] uppercase text-gray-500">{t('admin.healthStatus')}</div><div className="font-bold text-cyan-300">{exchange.status?.toLowerCase() === 'healthy' ? t('admin.healthHealthy') : exchange.status?.toLowerCase() === 'degraded' ? t('admin.healthDegraded') : exchange.status?.toLowerCase() === 'unhealthy' ? t('admin.healthUnhealthy') : exchange.status}</div></div>
                                                    {exchange.lastError && <div className="col-span-2 md:col-span-6 text-[10px] text-rose-300 bg-rose-500/10 rounded-lg px-3 py-2">{exchange.lastError}</div>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 space-y-4">
                                        <div><div className="text-[10px] uppercase text-gray-500 font-bold">{t('admin.healthLastCandle')}</div><div className="text-sm font-mono text-white mt-1">{health.lastCandleTimeUtc ? new Date(health.lastCandleTimeUtc).toLocaleString(i18n.language) : '—'}</div></div>
                                        <div><div className="text-[10px] uppercase text-gray-500 font-bold">{t('admin.healthCandleAge')}</div><div className="text-xl font-black text-cyan-300 mt-1">{health.lastCandleAgeSeconds != null ? t('admin.healthSeconds', { count: Math.round(health.lastCandleAgeSeconds) }) : '—'}</div></div>
                                        <div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-rose-500/10 p-3"><div className="text-[9px] uppercase text-rose-300">{t('admin.healthValidationError')}</div><div className="text-xl font-black text-rose-300">{health.validationErrorCount}</div></div><div className="rounded-xl bg-amber-500/10 p-3"><div className="text-[9px] uppercase text-amber-300">{t('admin.healthWarning')}</div><div className="text-xl font-black text-amber-300">{health.validationWarningCount}</div></div></div>
                                        <div><div className="text-[10px] uppercase text-gray-500 font-bold">{t('admin.healthUptime')}</div><div className="text-sm font-mono text-gray-300 mt-1">{health.uptime}</div></div>
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>
                )}

                {/* 1. Standardbrugere */}
                {activeTab === 'users' && (
                    <div className="space-y-4">
                        <div className="relative max-w-md">
                            <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('admin.searchUsersPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-[#161b22] border border-[#30363d] rounded-xl text-xs outline-none focus:border-blue-500 text-white transition-colors"
                            />
                        </div>

                        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-2xl">
                            {loadingUsers ? (
                                <div className="py-20 flex flex-col items-center justify-center space-y-2 text-gray-400">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                    <span className="text-xs">{t('admin.loadingUsers')}</span>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-[#0d1117] text-gray-400 uppercase text-[10px] tracking-wider border-b border-[#30363d]">
                                            <tr>
                                                <th className="px-6 py-4">{t('admin.tableUser')}</th>
                                                <th className="px-6 py-4">{t('admin.tableEmail')}</th>
                                                <th className="px-6 py-4">{t('admin.tableStatus')}</th>
                                                <th className="px-6 py-4 text-right">{t('admin.tableActions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#30363d]">
                                            {filteredStandardUsers.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                                                        {t('admin.noUsersFound')}
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredStandardUsers.map((user) => (
                                                    <tr key={user.id} className="hover:bg-gray-800/20 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-semibold text-white">
                                                                {user.firstName} {user.lastName}
                                                            </div>
                                                            <div className="text-gray-400 font-mono text-[11px]">@{user.username}</div>
                                                        </td>

                                                        <td className="px-6 py-4 text-gray-300 font-mono">{user.email}</td>

                                                        <td className="px-6 py-4">
                                                            <span className="inline-flex items-center space-x-1 text-emerald-400 text-[11px]">
                                                                <UserCheck className="w-3.5 h-3.5" />
                                                                <span>{t('admin.activeAccount')}</span>
                                                            </span>
                                                        </td>

                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end space-x-2">
                                                                {isSuperAdmin && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRoleChange(user, 'Admin')}
                                                                        className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-purple-600/15 hover:bg-purple-600/25 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors"
                                                                        title={t('admin.makeAdmin')}
                                                                    >
                                                                        <UserPlus className="w-3.5 h-3.5" />
                                                                        <span>{t('admin.makeAdminBtn')}</span>
                                                                    </button>
                                                                )}

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleHardDeleteUser(user.id, user.username)}
                                                                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/30"
                                                                    title={t('admin.deleteUserTooltip')}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. Administratorer */}
                {activeTab === 'admins' && (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="relative flex-1 max-w-md">
                                <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={t('admin.searchAdminsPlaceholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-[#161b22] border border-[#30363d] rounded-xl text-xs outline-none focus:border-purple-500 text-white transition-colors"
                                />
                            </div>

                            {isSuperAdmin && (
                                <button
                                    type="button"
                                    onClick={() => { setIsAddAdminOpen(true); setAdminModalError(null); }}
                                    className="flex items-center space-x-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-600/25 self-start sm:self-auto"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>{t('admin.addAdminBtn')}</span>
                                </button>
                            )}
                        </div>

                        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-2xl">
                            {loadingUsers ? (
                                <div className="py-20 flex flex-col items-center justify-center space-y-2 text-gray-400">
                                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                                    <span className="text-xs">{t('admin.loadingAdmins')}</span>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-[#0d1117] text-gray-400 uppercase text-[10px] tracking-wider border-b border-[#30363d]">
                                            <tr>
                                                <th className="px-6 py-4">{t('admin.tableAdmin')}</th>
                                                <th className="px-6 py-4">{t('admin.tableEmail')}</th>
                                                <th className="px-6 py-4">{t('admin.tableRole')}</th>
                                                {isSuperAdmin && <th className="px-6 py-4 text-right">{t('admin.tableActions')}</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#30363d]">
                                            {filteredAdminUsers.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                                                        {t('admin.noOtherAdmins')}
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredAdminUsers.map((user) => (
                                                    <tr key={user.id} className="hover:bg-gray-800/20 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-semibold text-white flex items-center space-x-2">
                                                                <span>{user.firstName} {user.lastName}</span>
                                                            </div>
                                                            <div className="text-gray-400 font-mono text-[11px]">@{user.username}</div>
                                                        </td>

                                                        <td className="px-6 py-4 text-gray-300 font-mono">{user.email}</td>

                                                        <td className="px-6 py-4">
                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                                {t('admin.roleAdminBadge', 'Admin (Panel Yetkilisi)')}
                                                            </span>
                                                        </td>

                                                        {isSuperAdmin && (
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex items-center justify-end space-x-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRoleChange(user, 'User')}
                                                                        className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-gray-500/10 hover:bg-gray-500/20 text-gray-300 border border-gray-500/30 text-xs font-semibold transition-colors"
                                                                        title={t('admin.revokeRoleTitle')}
                                                                    >
                                                                        <UserMinus className="w-3.5 h-3.5" />
                                                                        <span>{t('admin.revokeRoleBtn')}</span>
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleHardDeleteUser(user.id, user.username)}
                                                                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/30"
                                                                        title={t('admin.deleteAdminTooltip')}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. Symboler */}
                {activeTab === 'symbols' && (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="relative flex-1 max-w-md">
                                <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={t('admin.searchSymbolsPlaceholder')}
                                    value={symbolSearchQuery}
                                    onChange={(e) => setSymbolSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-[#161b22] border border-[#30363d] rounded-xl text-xs outline-none focus:border-emerald-500 text-white transition-colors"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                                <select value={selectedExchangeId} onChange={(e) => setSelectedExchangeId(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="bg-[#161b22] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-gray-300 outline-none">
                                    <option value="all">{t('admin.allExchanges')}</option>
                                    {exchanges.map((exchange) => <option key={exchange.id} value={exchange.id}>{exchange.name}</option>)}
                                </select>
                                {selectedExchangeId !== 'all' && (() => {
                                    const exchange = exchanges.find((x) => x.id === selectedExchangeId);
                                    return exchange ? (
                                        <button type="button" onClick={() => handleSyncExchange(exchange.code)} disabled={syncingExchangeCode === exchange.code} className="flex items-center gap-1.5 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50">
                                            <RefreshCw className={`w-3.5 h-3.5 ${syncingExchangeCode === exchange.code ? 'animate-spin' : ''}`} />
                                            {exchange.code} {t('admin.sync')}
                                        </button>
                                    ) : null;
                                })()}
                                <div className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-3.5 py-2 rounded-xl border border-emerald-500/20">
                                    {filteredSymbols.filter((s) => Boolean(s.isActive)).length} / {filteredSymbols.length} {t('admin.activeSymbolsCount')}
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-2xl">
                            {loadingSymbols ? (
                                <div className="py-20 flex flex-col items-center justify-center space-y-2 text-gray-400">
                                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                                    <span className="text-xs">{t('admin.loadingSymbols')}</span>
                                </div>
                            ) : (
                                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-[#0d1117] text-gray-400 uppercase text-[10px] tracking-wider border-b border-[#30363d] sticky top-0 z-10">
                                            <tr>
                                                <th className="px-6 py-4">{t('admin.tableSymbol')}</th>
                                                <th className="px-6 py-4">{t('admin.tableNameDesc')}</th>
                                                <th className="px-6 py-4">{t('admin.tableBaseQuote')}</th>
                                                <th className="px-6 py-4">{t('admin.tableStatus')}</th>
                                                <th className="px-6 py-4 text-right">{t('admin.tableAction')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#30363d]">
                                            {filteredSymbols.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                                                        {t('admin.noSymbolsFound')}
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredSymbols.map((sym) => {
                                                    const isActive = Boolean(sym.isActive);

                                                    return (
                                                        <tr key={sym.id} className="hover:bg-gray-800/20 transition-colors">
                                                            <td className="px-6 py-4"><div className="font-bold text-white font-mono">{sym.name}</div><div className="text-[10px] text-cyan-400 mt-0.5">{sym.exchangeCode} · #{sym.id}</div></td>
                                                            <td className="px-6 py-4 text-gray-300">{sym.name} {t('admin.spotPair')}</td>
                                                            <td className="px-6 py-4 text-gray-400 font-mono">
                                                                {sym.baseAsset} / {sym.quoteAsset}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span
                                                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isActive
                                                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                                                                        : 'bg-red-500/15 text-red-400 border border-red-500/25'
                                                                        }`}
                                                                >
                                                                    {isActive ? t('admin.active') : t('admin.inactive')}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleSymbol(sym)}
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isActive
                                                                        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30'
                                                                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                                        }`}
                                                                >
                                                                    {isActive ? t('admin.deactivateBtn') : t('admin.activateBtn')}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 4. Exchange-administration */}
                {activeTab === 'exchanges' && (
                    <div className="space-y-5">
                        <form onSubmit={handleCreateExchange} className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                    <h2 className="text-sm font-black text-white">{t('admin.exchangeManagementTitle')}</h2>
                                    <p className="text-[11px] text-gray-400 mt-1">{t('admin.exchangeManagementHint')}</p>
                                </div>
                                <div className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
                                    BINANCE · OKX
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_auto_auto] gap-3 items-end">
                                <label className="space-y-1.5">
                                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('admin.exchangeCode')}</span>
                                    <input value={exchangeFormular.code} onChange={(e) => setExchangeFormular(v => ({ ...v, code: e.target.value.toUpperCase() }))} placeholder="OKX" maxLength={20} className="w-full px-3 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white outline-none focus:border-sky-500 font-mono" />
                                </label>
                                <label className="space-y-1.5">
                                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('admin.exchangeName')}</span>
                                    <input value={exchangeFormular.name} onChange={(e) => setExchangeFormular(v => ({ ...v, name: e.target.value }))} placeholder="OKX" maxLength={50} className="w-full px-3 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white outline-none focus:border-sky-500" />
                                </label>
                                <label className="h-[42px] flex items-center gap-2 px-3 rounded-xl bg-[#0d1117] border border-[#30363d] text-xs text-gray-300 cursor-pointer">
                                    <input type="checkbox" checked={exchangeFormular.isActive} onChange={(e) => setExchangeFormular(v => ({ ...v, isActive: e.target.checked }))} />
                                    {t('admin.active')}
                                </label>
                                <button type="submit" disabled={savingExchange || !exchangeFormular.code.trim() || !exchangeFormular.name.trim()} className="h-[42px] flex items-center justify-center gap-1.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-black">
                                    {savingExchange ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    {t('admin.addExchange')}
                                </button>
                            </div>
                        </form>

                        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-[#0d1117] text-gray-400 uppercase text-[10px] tracking-wider border-b border-[#30363d]">
                                        <tr>
                                            <th className="px-6 py-4">{t('admin.exchangeCode')}</th>
                                            <th className="px-6 py-4">{t('admin.exchangeName')}</th>
                                            <th className="px-6 py-4">{t('admin.tableStatus')}</th>
                                            <th className="px-6 py-4 text-right">{t('admin.tableActions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#30363d]">
                                        {exchanges.map(exchange => (
                                            <tr key={exchange.id} className="hover:bg-gray-800/20">
                                                <td className="px-6 py-4 font-mono font-bold text-sky-300">{exchange.code}</td>
                                                <td className="px-6 py-4 text-white font-semibold">{exchange.name}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${exchange.isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-red-500/15 text-red-400 border border-red-500/25'}`}>
                                                        {exchange.isActive ? t('admin.active') : t('admin.inactive')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <button type="button" onClick={() => setEditingExchange({ ...exchange })} className="px-3 py-1.5 rounded-lg border border-sky-500/25 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 font-bold">{t('admin.edit')}</button>
                                                        <button type="button" onClick={() => handleDeleteExchange(exchange)} className="p-1.5 rounded-lg border border-red-500/25 bg-red-500/10 text-red-400 hover:bg-red-500/20" title={t('admin.deleteExchange')}><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {editingExchange && (
                            <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm grid place-items-center p-4">
                                <form onSubmit={handleUpdateExchange} className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-2xl space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-black text-white">{t('admin.editExchange')}</h3>
                                        <button type="button" onClick={() => setEditingExchange(null)} className="p-1.5 text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
                                    </div>
                                    <input value={editingExchange.code} onChange={(e) => setEditingExchange(v => v ? ({ ...v, code: e.target.value.toUpperCase() }) : v)} maxLength={20} className="w-full px-3 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white font-mono" />
                                    <input value={editingExchange.name} onChange={(e) => setEditingExchange(v => v ? ({ ...v, name: e.target.value }) : v)} maxLength={50} className="w-full px-3 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white" />
                                    <label className="flex items-center gap-2 text-xs text-gray-300"><input type="checkbox" checked={editingExchange.isActive} onChange={(e) => setEditingExchange(v => v ? ({ ...v, isActive: e.target.checked }) : v)} />{t('admin.active')}</label>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <button type="button" onClick={() => setEditingExchange(null)} className="px-4 py-2 rounded-xl border border-[#30363d] text-gray-300 text-xs font-bold">{t('admin.cancel')}</button>
                                        <button type="submit" disabled={savingExchange} className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-black flex items-center gap-1.5 disabled:opacity-50">{savingExchange ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{t('admin.saveExchange')}</button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                )}

                {/* 5. Fane til profil og sikkerhed */}
                {activeTab === 'profile' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Formular til profiloplysninger */}
                        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl space-y-4">
                            <div className="flex items-center space-x-2 pb-3 border-b border-[#30363d]">
                                <UserIcon className="w-5 h-5 text-amber-400" />
                                <h3 className="font-bold text-sm text-white">{t('admin.profileTitle')}</h3>
                            </div>

                            <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-gray-400 font-medium mb-1">{t('auth.firstName')}</label>
                                        <input
                                            type="text"
                                            required
                                            value={profileFormular.firstName}
                                            onChange={(e) => setProfileFormular({ ...profileFormular, firstName: e.target.value })}
                                            className="w-full p-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-amber-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 font-medium mb-1">{t('auth.lastName')}</label>
                                        <input
                                            type="text"
                                            required
                                            value={profileFormular.lastName}
                                            onChange={(e) => setProfileFormular({ ...profileFormular, lastName: e.target.value })}
                                            className="w-full p-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-amber-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-400 font-medium mb-1">{t('auth.username')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={profileFormular.username}
                                        onChange={(e) => setProfileFormular({ ...profileFormular, username: e.target.value })}
                                        className="w-full p-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-amber-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 font-medium mb-1">{t('auth.email')}</label>
                                    <input
                                        type="email"
                                        required
                                        value={profileFormular.email}
                                        onChange={(e) => setProfileFormular({ ...profileFormular, email: e.target.value })}
                                        className="w-full p-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-amber-500"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={savingProfile}
                                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-amber-600/20 disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>{savingProfile ? t('admin.saving') : t('admin.updateProfileBtn')}</span>
                                </button>
                            </form>
                        </div>

                        {/* Formular til ændring af adgangskode */}
                        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl space-y-4">
                            <div className="flex items-center space-x-2 pb-3 border-b border-[#30363d]">
                                <Lock className="w-5 h-5 text-pink-400" />
                                <h3 className="font-bold text-sm text-white">{t('admin.securityTitle')}</h3>
                            </div>

                            <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
                                <div>
                                    <label className="block text-gray-400 font-medium mb-1">{t('admin.currentPassword')}</label>
                                    <input
                                        type="password"
                                        required
                                        placeholder={t('admin.passwordPlaceholder', '••••••••')}
                                        value={passwordFormular.currentPassword}
                                        onChange={(e) => setPasswordFormular({ ...passwordFormular, currentPassword: e.target.value })}
                                        className="w-full p-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-pink-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 font-medium mb-1">{t('admin.newPassword')}</label>
                                    <input
                                        type="password"
                                        required
                                        placeholder={t('admin.min6chars')}
                                        value={passwordFormular.newPassword}
                                        onChange={(e) => setPasswordFormular({ ...passwordFormular, newPassword: e.target.value })}
                                        className="w-full p-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-pink-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 font-medium mb-1">{t('admin.confirmNewPassword')}</label>
                                    <input
                                        type="password"
                                        required
                                        placeholder={t('admin.min6chars')}
                                        value={passwordFormular.confirmPassword}
                                        onChange={(e) => setPasswordFormular({ ...passwordFormular, confirmPassword: e.target.value })}
                                        className="w-full p-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-pink-500"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={savingPassword}
                                    className="w-full py-2.5 bg-pink-600 hover:bg-pink-500 active:bg-pink-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-pink-600/20 disabled:opacity-50"
                                >
                                    <KeyRound className="w-4 h-4" />
                                    <span>{savingPassword ? t('admin.updating') : t('admin.changePasswordBtn')}</span>
                                </button>
                            </form>
                        </div>
                    </div>
                )}

            </div>

            {/* Modal til oprettelse af ny admin */}
            {isAddAdminOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    onClick={() => { setIsAddAdminOpen(false); setAdminModalError(null); }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-2xl space-y-4"
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
                            <div className="flex items-center space-x-2">
                                <ShieldCheck className="w-5 h-5 text-purple-400" />
                                <h3 className="font-bold text-sm text-white">{t('admin.modalNewAdminTitle')}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setIsAddAdminOpen(false); setAdminModalError(null); }}
                                className="text-gray-400 hover:text-white p-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Fejlboks i modal */}
                        {adminModalError && (
                            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 flex items-start space-x-2 animate-in fade-in text-xs">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span className="font-medium leading-relaxed">{adminModalError}</span>
                            </div>
                        )}

                        <form onSubmit={handleCreateAdminSubmit} className="space-y-3.5 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-gray-400 font-medium mb-1">{t('auth.firstName')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={adminFormular.firstName}
                                        onChange={(e) => setAdminFormular({ ...adminFormular, firstName: e.target.value })}
                                        className="w-full p-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 font-medium mb-1">{t('auth.lastName')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={adminFormular.lastName}
                                        onChange={(e) => setAdminFormular({ ...adminFormular, lastName: e.target.value })}
                                        className="w-full p-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-400 font-medium mb-1">{t('auth.username')}</label>
                                <div className="relative">
                                    <UserIcon className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-500" />
                                    <input
                                        type="text"
                                        required
                                        value={adminFormular.username}
                                        onChange={(e) => setAdminFormular({ ...adminFormular, username: e.target.value })}
                                        className="w-full pl-9 pr-3 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-400 font-medium mb-1">{t('auth.email')}</label>
                                <div className="relative">
                                    <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-500" />
                                    <input
                                        type="email"
                                        required
                                        value={adminFormular.email}
                                        onChange={(e) => setAdminFormular({ ...adminFormular, email: e.target.value })}
                                        className="w-full pl-9 pr-3 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-400 font-medium mb-1">{t('auth.password')}</label>
                                <div className="relative">
                                    <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-500" />
                                    <input
                                        type="password"
                                        required
                                        placeholder={t('admin.passwordPlaceholder', '••••••••')}
                                        value={adminFormular.password}
                                        onChange={(e) => setAdminFormular({ ...adminFormular, password: e.target.value })}
                                        className="w-full pl-9 pr-3 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex items-center space-x-2">
                                <button
                                    type="submit"
                                    disabled={creatingAdmin}
                                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center space-x-1.5 shadow-lg shadow-purple-600/25"
                                >
                                    {creatingAdmin ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>{t('admin.creating')}</span>
                                        </>
                                    ) : (
                                        <span>{t('admin.createAdminSubmitBtn')}</span>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setIsAddAdminOpen(false); setAdminModalError(null); }}
                                    className="flex-1 py-2.5 bg-[#0d1117] hover:bg-[#21262d] text-gray-300 font-medium rounded-xl border border-[#30363d] transition-colors"
                                >
                                    {t('admin.cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    Globe,
    Lock,
    Mail,
    ShieldCheck,
    TrendingUp,
    User,
} from 'lucide-react';
import { authService } from '../Services/authService';
import type { User as AuthUser } from '../Types/auth';

interface AuthPageProps {
    onLoginSuccess: (user: AuthUser) => void;
}

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

// Henter de nødvendige data til denne funktion.
const getApiErrorMessage = (err: any, fallback: string, connectionError: string) => {
    if (err?.response?.data?.message) return err.response.data.message as string;

    const validationErrors = err?.response?.data?.errors;
    if (validationErrors && typeof validationErrors === 'object') {
        const firstError = Object.values(validationErrors).flat()[0];
        if (typeof firstError === 'string') return firstError;
    }

    if (err?.request) return connectionError;
    return fallback;
};

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
    const { t, i18n } = useTranslation();

    const resetQuery = useMemo(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('resetToken') ?? '';
        const userId = Number(params.get('userId') ?? 0);
        return { token, userId };
    }, []);

    const [mode, setMode] = useState<AuthMode>(
        resetQuery.token && resetQuery.userId > 0 ? 'reset' : 'login'
    );
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [formData, setFormularData] = useState({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        identifier: '',
        password: '',
        newPassword: '',
        confirmPassword: '',
    });

    // Håndterer set auth mode.
    const setAuthMode = (newMode: AuthMode) => {
        setMode(newMode);
        setError(null);
        setSuccess(null);
    };

    // Behandler den relevante brugerhandling eller event.
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormularData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Behandler den relevante brugerhandling eller event.
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

    // Behandler den relevante brugerhandling eller event.
    const handleSubmit = async (e: React.FormularEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            if (mode === 'forgot') {
                const result = await authService.forgotPassword({
                    identifier: formData.identifier.trim(),
                });
                setSuccess(result.message || t('auth.forgotSentFallback'));
                return;
            }

            if (mode === 'reset') {
                if (formData.newPassword.length < 8) {
                    setError(t('auth.resetMinLength'));
                    return;
                }
                if (formData.newPassword !== formData.confirmPassword) {
                    setError(t('auth.resetMismatch'));
                    return;
                }

                const result = await authService.resetPassword({
                    userId: resetQuery.userId,
                    token: resetQuery.token,
                    newPassword: formData.newPassword,
                });
                setSuccess(result.message || t('auth.resetSuccessFallback'));
                window.history.replaceState({}, document.title, window.location.pathname);
                setTimeout(() => setAuthMode('login'), 1000);
                return;
            }

            if (mode === 'register') {
                await authService.register({
                    firstName: formData.firstName.trim(),
                    lastName: formData.lastName.trim(),
                    username: formData.username.trim(),
                    email: formData.email.trim(),
                    password: formData.password,
                });

                const loginIdentifier = formData.email.trim() || formData.username.trim();
                setSuccess(t('auth.registerSuccess'));
                setFormularData((prev) => ({
                    ...prev,
                    identifier: loginIdentifier,
                    password: '',
                    newPassword: '',
                    confirmPassword: '',
                }));

                window.setTimeout(() => {
                    setMode('login');
                    setError(null);
                    // Behold succesbeskeden synlig efter skift til loginformularen.
                }, 1400);
                return;
            }

            const authResponse = await authService.login({
                identifier: formData.identifier.trim(),
                password: formData.password,
            });

            onLoginSuccess({
                username: authResponse.username,
                email: authResponse.email,
                role: authResponse.role,
                firstName: authResponse.firstName,
                lastName: authResponse.lastName,
            });
        } catch (err: any) {
            console.error('Kimlik doğrulama hatası:', err);
            setError(getApiErrorMessage(err, t('auth.operationFailed'), t('auth.connectionError')));
        } finally {
            setLoading(false);
        }
    };

    const title = mode === 'register'
        ? t('auth.createAccountTitle')
        : mode === 'forgot'
            ? t('auth.forgotTitle')
            : mode === 'reset'
                ? t('auth.resetTitle')
                : t('auth.welcomeTitle');

    const subtitle = mode === 'register'
        ? t('auth.registerSubtitle')
        : mode === 'forgot'
            ? t('auth.forgotSubtitle')
            : mode === 'reset'
                ? t('auth.resetSubtitle')
                : t('auth.loginIdentifierSubtitle');

    return (
        <div className="flex min-h-screen w-full bg-[#0b0e14] text-white font-sans overflow-hidden relative">
            <div className="absolute top-4 right-4 z-50">
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsLangMenuOpen((v) => !v)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-gray-700/80 bg-[#151a23]/90 backdrop-blur-md text-xs font-semibold text-gray-200 hover:border-gray-500 transition-all shadow-lg"
                    >
                        <Globe className="w-3.5 h-3.5 text-blue-400" />
                        <span>{currentLangLabel}</span>
                    </button>

                    {isLangMenuOpen && (
                        <div className="absolute top-full right-0 mt-1.5 w-32 rounded-xl bg-[#151a23] border border-gray-700 shadow-2xl p-1.5 space-y-0.5 z-50 text-xs">
                            {[
                                ['tr', '🇹🇷 Türkçe'],
                                ['en', '🇬🇧 English'],
                                ['da', '🇩🇰 Dansk'],
                            ].map(([lang, label]) => (
                                <button
                                    key={lang}
                                    type="button"
                                    onClick={() => handleLanguageChange(lang as 'tr' | 'en' | 'da')}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg font-medium transition-colors ${i18n.language.startsWith(lang)
                                        ? 'bg-blue-600/20 text-blue-400'
                                        : 'text-gray-300 hover:bg-gray-800'
                                    }`}
                                >
                                    <span>{label}</span>
                                    {i18n.language.startsWith(lang) && <Check className="w-3 h-3" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div
                className="hidden lg:flex lg:w-3/5 relative bg-cover bg-center"
                style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1920&auto=format&fit=crop')`,
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-[#0b0e14]" />
                <div className="relative z-10 flex flex-col justify-between p-12">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-600 rounded-lg shadow-md">
                            <TrendingUp className="h-8 w-8 text-white" />
                        </div>
                        <span className="text-2xl font-bold tracking-wider">
                            TRADING<span className="text-blue-500">PRO</span>
                        </span>
                    </div>

                    <div className="max-w-xl space-y-5">
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-300">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {t('auth.secureAccess')}
                        </div>
                        <h1 className="text-4xl font-extrabold leading-tight tracking-wide">
                            {t('auth.heroTitle', 'Gerçek Zamanlı Piyasa Verileri ve Gelişmiş Grafik Platformu')}
                        </h1>
                        <p className="text-gray-400 text-lg leading-relaxed">
                            {t('auth.heroDescription', 'SignalR ile anlık mum verilerini takip edin, indikatörlerle analizinizi güçlendirin ve portföyünüzü tek ekrandan yönetin.')}
                        </p>
                    </div>

                    <div className="text-sm text-gray-500">{t('auth.copyrightShort')}</div>
                </div>
            </div>

            <div className="w-full lg:w-2/5 flex items-center justify-center p-6 sm:p-8 bg-[#0b0e14]">
                <div className="w-full max-w-md space-y-6 bg-[#151a23] p-7 sm:p-8 rounded-2xl border border-gray-800 shadow-2xl backdrop-blur-md">
                    {(mode === 'forgot' || mode === 'reset') && (
                        <button
                            type="button"
                            onClick={() => {
                                window.history.replaceState({}, document.title, window.location.pathname);
                                setAuthMode('login');
                            }}
                            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            {t('auth.backToLogin')}
                        </button>
                    )}

                    <div className="space-y-2 text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
                        <p className="text-gray-400 text-sm leading-relaxed">{subtitle}</p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-start space-x-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span className="font-medium leading-relaxed">{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-start space-x-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                            <span className="font-medium leading-relaxed">{success}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'register' && (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <TextInput icon={<User />} name="firstName" label={t('auth.firstName')} value={formData.firstName} onChange={handleChange} placeholder={t('auth.placeholderFirstName')} />
                                    <TextInput name="lastName" label={t('auth.lastName')} value={formData.lastName} onChange={handleChange} placeholder={t('auth.placeholderLastName')} />
                                </div>
                                <TextInput icon={<User />} name="username" label={t('auth.username')} value={formData.username} onChange={handleChange} placeholder={t('auth.placeholderUsername')} />
                                <TextInput icon={<Mail />} type="email" name="email" label={t('auth.email')} value={formData.email} onChange={handleChange} placeholder={t('auth.placeholderEmail')} />
                                <TextInput icon={<Lock />} type="password" name="password" label={t('auth.password')} value={formData.password} onChange={handleChange} placeholder={t('auth.passwordMinPlaceholder')} minLength={8} />
                            </>
                        )}

                        {(mode === 'login' || mode === 'forgot') && (
                            <TextInput
                                icon={<User />}
                                name="identifier"
                                label={t('auth.identifier')}
                                value={formData.identifier}
                                onChange={handleChange}
                                placeholder={t('auth.identifierPlaceholder')}
                            />
                        )}

                        {mode === 'login' && (
                            <>
                                <TextInput icon={<Lock />} type="password" name="password" label={t('auth.password')} value={formData.password} onChange={handleChange} placeholder="••••••••" />
                                <div className="flex justify-end -mt-1">
                                    <button
                                        type="button"
                                        onClick={() => setAuthMode('forgot')}
                                        className="text-xs font-medium text-blue-400 hover:text-blue-300 transition"
                                    >
                                        {t('auth.forgotPassword')}
                                    </button>
                                </div>
                            </>
                        )}

                        {mode === 'reset' && (
                            <>
                                <TextInput icon={<Lock />} type="password" name="newPassword" label={t('auth.newPassword')} value={formData.newPassword} onChange={handleChange} placeholder={t('auth.passwordMinPlaceholder')} minLength={8} />
                                <TextInput icon={<Lock />} type="password" name="confirmPassword" label={t('auth.confirmNewPassword')} value={formData.confirmPassword} onChange={handleChange} placeholder={t('auth.confirmNewPasswordPlaceholder')} minLength={8} />
                            </>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium rounded-lg transition flex items-center justify-center space-x-2 disabled:opacity-50 shadow-md"
                        >
                            <span>
                                {loading
                                    ? t('auth.processing')
                                    : mode === 'register'
                                        ? t('auth.register')
                                        : mode === 'forgot'
                                            ? t('auth.sendResetLink')
                                            : mode === 'reset'
                                                ? t('auth.updatePassword')
                                                : t('auth.login')}
                            </span>
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </form>

                    {(mode === 'login' || mode === 'register') && (
                        <div className="text-center pt-2 border-t border-gray-800/70">
                            <button
                                type="button"
                                onClick={() => setAuthMode(mode === 'register' ? 'login' : 'register')}
                                className="text-sm text-gray-400 hover:text-blue-400 transition pt-4"
                            >
                                {mode === 'register'
                                    ? t('auth.hasAccount')
                                    : t('auth.noAccount')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface TextInputProps {
    name: string;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    placeholder?: string;
    icon?: React.ReactNode;
    minLength?: number;
}

const TextInput: React.FC<TextInputProps> = ({
    name,
    label,
    value,
    onChange,
    type = 'text',
    placeholder,
    icon,
    minLength,
}) => (
    <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
        <div className="relative">
            {icon && <span className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
            <input
                type={type}
                name={name}
                required
                minLength={minLength}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                autoComplete={type === 'password' ? 'current-password' : undefined}
                className={`w-full ${icon ? 'pl-9' : 'px-3'} pr-3 py-2 bg-[#0b0e14] border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-sm text-white transition-colors`}
            />
        </div>
    </div>
);

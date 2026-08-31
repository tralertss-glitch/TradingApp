import React, { useState, useEffect } from 'react';
import {
    User,
    X,
    Lock,
    CheckCircle,
    AlertCircle,
    KeyRound,
    Save,
    Loader2,
    Trash2,
    AlertTriangle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { userService, type UserManagementDto } from '../Services/userService';

export interface UserProfileDto {
    id?: string | number;
    email?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
}

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    isDark: boolean;
    currentUser: UserProfileDto | null;
    onLogout: () => void;
    onProfileUpdated?: (updated: UserManagementDto) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
    isOpen,
    onClose,
    isDark,
    currentUser,
    onLogout,
    onProfileUpdated,
}) => {
    const { t } = useTranslation();
    const [profileTab, setProfileTab] = useState<'info' | 'password'>('info');

    // Tilstand for profilformular og data
    const [profileData, setProfileData] = useState<UserManagementDto | null>(null);
    const [fetchingProfile, setFetchingProfile] = useState(false);
    const [profileFormular, setProfileFormular] = useState({
        firstName: currentUser?.firstName || '',
        lastName: currentUser?.lastName || '',
        email: currentUser?.email || '',
    });
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
    const [profileError, setProfileError] = useState<string | null>(null);

    // Tilstand for adgangskodeformular
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pwdLoading, setPwdLoading] = useState(false);
    const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
    const [pwdError, setPwdError] = useState<string | null>(null);

    // Tilstand for kontosletning
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFetchingProfile(true);
            setProfileError(null);
            setProfileSuccess(null);
            setPwdError(null);
            setPwdSuccess(null);
            setIsDeleteConfirmOpen(false);

            userService
                .getMyProfile()
                .then((data) => {
                    setProfileData(data);
                    setProfileFormular({
                        firstName: data.firstName || '',
                        lastName: data.lastName || '',
                        email: data.email || '',
                    });
                })
                .catch(() => {
                    if (currentUser) {
                        setProfileFormular({
                            firstName: currentUser.firstName || '',
                            lastName: currentUser.lastName || '',
                            email: currentUser.email || '',
                        });
                    }
                })
                .finally(() => setFetchingProfile(false));
        }
    }, [isOpen, currentUser]);

    if (!isOpen) return null;

    // Opdaterer de aktuelle data i brugergrænsefladen.
    const handleProfileUpdateSubmit = async (e: React.FormularEvent) => {
        e.preventDefault();
        setProfileError(null);
        setProfileSuccess(null);
        setProfileLoading(true);

        try {
            const updated = await userService.updateMyProfile(profileFormular);
            setProfileData(updated);
            setProfileSuccess(t('profile.profileUpdated', 'Profil bilgileriniz başarıyla güncellendi.'));
            if (onProfileUpdated) {
                onProfileUpdated(updated);
            }
        } catch (err: any) {
            setProfileError(err.response?.data?.message || 'Profil güncellenirken bir hata oluştu.');
        } finally {
            setProfileLoading(false);
        }
    };

    // Behandler den relevante brugerhandling eller event.
    const handlePasswordChangeSubmit = async (e: React.FormularEvent) => {
        e.preventDefault();
        setPwdError(null);
        setPwdSuccess(null);

        if (newPassword !== confirmPassword) {
            setPwdError(t('profile.passwordMismatch', 'Yeni şifreler eşleşmiyor!'));
            return;
        }

        if (newPassword.length < 6) {
            setPwdError('Yeni şifre en az 6 karakter olmalıdır.');
            return;
        }

        setPwdLoading(true);
        try {
            await userService.changePassword({ currentPassword, newPassword });
            setPwdSuccess(t('profile.passwordChanged', 'Şifreniz başarıyla değiştirildi.'));
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setPwdError(err.response?.data?.message || 'Mevcut şifreniz hatalı veya geçersiz.');
        } finally {
            setPwdLoading(false);
        }
    };

    // Fjerner det valgte element.
    const handleDeleteAccount = async () => {
        setDeleteLoading(true);
        try {
            await userService.deleteMyAccount();
            setIsDeleteConfirmOpen(false);
            onClose();
            onLogout();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Hesap silinirken bir hata oluştu.');
        } finally {
            setDeleteLoading(false);
        }
    };

    const displayUsername = profileData?.username || currentUser?.username || 'trader';

    return (
        <div
            role="dialog"
            aria-modal="true"
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-md rounded-xl shadow-2xl border flex flex-col overflow-hidden transition-colors ${isDark ? 'bg-[#131722] border-[#2a2e39] text-gray-200' : 'bg-white border-gray-200 text-gray-800'
                    }`}
            >
                <div className={`flex items-center justify-between px-5 py-3.5 border-b ${isDark ? 'border-[#2a2e39] bg-[#1e222d]' : 'border-gray-100 bg-gray-50'
                    }`}>
                    <div className="flex items-center space-x-2 font-bold text-sm">
                        <User className="w-4 h-4 text-blue-500" />
                        <span>{t('profile.title', 'Kullanıcı Profili & Güvenlik')}</span>
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
                        onClick={() => { setProfileTab('info'); setProfileError(null); setProfileSuccess(null); }}
                        className={`flex-1 py-2.5 text-center transition-colors border-b-2 flex items-center justify-center space-x-1.5 ${profileTab === 'info'
                                ? 'border-blue-500 text-blue-500 bg-blue-500/5'
                                : 'border-transparent text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        <User className="w-3.5 h-3.5" />
                        <span>{t('profile.personalInfo', 'Kişisel Bilgiler')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setProfileTab('password'); setPwdError(null); setPwdSuccess(null); }}
                        className={`flex-1 py-2.5 text-center transition-colors border-b-2 flex items-center justify-center space-x-1.5 ${profileTab === 'password'
                                ? 'border-blue-500 text-blue-500 bg-blue-500/5'
                                : 'border-transparent text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>{t('profile.security', 'Şifre & Güvenlik')}</span>
                    </button>
                </div>

                {/* Indhold */}
                <div className="p-5 max-h-[460px] overflow-y-auto">
                    {fetchingProfile ? (
                        <div className="py-12 flex flex-col items-center justify-center space-y-2 text-gray-400">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                            <span className="text-xs">{t('profile.loading')}</span>
                        </div>
                    ) : profileTab === 'info' ? (
                        <div className="space-y-5">
                            <form onSubmit={handleProfileUpdateSubmit} className="space-y-4 text-xs">
                                {/* Titelkort */}
                                <div className="flex items-center space-x-3.5 pb-3 border-b border-gray-500/10">
                                    <div className="w-12 h-12 rounded-full bg-blue-600/20 text-blue-400 font-extrabold text-lg flex items-center justify-center border border-blue-500/30">
                                        {(profileFormular.firstName || currentUser?.firstName || displayUsername)[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm">
                                            {profileFormular.firstName || currentUser?.firstName || 'User'} {profileFormular.lastName || currentUser?.lastName || ''}
                                        </h3>
                                        <p className="text-gray-400 font-mono text-[11px]">@{displayUsername}</p>
                                        <div className="inline-flex items-center space-x-1 mt-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold">
                                            <CheckCircle className="w-2.5 h-2.5" />
                                            <span>{profileData?.role || currentUser?.role || 'TRADER'}</span>
                                        </div>
                                    </div>
                                </div>

                                {profileError && (
                                    <div className="p-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg flex items-center space-x-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{profileError}</span>
                                    </div>
                                )}

                                {profileSuccess && (
                                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg flex items-center space-x-2">
                                        <CheckCircle className="w-4 h-4 shrink-0" />
                                        <span>{profileSuccess}</span>
                                    </div>
                                )}

                                {/* Formularfelter */}
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-gray-400 font-medium">{t('auth.username', 'Kullanıcı Adı')}</label>
                                            <span className="text-[10px] text-gray-500 flex items-center space-x-1">
                                                <Lock className="w-2.5 h-2.5" />
                                                <span>{t('profile.immutable')}</span>
                                            </span>
                                        </div>
                                        <input
                                            type="text"
                                            disabled
                                            value={`@${displayUsername}`}
                                            className={`w-full p-2.5 rounded-lg border outline-none cursor-not-allowed font-medium ${isDark
                                                    ? 'bg-[#151921] border-gray-800 text-gray-400'
                                                    : 'bg-gray-100 border-gray-300 text-gray-500'
                                                }`}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-gray-400 font-medium mb-1">{t('profile.firstName', 'Ad')}</label>
                                            <input
                                                type="text"
                                                required
                                                value={profileFormular.firstName}
                                                onChange={(e) => setProfileFormular({ ...profileFormular, firstName: e.target.value })}
                                                className={`w-full p-2.5 rounded-lg border outline-none focus:border-blue-500 ${isDark ? 'bg-[#1e222d] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                                                    }`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-400 font-medium mb-1">{t('profile.lastName', 'Soyad')}</label>
                                            <input
                                                type="text"
                                                required
                                                value={profileFormular.lastName}
                                                onChange={(e) => setProfileFormular({ ...profileFormular, lastName: e.target.value })}
                                                className={`w-full p-2.5 rounded-lg border outline-none focus:border-blue-500 ${isDark ? 'bg-[#1e222d] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                                                    }`}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-gray-400 font-medium mb-1">{t('profile.email', 'E-Posta')}</label>
                                        <input
                                            type="email"
                                            required
                                            value={profileFormular.email}
                                            onChange={(e) => setProfileFormular({ ...profileFormular, email: e.target.value })}
                                            className={`w-full p-2.5 rounded-lg border outline-none focus:border-blue-500 ${isDark ? 'bg-[#1e222d] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                                                }`}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={profileLoading}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 shadow-sm"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    <span>{profileLoading ? t('profile.updating', 'Güncelleniyor...') : t('profile.save', 'Bilgileri Güncelle')}</span>
                                </button>
                            </form>

                            {/* Kritisk område / slet konto */}
                            <div className={`pt-4 border-t ${isDark ? 'border-red-500/20' : 'border-red-200'}`}>
                                <div className="flex items-center space-x-1.5 text-red-400 font-bold text-xs mb-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>{t('profile.dangerZone', 'Tehlikeli Bölge')}</span>
                                </div>
                                <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
                                    {t('profile.deleteAccountDesc', 'Hesabınızı sildiğinizde oturumunuz hemen kapatılır. 30 gün içinde tekrar giriş yaparsanız hesabınız otomatik olarak kurtarılır.')}
                                </p>

                                {!isDeleteConfirmOpen ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsDeleteConfirmOpen(true)}
                                        className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1.5 text-xs"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>{t('profile.deleteAccount', 'Hesabımı Sil')}</span>
                                    </button>
                                ) : (
                                    <div className={`p-3 rounded-lg border space-y-2.5 ${isDark ? 'bg-red-500/10 border-red-500/40 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                        <p className="text-xs font-semibold">{t('profile.deleteConfirmTitle', 'Hesabınızı silmek istediğinize emin misiniz?')}</p>
                                        <p className="text-[11px] text-gray-400">{t('profile.deleteConfirmNotice', 'Hesabınız askıya alınacaktır. 30 gün boyunca giriş yapmazsanız verileriniz kalıcı olarak silinir.')}</p>
                                        <div className="flex items-center space-x-2 pt-1">
                                            <button
                                                type="button"
                                                disabled={deleteLoading}
                                                onClick={handleDeleteAccount}
                                                className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-xs transition-colors disabled:opacity-50"
                                            >
                                                {deleteLoading ? t('profile.deleting', 'İşleniyor...') : t('profile.confirmDeleteBtn', 'Evet, Hesabımı Kapat')}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={deleteLoading}
                                                onClick={() => setIsDeleteConfirmOpen(false)}
                                                className="flex-1 py-1.5 bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 font-medium rounded text-xs transition-colors"
                                            >
                                                {t('profile.cancel', 'Vazgeç')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handlePasswordChangeSubmit} className="space-y-3.5 text-xs">
                            {pwdError && (
                                <div className="p-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg flex items-center space-x-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{pwdError}</span>
                                </div>
                            )}

                            {pwdSuccess && (
                                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg flex items-center space-x-2">
                                    <CheckCircle className="w-4 h-4 shrink-0" />
                                    <span>{pwdSuccess}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-gray-400 font-medium mb-1">
                                    {t('profile.currentPassword', 'Mevcut Şifre')}
                                </label>
                                <div className="relative">
                                    <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-500" />
                                    <input
                                        type="password"
                                        required
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className={`w-full pl-8 pr-3 py-2 rounded-lg border outline-none focus:border-blue-500 ${isDark ? 'bg-[#1e222d] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                                            }`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-400 font-medium mb-1">
                                    {t('profile.newPassword', 'Yeni Şifre')}
                                </label>
                                <div className="relative">
                                    <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-500" />
                                    <input
                                        type="password"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className={`w-full pl-8 pr-3 py-2 rounded-lg border outline-none focus:border-blue-500 ${isDark ? 'bg-[#1e222d] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                                            }`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-400 font-medium mb-1">
                                    {t('profile.confirmPassword', 'Yeni Şifre (Tekrar)')}
                                </label>
                                <div className="relative">
                                    <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-500" />
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className={`w-full pl-8 pr-3 py-2 rounded-lg border outline-none focus:border-blue-500 ${isDark ? 'bg-[#1e222d] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                                            }`}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={pwdLoading}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 mt-2 shadow-sm"
                            >
                                {pwdLoading ? t('profile.updating', 'Güncelleniyor...') : t('profile.changePassword', 'Şifreyi Güncelle')}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useResources } from '../context/ResourceContext';
import { isAdminRole, getRoleArabicLabel } from '../types';
import {
  Sparkles,
  BookOpen,
  GraduationCap,
  Layers,
  PlusCircle,
  FolderHeart,
  Bookmark,
  ClipboardCheck,
  ShieldCheck,
  Menu,
  X,
  LogIn,
  LogOut,
  ChevronDown,
  User,
  FlaskConical,
  Info,
  Bell,
  Settings,
  Search,
  Compass
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onOpenInsertModal: () => void;
  onOpenAuthModal: () => void;
  onOpenAboutModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigate,
  onOpenInsertModal,
  onOpenAuthModal,
  onOpenAboutModal
}) => {
  const { user, isAuthenticated, role, logout, switchRole } = useAuth();
  const { resources, favorites, notifications } = useResources();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  // Count unread notifications
  const unreadNotifsCount = notifications.filter(n => !n.isRead).length;

  // Count pending items for review
  const pendingReviewCount = resources.filter(
    r => r.status === 'pending' || r.status === 'submitted' || r.status === 'under_review'
  ).length;

  const handleNav = (tab: string) => {
    onNavigate(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Top School & Credit Sub-Bar */}
      <div className="bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600 text-white py-1 px-3 sm:px-4 text-[11px] sm:text-xs font-medium">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 truncate">
            <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-300 animate-pulse shrink-0"></span>
            <span className="truncate">مدرسة محلاح للبنات (5–12)</span>
            <span className="text-sky-200 hidden md:inline">|</span>
            <span className="text-sky-100 hidden md:inline truncate">منصة الموارد العلمية التفاعلية</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              onClick={onOpenAboutModal}
              className="text-white hover:text-cyan-200 transition-colors flex items-center gap-1 cursor-pointer text-[11px]"
            >
              <Info className="w-3 h-3" />
              <span className="hidden sm:inline">عن المنصة</span>
            </button>
            <span className="bg-white/15 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold text-white whitespace-nowrap">
              تصميم: جواهر المعمرية
            </span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-2">
          
          {/* Brand Logo & Name */}
          <div
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none shrink-0"
            onClick={() => handleNav('home')}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-cyan-500 via-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group hover:scale-105 transition-transform shrink-0">
              <FlaskConical className="w-5 h-5 sm:w-5.5 sm:h-5.5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base lg:text-lg font-black text-slate-900 tracking-tight whitespace-nowrap">
                  مكتبة العلوم الرقمية
                </span>
                <span className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                  <Sparkles className="w-2.5 h-2.5 ml-1 text-cyan-600" /> عمان
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1">
            <button
              onClick={() => handleNav('home')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                currentTab === 'home'
                  ? 'bg-sky-50 text-sky-600 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              الرئيسية
            </button>

            <button
              onClick={() => handleNav('library')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                currentTab === 'library'
                  ? 'bg-sky-50 text-sky-600 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>المكتبة</span>
            </button>

            <button
              onClick={() => handleNav('curriculum')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                currentTab === 'curriculum'
                  ? 'bg-sky-50 text-sky-600 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Compass className="w-4 h-4 text-cyan-600" />
              <span>مستكشف المنهج</span>
            </button>

            <button
              onClick={() => handleNav('grades')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                currentTab === 'grades'
                  ? 'bg-sky-50 text-sky-600 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>الصفوف</span>
            </button>

            <button
              onClick={() => handleNav('subjects')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                currentTab === 'subjects'
                  ? 'bg-sky-50 text-sky-600 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>المواد</span>
            </button>

            <button
              onClick={() => handleNav('my-resources')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                currentTab === 'my-resources'
                  ? 'bg-sky-50 text-sky-600 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FolderHeart className="w-4 h-4" />
              <span>مواردي</span>
            </button>

            <button
              onClick={() => handleNav('favorites')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                currentTab === 'favorites'
                  ? 'bg-sky-50 text-sky-600 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>المفضلة</span>
              {favorites.length > 0 && (
                <span className="bg-rose-100 text-rose-600 text-xs px-1.5 py-0.2 rounded-full font-bold">
                  {favorites.length}
                </span>
              )}
            </button>

            {/* Role-Protected Nav: Reviewer & Admin */}
            {(role === 'reviewer' || isAdminRole(role)) && (
              <button
                onClick={() => handleNav('review')}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 relative ${
                  currentTab === 'review'
                    ? 'bg-amber-50 text-amber-700 font-bold'
                    : 'text-amber-800 hover:bg-amber-50/70'
                }`}
              >
                <ClipboardCheck className="w-4 h-4 text-amber-600" />
                <span>مراجعة الموارد</span>
                {pendingReviewCount > 0 && (
                  <span className="bg-amber-500 text-white text-[11px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
                    {pendingReviewCount}
                  </span>
                )}
              </button>
            )}

            {/* Role-Protected Nav: Administrator (Admin & Settings) */}
            {isAdminRole(role) && (
              <>
                <button
                  onClick={() => handleNav('admin')}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                    currentTab === 'admin'
                      ? 'bg-purple-50 text-purple-700 font-bold'
                      : 'text-purple-700 hover:bg-purple-50/70'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>الإدارة</span>
                </button>

                <button
                  onClick={() => handleNav('settings')}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                    currentTab === 'settings'
                      ? 'bg-purple-50 text-purple-700 font-bold'
                      : 'text-purple-700 hover:bg-purple-50/70'
                  }`}
                >
                  <Settings className="w-4 h-4 text-purple-600" />
                  <span>الإعدادات</span>
                </button>
              </>
            )}
          </nav>

          {/* Right Action Controls: Search, Insert (sm+), Notifications, User, Mobile Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Search Button */}
            <button
              onClick={() => handleNav('library')}
              title="البحث في المكتبة"
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-sky-600 transition-colors cursor-pointer shrink-0"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Primary Insert Resource Button (Visible on sm screens and larger; available in mobile drawer on phones) */}
            <button
              onClick={onOpenInsertModal}
              className="hidden sm:inline-flex bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-600 hover:to-cyan-700 text-white px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold items-center gap-1.5 shadow-xs shadow-cyan-500/25 transition-all hover:shadow-md cursor-pointer shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إدراج مورد</span>
            </button>

            {/* Auth / Profile Area */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Notification Bell */}
                <button
                  onClick={() => handleNav('my-resources')}
                  title="الإشعارات والتنبيهات"
                  className="relative p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer shrink-0"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {unreadNotifsCount}
                    </span>
                  )}
                </button>

                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-1 sm:gap-2 p-1 sm:p-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer shrink-0"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold shrink-0 border border-sky-200/80">
                      <User className="w-4 h-4 text-sky-600" />
                    </div>
                    <div className="hidden md:block text-right">
                      <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                        {user.displayName}
                      </p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full inline-block ${
                        isAdminRole(role)
                          ? 'bg-purple-100 text-purple-700'
                          : role === 'reviewer'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-sky-100 text-sky-700'
                      }`}>
                        {getRoleArabicLabel(role)}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-bold text-slate-900 truncate">{user.displayName}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        <p className="text-[11px] text-cyan-600 mt-1 font-medium truncate">{user.school}</p>
                      </div>

                      {/* Role Switcher for instant testing */}
                      <div className="px-3 py-2 bg-slate-50 mx-2 my-2 rounded-xl border border-slate-200/70">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-700">الصلاحية:</span>
                          <button
                            onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
                            className="text-[11px] text-sky-600 hover:underline font-semibold cursor-pointer"
                          >
                            تبديل الدور
                          </button>
                        </div>
                        
                        {roleSwitcherOpen && (
                          <div className="flex flex-col gap-1 mt-2">
                            <button
                              onClick={() => { switchRole('user'); setUserDropdownOpen(false); }}
                              className={`text-xs px-2.5 py-1.5 rounded-lg text-right font-medium transition-colors ${
                                role === 'user' ? 'bg-sky-500 text-white' : 'hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              👤 المستخدم (User)
                            </button>
                            <button
                              onClick={() => { switchRole('reviewer'); setUserDropdownOpen(false); }}
                              className={`text-xs px-2.5 py-1.5 rounded-lg text-right font-medium transition-colors ${
                                role === 'reviewer' ? 'bg-amber-500 text-white' : 'hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              🔍 المراجع (Reviewer)
                            </button>
                            <button
                              onClick={() => { switchRole('administrator'); setUserDropdownOpen(false); }}
                              className={`text-xs px-2.5 py-1.5 rounded-lg text-right font-medium transition-colors ${
                                isAdminRole(role) ? 'bg-purple-600 text-white' : 'hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              ⚙️ المدير (Administrator)
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="px-2 py-1">
                        <button
                          onClick={() => { handleNav('my-resources'); setUserDropdownOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl text-right cursor-pointer"
                        >
                          <User className="w-4 h-4 text-slate-400" />
                          <span>لوحتي ومواردي</span>
                        </button>

                        {isAdminRole(role) && (
                          <>
                            <button
                              onClick={() => { handleNav('admin'); setUserDropdownOpen(false); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 rounded-xl text-right cursor-pointer"
                            >
                              <ShieldCheck className="w-4 h-4 text-purple-500" />
                              <span>لوحة الإدارة</span>
                            </button>

                            <button
                              onClick={() => { handleNav('settings'); setUserDropdownOpen(false); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 rounded-xl text-right cursor-pointer"
                            >
                              <Settings className="w-4 h-4 text-purple-500" />
                              <span>إعدادات النظام</span>
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => { logout(); setUserDropdownOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl text-right mt-1 border-t border-slate-100 cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>تسجيل الخروج</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer shrink-0"
              >
                <LogIn className="w-4 h-4 text-slate-500" />
                <span className="hidden xs:inline">تسجيل الدخول</span>
              </button>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              aria-label="فتح القائمة"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-white border-t border-slate-200 px-4 pt-3 pb-6 shadow-xl animate-in slide-in-from-top-4 max-h-[85vh] overflow-y-auto">
          {/* User Profile Summary in Mobile Menu */}
          {isAuthenticated && user ? (
            <div className="mb-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold shrink-0 border border-sky-200/80">
                  <User className="w-5 h-5 text-sky-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{user.displayName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user.school || 'مدرسة محلاح للبنات (5–12)'}</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                isAdminRole(role)
                  ? 'bg-purple-100 text-purple-700'
                  : role === 'reviewer'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-sky-100 text-sky-700'
              }`}>
                {getRoleArabicLabel(role)}
              </span>
            </div>
          ) : null}

          {/* Quick Insert Resource Action for Mobile */}
          <div className="mb-3">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenInsertModal();
              }}
              className="w-full bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-600 hover:to-cyan-700 text-white p-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm shadow-cyan-500/25 cursor-pointer"
            >
              <PlusCircle className="w-5 h-5" />
              <span>إدراج مورد علمي جديد</span>
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <button
              onClick={() => handleNav('home')}
              className={`p-3 rounded-xl text-right font-bold text-sm ${
                currentTab === 'home' ? 'bg-sky-50 text-sky-600' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              الرئيسية
            </button>
            <button
              onClick={() => handleNav('library')}
              className={`p-3 rounded-xl text-right font-bold text-sm flex items-center gap-2 ${
                currentTab === 'library' ? 'bg-sky-50 text-sky-600' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>المكتبة الرقمية</span>
            </button>
            <button
              onClick={() => handleNav('curriculum')}
              className={`p-3 rounded-xl text-right font-bold text-sm flex items-center gap-2 ${
                currentTab === 'curriculum' ? 'bg-sky-50 text-sky-600' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Compass className="w-4 h-4 text-cyan-600" />
              <span>مستكشف المنهج</span>
            </button>
            <button
              onClick={() => handleNav('grades')}
              className={`p-3 rounded-xl text-right font-bold text-sm flex items-center gap-2 ${
                currentTab === 'grades' ? 'bg-sky-50 text-sky-600' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>الصفوف الدراسية</span>
            </button>
            <button
              onClick={() => handleNav('subjects')}
              className={`p-3 rounded-xl text-right font-bold text-sm flex items-center gap-2 ${
                currentTab === 'subjects' ? 'bg-sky-50 text-sky-600' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>المواد العلمية</span>
            </button>
            <button
              onClick={() => handleNav('my-resources')}
              className={`p-3 rounded-xl text-right font-bold text-sm flex items-center gap-2 ${
                currentTab === 'my-resources' ? 'bg-sky-50 text-sky-600' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FolderHeart className="w-4 h-4" />
              <span>مواردي العلمية</span>
            </button>
            <button
              onClick={() => handleNav('favorites')}
              className={`p-3 rounded-xl text-right font-bold text-sm flex items-center justify-between ${
                currentTab === 'favorites' ? 'bg-sky-50 text-sky-600' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <Bookmark className="w-4 h-4" />
                <span>المفضلة</span>
              </span>
              {favorites.length > 0 && (
                <span className="bg-rose-100 text-rose-600 text-xs px-2 py-0.5 rounded-full font-bold">
                  {favorites.length}
                </span>
              )}
            </button>

            {(role === 'reviewer' || isAdminRole(role)) && (
              <button
                onClick={() => handleNav('review')}
                className={`p-3 rounded-xl text-right font-bold text-sm flex items-center justify-between ${
                  currentTab === 'review' ? 'bg-amber-50 text-amber-700' : 'text-amber-800 hover:bg-amber-50/70'
                }`}
              >
                <span className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4" />
                  <span>مراجعة الموارد</span>
                </span>
                {pendingReviewCount > 0 && (
                  <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    {pendingReviewCount}
                  </span>
                )}
              </button>
            )}

            {isAdminRole(role) && (
              <>
                <button
                  onClick={() => handleNav('admin')}
                  className={`p-3 rounded-xl text-right font-bold text-sm flex items-center gap-2 ${
                    currentTab === 'admin' ? 'bg-purple-50 text-purple-700' : 'text-purple-700 hover:bg-purple-50'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>لوحة الإدارة</span>
                </button>

                <button
                  onClick={() => handleNav('settings')}
                  className={`p-3 rounded-xl text-right font-bold text-sm flex items-center gap-2 ${
                    currentTab === 'settings' ? 'bg-purple-50 text-purple-700' : 'text-purple-700 hover:bg-purple-50'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>إعدادات النظام</span>
                </button>
              </>
            )}

            {/* Mobile Auth Action */}
            {isAuthenticated ? (
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="p-3 rounded-xl text-right font-bold text-sm flex items-center gap-2 text-rose-600 hover:bg-rose-50 mt-2 border-t border-slate-100 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onOpenAuthModal();
                  setMobileMenuOpen(false);
                }}
                className="p-3 rounded-xl text-right font-bold text-sm flex items-center gap-2 text-sky-700 bg-sky-50 hover:bg-sky-100 mt-2 border border-sky-100 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول إلى حسابك</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

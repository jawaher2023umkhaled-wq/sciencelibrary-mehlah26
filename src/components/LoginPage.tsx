import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useResources } from '../context/ResourceContext';
import {
  LogIn,
  UserPlus,
  Sparkles,
  Lock,
  Mail,
  User,
  GraduationCap,
  FlaskConical,
  AlertCircle,
  CheckCircle2,
  School,
  ArrowRight
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login, register, googleSignIn, resetPassword } = useAuth();
  const { showToast } = useResources();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [school, setSchool] = useState('مدرسة محلاح للبنات (5–12)');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim()) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'forgot_password') {
        await resetPassword(email);
        showToast('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.', 'success');
        setMode('login');
      } else if (mode === 'register') {
        if (!displayName.trim()) {
          setErrorMsg('يرجى إدخال الاسم الكامل.');
          setIsLoading(false);
          return;
        }
        if (!password || password.length < 6) {
          setErrorMsg('يجب أن تتكون كلمة المرور من 6 أحرف أو أرقام على الأقل.');
          setIsLoading(false);
          return;
        }
        const res = await register(displayName, email, password, school);
        if (res.error) {
          setErrorMsg(res.error);
          return;
        }
        showToast('تم إنشاء الحساب بنجاح وتم تسجيل دخولك عبر Supabase.', 'success');
        onLoginSuccess();
      } else {
        if (!password) {
          setErrorMsg('يرجى إدخال كلمة المرور.');
          setIsLoading(false);
          return;
        }
        const res = await login(email, password, undefined, displayName);
        if (res.error) {
          setErrorMsg(res.error);
          return;
        }
        showToast('تم تسجيل الدخول بنجاح.', 'success');
        onLoginSuccess();
      }
    } catch (err) {
      setErrorMsg('حدث خطأ أثناء الاتصال بخدمة المصادقة. يرجى التحقق من البيانات.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await googleSignIn();
      showToast('تم توجيه تسجيل الدخول بحساب Google عبر Supabase.', 'success');
    } catch (e) {
      showToast('تعذر تسجيل الدخول بحساب Google. يرجى التحقق من الاتصال.', 'error');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/70">
      <div className="max-w-md w-full space-y-6">
        
        {/* Branding & School Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-sky-500 via-cyan-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-sky-500/25">
            <FlaskConical className="w-8 h-8 animate-pulse" />
          </div>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white shadow-xs border border-sky-200/80 text-sky-800 text-xs font-bold">
            <GraduationCap className="w-3.5 h-3.5 text-sky-600" />
            <span>مدرسة محلاح للبنات (5–12)</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            مكتبة العلوم الرقمية
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            بوابة الموارد العلمية التفاعلية والتجارب المخبرية المعتمدة
          </p>
        </div>

        {/* Security / Route Protection Notice */}
        <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-amber-900 text-xs flex items-center gap-2.5 shadow-2xs">
          <Lock className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="leading-relaxed">
            <span className="font-bold">منطقة محمية: </span>
            يتطلب الوصول إلى موارد المنصة ولوحات الإدارة تسجيل دخول نشط ومعتمد عبر Supabase.
          </div>
        </div>

        {/* Auth Form Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl shadow-slate-200/50 relative text-right">
          
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              {mode === 'register' ? 'إنشاء حساب جديد (Supabase)' : mode === 'forgot_password' ? 'استعادة كلمة المرور' : 'تسجيل الدخول إلى حسابك'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {mode === 'register' 
                ? 'سجل بياناتك للانضمام إلى منصة الموارد العلمية' 
                : mode === 'forgot_password' 
                ? 'أدخل بريدك الإلكتروني لإرسال تعليمات الاستعادة' 
                : 'أدخل بريدك الإلكتروني وكلمة المرور للمتابعة'}
            </p>
          </div>

          {/* Google Sign-in */}
          {mode !== 'forgot_password' && (
            <div className="mb-5">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer shadow-2xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>المتابعة باستخدام حساب Google</span>
              </button>

              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <span className="relative bg-white px-3 text-[11px] text-slate-400 font-semibold">أو بالبريد الإلكتروني</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="مثال: نورة المعمرية"
                      className="w-full pr-10 pl-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المؤسسة / المدرسة</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      placeholder="مدرسة محلاح للبنات (5–12)"
                      className="w-full pr-10 pl-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <School className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@muhlah.edu.om"
                  className="w-full pr-10 pl-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>
            </div>

            {mode !== 'forgot_password' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">كلمة المرور</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot_password')}
                      className="text-[11px] text-sky-600 hover:underline font-semibold cursor-pointer"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-600 to-teal-600 hover:from-sky-600 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-sky-500/20 transition-all cursor-pointer mt-2 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>جارٍ التحقق...</span>
              ) : mode === 'register' ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>إنشاء الحساب عبر Supabase</span>
                </>
              ) : mode === 'forgot_password' ? (
                <span>إرسال رابط الاستعادة</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>تسجيل الدخول للمنصة</span>
                </>
              )}
            </button>
          </form>

          {/* Mode Switchers */}
          <div className="mt-5 text-center text-xs text-slate-500 space-y-1">
            {mode === 'forgot_password' ? (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-sky-600 font-bold hover:underline cursor-pointer"
              >
                العودة إلى تسجيل الدخول
              </button>
            ) : mode === 'register' ? (
              <p>
                لديك حساب بالفعل؟{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-sky-600 font-bold hover:underline cursor-pointer"
                >
                  تسجيل الدخول
                </button>
              </p>
            ) : (
              <p>
                ليس لديك حساب؟{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-sky-600 font-bold hover:underline cursor-pointer"
                >
                  إنشاء حساب جديد
                </button>
              </p>
            )}
          </div>
        </div>

        {/* School Footer Note */}
        <div className="text-center text-xs text-slate-400">
          مدرسة محلاح للبنات (5–12) — تصميم وإشراف: جواهر المعمرية
        </div>
      </div>
    </div>
  );
};

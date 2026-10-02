import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useResources } from '../context/ResourceContext';
import {
  X,
  LogIn,
  UserPlus,
  Sparkles,
  Lock,
  Mail,
  User,
  KeyRound,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, googleSignIn, resetPassword } = useAuth();
  const { showToast } = useResources();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

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
          setErrorMsg('يرجى إدخال الاسم بالكامل.');
          setIsLoading(false);
          return;
        }
        const res = await register(displayName, email, password);
        if (res.error) {
          setErrorMsg(res.error);
          return;
        }
        showToast('تم إنشاء الحساب بنجاح وتم تسجيل دخولك.', 'success');
        onClose();
      } else {
        const res = await login(email, password, undefined, displayName);
        if (res.error) {
          setErrorMsg(res.error);
          return;
        }
        showToast('تم تسجيل الدخول بنجاح.', 'success');
        onClose();
      }
    } catch (err) {
      setErrorMsg('حدث خطأ أثناء تنفيذ العملية. يرجى التحقق من البيانات والمحاولة مجدداً.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await googleSignIn();
      showToast('تم توجيه تسجيل الدخول بحساب Google بنجاح.', 'success');
      onClose();
    } catch (e) {
      showToast('تعذر تسجيل الدخول بحساب Google. يرجى التحقق من الاتصال.', 'error');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl relative text-right animate-in zoom-in-95">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute left-5 top-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-sky-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            {mode === 'register' ? 'إنشاء حساب جديد' : mode === 'forgot_password' ? 'استعادة كلمة المرور' : 'تسجيل الدخول للمنصة (Supabase)'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            مكتبة العلوم الرقمية - مدرسة محلاح للبنات (5–12)
          </p>
        </div>

        {/* Google Sign-in Button */}
        {mode !== 'forgot_password' && (
          <div className="mb-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2.5 transition-colors cursor-pointer shadow-2xs"
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
              <span>تسجيل الدخول بحساب Google</span>
            </button>

            <div className="relative my-4 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <span className="relative bg-white px-3 text-[11px] text-slate-400 font-semibold">أو تسجيل الدخول اليدوي بالبريد وكلمة المرور</span>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Standard Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
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
            className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-600 hover:to-cyan-700 text-white font-bold text-sm shadow-md shadow-sky-500/20 transition-all cursor-pointer mt-2"
          >
            {isLoading
              ? 'جارٍ التنفيذ...'
              : mode === 'register'
              ? 'إنشاء الحساب'
              : mode === 'forgot_password'
              ? 'إرسال رابط الاستعادة'
              : 'تسجيل الدخول'}
          </button>
        </form>

        {/* Switch Mode Toggle */}
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
    </div>
  );
};

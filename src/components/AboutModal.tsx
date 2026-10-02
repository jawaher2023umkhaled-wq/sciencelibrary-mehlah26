import React from 'react';
import {
  X,
  FlaskConical,
  Sparkles,
  School,
  Heart,
  Award,
  Layers,
  GraduationCap
} from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-slate-200 shadow-2xl relative text-right animate-in zoom-in-95">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute left-5 top-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Icon */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-sky-500 via-cyan-500 to-indigo-600 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-sky-500/20">
            <FlaskConical className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            مكتبة العلوم الرقمية
          </h2>
          <p className="text-sm font-bold text-sky-600 mt-1">
            مدرسة محلاح للبنات (5–12)
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-amber-800 mt-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>تصميم: جواهر المعمرية</span>
          </div>
        </div>

        {/* Official Description */}
        <div className="p-4 bg-sky-50/60 border border-sky-100 rounded-2xl mb-6 text-sm text-slate-700 leading-relaxed">
          "مكتبة العلوم الرقمية هي منصة تعليمية تهدف إلى تنظيم وتجميع الموارد العلمية الرقمية والتفاعلية في بيئة سهلة الاستخدام، بما يدعم التعلم الرقمي ويتيح الوصول إلى الأنشطة والمحاكاة والدروس والموارد العلمية بطريقة منظمة."
        </div>

        {/* Features Highlights */}
        <div className="space-y-3 mb-6 text-xs text-slate-600">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50">
            <GraduationCap className="w-5 h-5 text-sky-600 shrink-0" />
            <span>تغطية متكاملة لمناهج العلوم والفيزياء والكيمياء والأحياء والعلوم البيئية (5–12).</span>
          </div>
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50">
            <Layers className="w-5 h-5 text-purple-600 shrink-0" />
            <span>مختبر افتراضي ومحاكيات HTML آمنة ومعزولة تماماً (Sandboxed).</span>
          </div>
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50">
            <Award className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>نظام مراجعة وتدقيق معتمد لضمان الجودة الأكاديمية للمحتوى الرقمي.</span>
          </div>
        </div>

        {/* Footer Note */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>سلطنة عمان - مدرسة محلاح للبنات</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold cursor-pointer transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

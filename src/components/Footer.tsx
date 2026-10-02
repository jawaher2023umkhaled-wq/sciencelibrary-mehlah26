import React from 'react';
import { FlaskConical, Heart, Sparkles } from 'lucide-react';

interface FooterProps {
  onNavigate: (tab: string) => void;
  onOpenAbout: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenAbout }) => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 relative overflow-hidden">
      {/* Subtle scientific ambient gradients */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Col 1: Platform & School Brand */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-sky-600 flex items-center justify-center text-white shadow-lg">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-wide">مكتبة العلوم الرقمية</h3>
                <p className="text-xs text-cyan-400 font-medium">مدرسة محلاح للبنات (5–12)</p>
              </div>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed max-w-lg">
              منصة تعليمية رقمية متخصصة تهدف إلى تنظيم وتجميع الموارد العلمية والتفاعلية في بيئة سهلة الاستخدام ومحفزة، بما يدعم تدريس العلوم والفيزياء والكيمياء والأحياء والعلوم البيئية وفق المناهج العمانية الحديثة.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>تصميم: جواهر المعمرية</span>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-r-2 border-cyan-400 pr-2">
              روابط سريعة
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('home')}
                  className="hover:text-cyan-400 transition-colors text-right cursor-pointer"
                >
                  الرئيسية
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('library')}
                  className="hover:text-cyan-400 transition-colors text-right cursor-pointer"
                >
                  المكتبة الرقمية
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('grades')}
                  className="hover:text-cyan-400 transition-colors text-right cursor-pointer"
                >
                  الصفوف الدراسية (5–12)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('subjects')}
                  className="hover:text-cyan-400 transition-colors text-right cursor-pointer"
                >
                  المواد العلمية
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Policies & About */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-r-2 border-purple-400 pr-2">
              المنصة والسياسات
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={onOpenAbout}
                  className="hover:text-cyan-400 transition-colors text-right cursor-pointer"
                >
                  عن المنصة
                </button>
              </li>
              <li>
                <span className="text-slate-400 hover:text-slate-200 cursor-pointer transition-colors">
                  سياسة الاستخدام التعليمي
                </span>
              </li>
              <li>
                <span className="text-slate-400 hover:text-slate-200 cursor-pointer transition-colors">
                  الخصوصية وأمن البيانات
                </span>
              </li>
              <li>
                <span className="text-slate-400 hover:text-slate-200 cursor-pointer transition-colors">
                  دليل إدراج المحاكيات والموارد
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} مكتبة العلوم الرقمية - مدرسة محلاح للبنات (5–12). جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
            <span>صُنعت بشغف للتعليم المدرسي في سلطنة عمان</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
          </div>
        </div>
      </div>
    </footer>
  );
};

import React from 'react';
import { GRADES } from '../data/initialData';
import { useResources } from '../context/ResourceContext';
import { GraduationCap, ArrowLeft, Sparkles } from 'lucide-react';

interface GradeSectionProps {
  onSelectGrade: (gradeId: string) => void;
}

export const GradeSection: React.FC<GradeSectionProps> = ({ onSelectGrade }) => {
  const { resources } = useResources();

  // Calculate published resources per grade
  const getGradeCount = (gradeId: string) => {
    return resources.filter(r => r.gradeId === gradeId && r.status === 'published').length;
  };

  return (
    <section className="py-16 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-50 text-sky-700 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>المراحل الدراسية</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              استكشف حسب الصف
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              تنظيم شامل للمحتوى التعليمي من الصف الخامس الأساسي وحتى الثاني عشر
            </p>
          </div>

          <button
            onClick={() => onSelectGrade('')}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-sky-600 hover:text-sky-700 transition-colors self-start md:self-auto cursor-pointer"
          >
            <span>عرض جميع الصفوف</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Grade Cards Grid (8 grades) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {GRADES.map((grade) => {
            const count = getGradeCount(grade.id);

            return (
              <div
                key={grade.id}
                onClick={() => onSelectGrade(grade.id)}
                className="group relative bg-slate-50 hover:bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-sky-300 shadow-xs hover:shadow-xl hover:shadow-sky-500/10 transition-all duration-300 cursor-pointer transform hover:-translate-y-1.5 flex flex-col justify-between"
              >
                {/* Top Badge & Number */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-sky-500/20 group-hover:scale-110 transition-transform">
                    {grade.number}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                    {grade.stage}
                  </span>
                </div>

                {/* Grade Info */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                    {grade.name}
                  </h3>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200/60">
                    <span className="text-xs font-semibold text-slate-500">
                      {count} مورد متاح
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-colors">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

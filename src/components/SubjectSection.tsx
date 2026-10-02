import React from 'react';
import { SUBJECTS } from '../data/initialData';
import { useResources } from '../context/ResourceContext';
import { Atom, Dna, Zap, FlaskConical, Globe, Sparkles, ArrowLeft } from 'lucide-react';

interface SubjectSectionProps {
  onSelectSubject: (subjectId: string) => void;
}

export const SubjectSection: React.FC<SubjectSectionProps> = ({ onSelectSubject }) => {
  const { resources } = useResources();

  const getSubjectCount = (subjectId: string) => {
    return resources.filter(r => r.subjectId === subjectId && r.status === 'published').length;
  };

  const getIcon = (name: string) => {
    switch (name) {
      case 'Dna': return <Dna className="w-7 h-7" />;
      case 'Zap': return <Zap className="w-7 h-7" />;
      case 'FlaskConical': return <FlaskConical className="w-7 h-7" />;
      case 'Globe': return <Globe className="w-7 h-7" />;
      default: return <Atom className="w-7 h-7" />;
    }
  };

  return (
    <section className="py-16 bg-slate-50/70 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-50 text-teal-700 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>المواد التخصصية</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              استكشف حسب المادة
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              تصفح العلوم العامة والأحياء والفيزياء والكيمياء والعلوم البيئية
            </p>
          </div>

          <button
            onClick={() => onSelectSubject('')}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-sky-600 hover:text-sky-700 transition-colors self-start md:self-auto cursor-pointer"
          >
            <span>عرض كل المواد</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Subjects Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {SUBJECTS.map((subject) => {
            const count = getSubjectCount(subject.id);

            return (
              <div
                key={subject.id}
                onClick={() => onSelectSubject(subject.id)}
                className="group bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-transparent hover:shadow-xl hover:shadow-cyan-900/10 transition-all duration-300 cursor-pointer transform hover:-translate-y-1.5 flex flex-col justify-between"
              >
                <div>
                  {/* Icon with gradient badge */}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${subject.color} text-white flex items-center justify-center shadow-md mb-5 group-hover:scale-110 transition-transform`}>
                    {getIcon(subject.iconName)}
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-cyan-600 transition-colors">
                    {subject.name}
                  </h3>

                  <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-2">
                    {subject.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">
                    {count} مورد علمي
                  </span>
                  <span className="text-xs text-cyan-600 font-semibold group-hover:translate-x-[-4px] transition-transform">
                    استعراض ←
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

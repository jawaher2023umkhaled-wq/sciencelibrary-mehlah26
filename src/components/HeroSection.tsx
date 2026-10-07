import React, { useState, useMemo } from 'react';
import {
  Compass,
  PlusCircle,
  Search,
  Sparkles,
  FlaskConical,
  Cpu,
  GraduationCap,
  Layers,
  Atom,
  Dna,
  X,
  Filter
} from 'lucide-react';
import { GRADES, SUBJECTS } from '../data/initialData';
import { useResources } from '../context/ResourceContext';

interface HeroSectionProps {
  onExplore: () => void;
  onInsert: () => void;
  onSearch: (query: string) => void;
  onSelectGrade?: (gradeId: string) => void;
  onSelectSubject?: (subjectId: string) => void;
  publishedCount: number;
  totalCount?: number;
  interactiveCount?: number;
  gradesCount?: number;
  subjectsCount?: number;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onExplore,
  onInsert,
  onSearch,
  onSelectGrade,
  onSelectSubject,
  publishedCount,
  totalCount = 6,
  interactiveCount = 4,
  gradesCount = 8,
  subjectsCount = 5
}) => {
  const { resources } = useResources();
  const [searchInput, setSearchInput] = useState('');
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>('all');

  // Derive trending topics dynamically from real published resources
  const trendingKeywords = useMemo(() => {
    const set = new Set<string>();
    for (const r of resources || []) {
      if (r && r.status === 'published') {
        if (r.title) {
          const stripped = r.title.replace(/^(محاكاة|استقصاء|تجربة|درس تفاعلي)\s+/, '').trim();
          if (stripped && stripped.length <= 25) set.add(stripped);
        }
        if (r.topic && r.topic !== r.title && r.topic.length <= 25) {
          set.add(r.topic);
        }
        if (r.subjectName && r.subjectName !== 'العلوم') {
          set.add(r.subjectName);
        }
      }
    }
    const list = Array.from(set);
    return list.length > 0 ? list.slice(0, 6) : ['نشاط الفلزات', 'نمو النبات', 'الانتشار', 'الكيمياء'];
  }, [resources]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearch(searchInput.trim());
    } else {
      onExplore();
    }
  };

  const handleKeywordClick = (keyword: string) => {
    setSearchInput(keyword);
    onSearch(keyword);
  };

  const handleGradeFilterClick = (gradeId: string) => {
    if (onSelectGrade) {
      onSelectGrade(gradeId);
    } else {
      onSearch(gradeId);
    }
  };

  const handleSubjectFilterClick = (subjectId: string) => {
    if (onSelectSubject) {
      onSelectSubject(subjectId);
    } else {
      onSearch(subjectId);
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-sky-50/70 via-cyan-50/30 to-white pt-6 sm:pt-12 pb-14 sm:pb-20 border-b border-slate-200/70">
      {/* Decorative Science Elements (Floating subtly in background) */}
      <div className="absolute top-10 right-8 text-cyan-200/30 pointer-events-none hidden md:block">
        <Atom className="w-24 h-24 rotate-12" />
      </div>
      <div className="absolute bottom-12 left-8 text-sky-200/30 pointer-events-none hidden md:block">
        <Dna className="w-20 h-20 -rotate-45" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        
        {/* School & Designer Identity Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-5 sm:mb-7">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white shadow-xs border border-sky-200/70 text-sky-800 text-xs sm:text-sm font-bold">
            <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-600" />
            <span>مدرسة محلاح للبنات (5–12)</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white shadow-xs border border-teal-200/70 text-teal-800 text-xs sm:text-sm font-bold">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600" />
            <span>تصميم: جواهر المعمرية</span>
          </div>

          <div className="hidden xs:inline-flex items-center px-2.5 py-1 rounded-full bg-cyan-100/70 text-cyan-800 text-xs font-semibold">
            سلطنة عمان
          </div>
        </div>

        {/* 1. عنوان المكتبة (Library Title) */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight sm:leading-tight mb-3 sm:mb-4 max-w-4xl mx-auto">
          مكتبة العلوم الرقمية
        </h1>

        {/* 2. الوصف المعتمد (Description) */}
        <p className="text-sm sm:text-lg text-slate-600 font-medium max-w-2xl mx-auto mb-7 sm:mb-9 leading-relaxed px-2">
          منصة رقمية تجمع الموارد العلمية التفاعلية والتعليمية في مكان واحد لدعم تدريس العلوم والتجارب المخبرية الحديثة
        </p>

        {/* 3. محرك البحث والفلترة السريعة (Search Engine & Quick Filter Box) */}
        <div className="max-w-3xl mx-auto mb-6">
          <div className="bg-white p-2.5 sm:p-3 rounded-3xl shadow-xl shadow-cyan-900/5 border border-slate-200/90">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center mb-3">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="ابحث عن مورد، تجربة، محاكاة، درس أو موضوع علمي..."
                className="w-full pl-22 sm:pl-28 pr-10 sm:pr-12 py-3 sm:py-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 placeholder-slate-400 text-xs sm:text-sm font-medium transition-all"
              />
              <div className="absolute right-3.5 text-slate-400 pointer-events-none">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500" />
              </div>

              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute left-20 sm:left-24 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <button
                type="submit"
                className="absolute left-1.5 sm:left-2 bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-600 hover:to-cyan-700 text-white font-bold px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-xs cursor-pointer shrink-0"
              >
                بحث
              </button>
            </form>

            {/* Quick Filters Row */}
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2 text-right">
              {/* Quick Grade Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                <span className="font-bold text-slate-600 shrink-0 flex items-center gap-1 pl-1 text-[11px] sm:text-xs">
                  <Filter className="w-3 h-3 text-sky-600" />
                  <span>الصفوف:</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleGradeFilterClick('')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 font-semibold text-[11px] whitespace-nowrap transition-colors cursor-pointer"
                >
                  الكل
                </button>
                {GRADES.map(grade => (
                  <button
                    key={grade.id}
                    type="button"
                    onClick={() => handleGradeFilterClick(grade.id)}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-sky-700 font-medium text-[11px] whitespace-nowrap border border-slate-200/60 transition-colors cursor-pointer"
                  >
                    {grade.name}
                  </button>
                ))}
              </div>

              {/* Quick Subject Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                <span className="font-bold text-slate-600 shrink-0 text-[11px] sm:text-xs pl-1">
                  المواد:
                </span>
                {SUBJECTS.map(subject => (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => handleSubjectFilterClick(subject.id)}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-cyan-50 text-slate-600 hover:text-cyan-700 font-medium text-[11px] whitespace-nowrap border border-slate-200/60 transition-colors cursor-pointer"
                  >
                    {subject.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 4. الكلمات الشائعة (Trending Keywords) */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-8 sm:mb-10 text-xs text-slate-500">
          <span className="font-bold text-slate-700 text-xs">موضوعات رائجة:</span>
          {trendingKeywords.map(term => (
            <button
              key={term}
              type="button"
              onClick={() => handleKeywordClick(term)}
              className="px-2.5 py-1 bg-white rounded-lg border border-slate-200 hover:border-cyan-400 hover:text-cyan-700 transition-colors cursor-pointer text-[11px] sm:text-xs font-medium shadow-2xs"
            >
              {term}
            </button>
          ))}
        </div>

        {/* 5. زري الإجراء: استكشف المكتبة & إدراج مورد */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10 sm:mb-14 max-w-md mx-auto sm:max-w-none">
          <button
            type="button"
            onClick={onExplore}
            className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white font-bold text-sm sm:text-base shadow-md shadow-sky-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Compass className="w-5 h-5" />
            <span>استكشف المكتبة</span>
          </button>

          <button
            type="button"
            onClick={onInsert}
            className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm sm:text-base border border-slate-200 shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-5 h-5 text-sky-600" />
            <span>إدراج مورد جديد</span>
          </button>
        </div>

        {/* 6. بطاقات الإحصائيات المتناسقة (Real Stats Cards) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto text-right">
          
          {/* Card 1: الموارد العلمية */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3 h-full">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-base sm:text-lg font-black text-slate-900 leading-snug truncate">{publishedCount || totalCount} مورد</p>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">الموارد العلمية</p>
            </div>
          </div>

          {/* Card 2: الموارد التفاعلية */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3 h-full">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-base sm:text-lg font-black text-purple-700 leading-snug truncate">{interactiveCount} محاكاة</p>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">الموارد التفاعلية</p>
            </div>
          </div>

          {/* Card 3: الصفوف */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3 h-full">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-base sm:text-lg font-black text-emerald-700 leading-snug truncate">{gradesCount} صفوف</p>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">الصفوف (5–12)</p>
            </div>
          </div>

          {/* Card 4: المواد */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3 h-full">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-base sm:text-lg font-black text-amber-700 leading-snug truncate">{subjectsCount} مواد</p>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">المواد التخصصية</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

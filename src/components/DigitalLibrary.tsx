import React, { useState, useMemo } from 'react';
import { useResources } from '../context/ResourceContext';
import { GRADES as DEFAULT_GRADES, SUBJECTS as DEFAULT_SUBJECTS } from '../data/initialData';
import { ResourceItem, LibraryFilterState, isResourceInteractive } from '../types';
import { ResourceCard } from './ResourceCard';
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  X,
  LayoutGrid,
  Table as TableIcon,
  StretchHorizontal,
  Play,
  FileText,
  User,
  Star,
  Eye,
  ExternalLink,
  Layers,
  GraduationCap,
  Globe,
  FolderOpen,
  AlertCircle,
  PlusCircle,
  Edit,
  Database,
  Plus
} from 'lucide-react';

interface DigitalLibraryProps {
  onOpenDetails: (res: ResourceItem) => void;
  onLaunch: (res: ResourceItem) => void;
  isEmbeddedInHome?: boolean;
  onOpenInsertModal?: () => void;
  onEditResource?: (res: ResourceItem) => void;
}

// Arabic normalization helper to match without alef/hamza or taa marbuta discrepancies
function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, ''); // Remove tashkeel/diacritics
}

export const DigitalLibrary: React.FC<DigitalLibraryProps> = ({
  onOpenDetails,
  onLaunch,
  isEmbeddedInHome = false,
  onOpenInsertModal,
  onEditResource
}) => {
  const {
    resources,
    resourceTypes,
    curricula,
    units,
    topics,
    grades,
    subjects,
    filters,
    setFilters,
    resetFilters
  } = useResources();

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'compact'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Use dynamic grades and subjects with fallback
  const effectiveGrades = useMemo(() => {
    return grades && grades.length > 0 ? grades.filter(g => g.isActive !== false) : DEFAULT_GRADES;
  }, [grades]);

  const effectiveSubjects = useMemo(() => {
    return subjects && subjects.length > 0 ? subjects.filter(s => s.isActive !== false) : DEFAULT_SUBJECTS;
  }, [subjects]);

  const activeCurricula = useMemo(() => {
    return (curricula || []).filter(c => c.isActive !== false);
  }, [curricula]);

  // Unclassified resources count (missing curriculum, grade, subject, unit, or topic)
  const unclassifiedCount = useMemo(() => {
    return resources.filter(r =>
      r.status === 'published' &&
      (!r.curriculum || r.curriculum === 'غير مصنف' || r.curriculum === 'unclassified' || !r.gradeId || !r.subjectId)
    ).length;
  }, [resources]);

  // Filter & Search Logic with Arabic partial match
  const filteredResources = useMemo(() => {
    // Only published resources appear in general library
    let result = resources.filter(r => r.status === 'published');

    // Curriculum Filter / Unclassified Filter
    if (filters.curriculumId === 'unclassified') {
      result = result.filter(r =>
        !r.curriculum ||
        r.curriculum === 'غير مصنف' ||
        r.curriculum === 'unclassified' ||
        !r.gradeId ||
        !r.subjectId
      );
    } else if (filters.curriculumId) {
      const targetCurric = activeCurricula.find(c => c.id === filters.curriculumId);
      result = result.filter(r =>
        r.curriculumId === filters.curriculumId ||
        (targetCurric && normalizeArabic(r.curriculum) === normalizeArabic(targetCurric.name))
      );
    }

    // Search query
    if (filters.searchQuery.trim()) {
      const q = normalizeArabic(filters.searchQuery.trim());
      result = result.filter(r => {
        const titleNorm = normalizeArabic(r.title);
        const descNorm = normalizeArabic(r.description);
        const topicNorm = normalizeArabic(r.topic || '');
        const unitNorm = normalizeArabic(r.unit || '');
        const authorNorm = normalizeArabic(r.authorName || '');
        const gradeNorm = normalizeArabic(r.gradeName || '');
        const subjectNorm = normalizeArabic(r.subjectName || '');
        const curricNorm = normalizeArabic(r.curriculum || '');
        const tagsNorm = r.tags.map(t => normalizeArabic(t)).join(' ');
        const conceptsNorm = (r.scientificConcepts || []).map(c => normalizeArabic(c)).join(' ');
        const objectivesNorm = (r.educationalObjectives || []).map(o => normalizeArabic(o)).join(' ');

        return (
          titleNorm.includes(q) ||
          descNorm.includes(q) ||
          topicNorm.includes(q) ||
          unitNorm.includes(q) ||
          authorNorm.includes(q) ||
          gradeNorm.includes(q) ||
          subjectNorm.includes(q) ||
          curricNorm.includes(q) ||
          tagsNorm.includes(q) ||
          conceptsNorm.includes(q) ||
          objectivesNorm.includes(q)
        );
      });
    }

    // Grade filter
    if (filters.gradeId) {
      result = result.filter(r => r.gradeId === filters.gradeId);
    }

    // Subject filter
    if (filters.subjectId) {
      result = result.filter(r => r.subjectId === filters.subjectId);
    }

    // Resource Type filter
    if (filters.resourceType) {
      result = result.filter(r => r.resourceType === filters.resourceType);
    }

    // Unit filter
    if (filters.unit) {
      const u = normalizeArabic(filters.unit);
      result = result.filter(r => normalizeArabic(r.unit).includes(u));
    }

    // Topic filter
    if (filters.topic) {
      const top = normalizeArabic(filters.topic);
      result = result.filter(r => normalizeArabic(r.topic || '').includes(top));
    }

    // Pedagogical Category filter
    if (filters.category) {
      result = result.filter(r =>
        (r.pedagogicalCategory && r.pedagogicalCategory === filters.category) ||
        (r as any).category === filters.category
      );
    }

    // Min Rating filter
    if (filters.minRating > 0) {
      result = result.filter(r => r.ratingAverage >= filters.minRating);
    }

    // Sorting
    switch (filters.sortBy) {
      case 'usage':
        result.sort((a, b) => b.usageCount - a.usageCount);
        break;
      case 'rating':
        result.sort((a, b) => b.ratingAverage - a.ratingAverage);
        break;
      case 'alphabetical':
        result.sort((a, b) => a.title.localeCompare(b.title, 'ar'));
        break;
      case 'newest':
      default:
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return result;
  }, [resources, filters, activeCurricula]);

  // Pagination
  const totalPages = Math.ceil(filteredResources.length / itemsPerPage) || 1;
  const paginatedResources = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredResources.slice(start, start + itemsPerPage);
  }, [filteredResources, currentPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const hasActiveFilters = !!(
    filters.searchQuery ||
    filters.curriculumId ||
    filters.gradeId ||
    filters.subjectId ||
    filters.resourceType ||
    filters.unit ||
    filters.topic ||
    filters.category ||
    filters.minRating > 0
  );

  // Available subjects for the currently selected grade
  const availableSubjectsForCurrentGrade = useMemo(() => {
    if (!filters.gradeId) return effectiveSubjects;
    return effectiveSubjects.filter(s => s.grades.includes(filters.gradeId));
  }, [effectiveSubjects, filters.gradeId]);

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in ${isEmbeddedInHome ? 'py-4' : 'py-10'}`}>
      
      {/* Library Title & Subtitle + Action Button */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-50 text-sky-700 text-xs font-bold mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{isEmbeddedInHome ? 'مستكشف الموارد والمكتبة الشاملة' : 'المستودع الرقمي للعلوم'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {isEmbeddedInHome ? 'المكتبة الشاملة ومستكشف الموارد' : 'المكتبة الرقمية - مدرسة محلاح للبنات (5–12)'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            تصفح وابحث في جميع الموارد التعليمية المعتمدة، والمحاكيات التفاعلية، والأوراق العلمية مع التبديل بين طرق العرض
          </p>
        </div>

        {onOpenInsertModal && (
          <button
            onClick={onOpenInsertModal}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-600 to-teal-600 hover:from-sky-600 hover:to-teal-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-sky-500/20 hover:shadow-lg transition-all cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <PlusCircle className="w-5 h-5" />
            <span>+ إضافة مورد جديد</span>
          </button>
        )}
      </div>

      {/* Unclassified Banner Notice if unclassified resources exist */}
      {unclassifiedCount > 0 && filters.curriculumId !== 'unclassified' && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50/90 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">تنبيه الهيكل التعليمي: </span>
              يوجد <span className="font-bold underline">{unclassifiedCount}</span> مورد بحاجة إلى استكمال التصنيف المنهجي (الصف، المادة، الوحدة، الدرس).
            </div>
          </div>
          <button
            onClick={() => {
              setFilters({ curriculumId: 'unclassified' });
              setCurrentPage(1);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1.5 shadow-2xs"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>عرض الموارد غير المصنفة (Unclassified)</span>
          </button>
        </div>
      )}

      {/* Main Filter and Search Toolbar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs mb-6 space-y-4">
        
        {/* Top Search Input */}
        <div className="relative">
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => {
              setFilters({ searchQuery: e.target.value });
              setCurrentPage(1);
            }}
            placeholder="ابحث عن مورد، موضوع، درس أو نشاط (مثال: رذرفورد، الفلزات، خلية)..."
            className="w-full pl-10 pr-11 sm:pr-12 py-3 sm:py-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs sm:text-sm font-medium transition-all"
          />
          <div className="absolute right-3.5 top-3 sm:top-3.5 text-slate-400">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600" />
          </div>
          {filters.searchQuery && (
            <button
              onClick={() => setFilters({ searchQuery: '' })}
              className="absolute left-3.5 top-3 sm:top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Primary Filter Selectors Row - Cascading Curriculum, Grade, Subject, Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          
          {/* Curriculum Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Globe className="w-3 h-3 text-sky-600" />
              <span>المنهج الدراسي</span>
            </label>
            <select
              value={filters.curriculumId || ''}
              onChange={(e) => {
                setFilters({ curriculumId: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              <option value="">جميع المناهج الدراسية</option>
              {activeCurricula.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              <option value="unclassified">📂 موارد غير مصنفة (Unclassified)</option>
            </select>
          </div>

          {/* Grade Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <GraduationCap className="w-3 h-3 text-sky-600" />
              <span>الصف</span>
            </label>
            <select
              value={filters.gradeId}
              onChange={(e) => {
                const newGrade = e.target.value;
                const validSubs = newGrade ? effectiveSubjects.filter(s => s.grades.includes(newGrade)) : effectiveSubjects;
                const keepSubject = validSubs.some(s => s.id === filters.subjectId) ? filters.subjectId : '';
                setFilters({ gradeId: newGrade, subjectId: keepSubject });
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              <option value="">جميع الصفوف (5–12)</option>
              {effectiveGrades.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Subject Filter (Cascading based on selected Grade) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-sky-600" />
              <span>المادة</span>
            </label>
            <select
              value={filters.subjectId}
              onChange={(e) => {
                setFilters({ subjectId: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              <option value="">{filters.gradeId ? 'جميع مواد هذا الصف' : 'جميع المواد'}</option>
              {availableSubjectsForCurrentGrade.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Resource Type Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">نوع المورد</label>
            <select
              value={filters.resourceType}
              onChange={(e) => {
                setFilters({ resourceType: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              <option value="">جميع أنواع الموارد</option>
              {resourceTypes.map(t => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Sorting */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">الترتيب</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ sortBy: e.target.value as LibraryFilterState['sortBy'] })}
              className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              <option value="newest">الأحدث</option>
              <option value="usage">الأكثر استخداماً</option>
              <option value="rating">الأعلى تقييماً</option>
              <option value="alphabetical">الأبجدي</option>
            </select>
          </div>
        </div>

        {/* Advanced Filters Expand Toggle & Reset */}
        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 text-xs font-bold gap-2">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-1.5 text-sky-600 hover:text-sky-700 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{showAdvancedFilters ? 'إخفاء التصفية المتقدمة' : 'خيارات تصفية متقدمة (الوحدة، الدرس، التصنيف التعليمي، التقييم)'}</span>
          </button>

          {hasActiveFilters && (
            <button
              onClick={() => {
                resetFilters();
                setCurrentPage(1);
              }}
              className="flex items-center gap-1 text-rose-600 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط الفلاتر</span>
            </button>
          )}
        </div>

        {/* Collapsible Advanced Filters Row */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100 animate-in fade-in">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">الوحدة التعليمية</label>
              <input
                type="text"
                value={filters.unit}
                onChange={(e) => {
                  setFilters({ unit: e.target.value });
                  setCurrentPage(1);
                }}
                placeholder="ابحث حسب اسم الوحدة..."
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">الدرس / الموضوع العلمي</label>
              <input
                type="text"
                value={filters.topic || ''}
                onChange={(e) => {
                  setFilters({ topic: e.target.value });
                  setCurrentPage(1);
                }}
                placeholder="ابحث حسب اسم الدرس (مثل: رذرفورد، تفاعلات الفلزات)..."
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">الحد الأدنى للتقييم</label>
              <select
                value={filters.minRating}
                onChange={(e) => {
                  setFilters({ minRating: Number(e.target.value) });
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value={0}>جميع التقييمات</option>
                <option value={4}>4 نجوم فأعلى ★★★★</option>
                <option value={4.5}>4.5 نجوم فأعلى ★★★★★</option>
              </select>
            </div>
          </div>
        )}

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400">الفلاتر المطبقة:</span>

            {filters.curriculumId === 'unclassified' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                <span>📂 موارد غير مصنفة</span>
                <X className="w-3 h-3 cursor-pointer hover:text-amber-950" onClick={() => setFilters({ curriculumId: '' })} />
              </span>
            ) : filters.curriculumId ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                <span>{activeCurricula.find(c => c.id === filters.curriculumId)?.name || 'المنهج'}</span>
                <X className="w-3 h-3 cursor-pointer hover:text-purple-950" onClick={() => setFilters({ curriculumId: '' })} />
              </span>
            ) : null}

            {filters.gradeId && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                <span>{effectiveGrades.find(g => g.id === filters.gradeId)?.name}</span>
                <X className="w-3 h-3 cursor-pointer hover:text-sky-950" onClick={() => setFilters({ gradeId: '' })} />
              </span>
            )}

            {filters.subjectId && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
                <span>{effectiveSubjects.find(s => s.id === filters.subjectId)?.name}</span>
                <X className="w-3 h-3 cursor-pointer hover:text-teal-950" onClick={() => setFilters({ subjectId: '' })} />
              </span>
            )}

            {filters.resourceType && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                <span>{filters.resourceType}</span>
                <X className="w-3 h-3 cursor-pointer hover:text-indigo-950" onClick={() => setFilters({ resourceType: '' })} />
              </span>
            )}

            {filters.unit && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                <span>الوحدة: {filters.unit}</span>
                <X className="w-3 h-3 cursor-pointer hover:text-slate-950" onClick={() => setFilters({ unit: '' })} />
              </span>
            )}

            {filters.topic && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                <span>الدرس: {filters.topic}</span>
                <X className="w-3 h-3 cursor-pointer hover:text-slate-950" onClick={() => setFilters({ topic: '' })} />
              </span>
            )}

            {filters.minRating > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                <span>{filters.minRating}+ نجوم ★</span>
                <X className="w-3 h-3 cursor-pointer hover:text-amber-950" onClick={() => setFilters({ minRating: 0 })} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results Header with View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-slate-700">
            تم العثور على <span className="text-sky-600 font-extrabold">{filteredResources.length}</span> مورد تعليمي
          </p>

          {filters.curriculumId === 'unclassified' && (
            <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
              📂 موارد غير مصنفة
            </span>
          )}

          {filters.gradeId && (
            <span className="text-xs bg-sky-100 text-sky-800 font-bold px-2.5 py-0.5 rounded-full">
              {effectiveGrades.find(g => g.id === filters.gradeId)?.name}
            </span>
          )}

          {filters.subjectId && (
            <span className="text-xs bg-teal-100 text-teal-800 font-bold px-2.5 py-0.5 rounded-full">
              {effectiveSubjects.find(s => s.id === filters.subjectId)?.name}
            </span>
          )}
        </div>

        {/* View Switcher: Cards, Table, Compact Grid */}
        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
          <button
            onClick={() => setViewMode('grid')}
            title="عرض بطاقات"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">بطاقات</span>
          </button>

          <button
            onClick={() => setViewMode('compact')}
            title="عرض مدمج"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              viewMode === 'compact'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <StretchHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">مدمج</span>
          </button>

          <button
            onClick={() => setViewMode('table')}
            title="عرض جدول"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              viewMode === 'table'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">جدول</span>
          </button>
        </div>
      </div>

      {/* Main Results Display */}
      {resources.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 sm:p-16 text-center border border-slate-200 shadow-xs max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Database className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-2">قاعدة بيانات Supabase متصلة ومباشرة (0 مورد حالياً)</h3>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            تم التحقق من الاتصال المباشر بجدول <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">public.resources</code>. يمكنك كمدير معتمد إضافة أول مورد تعليمي ليتم حفظه مباشرة في قاعدة البيانات.
          </p>
          {onOpenInsertModal && (
            <button
              onClick={onOpenInsertModal}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>إدراج أول مورد تعليمي</span>
            </button>
          )}
        </div>
      ) : paginatedResources.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 sm:p-16 text-center border border-slate-200 shadow-xs max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-2">لا توجد موارد مطابقة لخيارات البحث</h3>
          <p className="text-xs text-slate-500 mb-6">
            جرب تعديل كلمات البحث، أو إزالة بعض الفلاتر لعرض نتائج أكثر.
          </p>
          <button
            onClick={() => {
              resetFilters();
              setCurrentPage(1);
            }}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            إعادة تعيين البحث
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="py-3.5 px-4">المورد</th>
                  <th className="py-3.5 px-4">الصف</th>
                  <th className="py-3.5 px-4">المادة</th>
                  <th className="py-3.5 px-4">الوحدة / الموضوع</th>
                  <th className="py-3.5 px-4">النوع</th>
                  <th className="py-3.5 px-4">المنشئ</th>
                  <th className="py-3.5 px-4">التقييم</th>
                  <th className="py-3.5 px-4 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedResources.map(resource => {
                  const isInteractive = isResourceInteractive(resource);
                  return (
                    <tr key={resource.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={resource.thumbnailUrl}
                            alt={resource.title}
                            className="w-10 h-10 rounded-lg object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <p
                              onClick={() => onOpenDetails(resource)}
                              className="font-bold text-slate-900 hover:text-sky-600 cursor-pointer truncate max-w-[200px]"
                            >
                              {resource.title}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                              {resource.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                        {resource.gradeName}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                        {resource.subjectName}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {resource.unit || resource.topic || '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="bg-sky-50 text-sky-700 font-bold px-2 py-0.5 rounded-md text-[10px]">
                          {resource.resourceType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {resource.authorName}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-amber-500 font-bold flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{resource.ratingAverage > 0 ? resource.ratingAverage : 'جديد'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onOpenDetails(resource)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                            title="تفاصيل"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          {onEditResource && (
                            <button
                              onClick={() => onEditResource(resource)}
                              className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 cursor-pointer"
                              title="تعديل المورد"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isInteractive ? (
                            <button
                              onClick={() => onLaunch(resource)}
                              className="p-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white cursor-pointer shadow-2xs"
                              title="تشغيل المحاكاة"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" />
                            </button>
                          ) : (
                            <button
                              onClick={() => onOpenDetails(resource)}
                              className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 cursor-pointer"
                              title="فتح المورد"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === 'compact' ? (
        /* COMPACT GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedResources.map(resource => {
            const isInteractive = isResourceInteractive(resource);
            return (
              <div
                key={resource.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex items-center gap-3.5 cursor-pointer"
                onClick={() => onOpenDetails(resource)}
              >
                <img
                  src={resource.thumbnailUrl}
                  alt={resource.title}
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded">
                      {resource.gradeName}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {resource.subjectName}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate mb-1">
                    {resource.title}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate max-w-[100px]">{resource.authorName}</span>
                    <span className="text-amber-500 font-bold flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {resource.ratingAverage > 0 ? resource.ratingAverage : 'جديد'}
                    </span>
                  </div>
                </div>
                {isInteractive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLaunch(resource);
                    }}
                    className="p-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white shrink-0 shadow-2xs"
                    title="تشغيل"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* STANDARD CARDS GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {paginatedResources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onOpenDetails={onOpenDetails}
              onLaunch={onLaunch}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 sm:p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="الصفحة السابقة"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentPage === pageNum
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {pageNum}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 sm:p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="الصفحة التالية"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

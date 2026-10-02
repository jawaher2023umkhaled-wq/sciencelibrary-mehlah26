import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  GraduationCap,
  Layers,
  ChevronLeft,
  Filter,
  Sparkles,
  Search,
  RotateCcw,
  CheckCircle2,
  Atom,
  Dna,
  Zap,
  FlaskConical,
  Globe,
  ArrowRight,
  FolderOpen,
  Play,
  Eye,
  PlusCircle,
  ExternalLink
} from 'lucide-react';
import { useResources } from '../context/ResourceContext';
import { ResourceCard } from './ResourceCard';
import { ResourceItem, GradeItem, SubjectItem, UnitItem, TopicItem } from '../types';

interface CurriculumExplorerProps {
  onOpenLibraryWithFilter?: (gradeId?: string, subjectId?: string, unit?: string, topic?: string) => void;
  onOpenInsert?: (prefill?: Partial<ResourceItem>) => void;
}

export const CurriculumExplorer: React.FC<CurriculumExplorerProps> = ({
  onOpenLibraryWithFilter,
  onOpenInsert
}) => {
  const {
    resources,
    resourceTypes,
    curricula,
    units,
    topics,
    grades,
    subjects,
    setFilters
  } = useResources();

  // Active curriculum (default to default or first active)
  const activeCurricula = useMemo(() => curricula.filter(c => c.isActive !== false), [curricula]);
  const defaultCurric = activeCurricula.find(c => c.isDefault) || activeCurricula[0] || { id: 'curric-oman', name: 'منهج سلطنة عمان' };

  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string>(defaultCurric.id);
  const [selectedGradeId, setSelectedGradeId] = useState<string>('grade-11');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('chemistry');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('unit-chem-11-atom');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('topic-rutherford');
  const [selectedResourceType, setSelectedResourceType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active grades (sorted by number or order)
  const activeGrades = useMemo(() => {
    return [...grades]
      .filter(g => g.isActive !== false)
      .sort((a, b) => (a.number || 0) - (b.number || 0));
  }, [grades]);

  // Valid subjects for selected grade
  const availableSubjectsForGrade = useMemo(() => {
    if (!selectedGradeId) return [];
    return subjects.filter(s => s.isActive !== false && s.grades.includes(selectedGradeId));
  }, [subjects, selectedGradeId]);

  // Auto-select valid subject if current subject is not valid for this grade
  const currentSubject = availableSubjectsForGrade.find(s => s.id === selectedSubjectId) || availableSubjectsForGrade[0];
  const effectiveSubjectId = currentSubject?.id || '';

  // Units for curriculum + grade + subject
  const availableUnits = useMemo(() => {
    return units.filter(u =>
      u.isActive !== false &&
      (u.curriculumId === selectedCurriculumId || !u.curriculumId) &&
      u.gradeId === selectedGradeId &&
      u.subjectId === effectiveSubjectId
    ).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [units, selectedCurriculumId, selectedGradeId, effectiveSubjectId]);

  const currentUnit = availableUnits.find(u => u.id === selectedUnitId) || availableUnits[0];
  const effectiveUnitId = currentUnit?.id || '';

  // Topics for selected unit
  const availableTopics = useMemo(() => {
    if (!effectiveUnitId) return [];
    return topics.filter(t =>
      t.isActive !== false &&
      t.unitId === effectiveUnitId
    ).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [topics, effectiveUnitId]);

  const currentTopic = availableTopics.find(t => t.id === selectedTopicId) || availableTopics[0];
  const effectiveTopicId = currentTopic?.id || '';

  // Filtered resources based on current hierarchy
  const matchingResources = useMemo(() => {
    return resources.filter(r => {
      if (r.status !== 'published') return false;

      // Grade match
      if (selectedGradeId && r.gradeId !== selectedGradeId) return false;

      // Subject match
      if (effectiveSubjectId && r.subjectId !== effectiveSubjectId) return false;

      // Unit match (if unit selected)
      if (currentUnit && r.unitId && r.unitId !== currentUnit.id && r.unit !== currentUnit.name) {
        return false;
      }

      // Topic match (if topic selected)
      if (currentTopic && r.topicId && r.topicId !== currentTopic.id && r.topic !== currentTopic.name) {
        return false;
      }

      // Resource type match
      if (selectedResourceType && r.resourceType !== selectedResourceType && r.resourceTypeId !== selectedResourceType) {
        return false;
      }

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesDesc = r.description?.toLowerCase().includes(q);
        const matchesTags = r.tags?.some(t => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesTags) return false;
      }

      return true;
    });
  }, [resources, selectedGradeId, effectiveSubjectId, currentUnit, currentTopic, selectedResourceType, searchQuery]);

  // Selected entities for breadcrumb and header
  const selectedGrade = activeGrades.find(g => g.id === selectedGradeId);
  const selectedCurriculum = activeCurricula.find(c => c.id === selectedCurriculumId) || defaultCurric;

  // Handle grade change and sync subject
  const handleSelectGrade = (gradeId: string) => {
    setSelectedGradeId(gradeId);
    const validSubs = subjects.filter(s => s.isActive !== false && s.grades.includes(gradeId));
    if (validSubs.length > 0) {
      const match = validSubs.find(s => s.id === selectedSubjectId);
      const newSubId = match ? match.id : validSubs[0].id;
      setSelectedSubjectId(newSubId);

      // Find first unit for new grade + subject
      const matchingUnits = units.filter(u =>
        u.isActive !== false &&
        (u.curriculumId === selectedCurriculumId || !u.curriculumId) &&
        u.gradeId === gradeId &&
        u.subjectId === newSubId
      );
      if (matchingUnits.length > 0) {
        setSelectedUnitId(matchingUnits[0].id);
        const matchingTopics = topics.filter(t => t.isActive !== false && t.unitId === matchingUnits[0].id);
        setSelectedTopicId(matchingTopics.length > 0 ? matchingTopics[0].id : '');
      } else {
        setSelectedUnitId('');
        setSelectedTopicId('');
      }
    } else {
      setSelectedSubjectId('');
      setSelectedUnitId('');
      setSelectedTopicId('');
    }
  };

  // Handle subject change
  const handleSelectSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    const matchingUnits = units.filter(u =>
      u.isActive !== false &&
      (u.curriculumId === selectedCurriculumId || !u.curriculumId) &&
      u.gradeId === selectedGradeId &&
      u.subjectId === subjectId
    );
    if (matchingUnits.length > 0) {
      setSelectedUnitId(matchingUnits[0].id);
      const matchingTopics = topics.filter(t => t.isActive !== false && t.unitId === matchingUnits[0].id);
      setSelectedTopicId(matchingTopics.length > 0 ? matchingTopics[0].id : '');
    } else {
      setSelectedUnitId('');
      setSelectedTopicId('');
    }
  };

  // Handle unit change
  const handleSelectUnit = (unitId: string) => {
    setSelectedUnitId(unitId);
    const matchingTopics = topics.filter(t => t.isActive !== false && t.unitId === unitId);
    setSelectedTopicId(matchingTopics.length > 0 ? matchingTopics[0].id : '');
  };

  // Icon helper
  const getSubjectIcon = (iconName: string) => {
    switch (iconName) {
      case 'FlaskConical': return <FlaskConical className="w-5 h-5" />;
      case 'Dna': return <Dna className="w-5 h-5" />;
      case 'Zap': return <Zap className="w-5 h-5" />;
      case 'Globe': return <Globe className="w-5 h-5" />;
      default: return <Atom className="w-5 h-5" />;
    }
  };

  // Jump to Digital Library with current filters
  const handleOpenInLibrary = () => {
    setFilters({
      gradeId: selectedGradeId,
      subjectId: effectiveSubjectId,
      unit: currentUnit?.name || '',
      topic: currentTopic?.name || '',
      resourceType: selectedResourceType
    });
    if (onOpenLibraryWithFilter) {
      onOpenLibraryWithFilter(selectedGradeId, effectiveSubjectId, currentUnit?.name, currentTopic?.name);
    }
  };

  return (
    <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-sky-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-sky-800/30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-2xl pointer-events-none translate-x-1/3 translate-y-1/3" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold border border-sky-400/20 backdrop-blur-xs">
              <BookOpen className="w-4 h-4 text-cyan-300" />
              <span>الهيكل العلمي والتنظيمي للمكتبة</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              📚 مستكشف المنهج المدرسي
            </h1>
            
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              تصفح منظم ومتدرج لموارد العلوم التفاعلية والمحاكيات الرقمية وفق التسلسل التعليمي المعتمد:
              <span className="font-bold text-sky-300"> الصف ⟵ المادة ⟵ الوحدة ⟵ الدرس ⟵ المورد التعليمي</span>.
            </p>
          </div>

          {/* Curriculum Switcher Dropdown */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 flex flex-col gap-2 shrink-0">
            <label className="text-xs font-bold text-sky-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>المنهج الدراسي المعتمد</span>
            </label>
            <select
              value={selectedCurriculumId}
              onChange={(e) => setSelectedCurriculumId(e.target.value)}
              className="bg-slate-900/90 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl border border-sky-500/40 focus:outline-none focus:ring-2 focus:ring-sky-400 cursor-pointer"
            >
              {activeCurricula.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.name} {c.isDefault ? '(الافتراضي)' : ''}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-300">
              {selectedCurriculum.description || 'المنهج الوطني المعتمد'}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Breadcrumb Trail */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold text-slate-400 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-sky-600" />
          <span>مسار التصفح:</span>
        </span>

        <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 font-bold border border-sky-100">
          {selectedCurriculum.name}
        </span>

        <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />

        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 font-bold border border-indigo-100">
          {selectedGrade?.name || 'اختر الصف'}
        </span>

        <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />

        <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 font-bold border border-purple-100">
          {currentSubject?.name || 'اختر المادة'}
        </span>

        {currentUnit && (
          <>
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-100 truncate max-w-[220px]">
              {currentUnit.name}
            </span>
          </>
        )}

        {currentTopic && (
          <>
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold border border-amber-100 truncate max-w-[240px]">
              {currentTopic.name}
            </span>
          </>
        )}

        <div className="mr-auto flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedResourceType('');
              setSearchQuery('');
            }}
            className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
            title="إعادة ضبط الفلاتر الفرعية"
          >
            <RotateCcw className="w-3 h-3" />
            <span>إعادة ضبط</span>
          </button>
        </div>
      </div>

      {/* STEP 1: Grade Selection Bar (5 to 12) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-sky-500 text-white flex items-center justify-center text-xs font-bold">1</span>
            <span>الصفوف الدراسية (مدرسة محلاح للبنات 5–12)</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            اختر الصف لعرض مواده العلمية المحددة
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {activeGrades.map((g) => {
            const isSelected = g.id === selectedGradeId;
            const resCount = resources.filter(r => r.gradeId === g.id && r.status === 'published').length;

            return (
              <button
                key={g.id}
                onClick={() => handleSelectGrade(g.id)}
                className={`p-3 rounded-2xl text-center transition-all cursor-pointer border flex flex-col items-center justify-between gap-1.5 ${
                  isSelected
                    ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-500/20 scale-[1.02]'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <GraduationCap className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-sky-600'}`} />
                <span className="text-xs font-bold leading-tight">{g.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'
                }`}>
                  {resCount} موارد
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 2: Subject Selection Bar (Filtered for chosen Grade) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">2</span>
            <span>المواد العلمية المتاحة لـ ({selectedGrade?.name || 'الصف المختار'})</span>
          </h3>
          <span className="text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full font-bold">
            {availableSubjectsForGrade.length} مواد مرتبطة
          </span>
        </div>

        {availableSubjectsForGrade.length === 0 ? (
          <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl text-xs">
            لا توجد مواد علمية مخصصة لهذا الصف حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {availableSubjectsForGrade.map((s) => {
              const isSelected = s.id === effectiveSubjectId;
              const resCount = resources.filter(r => r.gradeId === selectedGradeId && r.subjectId === s.id && r.status === 'published').length;

              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectSubject(s.id)}
                  className={`p-4 rounded-2xl text-right transition-all cursor-pointer border flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white border-transparent shadow-md shadow-indigo-500/20 scale-[1.01]'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-white text-indigo-600 shadow-xs'
                    }`}>
                      {getSubjectIcon(s.iconName)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">{s.name}</h4>
                      <p className={`text-[11px] line-clamp-1 ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                        {s.description || 'مادة علمية معتمدة'}
                      </p>
                    </div>
                  </div>

                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'
                  }`}>
                    {resCount} مورد
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* STEP 3 & 4: Units & Lessons Explorer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Units List (Step 3) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center text-xs font-bold">3</span>
              <span>الوحدات الدراسية ({availableUnits.length})</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              {currentSubject?.name} - {selectedGrade?.name}
            </span>
          </div>

          {availableUnits.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
              <FolderOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">
                لا توجد وحدات دراسية مضافة بعد لهذه المادة
              </p>
              <p className="text-[11px] text-slate-400">
                يمكن لمدير النظام إضافة وتعديل وحدات المنهج من لوحة الإدارة 🏷️ التصنيفات والمناهج.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {availableUnits.map((u, idx) => {
                const isSelected = u.id === effectiveUnitId;
                const unitTopics = topics.filter(t => t.unitId === u.id && t.isActive !== false);
                const unitRes = resources.filter(r =>
                  r.gradeId === selectedGradeId &&
                  r.subjectId === effectiveSubjectId &&
                  (r.unitId === u.id || r.unit === u.name) &&
                  r.status === 'published'
                );

                return (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUnit(u.id)}
                    className={`w-full p-3.5 rounded-2xl text-right transition-all cursor-pointer border flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-teal-50 border-teal-300 text-teal-950 shadow-xs ring-2 ring-teal-500/20'
                        : 'bg-slate-50/70 hover:bg-slate-100/70 text-slate-700 border-slate-200/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                          isSelected ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {u.order || idx + 1}
                        </span>
                        <span className="text-xs font-bold leading-snug">{u.name}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        isSelected ? 'bg-teal-200/80 text-teal-900' : 'bg-slate-200/80 text-slate-600'
                      }`}>
                        {unitRes.length} موارد
                      </span>
                    </div>

                    {u.description && (
                      <p className="text-[11px] text-slate-500 pr-7 line-clamp-1">
                        {u.description}
                      </p>
                    )}

                    <div className="pr-7 text-[10px] text-teal-700 font-semibold flex items-center gap-2">
                      <span>{unitTopics.length} دروس / مواضيع</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Lessons / Topics (Step 4) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs font-bold">4</span>
              <span>الدروس والمواضيع ({availableTopics.length})</span>
            </h3>
            {currentUnit && (
              <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-lg truncate max-w-[240px]">
                {currentUnit.name}
              </span>
            )}
          </div>

          {availableTopics.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <FolderOpen className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">
                لا توجد دروس أو مواضيع مسجلة لهذه الوحدة حتى الآن
              </p>
              <p className="text-[11px] text-slate-400">
                يمكنك البحث أو استعراض جميع موارد هذه الوحدة مباشرة في الأسفل.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
              {availableTopics.map((t, idx) => {
                const isSelected = t.id === effectiveTopicId;
                const topicRes = resources.filter(r =>
                  r.gradeId === selectedGradeId &&
                  r.subjectId === effectiveSubjectId &&
                  (r.topicId === t.id || r.topic === t.name) &&
                  r.status === 'published'
                );

                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTopicId(t.id)}
                    className={`p-3.5 rounded-2xl text-right transition-all cursor-pointer border flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'bg-amber-50/80 border-amber-300 text-amber-950 shadow-xs ring-2 ring-amber-500/20'
                        : 'bg-slate-50/70 hover:bg-slate-100/70 text-slate-700 border-slate-200/70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          isSelected ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-600'
                        }`}>
                          درس {t.order || idx + 1}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isSelected ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {topicRes.length} موارد
                        </span>
                      </div>
                      <h4 className="text-xs font-bold leading-snug">{t.name}</h4>
                    </div>

                    {t.description && (
                      <p className="text-[10px] text-slate-500 line-clamp-2">
                        {t.description}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* STEP 5: Resource Type Filter Pills & Search */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center text-xs font-bold">5</span>
              <span>تصفية حسب نوع المورد والبحث السريع</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              حدد نوع المحتوى التفاعلي للوصول السريع إلى المحاكيات والتجارب المخبرية وأوراق العمل
            </p>
          </div>

          <div className="relative min-w-[240px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في نتائج هذا الدرس..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Resource Type Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={() => setSelectedResourceType('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedResourceType === ''
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            جميع الأنواع ({matchingResources.length})
          </button>

          {resourceTypes.map(t => {
            const isSelected = selectedResourceType === t.name;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedResourceType(isSelected ? '' : t.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 6: MATCHING RESOURCES DISPLAY */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-600" />
              <span>الموارد المرتبطة بهذا الدرس / الموضوع</span>
              <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-xs font-bold">
                {matchingResources.length} موارد متطابقة
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedGrade?.name} • {currentSubject?.name} • {currentUnit?.name || 'الوحدة'} • {currentTopic?.name || 'الدرس'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenInLibrary}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
              <span>فتح في المكتبة الرقمية كاملة</span>
            </button>

            {onOpenInsert && (
              <button
                onClick={() => onOpenInsert({
                  gradeId: selectedGradeId,
                  gradeName: selectedGrade?.name || '',
                  subjectId: effectiveSubjectId,
                  subjectName: currentSubject?.name || '',
                  curriculum: selectedCurriculum.name,
                  curriculumId: selectedCurriculum.id,
                  unit: currentUnit?.name || '',
                  unitId: currentUnit?.id || '',
                  topic: currentTopic?.name || '',
                  topicId: currentTopic?.id || ''
                })}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>إدراج مورد لهذا الدرس</span>
              </button>
            )}
          </div>
        </div>

        {/* Resources Grid or Empty State */}
        {matchingResources.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {matchingResources.map(resource => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        ) : (
          <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 text-center space-y-4 max-w-2xl mx-auto shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
              <FolderOpen className="w-8 h-8" />
            </div>
            
            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-900">
                لا توجد موارد منشورة حتى الآن لهذا الدرس
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                تم تجهيز الهيكل التعليمي للدرس بنجاح. يمكن للمعلمين والمشرفين إدراج أول محاكاة أو نشاط تفاعلي لهذا الدرس الآن.
              </p>
            </div>

            {onOpenInsert && (
              <button
                onClick={() => onOpenInsert({
                  gradeId: selectedGradeId,
                  gradeName: selectedGrade?.name || '',
                  subjectId: effectiveSubjectId,
                  subjectName: currentSubject?.name || '',
                  curriculum: selectedCurriculum.name,
                  curriculumId: selectedCurriculum.id,
                  unit: currentUnit?.name || '',
                  unitId: currentUnit?.id || '',
                  topic: currentTopic?.name || '',
                  topicId: currentTopic?.id || ''
                })}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>كن أول من يدرج مورداً لهذا الدرس</span>
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

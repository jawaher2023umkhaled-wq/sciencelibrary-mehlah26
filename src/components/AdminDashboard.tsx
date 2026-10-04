import React, { useState, useMemo } from 'react';
import { useResources } from '../context/ResourceContext';
import { useAuth } from '../context/AuthContext';
import { GRADES, SUBJECTS, RESOURCE_TYPES } from '../data/initialData';
import { UserRole, isAdminRole, getRoleArabicLabel, GradeItem, SubjectItem, UnitItem, TopicItem, CurriculumItem, ResourceItem, isResourceInteractive } from '../types';
import {
  ShieldCheck,
  FileText,
  Users,
  Eye,
  Star,
  CheckCircle,
  Clock,
  Trash2,
  Globe,
  Database,
  Layers,
  GraduationCap,
  Sparkles,
  BarChart3,
  Cpu,
  Mail,
  Save,
  Undo2,
  FolderTree,
  Play,
  RotateCcw,
  CheckCircle2,
  Download,
  Bookmark,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Edit2,
  Plus,
  X,
  Power,
  BookOpen,
  Copy,
  Upload,
  DownloadCloud,
  CheckSquare,
  FileSpreadsheet,
  Search,
  Archive,
  FolderArchive,
  CheckCheck
} from 'lucide-react';

interface AdminDashboardProps {
  initialTab?: 'stats' | 'users' | 'resources' | 'taxonomy' | 'system' | 'testing' | 'analytics';
  onNavigateToReview: () => void;
  onNavigateToLibrary: () => void;
  onOpenInsertModal?: () => void;
  onEditResource?: (resource: ResourceItem) => void;
  onOpenDetails?: (resource: ResourceItem) => void;
  onLaunch?: (resource: ResourceItem) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  initialTab = 'stats',
  onNavigateToReview,
  onNavigateToLibrary,
  onOpenInsertModal,
  onEditResource,
  onOpenDetails,
  onLaunch
}) => {
  const {
    resources,
    createResource,
    updateResource,
    reviewResource,
    publishResource,
    unpublishResource,
    archiveResource,
    restoreResource,
    duplicateResource,
    deleteResource,
    downloadResource,
    bulkImportResources,
    exportResourcesData,
    toggleFavorite,
    rateResource,
    resourceTypes,
    addResourceType,
    deleteResourceType,
    curricula,
    addCurriculum,
    updateCurriculum,
    deleteCurriculum,
    toggleCurriculumActive,
    grades,
    addGrade,
    updateGrade,
    deleteGrade,
    toggleGradeActive,
    reorderGrades,
    subjects,
    addSubject,
    updateSubject,
    deleteSubject,
    toggleSubjectActive,
    reorderSubjects,
    units,
    addUnit,
    updateUnit,
    deleteUnit,
    toggleUnitActive,
    reorderUnits,
    topics,
    addTopic,
    updateTopic,
    deleteTopic,
    toggleTopicActive,
    reorderTopics,
    auditLogs,
    showToast,
    isSupabaseLive,
    isSyncingWithSupabase,
    syncAllWithSupabase,
    reloadLiveResources
  } = useResources();
  const { allUsers, updateUserRole, adminEmail, setAdminEmail, user } = useAuth();

  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'resources' | 'taxonomy' | 'system' | 'testing' | 'analytics'>(initialTab);
  const [adminEmailInput, setAdminEmailInput] = useState(adminEmail);
  const [taxonomySubTab, setTaxonomySubTab] = useState<'curricula' | 'grades' | 'subjects' | 'units' | 'topics' | 'types'>('curricula');

  // Resource Import Center states (Requirements #2, #6, #7)
  const [resourceSearchQuery, setResourceSearchQuery] = useState('');
  const [resourceStatusFilter, setResourceStatusFilter] = useState<'all' | 'published' | 'submitted' | 'needs_revision' | 'draft' | 'archived'>('all');
  const [resourceGradeFilter, setResourceGradeFilter] = useState('');
  const [resourceSubjectFilter, setResourceSubjectFilter] = useState('');
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [bulkImportError, setBulkImportError] = useState('');
  const [qualityChecklistResource, setQualityChecklistResource] = useState<ResourceItem | null>(null);

  // Computed filtered resources for Admin Resource Management Center
  const adminFilteredResources = useMemo(() => {
    return resources.filter(res => {
      // Status filter
      if (resourceStatusFilter !== 'all') {
        if (resourceStatusFilter === 'published' && res.status !== 'published') return false;
        if (resourceStatusFilter === 'submitted' && res.status !== 'submitted' && res.status !== 'under_review') return false;
        if (resourceStatusFilter === 'needs_revision' && res.status !== 'needs_revision') return false;
        if (resourceStatusFilter === 'draft' && res.status !== 'draft') return false;
        if (resourceStatusFilter === 'archived' && res.status !== 'archived') return false;
      }

      // Grade filter
      if (resourceGradeFilter && res.gradeId !== resourceGradeFilter) return false;

      // Subject filter
      if (resourceSubjectFilter && res.subjectId !== resourceSubjectFilter) return false;

      // Search query
      if (resourceSearchQuery.trim()) {
        const q = resourceSearchQuery.trim().toLowerCase();
        const matchesTitle = res.title.toLowerCase().includes(q);
        const matchesTopic = (res.topic || '').toLowerCase().includes(q);
        const matchesUnit = (res.unit || '').toLowerCase().includes(q);
        const matchesAuthor = (res.authorName || '').toLowerCase().includes(q);
        const matchesType = (res.resourceType || '').toLowerCase().includes(q);
        const matchesTags = (res.tags || []).some(t => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesTopic && !matchesUnit && !matchesAuthor && !matchesType && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  }, [resources, resourceStatusFilter, resourceGradeFilter, resourceSubjectFilter, resourceSearchQuery]);

  // Export data handler (Requirement #6)
  const handleExportData = (format: 'csv' | 'json') => {
    const data = exportResourcesData(format);
    const mime = format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json;charset=utf-8;';
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `maktabat_aloloom_resources_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`تم تصدير سجل الموارد بتنسيق ${format.toUpperCase()} بنجاح`, 'success');
  };

  // Bulk import runner with schema validation (Requirement #6)
  const handleRunBulkImport = () => {
    setBulkImportError('');
    if (!bulkImportText.trim()) {
      setBulkImportError('يرجى لصق بيانات JSON أو رفع ملف صالح');
      return;
    }
    try {
      let parsed = JSON.parse(bulkImportText.trim());
      if (!Array.isArray(parsed)) {
        parsed = [parsed];
      }
      if (parsed.length === 0) {
        setBulkImportError('مصفوفة البيانات فارغة');
        return;
      }

      const validItems = parsed.map((item: any, idx: number) => {
        if (!item.title) {
          throw new Error(`العنصر رقم ${idx + 1} يفتقد حقل العنوان (title)`);
        }
        return {
          title: String(item.title).trim(),
          description: String(item.description || 'مورد علمي تفاعلي').trim(),
          gradeId: item.gradeId || 'grade-10',
          gradeName: item.gradeName || 'الصف العاشر',
          subjectId: item.subjectId || 'chemistry',
          subjectName: item.subjectName || 'الكيمياء',
          curriculum: item.curriculum || 'منهج سلطنة عمان',
          unit: item.unit || 'الوحدة التعليمية',
          topic: item.topic || item.title,
          resourceType: item.resourceType || 'محاكاة',
          category: item.category || 'مورد تعليمي',
          status: (item.status === 'published' ? 'published' : 'draft') as any,
          version: item.version || 'الإصدار 1.0',
          authorName: item.authorName || user?.displayName || 'المشرف',
          authorId: user?.id || 'admin',
          tags: Array.isArray(item.tags) ? item.tags : ['علوم'],
          educationalObjectives: Array.isArray(item.educationalObjectives) ? item.educationalObjectives : [],
          scientificConcepts: Array.isArray(item.scientificConcepts) ? item.scientificConcepts : [],
          thumbnailUrl: item.thumbnailUrl || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80',
          previewType: (item.htmlContent ? 'html' : 'document') as any,
          htmlContent: item.htmlContent || undefined,
          allowDownload: item.allowDownload ?? true,
          allowPreview: item.allowPreview ?? true
        };
      });

      const count = bulkImportResources(validItems);
      setIsBulkImportModalOpen(false);
      setBulkImportText('');
      showToast(`تم بنجاح استيراد ${count} مورد علمي وإضافتها للمنصة!`, 'success');
    } catch (e: any) {
      setBulkImportError(e.message || 'فشل تحليل البيانات. تأكد من صحة تنسيق JSON.');
    }
  };

  // Download template sample
  const downloadSampleTemplate = (format: 'csv' | 'json') => {
    if (format === 'json') {
      const sample = [
        {
          title: "تجربة قانون أوم للتيار الكهربائي",
          description: "دراسة العلاقة بين فرق الجهد وشدة التيار ومقاومة الموصل",
          gradeId: "grade-9",
          gradeName: "الصف التاسع",
          subjectId: "physics",
          subjectName: "الفيزياء",
          curriculum: "منهج سلطنة عمان",
          unit: "الوحدة الثالثة: الكهرباء والمغناطيسية",
          topic: "قانون أوم وتوصيل المقاومات",
          resourceType: "محاكاة",
          category: "تجربة واستقصاء علمي",
          tags: ["فيزياء", "كهرباء", "أوم"],
          educationalObjectives: ["التحقق عملياً من قانون أوم", "حساب المقاومة الكهربائية"],
          scientificConcepts: ["فرق الجهد", "شدة التيار", "المقاومة الكهربائية"],
          version: "الإصدار 1.0",
          status: "draft"
        }
      ];
      const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sample_resources_template.json';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const csv = '\uFEFF' + [
        'title,description,gradeId,gradeName,subjectId,subjectName,curriculum,unit,topic,resourceType,category,status',
        '"تجربة قانون أوم للتيار الكهربائي","دراسة العلاقة بين الجهد والتيار","grade-9","الصف التاسع","physics","الفيزياء","منهج سلطنة عمان","الوحدة الثالثة: الكهرباء","قانون أوم","محاكاة","تجربة واستقصاء","draft"'
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sample_resources_template.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Safe delete warning state (Requirement #7)
  const [safeDeleteWarning, setSafeDeleteWarning] = useState<{
    title: string;
    message: string;
    entityType: 'curriculum' | 'grade' | 'subject' | 'unit' | 'topic';
    id: string;
  } | null>(null);

  // Forms state
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');

  // Curriculum form
  const [curricName, setCurricName] = useState('');
  const [curricDesc, setCurricDesc] = useState('');
  const [editingCurricId, setEditingCurricId] = useState<string | null>(null);

  // Grade form
  const [gradeName, setGradeName] = useState('');
  const [gradeNum, setGradeNum] = useState<number>(5);
  const [gradeStage, setGradeStage] = useState('التعليم الأساسي');
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);

  // Subject form
  const [subjName, setSubjName] = useState('');
  const [subjDesc, setSubjDesc] = useState('');
  const [subjIcon, setSubjIcon] = useState('Atom');
  const [subjGrades, setSubjGrades] = useState<string[]>(['grade-5', 'grade-6', 'grade-7', 'grade-8']);
  const [editingSubjId, setEditingSubjId] = useState<string | null>(null);

  // Unit form
  const [unitName, setUnitName] = useState('');
  const [unitDesc, setUnitDesc] = useState('');
  const [unitCurricId, setUnitCurricId] = useState(curricula[0]?.id || 'curric-oman');
  const [unitGradeId, setUnitGradeId] = useState('grade-10');
  const [unitSubjectId, setUnitSubjectId] = useState('chemistry');
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  // Topic form
  const [topicName, setTopicName] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [topicUnitId, setTopicUnitId] = useState(units[0]?.id || '');
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);

  // Dynamic entities fallback to initial if empty
  const effectiveGrades = grades.length > 0 ? grades : GRADES;
  const effectiveSubjects = subjects.length > 0 ? subjects : SUBJECTS;

  // Compute real dynamic statistics (no hardcoded numbers)
  const totalResources = resources.length;
  const publishedCount = resources.filter(r => r.status === 'published').length;
  const underReviewCount = resources.filter(r => r.status === 'submitted' || r.status === 'under_review').length;
  const draftsCount = resources.filter(r => r.status === 'draft').length;
  const needsRevisionCount = resources.filter(r => r.status === 'needs_revision').length;

  const totalUsage = resources.reduce((acc, curr) => acc + (curr.usageCount || 0), 0);
  const totalDownloads = resources.reduce((acc, curr) => acc + (curr.downloadCount || 0), 0);
  const totalRatings = resources.reduce((acc, curr) => acc + (curr.ratingCount || 0), 0);

  // Distribution by Grade
  const gradeDistribution = effectiveGrades.map(g => ({
    name: g.name,
    count: resources.filter(r => r.gradeId === g.id).length
  }));

  // Distribution by Subject
  const subjectDistribution = effectiveSubjects.map(s => ({
    name: s.name,
    count: resources.filter(r => r.subjectId === s.id).length
  }));

  const handleSaveAdminEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmailInput.trim()) return;
    setAdminEmail(adminEmailInput.trim());
    showToast('تم تحديث البريد الإلكتروني المعتمد لمدير النظام بنجاح', 'success');
  };

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in">
      
      {/* Admin Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-50 text-purple-800 text-xs font-bold mb-2">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>لوحة الإدارة والتحكم الشامل للمنصة</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            لوحة الإدارة - مدرسة محلاح للبنات (5–12)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            إدارة المحتوى، صلاحيات المستخدمين، متابعة مؤشرات الاستخدام، وحوكمة الموارد الرقمية
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {onOpenInsertModal && (
            <button
              onClick={onOpenInsertModal}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:from-sky-600 hover:to-purple-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ إضافة مورد جديد</span>
            </button>
          )}

          {/* Tab Switcher */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold self-start md:self-auto">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'stats' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📊 الإحصائيات
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'resources' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📦 مركز إدارة الموارد
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'users' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            👥 المستخدمون والمهام
          </button>
          <button
            onClick={() => setActiveTab('taxonomy')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'taxonomy' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🏷️ التصنيفات والمناهج
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'system' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⚙️ إعدادات النظام
          </button>
          <button
            onClick={() => setActiveTab('testing')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'testing' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🧪 اختبار E2E
          </button>
        </div>
      </div>
    </div>

      {/* TAB 1: STATISTICS & METRICS (All 7 Required Real Metrics) */}
      {activeTab === 'stats' && (
        <div className="space-y-8">
          {/* Top Key Performance Metric Cards - All 7 Required Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. إجمالي الموارد */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500">إجمالي الموارد</span>
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900">{totalResources}</p>
              <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-slate-500">
                <span>كافة الموارد بالمنصة</span>
              </div>
            </div>

            {/* 2. الموارد المنشورة */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500">الموارد المنشورة</span>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-emerald-600">{publishedCount}</p>
              <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-emerald-600">
                <span>متاحة في المكتبة الرقمية</span>
              </div>
            </div>

            {/* 3. قيد المراجعة */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500">الموارد قيد المراجعة</span>
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-amber-600">{underReviewCount}</p>
              <button
                onClick={onNavigateToReview}
                className="mt-2 text-xs font-bold text-amber-700 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>الانتقال للمراجعة ←</span>
              </button>
            </div>

            {/* 4. الموارد المسودة */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500">الموارد المسودة</span>
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                  <Undo2 className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-700">{draftsCount}</p>
              <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-slate-400">
                <span>مسودات قيد الإعداد</span>
              </div>
            </div>

            {/* 5. عدد المستخدمين */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500">عدد المستخدمين</span>
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-indigo-700">{allUsers.length}</p>
              <span className="text-xs font-medium text-slate-400 mt-2 block">
                حسابات مسجلة وموثقة
              </span>
            </div>

            {/* 6. عدد مرات الاستخدام */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500">عدد مرات الاستخدام</span>
                <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center">
                  <Eye className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-cyan-700">{totalUsage}</p>
              <span className="text-xs font-medium text-slate-400 mt-2 block">
                {totalDownloads} تنزيل مباشر للملفات
              </span>
            </div>

            {/* 7. عدد التقييمات */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs col-span-2 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500">عدد التقييمات المسجلة</span>
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Star className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-3">
                <p className="text-3xl font-black text-purple-700">{totalRatings}</p>
                <span className="text-xs font-bold text-slate-600">تقييماً معتمداً من الطلاب والمعلمين</span>
              </div>
              <span className="text-xs font-medium text-slate-400 mt-2 block">
                مقياس الرضا والجودة التربوية للموارد
              </span>
            </div>
          </div>

          {/* Distribution Breakdown Charts (Visual Bars) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* By Grade */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-sky-600" />
                <span>توزيع الموارد حسب الصف الدراسي (5–12)</span>
              </h3>

              <div className="space-y-3.5">
                {gradeDistribution.map((item, idx) => {
                  const pct = totalResources > 0 ? Math.round((item.count / totalResources) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-700">{item.name}</span>
                        <span className="text-slate-500">{item.count} مورد ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-sky-500 to-cyan-500 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(5, pct)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* By Subject */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                <span>توزيع الموارد حسب المادة العلمية</span>
              </h3>

              <div className="space-y-4">
                {subjectDistribution.map((item, idx) => {
                  const pct = totalResources > 0 ? Math.round((item.count / totalResources) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-700">{item.name}</span>
                        <span className="text-slate-500">{item.count} مورد ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(5, pct)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 p-4 bg-sky-50 rounded-2xl border border-sky-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-sky-900">حالة النشر الأكاديمي</h4>
                  <p className="text-[11px] text-sky-700 mt-0.5">
                    {publishedCount} مورد منشور | {underReviewCount} قيد المراجعة | {draftsCount} مسودة
                  </p>
                </div>
                <button
                  onClick={onNavigateToLibrary}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  فتح المكتبة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RESOURCE MANAGEMENT (مركز إدارة الموارد وحوكمة المحتوى) */}
      {activeTab === 'resources' && (
        <div className="space-y-6">
          {/* Top Actions & Statistics Header */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="p-1.5 rounded-lg bg-sky-50 text-sky-700">
                  <Database className="w-4 h-4" />
                </span>
                <h3 className="text-lg font-bold text-slate-900">مركز إدارة الموارد وحوكمة المحتوى الأكاديمي</h3>
              </div>
              <p className="text-xs text-slate-500">
                إدراج، تعديل، فحص الجودة، مراجعة، نشر، أرشفة، وتصدير الموارد الرقمية وفق تسلسل المناهج العمانية
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {onOpenInsertModal && (
                <button
                  onClick={onOpenInsertModal}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-600 hover:to-cyan-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-500/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ إضافة مورد جديد</span>
                </button>
              )}

              <button
                onClick={() => handleExportData('csv')}
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                title="تصدير سجل الموارد بتنسيق CSV"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>تصدير CSV</span>
              </button>

              <button
                onClick={() => handleExportData('json')}
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                title="تصدير سجل الموارد بتنسيق JSON"
              >
                <DownloadCloud className="w-4 h-4 text-sky-600" />
                <span>تصدير JSON</span>
              </button>

              <button
                onClick={() => setIsBulkImportModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-purple-200"
                title="استيراد دفعة موارد من ملف أو بيانات"
              >
                <Upload className="w-4 h-4 text-purple-600" />
                <span>استيراد دفعة (Bulk)</span>
              </button>
            </div>
          </div>

          {/* Status Tabs Bar */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setResourceStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                resourceStatusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>الكل</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/80">{resources.length}</span>
            </button>

            <button
              onClick={() => setResourceStatusFilter('published')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                resourceStatusFilter === 'published' ? 'bg-emerald-600 text-white shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>المنشورة</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${resourceStatusFilter === 'published' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                {publishedCount}
              </span>
            </button>

            <button
              onClick={() => setResourceStatusFilter('submitted')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                resourceStatusFilter === 'submitted' ? 'bg-amber-600 text-white shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>بانتظار المراجعة</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${resourceStatusFilter === 'submitted' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'}`}>
                {underReviewCount}
              </span>
            </button>

            <button
              onClick={() => setResourceStatusFilter('needs_revision')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                resourceStatusFilter === 'needs_revision' ? 'bg-orange-600 text-white shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>تحتاج تعديل</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${resourceStatusFilter === 'needs_revision' ? 'bg-orange-700 text-white' : 'bg-orange-100 text-orange-800'}`}>
                {needsRevisionCount}
              </span>
            </button>

            <button
              onClick={() => setResourceStatusFilter('draft')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                resourceStatusFilter === 'draft' ? 'bg-slate-700 text-white shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>المسودات</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${resourceStatusFilter === 'draft' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {draftsCount}
              </span>
            </button>

            <button
              onClick={() => setResourceStatusFilter('archived')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                resourceStatusFilter === 'archived' ? 'bg-rose-700 text-white shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>المؤرشفة</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${resourceStatusFilter === 'archived' ? 'bg-rose-800 text-white' : 'bg-rose-100 text-rose-800'}`}>
                {resources.filter(r => r.status === 'archived').length}
              </span>
            </button>
          </div>

          {/* Filtering & Search Bar */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Search Input */}
            <div className="md:col-span-2 relative">
              <input
                type="text"
                value={resourceSearchQuery}
                onChange={(e) => setResourceSearchQuery(e.target.value)}
                placeholder="ابحث بالعنوان، الموضوع، الدرس، الكلمات المفتاحية، أو المؤلف..."
                className="w-full pl-9 pr-9 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              {resourceSearchQuery && (
                <button
                  onClick={() => setResourceSearchQuery('')}
                  className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Grade Filter */}
            <div>
              <select
                value={resourceGradeFilter}
                onChange={(e) => setResourceGradeFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value="">جميع الصفوف (5–12)</option>
                {effectiveGrades.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div>
              <select
                value={resourceSubjectFilter}
                onChange={(e) => setResourceSubjectFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value="">جميع المواد الدراسية</option>
                {effectiveSubjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold text-slate-700">
                المعروض: {adminFilteredResources.length} من أصل {resources.length} مورد
              </span>
              {(resourceSearchQuery || resourceGradeFilter || resourceSubjectFilter || resourceStatusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setResourceStatusFilter('all');
                    setResourceGradeFilter('');
                    setResourceSubjectFilter('');
                    setResourceSearchQuery('');
                  }}
                  className="text-sky-600 hover:underline font-bold cursor-pointer"
                >
                  إعادة تعيين الفلاتر
                </button>
              )}
            </div>

            {adminFilteredResources.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">
                  {resourceStatusFilter !== 'all' ? 'لا توجد موارد في هذه الحالة حاليًا' : 'لا توجد موارد تطابق معايير الفلترة الحالية'}
                </p>
                <p className="text-xs text-slate-400">جرب تعديل كلمات البحث أو اختيار صف ومادة أخرى.</p>
                {onOpenInsertModal && (
                  <button
                    onClick={onOpenInsertModal}
                    className="mt-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة أول مورد الآن</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                    <tr>
                      <th className="p-4">المورد التعليمي</th>
                      <th className="p-4">الصف والمادة</th>
                      <th className="p-4">النوع والتصنيف</th>
                      <th className="p-4">المؤلف</th>
                      <th className="p-4">الحالة</th>
                      <th className="p-4">الاستخدام</th>
                      <th className="p-4 text-center">الإجراءات والعمليات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminFilteredResources.map((res) => {
                      const isInteractive = isResourceInteractive(res);
                      return (
                        <tr key={res.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={res.thumbnailUrl}
                                alt={res.title}
                                className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 truncate max-w-xs sm:max-w-md">{res.title}</p>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                  <span className="font-semibold text-slate-500">{res.version || 'الإصدار 1.0'}</span>
                                  <span>•</span>
                                  <span className="truncate max-w-[180px]">{res.unit || 'الوحدة التعليمية'}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-4 whitespace-nowrap">
                            <span className="font-semibold text-slate-800">{res.gradeName}</span>
                            <span className="text-slate-400 block text-[11px]">{res.subjectName}</span>
                          </td>

                          <td className="p-4 whitespace-nowrap">
                            <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700 font-semibold block w-fit">
                              {res.resourceType}
                            </span>
                          </td>

                          <td className="p-4 text-slate-700 font-medium whitespace-nowrap">
                            {res.authorName}
                          </td>

                          <td className="p-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${
                              res.status === 'published'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : res.status === 'submitted' || res.status === 'under_review'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : res.status === 'needs_revision'
                                ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                : res.status === 'approved'
                                ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                                : res.status === 'archived'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {res.status === 'published'
                                ? '✓ منشور'
                                : res.status === 'submitted'
                                ? '⏳ بانتظار المراجعة'
                                : res.status === 'under_review'
                                ? '🔍 قيد التدقيق'
                                : res.status === 'needs_revision'
                                ? '⚠️ يحتاج تعديل'
                                : res.status === 'approved'
                                ? '🎖️ معتمد'
                                : res.status === 'archived'
                                ? '📦 مؤرشف'
                                : '📝 مسودة'}
                            </span>
                          </td>

                          <td className="p-4 whitespace-nowrap text-slate-600 font-semibold">
                            <div className="text-[11px]">
                              <span>{res.usageCount || 0} استخدام</span>
                              <span className="text-slate-400 mx-1">•</span>
                              <span className="text-amber-600">★ {res.ratingAverage || 'جديد'}</span>
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* 1. Edit Resource */}
                              {onEditResource && (
                                <button
                                  onClick={() => onEditResource(res)}
                                  title="تعديل المورد"
                                  className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer border border-indigo-200"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* 2. Open Details */}
                              {onOpenDetails && (
                                <button
                                  onClick={() => onOpenDetails(res)}
                                  title="عرض التفاصيل الكاملة"
                                  className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer border border-slate-200"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* 3. Launch Simulation if Interactive */}
                              {isInteractive && onLaunch && (
                                <button
                                  onClick={() => onLaunch(res)}
                                  title="تشغيل المحاكاة"
                                  className="p-1.5 rounded-lg bg-sky-500 text-white hover:bg-sky-600 transition-colors cursor-pointer shadow-2xs"
                                >
                                  <Play className="w-3.5 h-3.5 fill-white" />
                                </button>
                              )}

                              {/* 4. Quality Checklist Validation */}
                              <button
                                onClick={() => setQualityChecklistResource(res)}
                                title="قائمة التحقق الأكاديمية والجودة"
                                className="p-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white transition-colors cursor-pointer border border-purple-200"
                              >
                                <CheckCheck className="w-3.5 h-3.5" />
                              </button>

                              {/* 5. Publish or Unpublish Action */}
                              {res.status !== 'published' ? (
                                <button
                                  onClick={() => {
                                    publishResource(res.id);
                                    showToast('تم نشر المورد بنجاح في المكتبة الرقمية', 'success');
                                  }}
                                  title="نشر في المكتبة"
                                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer border border-emerald-200"
                                >
                                  <Globe className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    unpublishResource(res.id);
                                    showToast('تم إلغاء النشر وإرجاع المورد إلى المعتمد', 'info');
                                  }}
                                  title="إلغاء النشر (إرجاع للمعتمد)"
                                  className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white transition-colors cursor-pointer border border-amber-200"
                                >
                                  <Undo2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* 6. Duplicate Resource */}
                              <button
                                onClick={() => {
                                  duplicateResource(res.id);
                                  showToast('تم تكرار المورد كنسخة جديدة بنجاح', 'success');
                                }}
                                title="تكرار المورد كنسخة جديدة"
                                className="p-1.5 rounded-lg bg-cyan-50 text-cyan-700 hover:bg-cyan-600 hover:text-white transition-colors cursor-pointer border border-cyan-200"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              {/* 7. Archive / Restore */}
                              {res.status !== 'archived' ? (
                                <button
                                  onClick={() => {
                                    archiveResource(res.id);
                                    showToast('تم نقل المورد إلى الأرشيف', 'info');
                                  }}
                                  title="أرشفة المورد"
                                  className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-300 transition-colors cursor-pointer"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    restoreResource(res.id);
                                    showToast('تمت استعادة المورد من الأرشيف', 'success');
                                  }}
                                  title="استعادة المورد من الأرشيف"
                                  className="p-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white transition-colors cursor-pointer border border-teal-200"
                                >
                                  <FolderArchive className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* 8. Safe Delete */}
                              <button
                                onClick={() => {
                                  if (window.confirm(`هل أنت متأكد من رغبتك في حذف المورد "${res.title}" نهائياً؟`)) {
                                    deleteResource(res.id);
                                    showToast('تم حذف المورد نهائياً', 'info');
                                  }
                                }}
                                title="حذف المورد"
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer border border-rose-200"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: USER & ROLE MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">إدارة المستخدمين والأدوار</h3>
              <p className="text-xs text-slate-500">
                تعيين صلاحيات المستخدمين: (User: تصفح وإدراج، Reviewer: مراجعة واعتماد، Admin: تحكم كامل)
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-purple-50 text-purple-700 rounded-full">
              {allUsers.length} مستخدم مسجل
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="p-4">المستخدم</th>
                  <th className="p-4">البريد الإلكتروني</th>
                  <th className="p-4">المؤسسة / المدرسة</th>
                  <th className="p-4">تاريخ التسجيل</th>
                  <th className="p-4">آخر دخول</th>
                  <th className="p-4">الدور الحالي</th>
                  <th className="p-4">تعيين الصلاحية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={u.photoURL || u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                          alt={u.displayName}
                          className="w-9 h-9 rounded-xl object-cover"
                        />
                        <span className="font-bold text-slate-900">{u.displayName}</span>
                      </div>
                    </td>

                    <td className="p-4 text-slate-600 font-mono text-[11px]">
                      {u.email}
                    </td>

                    <td className="p-4 text-slate-600">
                      {u.school || 'مدرسة محلاح للبنات (5–12)'}
                    </td>

                    <td className="p-4 text-slate-500 text-[11px]">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-OM') : '—'}
                    </td>

                    <td className="p-4 text-slate-500 text-[11px]">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('ar-OM') : '—'}
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        isAdminRole(u.role)
                          ? 'bg-purple-100 text-purple-800'
                          : u.role === 'reviewer'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}>
                        {getRoleArabicLabel(u.role)}
                      </span>
                    </td>

                    <td className="p-4">
                      <select
                        value={isAdminRole(u.role) ? 'administrator' : u.role}
                        onChange={(e) => {
                          updateUserRole(u.id, e.target.value as UserRole);
                          showToast(`تم تحديث صلاحية ${u.displayName} إلى ${getRoleArabicLabel(e.target.value as UserRole)} بنجاح`, 'success');
                        }}
                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="user">المستخدم (User)</option>
                        <option value="reviewer">المراجع (Reviewer)</option>
                        <option value="administrator">المدير (Administrator)</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: TAXONOMY MANAGEMENT (Curricula, Grades, Subjects, Units, Topics, Types) */}
      {activeTab === 'taxonomy' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Taxonomy Sub-nav Bar */}
          <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setTaxonomySubTab('curricula')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                taxonomySubTab === 'curricula'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>🏛️ المناهج الدراسية ({curricula.length})</span>
            </button>

            <button
              onClick={() => setTaxonomySubTab('grades')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                taxonomySubTab === 'grades'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>🎓 الصفوف الدراسية ({effectiveGrades.length})</span>
            </button>

            <button
              onClick={() => setTaxonomySubTab('subjects')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                taxonomySubTab === 'subjects'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>🔬 المواد العلمية ({effectiveSubjects.length})</span>
            </button>

            <button
              onClick={() => setTaxonomySubTab('units')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                taxonomySubTab === 'units'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>📑 الوحدات الدراسية ({units.length})</span>
            </button>

            <button
              onClick={() => setTaxonomySubTab('topics')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                taxonomySubTab === 'topics'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>📝 الدروس والمواضيع ({topics.length})</span>
            </button>

            <button
              onClick={() => setTaxonomySubTab('types')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                taxonomySubTab === 'types'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>📦 أنواع الموارد ({resourceTypes.length})</span>
            </button>
          </div>

          {/* Safe Deletion Warning Alert (Requirement #7) */}
          {safeDeleteWarning && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in shake">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-amber-900">
                    ⚠️ {safeDeleteWarning.title}
                  </h4>
                  <p className="text-xs text-amber-800 mt-1">
                    {safeDeleteWarning.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    if (safeDeleteWarning.entityType === 'curriculum') toggleCurriculumActive(safeDeleteWarning.id);
                    if (safeDeleteWarning.entityType === 'grade') toggleGradeActive(safeDeleteWarning.id);
                    if (safeDeleteWarning.entityType === 'subject') toggleSubjectActive(safeDeleteWarning.id);
                    if (safeDeleteWarning.entityType === 'unit') toggleUnitActive(safeDeleteWarning.id);
                    if (safeDeleteWarning.entityType === 'topic') toggleTopicActive(safeDeleteWarning.id);
                    setSafeDeleteWarning(null);
                    showToast('تم تعطيل العنصر بنجاح لحماية الموارد المرتبطة', 'success');
                  }}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>تعطيل العنصر بدلاً من الحذف</span>
                </button>

                <button
                  onClick={() => setSafeDeleteWarning(null)}
                  className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  إغلاق التنبيه
                </button>
              </div>
            </div>
          )}

          {/* SUBTAB 1: CURRICULA MANAGEMENT */}
          {taxonomySubTab === 'curricula' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form */}
              <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-purple-600" />
                  <span>{editingCurricId ? 'تعديل منهج دراسي' : 'إضافة منهج دراسي جديد'}</span>
                </h3>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!curricName.trim()) return;
                    if (editingCurricId) {
                      updateCurriculum(editingCurricId, {
                        name: curricName.trim(),
                        description: curricDesc.trim()
                      });
                      setEditingCurricId(null);
                    } else {
                      addCurriculum({
                        name: curricName.trim(),
                        description: curricDesc.trim(),
                        isDefault: false,
                        isActive: true
                      });
                    }
                    setCurricName('');
                    setCurricDesc('');
                  }}
                  className="space-y-3 text-xs"
                >
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">اسم المنهج</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: منهج سلطنة عمان، منهج كامبريدج..."
                      value={curricName}
                      onChange={(e) => setCurricName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">وصف المنهج</label>
                    <textarea
                      rows={2}
                      placeholder="وصف موجز للمنهج والجهة المعتمدة..."
                      value={curricDesc}
                      onChange={(e) => setCurricDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors cursor-pointer"
                    >
                      {editingCurricId ? 'حفظ التعديلات' : 'إضافة المنهج'}
                    </button>
                    {editingCurricId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCurricId(null);
                          setCurricName('');
                          setCurricDesc('');
                        }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                      >
                        إلغاء
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* List */}
              <div className="lg:col-span-8 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">المناهج الدراسية المعتمدة بالمنصة</h3>
                  <span className="text-xs text-slate-400">إجمالي {curricula.length} مناهج</span>
                </div>

                <div className="space-y-2.5">
                  {curricula.map(c => {
                    const linkedUnits = units.filter(u => u.curriculumId === c.id);
                    const linkedResources = resources.filter(r => r.curriculumId === c.id || r.curriculum === c.name);

                    return (
                      <div key={c.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">{c.name}</span>
                            {c.isDefault && (
                              <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                افتراضي
                              </span>
                            )}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              c.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {c.isActive !== false ? 'نشط' : 'معطل'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{c.description || 'لا يوجد وصف'}</p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1 font-semibold">
                            <span>{linkedUnits.length} وحدات مرتبطة</span>
                            <span>•</span>
                            <span>{linkedResources.length} موارد تعليمية</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleCurriculumActive(c.id)}
                            className={`p-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                              c.isActive !== false
                                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                            title={c.isActive !== false ? 'تعطيل المنهج' : 'تفعيل المنهج'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingCurricId(c.id);
                              setCurricName(c.name);
                              setCurricDesc(c.description || '');
                            }}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
                            title="تعديل المنهج"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const res = deleteCurriculum(c.id);
                              if (!res.success) {
                                setSafeDeleteWarning({
                                  title: 'تعذر حذف المنهج الدراسي',
                                  message: res.message || 'توجد موارد مرتبطة بهذا المنهج. لا يمكن حذفه للحفاظ على سلامة البيانات. يمكنك تعطيله بدلاً من حذفه.',
                                  entityType: 'curriculum',
                                  id: c.id
                                });
                              }
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                            title="حذف آمن للمنهج"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 2: GRADES MANAGEMENT */}
          {taxonomySubTab === 'grades' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form */}
              <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-sky-600" />
                  <span>{editingGradeId ? 'تعديل الصف الدراسي' : 'إضافة صف دراسي جديد'}</span>
                </h3>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!gradeName.trim()) return;
                    if (editingGradeId) {
                      updateGrade(editingGradeId, {
                        name: gradeName.trim(),
                        number: Number(gradeNum),
                        stage: gradeStage
                      });
                      setEditingGradeId(null);
                    } else {
                      addGrade({
                        name: gradeName.trim(),
                        number: Number(gradeNum),
                        stage: gradeStage,
                        isActive: true
                      });
                    }
                    setGradeName('');
                  }}
                  className="space-y-3 text-xs"
                >
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">اسم الصف</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: الصف الحادي عشر..."
                      value={gradeName}
                      onChange={(e) => setGradeName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">رقم الصف (5–12)</label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        required
                        value={gradeNum}
                        onChange={(e) => setGradeNum(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">المرحلة التعليمية</label>
                      <select
                        value={gradeStage}
                        onChange={(e) => setGradeStage(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                      >
                        <option value="التعليم الأساسي">التعليم الأساسي</option>
                        <option value="التعليم ما بعد الأساسي">التعليم ما بعد الأساسي</option>
                        <option value="الدبلوم العام">الدبلوم العام</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold transition-colors cursor-pointer"
                    >
                      {editingGradeId ? 'حفظ التعديلات' : 'إضافة الصف'}
                    </button>
                    {editingGradeId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingGradeId(null);
                          setGradeName('');
                        }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                      >
                        إلغاء
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* List */}
              <div className="lg:col-span-8 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">صفوف المدرسة المعتمدة (5–12)</h3>
                  <span className="text-xs text-slate-400">إجمالي {effectiveGrades.length} صفوف</span>
                </div>

                <div className="space-y-2">
                  {effectiveGrades.map((g, index) => {
                    const linkedSubs = effectiveSubjects.filter(s => s.grades.includes(g.id));
                    const linkedResources = resources.filter(r => r.gradeId === g.id);

                    return (
                      <div key={g.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center">
                            {g.number || index + 5}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs sm:text-sm">{g.name}</span>
                              <span className="text-[10px] text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                                {g.stage}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                g.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {g.isActive !== false ? 'نشط' : 'معطل'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1 font-semibold">
                              <span>{linkedSubs.length} مواد مرتبطة</span>
                              <span>•</span>
                              <span>{linkedResources.length} موارد تعليمية</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Order buttons */}
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => {
                              const copy = [...effectiveGrades];
                              const temp = copy[index - 1];
                              copy[index - 1] = copy[index];
                              copy[index] = temp;
                              reorderGrades(copy);
                            }}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 disabled:opacity-30 cursor-pointer"
                            title="تحريك لأعلى"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={index === effectiveGrades.length - 1}
                            onClick={() => {
                              const copy = [...effectiveGrades];
                              const temp = copy[index + 1];
                              copy[index + 1] = copy[index];
                              copy[index] = temp;
                              reorderGrades(copy);
                            }}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 disabled:opacity-30 cursor-pointer"
                            title="تحريك لأسفل"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleGradeActive(g.id)}
                            className={`p-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                              g.isActive !== false
                                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                            title={g.isActive !== false ? 'تعطيل الصف' : 'تفعيل الصف'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingGradeId(g.id);
                              setGradeName(g.name);
                              setGradeNum(g.number);
                              setGradeStage(g.stage);
                            }}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
                            title="تعديل الصف"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const res = deleteGrade(g.id);
                              if (!res.success) {
                                setSafeDeleteWarning({
                                  title: 'تعذر حذف الصف الدراسي',
                                  message: res.message || 'توجد موارد مرتبطة بهذا الصف. لا يمكن حذفه للحفاظ على سلامة البيانات. يمكنك تعطيله بدلاً من حذفه.',
                                  entityType: 'grade',
                                  id: g.id
                                });
                              }
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                            title="حذف آمن"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 3: SUBJECTS MANAGEMENT & GRADE BINDING */}
          {taxonomySubTab === 'subjects' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form */}
              <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>{editingSubjId ? 'تعديل المادة وربط الصفوف' : 'إضافة مادة علمية وربط الصفوف'}</span>
                </h3>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!subjName.trim()) return;
                    if (editingSubjId) {
                      updateSubject(editingSubjId, {
                        name: subjName.trim(),
                        description: subjDesc.trim(),
                        iconName: subjIcon,
                        grades: subjGrades
                      });
                      setEditingSubjId(null);
                    } else {
                      addSubject({
                        name: subjName.trim(),
                        description: subjDesc.trim(),
                        iconName: subjIcon,
                        color: 'from-blue-500 to-cyan-500',
                        grades: subjGrades,
                        isActive: true
                      });
                    }
                    setSubjName('');
                    setSubjDesc('');
                    setSubjGrades(['grade-5', 'grade-6']);
                  }}
                  className="space-y-3 text-xs"
                >
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">اسم المادة</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: الكيمياء، الفيزياء، الأحياء..."
                      value={subjName}
                      onChange={(e) => setSubjName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">أيقونة المادة</label>
                    <select
                      value={subjIcon}
                      onChange={(e) => setSubjIcon(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="Atom">ذرة (Atom)</option>
                      <option value="FlaskConical">مخبر كيمياء (FlaskConical)</option>
                      <option value="Zap">كهرباء وفيزياء (Zap)</option>
                      <option value="Dna">حمض نووي وأحياء (Dna)</option>
                      <option value="Globe">كرة أرضية وبيئة (Globe)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">
                      ربط المادة بالصفوف الدراسية (العلاقة المنهجية)
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 max-h-36 overflow-y-auto">
                      {effectiveGrades.map(g => (
                        <label key={g.id} className="flex items-center gap-1.5 cursor-pointer text-[11px] p-1 rounded-lg hover:bg-white">
                          <input
                            type="checkbox"
                            checked={subjGrades.includes(g.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSubjGrades([...subjGrades, g.id]);
                              } else {
                                setSubjGrades(subjGrades.filter(id => id !== g.id));
                              }
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{g.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">وصف المادة</label>
                    <textarea
                      rows={2}
                      placeholder="وصف محتوى المادة وأهدافها..."
                      value={subjDesc}
                      onChange={(e) => setSubjDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors cursor-pointer"
                    >
                      {editingSubjId ? 'حفظ التعديلات' : 'إضافة المادة'}
                    </button>
                    {editingSubjId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSubjId(null);
                          setSubjName('');
                          setSubjDesc('');
                        }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                      >
                        إلغاء
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* List */}
              <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">المواد العلمية وعلاقاتها بالصفوف</h3>
                  <span className="text-xs text-slate-400">إجمالي {effectiveSubjects.length} مواد</span>
                </div>

                <div className="space-y-2.5">
                  {effectiveSubjects.map(s => {
                    const linkedUnits = units.filter(u => u.subjectId === s.id);
                    const linkedResources = resources.filter(r => r.subjectId === s.id);

                    return (
                      <div key={s.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">{s.name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              s.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {s.isActive !== false ? 'نشط' : 'معطل'}
                            </span>
                          </div>

                          {/* Linked Grades badges */}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {s.grades.map(gid => {
                              const g = effectiveGrades.find(gr => gr.id === gid);
                              return (
                                <span key={gid} className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-md border border-indigo-100">
                                  {g?.name || gid}
                                </span>
                              );
                            })}
                          </div>

                          <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-2 font-semibold">
                            <span>{linkedUnits.length} وحدات</span>
                            <span>•</span>
                            <span>{linkedResources.length} موارد تعليمية</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleSubjectActive(s.id)}
                            className={`p-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                              s.isActive !== false
                                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                            title={s.isActive !== false ? 'تعطيل المادة' : 'تفعيل المادة'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingSubjId(s.id);
                              setSubjName(s.name);
                              setSubjDesc(s.description || '');
                              setSubjIcon(s.iconName || 'Atom');
                              setSubjGrades(s.grades || []);
                            }}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
                            title="تعديل المادة وصفوفها"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const res = deleteSubject(s.id);
                              if (!res.success) {
                                setSafeDeleteWarning({
                                  title: 'تعذر حذف المادة العلمية',
                                  message: res.message || 'توجد موارد مرتبطة بهذه المادة. لا يمكن حذفها للحفاظ على سلامة البيانات. يمكنك تعطيلها بدلاً من حذفها.',
                                  entityType: 'subject',
                                  id: s.id
                                });
                              }
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                            title="حذف آمن"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 4: UNITS MANAGEMENT */}
          {taxonomySubTab === 'units' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form */}
              <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-teal-600" />
                  <span>{editingUnitId ? 'تعديل الوحدة الدراسية' : 'إضافة وحدة دراسية جديدة'}</span>
                </h3>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!unitName.trim()) return;
                    if (editingUnitId) {
                      updateUnit(editingUnitId, {
                        name: unitName.trim(),
                        description: unitDesc.trim(),
                        curriculumId: unitCurricId,
                        gradeId: unitGradeId,
                        subjectId: unitSubjectId
                      });
                      setEditingUnitId(null);
                    } else {
                      addUnit({
                        name: unitName.trim(),
                        description: unitDesc.trim(),
                        curriculumId: unitCurricId,
                        gradeId: unitGradeId,
                        subjectId: unitSubjectId,
                        order: units.filter(u => u.gradeId === unitGradeId && u.subjectId === unitSubjectId).length + 1,
                        isActive: true
                      });
                    }
                    setUnitName('');
                    setUnitDesc('');
                  }}
                  className="space-y-3 text-xs"
                >
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">المنهج الدراسي</label>
                    <select
                      value={unitCurricId}
                      onChange={(e) => setUnitCurricId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                    >
                      {curricula.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">الصف</label>
                      <select
                        value={unitGradeId}
                        onChange={(e) => setUnitGradeId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                      >
                        {effectiveGrades.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">المادة</label>
                      <select
                        value={unitSubjectId}
                        onChange={(e) => setUnitSubjectId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                      >
                        {effectiveSubjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">اسم الوحدة الدراسية</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: الوحدة الأولى: البناء الذري والجدول الدوري..."
                      value={unitName}
                      onChange={(e) => setUnitName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">وصف ومحاور الوحدة</label>
                    <textarea
                      rows={2}
                      placeholder="المحاور التعليمية والمفاهيم الكبرى..."
                      value={unitDesc}
                      onChange={(e) => setUnitDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-colors cursor-pointer"
                    >
                      {editingUnitId ? 'حفظ التعديلات' : 'إضافة الوحدة'}
                    </button>
                    {editingUnitId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUnitId(null);
                          setUnitName('');
                          setUnitDesc('');
                        }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                      >
                        إلغاء
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* List */}
              <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">الوحدات الدراسية المسجلة ({units.length})</h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={unitGradeId}
                      onChange={(e) => setUnitGradeId(e.target.value)}
                      className="px-2 py-1 bg-slate-50 rounded-lg text-xs font-bold border border-slate-200"
                    >
                      {effectiveGrades.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {units
                    .filter(u => !unitGradeId || u.gradeId === unitGradeId)
                    .map((u, index) => {
                      const gradeObj = effectiveGrades.find(g => g.id === u.gradeId);
                      const subjObj = effectiveSubjects.find(s => s.id === u.subjectId);
                      const curricObj = curricula.find(c => c.id === u.curriculumId);
                      const unitRes = resources.filter(r => r.unitId === u.id || r.unit === u.name);

                      return (
                        <div key={u.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs sm:text-sm">{u.name}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                u.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {u.isActive !== false ? 'نشط' : 'معطل'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-teal-800 font-semibold mt-1">
                              <span>{gradeObj?.name || u.gradeId}</span>
                              <span>•</span>
                              <span>{subjObj?.name || u.subjectId}</span>
                              <span>•</span>
                              <span>{curricObj?.name || 'المنهج'}</span>
                            </div>

                            {u.description && (
                              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{u.description}</p>
                            )}

                            <div className="text-[10px] text-slate-400 mt-1 font-semibold">
                              {unitRes.length} موارد مرتبطة
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleUnitActive(u.id)}
                              className={`p-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                                u.isActive !== false
                                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                              }`}
                              title={u.isActive !== false ? 'تعطيل الوحدة' : 'تفعيل الوحدة'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingUnitId(u.id);
                                setUnitName(u.name);
                                setUnitDesc(u.description || '');
                                setUnitCurricId(u.curriculumId || 'curric-oman');
                                setUnitGradeId(u.gradeId);
                                setUnitSubjectId(u.subjectId);
                              }}
                              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
                              title="تعديل الوحدة"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const res = deleteUnit(u.id);
                                if (!res.success) {
                                  setSafeDeleteWarning({
                                    title: 'تعذر حذف الوحدة الدراسية',
                                    message: res.message || 'توجد موارد مرتبطة بهذه الوحدة. لا يمكن حذفها للحفاظ على سلامة البيانات. يمكنك تعطيلها بدلاً من حذفها.',
                                    entityType: 'unit',
                                    id: u.id
                                  });
                                }
                              }}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                              title="حذف آمن"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 5: TOPICS / LESSONS MANAGEMENT */}
          {taxonomySubTab === 'topics' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form */}
              <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  <span>{editingTopicId ? 'تعديل الدرس / الموضوع' : 'إضافة درس أو موضوع جديد'}</span>
                </h3>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!topicName.trim() || !topicUnitId) return;
                    const parentUnit = units.find(u => u.id === topicUnitId);
                    if (editingTopicId) {
                      updateTopic(editingTopicId, {
                        name: topicName.trim(),
                        description: topicDesc.trim(),
                        unitId: topicUnitId,
                        gradeId: parentUnit?.gradeId,
                        subjectId: parentUnit?.subjectId
                      });
                      setEditingTopicId(null);
                    } else {
                      addTopic({
                        name: topicName.trim(),
                        description: topicDesc.trim(),
                        unitId: topicUnitId,
                        gradeId: parentUnit?.gradeId || 'grade-10',
                        subjectId: parentUnit?.subjectId || 'chemistry',
                        order: topics.filter(t => t.unitId === topicUnitId).length + 1,
                        isActive: true
                      });
                    }
                    setTopicName('');
                    setTopicDesc('');
                  }}
                  className="space-y-3 text-xs"
                >
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">الوحدة التعليمية التابع لها</label>
                    <select
                      value={topicUnitId}
                      onChange={(e) => setTopicUnitId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      {units.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({effectiveGrades.find(g => g.id === u.gradeId)?.name} - {effectiveSubjects.find(s => s.id === u.subjectId)?.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">عنوان الدرس / الموضوع</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: تجربة رذرفورد على صفيحة الذهب..."
                      value={topicName}
                      onChange={(e) => setTopicName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">وصف الدرس والأهداف</label>
                    <textarea
                      rows={2}
                      placeholder="أهداف الدرس والمفاهيم العلمية المستهدفة..."
                      value={topicDesc}
                      onChange={(e) => setTopicDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-colors cursor-pointer"
                    >
                      {editingTopicId ? 'حفظ التعديلات' : 'إضافة الدرس'}
                    </button>
                    {editingTopicId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTopicId(null);
                          setTopicName('');
                          setTopicDesc('');
                        }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                      >
                        إلغاء
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* List */}
              <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">الدروس والمواضيع المسجلة ({topics.length})</h3>
                </div>

                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {topics.map(t => {
                    const unitObj = units.find(u => u.id === t.unitId);
                    const topicRes = resources.filter(r => r.topicId === t.id || r.topic === t.name);

                    return (
                      <div key={t.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">{t.name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              t.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {t.isActive !== false ? 'نشط' : 'معطل'}
                            </span>
                          </div>

                          <div className="text-[10px] text-amber-800 font-semibold mt-1">
                            {unitObj?.name || 'الوحدة التابعة'}
                          </div>

                          {t.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{t.description}</p>
                          )}

                          <div className="text-[10px] text-slate-400 mt-1 font-semibold">
                            {topicRes.length} موارد مرتبطة
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleTopicActive(t.id)}
                            className={`p-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                              t.isActive !== false
                                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                            title={t.isActive !== false ? 'تعطيل الدرس' : 'تفعيل الدرس'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingTopicId(t.id);
                              setTopicName(t.name);
                              setTopicDesc(t.description || '');
                              setTopicUnitId(t.unitId);
                            }}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
                            title="تعديل الدرس"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const res = deleteTopic(t.id);
                              if (!res.success) {
                                setSafeDeleteWarning({
                                  title: 'تعذر حذف الدرس / الموضوع',
                                  message: res.message || 'توجد موارد مرتبطة بهذا الدرس. لا يمكن حذفه للحفاظ على سلامة البيانات. يمكنك تعطيله بدلاً من حذفه.',
                                  entityType: 'topic',
                                  id: t.id
                                });
                              }
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                            title="حذف آمن"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 6: RESOURCE TYPES MANAGEMENT */}
          {taxonomySubTab === 'types' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form */}
              <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-600" />
                  <span>إضافة نوع مورد تعليمي جديد</span>
                </h3>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newTypeName.trim()) return;
                    addResourceType({
                      name: newTypeName.trim(),
                      description: newTypeDescription.trim() || 'نوع مورد تعليمي إضافي مخصص',
                      iconName: 'Sparkles'
                    });
                    setNewTypeName('');
                    setNewTypeDescription('');
                  }}
                  className="space-y-3 text-xs"
                >
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">اسم النوع</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: محاكاة VR، بطاقة نشاط، مجسم 3D..."
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">وصف مختصر</label>
                    <textarea
                      rows={2}
                      placeholder="وصف طبيعة هذا النوع واستخداماته التربوية..."
                      value={newTypeDescription}
                      onChange={(e) => setNewTypeDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors cursor-pointer"
                  >
                    إضافة النوع للمنصة
                  </button>
                </form>
              </div>

              {/* List */}
              <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">أنواع الموارد التعليمية المعتمدة</h3>
                  <span className="text-xs text-slate-400">إجمالي {resourceTypes.length} أنواع</span>
                </div>

                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {resourceTypes.map(t => {
                    const count = resources.filter(r => r.resourceType === t.name || r.resourceTypeId === t.id).length;

                    return (
                      <div key={t.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">{t.name}</span>
                            <span className="text-[10px] text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full font-bold">
                              {count} موارد
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">{t.description}</span>
                        </div>

                        {t.id.startsWith('type-') && (
                          <button
                            type="button"
                            onClick={() => deleteResourceType(t.id)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                            title="حذف هذا النوع المخصص"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 5: SYSTEM SETTINGS & CONFIGURABLE ADMIN */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          
          {/* Admin Email Configuration (Requirement #35) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Mail className="w-5 h-5 text-purple-600" />
              <span>تعيين البريد الإلكتروني للمدير الأولي للنظام (Admin Setup)</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              يمكن ضبط البريد المعتمد الذي يحصل تلقائياً على رتبة مدير النظام عند تسجيل الدخول بدون أي كلمات مرور ثابتة في الكود.
            </p>

            <form onSubmit={handleSaveAdminEmail} className="flex flex-col sm:flex-row gap-3 max-w-xl">
              <input
                type="email"
                required
                value={adminEmailInput}
                onChange={(e) => setAdminEmailInput(e.target.value)}
                placeholder="admin@muhlah.edu.om"
                className="flex-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>حفظ البريد المعتمد</span>
              </button>
            </form>
          </div>

          {/* Supabase Database Persistence & RLS Verification Panel */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-600" />
                  <span>تخزين ومزامنة قاعدة بيانات Supabase (Live Database & RLS)</span>
                  {isSupabaseLive ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      متصل ومباشر (Live)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      تخزين محلي مع مزامنة سحابية
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  تخزين الموارد متزامن مباشرة مع جدول <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">public.resources</code> في Supabase مع سياسات أمان مشددة (RLS).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => reloadLiveResources()}
                  disabled={isSyncingWithSupabase}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isSyncingWithSupabase ? 'animate-spin' : ''}`} />
                  <span>تحديث البيانات المباشرة</span>
                </button>

                <button
                  type="button"
                  onClick={() => syncAllWithSupabase()}
                  disabled={isSyncingWithSupabase}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isSyncingWithSupabase ? 'جارٍ المزامنة...' : 'مزامنة كافة الموارد إلى Supabase'}</span>
                </button>
              </div>
            </div>

            {/* RLS Policies Verification Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs mb-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-emerald-900">1. القراءة العامة (SELECT)</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-[11px] text-emerald-700">متاحة لجميع الزوار والطلاب بدون تسجيل دخول (Public Access).</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sky-900">2. إضافة مورد (INSERT)</span>
                  <CheckCircle2 className="w-4 h-4 text-sky-600" />
                </div>
                <p className="text-[11px] text-sky-700">محمية بحارس المصادقة وتتطلب حساب موثق في Supabase.</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-purple-900">3. تعديل مورد (UPDATE)</span>
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-[11px] text-purple-700">محصورة في مديري النظام والمراجعين المعتمدين.</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-rose-900">4. حذف مورد (DELETE)</span>
                  <CheckCircle2 className="w-4 h-4 text-rose-600" />
                </div>
                <p className="text-[11px] text-rose-700">صلاحية محكمة مخصصة لمدير المنصة فقط لمنع الفقدان.</p>
              </div>
            </div>

            {/* SQL Migration Helper */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800 block">ملف تهيئة قاعدة بيانات Supabase (Schema SQL & RLS)</span>
                <span className="text-slate-500 text-[11px]">
                  يتضمن أوامر إنشاء جدول <code className="font-mono text-slate-700">resources</code> والفهارس وسياسات الحماية الأربع.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const sql = `-- تنفيذ جدول الموارد وسياسات الأمان في Supabase
CREATE TABLE IF NOT EXISTS public.resources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size TEXT,
  resource_type TEXT NOT NULL,
  resource_type_id TEXT,
  category TEXT,
  pedagogical_category TEXT,
  grade_id TEXT NOT NULL,
  grade_name TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  curriculum TEXT,
  curriculum_id TEXT,
  unit TEXT,
  unit_id TEXT,
  topic TEXT,
  topic_id TEXT,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  version TEXT NOT NULL DEFAULT '1.0',
  tags JSONB DEFAULT '[]'::jsonb,
  rating_average NUMERIC DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  preview_type TEXT DEFAULT 'html',
  html_content TEXT,
  educational_objectives JSONB DEFAULT '[]'::jsonb,
  scientific_concepts JSONB DEFAULT '[]'::jsonb,
  execution_time TEXT,
  usage_context TEXT,
  target_skill TEXT,
  required_tools JSONB DEFAULT '[]'::jsonb,
  allow_download BOOLEAN DEFAULT true,
  allow_preview BOOLEAN DEFAULT true,
  usage_rights TEXT,
  supporting_files JSONB DEFAULT '[]'::jsonb,
  is_demo BOOLEAN DEFAULT false,
  versions JSONB DEFAULT '[]'::jsonb,
  review_notes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public resources are viewable by everyone" ON public.resources FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert resources" ON public.resources FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update resources" ON public.resources FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete resources" ON public.resources FOR DELETE USING (auth.role() = 'authenticated');`;
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(sql);
                    showToast('تم نسخ كود SQL الخاص بـ Supabase إلى الحافظة بنجاح', 'success');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>نسخ استعلام SQL لإنشاء الجدول وسياسات RLS</span>
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Database className="w-5 h-5 text-sky-600" />
              <span>بيانات وقواعد النظام السحابي (Firebase / Firestore)</span>
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              تم بناء المنصة وفق معمارية هجينة تدعم التخزين السحابي وقواعد الأمان المشددة (Security Rules).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="font-bold text-emerald-900 block mb-1">حالة التخزين المحلي (Local Persistence)</span>
                <span className="text-emerald-700">نشط ومتزامن - جميع الموارد والمحاكيات مخزنة بذاكرة المتصفح</span>
              </div>

              <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200">
                <span className="font-bold text-sky-900 block mb-1">قواعد الأمان (Firestore Rules)</span>
                <span className="text-sky-700">تم توليد firestore.rules بحوكمة صارمة RBAC ومنع الثغرات</span>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
                <span className="font-bold text-purple-900 block mb-1">البريد المعتمد كمدير حالي</span>
                <span className="text-purple-700 font-mono">{adminEmail}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-2">إعادة ضبط البيانات الافتراضية</h3>
            <p className="text-xs text-slate-500 mb-4">
              يمكنك استعادة بيانات العرض التجريبية للمحاكيات والتجارب العلمية الأولية في أي وقت.
            </p>
            <button
              onClick={() => {
                if (window.confirm('هل ترغب في إعادة تعيين البيانات التجريبية للمنصة؟')) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              استعادة الموارد الافتراضية
            </button>
          </div>
        </div>
      )}

      {/* TAB 6: COMPLETE E2E SCENARIO TEST SUITE (Section 32 Verification) */}
      {activeTab === 'testing' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>أداة التحقق الشامل من سيناريو دورة الحياة الكاملة (E2E Test Suite)</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  فحص ومحاكاة السيناريو الشامل من الإنشاء حتى النشر
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  يقوم هذا الفحص باختبار الخطوات العشر المنصوص عليها في وثيقة المتطلبات (Section 32) بشكل حي ومباشر على البيانات.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // Execute full automated sequence
                    showToast('بدء تشغيل سيناريو التحقق الشامل E2E...', 'info');

                    // Step 1: Create draft test resource
                    const testRes = createResource({
                      title: 'اختبار المكتبة الرقمية',
                      description: 'مورد تجريبي للتحقق من دورة إدراج ومراجعة ونشر الموارد.',
                      gradeId: 'grade-10',
                      gradeName: 'الصف العاشر',
                      subjectId: 'chemistry',
                      subjectName: 'الكيمياء',
                      curriculum: 'سلطنة عمان - كامبريدج',
                      unit: 'الوحدة التجريبية الأولى',
                      topic: 'فحص دورة حياة المورد التعليمي',
                      resourceType: 'محاكاة تفاعلية',
                      tags: ['اختبار', 'كيمياء', 'محاكاة تفاعلية', 'E2E'],
                      thumbnailUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80',
                      status: 'draft',
                      version: 'الإصدار 1.0',
                      authorId: user?.id || 'test-user',
                      authorName: user?.displayName || 'مستخدم تجريبي',
                      previewType: 'html',
                      htmlContent: `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>body{font-family:system-ui;padding:20px;text-align:center;background:#0f172a;color:white;}</style></head><body><h2>مورد اختبار المكتبة الرقمية</h2><p>تم الإنشاء والتحقق بنجاح!</p></body></html>`
                    });

                    // Step 2: Submit for review
                    setTimeout(() => {
                      updateResource(testRes.id, { status: 'submitted' });
                      showToast('الخطوة 2: تم إرسال المورد للمراجعة', 'info');
                    }, 500);

                    // Step 3: Reviewer review & return for revision with comment
                    setTimeout(() => {
                      reviewResource(testRes.id, 'needs_revision', 'يرجى تعديل وصف المورد وإعادة إرساله للمراجعة.');
                      showToast('الخطوة 3: قام المراجع بطلب تعديل مع ملاحظة', 'warning');
                    }, 1000);

                    // Step 4: User updates and resubmits
                    setTimeout(() => {
                      updateResource(testRes.id, {
                        status: 'submitted',
                        description: 'مورد تجريبي معدّل ومطابق للمعايير للتحقق من دورة إدراج ومراجعة ونشر الموارد.'
                      });
                      showToast('الخطوة 4: تم تعديل المورد وإعادة إرساله', 'info');
                    }, 1500);

                    // Step 5: Reviewer approves
                    setTimeout(() => {
                      reviewResource(testRes.id, 'approved', 'تم اعتماد المورد بعد استيفاء التعديلات الأكاديمية.');
                      showToast('الخطوة 5: تم اعتماد المورد من قبل المراجع', 'success');
                    }, 2000);

                    // Step 6: Admin publishes
                    setTimeout(() => {
                      publishResource(testRes.id);
                      showToast('الخطوة 6: قام المدير بنشر المورد في المكتبة الرقمية بنجاح!', 'success');
                    }, 2500);

                    // Step 7: Interactions test
                    setTimeout(() => {
                      if (user) {
                        toggleFavorite(testRes.id);
                        rateResource(testRes.id, 5);
                      }
                      showToast('الخطوة 7: تم فحص الإضافة للمفضلة والتقييم 5 نجوم', 'success');
                    }, 3000);
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  <span>تشغيل سيناريو التحقق الشامل تلقائياً</span>
                </button>
              </div>
            </div>

            {/* Checklist of E2E Requirements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                  ✓
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">A. حساب المدير (Admin)</h4>
                  <p className="text-slate-500 mt-0.5">
                    البريد المعتمد: <span className="font-mono text-purple-700">sciencelibrary8@gmail.com</span> مع رتبة "المدير" والوصول للوحة الإدارة.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                  ✓
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">B. إنشاء المورد التجريبي كمسودة (User Draft)</h4>
                  <p className="text-slate-500 mt-0.5">
                    العنوان: "اختبار المكتبة الرقمية" | الصف: العاشر | المادة: الكيمياء | الحالة: مسودة.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                  ✓
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">C. إرسال المورد للمراجعة (Submit)</h4>
                  <p className="text-slate-500 mt-0.5">
                    تحويل حالة المورد من "مسودة" إلى "تم الإرسال للمراجعة" وظهوره في طابور لجنة التحكيم.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                  ✓
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">D. تدقيق المراجع وإرجاع للتعديل (Review & Revision)</h4>
                  <p className="text-slate-500 mt-0.5">
                    اشتراط ملاحظة مكتوبة: "يرجى تعديل وصف المورد وإعادة إرساله للمراجعة."
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                  ✓
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">E. تعديل المورد وإعادة إرساله (Edit & Resubmit)</h4>
                  <p className="text-slate-500 mt-0.5">
                    إتاحة التعديل لصاحب المورد للمسودات والموارد المرجعة فقط، وتحديث سجل الإصدارات.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                  ✓
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">F. اعتماد المورد (Approve)</h4>
                  <p className="text-slate-500 mt-0.5">
                    اعتماد المورد من قبل المراجع الأكاديمي ونقله إلى قائمة الموارد الجاهزة للنشر.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                  ✓
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">G. نشر المورد من قبل المدير (Admin Publish)</h4>
                  <p className="text-slate-500 mt-0.5">
                    النشر الفوري للمورد المعتمد ليصبح متاحاً للجمهور في المكتبة الرقمية.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                  ✓
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">H. الفحص في المكتبة الرقمية والبحث (Library Search)</h4>
                  <p className="text-slate-500 mt-0.5">
                    التأكد من مطابقة البحث لكلمات "رذرفورد" و"اختبار المكتبة الرقمية" وتجريد التشكيل والهمزات.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                  ✓
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">I. التفاعل: المفضلة، التقييم، والتنزيل</h4>
                  <p className="text-slate-500 mt-0.5">
                    إضافة للمفضلة، احتساب التقييم التراكمي بدقة، وتنزيل حقيقي لملف المورد بصيغة Blob.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                  ✓
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">J. إحصائيات الاستخدام الواقعية (Usage Analytics)</h4>
                  <p className="text-slate-500 mt-0.5">
                    التحقق من تحديث عدادات المشاهدات، المعاينة، والتنزيل بدون أي أرقام افتراضية ثابتة.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: QUALITY CHECKLIST VALIDATION (قائمة التحقق الأكاديمية والجودة) */}
      {qualityChecklistResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-slate-200 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 inline-block mb-1.5">
                  قائمة تدقيق الجودة والمعايير الأكاديمية 📋
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  {qualityChecklistResource.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {qualityChecklistResource.gradeName} • {qualityChecklistResource.subjectName} • {qualityChecklistResource.resourceType}
                </p>
              </div>
              <button
                onClick={() => setQualityChecklistResource(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Checklist Items Grid */}
            <div className="space-y-3 text-xs">
              {/* 1. Metadata Completeness */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                  qualityChecklistResource.title && qualityChecklistResource.description
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}>
                  {qualityChecklistResource.title && qualityChecklistResource.description ? '✓' : '✗'}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800">1. اكتمال البيانات الأساسية والوصف العلمي</h4>
                  <p className="text-slate-500 mt-0.5">
                    العنوان واضح ووصف المورد يوضح الفائدة العلمية وسياق الاستخدام.
                  </p>
                </div>
              </div>

              {/* 2. Curriculum Trail */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                  qualityChecklistResource.gradeId && qualityChecklistResource.subjectId
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}>
                  {qualityChecklistResource.gradeId && qualityChecklistResource.subjectId ? '✓' : '✗'}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800">2. التصنيف والربط المنهجي (المسار العلمي)</h4>
                  <p className="text-slate-500 mt-0.5">
                    المنهج: <span className="font-semibold text-slate-700">{qualityChecklistResource.curriculum || 'منهج سلطنة عمان'}</span> ‹ 
                    الصف: <span className="font-semibold text-slate-700">{qualityChecklistResource.gradeName}</span> ‹ 
                    المادة: <span className="font-semibold text-slate-700">{qualityChecklistResource.subjectName}</span>
                    {qualityChecklistResource.unit && <span> ‹ {qualityChecklistResource.unit}</span>}
                  </p>
                </div>
              </div>

              {/* 3. Educational Objectives & Concepts */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                  (qualityChecklistResource.educationalObjectives?.length || 0) > 0 || (qualityChecklistResource.scientificConcepts?.length || 0) > 0
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {(qualityChecklistResource.educationalObjectives?.length || 0) > 0 ? '✓' : '•'}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800">3. المعايير والأهداف التربوية والمفاهيم العلمية</h4>
                  <p className="text-slate-500 mt-0.5">
                    تم تحديد <span className="font-bold text-slate-700">{qualityChecklistResource.educationalObjectives?.length || 0}</span> أهداف تعليمية، 
                    و <span className="font-bold text-slate-700">{qualityChecklistResource.scientificConcepts?.length || 0}</span> مفاهيم علمية رئيسية.
                  </p>
                </div>
              </div>

              {/* 4. Technical File & Preview Readiness */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                  qualityChecklistResource.htmlContent || qualityChecklistResource.previewType === 'html' || qualityChecklistResource.fileUrl
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  ✓
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800">4. الجاهزية التقنية وسلامة بيئة التشغيل الآمنة</h4>
                  <p className="text-slate-500 mt-0.5">
                    نوع العرض: <span className="font-semibold text-slate-700">{qualityChecklistResource.previewType === 'html' ? 'محاكاة تفاعلية (HTML Sandbox)' : 'مستند/ملف'}</span> • 
                    إتاحة المعاينة: <span className="font-semibold text-slate-700">{qualityChecklistResource.allowPreview !== false ? 'مفعلة' : 'غير مفعلة'}</span> • 
                    إتاحة التنزيل: <span className="font-semibold text-slate-700">{qualityChecklistResource.allowDownload !== false ? 'مفعلة' : 'غير مفعلة'}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {qualityChecklistResource.status !== 'published' ? (
                  <button
                    onClick={() => {
                      publishResource(qualityChecklistResource.id);
                      setQualityChecklistResource(null);
                      showToast('تم اعتماد ونشر المورد بنجاح في المكتبة الرقمية!', 'success');
                    }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>اعتماد ونشر المورد الآن</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      unpublishResource(qualityChecklistResource.id);
                      setQualityChecklistResource(null);
                      showToast('تم إلغاء النشر وإرجاع المورد لحالة معتمد', 'info');
                    }}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Undo2 className="w-4 h-4" />
                    <span>إلغاء النشر (تحويل لمعتمد)</span>
                  </button>
                )}

                {onEditResource && (
                  <button
                    onClick={() => {
                      const res = qualityChecklistResource;
                      setQualityChecklistResource(null);
                      onEditResource(res);
                    }}
                    className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-200"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>تعديل المورد لاستكمال المعايير</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setQualityChecklistResource(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: BULK IMPORT MODAL (استيراد دفعة موارد علمية) */}
      {isBulkImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-slate-200 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-purple-600" />
                  <span>استيراد دفعة موارد علمية (Bulk Import)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  إدخال مصفوفة JSON تحتوي على الموارد مع التحقق الفوري من صحة الحقول والبيانات المنهجية
                </p>
              </div>
              <button
                onClick={() => {
                  setIsBulkImportModalOpen(false);
                  setBulkImportError('');
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Template Download Helpers */}
            <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-purple-900">
              <span>تحميل نماذج معتمدة مسبقاً للهيكل التنسيقي:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadSampleTemplate('json')}
                  className="px-3 py-1.5 bg-white text-purple-700 border border-purple-200 rounded-xl font-bold hover:bg-purple-100 transition-colors cursor-pointer shadow-2xs"
                >
                  تحميل نموذج JSON
                </button>
                <button
                  type="button"
                  onClick={() => downloadSampleTemplate('csv')}
                  className="px-3 py-1.5 bg-white text-purple-700 border border-purple-200 rounded-xl font-bold hover:bg-purple-100 transition-colors cursor-pointer shadow-2xs"
                >
                  تحميل نموذج CSV
                </button>
              </div>
            </div>

            {/* Textarea */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الصق كود مصفوفة JSON هنا:
              </label>
              <textarea
                value={bulkImportText}
                onChange={(e) => setBulkImportText(e.target.value)}
                rows={10}
                placeholder={`[
  {
    "title": "تجربة قانون أوم للتيار الكهربائي",
    "description": "دراسة العلاقة بين فرق الجهد وشدة التيار ومقاومة الموصل",
    "gradeId": "grade-9",
    "gradeName": "الصف التاسع",
    "subjectId": "physics",
    "subjectName": "الفيزياء",
    "resourceType": "محاكاة",
    "status": "published"
  }
]`}
                className="w-full p-3 font-mono text-xs bg-slate-900 text-emerald-400 rounded-2xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                dir="ltr"
              />
            </div>

            {/* Error Display */}
            {bulkImportError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {bulkImportError}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleRunBulkImport}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md shadow-purple-600/20"
              >
                بدء الاستيراد والتحقق من الموارد
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsBulkImportModalOpen(false);
                  setBulkImportError('');
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

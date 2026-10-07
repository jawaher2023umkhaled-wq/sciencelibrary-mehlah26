import React, { useState, useMemo } from 'react';
import { ResourceItem, isAdminRole, isResourceInteractive } from '../types';
import { useResources } from '../context/ResourceContext';
import { useAuth } from '../context/AuthContext';
import { getSimulationContent, generateInteractiveSimulationShell } from '../data/simulations';
import { ErrorBoundary } from './ErrorBoundary';
import {
  X,
  Play,
  Download,
  Heart,
  Star,
  Eye,
  Calendar,
  User,
  GraduationCap,
  Layers,
  BookOpen,
  Tag,
  Clock,
  Share2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Edit,
  FileText,
  Video,
  Image as ImageIcon,
  FileCode,
  Compass
} from 'lucide-react';

interface ResourceDetailsModalProps {
  resource: ResourceItem | null;
  isOpen: boolean;
  onClose: () => void;
  onLaunch: (resource: ResourceItem) => void;
  onEditResource?: (resource: ResourceItem) => void;
}

export const ResourceDetailsModal: React.FC<ResourceDetailsModalProps> = ({
  resource,
  isOpen,
  onClose,
  onLaunch,
  onEditResource
}) => {
  const {
    favorites = [],
    toggleFavorite,
    rateResource,
    downloadResource,
    getRecommendedResources,
    getSimilarResources,
    openResource,
    showToast
  } = useResources();
  const { user } = useAuth();

  const [hoverRating, setHoverRating] = useState(0);
  const [showVersions, setShowVersions] = useState(false);
  const [showReviews, setShowReviews] = useState(false);

  const isInteractive = useMemo(() => Boolean(resource && isResourceInteractive(resource)), [resource]);

  const previewHtml = useMemo(() => {
    if (!resource || typeof resource !== 'object') return null;
    const directHtml = resource.htmlContent || resource.html_content;
    if (directHtml && typeof directHtml === 'string' && directHtml.trim().length > 0) return directHtml;

    const fileUrl = resource.fileUrl || resource.file_url || resource.url || '';
    if (fileUrl.startsWith('data:text/html;charset=utf-8,')) {
      try {
        return decodeURIComponent(fileUrl.replace('data:text/html;charset=utf-8,', ''));
      } catch {
        return fileUrl;
      }
    }
    if (fileUrl.startsWith('data:text/html;base64,')) {
      try {
        return decodeURIComponent(escape(atob(fileUrl.replace('data:text/html;base64,', ''))));
      } catch {
        try {
          return atob(fileUrl.replace('data:text/html;base64,', ''));
        } catch {
          return null;
        }
      }
    }
    if (fileUrl.trim().startsWith('<!DOCTYPE html') || fileUrl.trim().startsWith('<html') || (fileUrl.includes('</') && fileUrl.includes('<script'))) {
      return fileUrl;
    }

    const builtin = getSimulationContent(resource);
    if (builtin) return builtin;

    if (isInteractive) {
      return generateInteractiveSimulationShell(resource);
    }
    return null;
  }, [resource, isInteractive]);

  // Safe early exit if modal is not open, AFTER all hooks have executed
  if (!isOpen) {
    return null;
  }

  // Safe fallback if modal is open but resource object is missing or invalid
  if (!resource || typeof resource !== 'object' || !resource.id) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl border border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <X className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">تعذر عرض تفاصيل المورد</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            بيانات المورد غير متوفرة أو لم تكتمل عملية تحميلها من قاعدة البيانات.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    );
  }

  // Safe field extractions with robust fallbacks
  const safeId = resource?.id || '';
  const safeTitle = resource?.title || 'مورد تعليمي';
  const safeDescription = resource?.description || 'لا يوجد وصف تفصيلي متوفر لهذا المورد.';
  const safeAuthor = resource?.authorName || (resource as any)?.author || 'مكتبة العلوم الرقمية';
  const safeAuthorId = resource?.authorId || (resource as any)?.user_id || 'admin';
  const safeThumbnail = resource?.thumbnailUrl || (resource as any)?.thumbnail_url || (resource as any)?.image_url || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80';
  const safeGrade = resource?.gradeName || 'الصف العاشر';
  const safeSubject = resource?.subjectName || 'العلوم';
  const safeCurriculum = resource?.curriculum || 'منهج سلطنة عمان';
  const safeUnits = (resource as any)?.units || resource?.unit || '';
  const safeUnit = resource?.unit || (typeof safeUnits === 'string' ? safeUnits : '') || '';
  const safeTopic = resource?.topic || safeTitle;
  const safeType = resource?.resourceType || (resource as any)?.type || 'محاكاة';
  const safeTags: string[] = Array.isArray(resource?.tags) ? resource.tags.filter(t => typeof t === 'string' && t.trim().length > 0) : [];
  const safeSupportingFiles = Array.isArray((resource as any)?.supportingFiles) ? (resource as any).supportingFiles : [];
  const safeVersions = Array.isArray(resource?.versions) && resource.versions.length > 0 ? resource.versions : [
    {
      versionNumber: resource?.version || 'الإصدار 1.0',
      changeNotes: 'الإصدار المعتمد الأساسي للمورد',
      createdAt: resource?.createdAt || new Date().toISOString(),
      createdBy: safeAuthor
    }
  ];
  const safeReviewNotes = Array.isArray(resource?.reviewNotes) ? resource.reviewNotes : [];

  const safeFormatDate = (dateVal?: string | null) => {
    if (!dateVal) return new Date().toLocaleDateString('ar-OM');
    try {
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? new Date().toLocaleDateString('ar-OM') : d.toLocaleDateString('ar-OM');
    } catch {
      return new Date().toLocaleDateString('ar-OM');
    }
  };

  const isFavorite = safeId ? (favorites || []).includes(safeId) : false;
  const recommended = safeId ? (getRecommendedResources?.(resource) || []) : [];
  const similar = safeId ? (getSimilarResources?.(resource) || []) : [];
  const isAuthor = user?.id === safeAuthorId || user?.displayName === safeAuthor || isAdminRole(user?.role);
  const canEdit = isAuthor && (resource?.status === 'draft' || resource?.status === 'needs_revision' || isAdminRole(user?.role));

  const handleRate = (score: number) => {
    if (safeId) rateResource(safeId, score);
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('تم نسخ رابط المورد إلى الحافظة بنجاح', 'success');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto animate-in fade-in">
      <ErrorBoundary title="تفاصيل المورد التعليمي" onReset={onClose}>
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95">
          
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="bg-sky-100 text-sky-700 text-xs font-bold px-3 py-1 rounded-full">
                {safeType}
              </span>
              <span className="bg-cyan-100 text-cyan-800 text-xs font-bold px-3 py-1 rounded-full">
                {safeGrade}
              </span>
              <span className="bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-full">
                {safeSubject}
              </span>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            
            {/* Scientific Curriculum Hierarchy Trail */}
            <div className="p-3 bg-gradient-to-r from-sky-50 via-indigo-50 to-purple-50 rounded-2xl border border-sky-100 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-bold flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-sky-600" />
                <span>المسار المنهجي:</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white text-slate-800 font-bold border border-slate-200 shadow-2xs">
                {safeCurriculum}
              </span>
              <span className="text-slate-300">›</span>
              <span className="px-2 py-0.5 rounded-md bg-white text-sky-800 font-bold border border-sky-200 shadow-2xs">
                {safeGrade}
              </span>
              <span className="text-slate-300">›</span>
              <span className="px-2 py-0.5 rounded-md bg-white text-purple-800 font-bold border border-purple-200 shadow-2xs">
                {safeSubject}
              </span>
              {safeUnit && (
                <>
                  <span className="text-slate-300">›</span>
                  <span className="px-2 py-0.5 rounded-md bg-white text-teal-800 font-bold border border-teal-200 shadow-2xs truncate max-w-[200px]" title={safeUnit}>
                    {safeUnit}
                  </span>
                </>
              )}
              {safeTopic && (
                <>
                  <span className="text-slate-300">›</span>
                  <span className="px-2 py-0.5 rounded-md bg-white text-amber-800 font-bold border border-amber-200 shadow-2xs truncate max-w-[240px]" title={safeTopic}>
                    {safeTopic}
                  </span>
                </>
              )}
            </div>

            {/* Top Banner & Main Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Thumbnail preview */}
              <div className="relative rounded-2xl overflow-hidden aspect-video md:aspect-auto h-52 bg-slate-100 shadow-inner group">
                <img
                  src={safeThumbnail}
                  alt={safeTitle}
                  className="w-full h-full object-cover"
                />
                {isInteractive && (
                  <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                    <button
                      onClick={() => {
                        onClose();
                        onLaunch(resource);
                      }}
                      className="w-14 h-14 rounded-full bg-sky-500 hover:bg-sky-600 text-white flex items-center justify-center shadow-lg transform hover:scale-110 transition-all cursor-pointer"
                    >
                      <Play className="w-6 h-6 fill-white ml-0.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Title, Summary & Key Metrics */}
              <div className="md:col-span-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-2xl font-bold text-slate-900 leading-snug mb-3">
                      {safeTitle}
                    </h2>

                    {canEdit && onEditResource && (
                      <button
                        onClick={() => {
                          onClose();
                          onEditResource(resource);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 border border-sky-200"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>تعديل المورد</span>
                      </button>
                    )}
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    {safeDescription}
                  </p>
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center mb-4">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">التقييم</span>
                    <div className="flex items-center justify-center gap-1 font-bold text-slate-800 text-sm mt-0.5">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span>{(resource?.ratingCount || 0) > 0 && (resource?.ratingAverage || 0) > 0 ? (resource.ratingAverage || 0).toFixed(1) : 'لا توجد تقييمات بعد'}</span>
                      {(resource?.ratingCount || 0) > 0 && (
                        <span className="text-[11px] text-slate-400">({resource.ratingCount})</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block font-medium">الاستخدام</span>
                    <div className="flex items-center justify-center gap-1 font-bold text-slate-800 text-sm mt-0.5">
                      <Eye className="w-4 h-4 text-cyan-500" />
                      <span>{resource?.usageCount || 0} مرة</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block font-medium">التنزيل</span>
                    <div className="flex items-center justify-center gap-1 font-bold text-slate-800 text-sm mt-0.5">
                      <Download className="w-4 h-4 text-sky-500" />
                      <span>{resource?.downloadCount || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons Row */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {isInteractive ? (
                    <button
                      onClick={() => {
                        onClose();
                        onLaunch(resource);
                      }}
                      className="flex-1 min-w-[140px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-600 hover:to-cyan-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-sky-500/20 transition-all cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>تشغيل المحاكاة</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => downloadResource(resource)}
                      className="flex-1 min-w-[140px] py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>فتح المورد</span>
                    </button>
                  )}

                  <button
                    onClick={() => downloadResource(resource)}
                    className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل المورد</span>
                  </button>

                  <button
                    onClick={() => toggleFavorite(safeId)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isFavorite
                        ? 'bg-rose-50 border-rose-200 text-rose-600'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                    title={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                  >
                    <Heart className={`w-5 h-5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>

                  <button
                    onClick={handleShare}
                    className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    title="مشاركة"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Embedded Resource Preview Section (Requirement #12) */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
              <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4 text-sky-600" />
                <span>معاينة المحتوى التعليمي للمورد</span>
              </h4>

              {isInteractive ? (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 h-72 sm:h-84 shadow-inner">
                    <iframe
                      srcDoc={previewHtml || undefined}
                      src={!previewHtml && resource?.fileUrl && resource.fileUrl.startsWith('http') && !resource.fileUrl.startsWith('https://images.unsplash.com') ? resource.fileUrl : undefined}
                      title={safeTitle}
                      className="w-full h-full border-none bg-slate-950"
                      sandbox="allow-scripts allow-forms allow-popups"
                    />
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-slate-900/90 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold flex items-center gap-1 shadow-md">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        معاينة تفاعلية نشطة
                      </span>
                      <button
                        onClick={() => {
                          onClose();
                          onLaunch(resource);
                        }}
                        className="px-3 py-1 rounded-full bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold shadow-md flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-white" />
                        <span>تشغيل بملء الشاشة</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span>بيئة تشغيل تفاعلية معزولة وآمنة (HTML5 Sandbox)</span>
                    <button
                      onClick={() => {
                        onClose();
                        onLaunch(resource);
                      }}
                      className="text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>فتح مشغل المحاكاة الكامل</span>
                      <span>←</span>
                    </button>
                  </div>
                </div>
              ) : resource?.previewType === 'video' ? (
                <div className="rounded-xl overflow-hidden bg-black text-white text-center p-6">
                  <Video className="w-12 h-12 text-sky-400 mx-auto mb-2" />
                  <p className="text-xs font-bold">فيديو تعليمي عالي الدقة</p>
                  <p className="text-[11px] text-slate-400 mt-1">مشغل الفيديو التعليمي جاهز للعرض</p>
                </div>
              ) : (
                <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xs">
                      PDF
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{resource?.fileName || safeTitle}</p>
                      <span className="text-[10px] text-slate-400">مستند تعليمي معتمد وجاهز للطباعة والتحميل</span>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadResource(resource)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    تحميل الملف
                  </button>
                </div>
              )}
            </div>

            {/* Interactive Rating Component */}
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-amber-900 mb-1">تقييم المورد التعليمي</h4>
                <p className="text-xs text-amber-700">
                  شارك برأيك لمساعدة المعلمين والطلاب في اختيار أفضل الموارد
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => handleRate(star)}
                    className="p-1 text-slate-300 hover:scale-125 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${
                        (hoverRating || (resource?.ratingAverage || 0)) >= star
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Metadata Grid */}
            <div>
              <h4 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-600" />
                <span>بيانات المنهاج والتصنيف</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-1">المنهج الدراسي:</span>
                  <span className="font-bold text-slate-800">{safeCurriculum}</span>
                </div>

                {safeUnit && safeUnit !== 'الوحدة التعليمية' && safeUnit !== 'عام' && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-400 block mb-1">الوحدة التعليمية:</span>
                    <span className="font-bold text-slate-800">{safeUnit}</span>
                  </div>
                )}

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-1">الموضوع / الدرس:</span>
                  <span className="font-bold text-slate-800">{safeTopic}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-1">المؤلف / المُدرج:</span>
                  <span className="font-bold text-slate-800">{safeAuthor}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-1">الإصدار الحالي:</span>
                  <span className="font-bold text-slate-800">{resource?.version || 'الإصدار 1.0'}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-1">تاريخ النشر:</span>
                  <span className="font-bold text-slate-800">
                    {safeFormatDate(resource?.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Tags */}
            {safeTags.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  <span>الكلمات المفتاحية</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {safeTags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Accordion: Version History */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowVersions(!showVersions)}
                className="w-full px-4 py-3 bg-slate-50 flex items-center justify-between text-slate-700 hover:bg-slate-100 transition-colors font-bold text-sm cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-500" />
                  <span>سجل الإصدارات والتحديثات ({safeVersions.length})</span>
                </span>
                {showVersions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showVersions && (
                <div className="p-4 space-y-3 bg-white divide-y divide-slate-100 text-xs">
                  {safeVersions.map((ver, idx) => (
                    <div key={idx} className="pt-2 first:pt-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800">{ver?.versionNumber || 'الإصدار 1.0'}</span>
                        <span className="text-slate-400">{safeFormatDate(ver?.createdAt)}</span>
                      </div>
                      <p className="text-slate-600">{ver?.changeNotes || ''}</p>
                      <span className="text-[11px] text-slate-400 mt-1 block">بواسطة: {ver?.createdBy || safeAuthor}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Accordion: Review Notes (Visible if any notes exist) */}
            {safeReviewNotes.length > 0 && (
              <div className="border border-amber-200 rounded-2xl overflow-hidden bg-amber-50/40">
                <button
                  onClick={() => setShowReviews(!showReviews)}
                  className="w-full px-4 py-3 bg-amber-100/60 flex items-center justify-between text-amber-900 font-bold text-sm cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-amber-600" />
                    <span>ملاحظات المراجعة والاعتماد ({safeReviewNotes.length})</span>
                  </span>
                  {showReviews ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showReviews && (
                  <div className="p-4 space-y-3 bg-white divide-y divide-amber-100 text-xs">
                    {safeReviewNotes.map((note) => (
                      <div key={note.id} className="pt-2 first:pt-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-amber-800">{note?.reviewerName || 'المراجع'}</span>
                          <span className="text-slate-400">{safeFormatDate(note?.createdAt)}</span>
                        </div>
                        <p className="text-slate-700 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                          "{note?.comment || ''}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Related Resources Section (Requirement #12) */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-600" />
                <span>الموارد المرتبطة (Related Resources)</span>
              </h4>

              {similar.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {similar.map((rec) => {
                    if (!rec) return null;
                    const recThumb = rec.thumbnailUrl || (rec as any).thumbnail_url || (rec as any).image_url || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80';
                    return (
                      <div
                        key={rec.id}
                        onClick={() => openResource?.(rec)}
                        className="p-3 rounded-2xl border border-slate-200/80 hover:border-cyan-400 hover:shadow-md transition-all cursor-pointer bg-slate-50 hover:bg-white flex flex-col justify-between"
                      >
                        <div>
                          <img
                            src={recThumb}
                            alt={rec.title || ''}
                            className="w-full h-24 object-cover rounded-xl mb-2"
                          />
                          <h5 className="text-xs font-bold text-slate-800 line-clamp-1 mb-1">
                            {rec.title || 'مورد علمي'}
                          </h5>
                          <span className="text-[10px] text-cyan-600 font-semibold block">
                            {rec.gradeName || ''} • {rec.subjectName || ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-500">
                          <span>{rec.resourceType || rec.type || ''}</span>
                          <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                            <Star className="w-2.5 h-2.5 fill-amber-400" />
                            {rec.ratingAverage ? rec.ratingAverage.toFixed(1) : 'جديد'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-2xl text-center text-xs text-slate-500 font-medium">
                  لا توجد موارد مرتبطة حاليًا
                </div>
              )}
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </div>
  );
};

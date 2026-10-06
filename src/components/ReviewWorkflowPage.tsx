import React, { useState } from 'react';
import { useResources } from '../context/ResourceContext';
import { useAuth } from '../context/AuthContext';
import { ResourceItem, ResourceStatus, isAdminRole } from '../types';
import {
  ClipboardCheck,
  CheckCircle2,
  RotateCcw,
  XCircle,
  Eye,
  Play,
  MessageSquare,
  Sparkles,
  Calendar,
  User,
  Send,
  Globe,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ReviewWorkflowPageProps {
  onOpenDetails: (res: ResourceItem) => void;
  onLaunch: (res: ResourceItem) => void;
}

export const ReviewWorkflowPage: React.FC<ReviewWorkflowPageProps> = ({
  onOpenDetails,
  onLaunch
}) => {
  const { resources, reviewResource, publishResource, startReview, showToast } = useResources();
  const { role } = useAuth();

  const [selectedRes, setSelectedRes] = useState<ResourceItem | null>(null);
  const [reviewAction, setReviewAction] = useState<ResourceStatus | null>(null);
  const [commentText, setCommentText] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'submitted' | 'under_review' | 'needs_revision' | 'approved'>('all');
  const [expandedNotesId, setExpandedNotesId] = useState<string | null>(null);

  // Filter items in review queue
  const queueItems = resources.filter(r => {
    if (filterTab === 'submitted' || filterTab === 'pending') return r.status === 'submitted' || r.status === 'pending';
    if (filterTab === 'under_review') return r.status === 'under_review';
    if (filterTab === 'needs_revision') return r.status === 'needs_revision';
    if (filterTab === 'approved') return r.status === 'approved';
    return r.status === 'pending' || r.status === 'submitted' || r.status === 'under_review' || r.status === 'needs_revision' || r.status === 'approved';
  });

  const openActionDialog = (res: ResourceItem, action: ResourceStatus) => {
    setSelectedRes(res);
    setReviewAction(action);
    if (action === 'needs_revision') {
      setCommentText('يرجى تعديل وصف المورد وإعادة إرساله للمراجعة.');
    } else if (action === 'rejected') {
      setCommentText('عذراً، المورد لا يتوافق مع المعايير العلمية المعتمدة للمنصة.');
    } else if (action === 'approved') {
      setCommentText('تم فحص المورد واعتماده بنجاح لمطابقته للمواصفات التربوية والعلمية المعتمدة.');
    } else {
      setCommentText('');
    }
  };

  const handleExecuteAction = () => {
    if (!selectedRes || !reviewAction) return;

    if (reviewAction === 'needs_revision' && !commentText.trim()) {
      showToast('يرجى كتابة ملاحظات المراجعة وتحديد التعديلات المطلوبة لإرجاع المورد.', 'warning');
      return;
    }

    reviewResource(selectedRes.id, reviewAction, commentText.trim());
    setSelectedRes(null);
    setReviewAction(null);
    setCommentText('');
  };

  const handleDirectPublish = (id: string) => {
    publishResource(id);
  };

  const handleStartReview = (id: string) => {
    startReview(id);
  };

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in">
      
      {/* Page Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-800 text-xs font-bold mb-2">
            <ClipboardCheck className="w-4 h-4 text-amber-600" />
            <span>لجنة التحكيم والمراجعة الأكاديمية</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            مراجعة الموارد التعليمية
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            مراجعة، تدقيق، اعتماد، ونشر الموارد المقدمة وفق معايير مدرسة محلاح للبنات (5–12)
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold self-start md:self-auto">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filterTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الكل ({resources.filter(r => r.status !== 'published' && r.status !== 'draft').length})
          </button>
          <button
            onClick={() => setFilterTab('pending')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filterTab === 'pending' || filterTab === 'submitted' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            قيد المراجعة ({resources.filter(r => r.status === 'pending' || r.status === 'submitted').length})
          </button>
          <button
            onClick={() => setFilterTab('under_review')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filterTab === 'under_review' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            قيد المراجعة ({resources.filter(r => r.status === 'under_review').length})
          </button>
          <button
            onClick={() => setFilterTab('needs_revision')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filterTab === 'needs_revision' ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            تحتاج تعديل ({resources.filter(r => r.status === 'needs_revision').length})
          </button>
          <button
            onClick={() => setFilterTab('approved')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filterTab === 'approved' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            معتمدة ({resources.filter(r => r.status === 'approved').length})
          </button>
        </div>
      </div>

      {/* Queue Table / Cards */}
      {queueItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">لا توجد موارد مطابقة في قائمة المراجعة</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            جميع الموارد التعليمية المرفوعة تمت مراجعتها وتدقيقها وفق الصلاحيات المعطاة.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {queueItems.map((res) => (
            <div
              key={res.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/90 hover:border-amber-300 shadow-xs hover:shadow-lg transition-all flex flex-col gap-4"
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                
                {/* Resource Basic Info */}
                <div className="flex items-start gap-4 flex-1">
                  <img
                    src={res.thumbnailUrl}
                    alt={res.title}
                    className="w-20 h-20 rounded-2xl object-cover shrink-0 shadow-sm"
                  />

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900">{res.title}</h3>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        res.status === 'pending' || res.status === 'submitted'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : res.status === 'under_review'
                          ? 'bg-sky-100 text-sky-800 border border-sky-200'
                          : res.status === 'needs_revision'
                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                          : res.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {res.status === 'pending' || res.status === 'submitted' ? 'قيد المراجعة' : res.status === 'under_review' ? 'قيد المراجعة الفعالة' : res.status === 'needs_revision' ? 'يحتاج إلى تعديل' : res.status === 'approved' ? 'معتمد' : 'مسودة'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 max-w-2xl leading-relaxed">
                      {res.description}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-500 pt-1 flex-wrap">
                      <span className="font-semibold text-sky-700">{res.gradeName}</span>
                      <span>•</span>
                      <span className="font-semibold text-purple-700">{res.subjectName}</span>
                      <span>•</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                        {res.resourceType}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{res.authorName}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(res.createdAt).toLocaleDateString('ar-OM')}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reviewer Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 self-end lg:self-center shrink-0">
                  <button
                    onClick={() => onOpenDetails(res)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>معاينة</span>
                  </button>

                  {res.htmlContent && (
                    <button
                      onClick={() => onLaunch(res)}
                      className="px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-sky-600" />
                      <span>تشغيل المحاكاة</span>
                    </button>
                  )}

                  {/* Start Review (moves from pending/submitted to under_review) */}
                  {(res.status === 'submitted' || res.status === 'pending') && (
                    <button
                      onClick={() => handleStartReview(res.id)}
                      className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>بدء المراجعة</span>
                    </button>
                  )}

                  {/* Approve Button */}
                  {res.status !== 'approved' && (
                    <button
                      onClick={() => openActionDialog(res, 'approved')}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>اعتماد</span>
                    </button>
                  )}

                  {/* Publish Button (Only Administrator can publish to production library) */}
                  {isAdminRole(role) && res.status === 'approved' && (
                    <button
                      onClick={() => handleDirectPublish(res.id)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-600 hover:to-cyan-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>نشر في المكتبة</span>
                    </button>
                  )}

                  {/* Return for revision */}
                  <button
                    onClick={() => openActionDialog(res, 'needs_revision')}
                    className="px-3.5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-orange-200"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>إرجاع للتعديل</span>
                  </button>

                  {/* Reject */}
                  <button
                    onClick={() => openActionDialog(res, 'rejected')}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>رفض</span>
                  </button>
                </div>
              </div>

              {/* Review History / Notes Accordion */}
              {res.reviewNotes && res.reviewNotes.length > 0 && (
                <div className="pt-2 border-t border-slate-100 text-xs">
                  <button
                    onClick={() => setExpandedNotesId(expandedNotesId === res.id ? null : res.id)}
                    className="flex items-center gap-1 text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                    <span>سجل المراجعة والقرارات السابقة ({res.reviewNotes.length})</span>
                    {expandedNotesId === res.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {expandedNotesId === res.id && (
                    <div className="mt-2 space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {res.reviewNotes.map((note) => (
                        <div key={note.id} className="text-right">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                            <span>{note.reviewerName}</span>
                            <span className="text-slate-400">{new Date(note.createdAt).toLocaleDateString('ar-OM')}</span>
                          </div>
                          <p className="text-slate-600 mt-0.5">"{note.comment}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review Feedback Comment Modal */}
      {selectedRes && reviewAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl text-right animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-600" />
              <span>
                {reviewAction === 'approved' && 'تأكيد اعتماد المورد الأكاديمي'}
                {reviewAction === 'needs_revision' && 'إرجاع المورد للمستخدم مع التوجيهات'}
                {reviewAction === 'rejected' && 'رفض المورد مع توضيح السبب'}
              </span>
            </h3>

            <p className="text-xs text-slate-500 mb-4">
              المورد: <strong>{selectedRes.title}</strong>
            </p>

            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ملاحظات المراجعة الأكاديمية (ستصل كإشعار رسمي لصاحب المورد):
            </label>
            <textarea
              rows={4}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-medium resize-none mb-4"
              placeholder="اكتب التوجيهات أو الملاحظات المطلوبة هنا..."
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => { setSelectedRes(null); setReviewAction(null); }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>

              <button
                onClick={handleExecuteAction}
                className={`px-5 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer ${
                  reviewAction === 'approved'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : reviewAction === 'needs_revision'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>تنفيذ القرار وإرسال الإشعار</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

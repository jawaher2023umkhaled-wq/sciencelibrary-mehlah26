import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useResources } from '../context/ResourceContext';
import { ResourceItem, isAdminRole, getRoleArabicLabel } from '../types';
import { ResourceCard } from './ResourceCard';
import {
  FolderHeart,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  Bookmark,
  Sparkles,
  Eye,
  Send,
  Trash2,
  Bell,
  Edit,
  RotateCcw,
  Check,
  LogIn,
  Lock
} from 'lucide-react';

interface UserDashboardProps {
  onOpenDetails: (res: ResourceItem) => void;
  onLaunch: (res: ResourceItem) => void;
  onOpenInsertModal: () => void;
  onEditResource: (res: ResourceItem) => void;
  onOpenAuthModal?: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  onOpenDetails,
  onLaunch,
  onOpenInsertModal,
  onEditResource,
  onOpenAuthModal
}) => {
  const { user } = useAuth();
  const {
    resources,
    favorites,
    notifications,
    updateResource,
    deleteResource,
    markNotificationAsRead,
    clearNotifications,
    showToast
  } = useResources();

  const [activeTab, setActiveTab] = useState<'my-items' | 'favorites' | 'notifications'>('my-items');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'under_review' | 'draft' | 'needs_revision'>('all');

  // Filter user's resources
  const userResources = resources.filter(
    r => r.authorId === user?.id || r.authorName === user?.displayName || isAdminRole(user?.role)
  );

  const publishedCount = userResources.filter(r => r.status === 'published').length;
  const underReviewCount = userResources.filter(r => r.status === 'pending' || r.status === 'submitted' || r.status === 'under_review').length;
  const draftsCount = userResources.filter(r => r.status === 'draft').length;
  const needsRevisionCount = userResources.filter(r => r.status === 'needs_revision').length;

  const favoriteResources = resources.filter(r => favorites.includes(r.id));
  const unreadNotifsCount = notifications.filter(n => !n.isRead).length;

  const filteredMyResources = userResources.filter(r => {
    if (statusFilter === 'published') return r.status === 'published';
    if (statusFilter === 'under_review') return r.status === 'pending' || r.status === 'submitted' || r.status === 'under_review';
    if (statusFilter === 'draft') return r.status === 'draft';
    if (statusFilter === 'needs_revision') return r.status === 'needs_revision';
    return true;
  });

  const handleSubmitDraft = (res: ResourceItem) => {
    updateResource(res.id, { status: 'pending', user_id: user?.id });
    showToast('تم إرسال المورد للمراجعة بنجاح', 'success');
  };

  if (!user) {
    return (
      <div className="py-16 max-w-lg mx-auto px-4 text-center animate-in fade-in">
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200/90 shadow-md space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-slate-900">يتطلب تسجيل الدخول</h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              يرجى تسجيل الدخول إلى حسابك للوصول إلى لوحة الموارد الشخصية، ومتابعة حالة التحكيم، واستعراض قائمتك المفضلة.
            </p>
          </div>
          {onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-600 to-teal-600 hover:from-sky-600 hover:to-teal-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-sky-500/20 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول للمنصة</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in">
      
      {/* Header Profile Bar */}
      <div className="bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-cyan-900/10 mb-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black">{user?.displayName || 'المستخدم'}</h1>
                <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-bold text-white">
                  {getRoleArabicLabel(user?.role)}
                </span>
              </div>
              <p className="text-xs text-cyan-100 mt-1">{user?.email}</p>
              <p className="text-xs text-sky-100 font-semibold">{user?.school || 'مدرسة محلاح للبنات (5–12)'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('notifications')}
              className="px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm transition-all flex items-center gap-2 cursor-pointer border border-white/20"
            >
              <Bell className="w-5 h-5" />
              <span>الإشعارات</span>
              {unreadNotifsCount > 0 && (
                <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            <button
              onClick={onOpenInsertModal}
              className="px-5 py-3 rounded-2xl bg-white text-sky-700 hover:bg-sky-50 font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-5 h-5 text-sky-600" />
              <span>إدراج مورد جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* User Stats Overview (Dynamic Real Numbers) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center">
          <span className="text-xs text-slate-500 font-bold block mb-1">إجمالي مواردي</span>
          <span className="text-2xl font-black text-slate-900">{userResources.length}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center">
          <span className="text-xs text-emerald-600 font-bold block mb-1">منشورة في المكتبة</span>
          <span className="text-2xl font-black text-emerald-600">{publishedCount}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center">
          <span className="text-xs text-amber-600 font-bold block mb-1">قيد المراجعة</span>
          <span className="text-2xl font-black text-amber-600">{underReviewCount}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center">
          <span className="text-xs text-orange-600 font-bold block mb-1">تحتاج إلى تعديل</span>
          <span className="text-2xl font-black text-orange-600">{needsRevisionCount}</span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 mb-6 pb-2 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('my-items')}
            className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'my-items'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderHeart className="w-4 h-4" />
            <span>الموارد التي أدرجتها ({userResources.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'favorites'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>المفضلة ({favoriteResources.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'notifications'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>التنبيهات والملاحظات</span>
            {unreadNotifsCount > 0 && (
              <span className="bg-rose-500 text-white text-[11px] px-1.5 py-0.2 rounded-full font-bold">
                {unreadNotifsCount}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'my-items' && (
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                statusFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setStatusFilter('published')}
              className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                statusFilter === 'published' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              المنشورة ({publishedCount})
            </button>
            <button
              onClick={() => setStatusFilter('under_review')}
              className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                statusFilter === 'under_review' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              قيد المراجعة ({underReviewCount})
            </button>
            <button
              onClick={() => setStatusFilter('needs_revision')}
              className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                statusFilter === 'needs_revision' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              تحتاج تعديل ({needsRevisionCount})
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                statusFilter === 'draft' ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              المسودات ({draftsCount})
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: User's Resources */}
      {activeTab === 'my-items' && (
        <div>
          {filteredMyResources.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">لا توجد موارد مطابقة في هذه الفئة</h3>
              <p className="text-xs text-slate-500 mb-6">
                يمكنك إدراج مورد جديد كمسودة أو إرساله مباشرة لمراجعة واعتماد المنصة.
              </p>
              <button
                onClick={onOpenInsertModal}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
              >
                إدراج أول مورد
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredMyResources.map((resource) => (
                <div key={resource.id} className="relative flex flex-col justify-between">
                  <ResourceCard
                    resource={resource}
                    onOpenDetails={onOpenDetails}
                    onLaunch={onLaunch}
                  />

                  {/* Creator Action Bar: Edit, Submit Draft, Delete */}
                  {(resource.status === 'draft' || resource.status === 'needs_revision') && (
                    <div className="mt-2.5 p-2 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs gap-1.5">
                      <button
                        onClick={() => onEditResource(resource)}
                        className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-1 border border-slate-200 transition-colors cursor-pointer"
                        title="تعديل بيانات المورد"
                      >
                        <Edit className="w-3.5 h-3.5 text-sky-600" />
                        <span>تعديل</span>
                      </button>

                      <button
                        onClick={() => handleSubmitDraft(resource)}
                        className="flex-1 py-1.5 px-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
                        title="إرسال للتحكيم"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>إرسال</span>
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm('هل ترغب بحذف هذه المسودة؟')) {
                            deleteResource(resource.id);
                          }
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Reviewer Note Callout if status is needs_revision */}
                  {resource.status === 'needs_revision' && resource.reviewNotes && resource.reviewNotes.length > 0 && (
                    <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-2xl text-xs text-orange-950">
                      <div className="flex items-center gap-1 font-bold text-orange-800 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>توجيهات المراجع:</span>
                      </div>
                      <p className="line-clamp-2 leading-relaxed">{resource.reviewNotes[0].comment}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Favorite Resources */}
      {activeTab === 'favorites' && (
        <div>
          {favoriteResources.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
                <Bookmark className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">لم تتم إضافة موارد إلى المفضلة بعد</h3>
              <p className="text-xs text-slate-500">
                يمكنك الضغط على أيقونة القلب على أي مورد في المكتبة للرجوع إليه بسرعة هنا.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {favoriteResources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  onOpenDetails={onOpenDetails}
                  onLaunch={onLaunch}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Notifications Center */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">مركز التنبيهات وإشعارات المراجعة</h3>
              <p className="text-xs text-slate-500">الإشعارات الواردة بخصوص قرارات اعتماد ونشر الموارد</p>
            </div>

            {notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                className="text-xs font-bold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
              >
                مسح كل الإشعارات
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Bell className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p>لا توجد إشعارات جديدة حالياً.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markNotificationAsRead(notif.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                    notif.isRead
                      ? 'bg-slate-50 border-slate-200/80 text-slate-600'
                      : notif.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950 font-medium'
                      : notif.type === 'warning'
                      ? 'bg-orange-50 border-orange-200 text-orange-950 font-medium'
                      : 'bg-sky-50 border-sky-200 text-sky-950 font-medium'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{notif.title}</span>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-cyan-600 animate-pulse"></span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed">{notif.message}</p>
                    <span className="text-[10px] text-slate-400 block pt-1">
                      {new Date(notif.createdAt).toLocaleDateString('ar-OM', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {!notif.isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markNotificationAsRead(notif.id);
                      }}
                      className="p-1 rounded-lg bg-white border text-slate-500 hover:text-slate-800"
                      title="تحديد كمقروء"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

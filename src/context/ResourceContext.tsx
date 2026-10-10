import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ResourceItem,
  LibraryFilterState,
  ResourceStatus,
  UserNotification,
  ResourceTypeItem,
  CurriculumItem,
  UnitItem,
  TopicItem,
  GradeItem,
  SubjectItem,
  AuditLogItem
} from '../types';
import { storageService } from '../services/storageService';
import { supabase } from '../services/supabase';
import { supabaseResourceService, generateUuid, isValidUuid } from '../services/supabaseResourceService';
import { supabaseNotificationService } from '../services/supabaseNotificationService';
import { useAuth } from './AuthContext';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface ResourceContextType {
  resources: ResourceItem[];
  isSupabaseLive: boolean;
  isSyncingWithSupabase: boolean;
  reloadLiveResources: () => Promise<void>;
  syncAllWithSupabase: () => Promise<number>;
  resourceTypes: ResourceTypeItem[];
  curricula: CurriculumItem[];
  units: UnitItem[];
  topics: TopicItem[];
  grades: GradeItem[];
  subjects: SubjectItem[];
  auditLogs: AuditLogItem[];
  favorites: string[];
  filters: LibraryFilterState;
  activeResource: ResourceItem | null;
  editingResource: ResourceItem | null;
  sandboxResource: ResourceItem | null;
  isSandboxOpen: boolean;
  toasts: ToastMessage[];
  notifications: UserNotification[];
  setFilters: (newFilters: Partial<LibraryFilterState>) => void;
  resetFilters: () => void;
  setActiveResource: (resource: ResourceItem | null) => void;
  setEditingResource: (resource: ResourceItem | null) => void;
  openResource: (resource: ResourceItem) => void;
  launchResource: (resource: ResourceItem) => void;
  closeSandbox: () => void;
  toggleFavorite: (resourceId: string) => void;
  rateResource: (resourceId: string, score: number) => void;
  createResource: (resourceData: Omit<ResourceItem, 'id' | 'createdAt' | 'updatedAt' | 'ratingAverage' | 'ratingCount' | 'usageCount' | 'downloadCount'> & { id?: string }) => Promise<ResourceItem | null>;
  updateResource: (id: string, updates: Partial<ResourceItem>) => void;
  startReview: (id: string) => void;
  reviewResource: (id: string, status: ResourceStatus, comment: string) => void;
  publishResource: (id: string) => void;
  unpublishResource: (id: string) => void;
  archiveResource: (id: string) => void;
  restoreResource: (id: string) => void;
  duplicateResource: (id: string) => ResourceItem | null;
  deleteResource: (id: string) => void;
  downloadResource: (resource: ResourceItem) => void;
  addResourceType: (item: Omit<ResourceTypeItem, 'id'>) => void;
  deleteResourceType: (id: string) => void;
  addCurriculum: (item: Omit<CurriculumItem, 'id'>) => void;
  updateCurriculum: (id: string, updates: Partial<CurriculumItem>) => void;
  deleteCurriculum: (id: string) => { success: boolean; message?: string };
  toggleCurriculumActive: (id: string) => void;
  addGrade: (item: Omit<GradeItem, 'id'>) => void;
  updateGrade: (id: string, updates: Partial<GradeItem>) => void;
  deleteGrade: (id: string) => { success: boolean; message?: string };
  toggleGradeActive: (id: string) => void;
  reorderGrades: (grades: GradeItem[]) => void;
  addSubject: (item: Omit<SubjectItem, 'id'>) => void;
  updateSubject: (id: string, updates: Partial<SubjectItem>) => void;
  deleteSubject: (id: string) => { success: boolean; message?: string };
  toggleSubjectActive: (id: string) => void;
  reorderSubjects: (subjects: SubjectItem[]) => void;
  addUnit: (item: Omit<UnitItem, 'id'>) => void;
  updateUnit: (id: string, updates: Partial<UnitItem>) => void;
  deleteUnit: (id: string) => { success: boolean; message?: string };
  toggleUnitActive: (id: string) => void;
  reorderUnits: (units: UnitItem[]) => void;
  addTopic: (item: Omit<TopicItem, 'id'>) => void;
  updateTopic: (id: string, updates: Partial<TopicItem>) => void;
  deleteTopic: (id: string) => { success: boolean; message?: string };
  toggleTopicActive: (id: string) => void;
  reorderTopics: (topics: TopicItem[]) => void;
  uploadNewVersion: (resourceId: string, versionNumber: string, changeNotes: string, fileUrl?: string) => void;
  bulkImportResources: (items: Array<Omit<ResourceItem, 'id' | 'createdAt' | 'updatedAt' | 'ratingAverage' | 'ratingCount' | 'usageCount' | 'downloadCount'>>) => number;
  findPotentialDuplicates: (title: string, fileName?: string, fileSize?: string) => ResourceItem[];
  exportResourcesData: (format: 'json' | 'csv') => string;
  addAuditLog: (item: Omit<AuditLogItem, 'id' | 'timestamp'>) => void;
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
  getRecommendedResources: (resource?: ResourceItem | null) => ResourceItem[];
  getSimilarResources: (resource: ResourceItem) => ResourceItem[];
  refreshResources: () => void;
  refreshCurriculum: () => void;
  refreshGradesAndSubjects: () => void;
  refreshAuditLogs: () => void;
}

const DEFAULT_FILTERS: LibraryFilterState = {
  searchQuery: '',
  gradeId: '',
  subjectId: '',
  curriculumId: '',
  resourceType: '',
  unit: '',
  topic: '',
  author: '',
  minRating: 0,
  sortBy: 'newest'
};

const ResourceContext = createContext<ResourceContextType | undefined>(undefined);

export const ResourceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [resourceTypes, setResourceTypes] = useState<ResourceTypeItem[]>([]);
  const [curricula, setCurricula] = useState<CurriculumItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [filters, setFiltersState] = useState<LibraryFilterState>(DEFAULT_FILTERS);
  const [activeResource, setActiveResource] = useState<ResourceItem | null>(null);
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null);
  const [sandboxResource, setSandboxResource] = useState<ResourceItem | null>(null);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSupabaseLive, setIsSupabaseLive] = useState<boolean>(false);
  const [isSyncingWithSupabase, setIsSyncingWithSupabase] = useState<boolean>(false);

  // Requirement 3: Always fetch the latest live records directly from Supabase on platform load
  const reloadLiveResources = async () => {
    setIsSyncingWithSupabase(true);
    try {
      const { data, isLive, error } = await supabaseResourceService.fetchLiveResources();
      if (isLive) {
        // Real database records directly populate the UI from Supabase public.resources
        setResources(data);
        storageService.saveResources(data);
        setIsSupabaseLive(true);
      } else {
        console.error('Supabase fetch live error:', error);
        setIsSupabaseLive(false);
        // Do not use mock or unverified local data if Supabase reports error
        setResources([]);
        if (error) {
          showToast(`تنبيه جلب البيانات من Supabase: ${error}`, 'error');
        }
      }
    } catch (e) {
      console.error('Supabase fetch exception:', e);
      setIsSupabaseLive(false);
      setResources([]);
    } finally {
      setIsSyncingWithSupabase(false);
    }
  };

  const syncAllWithSupabase = async (): Promise<number> => {
    setIsSyncingWithSupabase(true);
    try {
      const currentList = resources.length > 0 ? resources : storageService.getResources();
      const res = await supabaseResourceService.syncBatchToSupabase(currentList);
      if (res.count > 0) {
        setIsSupabaseLive(true);
        showToast(`تمت مزامنة وحفظ ${res.count} مورد بنجاح في جدول Supabase`, 'success');
      } else if (res.error) {
        showToast(`تنبيه Supabase: ${res.error} (يرجى تنفيذ ملف SQL في لوحة Supabase)`, 'warning');
      }
      return res.count;
    } finally {
      setIsSyncingWithSupabase(false);
    }
  };

  const refreshResources = () => {
    // Keep UI strictly connected to authoritative database
    reloadLiveResources();
  };

  const refreshResourceTypes = () => {
    const types = storageService.getResourceTypes();
    setResourceTypes([...types]);
  };

  const refreshCurriculum = () => {
    setCurricula(storageService.getCurricula());
    setUnits(storageService.getUnits());
    setTopics(storageService.getTopics());
  };

  const refreshGradesAndSubjects = () => {
    setGrades(storageService.getGrades());
    setSubjects(storageService.getSubjects());
  };

  const refreshAuditLogs = () => {
    setAuditLogs(storageService.getAuditLogs());
  };

  const refreshNotifications = async () => {
    if (user) {
      try {
        const res = await supabaseNotificationService.fetchUserNotifications(user.id, user.email);
        if (res.isLive) {
          setNotifications(res.data);
          return;
        }
      } catch (e) {
        console.warn('Failed to fetch notifications from Supabase:', e);
      }
      // Strictly do not display unverified localStorage notifications
      setNotifications([]);
    } else {
      setNotifications([]);
    }
  };

  useEffect(() => {
    reloadLiveResources();
    refreshResourceTypes();
    refreshCurriculum();
    refreshGradesAndSubjects();
    refreshAuditLogs();
  }, []);

  useEffect(() => {
    if (user) {
      setFavorites(storageService.getFavorites(user.id));
      refreshNotifications();
    } else {
      setFavorites([]);
      setNotifications([]);
    }
  }, [user]);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const markNotificationAsRead = async (id: string) => {
    if (!user) return;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    try {
      await supabaseNotificationService.markAsRead(id);
    } catch (e) {
      console.warn('Supabase markAsRead error:', e);
    }
    storageService.markNotificationAsRead(user.id, id);
  };

  const clearNotifications = async () => {
    if (!user) return;
    setNotifications([]);
    try {
      await supabaseNotificationService.markAllAsRead(user.id);
    } catch (e) {
      console.warn('Supabase markAllAsRead error:', e);
    }
    storageService.clearNotifications(user.id);
  };

  const setFilters = (newFilters: Partial<LibraryFilterState>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFiltersState(DEFAULT_FILTERS);
  };

  const openResource = (resource: ResourceItem) => {
    storageService.incrementUsage(resource.id, 'open');
    setActiveResource(resource);
    refreshResources();
  };

  const launchResource = (resource: ResourceItem) => {
    storageService.incrementUsage(resource.id, 'launch');
    setSandboxResource(resource);
    setIsSandboxOpen(true);
    refreshResources();
  };

  const closeSandbox = () => {
    setIsSandboxOpen(false);
    setSandboxResource(null);
  };

  const toggleFavorite = (resourceId: string) => {
    if (!user) {
      showToast('يرجى تسجيل الدخول لحفظ المورد في المفضلة', 'warning');
      return;
    }
    const isFav = storageService.toggleFavorite(user.id, resourceId);
    setFavorites(storageService.getFavorites(user.id));
    refreshResources();
    if (isFav) {
      showToast('تمت إضافة المورد إلى المفضلة', 'success');
    } else {
      showToast('تمت إزالة المورد من المفضلة', 'info');
    }
  };

  const rateResource = (resourceId: string, score: number) => {
    if (!user) {
      showToast('يرجى تسجيل الدخول لتقييم المورد', 'warning');
      return;
    }
    storageService.rateResource(user.id, resourceId, score);
    refreshResources();
    if (activeResource && activeResource.id === resourceId) {
      const updated = storageService.getResourceById(resourceId);
      if (updated) setActiveResource(updated);
    }
    showToast('شكراً لك، تم تسجيل تقييمك بنجاح', 'success');
  };

  const createResource = async (resourceData: Omit<ResourceItem, 'id' | 'createdAt' | 'updatedAt' | 'ratingAverage' | 'ratingCount' | 'usageCount' | 'downloadCount'> & { id?: string }): Promise<ResourceItem | null> => {
    // 1. Verify authenticated Supabase session to get actual auth.uid() UUID
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    const sessionUser = sessionData?.session?.user;
    if (sessionErr || !sessionUser) {
      showToast('يجب تسجيل الدخول أولاً بحساب معتمد في Supabase لإدراج مورد.', 'warning');
      return null;
    }

    const sessionEmail = (sessionUser.email || '').trim().toLowerCase();
    const isAdmin = sessionEmail === 'sciencelibrary8@gmail.com';
    const authUserId = sessionUser.id; // True UUID from Supabase Auth

    const newId = resourceData.id && isValidUuid(resourceData.id) ? resourceData.id : generateUuid();
    const now = new Date().toISOString();

    // Rule: regular user => status = 'pending', published_at = null, user_id = auth.uid()
    const effectiveStatus: ResourceStatus = isAdmin
      ? (resourceData.status || 'published')
      : 'pending';

    const effectivePublishedAt = (isAdmin && effectiveStatus === 'published')
      ? (resourceData.publishedAt || now)
      : undefined;

    const effectiveThumb = resourceData.thumbnailUrl || (resourceData as any).thumbnail_url || (resourceData as any).image_url || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80';

    const preparedResource: ResourceItem = {
      ...resourceData,
      id: newId,
      status: effectiveStatus,
      user_id: authUserId,
      authorId: authUserId,
      authorName: resourceData.authorName || sessionUser.user_metadata?.displayName || user?.displayName || (isAdmin ? 'مدير مكتبة العلوم الرقمية' : sessionEmail.split('@')[0]),
      author: resourceData.author || resourceData.authorName || user?.displayName,
      thumbnailUrl: effectiveThumb,
      thumbnail_url: effectiveThumb,
      image_url: effectiveThumb,
      ratingAverage: 0,
      ratingCount: 0,
      usageCount: 0,
      downloadCount: 0,
      createdAt: now,
      updatedAt: now,
      publishedAt: effectivePublishedAt,
      versions: [
        {
          versionNumber: resourceData.version || 'الإصدار 1.0',
          fileUrl: resourceData.fileUrl,
          changeNotes: 'الإنشاء الأولي للمورد',
          createdAt: now,
          createdBy: resourceData.authorName || user?.displayName || 'مكتبة العلوم الرقمية'
        }
      ]
    };

    // Direct persistence to Supabase resources table (Authoritative Save)
    const { data: savedRecord, savedToSupabase, error } = await supabaseResourceService.createResource(preparedResource);

    if (savedToSupabase && savedRecord) {
      // ONLY update UI React state AFTER confirmed database response
      setResources(prev => [savedRecord, ...prev.filter(r => r.id !== savedRecord.id)]);
      setIsSupabaseLive(true);

      // Keep cache in sync only after confirmed database save
      const currentList = storageService.getResources().filter(r => r.id !== savedRecord.id);
      storageService.saveResources([savedRecord, ...currentList]);

      // Audit log
      storageService.addAuditLog({
        actorId: authUserId,
        userId: authUserId,
        actorName: preparedResource.authorName,
        action: effectiveStatus === 'published' ? 'publish' : 'submit',
        resourceId: savedRecord.id,
        resourceTitle: savedRecord.title,
        details: effectiveStatus === 'published' ? 'إنشاء المورد ونشره مباشرة كمسؤول' : 'إنشاء المورد وإرساله للتحكيم (قيد المراجعة)'
      });

      // Notification
      if (effectiveStatus === 'pending') {
        const notifPayload = {
          userId: authUserId,
          title: 'تم إرسال المورد للمراجعة',
          message: `تم استلام المورد "${savedRecord.title}" بنجاح وإحالته إلى لجنة التحكيم وحالته الآن قيد المراجعة.`,
          resourceId: savedRecord.id,
          type: 'info' as const
        };
        supabaseNotificationService.addNotification(notifPayload).catch(console.warn);
        storageService.addNotification(notifPayload);
        refreshNotifications();
      }

      showToast(
        effectiveStatus === 'published'
          ? 'تم حفظ ونشر المورد بنجاح في قاعدة بيانات Supabase'
          : 'تم حفظ المورد وإرساله للمراجعة بنجاح في قاعدة بيانات Supabase (قيد المراجعة)',
        'success'
      );
      return savedRecord;
    } else {
      console.error('Supabase create persistence failure:', error);
      // Ensure the resource is NOT in UI state and NOT in cache
      setResources(prev => prev.filter(r => r.id !== newId));
      storageService.deleteResource(newId);
      const actionableError = error || 'تعذر حفظ المورد في Supabase.';
      showToast(`فشل حفظ المورد في Supabase: ${actionableError}`, 'error');
      return null;
    }
  };

  const updateResource = (id: string, updates: Partial<ResourceItem>) => {
    const previousResource = resources.find(r => r.id === id);

    const effectiveThumb = updates.thumbnailUrl || (updates as any).thumbnail_url || (updates as any).image_url;
    const isPendingReview = updates.status === 'pending' || updates.status === 'submitted';
    const effectiveStatus: ResourceStatus | undefined = isPendingReview ? 'pending' : updates.status;

    const normalizedUpdates: Partial<ResourceItem> = {
      ...updates,
      ...(effectiveStatus !== undefined ? { status: effectiveStatus } : {}),
      ...(effectiveThumb ? {
        thumbnailUrl: effectiveThumb,
        thumbnail_url: effectiveThumb,
        image_url: effectiveThumb
      } : {})
    };

    // 1. Keep reference to previous state for reliable rollback
    if (!previousResource) return;

    // 2. Check if this update contains database columns
    // Confirmed columns in public.resources:
    // id, title, description, subject, grade, type, url, download_url, created_at, status, user_id, published_at
    const hasDatabaseColumns =
      updates.title !== undefined ||
      updates.description !== undefined ||
      updates.subjectName !== undefined ||
      updates.subjectId !== undefined ||
      updates.gradeName !== undefined ||
      updates.gradeId !== undefined ||
      updates.resourceType !== undefined ||
      updates.type !== undefined ||
      updates.htmlContent !== undefined ||
      updates.fileUrl !== undefined ||
      updates.status !== undefined ||
      (updates as any).publishedAt !== undefined ||
      (updates as any).published_at !== undefined ||
      (updates as any).url !== undefined ||
      (updates as any).download_url !== undefined;

    // Optimistically update local React state
    const optimisticResource: ResourceItem = {
      ...previousResource,
      ...normalizedUpdates,
      ...(effectiveThumb ? {
        thumbnailUrl: effectiveThumb,
        thumbnail_url: effectiveThumb,
        image_url: effectiveThumb
      } : {})
    };

    setResources(prev => prev.map(r => r.id === id ? optimisticResource : r));
    if (activeResource && activeResource.id === id) {
      setActiveResource(optimisticResource);
    }

    // 3. Direct persistence to Supabase resources table if DB columns are modified
    if (hasDatabaseColumns) {
      supabaseResourceService.updateResource(id, normalizedUpdates).then(({ data: savedRecord, savedToSupabase, error }) => {
        if (savedToSupabase && savedRecord) {
          setIsSupabaseLive(true);
          const finalRecord: ResourceItem = {
            ...savedRecord,
            ...(effectiveThumb ? {
              thumbnailUrl: effectiveThumb,
              thumbnail_url: effectiveThumb,
              image_url: effectiveThumb
            } : {})
          };

          storageService.updateResource(id, finalRecord);

          setResources(prev => prev.map(r => r.id === id ? { ...r, ...finalRecord } : r));
          if (activeResource && activeResource.id === id) {
            setActiveResource(prev => prev && prev.id === id ? { ...prev, ...finalRecord } : null);
          }
          refreshNotifications();
          showToast('تم تحديث بيانات المورد في Supabase بنجاح', 'success');
        } else {
          console.error('Supabase update persistence failure:', error);
          // Rollback optimistic React state on failure
          setResources(prev => prev.map(r => r.id === id ? previousResource : r));
          if (activeResource && activeResource.id === id) {
            setActiveResource(previousResource);
          }
          storageService.updateResource(id, previousResource);
          refreshNotifications();
          const actionableError = error || 'لم يتم تحديث أي سجل في قاعدة البيانات (matched 0 rows). قد تكون سياسة RLS تمنع التحديث للحساب الحالي أو أن المورد غير موجود.';
          showToast(`فشل تحديث المورد في Supabase: ${actionableError}`, 'error');
        }
      });
    } else {
      storageService.updateResource(id, optimisticResource);
      refreshNotifications();
    }
  };

  const startReview = async (id: string) => {
    const previous = resources.find(r => r.id === id);
    const { data: savedRecord, savedToSupabase, error } = await supabaseResourceService.updateResource(id, {
      status: 'under_review'
    });

    if (savedToSupabase && savedRecord) {
      setResources(prev => prev.map(r => r.id === id ? { ...r, ...savedRecord, status: 'under_review' } : r));
      storageService.updateResource(id, { status: 'under_review' });
      showToast('بدأت عملية المراجعة الأكاديمية للمورد وتم حفظ الحالة في قاعدة البيانات', 'info');
    } else {
      if (previous) {
        setResources(prev => prev.map(r => r.id === id ? previous : r));
      }
      showToast(`تعذر بدء المراجعة في Supabase: ${error || 'فشل التحديث'}`, 'error');
    }
  };

  const reviewResource = async (id: string, status: ResourceStatus, comment: string) => {
    if (!user) {
      showToast('يرجى تسجيل الدخول أولاً لإجراء المراجعة والتحكيم', 'warning');
      return;
    }
    const previous = resources.find(r => r.id === id);

    // Persist status change to Supabase resources table
    const { data: savedRecord, savedToSupabase, error } = await supabaseResourceService.updateResource(id, {
      status
    });

    if (savedToSupabase && savedRecord) {
      const updated = storageService.reviewResource(id, user.id, user.displayName, status, comment);
      const finalItem = updated ? { ...updated, ...savedRecord, status } : { ...savedRecord, status };
      setResources(prev => prev.map(r => r.id === id ? finalItem : r));
      if (activeResource && activeResource.id === id) {
        setActiveResource(finalItem);
      }
      refreshNotifications();

      if (status === 'approved') {
        showToast('تم اعتماد المورد بنجاح في قاعدة البيانات', 'success');
      } else if (status === 'needs_revision') {
        showToast('تم إرجاع المورد للتعديل وحفظ الحالة في قاعدة البيانات', 'warning');
      } else if (status === 'rejected') {
        showToast('تم رفض المورد وحفظ الحالة في قاعدة البيانات', 'error');
      } else {
        showToast('تم تحديث حالة المورد في Supabase', 'success');
      }
    } else {
      if (previous) {
        setResources(prev => prev.map(r => r.id === id ? previous : r));
      }
      const actionableError = error || 'تعذر تحديث حالة المورد في قاعدة البيانات.';
      showToast(`فشل مراجعة المورد في Supabase: ${actionableError}`, 'error');
    }
  };

  const publishResource = async (id: string) => {
    const previous = resources.find(r => r.id === id);

    // 1. Verify active Supabase authentication session first
    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        showToast(`خطأ في التحقق من جلسة المصادقة: ${sessionErr.message}`, 'error');
        return;
      }

      const activeEmail = sessionData?.session?.user?.email?.trim().toLowerCase();
      if (!activeEmail) {
        showToast('يرجى تسجيل الدخول الفعلي بحساب المديرة أولاً للمتابعة ونشر المورد.', 'warning');
        return;
      }

      if (activeEmail !== 'sciencelibrary8@gmail.com') {
        showToast(`الحساب الحالي (${activeEmail}) ليس حساب المديرة الرسمي المعتمد (sciencelibrary8@gmail.com). تم رفض النشر.`, 'error');
        return;
      }
    } catch (authErr: unknown) {
      const msg = authErr instanceof Error ? authErr.message : String(authErr);
      showToast(`فشل التحقق من الجلسة: ${msg}`, 'error');
      return;
    }

    // 2. Perform publishing in Supabase resources table (Authoritative Save)
    const { data: savedRecord, savedToSupabase, error } = await supabaseResourceService.publishResource(id);

    if (savedToSupabase && savedRecord) {
      setResources(prev => prev.map(r => r.id === id ? { ...r, ...savedRecord, status: 'published', publishedAt: savedRecord.publishedAt || new Date().toISOString() } : r));
      if (activeResource && activeResource.id === id) {
        setActiveResource({ ...activeResource, ...savedRecord, status: 'published', publishedAt: savedRecord.publishedAt || new Date().toISOString() });
      }
      storageService.updateResource(id, {
        status: 'published',
        publishedAt: savedRecord.publishedAt || new Date().toISOString()
      });
      refreshNotifications();
      showToast('تم نشر المورد بنجاح وتحديث حالته في قاعدة بيانات Supabase', 'success');
    } else {
      if (previous) {
        setResources(prev => prev.map(r => r.id === id ? previous : r));
      }
      const actionableError = error || 'تعذر نشر المورد في قاعدة البيانات (matched 0 rows).';
      showToast(`فشل نشر المورد في Supabase: ${actionableError}`, 'error');
    }
  };

  const unpublishResource = async (id: string) => {
    const previous = resources.find(r => r.id === id);

    const { data: savedRecord, savedToSupabase, error } = await supabaseResourceService.unpublishResource(id);

    if (savedToSupabase && savedRecord) {
      setResources(prev => prev.map(r => r.id === id ? { ...r, ...savedRecord, status: 'approved', publishedAt: undefined } : r));
      if (activeResource && activeResource.id === id) {
        setActiveResource({ ...activeResource, ...savedRecord, status: 'approved', publishedAt: undefined });
      }
      storageService.updateResource(id, {
        status: 'approved',
        publishedAt: undefined
      });
      showToast('تم إلغاء نشر المورد وإعادته إلى قائمة المعتمدة في Supabase', 'info');
    } else {
      if (previous) {
        setResources(prev => prev.map(r => r.id === id ? previous : r));
      }
      const actionableError = error || 'تعذر إلغاء نشر المورد في قاعدة البيانات.';
      showToast(`فشل إلغاء نشر المورد في Supabase: ${actionableError}`, 'error');
    }
  };

  const archiveResource = (id: string) => {
    const actorId = user?.id || 'admin';
    const actorName = user?.displayName || 'المدير';
    const updated = storageService.archiveResource(id, actorId, actorName);
    refreshResources();
    refreshAuditLogs();
    if (activeResource && activeResource.id === id && updated) {
      setActiveResource(updated);
    }
    showToast('تمت أرشفة المورد بنجاح', 'info');
  };

  const duplicateResource = (id: string): ResourceItem | null => {
    const actorId = user?.id || 'admin';
    const actorName = user?.displayName || 'مدير النظام';
    const duplicated = storageService.duplicateResource(id, actorId, actorName);
    if (duplicated) {
      refreshResources();
      refreshAuditLogs();
      showToast(`تم استنساخ المورد بنجاح: "${duplicated.title}"`, 'success');
    }
    return duplicated;
  };

  const restoreResource = (id: string) => {
    const actorId = user?.id || 'admin';
    const actorName = user?.displayName || 'مدير النظام';
    const restored = storageService.restoreResource(id, actorId, actorName);
    if (restored) {
      refreshResources();
      refreshAuditLogs();
      showToast('تم استرجاع المورد إلى قائمة المسودات بنجاح', 'success');
    }
  };

  const deleteResource = (id: string) => {
    const previousResource = resources.find(r => r.id === id);
    storageService.deleteResource(id);
    setResources(prev => prev.filter(r => r.id !== id));
    refreshAuditLogs();
    if (activeResource && activeResource.id === id) {
      setActiveResource(null);
    }

    // Direct deletion from Supabase resources table (Requirement #1 & #5)
    supabaseResourceService.deleteResource(id).then(({ deletedFromSupabase, error }) => {
      if (deletedFromSupabase) {
        showToast('تم حذف المورد من قاعدة بيانات Supabase بنجاح', 'info');
      } else {
        console.error('Supabase delete persistence failure:', error);
        if (previousResource) {
          setResources(prev => [...prev, previousResource]);
        }
        showToast(`فشل حذف المورد من Supabase: ${error || 'تحقق من الصلاحيات'}`, 'error');
      }
    });
  };

  const uploadNewVersion = (resourceId: string, versionNumber: string, changeNotes: string, fileUrl?: string) => {
    const authorName = user?.displayName || 'المشرف';
    const updated = storageService.addVersion(resourceId, versionNumber, changeNotes, authorName, fileUrl);
    refreshResources();
    refreshAuditLogs();
    if (activeResource && activeResource.id === resourceId && updated) {
      setActiveResource(updated);
    }
    showToast(`تم توثيق ورفع الإصدار الجديد (${versionNumber}) بنجاح`, 'success');
  };

  const bulkImportResources = (items: Array<Omit<ResourceItem, 'id' | 'createdAt' | 'updatedAt' | 'ratingAverage' | 'ratingCount' | 'usageCount' | 'downloadCount'>>): number => {
    let count = 0;
    const actorId = user?.id || 'admin';
    const actorName = user?.displayName || 'المشرف';

    for (const item of items) {
      const created = storageService.createResource(item);
      count++;
    }

    storageService.addAuditLog({
      actorId,
      userId: actorId,
      actorName,
      action: 'bulk_import',
      resourceId: 'batch-import',
      resourceTitle: `استيراد دفعة من ${count} مورد`,
      details: `تم استيراد ${count} مورد تعليمي بنجاح إلى النظام`
    });

    refreshResources();
    refreshAuditLogs();
    refreshNotifications();
    showToast(`تم بنجاح استيراد وإدراج ${count} مورد تعليمي في المنصة`, 'success');
    return count;
  };

  const findPotentialDuplicates = (title: string, fileName?: string, fileSize?: string): ResourceItem[] => {
    return storageService.findPotentialDuplicates(title, fileName, fileSize);
  };

  const exportResourcesData = (format: 'json' | 'csv'): string => {
    storageService.addAuditLog({
      actorId: user?.id || 'admin',
      userId: user?.id || 'admin',
      actorName: user?.displayName || 'المشرف',
      action: 'publish',
      resourceId: 'export-all',
      resourceTitle: 'تصدير بيانات الموارد',
      details: `تصدير بيانات الموارد بصيغة ${format.toUpperCase()}`
    });
    refreshAuditLogs();
    return storageService.exportResourcesData(format);
  };

  const addAuditLog = (item: Omit<AuditLogItem, 'id' | 'timestamp'>) => {
    storageService.addAuditLog(item);
    refreshAuditLogs();
  };

  // Curricula CRUD
  const addCurriculum = (item: Omit<CurriculumItem, 'id'>) => {
    storageService.addCurriculum(item);
    refreshCurriculum();
    showToast(`تمت إضافة المنهج الدراسي "${item.name}" بنجاح`, 'success');
  };

  const updateCurriculum = (id: string, updates: Partial<CurriculumItem>) => {
    storageService.updateCurriculum(id, updates);
    refreshCurriculum();
    showToast('تم تحديث بيانات المنهج بنجاح', 'success');
  };

  const deleteCurriculum = (id: string): { success: boolean; message?: string } => {
    const res = storageService.deleteCurriculum(id);
    if (res.success) {
      refreshCurriculum();
      showToast('تم حذف المنهج بنجاح', 'info');
    } else {
      showToast(res.message || 'تعذر حذف المنهج', 'warning');
    }
    return res;
  };

  const toggleCurriculumActive = (id: string) => {
    storageService.toggleCurriculumActive(id);
    refreshCurriculum();
    showToast('تم تحديث حالة تفعيل المنهج بنجاح', 'info');
  };

  // Grades CRUD
  const addGrade = (item: Omit<GradeItem, 'id'>) => {
    storageService.addGrade(item);
    refreshGradesAndSubjects();
    showToast(`تمت إضافة الصف الدراسي "${item.name}" بنجاح`, 'success');
  };

  const updateGrade = (id: string, updates: Partial<GradeItem>) => {
    storageService.updateGrade(id, updates);
    refreshGradesAndSubjects();
    showToast('تم تحديث بيانات الصف الدراسي بنجاح', 'success');
  };

  const deleteGrade = (id: string): { success: boolean; message?: string } => {
    const res = storageService.deleteGrade(id);
    if (res.success) {
      refreshGradesAndSubjects();
      showToast('تم حذف الصف بنجاح', 'info');
    } else {
      showToast(res.message || 'تعذر حذف الصف', 'warning');
    }
    return res;
  };

  const toggleGradeActive = (id: string) => {
    storageService.toggleGradeActive(id);
    refreshGradesAndSubjects();
    showToast('تم تحديث حالة تفعيل الصف الدراسي', 'info');
  };

  const reorderGrades = (gradesList: GradeItem[]) => {
    storageService.reorderGrades(gradesList);
    refreshGradesAndSubjects();
  };

  // Subjects CRUD
  const addSubject = (item: Omit<SubjectItem, 'id'>) => {
    storageService.addSubject(item);
    refreshGradesAndSubjects();
    showToast(`تمت إضافة المادة العلمية "${item.name}" بنجاح`, 'success');
  };

  const updateSubject = (id: string, updates: Partial<SubjectItem>) => {
    storageService.updateSubject(id, updates);
    refreshGradesAndSubjects();
    showToast('تم تحديث بيانات المادة العلمية بنجاح', 'success');
  };

  const deleteSubject = (id: string): { success: boolean; message?: string } => {
    const res = storageService.deleteSubject(id);
    if (res.success) {
      refreshGradesAndSubjects();
      showToast('تم حذف المادة بنجاح', 'info');
    } else {
      showToast(res.message || 'تعذر حذف المادة', 'warning');
    }
    return res;
  };

  const toggleSubjectActive = (id: string) => {
    storageService.toggleSubjectActive(id);
    refreshGradesAndSubjects();
    showToast('تم تحديث حالة تفعيل المادة العلمية', 'info');
  };

  const reorderSubjects = (subjectsList: SubjectItem[]) => {
    storageService.reorderSubjects(subjectsList);
    refreshGradesAndSubjects();
  };

  // Units CRUD
  const addUnit = (item: Omit<UnitItem, 'id'>) => {
    storageService.addUnit(item);
    refreshCurriculum();
    showToast(`تمت إضافة الوحدة الدراسية "${item.name}" بنجاح`, 'success');
  };

  const updateUnit = (id: string, updates: Partial<UnitItem>) => {
    storageService.updateUnit(id, updates);
    refreshCurriculum();
    showToast('تم تحديث بيانات الوحدة الدراسية بنجاح', 'success');
  };

  const deleteUnit = (id: string): { success: boolean; message?: string } => {
    const res = storageService.deleteUnit(id);
    if (res.success) {
      refreshCurriculum();
      showToast('تم حذف الوحدة بنجاح', 'info');
    } else {
      showToast(res.message || 'تعذر حذف الوحدة', 'warning');
    }
    return res;
  };

  const toggleUnitActive = (id: string) => {
    storageService.toggleUnitActive(id);
    refreshCurriculum();
    showToast('تم تحديث حالة تفعيل الوحدة الدراسية', 'info');
  };

  const reorderUnits = (unitsList: UnitItem[]) => {
    storageService.reorderUnits(unitsList);
    refreshCurriculum();
  };

  // Topics CRUD
  const addTopic = (item: Omit<TopicItem, 'id'>) => {
    storageService.addTopic(item);
    refreshCurriculum();
    showToast(`تمت إضافة الموضوع / الدرس "${item.name}" بنجاح`, 'success');
  };

  const updateTopic = (id: string, updates: Partial<TopicItem>) => {
    storageService.updateTopic(id, updates);
    refreshCurriculum();
    showToast('تم تحديث بيانات الموضوع / الدرس بنجاح', 'success');
  };

  const deleteTopic = (id: string): { success: boolean; message?: string } => {
    const res = storageService.deleteTopic(id);
    if (res.success) {
      refreshCurriculum();
      showToast('تم حذف الموضوع / الدرس بنجاح', 'info');
    } else {
      showToast(res.message || 'تعذر حذف الموضوع', 'warning');
    }
    return res;
  };

  const toggleTopicActive = (id: string) => {
    storageService.toggleTopicActive(id);
    refreshCurriculum();
    showToast('تم تحديث حالة تفعيل الدرس / الموضوع', 'info');
  };

  const reorderTopics = (topicsList: TopicItem[]) => {
    storageService.reorderTopics(topicsList);
    refreshCurriculum();
  };

  const downloadResource = (resource: ResourceItem) => {
    storageService.incrementUsage(resource.id, 'download');
    refreshResources();

    const storageOrHttpUrl = (resource.download_url && resource.download_url.startsWith('http'))
      ? resource.download_url
      : (resource.fileUrl && resource.fileUrl.startsWith('http') && !resource.fileUrl.startsWith('https://images.unsplash.com'))
      ? resource.fileUrl
      : undefined;

    if (storageOrHttpUrl) {
      const a = document.createElement('a');
      a.href = storageOrHttpUrl;
      a.download = resource.fileName || `${(resource.title || 'resource').replace(/\s+/g, '_')}.html`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('جارٍ تحميل ملف المورد من التخزين السحابي...', 'success');
      return;
    }

    // Fallback: Create a real downloadable file from memory content
    const content = resource.htmlContent || `مكتبة العلوم الرقمية - مدرسة محلاح للبنات (5-12)\n\nعنوان المورد: ${resource.title}\nالصف: ${resource.gradeName}\nالمادة: ${resource.subjectName}\nنوع المورد: ${resource.resourceType}\nالوحدة: ${resource.unit}\nالموضوع: ${resource.topic}\nالوصف:\n${resource.description}\n\nتاريخ الإنشاء: ${resource.createdAt}\nالكاتب: ${resource.authorName}\nالإصدار: ${resource.version}`;
    const mime = resource.htmlContent ? 'text/html;charset=utf-8' : 'text/plain;charset=utf-8';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanFileName = (resource.fileName || resource.title.replace(/\s+/g, '_')) + (resource.htmlContent && !resource.fileName?.endsWith('.html') ? '.html' : '');
    a.download = cleanFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('جارٍ تحميل ملف المورد...', 'success');
  };

  const addResourceType = (item: Omit<ResourceTypeItem, 'id'>) => {
    storageService.addResourceType(item);
    refreshResourceTypes();
    showToast(`تمت إضافة نوع المورد الجديد "${item.name}" بنجاح`, 'success');
  };

  const deleteResourceType = (id: string) => {
    storageService.deleteResourceType(id);
    refreshResourceTypes();
    showToast('تم حذف نوع المورد بنجاح', 'info');
  };

  // Modular Recommendation Engine
  const getRecommendedResources = (current?: ResourceItem | null): ResourceItem[] => {
    const published = resources.filter(r => r.status === 'published' && (!current || r.id !== current.id));
    if (!current) {
      // Sort by rating & usage
      return published.sort((a, b) => (b.ratingAverage * b.usageCount) - (a.ratingAverage * a.usageCount)).slice(0, 4);
    }

    // Score based on matching Grade, Subject, Type, and Unit
    const scored = published.map(item => {
      let score = 0;
      if (item.gradeId === current.gradeId) score += 4;
      if (item.subjectId === current.subjectId) score += 3;
      if (item.resourceType === current.resourceType) score += 2;
      if (item.unit && current.unit && item.unit === current.unit) score += 2;
      // Tag overlap
      const sharedTags = item.tags.filter(t => current.tags.includes(t));
      score += sharedTags.length;
      return { item, score };
    });

    return scored.sort((a, b) => b.score - a.score).map(s => s.item).slice(0, 4);
  };

  const getSimilarResources = (current: ResourceItem): ResourceItem[] => {
    const candidates = resources.filter(r => r.status === 'published' && r.id !== current.id);
    const scored = candidates.map(r => {
      let score = 0;
      // Same topic/lesson (+5)
      if (r.topicId && current.topicId && r.topicId === current.topicId) score += 5;
      else if (r.topic && current.topic && r.topic.trim() === current.topic.trim()) score += 4;

      // Same unit (+4)
      if (r.unitId && current.unitId && r.unitId === current.unitId) score += 4;
      else if (r.unit && current.unit && r.unit.trim() === current.unit.trim()) score += 3;

      // Shared scientific concepts (+3 per shared concept)
      if (current.scientificConcepts && r.scientificConcepts) {
        const shared = r.scientificConcepts.filter(c => current.scientificConcepts?.includes(c));
        score += shared.length * 3;
      }

      // Same subject & grade (+3)
      if (r.subjectId === current.subjectId && r.gradeId === current.gradeId) score += 3;
      else if (r.subjectId === current.subjectId) score += 2;
      else if (r.gradeId === current.gradeId) score += 1;

      // Same resource type (+1)
      if (r.resourceType === current.resourceType) score += 1;

      return { item: r, score };
    });

    // Only include genuinely relevant resources (threshold score >= 3)
    return scored
      .filter(s => s.score >= 3)
      .sort((a, b) => b.score - a.score)
      .map(s => s.item)
      .slice(0, 4);
  };

  return (
    <ResourceContext.Provider
      value={{
        resources,
        isSupabaseLive,
        isSyncingWithSupabase,
        reloadLiveResources,
        syncAllWithSupabase,
        resourceTypes,
        curricula,
        units,
        topics,
        grades,
        subjects,
        auditLogs,
        favorites,
        filters,
        activeResource,
        editingResource,
        sandboxResource,
        isSandboxOpen,
        toasts,
        notifications,
        setFilters,
        resetFilters,
        setActiveResource,
        setEditingResource,
        openResource,
        launchResource,
        closeSandbox,
        toggleFavorite,
        rateResource,
        createResource,
        updateResource,
        startReview,
        reviewResource,
        publishResource,
        unpublishResource,
        archiveResource,
        restoreResource,
        duplicateResource,
        deleteResource,
        downloadResource,
        addResourceType,
        deleteResourceType,
        addCurriculum,
        updateCurriculum,
        deleteCurriculum,
        toggleCurriculumActive,
        addGrade,
        updateGrade,
        deleteGrade,
        toggleGradeActive,
        reorderGrades,
        addSubject,
        updateSubject,
        deleteSubject,
        toggleSubjectActive,
        reorderSubjects,
        addUnit,
        updateUnit,
        deleteUnit,
        toggleUnitActive,
        reorderUnits,
        addTopic,
        updateTopic,
        deleteTopic,
        toggleTopicActive,
        reorderTopics,
        uploadNewVersion,
        bulkImportResources,
        findPotentialDuplicates,
        exportResourcesData,
        addAuditLog,
        showToast,
        markNotificationAsRead,
        clearNotifications,
        getRecommendedResources,
        getSimilarResources,
        refreshResources,
        refreshCurriculum,
        refreshGradesAndSubjects,
        refreshAuditLogs
      }}
    >
      {children}
    </ResourceContext.Provider>
  );
};

export const useResources = () => {
  const context = useContext(ResourceContext);
  if (!context) {
    throw new Error('useResources must be used within a ResourceProvider');
  }
  return context;
};


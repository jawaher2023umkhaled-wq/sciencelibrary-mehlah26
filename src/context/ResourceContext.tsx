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
import { supabaseResourceService } from '../services/supabaseResourceService';
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
  createResource: (resourceData: Omit<ResourceItem, 'id' | 'createdAt' | 'updatedAt' | 'ratingAverage' | 'ratingCount' | 'usageCount' | 'downloadCount'>) => ResourceItem;
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
      const { data, isLive } = await supabaseResourceService.fetchLiveResources();
      if (isLive && data) {
        if (data.length > 0) {
          setResources(data);
          storageService.saveResources(data);
          setIsSupabaseLive(true);
        } else {
          // Table exists in Supabase but is empty -> seed local resources to Supabase
          const localList = storageService.getResources();
          if (localList.length > 0) {
            await supabaseResourceService.syncBatchToSupabase(localList);
            setResources(localList);
            setIsSupabaseLive(true);
          }
        }
      } else {
        // Fallback to local storage if table is not yet migrated in Supabase
        const list = storageService.getResources();
        setResources(list);
        setIsSupabaseLive(false);
      }
    } catch (e) {
      console.warn('Supabase initial fetch notice:', e);
      const list = storageService.getResources();
      setResources(list);
      setIsSupabaseLive(false);
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
    const list = storageService.getResources();
    setResources([...list]);
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

  const refreshNotifications = () => {
    if (user) {
      setNotifications(storageService.getUserNotifications(user.id));
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

  const markNotificationAsRead = (id: string) => {
    if (!user) return;
    storageService.markNotificationAsRead(user.id, id);
    refreshNotifications();
  };

  const clearNotifications = () => {
    if (!user) return;
    storageService.clearNotifications(user.id);
    refreshNotifications();
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

  const createResource = (resourceData: Omit<ResourceItem, 'id' | 'createdAt' | 'updatedAt' | 'ratingAverage' | 'ratingCount' | 'usageCount' | 'downloadCount'>) => {
    const created = storageService.createResource(resourceData);
    setResources(prev => [created, ...prev]);
    refreshNotifications();

    // Direct persistence to Supabase resources table (Requirement #1 & #5)
    supabaseResourceService.createResource(created).then(({ savedToSupabase, error }) => {
      if (savedToSupabase) {
        setIsSupabaseLive(true);
        showToast('تم حفظ المورد بنجاح في قاعدة بيانات Supabase', 'success');
      } else {
        console.warn('Supabase create persistence notice:', error);
        showToast('تم حفظ المورد بنجاح', 'success');
      }
    });

    return created;
  };

  const updateResource = (id: string, updates: Partial<ResourceItem>) => {
    const updated = storageService.updateResource(id, updates);
    if (updated) {
      setResources(prev => prev.map(r => r.id === id ? updated : r));
      if (activeResource && activeResource.id === id) {
        setActiveResource(updated);
      }
    }
    refreshNotifications();

    // Direct persistence to Supabase resources table (Requirement #1 & #5)
    supabaseResourceService.updateResource(id, updates).then(({ savedToSupabase, error }) => {
      if (savedToSupabase) {
        setIsSupabaseLive(true);
        showToast('تم تحديث المورد ومزامنته مع Supabase بنجاح', 'success');
      } else {
        console.warn('Supabase update persistence notice:', error);
        showToast('تم تحديث بيانات المورد بنجاح', 'success');
      }
    });
  };

  const startReview = (id: string) => {
    updateResource(id, { status: 'under_review' });
    showToast('بدأت عملية المراجعة الأكاديمية للمورد', 'info');
  };

  const reviewResource = (id: string, status: ResourceStatus, comment: string) => {
    if (!user) return;
    const updated = storageService.reviewResource(id, user.id, user.displayName, status, comment);
    refreshResources();
    refreshNotifications();
    if (activeResource && activeResource.id === id && updated) {
      setActiveResource(updated);
    }

    if (status === 'approved') {
      showToast('تم اعتماد المورد بنجاح', 'success');
    } else if (status === 'published') {
      showToast('تم نشر المورد بنجاح في المكتبة', 'success');
    } else if (status === 'needs_revision') {
      showToast('تم إرجاع المورد للتعديل', 'warning');
    } else if (status === 'rejected') {
      showToast('تم رفض المورد', 'error');
    }
  };

  const publishResource = (id: string) => {
    updateResource(id, { status: 'published', publishedAt: new Date().toISOString() });
    showToast('تم نشر المورد بنجاح في المكتبة', 'success');
  };

  const unpublishResource = (id: string) => {
    storageService.unpublishResource(id);
    refreshResources();
    if (activeResource && activeResource.id === id) {
      const updated = storageService.getResourceById(id);
      if (updated) setActiveResource(updated);
    }
    showToast('تم إلغاء نشر المورد وإعادته إلى المعتمدة', 'info');
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
        console.warn('Supabase delete persistence notice:', error);
        showToast('تم حذف المورد بنجاح', 'info');
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

    // Create a real downloadable file
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


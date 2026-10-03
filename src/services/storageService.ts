import {
  ResourceItem,
  ReviewNote,
  ResourceStatus,
  ResourceVersion,
  UserNotification,
  ResourceTypeItem,
  CurriculumItem,
  UnitItem,
  TopicItem,
  AuditLogItem,
  GradeItem,
  SubjectItem
} from '../types';
import {
  INITIAL_RESOURCES,
  RESOURCE_TYPES,
  INITIAL_CURRICULA,
  INITIAL_UNITS,
  INITIAL_TOPICS,
  GRADES,
  SUBJECTS
} from '../data/initialData';

import { generateUuid } from './supabaseResourceService';

const STORAGE_KEY_RESOURCES = 'maktabat_aloloom_resources_v2';
const STORAGE_KEY_FAVORITES = 'maktabat_aloloom_favorites_v2';
const STORAGE_KEY_RATINGS = 'maktabat_aloloom_ratings_v2';
const STORAGE_KEY_NOTIFICATIONS = 'maktabat_aloloom_notifications_v2';
const STORAGE_KEY_ADMIN_EMAIL = 'maktabat_aloloom_admin_email_v2';
const STORAGE_KEY_RESOURCE_TYPES = 'maktabat_aloloom_resource_types_v2';
const STORAGE_KEY_CURRICULA = 'maktabat_aloloom_curricula_v2';
const STORAGE_KEY_UNITS = 'maktabat_aloloom_units_v2';
const STORAGE_KEY_TOPICS = 'maktabat_aloloom_topics_v2';
const STORAGE_KEY_GRADES = 'maktabat_aloloom_grades_v2';
const STORAGE_KEY_SUBJECTS = 'maktabat_aloloom_subjects_v2';
const STORAGE_KEY_AUDIT_LOGS = 'maktabat_aloloom_audit_logs_v2';

export const storageService = {
  // Admin email configuration
  getAdminEmail(): string {
    return localStorage.getItem(STORAGE_KEY_ADMIN_EMAIL) || 'sciencelibrary8@gmail.com';
  },

  setAdminEmail(email: string): void {
    localStorage.setItem(STORAGE_KEY_ADMIN_EMAIL, email.trim().toLowerCase());
  },

  // Load all resources
  getResources(): ResourceItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_RESOURCES);
      if (!stored) {
        this.saveResources(INITIAL_RESOURCES);
        return INITIAL_RESOURCES;
      }
      const parsed: ResourceItem[] = JSON.parse(stored);
      let hasNew = false;
      for (const initial of INITIAL_RESOURCES) {
        if (!parsed.some(r => r.id === initial.id)) {
          parsed.push(initial);
          hasNew = true;
        }
      }
      if (hasNew) {
        this.saveResources(parsed);
      }
      return parsed;
    } catch (e) {
      console.error('Failed to load resources from storage:', e);
      return INITIAL_RESOURCES;
    }
  },

  // Save all resources
  saveResources(resources: ResourceItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_RESOURCES, JSON.stringify(resources));
    } catch (e) {
      console.error('Failed to save resources to storage:', e);
    }
  },

  // Get a single resource by ID
  getResourceById(id: string): ResourceItem | undefined {
    const list = this.getResources();
    return list.find(r => r.id === id);
  },

  // Create a new resource
  createResource(resource: Omit<ResourceItem, 'id' | 'createdAt' | 'updatedAt' | 'ratingAverage' | 'ratingCount' | 'usageCount' | 'downloadCount'>): ResourceItem {
    const list = this.getResources();
    const newId = generateUuid();
    const now = new Date().toISOString();

    const newResource: ResourceItem = {
      ...resource,
      id: newId,
      ratingAverage: 0,
      ratingCount: 0,
      usageCount: 0,
      downloadCount: 0,
      createdAt: now,
      updatedAt: now,
      publishedAt: resource.status === 'published' ? now : undefined,
      versions: [
        {
          versionNumber: resource.version || 'الإصدار 1.0',
          fileUrl: resource.fileUrl,
          changeNotes: 'الإنشاء الأولي للمورد',
          createdAt: now,
          createdBy: resource.authorName
        }
      ]
    };

    list.unshift(newResource);
    this.saveResources(list);

    // Audit log
    this.addAuditLog({
      actorId: resource.authorId,
      userId: resource.authorId,
      actorName: resource.authorName,
      action: resource.status === 'submitted' ? 'submit' : 'create',
      resourceId: newId,
      resourceTitle: resource.title,
      details: resource.status === 'submitted' ? 'إنشاء المورد وإرساله للتحكيم' : 'إنشاء مسودة مورد جديد'
    });

    // Notify author if created
    if (resource.status === 'submitted') {
      this.addNotification({
        userId: resource.authorId,
        title: 'تم إرسال المورد للمراجعة',
        message: `تم استلام المورد "${resource.title}" بنجاح وإحالته إلى لجنة التحكيم الأكاديمية.`,
        resourceId: newId,
        type: 'info'
      });
    }

    return newResource;
  },

  // Update existing resource
  updateResource(id: string, updates: Partial<ResourceItem>): ResourceItem | null {
    const list = this.getResources();
    const index = list.findIndex(r => r.id === id);
    if (index === -1) return null;

    const existing = list[index];
    const now = new Date().toISOString();

    const updatedResource: ResourceItem = {
      ...existing,
      ...updates,
      updatedAt: now,
      publishedAt: updates.status === 'published' && !existing.publishedAt ? now : (updates.publishedAt || existing.publishedAt)
    };

    list[index] = updatedResource;
    this.saveResources(list);

    // Audit log
    this.addAuditLog({
      actorId: existing.authorId,
      userId: existing.authorId,
      actorName: existing.authorName,
      action: updates.status === 'submitted' ? 'submit' : 'update',
      resourceId: id,
      resourceTitle: updatedResource.title,
      details: updates.status === 'submitted' ? 'إعادة إرسال المورد للمراجعة' : 'تحديث بيانات المورد'
    });

    if (updates.status === 'submitted' && existing.status !== 'submitted') {
      this.addNotification({
        userId: existing.authorId,
        title: 'تمت إعادة إرسال المورد للمراجعة',
        message: `تم إرسال التعديلات على مورد "${existing.title}" إلى لجنة التحكيم.`,
        resourceId: id,
        type: 'info'
      });
    }

    return updatedResource;
  },

  // Unpublish resource back to approved
  unpublishResource(id: string): ResourceItem | null {
    const list = this.getResources();
    const index = list.findIndex(r => r.id === id);
    if (index === -1) return null;

    const existing = list[index];
    const now = new Date().toISOString();

    const updatedResource: ResourceItem = {
      ...existing,
      status: 'approved',
      updatedAt: now
    };

    list[index] = updatedResource;
    this.saveResources(list);
    return updatedResource;
  },

  // Add review feedback and update status
  reviewResource(resourceId: string, reviewerId: string, reviewerName: string, newStatus: ResourceStatus, comment: string): ResourceItem | null {
    const list = this.getResources();
    const index = list.findIndex(r => r.id === resourceId);
    if (index === -1) return null;

    const existing = list[index];
    const now = new Date().toISOString();

    const reviewNote: ReviewNote = {
      id: 'rev-' + Date.now(),
      resourceId,
      reviewerId,
      reviewerName,
      status: newStatus,
      comment,
      createdAt: now
    };

    const updatedNotes = existing.reviewNotes ? [reviewNote, ...existing.reviewNotes] : [reviewNote];

    const updatedResource: ResourceItem = {
      ...existing,
      status: newStatus,
      reviewNotes: updatedNotes,
      updatedAt: now,
      publishedAt: newStatus === 'published' ? now : existing.publishedAt
    };

    list[index] = updatedResource;
    this.saveResources(list);

    // Audit log
    this.addAuditLog({
      actorId: reviewerId,
      userId: reviewerId,
      actorName: reviewerName,
      action: newStatus === 'approved' ? 'approve' : newStatus === 'published' ? 'publish' : newStatus === 'rejected' ? 'reject' : 'needs_revision',
      resourceId,
      resourceTitle: existing.title,
      details: comment ? `قرار المراجع: ${comment}` : `تحديث حالة المورد إلى ${newStatus}`
    });

    // Send persistent notification to resource author
    let notifTitle = 'تحديث حالة المورد';
    let notifType: 'info' | 'success' | 'warning' | 'error' = 'info';

    if (newStatus === 'approved') {
      notifTitle = 'تم اعتماد المورد بنجاح!';
      notifType = 'success';
    } else if (newStatus === 'published') {
      notifTitle = 'تم نشر موردك في المكتبة الرقمية!';
      notifType = 'success';
    } else if (newStatus === 'needs_revision') {
      notifTitle = 'ملاحظات المراجعة: يحتاج إلى تعديل';
      notifType = 'warning';
    } else if (newStatus === 'rejected') {
      notifTitle = 'اعتذار عن قبول المورد';
      notifType = 'error';
    }

    this.addNotification({
      userId: existing.authorId,
      title: notifTitle,
      message: comment ? `قرار المراجع: ${comment}` : `تم تغيير حالة مورد "${existing.title}".`,
      resourceId,
      type: notifType
    });

    return updatedResource;
  },

  // Add new version to a resource
  addVersion(resourceId: string, newVersionNumber: string, changeNotes: string, authorName: string, fileUrl?: string): ResourceItem | null {
    const list = this.getResources();
    const index = list.findIndex(r => r.id === resourceId);
    if (index === -1) return null;

    const existing = list[index];
    const now = new Date().toISOString();

    const versionItem: ResourceVersion = {
      versionNumber: newVersionNumber,
      fileUrl: fileUrl || existing.fileUrl,
      changeNotes,
      createdAt: now,
      createdBy: authorName
    };

    const versions = existing.versions ? [versionItem, ...existing.versions] : [versionItem];

    const updatedResource: ResourceItem = {
      ...existing,
      version: newVersionNumber,
      versions,
      updatedAt: now
    };

    list[index] = updatedResource;
    this.saveResources(list);

    // Audit log
    this.addAuditLog({
      actorId: authorName,
      userId: authorName,
      actorName: authorName,
      action: 'version',
      resourceId,
      resourceTitle: existing.title,
      details: `رفع وتوثيق إصدار جديد (${newVersionNumber}): ${changeNotes}`
    });

    return updatedResource;
  },

  // Delete a resource
  deleteResource(id: string): boolean {
    const list = this.getResources();
    const existing = list.find(r => r.id === id);
    const filtered = list.filter(r => r.id !== id);
    if (filtered.length !== list.length) {
      this.saveResources(filtered);
      if (existing) {
        this.addAuditLog({
          actorId: 'admin',
          userId: 'admin',
          actorName: 'إدارة النظام',
          action: 'delete',
          resourceId: id,
          resourceTitle: existing.title,
          details: 'حذف المورد نهائياً من المنصة'
        });
      }
      return true;
    }
    return false;
  },

  // Increment usage count
  incrementUsage(id: string, actionType: 'open' | 'launch' | 'download' = 'open'): void {
    const list = this.getResources();
    const index = list.findIndex(r => r.id === id);
    if (index === -1) return;

    list[index].usageCount = (list[index].usageCount || 0) + 1;
    if (actionType === 'download') {
      list[index].downloadCount = (list[index].downloadCount || 0) + 1;
    }
    this.saveResources(list);
  },

  // Favorites management
  getFavorites(userId: string): string[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_FAVORITES + '_' + userId);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  toggleFavorite(userId: string, resourceId: string): boolean {
    const favs = this.getFavorites(userId);
    const index = favs.indexOf(resourceId);
    let isNowFavorite = false;

    if (index > -1) {
      favs.splice(index, 1);
      isNowFavorite = false;
    } else {
      favs.push(resourceId);
      isNowFavorite = true;
      this.incrementUsage(resourceId, 'open');
    }

    try {
      localStorage.setItem(STORAGE_KEY_FAVORITES + '_' + userId, JSON.stringify(favs));
    } catch (e) {
      console.error('Failed to save favorite:', e);
    }

    return isNowFavorite;
  },

  // Rating management
  getUserRating(userId: string, resourceId: string): number {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_RATINGS + '_' + userId);
      if (!stored) return 0;
      const ratings = JSON.parse(stored);
      return ratings[resourceId] || 0;
    } catch {
      return 0;
    }
  },

  rateResource(userId: string, resourceId: string, score: number): { average: number; count: number } {
    const list = this.getResources();
    const index = list.findIndex(r => r.id === resourceId);
    if (index === -1) return { average: 0, count: 0 };

    // Get previous rating if exists
    let userRatings: Record<string, number> = {};
    try {
      const stored = localStorage.getItem(STORAGE_KEY_RATINGS + '_' + userId);
      if (stored) userRatings = JSON.parse(stored);
    } catch {
      userRatings = {};
    }

    const previousScore = userRatings[resourceId] || 0;
    userRatings[resourceId] = score;

    try {
      localStorage.setItem(STORAGE_KEY_RATINGS + '_' + userId, JSON.stringify(userRatings));
    } catch (e) {
      console.error('Failed to save rating:', e);
    }

    const res = list[index];
    let newCount = res.ratingCount || 0;
    let newAvg = res.ratingAverage || 0;

    if (previousScore === 0) {
      // New rating
      const total = newAvg * newCount + score;
      newCount += 1;
      newAvg = Math.round((total / newCount) * 10) / 10;
    } else {
      // Updated rating
      const total = newAvg * newCount - previousScore + score;
      newAvg = Math.round((total / Math.max(1, newCount)) * 10) / 10;
    }

    res.ratingAverage = newAvg;
    res.ratingCount = newCount;
    this.saveResources(list);

    return { average: newAvg, count: newCount };
  },

  // Persistent User Notifications
  getUserNotifications(userId: string): UserNotification[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS + '_' + userId);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  addNotification(notification: Omit<UserNotification, 'id' | 'createdAt' | 'isRead'>): UserNotification {
    const list = this.getUserNotifications(notification.userId);
    const newNotif: UserNotification = {
      ...notification,
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      isRead: false,
      createdAt: new Date().toISOString()
    };
    list.unshift(newNotif);
    try {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS + '_' + notification.userId, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save notification:', e);
    }
    return newNotif;
  },

  markNotificationAsRead(userId: string, notificationId: string): void {
    const list = this.getUserNotifications(userId);
    const item = list.find(n => n.id === notificationId);
    if (item) {
      item.isRead = true;
      try {
        localStorage.setItem(STORAGE_KEY_NOTIFICATIONS + '_' + userId, JSON.stringify(list));
      } catch (e) {
        console.error('Failed to update notification:', e);
      }
    }
  },

  clearNotifications(userId: string): void {
    try {
      localStorage.removeItem(STORAGE_KEY_NOTIFICATIONS + '_' + userId);
    } catch (e) {
      console.error('Failed to clear notifications:', e);
    }
  },

  // Extensible Resource Types (Requirement: Administrator can add new resource types)
  getResourceTypes(): ResourceTypeItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_RESOURCE_TYPES);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY_RESOURCE_TYPES, JSON.stringify(RESOURCE_TYPES));
        return RESOURCE_TYPES;
      }
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to load resource types:', e);
      return RESOURCE_TYPES;
    }
  },

  addResourceType(item: Omit<ResourceTypeItem, 'id'>): ResourceTypeItem {
    const list = this.getResourceTypes();
    const id = 'type-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newType: ResourceTypeItem = {
      ...item,
      id
    };
    list.push(newType);
    try {
      localStorage.setItem(STORAGE_KEY_RESOURCE_TYPES, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save resource types:', e);
    }
    return newType;
  },

  deleteResourceType(id: string): void {
    const list = this.getResourceTypes().filter(t => t.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY_RESOURCE_TYPES, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to delete resource type:', e);
    }
  },

  // ==========================================
  // Curricula Management (Requirement #5 & #6)
  // ==========================================
  getCurricula(): CurriculumItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CURRICULA);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY_CURRICULA, JSON.stringify(INITIAL_CURRICULA));
        return INITIAL_CURRICULA;
      }
      return JSON.parse(stored);
    } catch {
      return INITIAL_CURRICULA;
    }
  },

  addCurriculum(curriculum: Omit<CurriculumItem, 'id'>): CurriculumItem {
    const list = this.getCurricula();
    const id = 'curric-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newItem: CurriculumItem = {
      ...curriculum,
      id
    };
    list.push(newItem);
    try {
      localStorage.setItem(STORAGE_KEY_CURRICULA, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save curriculum:', e);
    }
    return newItem;
  },

  updateCurriculum(id: string, updates: Partial<CurriculumItem>): CurriculumItem | null {
    const list = this.getCurricula();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) return null;
    const updated = { ...list[index], ...updates };
    list[index] = updated;
    try {
      localStorage.setItem(STORAGE_KEY_CURRICULA, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to update curriculum:', e);
    }
    return updated;
  },

  deleteCurriculum(id: string): { success: boolean; message?: string } {
    const resources = this.getResources();
    const curriculum = this.getCurricula().find(c => c.id === id);
    if (!curriculum) return { success: false, message: 'المنهج غير موجود' };

    // Check if resources reference this curriculum (Safety check)
    const hasLinkedResources = resources.some(r => r.curriculumId === id || r.curriculum === curriculum.name);
    if (hasLinkedResources) {
      return { success: false, message: 'توجد موارد مرتبطة بهذا العنصر. لا يمكن حذفه قبل نقل الموارد أو أرشفتها.' };
    }

    const list = this.getCurricula().filter(c => c.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY_CURRICULA, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to delete curriculum:', e);
    }
    return { success: true };
  },

  toggleCurriculumActive(id: string): CurriculumItem | null {
    const list = this.getCurricula();
    const item = list.find(c => c.id === id);
    if (!item) return null;
    item.isActive = item.isActive === false ? true : false;
    try {
      localStorage.setItem(STORAGE_KEY_CURRICULA, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to toggle curriculum active:', e);
    }
    return item;
  },

  // ==========================================
  // Units Management (Requirement #5, #6, #7)
  // ==========================================
  getUnits(): UnitItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_UNITS);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY_UNITS, JSON.stringify(INITIAL_UNITS));
        return INITIAL_UNITS;
      }
      return JSON.parse(stored);
    } catch {
      return INITIAL_UNITS;
    }
  },

  addUnit(unit: Omit<UnitItem, 'id'>): UnitItem {
    const list = this.getUnits();
    const id = 'unit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newUnit: UnitItem = {
      ...unit,
      id,
      isActive: unit.isActive !== undefined ? unit.isActive : true
    };
    list.push(newUnit);
    try {
      localStorage.setItem(STORAGE_KEY_UNITS, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save unit:', e);
    }
    return newUnit;
  },

  updateUnit(id: string, updates: Partial<UnitItem>): UnitItem | null {
    const list = this.getUnits();
    const index = list.findIndex(u => u.id === id);
    if (index === -1) return null;
    const updated = { ...list[index], ...updates };
    list[index] = updated;
    try {
      localStorage.setItem(STORAGE_KEY_UNITS, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to update unit:', e);
    }
    return updated;
  },

  deleteUnit(id: string): { success: boolean; message?: string } {
    const resources = this.getResources();
    const unit = this.getUnits().find(u => u.id === id);
    if (!unit) return { success: false, message: 'الوحدة غير موجودة' };

    // Check if resources reference this unit (Safety check)
    const hasLinkedResources = resources.some(
      r => r.unitId === id || (r.unit === unit.name && r.gradeId === unit.gradeId && r.subjectId === unit.subjectId)
    );
    if (hasLinkedResources) {
      return { success: false, message: 'توجد موارد مرتبطة بهذا العنصر. لا يمكن حذفه قبل نقل الموارد أو أرشفتها.' };
    }

    const list = this.getUnits().filter(u => u.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY_UNITS, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to delete unit:', e);
    }
    return { success: true };
  },

  toggleUnitActive(id: string): UnitItem | null {
    const list = this.getUnits();
    const item = list.find(u => u.id === id);
    if (!item) return null;
    item.isActive = item.isActive === false ? true : false;
    try {
      localStorage.setItem(STORAGE_KEY_UNITS, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to toggle unit active:', e);
    }
    return item;
  },

  reorderUnits(reorderedList: UnitItem[]): void {
    try {
      const indexed = reorderedList.map((u, i) => ({ ...u, order: i + 1 }));
      localStorage.setItem(STORAGE_KEY_UNITS, JSON.stringify(indexed));
    } catch (e) {
      console.error('Failed to reorder units:', e);
    }
  },

  // ==========================================
  // Topics / Lessons Management (Requirement #6, #7)
  // ==========================================
  getTopics(): TopicItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TOPICS);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY_TOPICS, JSON.stringify(INITIAL_TOPICS));
        return INITIAL_TOPICS;
      }
      return JSON.parse(stored);
    } catch {
      return INITIAL_TOPICS;
    }
  },

  addTopic(topic: Omit<TopicItem, 'id'>): TopicItem {
    const list = this.getTopics();
    const id = 'topic-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newTopic: TopicItem = {
      ...topic,
      id,
      isActive: topic.isActive !== undefined ? topic.isActive : true
    };
    list.push(newTopic);
    try {
      localStorage.setItem(STORAGE_KEY_TOPICS, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save topic:', e);
    }
    return newTopic;
  },

  updateTopic(id: string, updates: Partial<TopicItem>): TopicItem | null {
    const list = this.getTopics();
    const index = list.findIndex(t => t.id === id);
    if (index === -1) return null;
    const updated = { ...list[index], ...updates };
    list[index] = updated;
    try {
      localStorage.setItem(STORAGE_KEY_TOPICS, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to update topic:', e);
    }
    return updated;
  },

  deleteTopic(id: string): { success: boolean; message?: string } {
    const resources = this.getResources();
    const topic = this.getTopics().find(t => t.id === id);
    if (!topic) return { success: false, message: 'الدرس/الموضوع غير موجود' };

    // Check if resources reference this topic (Safety check)
    const hasLinkedResources = resources.some(
      r => r.topicId === id || (r.topic === topic.name && r.gradeId === topic.gradeId && r.subjectId === topic.subjectId)
    );
    if (hasLinkedResources) {
      return { success: false, message: 'توجد موارد مرتبطة بهذا العنصر. لا يمكن حذفه قبل نقل الموارد أو أرشفتها.' };
    }

    const list = this.getTopics().filter(t => t.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY_TOPICS, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to delete topic:', e);
    }
    return { success: true };
  },

  toggleTopicActive(id: string): TopicItem | null {
    const list = this.getTopics();
    const item = list.find(t => t.id === id);
    if (!item) return null;
    item.isActive = item.isActive === false ? true : false;
    try {
      localStorage.setItem(STORAGE_KEY_TOPICS, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to toggle topic active:', e);
    }
    return item;
  },

  reorderTopics(reorderedList: TopicItem[]): void {
    try {
      const indexed = reorderedList.map((t, i) => ({ ...t, order: i + 1 }));
      localStorage.setItem(STORAGE_KEY_TOPICS, JSON.stringify(indexed));
    } catch (e) {
      console.error('Failed to reorder topics:', e);
    }
  },

  // ==========================================
  // Grades Management (Requirement #3 & #6)
  // ==========================================
  getGrades(): GradeItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_GRADES);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY_GRADES, JSON.stringify(GRADES));
        return GRADES;
      }
      return JSON.parse(stored);
    } catch {
      return GRADES;
    }
  },

  addGrade(grade: Omit<GradeItem, 'id'>): GradeItem {
    const list = this.getGrades();
    const id = 'grade-' + (grade.number || Date.now());
    const newGrade: GradeItem = {
      ...grade,
      id,
      isActive: grade.isActive !== undefined ? grade.isActive : true
    };
    list.push(newGrade);
    try {
      localStorage.setItem(STORAGE_KEY_GRADES, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save grade:', e);
    }
    return newGrade;
  },

  updateGrade(id: string, updates: Partial<GradeItem>): GradeItem | null {
    const list = this.getGrades();
    const index = list.findIndex(g => g.id === id);
    if (index === -1) return null;
    const updated = { ...list[index], ...updates };
    list[index] = updated;
    try {
      localStorage.setItem(STORAGE_KEY_GRADES, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to update grade:', e);
    }
    return updated;
  },

  deleteGrade(id: string): { success: boolean; message?: string } {
    const resources = this.getResources();
    const grade = this.getGrades().find(g => g.id === id);
    if (!grade) return { success: false, message: 'الصف غير موجود' };

    const hasLinkedResources = resources.some(r => r.gradeId === id || r.gradeName === grade.name);
    if (hasLinkedResources) {
      return { success: false, message: 'توجد موارد مرتبطة بهذا العنصر. لا يمكن حذفه قبل نقل الموارد أو أرشفتها.' };
    }

    const list = this.getGrades().filter(g => g.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY_GRADES, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to delete grade:', e);
    }
    return { success: true };
  },

  toggleGradeActive(id: string): GradeItem | null {
    const list = this.getGrades();
    const item = list.find(g => g.id === id);
    if (!item) return null;
    item.isActive = item.isActive === false ? true : false;
    try {
      localStorage.setItem(STORAGE_KEY_GRADES, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to toggle grade active:', e);
    }
    return item;
  },

  reorderGrades(reorderedList: GradeItem[]): void {
    try {
      const indexed = reorderedList.map((g, i) => ({ ...g, order: i + 1 }));
      localStorage.setItem(STORAGE_KEY_GRADES, JSON.stringify(indexed));
    } catch (e) {
      console.error('Failed to reorder grades:', e);
    }
  },

  // ==========================================
  // Subjects Management (Requirement #3 & #6)
  // ==========================================
  getSubjects(): SubjectItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SUBJECTS);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(SUBJECTS));
        return SUBJECTS;
      }
      return JSON.parse(stored);
    } catch {
      return SUBJECTS;
    }
  },

  addSubject(subject: Omit<SubjectItem, 'id'>): SubjectItem {
    const list = this.getSubjects();
    const id = 'subj-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newSubject: SubjectItem = {
      ...subject,
      id,
      isActive: subject.isActive !== undefined ? subject.isActive : true
    };
    list.push(newSubject);
    try {
      localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save subject:', e);
    }
    return newSubject;
  },

  updateSubject(id: string, updates: Partial<SubjectItem>): SubjectItem | null {
    const list = this.getSubjects();
    const index = list.findIndex(s => s.id === id);
    if (index === -1) return null;
    const updated = { ...list[index], ...updates };
    list[index] = updated;
    try {
      localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to update subject:', e);
    }
    return updated;
  },

  deleteSubject(id: string): { success: boolean; message?: string } {
    const resources = this.getResources();
    const subject = this.getSubjects().find(s => s.id === id);
    if (!subject) return { success: false, message: 'المادة غير موجودة' };

    const hasLinkedResources = resources.some(r => r.subjectId === id || r.subjectName === subject.name);
    if (hasLinkedResources) {
      return { success: false, message: 'توجد موارد مرتبطة بهذا العنصر. لا يمكن حذفه قبل نقل الموارد أو أرشفتها.' };
    }

    const list = this.getSubjects().filter(s => s.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to delete subject:', e);
    }
    return { success: true };
  },

  toggleSubjectActive(id: string): SubjectItem | null {
    const list = this.getSubjects();
    const item = list.find(s => s.id === id);
    if (!item) return null;
    item.isActive = item.isActive === false ? true : false;
    try {
      localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to toggle subject active:', e);
    }
    return item;
  },

  reorderSubjects(reorderedList: SubjectItem[]): void {
    try {
      const indexed = reorderedList.map((s, i) => ({ ...s, order: i + 1 }));
      localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(indexed));
    } catch (e) {
      console.error('Failed to reorder subjects:', e);
    }
  },

  // ==========================================
  // Unclassified Resources (Requirements #19 & #20)
  // ==========================================
  getUnclassifiedResources(): ResourceItem[] {
    const resources = this.getResources();
    return resources.filter(r => {
      const missingGrade = !r.gradeId || r.gradeId.trim() === '';
      const missingSubject = !r.subjectId || r.subjectId.trim() === '';
      const missingUnit = !r.unit || r.unit.trim() === '';
      const missingTopic = !r.topic || r.topic.trim() === '';
      return missingGrade || missingSubject || missingUnit || missingTopic;
    });
  },

  // ==========================================
  // Related Resources (Requirement #17)
  // ==========================================
  getRelatedResources(resource: ResourceItem, limit: number = 4): ResourceItem[] {
    const all = this.getResources().filter(r => r.id !== resource.id && r.status === 'published');
    
    // Score resources based on similarity
    const scored = all.map(other => {
      let score = 0;
      if (resource.topicId && other.topicId === resource.topicId) score += 10;
      else if (resource.topic && other.topic && resource.topic === other.topic) score += 8;

      if (resource.unitId && other.unitId === resource.unitId) score += 6;
      else if (resource.unit && other.unit && resource.unit === other.unit) score += 5;

      if (resource.subjectId && other.subjectId === resource.subjectId) score += 4;
      if (resource.gradeId && other.gradeId === resource.gradeId) score += 3;

      // Tag overlap
      const myTags = resource.tags || [];
      const otherTags = other.tags || [];
      const commonTags = myTags.filter(t => otherTags.includes(t));
      score += commonTags.length * 2;

      return { resource: other, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.resource);
  },

  // ==========================================
  // Audit Logs (Requirement #27)
  // ==========================================
  getAuditLogs(): AuditLogItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_AUDIT_LOGS);
      if (!stored) {
        const initialLogs: AuditLogItem[] = [
          {
            id: 'log-seed-1',
            actorId: 'system',
            userId: 'system',
            actorName: 'نظام مكتبة العلوم الرقمية',
            action: 'create',
            resourceId: 'res-chem-metals-10',
            resourceTitle: 'محاكاة النشاط الكيميائي للفلزات',
            timestamp: new Date().toISOString(),
            details: 'تهيئة المورد العلمي الاسترشادي في المكتبة'
          }
        ];
        localStorage.setItem(STORAGE_KEY_AUDIT_LOGS, JSON.stringify(initialLogs));
        return initialLogs;
      }
      return JSON.parse(stored);
    } catch {
      return [];
    }
  },

  addAuditLog(item: Omit<AuditLogItem, 'id' | 'timestamp'>): AuditLogItem {
    const list = this.getAuditLogs();
    const newLog: AuditLogItem = {
      ...item,
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      userId: item.userId || item.actorId
    };
    list.unshift(newLog);
    // Keep last 300 logs for performance
    const trimmed = list.slice(0, 300);
    try {
      localStorage.setItem(STORAGE_KEY_AUDIT_LOGS, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Failed to save audit log:', e);
    }
    return newLog;
  },

  // ==========================================
  // Archive Resource (Requirement #1 & #27)
  // ==========================================
  archiveResource(id: string, actorId: string, actorName: string): ResourceItem | null {
    const list = this.getResources();
    const index = list.findIndex(r => r.id === id);
    if (index === -1) return null;

    const existing = list[index];
    const updated: ResourceItem = {
      ...existing,
      status: 'archived',
      updatedAt: new Date().toISOString()
    };
    list[index] = updated;
    this.saveResources(list);

    this.addAuditLog({
      actorId,
      userId: actorId,
      actorName,
      action: 'archive',
      resourceId: id,
      resourceTitle: existing.title,
      details: 'أرشفة المورد التعليمي'
    });

    return updated;
  },

  // ==========================================
  // Duplicate Resource (Requirement #2)
  // ==========================================
  duplicateResource(id: string, actorId: string, actorName: string): ResourceItem | null {
    const list = this.getResources();
    const existing = list.find(r => r.id === id);
    if (!existing) return null;

    const newId = generateUuid();
    const now = new Date().toISOString();

    const duplicated: ResourceItem = {
      ...existing,
      id: newId,
      title: `نسخة من ${existing.title}`,
      status: 'draft',
      version: 'الإصدار 1.0',
      versions: [],
      ratingAverage: 0,
      ratingCount: 0,
      usageCount: 0,
      downloadCount: 0,
      createdAt: now,
      updatedAt: now,
      publishedAt: undefined,
      authorId: actorId,
      authorName: actorName
    };

    list.unshift(duplicated);
    this.saveResources(list);

    this.addAuditLog({
      actorId,
      userId: actorId,
      actorName,
      action: 'duplicate',
      resourceId: newId,
      resourceTitle: duplicated.title,
      details: `استنساخ المورد من (${existing.title})`
    });

    return duplicated;
  },

  // ==========================================
  // Restore Resource (Requirement #2)
  // ==========================================
  restoreResource(id: string, actorId: string, actorName: string): ResourceItem | null {
    const list = this.getResources();
    const index = list.findIndex(r => r.id === id);
    if (index === -1) return null;

    const existing = list[index];
    const now = new Date().toISOString();

    const restored: ResourceItem = {
      ...existing,
      status: 'draft',
      updatedAt: now
    };

    list[index] = restored;
    this.saveResources(list);

    this.addAuditLog({
      actorId,
      userId: actorId,
      actorName,
      action: 'update',
      resourceId: id,
      resourceTitle: existing.title,
      details: 'استرجاع المورد المؤرشف إلى المسودات'
    });

    return restored;
  },

  // ==========================================
  // Duplicate Detection Helper (Requirement #15)
  // ==========================================
  findPotentialDuplicates(title: string, fileName?: string, fileSize?: string): ResourceItem[] {
    const resources = this.getResources();
    const cleanTitle = title.trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه');

    return resources.filter(r => {
      const rTitle = r.title.trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه');
      // Exact or very close title match
      if (rTitle === cleanTitle) return true;
      if (rTitle.includes(cleanTitle) && cleanTitle.length > 5) return true;
      if (cleanTitle.includes(rTitle) && rTitle.length > 5) return true;
      // Matching filename
      if (fileName && r.fileName && r.fileName.toLowerCase() === fileName.toLowerCase()) return true;
      return false;
    });
  },

  // ==========================================
  // Export Resources Data (Requirement #25)
  // ==========================================
  exportResourcesData(format: 'json' | 'csv'): string {
    const resources = this.getResources();

    // Sanitize to exclude secrets and internal tokens
    const sanitized = resources.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      gradeName: r.gradeName,
      gradeId: r.gradeId,
      subjectName: r.subjectName,
      subjectId: r.subjectId,
      curriculum: r.curriculum,
      unit: r.unit,
      topic: r.topic,
      resourceType: r.resourceType,
      category: r.category || '',
      status: r.status,
      version: r.version,
      authorName: r.authorName,
      tags: (r.tags || []).join('; '),
      objectives: (r.educationalObjectives || []).join('; '),
      concepts: (r.scientificConcepts || []).join('; '),
      ratingAverage: r.ratingAverage,
      usageCount: r.usageCount,
      downloadCount: r.downloadCount,
      allowDownload: r.allowDownload ?? true,
      allowPreview: r.allowPreview ?? true,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));

    if (format === 'json') {
      return JSON.stringify(sanitized, null, 2);
    }

    // CSV format with UTF-8 BOM for Arabic support in Excel
    const headers = [
      'id', 'title', 'description', 'gradeName', 'subjectName', 'curriculum',
      'unit', 'topic', 'resourceType', 'category', 'status', 'version',
      'authorName', 'tags', 'objectives', 'concepts', 'ratingAverage', 'usageCount', 'downloadCount', 'createdAt'
    ];

    const escapeCsv = (val: unknown): string => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = sanitized.map(item => [
      escapeCsv(item.id),
      escapeCsv(item.title),
      escapeCsv(item.description),
      escapeCsv(item.gradeName),
      escapeCsv(item.subjectName),
      escapeCsv(item.curriculum),
      escapeCsv(item.unit),
      escapeCsv(item.topic),
      escapeCsv(item.resourceType),
      escapeCsv(item.category),
      escapeCsv(item.status),
      escapeCsv(item.version),
      escapeCsv(item.authorName),
      escapeCsv(item.tags),
      escapeCsv(item.objectives),
      escapeCsv(item.concepts),
      escapeCsv(item.ratingAverage),
      escapeCsv(item.usageCount),
      escapeCsv(item.downloadCount),
      escapeCsv(item.createdAt)
    ].join(','));

    // \uFEFF ensures proper Arabic rendering in Microsoft Excel
    return '\uFEFF' + [headers.join(','), ...rows].join('\n');
  }
};


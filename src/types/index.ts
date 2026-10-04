export type UserRole = 'user' | 'reviewer' | 'admin' | 'administrator';

export const isAdminRole = (role?: UserRole | null): boolean => {
  return role === 'admin' || role === 'administrator';
};

export const getRoleArabicLabel = (role?: UserRole | null): string => {
  if (isAdminRole(role)) return 'المدير';
  if (role === 'reviewer') return 'المراجع';
  return 'المستخدم';
};

/**
 * Universal helper to determine if a resource is an interactive HTML simulation,
 * experiment, or web package requiring sandbox iframe execution.
 */
export const isResourceInteractive = (resource?: ResourceItem | null): boolean => {
  if (!resource) return false;
  if (resource.htmlContent && resource.htmlContent.trim().length > 0) return true;
  if (resource.previewType === 'html') return true;
  if (resource.fileType === '.html' || resource.fileType === 'html') return true;
  if (resource.fileName?.toLowerCase().endsWith('.html') || resource.fileName?.toLowerCase().endsWith('.htm')) return true;
  
  const fileUrl = (resource.fileUrl || '').toLowerCase();
  if (fileUrl.startsWith('data:text/html') || fileUrl.endsWith('.html') || fileUrl.endsWith('.htm') || fileUrl.includes('.html')) return true;
  
  const resType = (resource.resourceType || '').toLowerCase();
  if (resType.includes('محاكاة') || resType.includes('تفاعلي') || resType.includes('simulation') || resType.includes('interactive')) return true;
  
  const cat = (resource.category || '').toLowerCase();
  if (cat.includes('محاكاة') || cat.includes('تفاعلي') || cat.includes('simulation')) return true;

  const pedCat = (resource.pedagogicalCategory || '').toLowerCase();
  if (pedCat.includes('محاكاة') || pedCat.includes('تفاعلي') || pedCat.includes('simulation')) return true;

  return false;
};

export interface UserProfile {
  id: string;
  uid?: string;
  displayName: string;
  email: string;
  role: UserRole;
  avatar?: string;
  photoURL?: string;
  school: string;
  createdAt: string;
  lastLoginAt: string;
}

export type ResourceStatus =
  | 'draft'           // مسودة
  | 'submitted'       // تم الإرسال للمراجعة
  | 'under_review'    // قيد المراجعة
  | 'approved'        // معتمد
  | 'published'       // منشور
  | 'rejected'        // مرفوض
  | 'needs_revision'  // يحتاج إلى تعديل
  | 'archived';       // مؤرشف

export interface CurriculumItem {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface UnitItem {
  id: string;
  curriculumId?: string;
  gradeId: string;
  subjectId: string;
  name: string;
  order: number;
  description?: string;
  isActive?: boolean;
}

export interface TopicItem {
  id: string;
  unitId: string;
  gradeId: string;
  subjectId: string;
  name: string;
  order: number;
  description?: string;
  isActive?: boolean;
}

export type PreviewType = 'html' | 'pdf' | 'video' | 'image' | 'presentation' | 'document' | 'other';

export interface ReviewNote {
  id: string;
  resourceId: string;
  reviewerId: string;
  reviewerName: string;
  status: ResourceStatus;
  comment: string;
  checklist?: Record<string, boolean>;
  createdAt: string;
}

export interface ResourceVersion {
  versionNumber: string;
  fileUrl?: string;
  changeNotes: string;
  createdAt: string;
  createdBy: string;
}

export interface SupportingFile {
  name: string;
  url: string;
  size?: string;
  type?: string;
}

export interface ResourceItem {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: string;
  resourceType: string;
  resourceTypeId?: string;
  category?: string; // التصنيف (تجربة، نشاط، مهارة...)
  pedagogicalCategory?: string; // الفئة التربوية
  gradeId: string;
  gradeName: string;
  subjectId: string;
  subjectName: string;
  curriculum: string;
  curriculumId?: string;
  unit: string;
  unitId?: string;
  topic: string;
  topicId?: string;
  authorId: string;
  authorName: string;
  status: ResourceStatus;
  version: string;
  tags: string[];
  ratingAverage: number;
  ratingCount: number;
  usageCount: number;
  downloadCount: number;
  previewType: PreviewType;
  htmlContent?: string; // Sandboxed HTML code or simulator
  educationalObjectives?: string[]; // الأهداف التعليمية
  scientificConcepts?: string[]; // المفاهيم العلمية
  executionTime?: string; // زمن التنفيذ (مثل: 45 دقيقة)
  usageContext?: string; // نمط الاستخدام: الاستخدام الصفي، المخبري، الفردي، الجماعي، عن بعد
  targetSkill?: string; // المهارة المستهدفة
  requiredTools?: string[]; // الأدوات المطلوبة
  allowDownload?: boolean; // إتاحة التحميل (افتراضياً true)
  allowPreview?: boolean; // إتاحة المعاينة (افتراضياً true)
  usageRights?: string; // حقوق الاستخدام والملكية
  supportingFiles?: SupportingFile[]; // الملفات المساندة
  isDemo?: boolean; // علامة المورد التجريبي الاسترشادي
  versions?: ResourceVersion[];
  reviewNotes?: ReviewNote[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface AuditLogItem {
  id: string;
  actorId: string;
  userId?: string;
  actorName: string;
  action: 'create' | 'update' | 'submit' | 'approve' | 'reject' | 'needs_revision' | 'publish' | 'unpublish' | 'version' | 'delete' | 'duplicate' | 'archive' | 'import' | 'bulk_import';
  resourceId: string;
  resourceTitle: string;
  timestamp: string;
  details?: string;
}

export interface GradeItem {
  id: string;
  name: string;
  number: number;
  stage: string;
  order?: number;
  isActive?: boolean;
  resourceCount?: number;
}

export interface SubjectItem {
  id: string;
  name: string;
  iconName: string;
  color: string;
  grades: string[];
  description: string;
  order?: number;
  isActive?: boolean;
  resourceCount?: number;
}

export interface ResourceTypeItem {
  id: string;
  name: string;
  iconName: string;
  description: string;
  isActive?: boolean;
}

export interface RatingRecord {
  id: string;
  userId: string;
  resourceId: string;
  score: number;
  createdAt: string;
}

export interface FavoriteRecord {
  id: string;
  userId: string;
  resourceId: string;
  createdAt: string;
}

export interface UsageMetric {
  id: string;
  resourceId: string;
  action: 'open' | 'launch' | 'download' | 'favorite' | 'rate';
  timestamp: string;
}

export interface UserNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  resourceId?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
}

export interface LibraryFilterState {
  searchQuery: string;
  gradeId: string;
  subjectId: string;
  curriculumId?: string;
  resourceType: string;
  unit: string;
  unitId?: string;
  topic: string;
  topicId?: string;
  category?: string;
  author: string;
  minRating: number;
  sortBy: 'newest' | 'usage' | 'rating' | 'alphabetical';
}

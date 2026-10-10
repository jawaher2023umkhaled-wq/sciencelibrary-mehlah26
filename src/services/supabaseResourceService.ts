import { supabase } from './supabase';
import { ResourceItem, PreviewType, ResourceStatus } from '../types';
import { getSimulationContent } from '../data/simulations';
import { storageService } from './storageService';

/**
 * Validates whether a string is a standard RFC4122 v4 UUID.
 */
export function isValidUuid(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str.trim());
}

/**
 * Generates a standard RFC4122 v4 UUID.
 */
export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Helper to gracefully retry Supabase queries if optional columns are not yet in the database schema.
 */
async function executeWithSchemaFallback(
  action: (row: Record<string, unknown>) => PromiseLike<{ data: any; error: any; status?: number; statusText?: string }>,
  initialRow: Record<string, unknown>
): Promise<{ data: any; error: any; status?: number; statusText?: string }> {
  let row = { ...initialRow };
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await action(row);
    if (!res.error) return res;
    if (res.error.code === 'PGRST204' && typeof res.error.message === 'string') {
      const match = res.error.message.match(/'([^']+)' column/);
      if (match && match[1] && match[1] in row) {
        delete row[match[1]];
        continue;
      }
    }
    return res;
  }
  return await action(row);
}

/**
 * Normalizes grade text to canonical grade ID and display name.
 */
export function normalizeGrade(gradeStr?: string | null): { gradeId: string; gradeName: string } {
  if (!gradeStr) return { gradeId: 'grade-10', gradeName: 'الصف العاشر' };
  const str = gradeStr.trim();
  if (str.includes('خامس') || str === '5' || str === 'grade-5') return { gradeId: 'grade-5', gradeName: 'الصف الخامس' };
  if (str.includes('سادس') || str === '6' || str === 'grade-6') return { gradeId: 'grade-6', gradeName: 'الصف السادس' };
  if (str.includes('سابع') || str === '7' || str === 'grade-7') return { gradeId: 'grade-7', gradeName: 'الصف السابع' };
  if (str.includes('ثامن') || str === '8' || str === 'grade-8') return { gradeId: 'grade-8', gradeName: 'الصف الثامن' };
  if (str.includes('تاسع') || str === '9' || str === 'grade-9') return { gradeId: 'grade-9', gradeName: 'الصف التاسع' };
  if (str.includes('حادي عشر') || str === '11' || str === 'grade-11') return { gradeId: 'grade-11', gradeName: 'الصف الحادي عشر' };
  if (str.includes('ثاني عشر') || str === '12' || str === 'grade-12') return { gradeId: 'grade-12', gradeName: 'الصف الثاني عشر' };
  if (str.includes('عاشر') || str === '10' || str === 'grade-10') return { gradeId: 'grade-10', gradeName: 'الصف العاشر' };
  return { gradeId: 'grade-' + str, gradeName: str };
}

/**
 * Normalizes subject text to canonical subject ID and display name.
 */
export function normalizeSubject(subjectStr?: string | null): { subjectId: string; subjectName: string } {
  if (!subjectStr) return { subjectId: 'general-science', subjectName: 'العلوم' };
  const str = subjectStr.trim();
  if (str.includes('كيمياء') || str === 'chemistry') return { subjectId: 'chemistry', subjectName: 'الكيمياء' };
  if (str.includes('فيزياء') || str === 'physics') return { subjectId: 'physics', subjectName: 'الفيزياء' };
  if (str.includes('أحياء') || str.includes('احياء') || str === 'biology') return { subjectId: 'biology', subjectName: 'الأحياء' };
  if (str.includes('بيئ') || str === 'environmental-science') return { subjectId: 'environmental-science', subjectName: 'العلوم البيئية' };
  if (str.includes('علوم') || str === 'general-science') return { subjectId: 'general-science', subjectName: 'العلوم' };
  return { subjectId: str, subjectName: str };
}

/**
 * Transforms a frontend ResourceItem into columns for `public.resources`:
 */
export function toSupabaseRow(item: ResourceItem): Record<string, unknown> {
  const id = isValidUuid(item.id) ? item.id : generateUuid();

  const rawHtml = item.htmlContent || item.html_content;
  let url = item.fileUrl || item.file_url || '';

  if (rawHtml && rawHtml.trim().length > 0) {
    if (!url || url.startsWith('https://images.unsplash.com') || url.startsWith('data:image') || !url.startsWith('http')) {
      url = 'data:text/html;charset=utf-8,' + encodeURIComponent(rawHtml);
    }
  } else if (!url || url.startsWith('https://images.unsplash.com')) {
    const builtinSim = getSimulationContent(item);
    if (builtinSim) {
      url = 'data:text/html;charset=utf-8,' + encodeURIComponent(builtinSim);
    } else {
      url = item.thumbnailUrl || item.thumbnail_url || item.image_url || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80';
    }
  }

  const downloadUrl = (item.download_url && item.download_url.startsWith('http'))
    ? item.download_url
    : (item.fileUrl && item.fileUrl.startsWith('http') && !item.fileUrl.startsWith('https://images.unsplash.com'))
    ? item.fileUrl
    : (url.startsWith('http') && !url.startsWith('https://images.unsplash.com') ? url : undefined);

  const { gradeName } = normalizeGrade(item.gradeName || item.gradeId);
  const { subjectName } = normalizeSubject(item.subjectName || item.subjectId);

  // Strictly write only confirmed production columns in public.resources:
  // id, title, description, subject, grade, type, url, download_url, created_at, status, user_id, published_at
  const row: Record<string, unknown> = {
    id,
    title: item.title || 'مورد تعليمي بدون عنوان',
    description: item.description || '',
    type: item.resourceType || item.type || 'محاكاة',
    subject: subjectName,
    grade: gradeName,
    url,
    created_at: item.createdAt || new Date().toISOString()
  };

  if (downloadUrl) {
    row.download_url = downloadUrl;
  }

  if (item.status) {
    row.status = item.status;
  }

  if (item.user_id && isValidUuid(item.user_id)) {
    row.user_id = item.user_id;
  }

  if (item.publishedAt) {
    row.published_at = item.publishedAt;
  } else if (item.status === 'published') {
    row.published_at = item.createdAt || new Date().toISOString();
  } else if (item.status) {
    row.published_at = null;
  }

  return row;
}

/**
 * Transforms a Supabase database row from `public.resources` into a frontend ResourceItem.
 */
export function fromSupabaseRow(row: Record<string, unknown>): ResourceItem {
  const id = String(row.id);
  const title = String(row.title || 'مورد تعليمي');
  const description = String(row.description || '');
  const type = String(row.type || 'محاكاة');
  const subject = String(row.subject || 'العلوم');
  const grade = String(row.grade || 'الصف الخامس');
  
  // Inspect all potential columns and aliases (url, file_url, file_path, html_content, download_url)
  const rawUrl = String(row.url || row.file_url || row.file_path || '');
  const downloadUrl = row.download_url ? String(row.download_url) : '';
  const rawHtmlField = row.html_content ? String(row.html_content) : '';
  const createdAt = String(row.created_at || new Date().toISOString());

  // Detect and decode HTML content from database record
  let extractedHtml: string | undefined = undefined;

  if (rawHtmlField && rawHtmlField.trim().length > 0) {
    extractedHtml = rawHtmlField;
  } else if (rawUrl.startsWith('data:text/html;charset=utf-8,')) {
    try {
      extractedHtml = decodeURIComponent(rawUrl.replace('data:text/html;charset=utf-8,', ''));
    } catch {
      extractedHtml = rawUrl;
    }
  } else if (rawUrl.startsWith('data:text/html;base64,')) {
    try {
      extractedHtml = decodeURIComponent(escape(atob(rawUrl.replace('data:text/html;base64,', ''))));
    } catch {
      try {
        extractedHtml = atob(rawUrl.replace('data:text/html;base64,', ''));
      } catch {
        extractedHtml = undefined;
      }
    }
  } else if (rawUrl.trim().startsWith('<!DOCTYPE html') || rawUrl.trim().startsWith('<html') || (rawUrl.includes('</') && rawUrl.includes('<script'))) {
    extractedHtml = rawUrl;
  }

  // If HTML is still not extracted, check built-in simulation repository
  if (!extractedHtml) {
    const builtinSim = getSimulationContent({ title, description, topic: title, resourceType: type, type });
    if (builtinSim) {
      extractedHtml = builtinSim;
    }
  }

  const isRawUrlImage = rawUrl.startsWith('https://images.unsplash.com') ||
                        /\.(png|jpg|jpeg|gif|webp|svg)($|\?)/i.test(rawUrl);

  const isRawUrlHtmlOrStorage = rawUrl.toLowerCase().includes('.html') ||
                                rawUrl.toLowerCase().includes('.htm') ||
                                rawUrl.includes('/storage/') ||
                                rawUrl.startsWith('data:text/html');

  let fileUrl: string | undefined = undefined;
  if (isRawUrlHtmlOrStorage || (!isRawUrlImage && rawUrl.startsWith('http'))) {
    fileUrl = rawUrl;
  } else if (downloadUrl && downloadUrl.startsWith('http')) {
    fileUrl = downloadUrl;
  } else if (extractedHtml) {
    fileUrl = `data:text/html;charset=utf-8,${encodeURIComponent(extractedHtml)}`;
  }

  // Check local cache for fallback metadata if needed
  const existingLocal = typeof window !== 'undefined' ? storageService.getResourceById(id) : undefined;

  const rawThumbnailField = row.thumbnail_url || row.image_url || row.thumbnail;
  const thumbnailUrl = rawThumbnailField
    ? String(rawThumbnailField)
    : (existingLocal?.thumbnailUrl || (isRawUrlImage ? rawUrl : 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80'));

  const rowStatus = row.status ? String(row.status) : undefined;
  const status: ResourceStatus = (rowStatus as ResourceStatus) || existingLocal?.status || 'published';
  const userId = (row.user_id && isValidUuid(String(row.user_id))) ? String(row.user_id) : (existingLocal?.user_id && isValidUuid(existingLocal.user_id) ? existingLocal.user_id : undefined);
  const authorId = userId || (existingLocal?.authorId && isValidUuid(existingLocal.authorId) ? existingLocal.authorId : '');
  const authorName = row.author_name ? String(row.author_name) : (existingLocal?.authorName || 'مكتبة العلوم الرقمية');
  const publishedAt = row.published_at ? String(row.published_at) : (status === 'published' ? createdAt : undefined);

  const typeLower = type.toLowerCase();
  const isInteractiveType =
    typeLower === 'simulation' ||
    typeLower.includes('simulation') ||
    typeLower.includes('محاكاة') ||
    typeLower.includes('تفاعلي') ||
    typeLower.includes('interactive') ||
    !!extractedHtml ||
    (fileUrl && (fileUrl.includes('.html') || fileUrl.includes('/storage/')));

  const { gradeId, gradeName } = normalizeGrade(grade);
  const { subjectId, subjectName } = normalizeSubject(subject);
  const cleanUnit = (existingLocal?.unit && existingLocal.unit !== 'الوحدة التعليمية') ? existingLocal.unit : '';
  const cleanTopic = (existingLocal?.topic && existingLocal.topic !== title) ? existingLocal.topic : title;

  return {
    id,
    title,
    description,
    thumbnailUrl,
    thumbnail_url: thumbnailUrl,
    image_url: thumbnailUrl,
    fileUrl: fileUrl || (extractedHtml ? `data:text/html;charset=utf-8,${encodeURIComponent(extractedHtml)}` : undefined),
    file_url: fileUrl,
    htmlContent: extractedHtml,
    html_content: extractedHtml,
    fileName: `${title}.html`,
    fileType: isInteractiveType ? '.html' : undefined,
    resourceType: type,
    type,
    subjectName,
    gradeName,
    gradeId,
    subjectId,
    curriculum: existingLocal?.curriculum || 'منهج سلطنة عُمان المعتمد',
    unit: cleanUnit,
    topic: cleanTopic || title,
    user_id: userId,
    authorId,
    authorName,
    author: authorName,
    status,
    version: existingLocal?.version || '1.0',
    tags: Array.isArray(existingLocal?.tags) && existingLocal.tags.length > 0 ? existingLocal.tags : [subjectName, gradeName, type],
    supportingFiles: existingLocal?.supportingFiles || [],
    units: existingLocal?.units || [],
    ratingAverage: existingLocal?.ratingAverage ?? 0,
    ratingCount: existingLocal?.ratingCount ?? 0,
    usageCount: existingLocal?.usageCount ?? 0,
    downloadCount: existingLocal?.downloadCount ?? 0,
    previewType: isInteractiveType ? 'html' : 'document',
    allowDownload: existingLocal?.allowDownload ?? true,
    allowPreview: existingLocal?.allowPreview ?? true,
    createdAt,
    updatedAt: existingLocal?.updatedAt || createdAt,
    publishedAt: publishedAt || (status === 'published' ? createdAt : undefined)
  };
}

export const supabaseResourceService = {
  /**
   * Check if Supabase resources table is active and report total row count.
   */
  async checkTableStatus(): Promise<{ exists: boolean; count: number; error?: string }> {
    try {
      const { count, error } = await supabase
        .from('resources')
        .select('*', { count: 'exact', head: true });

      if (error) {
        return { exists: false, count: 0, error: error.message };
      }
      return { exists: true, count: count ?? 0 };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { exists: false, count: 0, error: message };
    }
  },

  /**
   * Fetch all resources live from the Supabase `resources` table.
   * RLS automatically filters: visitors see published, users see published + own, admin sees all.
   */
  async fetchLiveResources(): Promise<{ data: ResourceItem[]; isLive: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetchLiveResources error:', error);
        return { data: [], isLive: false, error: error.message };
      }

      if (data) {
        const mapped = data.map((row: Record<string, unknown>) => fromSupabaseRow(row));
        return { data: mapped, isLive: true };
      }

      return { data: [], isLive: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Supabase fetch connection exception:', message);
      return { data: [], isLive: false, error: message };
    }
  },

  /**
   * Fetch resources pending review from Supabase `resources` table.
   */
  async fetchPendingResources(): Promise<{ data: ResourceItem[]; isLive: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetchPendingResources error:', error);
        return { data: [], isLive: false, error: error.message };
      }

      if (data) {
        const mapped = data.map((row: Record<string, unknown>) => fromSupabaseRow(row));
        const pending = mapped.filter(r => r && (r.status === 'pending' || r.status === 'submitted' || r.status === 'under_review'));
        return { data: pending, isLive: true };
      }

      return { data: [], isLive: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Supabase fetchPendingResources exception:', message);
      return { data: [], isLive: false, error: message };
    }
  },

  /**
   * Create a new resource directly in Supabase `resources` table.
   * Enforces:
   * - Active Supabase Auth session required.
   * - user_id strictly equals session auth.uid() (UUID).
   * - Regular users: status = 'pending', published_at = null.
   * - Admin (sciencelibrary8@gmail.com): can insert as published or pending.
   */
  async createResource(item: ResourceItem): Promise<{ data: ResourceItem | null; savedToSupabase: boolean; error?: string }> {
    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !sessionData?.session?.user) {
        return {
          data: null,
          savedToSupabase: false,
          error: 'يجب تسجيل الدخول أولاً بحساب معتمد في Supabase لإدراج المورد في قاعدة البيانات.'
        };
      }

      const sessionUser = sessionData.session.user;
      const sessionEmail = (sessionUser.email || '').trim().toLowerCase();
      const isAdmin = sessionEmail === 'sciencelibrary8@gmail.com';
      const authUserId = sessionUser.id;

      if (!isValidUuid(authUserId)) {
        return {
          data: null,
          savedToSupabase: false,
          error: 'معرف المستخدم في جلسة Supabase غير صالح (ليس UUID).'
        };
      }

      const id = isValidUuid(item.id) ? item.id : generateUuid();
      const { gradeName } = normalizeGrade(item.gradeName || item.gradeId);
      const { subjectName } = normalizeSubject(item.subjectName || item.subjectId);

      const rawHtml = item.htmlContent || item.html_content;
      let url = item.fileUrl || item.file_url || '';
      if (rawHtml && rawHtml.trim().length > 0) {
        if (!url || url.startsWith('https://images.unsplash.com') || url.startsWith('data:image') || !url.startsWith('http')) {
          url = 'data:text/html;charset=utf-8,' + encodeURIComponent(rawHtml);
        }
      } else if (!url || url.startsWith('https://images.unsplash.com')) {
        const builtinSim = getSimulationContent(item);
        if (builtinSim) {
          url = 'data:text/html;charset=utf-8,' + encodeURIComponent(builtinSim);
        } else {
          url = item.thumbnailUrl || item.thumbnail_url || item.image_url || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80';
        }
      }

      const downloadUrl = (item.download_url && item.download_url.startsWith('http'))
        ? item.download_url
        : (item.fileUrl && item.fileUrl.startsWith('http') && !item.fileUrl.startsWith('https://images.unsplash.com'))
        ? item.fileUrl
        : (url.startsWith('http') && !url.startsWith('https://images.unsplash.com') ? url : undefined);

      const now = new Date().toISOString();
      const finalStatus: ResourceStatus = isAdmin ? (item.status || 'published') : 'pending';
      const finalPublishedAt: string | null = (isAdmin && finalStatus === 'published')
        ? (item.publishedAt || now)
        : null;

      // Confirmed database columns only:
      // id, title, description, subject, grade, type, url, download_url, created_at, status, user_id, published_at
      const row: Record<string, unknown> = {
        id,
        title: item.title || 'مورد تعليمي بدون عنوان',
        description: item.description || '',
        type: item.resourceType || item.type || 'محاكاة',
        subject: subjectName,
        grade: gradeName,
        url,
        created_at: item.createdAt || now,
        status: finalStatus,
        user_id: authUserId,
        published_at: finalPublishedAt
      };

      if (downloadUrl) {
        row.download_url = downloadUrl;
      }

      const { data, error, status } = await executeWithSchemaFallback(
        (targetRow) => supabase.from('resources').insert(targetRow).select().maybeSingle(),
        row
      );

      if (error) {
        console.error('Supabase INSERT rejected:', error, 'status:', status);
        const detailedMsg = `[Status ${status || 'N/A'}${error.code ? ` - Code ${error.code}` : ''}] ${error.message}`;
        return { data: null, savedToSupabase: false, error: detailedMsg };
      }

      if (data) {
        const mapped = fromSupabaseRow(data as Record<string, unknown>);
        if (item.thumbnailUrl) {
          mapped.thumbnailUrl = item.thumbnailUrl;
          mapped.thumbnail_url = item.thumbnailUrl;
          mapped.image_url = item.thumbnailUrl;
        }
        if (item.authorName) {
          mapped.authorName = item.authorName;
          mapped.author = item.authorName;
        }
        return { data: mapped, savedToSupabase: true };
      }

      return {
        data: null,
        savedToSupabase: false,
        error: `[Status ${status || 200}] لم يتم تأكيد حفظ المورد في قاعدة البيانات.`
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Supabase INSERT exception:', message);
      return { data: null, savedToSupabase: false, error: message };
    }
  },

  /**
   * Update an existing resource directly in Supabase `resources` table by its UUID.
   * Enforces:
   * - Active Supabase Auth session required.
   * - Publishing (status = 'published') strictly restricted to sciencelibrary8@gmail.com.
   * - Regular user can update their own resource (via resources_owner_update_policy) but cannot change user_id or status to published.
   * - Admin can update any resource (via resources_admin_update_policy).
   */
  async updateResource(id: string, updates: Partial<ResourceItem>): Promise<{ data: ResourceItem | null; savedToSupabase: boolean; error?: string }> {
    if (!isValidUuid(id)) {
      return { data: null, savedToSupabase: false, error: `معرف المورد ليس بصيغة UUID صالحة: ${id}` };
    }

    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !sessionData?.session?.user) {
        return {
          data: null,
          savedToSupabase: false,
          error: 'لا توجد جلسة مصادقة نشطة في Supabase. يرجى تسجيل الدخول أولاً لإجراء التعديل.'
        };
      }

      const sessionUser = sessionData.session.user;
      const sessionEmail = (sessionUser.email || '').trim().toLowerCase();
      const isAdmin = sessionEmail === 'sciencelibrary8@gmail.com';

      // Security check: non-admin cannot publish or approve resources
      if ((updates.status === 'published' || updates.status === 'approved' || updates.publishedAt !== undefined) && !isAdmin) {
        return {
          data: null,
          savedToSupabase: false,
          error: 'عملية النشر والاعتماد مقتصرة حصرياً على حساب المديرة الرسمي (sciencelibrary8@gmail.com).'
        };
      }

      // Build payload strictly with confirmed columns:
      // title, description, subject, grade, type, url, download_url, status, published_at, user_id
      const partialRow: Record<string, unknown> = {};
      if (updates.title !== undefined) partialRow.title = updates.title;
      if (updates.description !== undefined) partialRow.description = updates.description;
      if (updates.resourceType !== undefined || updates.type !== undefined) {
        partialRow.type = updates.resourceType || updates.type;
      }
      if (updates.subjectName !== undefined || updates.subjectId !== undefined) {
        const { subjectName } = normalizeSubject(updates.subjectName || updates.subjectId);
        partialRow.subject = subjectName;
      }
      if (updates.gradeName !== undefined || updates.gradeId !== undefined) {
        const { gradeName } = normalizeGrade(updates.gradeName || updates.gradeId);
        partialRow.grade = gradeName;
      }

      const effectiveThumb = updates.thumbnailUrl || (updates as any).thumbnail_url || (updates as any).image_url;
      if (updates.htmlContent !== undefined && updates.htmlContent.trim().length > 0) {
        partialRow.url = 'data:text/html;charset=utf-8,' + encodeURIComponent(updates.htmlContent);
      } else if (updates.fileUrl !== undefined || (updates as any).url !== undefined) {
        partialRow.url = updates.fileUrl || (updates as any).url;
      } else if (effectiveThumb !== undefined && !updates.fileUrl) {
        partialRow.url = effectiveThumb;
      }

      if ((updates as any).download_url !== undefined && typeof (updates as any).download_url === 'string') {
        partialRow.download_url = (updates as any).download_url;
      }

      // Status & published_at columns
      if (updates.status !== undefined) {
        partialRow.status = updates.status;
        if (updates.status === 'published') {
          partialRow.published_at = updates.publishedAt || new Date().toISOString();
        } else if (updates.publishedAt === undefined) {
          partialRow.published_at = null;
        }
      } else if (updates.publishedAt !== undefined) {
        partialRow.published_at = updates.publishedAt;
      }

      // Only admin can reassign user_id, and it must be a valid UUID
      if (isAdmin && (updates as any).user_id && isValidUuid((updates as any).user_id)) {
        partialRow.user_id = (updates as any).user_id;
      }

      // Prevent empty UPDATE payload
      if (Object.keys(partialRow).length === 0) {
        return {
          data: null,
          savedToSupabase: false,
          error: 'لا توجد حقول مدعومة للتحديث في جدول resources.'
        };
      }

      const { data, error, status } = await executeWithSchemaFallback(
        (targetRow) => supabase.from('resources').update(targetRow).eq('id', id).select().maybeSingle(),
        partialRow
      );

      if (error) {
        console.error('Supabase UPDATE rejected:', error, 'status:', status);
        const detailedMsg = `[Status ${status || 'N/A'}${error.code ? ` - Code ${error.code}` : ''}] ${error.message}`;
        return { data: null, savedToSupabase: false, error: detailedMsg };
      }

      if (data) {
        const mapped = fromSupabaseRow(data as Record<string, unknown>);
        if (effectiveThumb) {
          mapped.thumbnailUrl = effectiveThumb;
          mapped.thumbnail_url = effectiveThumb;
          mapped.image_url = effectiveThumb;
        }
        return { data: { ...mapped, ...updates }, savedToSupabase: true };
      }

      return {
        data: null,
        savedToSupabase: false,
        error: `[Status ${status || 200}] لم يتم تحديث أي سجل في قاعدة البيانات (matched 0 rows). قد تكون سياسة RLS تمنع التحديث للحساب الحالي أو أن المورد غير موجود.`
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Supabase UPDATE exception:', message);
      return { data: null, savedToSupabase: false, error: message };
    }
  },

  /**
   * Publish a resource to public.resources.
   * Strictly restricted to the official administrator: sciencelibrary8@gmail.com.
   * Updates `status = 'published'` and `published_at = now()`.
   */
  async publishResource(id: string): Promise<{ data: ResourceItem | null; savedToSupabase: boolean; error?: string }> {
    if (!isValidUuid(id)) {
      return { data: null, savedToSupabase: false, error: `معرف المورد ليس بصيغة UUID صالحة: ${id}` };
    }

    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !sessionData?.session?.user) {
        return {
          data: null,
          savedToSupabase: false,
          error: 'لا توجد جلسة مصادقة نشطة في Supabase. يرجى تسجيل الدخول الفعلي بحساب المديرة أولاً للمتابعة ونشر المورد.'
        };
      }

      const sessionEmail = (sessionData.session.user.email || '').trim().toLowerCase();
      if (sessionEmail !== 'sciencelibrary8@gmail.com') {
        return {
          data: null,
          savedToSupabase: false,
          error: `حساب الجلسة الحالي (${sessionEmail}) غير مخول بنشر الموارد. النشر مقتصر على حساب المديرة الرسمي (sciencelibrary8@gmail.com).`
        };
      }

      const now = new Date().toISOString();
      const payload = {
        status: 'published',
        published_at: now
      };

      const { data, error, status } = await executeWithSchemaFallback(
        (targetRow) => supabase.from('resources').update(targetRow).eq('id', id).select().maybeSingle(),
        payload
      );

      if (error) {
        console.error('Supabase PUBLISH rejected:', error, 'status:', status);
        const detailedMsg = `[Status ${status || 'N/A'}${error.code ? ` - Code ${error.code}` : ''}] ${error.message}`;
        return { data: null, savedToSupabase: false, error: detailedMsg };
      }

      if (!data) {
        return {
          data: null,
          savedToSupabase: false,
          error: `[Status ${status || 200}] لم يتم تحديث أي سجل في قاعدة البيانات (matched 0 rows). تأكد من وجود السجل وصلاحيات سياسة resources_admin_update_policy.`
        };
      }

      const mapped = fromSupabaseRow(data as Record<string, unknown>);
      return { data: mapped, savedToSupabase: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Supabase PUBLISH exception:', message);
      return { data: null, savedToSupabase: false, error: message };
    }
  },

  /**
   * Unpublish a resource from public.resources (reverts to 'approved' and clears published_at).
   * Strictly restricted to the official administrator: sciencelibrary8@gmail.com.
   */
  async unpublishResource(id: string): Promise<{ data: ResourceItem | null; savedToSupabase: boolean; error?: string }> {
    if (!isValidUuid(id)) {
      return { data: null, savedToSupabase: false, error: `معرف المورد ليس بصيغة UUID صالحة: ${id}` };
    }

    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !sessionData?.session?.user) {
        return {
          data: null,
          savedToSupabase: false,
          error: 'لا توجد جلسة مصادقة نشطة في Supabase.'
        };
      }

      const sessionEmail = (sessionData.session.user.email || '').trim().toLowerCase();
      if (sessionEmail !== 'sciencelibrary8@gmail.com') {
        return {
          data: null,
          savedToSupabase: false,
          error: 'إلغاء النشر مقتصر على حساب المديرة الرسمي (sciencelibrary8@gmail.com).'
        };
      }

      const payload = {
        status: 'approved',
        published_at: null
      };

      const { data, error, status } = await executeWithSchemaFallback(
        (targetRow) => supabase.from('resources').update(targetRow).eq('id', id).select().maybeSingle(),
        payload
      );

      if (error) {
        return {
          data: null,
          savedToSupabase: false,
          error: `[Status ${status || 'N/A'}] ${error.message}`
        };
      }

      if (!data) {
        return {
          data: null,
          savedToSupabase: false,
          error: `[Status ${status || 200}] لم يتم العثور على المورد المطلوب لتحديثه (matched 0 rows).`
        };
      }

      const mapped = fromSupabaseRow(data as Record<string, unknown>);
      return { data: mapped, savedToSupabase: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { data: null, savedToSupabase: false, error: message };
    }
  },

  /**
   * Delete a resource directly from Supabase `resources` table by its UUID.
   */
  async deleteResource(id: string): Promise<{ success: boolean; deletedFromSupabase: boolean; error?: string }> {
    if (!isValidUuid(id)) {
      if (id === 'res-chem-acid-base-10') {
        return { success: true, deletedFromSupabase: true };
      }
      return { success: false, deletedFromSupabase: false, error: `معرف المورد ليس بصيغة UUID صالحة: ${id}` };
    }

    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase DELETE rejected:', error);
        return { success: false, deletedFromSupabase: false, error: error.message };
      }

      return { success: true, deletedFromSupabase: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Supabase DELETE exception:', message);
      return { success: false, deletedFromSupabase: false, error: message };
    }
  },

  /**
   * Sync a batch of resources to Supabase resources table.
   */
  async syncBatchToSupabase(items: ResourceItem[]): Promise<{ count: number; error?: string }> {
    try {
      const rows = items.map(item => toSupabaseRow(item));
      const { data, error } = await supabase
        .from('resources')
        .upsert(rows, { onConflict: 'id' })
        .select('id');

      if (error) {
        console.error('Supabase batch upsert error:', error);
        return { count: 0, error: error.message };
      }

      return { count: data?.length || 0 };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { count: 0, error: message };
    }
  }
};

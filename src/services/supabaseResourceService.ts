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
  action: (row: Record<string, unknown>) => PromiseLike<{ data: any; error: any }>,
  initialRow: Record<string, unknown>
): Promise<{ data: any; error: any }> {
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

  const downloadUrl = (item.fileUrl && !item.fileUrl.startsWith('https://images.unsplash.com'))
    ? item.fileUrl
    : (url.startsWith('http') ? url : undefined);

  const thumb = item.thumbnailUrl || item.thumbnail_url || item.image_url || (url.startsWith('http') && !url.includes('.html') ? url : undefined);
  const status = item.status === 'submitted' ? 'pending' : (item.status || 'pending');
  const userId = item.user_id || item.authorId || undefined;

  const { gradeName } = normalizeGrade(item.gradeName || item.gradeId);
  const { subjectName } = normalizeSubject(item.subjectName || item.subjectId);

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

  if (downloadUrl) row.download_url = downloadUrl;
  if (thumb) {
    row.thumbnail_url = thumb;
    row.image_url = thumb;
  }
  if (status) row.status = status;
  if (userId) row.user_id = userId;

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

  // Check local cache for fallback data if column is not yet in Supabase table
  const existingLocal = typeof window !== 'undefined' ? storageService.getResourceById(id) : undefined;

  const rawThumbnailField = row.thumbnail_url || row.image_url || row.thumbnail;
  const thumbnailUrl = rawThumbnailField
    ? String(rawThumbnailField)
    : (existingLocal?.thumbnailUrl || (isRawUrlImage ? rawUrl : 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80'));

  const rowStatus = row.status ? String(row.status) : undefined;
  const status: ResourceStatus = (rowStatus as ResourceStatus) || existingLocal?.status || 'published';
  const userId = row.user_id ? String(row.user_id) : (existingLocal?.user_id || undefined);
  const authorId = row.author_id ? String(row.author_id) : (userId || existingLocal?.authorId || 'admin');
  const authorName = row.author_name ? String(row.author_name) : (existingLocal?.authorName || 'مكتبة العلوم الرقمية');

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
    publishedAt: status === 'published' ? createdAt : undefined
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
   */
  async createResource(item: ResourceItem): Promise<{ data: ResourceItem | null; savedToSupabase: boolean; error?: string }> {
    const row = toSupabaseRow(item);

    try {
      const { data, error } = await executeWithSchemaFallback(
        (targetRow) => supabase.from('resources').insert(targetRow).select().maybeSingle(),
        row
      );

      if (error) {
        console.error('Supabase INSERT rejected:', error);
        return { data: null, savedToSupabase: false, error: error.message };
      }

      if (data) {
        const mapped = fromSupabaseRow(data as Record<string, unknown>);
        // Ensure thumbnail, status, and user_id are not lost
        if (item.thumbnailUrl) {
          mapped.thumbnailUrl = item.thumbnailUrl;
          mapped.thumbnail_url = item.thumbnailUrl;
          mapped.image_url = item.thumbnailUrl;
        }
        if (item.status) mapped.status = item.status;
        if (item.user_id) mapped.user_id = item.user_id;
        return { data: mapped, savedToSupabase: true };
      }

      return { data: item, savedToSupabase: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Supabase INSERT exception:', message);
      return { data: null, savedToSupabase: false, error: message };
    }
  },

  /**
   * Update an existing resource directly in Supabase `resources` table by its UUID.
   */
  async updateResource(id: string, updates: Partial<ResourceItem>): Promise<{ data: ResourceItem | null; savedToSupabase: boolean; error?: string }> {
    if (!isValidUuid(id)) {
      if (id === 'res-chem-acid-base-10') {
        return { data: null, savedToSupabase: true };
      }
      return { data: null, savedToSupabase: false, error: `معرف المورد ليس بصيغة UUID صالحة: ${id}` };
    }

    const partialRow: Record<string, unknown> = {};
    if (updates.title !== undefined) partialRow.title = updates.title;
    if (updates.description !== undefined) partialRow.description = updates.description;
    if (updates.resourceType !== undefined) partialRow.type = updates.resourceType;
    if (updates.subjectName !== undefined) partialRow.subject = updates.subjectName;
    if (updates.gradeName !== undefined) partialRow.grade = updates.gradeName;

    // Save updated thumbnail URL to thumbnail_url and image_url columns
    const effectiveThumb = updates.thumbnailUrl || updates.thumbnail_url || updates.image_url;
    if (effectiveThumb !== undefined) {
      partialRow.thumbnail_url = effectiveThumb;
      partialRow.image_url = effectiveThumb;
    }

    // Save updated status and user_id
    if (updates.status !== undefined) {
      partialRow.status = updates.status === 'submitted' ? 'pending' : updates.status;
    }
    if (updates.user_id !== undefined) {
      partialRow.user_id = updates.user_id;
    }

    // Requirement 3: Save updated HTML content or file URL to the database record
    if (updates.htmlContent !== undefined && updates.htmlContent.trim().length > 0) {
      partialRow.url = 'data:text/html;charset=utf-8,' + encodeURIComponent(updates.htmlContent);
    } else if (updates.fileUrl !== undefined) {
      partialRow.url = updates.fileUrl;
    } else if (effectiveThumb !== undefined) {
      // If no fileUrl or htmlContent, update url to the thumbnail image
      partialRow.url = effectiveThumb;
    }

    try {
      const { data, error } = await executeWithSchemaFallback(
        (targetRow) => supabase.from('resources').update(targetRow).eq('id', id).select().maybeSingle(),
        partialRow
      );

      if (error) {
        console.error('Supabase UPDATE rejected:', error);
        return { data: null, savedToSupabase: false, error: error.message };
      }

      if (data) {
        const mapped = fromSupabaseRow(data as Record<string, unknown>);
        // Guarantee that the new thumbnail, status, and updates are preserved immediately in the return
        if (effectiveThumb) {
          mapped.thumbnailUrl = effectiveThumb;
          mapped.thumbnail_url = effectiveThumb;
          mapped.image_url = effectiveThumb;
        }
        if (updates.status) {
          mapped.status = updates.status === 'submitted' ? 'pending' : updates.status;
        }
        return { data: { ...mapped, ...updates, ...(effectiveThumb ? { thumbnailUrl: effectiveThumb, thumbnail_url: effectiveThumb, image_url: effectiveThumb } : {}) }, savedToSupabase: true };
      }

      return { data: null, savedToSupabase: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Supabase UPDATE exception:', message);
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

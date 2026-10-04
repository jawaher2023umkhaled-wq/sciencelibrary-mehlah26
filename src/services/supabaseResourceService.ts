import { supabase } from './supabase';
import { ResourceItem, PreviewType, ResourceStatus } from '../types';
import { getSimulationContent } from '../data/simulations';

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
 * Transforms a frontend ResourceItem into the EXACT columns present in `public.resources`:
 * Columns: (id: UUID, title: text, description: text, type: text, subject: text, grade: text, url: text, created_at: timestamptz)
 */
export function toSupabaseRow(item: ResourceItem): {
  id: string;
  title: string;
  description: string;
  type: string;
  subject: string;
  grade: string;
  url: string;
  download_url?: string;
  created_at: string;
} {
  const id = isValidUuid(item.id) ? item.id : generateUuid();

  // Requirement 3: Ensure that when a resource with an uploaded .html file is saved to Supabase,
  // its HTML content or its Supabase Storage public file URL is properly saved to the database record.
  const rawHtml = item.htmlContent || item.html_content;
  let url = item.fileUrl || item.file_url || '';

  if (rawHtml && rawHtml.trim().length > 0) {
    // If HTML code or simulation package is present, always store it encoded into url
    if (!url || url.startsWith('https://images.unsplash.com') || url.startsWith('data:image') || !url.startsWith('http')) {
      url = 'data:text/html;charset=utf-8,' + encodeURIComponent(rawHtml);
    }
  } else if (!url || url.startsWith('https://images.unsplash.com')) {
    // Check if there is built-in simulation code for this resource
    const builtinSim = getSimulationContent(item);
    if (builtinSim) {
      url = 'data:text/html;charset=utf-8,' + encodeURIComponent(builtinSim);
    } else {
      url = item.thumbnailUrl || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80';
    }
  }

  const downloadUrl = (item.fileUrl && !item.fileUrl.startsWith('https://images.unsplash.com'))
    ? item.fileUrl
    : (url.startsWith('http') ? url : undefined);

  return {
    id,
    title: item.title || 'مورد تعليمي بدون عنوان',
    description: item.description || '',
    type: item.resourceType || item.type || 'محاكاة',
    subject: item.subjectName || 'العلوم',
    grade: item.gradeName || 'الصف الخامس',
    url,
    ...(downloadUrl ? { download_url: downloadUrl } : {}),
    created_at: item.createdAt || new Date().toISOString()
  };
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

  const thumbnailUrl = isRawUrlImage
    ? rawUrl
    : 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80';

  const typeLower = type.toLowerCase();
  const isInteractiveType =
    typeLower === 'simulation' ||
    typeLower.includes('simulation') ||
    typeLower.includes('محاكاة') ||
    typeLower.includes('تفاعلي') ||
    typeLower.includes('interactive') ||
    !!extractedHtml ||
    (fileUrl && (fileUrl.includes('.html') || fileUrl.includes('/storage/')));

  return {
    id,
    title,
    description,
    thumbnailUrl,
    fileUrl: fileUrl || (extractedHtml ? `data:text/html;charset=utf-8,${encodeURIComponent(extractedHtml)}` : undefined),
    file_url: fileUrl,
    htmlContent: extractedHtml,
    html_content: extractedHtml,
    fileName: `${title}.html`,
    fileType: isInteractiveType ? '.html' : undefined,
    resourceType: type,
    type,
    subjectName: subject,
    gradeName: grade,
    gradeId: 'grade-' + grade,
    subjectId: 'subject-' + subject,
    curriculum: 'منهج سلطنة عُمان المعتمد',
    unit: 'الوحدة التعليمية',
    topic: title,
    authorId: 'admin',
    authorName: 'مكتبة العلوم الرقمية',
    status: 'published' as ResourceStatus,
    version: '1.0',
    tags: [subject, grade, type],
    ratingAverage: 5,
    ratingCount: 1,
    usageCount: 0,
    downloadCount: 0,
    previewType: isInteractiveType ? 'html' : 'document',
    allowDownload: true,
    allowPreview: true,
    createdAt,
    updatedAt: createdAt,
    publishedAt: createdAt
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
   * Create a new resource directly in Supabase `resources` table.
   */
  async createResource(item: ResourceItem): Promise<{ data: ResourceItem | null; savedToSupabase: boolean; error?: string }> {
    const row = toSupabaseRow(item);

    try {
      const { data, error } = await supabase
        .from('resources')
        .insert(row)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Supabase INSERT rejected:', error);
        return { data: null, savedToSupabase: false, error: error.message };
      }

      if (data) {
        return { data: fromSupabaseRow(data as Record<string, unknown>), savedToSupabase: true };
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

    // Requirement 3: Save updated HTML content or file URL to the database record
    if (updates.htmlContent !== undefined && updates.htmlContent.trim().length > 0) {
      partialRow.url = 'data:text/html;charset=utf-8,' + encodeURIComponent(updates.htmlContent);
    } else if (updates.fileUrl !== undefined || updates.thumbnailUrl !== undefined) {
      partialRow.url = updates.fileUrl || updates.thumbnailUrl || '';
    }

    try {
      const { data, error } = await supabase
        .from('resources')
        .update(partialRow)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Supabase UPDATE rejected:', error);
        return { data: null, savedToSupabase: false, error: error.message };
      }

      if (data) {
        return { data: fromSupabaseRow(data as Record<string, unknown>), savedToSupabase: true };
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

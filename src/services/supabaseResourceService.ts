import { supabase } from './supabase';
import { ResourceItem, PreviewType, ResourceStatus, ResourceVersion, ReviewNote, SupportingFile } from '../types';

/**
 * Transforms a frontend ResourceItem into a Supabase database row (snake_case).
 */
export function toSupabaseRow(item: ResourceItem): Record<string, unknown> {
  return {
    id: item.id,
    title: item.title,
    description: item.description || '',
    thumbnail_url: item.thumbnailUrl || '',
    file_url: item.fileUrl || null,
    file_name: item.fileName || null,
    file_type: item.fileType || null,
    file_size: item.fileSize || null,
    resource_type: item.resourceType,
    resource_type_id: item.resourceTypeId || null,
    category: item.category || null,
    pedagogical_category: item.pedagogicalCategory || null,
    grade_id: item.gradeId,
    grade_name: item.gradeName,
    subject_id: item.subjectId,
    subject_name: item.subjectName,
    curriculum: item.curriculum || '',
    curriculum_id: item.curriculumId || null,
    unit: item.unit || '',
    unit_id: item.unitId || null,
    topic: item.topic || '',
    topic_id: item.topicId || null,
    author_id: item.authorId,
    author_name: item.authorName,
    status: item.status || 'published',
    version: item.version || '1.0',
    tags: item.tags || [],
    rating_average: item.ratingAverage || 0,
    rating_count: item.ratingCount || 0,
    usage_count: item.usageCount || 0,
    download_count: item.downloadCount || 0,
    preview_type: item.previewType || 'html',
    html_content: item.htmlContent || null,
    educational_objectives: item.educationalObjectives || [],
    scientific_concepts: item.scientificConcepts || [],
    execution_time: item.executionTime || null,
    usage_context: item.usageContext || null,
    target_skill: item.targetSkill || null,
    required_tools: item.requiredTools || [],
    allow_download: item.allowDownload !== undefined ? item.allowDownload : true,
    allow_preview: item.allowPreview !== undefined ? item.allowPreview : true,
    usage_rights: item.usageRights || null,
    supporting_files: item.supportingFiles || [],
    is_demo: item.isDemo || false,
    versions: item.versions || [],
    review_notes: item.reviewNotes || [],
    created_at: item.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    published_at: item.publishedAt || (item.status === 'published' ? new Date().toISOString() : null)
  };
}

/**
 * Transforms a Supabase database row (snake_case) into a frontend ResourceItem (camelCase).
 */
export function fromSupabaseRow(row: Record<string, unknown>): ResourceItem {
  return {
    id: String(row.id),
    title: String(row.title || ''),
    description: String(row.description || ''),
    thumbnailUrl: String(row.thumbnail_url || ''),
    fileUrl: row.file_url ? String(row.file_url) : undefined,
    fileName: row.file_name ? String(row.file_name) : undefined,
    fileType: row.file_type ? String(row.file_type) : undefined,
    fileSize: row.file_size ? String(row.file_size) : undefined,
    resourceType: String(row.resource_type || 'نشاط تفاعلي'),
    resourceTypeId: row.resource_type_id ? String(row.resource_type_id) : undefined,
    category: row.category ? String(row.category) : undefined,
    pedagogicalCategory: row.pedagogical_category ? String(row.pedagogical_category) : undefined,
    gradeId: String(row.grade_id || ''),
    gradeName: String(row.grade_name || ''),
    subjectId: String(row.subject_id || ''),
    subjectName: String(row.subject_name || ''),
    curriculum: String(row.curriculum || ''),
    curriculumId: row.curriculum_id ? String(row.curriculum_id) : undefined,
    unit: String(row.unit || ''),
    unitId: row.unit_id ? String(row.unit_id) : undefined,
    topic: String(row.topic || ''),
    topicId: row.topic_id ? String(row.topic_id) : undefined,
    authorId: String(row.author_id || ''),
    authorName: String(row.author_name || ''),
    status: (row.status as ResourceStatus) || 'published',
    version: String(row.version || '1.0'),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    ratingAverage: Number(row.rating_average || 0),
    ratingCount: Number(row.rating_count || 0),
    usageCount: Number(row.usage_count || 0),
    downloadCount: Number(row.download_count || 0),
    previewType: (row.preview_type as PreviewType) || 'html',
    htmlContent: row.html_content ? String(row.html_content) : undefined,
    educationalObjectives: Array.isArray(row.educational_objectives) ? (row.educational_objectives as string[]) : [],
    scientificConcepts: Array.isArray(row.scientific_concepts) ? (row.scientific_concepts as string[]) : [],
    executionTime: row.execution_time ? String(row.execution_time) : undefined,
    usageContext: row.usage_context ? String(row.usage_context) : undefined,
    targetSkill: row.target_skill ? String(row.target_skill) : undefined,
    requiredTools: Array.isArray(row.required_tools) ? (row.required_tools as string[]) : [],
    allowDownload: row.allow_download !== undefined ? Boolean(row.allow_download) : true,
    allowPreview: row.allow_preview !== undefined ? Boolean(row.allow_preview) : true,
    usageRights: row.usage_rights ? String(row.usage_rights) : undefined,
    supportingFiles: Array.isArray(row.supporting_files) ? (row.supporting_files as SupportingFile[]) : [],
    isDemo: Boolean(row.is_demo),
    versions: Array.isArray(row.versions) ? (row.versions as ResourceVersion[]) : [],
    reviewNotes: Array.isArray(row.review_notes) ? (row.review_notes as ReviewNote[]) : [],
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
    publishedAt: row.published_at ? String(row.published_at) : undefined
  };
}

export const supabaseResourceService = {
  /**
   * Check if Supabase resources table is active and accessible.
   */
  async checkTableStatus(): Promise<{ exists: boolean; count: number; error?: string }> {
    try {
      const { count, error } = await supabase
        .from('resources')
        .select('*', { count: 'exact', head: true });

      if (error) {
        return { exists: false, count: 0, error: error.message };
      }
      return { exists: true, count: count || 0 };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { exists: false, count: 0, error: message };
    }
  },

  /**
   * Fetch all resources live from the Supabase `resources` table.
   */
  async fetchLiveResources(): Promise<{ data: ResourceItem[] | null; isLive: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetch live resources warning:', error.message);
        return { data: null, isLive: false, error: error.message };
      }

      if (data) {
        const mapped = data.map((row: Record<string, unknown>) => fromSupabaseRow(row));
        return { data: mapped, isLive: true };
      }

      return { data: [], isLive: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('Supabase fetch connection exception:', message);
      return { data: null, isLive: false, error: message };
    }
  },

  /**
   * Create a new resource directly in Supabase `resources` table.
   */
  async createResource(item: ResourceItem): Promise<{ data: ResourceItem; savedToSupabase: boolean; error?: string }> {
    const row = toSupabaseRow(item);

    try {
      const { data, error } = await supabase
        .from('resources')
        .insert(row)
        .select()
        .single();

      if (error) {
        console.warn('Supabase insert warning:', error.message);
        return { data: item, savedToSupabase: false, error: error.message };
      }

      if (data) {
        return { data: fromSupabaseRow(data as Record<string, unknown>), savedToSupabase: true };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('Supabase insert exception:', message);
      return { data: item, savedToSupabase: false, error: message };
    }

    return { data: item, savedToSupabase: true };
  },

  /**
   * Update an existing resource directly in Supabase `resources` table.
   */
  async updateResource(id: string, updates: Partial<ResourceItem>): Promise<{ data: ResourceItem | null; savedToSupabase: boolean; error?: string }> {
    // Map updates to partial snake_case
    const partialRow: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (updates.title !== undefined) partialRow.title = updates.title;
    if (updates.description !== undefined) partialRow.description = updates.description;
    if (updates.thumbnailUrl !== undefined) partialRow.thumbnail_url = updates.thumbnailUrl;
    if (updates.fileUrl !== undefined) partialRow.file_url = updates.fileUrl;
    if (updates.fileName !== undefined) partialRow.file_name = updates.fileName;
    if (updates.fileType !== undefined) partialRow.file_type = updates.fileType;
    if (updates.fileSize !== undefined) partialRow.file_size = updates.fileSize;
    if (updates.resourceType !== undefined) partialRow.resource_type = updates.resourceType;
    if (updates.resourceTypeId !== undefined) partialRow.resource_type_id = updates.resourceTypeId;
    if (updates.category !== undefined) partialRow.category = updates.category;
    if (updates.pedagogicalCategory !== undefined) partialRow.pedagogical_category = updates.pedagogicalCategory;
    if (updates.gradeId !== undefined) partialRow.grade_id = updates.gradeId;
    if (updates.gradeName !== undefined) partialRow.grade_name = updates.gradeName;
    if (updates.subjectId !== undefined) partialRow.subject_id = updates.subjectId;
    if (updates.subjectName !== undefined) partialRow.subject_name = updates.subjectName;
    if (updates.curriculum !== undefined) partialRow.curriculum = updates.curriculum;
    if (updates.curriculumId !== undefined) partialRow.curriculum_id = updates.curriculumId;
    if (updates.unit !== undefined) partialRow.unit = updates.unit;
    if (updates.unitId !== undefined) partialRow.unit_id = updates.unitId;
    if (updates.topic !== undefined) partialRow.topic = updates.topic;
    if (updates.topicId !== undefined) partialRow.topic_id = updates.topicId;
    if (updates.authorId !== undefined) partialRow.author_id = updates.authorId;
    if (updates.authorName !== undefined) partialRow.author_name = updates.authorName;
    if (updates.status !== undefined) partialRow.status = updates.status;
    if (updates.version !== undefined) partialRow.version = updates.version;
    if (updates.tags !== undefined) partialRow.tags = updates.tags;
    if (updates.ratingAverage !== undefined) partialRow.rating_average = updates.ratingAverage;
    if (updates.ratingCount !== undefined) partialRow.rating_count = updates.ratingCount;
    if (updates.usageCount !== undefined) partialRow.usage_count = updates.usageCount;
    if (updates.downloadCount !== undefined) partialRow.download_count = updates.downloadCount;
    if (updates.previewType !== undefined) partialRow.preview_type = updates.previewType;
    if (updates.htmlContent !== undefined) partialRow.html_content = updates.htmlContent;
    if (updates.educationalObjectives !== undefined) partialRow.educational_objectives = updates.educationalObjectives;
    if (updates.scientificConcepts !== undefined) partialRow.scientific_concepts = updates.scientificConcepts;
    if (updates.executionTime !== undefined) partialRow.execution_time = updates.executionTime;
    if (updates.usageContext !== undefined) partialRow.usage_context = updates.usageContext;
    if (updates.targetSkill !== undefined) partialRow.target_skill = updates.targetSkill;
    if (updates.requiredTools !== undefined) partialRow.required_tools = updates.requiredTools;
    if (updates.allowDownload !== undefined) partialRow.allow_download = updates.allowDownload;
    if (updates.allowPreview !== undefined) partialRow.allow_preview = updates.allowPreview;
    if (updates.usageRights !== undefined) partialRow.usage_rights = updates.usageRights;
    if (updates.supportingFiles !== undefined) partialRow.supporting_files = updates.supportingFiles;
    if (updates.isDemo !== undefined) partialRow.is_demo = updates.isDemo;
    if (updates.versions !== undefined) partialRow.versions = updates.versions;
    if (updates.reviewNotes !== undefined) partialRow.review_notes = updates.reviewNotes;
    if (updates.publishedAt !== undefined) partialRow.published_at = updates.publishedAt;

    try {
      const { data, error } = await supabase
        .from('resources')
        .update(partialRow)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.warn('Supabase update warning:', error.message);
        return { data: null, savedToSupabase: false, error: error.message };
      }

      if (data) {
        return { data: fromSupabaseRow(data as Record<string, unknown>), savedToSupabase: true };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('Supabase update exception:', message);
      return { data: null, savedToSupabase: false, error: message };
    }

    return { data: null, savedToSupabase: true };
  },

  /**
   * Delete a resource directly from Supabase `resources` table.
   */
  async deleteResource(id: string): Promise<{ success: boolean; deletedFromSupabase: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('Supabase delete warning:', error.message);
        return { success: false, deletedFromSupabase: false, error: error.message };
      }

      return { success: true, deletedFromSupabase: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('Supabase delete exception:', message);
      return { success: false, deletedFromSupabase: false, error: message };
    }
  },

  /**
   * Upsert a list of resources into Supabase (Batch sync).
   */
  async syncBatchToSupabase(items: ResourceItem[]): Promise<{ count: number; error?: string }> {
    try {
      const rows = items.map(item => toSupabaseRow(item));
      const { data, error } = await supabase
        .from('resources')
        .upsert(rows, { onConflict: 'id' })
        .select('id');

      if (error) {
        return { count: 0, error: error.message };
      }

      return { count: data?.length || 0 };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { count: 0, error: message };
    }
  }
};

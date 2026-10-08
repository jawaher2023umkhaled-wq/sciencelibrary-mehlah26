import { supabase } from './supabase';

export const STORAGE_BUCKET = 'educational-resources';

export interface StorageUploadResult {
  success: boolean;
  publicUrl?: string;
  storagePath?: string;
  error?: string;
}

/**
 * Checks whether the educational-resources Storage bucket is provisioned and accessible.
 */
export async function isStorageBucketAvailable(): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage.getBucket(STORAGE_BUCKET);
    if (error || !data) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the canonical public URL for an object inside the educational-resources bucket.
 */
export function getStoragePublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Determines whether a URL points to the Supabase Storage educational-resources bucket.
 */
export function isStorageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.includes('/storage/v1/object/public/' + STORAGE_BUCKET) ||
         url.includes('/' + STORAGE_BUCKET + '/');
}

/**
 * Uploads an educational resource file, simulation HTML, or asset to Supabase Storage.
 * Generates an approved path under {userId}/{resourceId}/{cleanFileName}.
 * 
 * If the bucket is not yet provisioned, returns { success: false, error: '...' }
 * without throwing an uncaught exception, allowing the caller to safely fall back.
 */
export async function uploadResourceFile(
  file: File | Blob | string,
  fileName: string,
  resourceId: string,
  userId?: string,
  contentType?: string
): Promise<StorageUploadResult> {
  try {
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Resolve effective userId from parameter, active Supabase session, or safe fallback
    let effectiveUserId = userId?.trim();
    if (!effectiveUserId) {
      const { data: sessionData } = await supabase.auth.getSession();
      effectiveUserId = sessionData?.session?.user?.id;
    }
    if (!effectiveUserId) {
      effectiveUserId = 'public';
    }

    const storagePath = `${effectiveUserId}/${resourceId}/${cleanFileName}`;

    let body: Blob | File;
    let resolvedContentType = contentType;

    if (typeof file === 'string') {
      resolvedContentType = resolvedContentType || 'text/html;charset=utf-8';
      body = new Blob([file], { type: resolvedContentType });
    } else {
      body = file;
      if (!resolvedContentType && file.type) {
        resolvedContentType = file.type;
      }
    }

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, body, {
        contentType: resolvedContentType,
        upsert: true
      });

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    const publicUrl = getStoragePublicUrl(data.path);

    return {
      success: true,
      publicUrl,
      storagePath: data.path
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: msg
    };
  }
}

/**
 * Removes a file from Supabase Storage by its storage path.
 */
export async function deleteResourceFile(storagePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

import { supabase } from './supabase';
import { isValidUuid } from './supabaseResourceService';

export const STORAGE_BUCKET = 'educational-resources';

export interface StorageUploadResult {
  success: boolean;
  publicUrl?: string;
  storagePath?: string;
  error?: string;
}

export const MAX_STORAGE_FILE_SIZE = 52428800; // 50 MB
export const OFFICIAL_ADMIN_EMAIL = 'sciencelibrary8@gmail.com';

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
 * Rules:
 * - Anonymous users: upload rejected.
 * - Authenticated users: upload only inside their own {userId} folder.
 * - Admin (sciencelibrary8@gmail.com): full upload access across bucket.
 */
export async function uploadResourceFile(
  file: File | Blob | string,
  fileName: string,
  resourceId: string,
  userId?: string,
  contentType?: string
): Promise<StorageUploadResult> {
  try {
    // 1. Verify active authentication session from Supabase
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    let sessionUser = sessionData?.session?.user;
    if (!sessionUser && !sessionErr) {
      const { data: userData } = await supabase.auth.getUser();
      sessionUser = userData?.user || undefined;
    }

    if (!sessionUser) {
      return {
        success: false,
        error: 'يجب تسجيل الدخول أولاً لرفع الملفات إلى التخزين السحابي (غير مصرح للمستخدمين المجهولين)'
      };
    }
    const sessionUserId = sessionUser.id;
    const sessionEmail = (sessionUser.email || '').trim().toLowerCase();
    const isAdmin = sessionEmail === OFFICIAL_ADMIN_EMAIL;

    // 2. Validate and resolve effective user ID
    // Always default to authenticated session user ID to satisfy Supabase Storage RLS
    let effectiveUserId = sessionUserId;
    if (isAdmin && userId && isValidUuid(userId)) {
      effectiveUserId = userId.trim();
    }

    if (!effectiveUserId || !isValidUuid(effectiveUserId) || effectiveUserId === 'public' || effectiveUserId === 'guest-author' || effectiveUserId.includes('/') || effectiveUserId.includes('..')) {
      return {
        success: false,
        error: 'معرف المستخدم غير صالح أو مفقود. تعذر إكمال الرفع إلى التخزين السحابي'
      };
    }

    // Validate resourceId
    const cleanResourceId = (resourceId || '').trim();
    if (!cleanResourceId || cleanResourceId.includes('/') || cleanResourceId.includes('..') || cleanResourceId.includes('\\')) {
      return {
        success: false,
        error: 'معرف المورد غير صالح'
      };
    }

    // 3. Sanitize filename and prevent path traversal
    const baseName = fileName.replace(/\\/g, '/').split('/').pop() || 'resource';
    if (baseName.includes('..') || baseName.includes('/') || baseName.includes('\\')) {
      return {
        success: false,
        error: 'اسم الملف غير صالح ويحتوي على مسار غير آمن'
      };
    }

    const cleanFileName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '') || 'resource_file';

    // 4. Construct approved storage path: {userId}/{resourceId}/{cleanFileName}
    const storagePath = `${effectiveUserId}/${cleanResourceId}/${cleanFileName}`;

    // 5. Prepare body and check file size limit (50 MB)
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

    if (body.size > MAX_STORAGE_FILE_SIZE) {
      return {
        success: false,
        error: 'حجم الملف يتجاوز الحد الأقصى المسموح به (50 ميجابايت)'
      };
    }

    // 6. Perform upload to Supabase Storage bucket
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

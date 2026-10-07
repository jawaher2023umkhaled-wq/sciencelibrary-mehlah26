import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Robust cleaner for environment values that might contain
 * enclosing quotes, leading key names (e.g. VITE_SUPABASE_URL=...), or trailing slashes.
 */
function cleanEnvValue(val: unknown): string {
  if (typeof val !== 'string') return '';
  let str = val.trim();
  // Strip enclosing quotes
  str = str.replace(/^["']|["']$/g, '').trim();
  // If user pasted "KEY=VALUE", extract the VALUE part
  if (str.includes('=')) {
    const parts = str.split('=');
    if (parts[0].includes('VITE_') || parts[0].includes('SUPABASE')) {
      str = parts.slice(1).join('=').trim();
    }
  }
  // Strip any remaining quotes
  str = str.replace(/^["']|["']$/g, '').trim();
  return str;
}

/**
 * Sanitizes and validates the Supabase URL, extracting valid HTTP/HTTPS endpoints.
 */
export function sanitizeSupabaseUrl(rawUrl: unknown): string {
  const cleaned = cleanEnvValue(rawUrl);
  // Match http:// or https:// inside the string
  const urlMatch = cleaned.match(/https?:\/\/[^\s"']+/);
  if (urlMatch) {
    return urlMatch[0].replace(/\/+$/, '');
  }
  // If it's a domain like xyz.supabase.co without protocol
  if (cleaned.includes('supabase.co')) {
    const domainMatch = cleaned.match(/[a-zA-Z0-9_\-.]+\.supabase\.co/);
    if (domainMatch) {
      return `https://${domainMatch[0]}`;
    }
  }
  // Default valid fallback URL to ensure createClient never crashes
  return 'https://ppdkbqpbsfvxpnlfzgwf.supabase.co';
}

/**
 * Sanitizes the Supabase publishable/anon key.
 */
export function sanitizeSupabaseKey(rawKey: unknown): string {
  const cleaned = cleanEnvValue(rawKey);
  if (cleaned && cleaned.length > 10) {
    return cleaned;
  }
  return 'sb_publishable_qlE874cgvucAdoPOXJ0Aeg_0cuz1lKJ';
}

const rawUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : undefined;
const rawKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : undefined;

export const supabaseUrl = sanitizeSupabaseUrl(rawUrl);
export const supabaseAnonKey = sanitizeSupabaseKey(rawKey);

export const isSupabaseConfigured = Boolean(
  cleanEnvValue(rawUrl) && cleanEnvValue(rawKey)
);

function initSupabase(): SupabaseClient {
  try {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined
      }
    });
  } catch (err) {
    console.error('Failed to initialize Supabase with configured URL, using fallback:', err);
    return createClient('https://ppdkbqpbsfvxpnlfzgwf.supabase.co', 'sb_publishable_qlE874cgvucAdoPOXJ0Aeg_0cuz1lKJ');
  }
}

// Initialize Supabase Client safely
export const supabase: SupabaseClient = initSupabase();

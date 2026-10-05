import { supabase } from './supabase';
import { UserNotification } from '../types';

/**
 * Supabase Notification Service
 * Authoritative persistence service for academic review notifications and platform alerts.
 * Backed by Supabase `public.notifications` table with client-side fallback when offline.
 */
export const supabaseNotificationService = {
  /**
   * Fetch all notifications for a specific user from Supabase `public.notifications`
   */
  async fetchUserNotifications(
    userId: string,
    userEmail?: string
  ): Promise<{ data: UserNotification[]; isLive: boolean; error?: string }> {
    try {
      const cleanEmail = (userEmail || '').trim().toLowerCase();
      const isAdmin = cleanEmail === 'sciencelibrary8@gmail.com';

      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        // Normal users see their own notifications or global announcements ('all')
        query = query.or(`user_id.eq.${userId},user_id.eq.${cleanEmail},user_id.eq.all`);
      }

      const { data, error } = await query;

      if (error) {
        // Table might not exist yet or connection error
        return { data: [], isLive: false, error: error.message };
      }

      if (data) {
        const mapped: UserNotification[] = data.map((row: Record<string, unknown>) => ({
          id: String(row.id),
          userId: String(row.user_id),
          title: String(row.title || 'إشعار جديد'),
          message: String(row.message || ''),
          resourceId: row.resource_id ? String(row.resource_id) : undefined,
          type: (row.type as UserNotification['type']) || 'info',
          isRead: Boolean(row.is_read),
          createdAt: String(row.created_at || new Date().toISOString())
        }));

        return { data: mapped, isLive: true };
      }

      return { data: [], isLive: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { data: [], isLive: false, error: message };
    }
  },

  /**
   * Insert a new notification into Supabase `public.notifications`
   */
  async addNotification(
    notification: Omit<UserNotification, 'id' | 'createdAt' | 'isRead'>
  ): Promise<{ data: UserNotification | null; savedToSupabase: boolean; error?: string }> {
    const row = {
      user_id: notification.userId,
      title: notification.title,
      message: notification.message,
      resource_id: notification.resourceId || null,
      type: notification.type || 'info',
      is_read: false,
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert(row)
        .select()
        .maybeSingle();

      if (error) {
        console.warn('Supabase notification INSERT warning:', error.message);
        return { data: null, savedToSupabase: false, error: error.message };
      }

      if (data) {
        const saved: UserNotification = {
          id: String(data.id),
          userId: String(data.user_id),
          title: String(data.title),
          message: String(data.message),
          resourceId: data.resource_id ? String(data.resource_id) : undefined,
          type: (data.type as UserNotification['type']) || 'info',
          isRead: Boolean(data.is_read),
          createdAt: String(data.created_at)
        };
        return { data: saved, savedToSupabase: true };
      }

      return { data: null, savedToSupabase: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { data: null, savedToSupabase: false, error: message };
    }
  },

  /**
   * Mark a single notification as read in Supabase `public.notifications`
   */
  async markAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  },

  /**
   * Mark all notifications as read for a user in Supabase
   */
  async markAllAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .or(`user_id.eq.${userId},user_id.eq.all`);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }
};

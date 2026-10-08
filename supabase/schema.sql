-- ==============================================================================
-- مكتبة العلوم الرقمية - مدرسة محلاح للبنات (5–12)
-- Supabase Schema: Resources Table & Row Level Security (RLS) Policies
-- Project Ref: ppdkbqpbsfvxpnlfzgwf
-- ==============================================================================

-- 1. Table Definition: public.resources
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT,
  subject TEXT,
  grade TEXT,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for Fast Filtering & Sorting
CREATE INDEX IF NOT EXISTS idx_resources_subject ON public.resources(subject);
CREATE INDEX IF NOT EXISTS idx_resources_grade ON public.resources(grade);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON public.resources(created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- 4. Clean up prior policies if re-running
DROP POLICY IF EXISTS "Public resources are viewable by everyone" ON public.resources;
DROP POLICY IF EXISTS "Authenticated users can insert resources" ON public.resources;
DROP POLICY IF EXISTS "Authenticated users can update resources" ON public.resources;
DROP POLICY IF EXISTS "Authenticated users can delete resources" ON public.resources;
DROP POLICY IF EXISTS "Admins can insert resources" ON public.resources;
DROP POLICY IF EXISTS "Admins can update resources" ON public.resources;
DROP POLICY IF EXISTS "Admins can delete resources" ON public.resources;

-- 5. Policy 1: PUBLIC READ (SELECT)
-- Visitors, students, and teachers can read resources without logging in
CREATE POLICY "Public resources are viewable by everyone" 
  ON public.resources 
  FOR SELECT 
  USING (true);

-- 6. Policy 2: ADMIN WRITE (INSERT)
-- Only verified administrator (sciencelibrary8@gmail.com) can insert
CREATE POLICY "Admins can insert resources" 
  ON public.resources 
  FOR INSERT 
  WITH CHECK (
    auth.role() = 'authenticated' 
    AND lower(coalesce(auth.jwt() ->> 'email', '')) = 'sciencelibrary8@gmail.com'
  );

-- 7. Policy 3: ADMIN UPDATE
-- Only verified administrator (sciencelibrary8@gmail.com) can update
CREATE POLICY "Admins can update resources" 
  ON public.resources 
  FOR UPDATE 
  USING (
    auth.role() = 'authenticated' 
    AND lower(coalesce(auth.jwt() ->> 'email', '')) = 'sciencelibrary8@gmail.com'
  );

-- 8. Policy 4: ADMIN DELETE
-- Only verified administrator (sciencelibrary8@gmail.com) can delete
CREATE POLICY "Admins can delete resources" 
  ON public.resources 
  FOR DELETE 
  USING (
    auth.role() = 'authenticated' 
    AND lower(coalesce(auth.jwt() ->> 'email', '')) = 'sciencelibrary8@gmail.com'
  );

-- ==============================================================================
-- 9. Table Definition: public.notifications
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  resource_id TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for Fast User Notification Lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Clean prior notifications policies if re-running
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins and owners can delete notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications or admin view all" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert allowed notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications or admin delete all" ON public.notifications;

-- Policy 1: SELECT (Only authenticated users; own notifications, global announcements, or admin access)
CREATE POLICY "Users can view own notifications or admin view all"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'sciencelibrary8@gmail.com'
    OR user_id = auth.uid()::text
    OR lower(user_id) = lower(coalesce(auth.jwt() ->> 'email', ''))
    OR user_id = 'all'
  );

-- Policy 2: INSERT (Strict least privilege: admin can send to anyone/broadcast; users can ONLY send to themselves)
CREATE POLICY "Authenticated users can insert allowed notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'sciencelibrary8@gmail.com'
    OR (
      user_id = auth.uid()::text
      OR lower(user_id) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- Policy 3: UPDATE (Users can only mark-read their own notifications; admin can update all)
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'sciencelibrary8@gmail.com'
    OR user_id = auth.uid()::text
    OR lower(user_id) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  WITH CHECK (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'sciencelibrary8@gmail.com'
    OR user_id = auth.uid()::text
    OR lower(user_id) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- Policy 4: DELETE (Users can only delete their own notifications; admin can delete all)
CREATE POLICY "Users can delete own notifications or admin delete all"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'sciencelibrary8@gmail.com'
    OR user_id = auth.uid()::text
    OR lower(user_id) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- 10. Minimal-Privilege Grants
-- Completely REVOKE all access from anonymous users
REVOKE ALL ON TABLE public.notifications FROM anon;

-- Grant only required DML operations to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notifications TO authenticated;

-- Service role retains full administrative privileges
GRANT ALL ON TABLE public.notifications TO service_role;

-- ==============================================================================
-- 11. Supabase Storage: educational-resources Bucket & Storage RLS Policies
-- ==============================================================================

-- Create educational-resources bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'educational-resources',
  'educational-resources',
  true,
  52428800, -- 50 MB
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- Clean prior storage policies if re-running
DROP POLICY IF EXISTS "Public can view educational-resources" ON storage.objects;
DROP POLICY IF EXISTS "Admin can upload educational-resources" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update educational-resources" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete educational-resources" ON storage.objects;

-- Policy 1: SELECT (Public Read for students, teachers, and iframe viewers)
CREATE POLICY "Public can view educational-resources"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'educational-resources');

-- Policy 2: INSERT (Admin upload only)
CREATE POLICY "Admin can upload educational-resources"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'educational-resources'
    AND lower(coalesce(auth.jwt() ->> 'email', '')) = 'sciencelibrary8@gmail.com'
  );

-- Policy 3: UPDATE (Admin update only)
CREATE POLICY "Admin can update educational-resources"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'educational-resources'
    AND lower(coalesce(auth.jwt() ->> 'email', '')) = 'sciencelibrary8@gmail.com'
  )
  WITH CHECK (
    bucket_id = 'educational-resources'
    AND lower(coalesce(auth.jwt() ->> 'email', '')) = 'sciencelibrary8@gmail.com'
  );

-- Policy 4: DELETE (Admin delete only)
CREATE POLICY "Admin can delete educational-resources"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'educational-resources'
    AND lower(coalesce(auth.jwt() ->> 'email', '')) = 'sciencelibrary8@gmail.com'
  );

NOTIFY pgrst, 'reload schema';




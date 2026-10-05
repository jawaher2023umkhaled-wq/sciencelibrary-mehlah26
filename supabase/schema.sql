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

-- Policy 1: Users can view their own notifications or admin can view all
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (
    user_id = coalesce(auth.uid()::text, '')
    OR lower(user_id) = lower(coalesce(auth.jwt() ->> 'email', ''))
    OR user_id = 'all'
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'sciencelibrary8@gmail.com'
  );

-- Policy 2: Authenticated users can insert notifications
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
  );

-- Policy 3: Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (
    user_id = coalesce(auth.uid()::text, '')
    OR lower(user_id) = lower(coalesce(auth.jwt() ->> 'email', ''))
    OR user_id = 'all'
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'sciencelibrary8@gmail.com'
  );

-- 10. Explicit Grants for PostgREST & Reload Cache
GRANT ALL ON TABLE public.notifications TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';



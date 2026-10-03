-- ==============================================================================
-- مكتبة العلوم الرقمية - مدرسة محلاح للبنات (5–12)
-- Supabase Schema: Resources Table & Row Level Security (RLS) Policies
-- ==============================================================================

-- 1. Create Resources Table
CREATE TABLE IF NOT EXISTS public.resources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size TEXT,
  resource_type TEXT NOT NULL,
  resource_type_id TEXT,
  category TEXT,
  pedagogical_category TEXT,
  grade_id TEXT NOT NULL,
  grade_name TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  curriculum TEXT,
  curriculum_id TEXT,
  unit TEXT,
  unit_id TEXT,
  topic TEXT,
  topic_id TEXT,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  version TEXT NOT NULL DEFAULT '1.0',
  tags JSONB DEFAULT '[]'::jsonb,
  rating_average NUMERIC DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  preview_type TEXT DEFAULT 'html',
  html_content TEXT,
  educational_objectives JSONB DEFAULT '[]'::jsonb,
  scientific_concepts JSONB DEFAULT '[]'::jsonb,
  execution_time TEXT,
  usage_context TEXT,
  target_skill TEXT,
  required_tools JSONB DEFAULT '[]'::jsonb,
  allow_download BOOLEAN DEFAULT true,
  allow_preview BOOLEAN DEFAULT true,
  usage_rights TEXT,
  supporting_files JSONB DEFAULT '[]'::jsonb,
  is_demo BOOLEAN DEFAULT false,
  versions JSONB DEFAULT '[]'::jsonb,
  review_notes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

-- 2. Indexes for High Performance Querying & Filtering
CREATE INDEX IF NOT EXISTS idx_resources_grade ON public.resources(grade_id);
CREATE INDEX IF NOT EXISTS idx_resources_subject ON public.resources(subject_id);
CREATE INDEX IF NOT EXISTS idx_resources_status ON public.resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON public.resources(created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if any to avoid duplicates
DROP POLICY IF EXISTS "Public resources are viewable by everyone" ON public.resources;
DROP POLICY IF EXISTS "Authenticated users can insert resources" ON public.resources;
DROP POLICY IF EXISTS "Authenticated users can update resources" ON public.resources;
DROP POLICY IF EXISTS "Authenticated users can delete resources" ON public.resources;

-- 5. RLS Policy: PUBLIC SELECT (Read Access for all visitors and students without login)
CREATE POLICY "Public resources are viewable by everyone" 
  ON public.resources 
  FOR SELECT 
  USING (true);

-- 6. RLS Policy: AUTHENTICATED INSERT (Admins & Teachers can add resources)
CREATE POLICY "Authenticated users can insert resources" 
  ON public.resources 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- 7. RLS Policy: AUTHENTICATED UPDATE (Admins & Reviewers can update resources)
CREATE POLICY "Authenticated users can update resources" 
  ON public.resources 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- 8. RLS Policy: AUTHENTICATED DELETE (Admins can delete resources)
CREATE POLICY "Authenticated users can delete resources" 
  ON public.resources 
  FOR DELETE 
  USING (auth.role() = 'authenticated');

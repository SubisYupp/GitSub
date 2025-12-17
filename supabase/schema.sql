-- =============================================
-- CPulse Database Schema for Supabase
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES TABLE
-- Stores user profile information
-- =============================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  
  -- Competitive programming handles
  codeforces_handle TEXT,
  leetcode_handle TEXT,
  atcoder_handle TEXT,
  codechef_handle TEXT,
  
  -- Stats (denormalized for performance)
  problems_solved INTEGER DEFAULT 0,
  total_submissions INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PROBLEMS TABLE
-- Stores parsed problem data
-- =============================================
CREATE TABLE problems (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Problem identification
  source TEXT NOT NULL, -- 'codeforces', 'leetcode', 'atcoder', 'codechef'
  source_id TEXT NOT NULL, -- Original problem ID from platform
  url TEXT NOT NULL UNIQUE,
  
  -- Problem content
  title TEXT NOT NULL,
  difficulty TEXT,
  rating INTEGER, -- Codeforces rating
  tags TEXT[] DEFAULT '{}',
  
  -- Problem statement (stored as HTML/Markdown)
  description TEXT,
  input_format TEXT,
  output_format TEXT,
  constraints TEXT,
  
  -- Sample tests (stored as JSONB)
  sample_tests JSONB DEFAULT '[]',
  
  -- Time limits
  time_limit TEXT,
  memory_limit TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique problem per platform
  UNIQUE(source, source_id)
);

-- Create index for fast lookups
CREATE INDEX idx_problems_source ON problems(source);
CREATE INDEX idx_problems_url ON problems(url);
CREATE INDEX idx_problems_tags ON problems USING GIN(tags);

-- =============================================
-- USER_PROBLEMS TABLE
-- Tracks user's relationship with problems
-- =============================================
CREATE TABLE user_problems (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE NOT NULL,
  
  -- Status tracking
  status TEXT DEFAULT 'unsolved' CHECK (status IN ('unsolved', 'attempted', 'solved', 'review')),
  is_favorite BOOLEAN DEFAULT FALSE,
  
  -- User's custom categorization
  custom_tags TEXT[] DEFAULT '{}',
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  
  -- Time tracking
  time_spent INTEGER DEFAULT 0, -- in seconds
  attempts INTEGER DEFAULT 0,
  
  -- Dates
  first_attempted_at TIMESTAMPTZ,
  solved_at TIMESTAMPTZ,
  last_reviewed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One entry per user per problem
  UNIQUE(user_id, problem_id)
);

-- Create indexes
CREATE INDEX idx_user_problems_user ON user_problems(user_id);
CREATE INDEX idx_user_problems_status ON user_problems(user_id, status);
CREATE INDEX idx_user_problems_favorite ON user_problems(user_id, is_favorite) WHERE is_favorite = TRUE;

-- =============================================
-- SOLUTIONS TABLE
-- Stores user's code solutions
-- =============================================
CREATE TABLE solutions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE NOT NULL,
  
  -- Solution content
  code TEXT NOT NULL,
  language TEXT NOT NULL, -- 'cpp', 'python', 'java', 'javascript', etc.
  
  -- Submission info
  verdict TEXT, -- 'AC', 'WA', 'TLE', 'MLE', 'RE', 'CE'
  runtime_ms INTEGER,
  memory_kb INTEGER,
  
  -- Version tracking
  version INTEGER DEFAULT 1,
  is_primary BOOLEAN DEFAULT FALSE, -- Main/best solution
  
  -- Metadata
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_solutions_user ON solutions(user_id);
CREATE INDEX idx_solutions_problem ON solutions(problem_id);
CREATE INDEX idx_solutions_user_problem ON solutions(user_id, problem_id);

-- =============================================
-- NOTES TABLE
-- Stores user's notes for problems
-- =============================================
CREATE TABLE notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE NOT NULL,
  
  -- Note content (Markdown)
  content TEXT NOT NULL,
  
  -- Categories
  note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'approach', 'optimization', 'edge_cases', 'similar_problems')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_notes_user ON notes(user_id);
CREATE INDEX idx_notes_problem ON notes(problem_id);
CREATE INDEX idx_notes_user_problem ON notes(user_id, problem_id);

-- =============================================
-- CODELISTS TABLE
-- User-created problem lists/collections
-- =============================================
CREATE TABLE codelists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- List info
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  
  -- Appearance
  color TEXT DEFAULT '#06b6d4', -- Cyan default
  icon TEXT DEFAULT 'folder',
  
  -- Stats (denormalized)
  problem_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_codelists_user ON codelists(user_id);
CREATE INDEX idx_codelists_public ON codelists(is_public) WHERE is_public = TRUE;

-- =============================================
-- CODELIST_PROBLEMS TABLE
-- Junction table for codelists and problems
-- =============================================
CREATE TABLE codelist_problems (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  codelist_id UUID REFERENCES codelists(id) ON DELETE CASCADE NOT NULL,
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE NOT NULL,
  
  -- Ordering
  position INTEGER DEFAULT 0,
  
  -- Metadata
  added_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(codelist_id, problem_id)
);

-- Create indexes
CREATE INDEX idx_codelist_problems_list ON codelist_problems(codelist_id);
CREATE INDEX idx_codelist_problems_problem ON codelist_problems(problem_id);

-- =============================================
-- ACTIVITY LOG TABLE
-- Tracks user activity for streaks and stats
-- =============================================
CREATE TABLE activity_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Activity info
  activity_type TEXT NOT NULL CHECK (activity_type IN ('solve', 'attempt', 'review', 'note', 'solution')),
  problem_id UUID REFERENCES problems(id) ON DELETE SET NULL,
  
  -- Details (JSONB for flexibility)
  details JSONB DEFAULT '{}',
  
  -- Date (for streak calculations)
  activity_date DATE DEFAULT CURRENT_DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_activity_user ON activity_log(user_id);
CREATE INDEX idx_activity_date ON activity_log(user_id, activity_date);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE codelists ENABLE ROW LEVEL SECURITY;
ALTER TABLE codelist_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Public profiles (for viewing other users)
CREATE POLICY "Public profiles are viewable by everyone" 
  ON profiles FOR SELECT 
  USING (TRUE);

-- PROBLEMS POLICIES (problems are public/shared)
CREATE POLICY "Problems are viewable by authenticated users" 
  ON problems FOR SELECT 
  TO authenticated
  USING (TRUE);

CREATE POLICY "Authenticated users can insert problems" 
  ON problems FOR INSERT 
  TO authenticated
  WITH CHECK (TRUE);

-- USER_PROBLEMS POLICIES
CREATE POLICY "Users can view their own problem tracking" 
  ON user_problems FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own problem tracking" 
  ON user_problems FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own problem tracking" 
  ON user_problems FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own problem tracking" 
  ON user_problems FOR DELETE 
  USING (auth.uid() = user_id);

-- SOLUTIONS POLICIES
CREATE POLICY "Users can view their own solutions" 
  ON solutions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own solutions" 
  ON solutions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own solutions" 
  ON solutions FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own solutions" 
  ON solutions FOR DELETE 
  USING (auth.uid() = user_id);

-- NOTES POLICIES
CREATE POLICY "Users can view their own notes" 
  ON notes FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes" 
  ON notes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" 
  ON notes FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" 
  ON notes FOR DELETE 
  USING (auth.uid() = user_id);

-- CODELISTS POLICIES
CREATE POLICY "Users can view their own codelists" 
  ON codelists FOR SELECT 
  USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "Users can insert their own codelists" 
  ON codelists FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own codelists" 
  ON codelists FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own codelists" 
  ON codelists FOR DELETE 
  USING (auth.uid() = user_id);

-- CODELIST_PROBLEMS POLICIES
CREATE POLICY "Users can view codelist problems" 
  ON codelist_problems FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM codelists 
      WHERE codelists.id = codelist_problems.codelist_id 
      AND (codelists.user_id = auth.uid() OR codelists.is_public = TRUE)
    )
  );

CREATE POLICY "Users can manage their codelist problems" 
  ON codelist_problems FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM codelists 
      WHERE codelists.id = codelist_problems.codelist_id 
      AND codelists.user_id = auth.uid()
    )
  );

-- ACTIVITY_LOG POLICIES
CREATE POLICY "Users can view their own activity" 
  ON activity_log FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity" 
  ON activity_log FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_problems_updated_at
  BEFORE UPDATE ON problems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_problems_updated_at
  BEFORE UPDATE ON user_problems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_codelists_updated_at
  BEFORE UPDATE ON codelists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update problem count in codelists
CREATE OR REPLACE FUNCTION update_codelist_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE codelists SET problem_count = problem_count + 1 WHERE id = NEW.codelist_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE codelists SET problem_count = problem_count - 1 WHERE id = OLD.codelist_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_codelist_problem_count
  AFTER INSERT OR DELETE ON codelist_problems
  FOR EACH ROW EXECUTE FUNCTION update_codelist_count();

-- =============================================
-- INDEXES FOR PERFORMANCE AT SCALE
-- =============================================

-- Composite indexes for common queries
CREATE INDEX idx_user_problems_composite ON user_problems(user_id, status, created_at DESC);
CREATE INDEX idx_solutions_composite ON solutions(user_id, problem_id, submitted_at DESC);
CREATE INDEX idx_activity_composite ON activity_log(user_id, activity_date DESC, activity_type);

-- Full-text search on problems
CREATE INDEX idx_problems_title_search ON problems USING GIN(to_tsvector('english', title));

-- =============================================
-- DONE! Your database is ready for 100k+ users
-- =============================================

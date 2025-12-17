import { createClient } from './server';
import type { ProblemMetadata, UserSolution, UserNotes, ProblemWithDetails, Codelist, Platform } from '../types';

// ==========================================
// AUTH HELPERS
// ==========================================

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.log('Auth error:', error.message);
    return null;
  }
  
  if (!user) {
    console.log('No user found in session');
    return null;
  }
  
  console.log('Authenticated user:', user.id);
  return user;
}

export async function requireAuth() {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

// ==========================================
// PROBLEMS - Global storage
// ==========================================

export async function getProblems(): Promise<ProblemMetadata[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('problems')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching problems:', error);
    return [];
  }
  
  return data.map(mapDbProblemToType);
}

export async function getProblemById(id: string): Promise<ProblemMetadata | null> {
  const supabase = await createClient();
  
  // Check if it's a parser-generated ID (e.g., "codeforces-2176D") vs UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  
  if (isUUID) {
    const { data, error } = await supabase
      .from('problems')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return mapDbProblemToType(data);
  }
  
  // Parse the custom ID format: "platform-problemId"
  const match = id.match(/^(codeforces|leetcode|atcoder|codechef)-(.+)$/);
  if (match) {
    const [, source, sourceId] = match;
    const { data, error } = await supabase
      .from('problems')
      .select('*')
      .eq('source', source)
      .eq('source_id', sourceId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return mapDbProblemToType(data);
  }
  
  return null;
}

export async function getProblemByUrl(url: string): Promise<ProblemMetadata | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('problems')
    .select('*')
    .eq('url', url)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return mapDbProblemToType(data);
}

export async function saveProblem(problem: ProblemMetadata): Promise<ProblemMetadata> {
  const supabase = await createClient();
  
  // Don't include 'id' - let the database auto-generate UUID
  const dbProblem = {
    source: problem.platform,
    source_id: problem.problemId,
    url: problem.url,
    title: problem.title,
    difficulty: problem.difficulty,
    tags: problem.tags,
    description: problem.description,
    input_format: problem.inputFormat,
    output_format: problem.outputFormat,
    constraints: problem.constraints,
    sample_tests: problem.sampleTests,
    updated_at: new Date().toISOString(),
  };
  
  // Upsert based on url (unique constraint)
  const { data, error } = await supabase
    .from('problems')
    .upsert(dbProblem, { onConflict: 'url' })
    .select()
    .single();
  
  if (error) {
    console.error('Error saving problem:', error);
    throw error;
  }
  
  return mapDbProblemToType(data);
}

// ==========================================
// USER PROBLEMS - Per-user tracking
// ==========================================

export async function getUserProblems(userId: string): Promise<ProblemWithDetails[]> {
  const supabase = await createClient();
  
  // Get user's problem associations with full problem data
  const { data, error } = await supabase
    .from('user_problems')
    .select(`
      *,
      problem:problems(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching user problems:', error);
    return [];
  }
  
  // Get user's solutions and notes
  const [solutions, notes] = await Promise.all([
    getUserSolutions(userId),
    getUserNotes(userId),
  ]);
  
  const solutionMap = new Map(solutions.map(s => [s.problemId, s]));
  const notesMap = new Map(notes.map(n => [n.problemId, n]));
  
  return data.map(up => {
    const problem = mapDbProblemToType(up.problem);
    return {
      ...problem,
      solution: solutionMap.get(problem.id),
      notes: notesMap.get(problem.id),
    };
  });
}

export async function addProblemToUser(userId: string, problemId: string): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('user_problems')
    .upsert({
      user_id: userId,
      problem_id: problemId,
      status: 'unsolved',
    }, { onConflict: 'user_id,problem_id' });
  
  if (error) {
    console.error('Error adding problem to user:', error);
    throw error;
  }
}

export async function removeProblemFromUser(userId: string, problemId: string): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('user_problems')
    .delete()
    .eq('user_id', userId)
    .eq('problem_id', problemId);
  
  if (error) {
    console.error('Error removing problem from user:', error);
    throw error;
  }
}

export async function updateUserProblemStatus(
  userId: string, 
  problemId: string, 
  status: 'unsolved' | 'attempted' | 'solved' | 'review'
): Promise<void> {
  const supabase = await createClient();
  
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  
  if (status === 'solved') {
    updates.solved_at = new Date().toISOString();
  }
  
  const { error } = await supabase
    .from('user_problems')
    .update(updates)
    .eq('user_id', userId)
    .eq('problem_id', problemId);
  
  if (error) {
    console.error('Error updating problem status:', error);
    throw error;
  }
}

// ==========================================
// SOLUTIONS - Per-user
// ==========================================

export async function getUserSolutions(userId: string): Promise<UserSolution[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('solutions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_primary', true);
  
  if (error) {
    console.error('Error fetching solutions:', error);
    return [];
  }
  
  return data.map(mapDbSolutionToType);
}

export async function getSolutionByProblemId(userId: string, problemId: string): Promise<UserSolution | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('solutions')
    .select('*')
    .eq('user_id', userId)
    .eq('problem_id', problemId)
    .eq('is_primary', true)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return mapDbSolutionToType(data);
}

export async function saveSolution(userId: string, solution: Omit<UserSolution, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserSolution> {
  const supabase = await createClient();
  
  // Check for existing solution
  const existing = await getSolutionByProblemId(userId, solution.problemId);
  
  const now = new Date().toISOString();
  const dbSolution = {
    id: existing?.id || crypto.randomUUID(),
    user_id: userId,
    problem_id: solution.problemId,
    code: solution.code,
    language: solution.language,
    verdict: solution.solved ? 'AC' : null,
    is_primary: true,
    submitted_at: now,
    created_at: existing?.createdAt || now,
  };
  
  const { data, error } = await supabase
    .from('solutions')
    .upsert(dbSolution, { onConflict: 'id' })
    .select()
    .single();
  
  if (error) {
    console.error('Error saving solution:', error);
    throw error;
  }
  
  // Update user_problem status if solved
  if (solution.solved) {
    await updateUserProblemStatus(userId, solution.problemId, 'solved');
  }
  
  return mapDbSolutionToType(data);
}

// ==========================================
// NOTES - Per-user
// ==========================================

export async function getUserNotes(userId: string): Promise<UserNotes[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error fetching notes:', error);
    return [];
  }
  
  return data.map(mapDbNotesToType);
}

export async function getNotesByProblemId(userId: string, problemId: string): Promise<UserNotes | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .eq('problem_id', problemId)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return mapDbNotesToType(data);
}

export async function saveNotes(userId: string, notes: Omit<UserNotes, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserNotes> {
  const supabase = await createClient();
  
  const existing = await getNotesByProblemId(userId, notes.problemId);
  
  const now = new Date().toISOString();
  const dbNotes = {
    id: existing?.id || crypto.randomUUID(),
    user_id: userId,
    problem_id: notes.problemId,
    content: notes.content,
    updated_at: now,
    created_at: existing?.createdAt || now,
  };
  
  const { data, error } = await supabase
    .from('notes')
    .upsert(dbNotes, { onConflict: 'id' })
    .select()
    .single();
  
  if (error) {
    console.error('Error saving notes:', error);
    throw error;
  }
  
  return mapDbNotesToType(data);
}

// ==========================================
// CODELISTS - Per-user with sharing
// ==========================================

export async function getCodelists(userId: string): Promise<Codelist[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('codelists')
    .select(`
      *,
      codelist_problems(problem_id, position)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching codelists:', error);
    return [];
  }
  
  return data.map(mapDbCodelistToType);
}

export async function getCodelistById(id: string, userId?: string): Promise<Codelist | null> {
  const supabase = await createClient();
  
  let query = supabase
    .from('codelists')
    .select(`
      *,
      codelist_problems(problem_id, position)
    `)
    .eq('id', id);
  
  // If userId provided, check ownership; otherwise allow public lists
  if (userId) {
    query = query.or(`user_id.eq.${userId},is_public.eq.true`);
  } else {
    query = query.eq('is_public', true);
  }
  
  const { data, error } = await query.single();
  
  if (error || !data) {
    return null;
  }
  
  return mapDbCodelistToType(data);
}

export async function getPublicCodelist(id: string): Promise<(Codelist & { ownerName?: string }) | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('codelists')
    .select(`
      *,
      codelist_problems(problem_id, position),
      profiles(username, display_name)
    `)
    .eq('id', id)
    .eq('is_public', true)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  const codelist = mapDbCodelistToType(data);
  return {
    ...codelist,
    ownerName: data.profiles?.display_name || data.profiles?.username || 'Anonymous',
  };
}

export async function saveCodelist(userId: string, codelist: Omit<Codelist, 'createdAt' | 'updatedAt'>): Promise<Codelist> {
  const supabase = await createClient();
  
  const now = new Date().toISOString();
  const dbCodelist = {
    id: codelist.id,
    user_id: userId,
    name: codelist.name,
    description: codelist.description,
    is_public: (codelist as Codelist & { isPublic?: boolean }).isPublic || false,
    problem_count: codelist.problemIds.length,
    updated_at: now,
  };
  
  const { data, error } = await supabase
    .from('codelists')
    .upsert(dbCodelist, { onConflict: 'id' })
    .select()
    .single();
  
  if (error) {
    console.error('Error saving codelist:', error);
    throw error;
  }
  
  // Update problem associations
  await updateCodelistProblems(codelist.id, codelist.problemIds);
  
  return {
    ...mapDbCodelistToType({ ...data, codelist_problems: codelist.problemIds.map((id, i) => ({ problem_id: id, position: i })) }),
  };
}

export async function updateCodelistProblems(codelistId: string, problemIds: string[]): Promise<void> {
  const supabase = await createClient();
  
  // Delete existing associations
  await supabase
    .from('codelist_problems')
    .delete()
    .eq('codelist_id', codelistId);
  
  // Insert new associations
  if (problemIds.length > 0) {
    const associations = problemIds.map((problemId, index) => ({
      codelist_id: codelistId,
      problem_id: problemId,
      position: index,
    }));
    
    const { error } = await supabase
      .from('codelist_problems')
      .insert(associations);
    
    if (error) {
      console.error('Error updating codelist problems:', error);
      throw error;
    }
  }
}

export async function deleteCodelist(userId: string, id: string): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('codelists')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error deleting codelist:', error);
    throw error;
  }
}

export async function toggleCodelistPublic(userId: string, id: string, isPublic: boolean): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('codelists')
    .update({ is_public: isPublic, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error toggling codelist visibility:', error);
    throw error;
  }
}

export async function addProblemToCodelist(codelistId: string, problemId: string): Promise<void> {
  const supabase = await createClient();
  
  // Get current max position
  const { data: existing } = await supabase
    .from('codelist_problems')
    .select('position')
    .eq('codelist_id', codelistId)
    .order('position', { ascending: false })
    .limit(1);
  
  const nextPosition = (existing?.[0]?.position ?? -1) + 1;
  
  const { error } = await supabase
    .from('codelist_problems')
    .upsert({
      codelist_id: codelistId,
      problem_id: problemId,
      position: nextPosition,
    }, { onConflict: 'codelist_id,problem_id' });
  
  if (error) {
    console.error('Error adding problem to codelist:', error);
    throw error;
  }
}

export async function removeProblemFromCodelist(codelistId: string, problemId: string): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('codelist_problems')
    .delete()
    .eq('codelist_id', codelistId)
    .eq('problem_id', problemId);
  
  if (error) {
    console.error('Error removing problem from codelist:', error);
    throw error;
  }
}

// ==========================================
// TYPE MAPPERS
// ==========================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbProblemToType(data: any): ProblemMetadata {
  return {
    id: data.id,
    platform: data.source as Platform,
    problemId: data.source_id,
    title: data.title,
    description: data.description || '',
    constraints: data.constraints,
    inputFormat: data.input_format,
    outputFormat: data.output_format,
    sampleTests: data.sample_tests || [],
    difficulty: data.difficulty,
    tags: data.tags || [],
    url: data.url,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbSolutionToType(data: any): UserSolution {
  return {
    id: data.id,
    problemId: data.problem_id,
    code: data.code,
    language: data.language,
    solved: data.verdict === 'AC',
    solvedAt: data.verdict === 'AC' ? data.submitted_at : undefined,
    createdAt: data.created_at,
    updatedAt: data.submitted_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbNotesToType(data: any): UserNotes {
  return {
    id: data.id,
    problemId: data.problem_id,
    content: data.content,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbCodelistToType(data: any): Codelist & { isPublic?: boolean; userId?: string } {
  const problemIds = (data.codelist_problems || [])
    .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
    .map((cp: { problem_id: string }) => cp.problem_id);
  
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    problemIds,
    isPublic: data.is_public,
    userId: data.user_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

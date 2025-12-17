import { ProblemMetadata, UserSolution, UserNotes, ProblemWithDetails, Codelist } from './types';
import fs from 'fs/promises';
import path from 'path';
import { normalizeUrl } from './utils/url-normalize';

const DB_DIR = path.join(process.cwd(), 'data');
const PROBLEMS_FILE = path.join(DB_DIR, 'problems.json');
const SOLUTIONS_FILE = path.join(DB_DIR, 'solutions.json');
const NOTES_FILE = path.join(DB_DIR, 'notes.json');
const CODELISTS_FILE = path.join(DB_DIR, 'codelists.json');

// Simple mutex for file operations to prevent race conditions
let writeLock = Promise.resolve();

async function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const release = writeLock;
  let resolve: () => void;
  writeLock = new Promise<void>(r => { resolve = r; });
  await release;
  try {
    return await fn();
  } finally {
    resolve!();
  }
}

// Atomic write - write to temp file then rename to prevent corruption
async function atomicWriteJson(filePath: string, data: unknown): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tempPath, filePath);
}

// Safe JSON parse with fallback
function safeParseJson<T>(content: string, fallback: T): T {
  try {
    const parsed = JSON.parse(content);
    return parsed ?? fallback;
  } catch {
    console.error('Failed to parse JSON, using fallback');
    return fallback;
  }
}

// Ensure data directory exists
async function ensureDbDir() {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
}

// Initialize empty files if they don't exist
async function initDbFiles() {
  await ensureDbDir();
  
  try {
    await fs.access(PROBLEMS_FILE);
  } catch {
    await atomicWriteJson(PROBLEMS_FILE, []);
  }
  
  try {
    await fs.access(SOLUTIONS_FILE);
  } catch {
    await atomicWriteJson(SOLUTIONS_FILE, []);
  }
  
  try {
    await fs.access(NOTES_FILE);
  } catch {
    await atomicWriteJson(NOTES_FILE, []);
  }
  
  try {
    await fs.access(CODELISTS_FILE);
  } catch {
    await atomicWriteJson(CODELISTS_FILE, []);
  }
}

// Read problems
export async function getProblems(): Promise<ProblemMetadata[]> {
  await initDbFiles();
  const data = await fs.readFile(PROBLEMS_FILE, 'utf-8');
  return safeParseJson<ProblemMetadata[]>(data, []);
}

// Save problem
export async function saveProblem(problem: ProblemMetadata): Promise<void> {
  await withWriteLock(async () => {
    await initDbFiles();
    const problems = await getProblems();
    const existingIndex = problems.findIndex(p => p.id === problem.id);
    
    if (existingIndex >= 0) {
      problems[existingIndex] = { ...problems[existingIndex], ...problem, updatedAt: new Date().toISOString() };
    } else {
      problems.push(problem);
    }
    
    await atomicWriteJson(PROBLEMS_FILE, problems);
  });
}

// Get problem by ID
export async function getProblemById(id: string): Promise<ProblemMetadata | null> {
  const problems = await getProblems();
  return problems.find(p => p.id === id) || null;
}

// Get problem by URL (checks both exact match and normalized match)
export async function getProblemByUrl(url: string): Promise<ProblemMetadata | null> {
  const problems = await getProblems();
  const normalizedUrl = normalizeUrl(url);
  
  // First try exact match
  const exactMatch = problems.find(p => p.url === url);
  if (exactMatch) return exactMatch;
  
  // Then try normalized match
  return problems.find(p => {
    const pNormalized = normalizeUrl(p.url);
    return pNormalized === normalizedUrl;
  }) || null;
}

// Read solutions
async function getSolutions(): Promise<UserSolution[]> {
  await initDbFiles();
  const data = await fs.readFile(SOLUTIONS_FILE, 'utf-8');
  return safeParseJson<UserSolution[]>(data, []);
}

// Save solution
export async function saveSolution(solution: UserSolution): Promise<void> {
  await withWriteLock(async () => {
    await initDbFiles();
    const solutions = await getSolutions();
    const existingIndex = solutions.findIndex(s => s.id === solution.id);
    
    if (existingIndex >= 0) {
      solutions[existingIndex] = { ...solutions[existingIndex], ...solution, updatedAt: new Date().toISOString() };
    } else {
      solutions.push(solution);
    }
    
    await atomicWriteJson(SOLUTIONS_FILE, solutions);
  });
}

// Get solution by problem ID
export async function getSolutionByProblemId(problemId: string): Promise<UserSolution | null> {
  const solutions = await getSolutions();
  return solutions.find(s => s.problemId === problemId) || null;
}

// Read notes
async function getNotes(): Promise<UserNotes[]> {
  await initDbFiles();
  const data = await fs.readFile(NOTES_FILE, 'utf-8');
  return safeParseJson<UserNotes[]>(data, []);
}

// Save notes
export async function saveNotes(notes: UserNotes): Promise<void> {
  await withWriteLock(async () => {
    await initDbFiles();
    const allNotes = await getNotes();
    const existingIndex = allNotes.findIndex(n => n.id === notes.id);
    
    if (existingIndex >= 0) {
      allNotes[existingIndex] = { ...allNotes[existingIndex], ...notes, updatedAt: new Date().toISOString() };
    } else {
      allNotes.push(notes);
    }
    
    await atomicWriteJson(NOTES_FILE, allNotes);
  });
}

// Get notes by problem ID
export async function getNotesByProblemId(problemId: string): Promise<UserNotes | null> {
  const notes = await getNotes();
  return notes.find(n => n.problemId === problemId) || null;
}

// Get problem with details
export async function getProblemWithDetails(id: string): Promise<ProblemWithDetails | null> {
  const problem = await getProblemById(id);
  if (!problem) return null;
  
  const solution = await getSolutionByProblemId(id);
  const notes = await getNotesByProblemId(id);
  
  return {
    ...problem,
    solution: solution || undefined,
    notes: notes || undefined,
  };
}

// Get all problems with details
export async function getAllProblemsWithDetails(): Promise<ProblemWithDetails[]> {
  const problems = await getProblems();
  const solutions = await getSolutions();
  const notes = await getNotes();
  
  return problems.map(problem => ({
    ...problem,
    solution: solutions.find(s => s.problemId === problem.id),
    notes: notes.find(n => n.problemId === problem.id),
  }));
}

// Delete problem
export async function deleteProblem(id: string): Promise<void> {
  await withWriteLock(async () => {
    const problems = await getProblems();
    const filtered = problems.filter(p => p.id !== id);
    await atomicWriteJson(PROBLEMS_FILE, filtered);
    
    // Also delete associated solution and notes
    const solutions = await getSolutions();
    const filteredSolutions = solutions.filter(s => s.problemId !== id);
    await atomicWriteJson(SOLUTIONS_FILE, filteredSolutions);
    
    const allNotes = await getNotes();
    const filteredNotes = allNotes.filter(n => n.problemId !== id);
    await atomicWriteJson(NOTES_FILE, filteredNotes);
    
    // Remove problem from all codelists
    const codelists = await getCodelists();
    const updatedCodelists = codelists.map(cl => ({
      ...cl,
      problemIds: cl.problemIds.filter(pid => pid !== id),
    }));
    await atomicWriteJson(CODELISTS_FILE, updatedCodelists);
  });
}

// ==================== CODELISTS ====================

// Read codelists
export async function getCodelists(): Promise<Codelist[]> {
  await initDbFiles();
  const data = await fs.readFile(CODELISTS_FILE, 'utf-8');
  return safeParseJson<Codelist[]>(data, []);
}

// Get codelist by ID
export async function getCodelistById(id: string): Promise<Codelist | null> {
  const codelists = await getCodelists();
  return codelists.find(c => c.id === id) || null;
}

// Save codelist (create or update)
export async function saveCodelist(codelist: Codelist): Promise<void> {
  await withWriteLock(async () => {
    await initDbFiles();
    const codelists = await getCodelists();
    const existingIndex = codelists.findIndex(c => c.id === codelist.id);
    
    if (existingIndex >= 0) {
      codelists[existingIndex] = { ...codelists[existingIndex], ...codelist, updatedAt: new Date().toISOString() };
    } else {
      codelists.push(codelist);
    }
    
    await atomicWriteJson(CODELISTS_FILE, codelists);
  });
}

// Delete codelist
export async function deleteCodelist(id: string): Promise<void> {
  await withWriteLock(async () => {
    const codelists = await getCodelists();
    const filtered = codelists.filter(c => c.id !== id);
    await atomicWriteJson(CODELISTS_FILE, filtered);
  });
}

// Add problem to codelist
export async function addProblemToCodelist(codelistId: string, problemId: string): Promise<Codelist | null> {
  return await withWriteLock(async () => {
    const codelists = await getCodelists();
    const codelist = codelists.find(c => c.id === codelistId);
    
    if (!codelist) return null;
    
    if (!codelist.problemIds.includes(problemId)) {
      codelist.problemIds.push(problemId);
      codelist.updatedAt = new Date().toISOString();
      await atomicWriteJson(CODELISTS_FILE, codelists);
    }
    
    return codelist;
  });
}

// Remove problem from codelist
export async function removeProblemFromCodelist(codelistId: string, problemId: string): Promise<Codelist | null> {
  return await withWriteLock(async () => {
    const codelists = await getCodelists();
    const codelist = codelists.find(c => c.id === codelistId);
    
    if (!codelist) return null;
    
    codelist.problemIds = codelist.problemIds.filter(id => id !== problemId);
    codelist.updatedAt = new Date().toISOString();
    await atomicWriteJson(CODELISTS_FILE, codelists);
    
    return codelist;
  });
}

// Get codelists that contain a specific problem
export async function getCodelistsForProblem(problemId: string): Promise<Codelist[]> {
  const codelists = await getCodelists();
  return codelists.filter(c => c.problemIds.includes(problemId));
}


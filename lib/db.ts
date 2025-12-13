import { ProblemMetadata, UserSolution, UserNotes, ProblemWithDetails } from './types';
import fs from 'fs/promises';
import path from 'path';
import { normalizeUrl } from './utils/url-normalize';

const DB_DIR = path.join(process.cwd(), 'data');
const PROBLEMS_FILE = path.join(DB_DIR, 'problems.json');
const SOLUTIONS_FILE = path.join(DB_DIR, 'solutions.json');
const NOTES_FILE = path.join(DB_DIR, 'notes.json');

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
    await fs.writeFile(PROBLEMS_FILE, JSON.stringify([], null, 2));
  }
  
  try {
    await fs.access(SOLUTIONS_FILE);
  } catch {
    await fs.writeFile(SOLUTIONS_FILE, JSON.stringify([], null, 2));
  }
  
  try {
    await fs.access(NOTES_FILE);
  } catch {
    await fs.writeFile(NOTES_FILE, JSON.stringify([], null, 2));
  }
}

// Read problems
export async function getProblems(): Promise<ProblemMetadata[]> {
  await initDbFiles();
  const data = await fs.readFile(PROBLEMS_FILE, 'utf-8');
  return JSON.parse(data);
}

// Save problem
export async function saveProblem(problem: ProblemMetadata): Promise<void> {
  await initDbFiles();
  const problems = await getProblems();
  const existingIndex = problems.findIndex(p => p.id === problem.id);
  
  if (existingIndex >= 0) {
    problems[existingIndex] = problem;
  } else {
    problems.push(problem);
  }
  
  await fs.writeFile(PROBLEMS_FILE, JSON.stringify(problems, null, 2));
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
  return JSON.parse(data);
}

// Save solution
export async function saveSolution(solution: UserSolution): Promise<void> {
  await initDbFiles();
  const solutions = await getSolutions();
  const existingIndex = solutions.findIndex(s => s.id === solution.id);
  
  if (existingIndex >= 0) {
    solutions[existingIndex] = solution;
  } else {
    solutions.push(solution);
  }
  
  await fs.writeFile(SOLUTIONS_FILE, JSON.stringify(solutions, null, 2));
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
  return JSON.parse(data);
}

// Save notes
export async function saveNotes(notes: UserNotes): Promise<void> {
  await initDbFiles();
  const allNotes = await getNotes();
  const existingIndex = allNotes.findIndex(n => n.id === notes.id);
  
  if (existingIndex >= 0) {
    allNotes[existingIndex] = notes;
  } else {
    allNotes.push(notes);
  }
  
  await fs.writeFile(NOTES_FILE, JSON.stringify(allNotes, null, 2));
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
  const problems = await getProblems();
  const filtered = problems.filter(p => p.id !== id);
  await fs.writeFile(PROBLEMS_FILE, JSON.stringify(filtered, null, 2));
  
  // Also delete associated solution and notes
  const solutions = await getSolutions();
  const filteredSolutions = solutions.filter(s => s.problemId !== id);
  await fs.writeFile(SOLUTIONS_FILE, JSON.stringify(filteredSolutions, null, 2));
  
  const allNotes = await getNotes();
  const filteredNotes = allNotes.filter(n => n.problemId !== id);
  await fs.writeFile(NOTES_FILE, JSON.stringify(filteredNotes, null, 2));
}


// Platform constants and type
export const PLATFORMS = ['codeforces', 'atcoder', 'codechef', 'leetcode'] as const;
export type Platform = typeof PLATFORMS[number];

// Helper to check if a string is a valid platform
export function isValidPlatform(value: string): value is Platform {
  return PLATFORMS.includes(value as Platform);
}

export interface SampleTest {
  input: string;
  output: string;
  explanation?: string;
  images?: string[]; // URLs of images in the explanation
}

export interface ProblemMetadata {
  id: string;
  platform: Platform;
  problemId: string; // e.g., "158A" for Codeforces
  title: string;
  description: string; // HTML/Markdown content
  constraints?: string;
  inputFormat?: string;
  outputFormat?: string;
  sampleTests: SampleTest[];
  difficulty?: string;
  tags: string[];
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSolution {
  id: string;
  problemId: string;
  code: string;
  language: string;
  solved: boolean;
  solvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserNotes {
  id: string;
  problemId: string;
  content: string; // Rich text content
  createdAt: string;
  updatedAt: string;
}

export interface ProblemWithDetails extends ProblemMetadata {
  solution?: UserSolution;
  notes?: UserNotes;
}

export interface ParseProblemRequest {
  url: string;
}

export interface ParseProblemResponse {
  success: boolean;
  data?: ProblemMetadata;
  error?: string;
}

// Codelist - like a playlist for problems
export interface Codelist {
  id: string;
  name: string;
  description?: string;
  problemIds: string[];
  createdAt: string;
  updatedAt: string;
}


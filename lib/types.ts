export type Platform = 'codeforces' | 'atcoder' | 'codechef' | 'leetcode';

export interface ProblemMetadata {
  id: string;
  platform: Platform;
  problemId: string; // e.g., "158A" for Codeforces
  title: string;
  description: string; // HTML/Markdown content
  constraints?: string;
  inputFormat?: string;
  outputFormat?: string;
  sampleTests: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
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


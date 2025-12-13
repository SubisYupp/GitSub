import { NextRequest, NextResponse } from 'next/server';
import { saveSolution, getSolutionByProblemId } from '@/lib/db';
import { UserSolution } from '@/lib/types';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { problemId, code, language, solved } = body;
    
    if (!problemId || !code || !language) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Check if solution exists
    const existing = await getSolutionByProblemId(problemId);
    
    const now = new Date().toISOString();
    const solution: UserSolution = {
      id: existing?.id || randomUUID(),
      problemId,
      code,
      language,
      solved: solved ?? false,
      solvedAt: solved ? (existing?.solvedAt || now) : undefined,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    
    await saveSolution(solution);
    
    return NextResponse.json({ success: true, data: solution });
  } catch (error) {
    console.error('Save solution error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save solution' },
      { status: 500 }
    );
  }
}


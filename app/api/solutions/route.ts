import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/db';
import * as supabaseDb from '@/lib/supabase/db';
import * as localDb from '@/lib/db';
import { UserSolution } from '@/lib/types';
import { randomUUID } from 'crypto';

// Check if Supabase is configured
const useSupabase = () => {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

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
    
    if (useSupabase()) {
      const user = await getAuthenticatedUser();
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }
      
      const solution = await supabaseDb.saveSolution(user.id, {
        problemId,
        code,
        language,
        solved: solved ?? false,
      });
      
      return NextResponse.json({ success: true, data: solution });
    }
    
    // Fallback to local
    const existing = await localDb.getSolutionByProblemId(problemId);
    
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
    
    await localDb.saveSolution(solution);
    
    return NextResponse.json({ success: true, data: solution });
  } catch (error) {
    console.error('Save solution error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save solution' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/db';
import * as supabaseDb from '@/lib/supabase/db';
import * as localDb from '@/lib/db';
import { UserNotes } from '@/lib/types';
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
    const { problemId, content } = body;
    
    if (!problemId) {
      return NextResponse.json(
        { success: false, error: 'Problem ID is required' },
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
      
      const notes = await supabaseDb.saveNotes(user.id, {
        problemId,
        content: content || '',
      });
      
      return NextResponse.json({ success: true, data: notes });
    }
    
    // Fallback to local
    const existing = await localDb.getNotesByProblemId(problemId);
    
    const now = new Date().toISOString();
    const notes: UserNotes = {
      id: existing?.id || randomUUID(),
      problemId,
      content: content || '',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    
    await localDb.saveNotes(notes);
    
    return NextResponse.json({ success: true, data: notes });
  } catch (error) {
    console.error('Save notes error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save notes' },
      { status: 500 }
    );
  }
}


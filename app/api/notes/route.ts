import { NextRequest, NextResponse } from 'next/server';
import { saveNotes, getNotesByProblemId } from '@/lib/db';
import { UserNotes } from '@/lib/types';
import { randomUUID } from 'crypto';

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
    
    // Check if notes exist
    const existing = await getNotesByProblemId(problemId);
    
    const now = new Date().toISOString();
    const notes: UserNotes = {
      id: existing?.id || randomUUID(),
      problemId,
      content: content || '',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    
    await saveNotes(notes);
    
    return NextResponse.json({ success: true, data: notes });
  } catch (error) {
    console.error('Save notes error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save notes' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/db';
import * as supabaseDb from '@/lib/supabase/db';
import * as localDb from '@/lib/db';

// Check if Supabase is configured
const useSupabase = () => {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (useSupabase()) {
      const problem = await supabaseDb.getProblemById(id);
      
      if (!problem) {
        return NextResponse.json(
          { success: false, error: 'Problem not found' },
          { status: 404 }
        );
      }
      
      // Get user-specific data if authenticated
      const user = await getAuthenticatedUser();
      if (user) {
        const [solution, notes] = await Promise.all([
          supabaseDb.getSolutionByProblemId(user.id, id),
          supabaseDb.getNotesByProblemId(user.id, id),
        ]);
        
        return NextResponse.json({ 
          success: true, 
          data: { ...problem, solution, notes } 
        });
      }
      
      return NextResponse.json({ success: true, data: problem });
    }
    
    // Fallback to local
    const problem = await localDb.getProblemWithDetails(id);
    
    if (!problem) {
      return NextResponse.json(
        { success: false, error: 'Problem not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: problem });
  } catch (error) {
    console.error('Get problem error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch problem' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (useSupabase()) {
      const user = await getAuthenticatedUser();
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }
      
      await supabaseDb.removeProblemFromUser(user.id, id);
      return NextResponse.json({ success: true });
    }
    
    await localDb.deleteProblem(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete problem error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete problem' },
      { status: 500 }
    );
  }
}


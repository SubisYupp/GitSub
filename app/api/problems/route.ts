import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    // If Supabase is configured, use it
    if (useSupabase()) {
      const user = await getAuthenticatedUser();
      
      if (!user) {
        // Return empty for unauthenticated users
        return NextResponse.json({ success: true, data: [] });
      }
      
      const problems = await supabaseDb.getUserProblems(user.id);
      return NextResponse.json({ success: true, data: problems });
    }
    
    // Fallback to local JSON for development
    const problems = await localDb.getAllProblemsWithDetails();
    return NextResponse.json({ success: true, data: problems });
  } catch (error) {
    console.error('Get problems error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch problems' },
      { status: 500 }
    );
  }
}


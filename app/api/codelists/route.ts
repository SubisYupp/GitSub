import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/db';
import * as supabaseDb from '@/lib/supabase/db';
import * as localDb from '@/lib/db';
import { Codelist } from '@/lib/types';
import { randomUUID } from 'crypto';

// Check if Supabase is configured
const useSupabase = () => {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

// GET /api/codelists - Get all codelists
export async function GET() {
  try {
    if (useSupabase()) {
      const user = await getAuthenticatedUser();
      if (!user) {
        return NextResponse.json({ success: true, data: [] });
      }
      
      const codelists = await supabaseDb.getCodelists(user.id);
      return NextResponse.json({ success: true, data: codelists });
    }
    
    const codelists = await localDb.getCodelists();
    return NextResponse.json({ success: true, data: codelists });
  } catch (error) {
    console.error('Error fetching codelists:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch codelists' },
      { status: 500 }
    );
  }
}

// POST /api/codelists - Create a new codelist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Codelist name is required' },
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
      
      const codelist = await supabaseDb.saveCodelist(user.id, {
        id: randomUUID(),
        name: name.trim(),
        description: description?.trim() || undefined,
        problemIds: [],
      });
      
      return NextResponse.json({ success: true, data: codelist });
    }
    
    const now = new Date().toISOString();
    const codelist: Codelist = {
      id: randomUUID(),
      name: name.trim(),
      description: description?.trim() || undefined,
      problemIds: [],
      createdAt: now,
      updatedAt: now,
    };
    
    await localDb.saveCodelist(codelist);
    
    return NextResponse.json({ success: true, data: codelist });
  } catch (error) {
    console.error('Error creating codelist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create codelist' },
      { status: 500 }
    );
  }
}

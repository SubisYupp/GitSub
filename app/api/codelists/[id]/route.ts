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

// GET /api/codelists/[id] - Get a specific codelist
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (useSupabase()) {
      const user = await getAuthenticatedUser();
      const codelist = await supabaseDb.getCodelistById(id, user?.id);
      
      if (!codelist) {
        return NextResponse.json(
          { success: false, error: 'Codelist not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ success: true, data: codelist });
    }
    
    const codelist = await localDb.getCodelistById(id);
    
    if (!codelist) {
      return NextResponse.json(
        { success: false, error: 'Codelist not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: codelist });
  } catch (error) {
    console.error('Error fetching codelist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch codelist' },
      { status: 500 }
    );
  }
}

// PATCH /api/codelists/[id] - Update a codelist (name/description/isPublic)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, isPublic } = body;
    
    if (useSupabase()) {
      const user = await getAuthenticatedUser();
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }
      
      const codelist = await supabaseDb.getCodelistById(id, user.id);
      
      if (!codelist) {
        return NextResponse.json(
          { success: false, error: 'Codelist not found' },
          { status: 404 }
        );
      }
      
      // Handle public toggle separately
      if (isPublic !== undefined) {
        await supabaseDb.toggleCodelistPublic(user.id, id, isPublic);
      }
      
      // Update name/description
      if (name !== undefined || description !== undefined) {
        const updatedCodelist = {
          ...codelist,
          name: name !== undefined ? name.trim() : codelist.name,
          description: description !== undefined ? description?.trim() : codelist.description,
        };
        
        await supabaseDb.saveCodelist(user.id, updatedCodelist);
      }
      
      const updated = await supabaseDb.getCodelistById(id, user.id);
      return NextResponse.json({ success: true, data: updated });
    }
    
    // Local fallback
    const codelist = await localDb.getCodelistById(id);
    
    if (!codelist) {
      return NextResponse.json(
        { success: false, error: 'Codelist not found' },
        { status: 404 }
      );
    }
    
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Codelist name cannot be empty' },
          { status: 400 }
        );
      }
      codelist.name = name.trim();
    }
    
    if (description !== undefined) {
      codelist.description = description?.trim() || undefined;
    }
    
    await localDb.saveCodelist(codelist);
    
    return NextResponse.json({ success: true, data: codelist });
  } catch (error) {
    console.error('Error updating codelist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update codelist' },
      { status: 500 }
    );
  }
}

// DELETE /api/codelists/[id] - Delete a codelist
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
      
      await supabaseDb.deleteCodelist(user.id, id);
      return NextResponse.json({ success: true });
    }
    
    const codelist = await localDb.getCodelistById(id);
    
    if (!codelist) {
      return NextResponse.json(
        { success: false, error: 'Codelist not found' },
        { status: 404 }
      );
    }
    
    await localDb.deleteCodelist(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting codelist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete codelist' },
      { status: 500 }
    );
  }
}

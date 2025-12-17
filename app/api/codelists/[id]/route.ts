import { NextRequest, NextResponse } from 'next/server';
import { getCodelistById, saveCodelist, deleteCodelist } from '@/lib/db';

// GET /api/codelists/[id] - Get a specific codelist
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const codelist = await getCodelistById(id);
    
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

// PATCH /api/codelists/[id] - Update a codelist (name/description)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const codelist = await getCodelistById(id);
    
    if (!codelist) {
      return NextResponse.json(
        { success: false, error: 'Codelist not found' },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    const { name, description } = body;
    
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
    
    await saveCodelist(codelist);
    
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
    const codelist = await getCodelistById(id);
    
    if (!codelist) {
      return NextResponse.json(
        { success: false, error: 'Codelist not found' },
        { status: 404 }
      );
    }
    
    await deleteCodelist(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting codelist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete codelist' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { addProblemToCodelist, removeProblemFromCodelist, getCodelistById, getProblemById } from '@/lib/db';

// POST /api/codelists/[id]/problems - Add a problem to codelist
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { problemId } = body;
    
    if (!problemId) {
      return NextResponse.json(
        { success: false, error: 'Problem ID is required' },
        { status: 400 }
      );
    }
    
    // Verify problem exists
    const problem = await getProblemById(problemId);
    if (!problem) {
      return NextResponse.json(
        { success: false, error: 'Problem not found' },
        { status: 404 }
      );
    }
    
    const codelist = await addProblemToCodelist(id, problemId);
    
    if (!codelist) {
      return NextResponse.json(
        { success: false, error: 'Codelist not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: codelist });
  } catch (error) {
    console.error('Error adding problem to codelist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add problem to codelist' },
      { status: 500 }
    );
  }
}

// DELETE /api/codelists/[id]/problems - Remove a problem from codelist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const problemId = searchParams.get('problemId');
    
    if (!problemId) {
      return NextResponse.json(
        { success: false, error: 'Problem ID is required' },
        { status: 400 }
      );
    }
    
    const codelist = await removeProblemFromCodelist(id, problemId);
    
    if (!codelist) {
      return NextResponse.json(
        { success: false, error: 'Codelist not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: codelist });
  } catch (error) {
    console.error('Error removing problem from codelist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove problem from codelist' },
      { status: 500 }
    );
  }
}

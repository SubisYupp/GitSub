import { NextRequest, NextResponse } from 'next/server';
import { getProblemWithDetails, deleteProblem } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const problem = await getProblemWithDetails(id);
    
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
    await deleteProblem(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete problem error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete problem' },
      { status: 500 }
    );
  }
}


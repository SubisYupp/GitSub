import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, toggleCodelistPublic, getCodelistById } from '@/lib/supabase/db';

// POST /api/codelists/[id]/share - Toggle public sharing
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isPublic } = body;
    
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get codelist to verify ownership
    const codelist = await getCodelistById(id, user.id);
    if (!codelist) {
      return NextResponse.json(
        { success: false, error: 'Codelist not found' },
        { status: 404 }
      );
    }
    
    // Check if user owns this codelist
    if ((codelist as { userId?: string }).userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to share this codelist' },
        { status: 403 }
      );
    }
    
    await toggleCodelistPublic(user.id, id, isPublic ?? true);
    
    // Generate share URL
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/shared/${id}`;
    
    return NextResponse.json({
      success: true,
      data: {
        isPublic: isPublic ?? true,
        shareUrl,
      },
    });
  } catch (error) {
    console.error('Error toggling codelist share:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update sharing settings' },
      { status: 500 }
    );
  }
}

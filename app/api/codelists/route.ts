import { NextRequest, NextResponse } from 'next/server';
import { getCodelists, saveCodelist, deleteCodelist } from '@/lib/db';
import { Codelist } from '@/lib/types';
import { randomUUID } from 'crypto';

// GET /api/codelists - Get all codelists
export async function GET() {
  try {
    const codelists = await getCodelists();
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
    
    const now = new Date().toISOString();
    const codelist: Codelist = {
      id: randomUUID(),
      name: name.trim(),
      description: description?.trim() || undefined,
      problemIds: [],
      createdAt: now,
      updatedAt: now,
    };
    
    await saveCodelist(codelist);
    
    return NextResponse.json({ success: true, data: codelist });
  } catch (error) {
    console.error('Error creating codelist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create codelist' },
      { status: 500 }
    );
  }
}

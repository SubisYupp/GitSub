import { NextResponse } from 'next/server';
import { getAllProblemsWithDetails } from '@/lib/db';

export async function GET() {
  try {
    const problems = await getAllProblemsWithDetails();
    return NextResponse.json({ success: true, data: problems });
  } catch (error) {
    console.error('Get problems error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch problems' },
      { status: 500 }
    );
  }
}


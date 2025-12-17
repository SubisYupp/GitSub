import { NextRequest, NextResponse } from 'next/server';
import { getPublicCodelist, getProblemById } from '@/lib/supabase/db';

// GET /api/shared/[id] - Get a public codelist with problems
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const codelist = await getPublicCodelist(id);
    
    if (!codelist) {
      return NextResponse.json(
        { success: false, error: 'Codelist not found or not public' },
        { status: 404 }
      );
    }
    
    // Get full problem details for each problem in the codelist
    const problems = await Promise.all(
      codelist.problemIds.map(async (problemId) => {
        const problem = await getProblemById(problemId);
        return problem;
      })
    );
    
    // Filter out any null problems
    const validProblems = problems.filter(Boolean);
    
    return NextResponse.json({
      success: true,
      data: {
        ...codelist,
        problems: validProblems,
      },
    });
  } catch (error) {
    console.error('Error fetching shared codelist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shared codelist' },
      { status: 500 }
    );
  }
}

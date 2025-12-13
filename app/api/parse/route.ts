import { NextRequest, NextResponse } from 'next/server';
import { parseProblem } from '@/lib/parsers';
import { getProblemByUrl, getProblemById, saveProblem } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }
    
    // Check if problem already exists by URL (handles normalization automatically)
    const existingByUrl = await getProblemByUrl(url);
    if (existingByUrl) {
      return NextResponse.json({
        success: true,
        data: existingByUrl,
        message: 'Problem already exists in vault',
      });
    }
    
    // Parse the problem
    console.log(`Parsing problem from URL: ${url}`);
    const problem = await parseProblem(url);
    console.log(`Successfully parsed problem: ${problem.title}`);
    
    // Also check by problem ID (in case URL format differs but same problem)
    const existingById = await getProblemById(problem.id);
    if (existingById) {
      return NextResponse.json({
        success: true,
        data: existingById,
        message: 'Problem already exists in vault',
      });
    }
    
    // Save to database
    await saveProblem(problem);
    
    return NextResponse.json({
      success: true,
      data: problem,
    });
  } catch (error) {
    console.error('Parse error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to parse problem';
    
    // Provide more helpful error messages
    let userMessage = errorMessage;
    if (errorMessage.includes('Forbidden') || errorMessage.includes('403')) {
      userMessage = 'Access forbidden. The website may be blocking automated requests. Please try again later.';
    } else if (errorMessage.includes('Failed to fetch')) {
      userMessage = 'Failed to fetch the problem. Please check the URL and try again.';
    } else if (errorMessage.includes('Unsupported platform')) {
      userMessage = errorMessage;
    }
    
    return NextResponse.json(
      {
        success: false,
        error: userMessage,
      },
      { status: 500 }
    );
  }
}


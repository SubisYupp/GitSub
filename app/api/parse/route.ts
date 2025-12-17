import { NextRequest, NextResponse } from 'next/server';
import { parseProblem } from '@/lib/parsers';
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

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
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
      
      // Check if problem already exists globally
      const existingByUrl = await supabaseDb.getProblemByUrl(url);
      if (existingByUrl) {
        // Add to user's problems
        await supabaseDb.addProblemToUser(user.id, existingByUrl.id);
        return NextResponse.json({
          success: true,
          data: existingByUrl,
          message: 'Problem added to your vault',
        });
      }
      
      // Parse the problem
      console.log(`Parsing problem from URL: ${url}`);
      const problem = await parseProblem(url);
      console.log(`Successfully parsed problem: ${problem.title}`);
      
      // Check by ID
      const existingById = await supabaseDb.getProblemById(problem.id);
      if (existingById) {
        await supabaseDb.addProblemToUser(user.id, existingById.id);
        return NextResponse.json({
          success: true,
          data: existingById,
          message: 'Problem added to your vault',
        });
      }
      
      // Save globally and add to user
      const savedProblem = await supabaseDb.saveProblem(problem);
      await supabaseDb.addProblemToUser(user.id, savedProblem.id);
      
      return NextResponse.json({
        success: true,
        data: savedProblem,
      });
    }
    
    // Fallback to local
    const existingByUrl = await localDb.getProblemByUrl(url);
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
    const existingById = await localDb.getProblemById(problem.id);
    if (existingById) {
      return NextResponse.json({
        success: true,
        data: existingById,
        message: 'Problem already exists in vault',
      });
    }
    
    // Save to database
    await localDb.saveProblem(problem);
    
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


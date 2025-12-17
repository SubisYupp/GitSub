import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  
  // Use environment variable for production, fallback to origin for local dev
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || new URL(request.url).origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      return NextResponse.redirect(`${baseUrl}${next}`);
    }
    
    // Log error for debugging (check Vercel logs)
    console.error('Auth callback error:', error.message);
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${baseUrl}/login?error=auth_callback_error`);
}

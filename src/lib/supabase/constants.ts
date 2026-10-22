/**
 * Supabase configuration constants with default fallbacks.
 * Ensures the application functions reliably on Vercel even if environment
 * variables have not yet been populated in the project dashboard.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://zmvgdprqssedrqkzwhdj.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdmdkcHJxc3NlZHJxa3p3aGRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5ODA4MjcsImV4cCI6MjEwNzU1NjgyN30.UpS940mTURFtEnBexI3mxzZeqTv94VxkJGJ9wlif4y8";

// Tipos do banco gerados pelo Supabase CLI.
// Regenerar com: npm run db:types (requer projeto linkado via `npx supabase link`)
// Placeholder até a primeira geração — substituído por completo pelo comando acima.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

/**
 * supabase.ts — Safe Supabase client stub
 *
 * We migrated to PostgreSQL (Neon.tech) + FastAPI.
 * Image uploads now go through Firebase Storage (see storage.ts).
 * This file is kept to avoid breaking existing imports during the migration.
 *
 * ⚠️  DO NOT use supabase.from() or supabase.storage — use api.ts instead.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.info('ℹ️  Supabase not configured — using PostgreSQL + FastAPI backend instead.');
}

// Safe proxy: any method called returns a no-op promise so nothing crashes
// when Supabase env vars are missing.
export const supabase = new Proxy({} as any, {
  get(_target, prop: string) {
    // Handle supabase.storage.from('bucket').upload(...)
    if (prop === 'storage') {
      return {
        from: (_bucket: string) => ({
          upload: (_path: string, _file: Blob) =>
            Promise.resolve({ data: null, error: new Error('Supabase storage not configured — use Firebase Storage') }),
          getPublicUrl: (_path: string) =>
            ({ data: { publicUrl: '' } }),
        }),
      };
    }
    // Handle supabase.from('table').select / insert / update / delete
    if (prop === 'from') {
      return (_table: string) => ({
        select:  () => Promise.resolve({ data: [], error: null }),
        insert:  () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        update:  () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        delete:  () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        upsert:  () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      });
    }
    // Default — return a no-op function
    return () => Promise.resolve({ data: null, error: null });
  },
});

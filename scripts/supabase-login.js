// Script Node.js pour se connecter à Supabase Auth et récupérer un JWT d'accès
// Usage : node scripts/supabase-login.js <email> <motdepasse>

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://levtzvkhdxyqokthjawp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxldnR6dmtoZHh5cW9rdGhqYXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NzkzNTcsImV4cCI6MjA2NjU1NTM1N30.nTQULsQwGSYiFisHKNfY_zH6R5F8Yve8SRdxJd34upg';

const [,, email, password] = process.argv;
if (!email || !password) {
  console.error('Usage: node scripts/supabase-login.js <email> <motdepasse>');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

(async () => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('Erreur de connexion:', error.message);
    process.exit(1);
  }
  console.log('JWT d\'accès :', data.session.access_token);
})(); 
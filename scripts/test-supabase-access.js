// Test automatisé des policies RLS Supabase pour Attitudes.vip
// Utilise un JWT d'utilisateur Supabase Auth si fourni (via SUPABASE_JWT ou argument)

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://levtzvkhdxyqokthjawp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxldnR6dmtoZHh5cW9rdGhqYXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NzkzNTcsImV4cCI6MjA2NjU1NTM1N30.nTQULsQwGSYiFisHKNfY_zH6R5F8Yve8SRdxJd34upg';

// Permet de passer le JWT en argument ou variable d'env
const jwt = process.env.SUPABASE_JWT || process.argv[2];

// Utilisateur de test (le JWT doit correspondre à ce user)
const user = { email: 'testuser@demo.com' };

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: jwt ? { headers: { Authorization: `Bearer ${jwt}` } } : undefined
});

async function testAccess() {
  console.log(`\n--- Test accès pour ${user.email} ---`);

  // 1. Lire les users du tenant
  const { data: usersList, error: usersError } = await supabase
    .from('users')
    .select('*');
  if (usersError) {
    console.error('Erreur lecture users:', usersError.message);
  } else {
    console.log('Users visibles:', usersList.map(u => u.email));
  }

  // 2. Modifier son propre profil (doit réussir si JWT correct)
  // (Remplace 'testuser@demo.com' par l'email de ton user test si besoin)
  const { data: selfUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', user.email)
    .single();
  if (!selfUser) {
    console.error('User test introuvable dans la table users.');
    return;
  }
  const { error: updateSelfError } = await supabase
    .from('users')
    .update({ name: 'Test ' + user.email })
    .eq('id', selfUser.id);
  if (updateSelfError) {
    console.error('Erreur update self:', updateSelfError.message);
  } else {
    console.log('Update self: OK');
  }
}

(async () => {
  await testAccess();
})();

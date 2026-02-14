// Test automatisé des policies RLS Supabase pour Attitudes.vip
// Clés réelles injectées depuis docs/clesupabase.md

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://levtzvkhdxyqokthjawp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxldnR6dmtoZHh5cW9rdGhqYXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NzkzNTcsImV4cCI6MjA2NjU1NTM1N30.nTQULsQwGSYiFisHKNfY_zH6R5F8Yve8SRdxJd34upg';

// Utilisateurs de test (remplacer par des JWT valides si besoin)
const users = [
  { email: 'cio@demo.com', id: '00000000-0000-0000-0000-000000000101' },
  { email: 'admin@demo.com', id: '00000000-0000-0000-0000-000000000102' },
  { email: 'client@demo.com', id: '00000000-0000-0000-0000-000000000103' },
  { email: 'customer@demo.com', id: '00000000-0000-0000-0000-000000000104' },
  { email: 'invite@demo.com', id: '00000000-0000-0000-0000-000000000105' },
];

async function testAccess(user) {
  console.log(`\n--- Test accès pour ${user.email} ---`);
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { 'X-User-Id': user.id } }
  });

  // 1. Lire les users du tenant
  const { data: usersList, error: usersError } = await supabase
    .from('users')
    .select('*');
  if (usersError) {
    console.error('Erreur lecture users:', usersError.message);
  } else {
    console.log('Users visibles:', usersList.map(u => u.email));
  }

  // 2. Modifier son propre profil (doit réussir)
  const { error: updateSelfError } = await supabase
    .from('users')
    .update({ name: 'Test ' + user.email })
    .eq('id', user.id);
  if (updateSelfError) {
    console.error('Erreur update self:', updateSelfError.message);
  } else {
    console.log('Update self: OK');
  }

  // 3. Tenter de modifier un autre user (doit échouer)
  const otherId = users.find(u => u.id !== user.id).id;
  const { error: updateOtherError } = await supabase
    .from('users')
    .update({ name: 'Hacker' })
    .eq('id', otherId);
  if (updateOtherError) {
    console.log('Update other: refusé (OK)', updateOtherError.message);
  } else {
    console.error('Update other: ERREUR, accès non restreint!');
  }
}

(async () => {
  for (const user of users) {
    await testAccess(user);
  }
})(); 
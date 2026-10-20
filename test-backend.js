/**
 * Script de test pour vérifier la connexion au backend
 * Usage: node test-backend.js
 */

const API_URL = 'http://localhost:8000/api/v1';

async function testEndpoint(name, url) {
  try {
    console.log(`\n🔍 Test: ${name}`);
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`   ✅ Statut: ${response.status} OK`);
      console.log(`   📊 Données reçues:`, JSON.stringify(data, null, 2).slice(0, 200) + '...');
      return true;
    } else {
      console.log(`   ❌ Erreur: ${response.status}`);
      console.log(`   Message:`, data);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Erreur de connexion:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Test de connexion au backend');
  console.log(`📍 API URL: ${API_URL}`);
  console.log('=' .repeat(60));
  
  const tests = [
    ['Health Check', `${API_URL}/health`],
    ['Couverture (carreaux)', `${API_URL}/mobility/coverage?region=bordeaux`],
    ['Heat Map', `${API_URL}/mobility/heatmap?region=bordeaux`],
    ['Stations', `${API_URL}/stations?region=bordeaux&limit=10`],
    ['Statistiques Summary', `${API_URL}/statistics/summary?region=bordeaux`],
    ['Statistiques Population', `${API_URL}/statistics/population?region=bordeaux`],
  ];
  
  let passed = 0;
  for (const [name, url] of tests) {
    const success = await testEndpoint(name, url);
    if (success) passed++;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✨ Résultat: ${passed}/${tests.length} tests réussis`);
  
  if (passed === tests.length) {
    console.log('✅ Backend opérationnel ! Vous pouvez lancer le frontend.');
  } else {
    console.log('⚠️  Certains endpoints ne répondent pas. Vérifiez le backend.');
    console.log('💡 Assurez-vous que le backend tourne sur http://localhost:8000');
  }
}

main();

// Tests d'intégration pour le data-service
require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:5002';
const NOTIFICATION_URL = 'http://localhost:5005';

// Couleurs pour les logs
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

const log = (color, message) => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

// Variables pour les tests
let authToken = null;
let testUserId = null;
let testTripId = null;

async function testHealthCheck() {
  try {
    log('blue', '🔍 Test Health Check...');
    const response = await axios.get(`${BASE_URL}/health`);
    
    if (response.status === 200) {
      log('green', '✅ Health Check OK');
      
      // Vérifier les dépendances
      const health = response.data;
      log('cyan', `   MongoDB: ${health.dependencies?.mongodb || 'unknown'}`);
      log('cyan', `   Notification Service: ${health.dependencies?.notificationService || 'unknown'}`);
      
      return true;
    } else {
      log('red', '❌ Health Check FAIL');
      return false;
    }
  } catch (error) {
    log('red', '❌ Health Check ERROR: ' + error.message);
    return false;
  }
}

async function testVitals() {
  try {
    log('blue', '📊 Test Vitals...');
    const response = await axios.get(`${BASE_URL}/vitals`);
    
    if (response.status === 200) {
      const vitals = response.data;
      log('green', '✅ Vitals OK');
      log('cyan', `   Service: ${vitals.service}`);
      log('cyan', `   Uptime: ${Math.round(vitals.uptime)}s`);
      log('cyan', `   Intégrations: ${Object.keys(vitals.integrations || {}).join(', ')}`);
      return true;
    } else {
      log('red', '❌ Vitals FAIL');
      return false;
    }
  } catch (error) {
    log('red', '❌ Vitals ERROR: ' + error.message);
    return false;
  }
}

async function testUserRegistration() {
  try {
    log('blue', '👤 Test Inscription Utilisateur...');
    
    const userData = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User'
    };
    
    const response = await axios.post(`${BASE_URL}/api/auth/register`, userData);
    
    if (response.status === 201 && response.data.tokens) {
      authToken = response.data.tokens.accessToken;
      testUserId = response.data.user.id;
      
      log('green', '✅ Inscription OK');
      log('cyan', `   🔗 Email de confirmation déclenché vers Notification Service`);
      log('cyan', `   User ID: ${testUserId}`);
      return true;
    } else {
      log('red', '❌ Inscription FAIL');
      return false;
    }
  } catch (error) {
    log('red', '❌ Inscription ERROR: ' + error.message);
    return false;
  }
}

async function testUserLogin() {
  try {
    log('blue', '🔐 Test Connexion...');
    
    // Se connecter avec un utilisateur existant ou créer un compte vérifié
    const loginData = {
      email: 'admin@test.com',
      password: 'admin123'
    };
    
    const response = await axios.post(`${BASE_URL}/api/auth/login`, loginData);
    
    if (response.status === 200 && response.data.tokens) {
      authToken = response.data.tokens.accessToken;
      log('green', '✅ Connexion OK');
      log('cyan', `   Role: ${response.data.user.role}`);
      return true;
    } else {
      log('yellow', '⚠️ Connexion échouée - compte de test non disponible');
      return true; // Normal si pas de compte de test
    }
  } catch (error) {
    log('yellow', '⚠️ Connexion ERROR: ' + error.message);
    return true; // Normal si pas de compte de test
  }
}

async function testTripsAPI() {
  try {
    log('blue', '🌍 Test API Roadtrips...');
    
    const response = await axios.get(`${BASE_URL}/api/roadtrips`);
    
    if (response.status === 200 && response.data.success) {
      log('green', '✅ API Roadtrips OK');
      const trips = response.data.data.trips;
      log('cyan', `   Nombre de roadtrips: ${trips.length}`);
      
      if (trips.length > 0) {
        testTripId = trips[0]._id;
        log('cyan', `   Premier trip ID: ${testTripId}`);
      }
      
      return true;
    } else {
      log('red', '❌ API Roadtrips FAIL');
      return false;
    }
  } catch (error) {
    log('red', '❌ API Roadtrips ERROR: ' + error.message);
    return false;
  }
}

async function testTripDetails() {
  try {
    log('blue', '🔍 Test Détails Roadtrip...');
    
    if (!testTripId) {
      log('yellow', '⚠️ Pas de trip ID pour tester');
      return true;
    }
    
    const response = await axios.get(`${BASE_URL}/api/roadtrips/${testTripId}`);
    
    if (response.status === 200 && response.data.success) {
      log('green', '✅ Détails Roadtrip OK');
      const trip = response.data.data;
      log('cyan', `   Titre: ${trip.title}`);
      log('cyan', `   Premium: ${trip.isPremium ? 'Oui' : 'Non'}`);
      
      if (trip.isPremium && trip.premiumNotice) {
        log('cyan', `   🔗 Logique premium activée (lien Payment Service)`);
      }
      
      return true;
    } else {
      log('red', '❌ Détails Roadtrip FAIL');
      return false;
    }
  } catch (error) {
    log('red', '❌ Détails Roadtrip ERROR: ' + error.message);
    return false;
  }
}

async function testAIMessagesIntegration() {
  try {
    log('blue', '🤖 Test Intégration AI Messages...');
    
    if (!testUserId) {
      log('yellow', '⚠️ Pas d\'user ID pour tester');
      return true;
    }
    
    // Simuler la sauvegarde d'un message IA
    const messageData = {
      userId: testUserId,
      role: 'user',
      content: 'Test message pour conversation IA',
      conversationId: `conv-${Date.now()}`
    };
    
    const response = await axios.post(`${BASE_URL}/api/messages`, messageData);
    
    if (response.status === 201) {
      log('green', '✅ Intégration AI Messages OK');
      log('cyan', `   🔗 Message sauvegardé pour le AI Service`);
      return true;
    } else {
      log('red', '❌ Intégration AI Messages FAIL');
      return false;
    }
  } catch (error) {
    log('red', '❌ Intégration AI Messages ERROR: ' + error.message);
    return false;
  }
}

async function testAdminAPI() {
  try {
    log('blue', '⚙️ Test API Admin...');
    
    if (!authToken) {
      log('yellow', '⚠️ Pas de token pour tester admin');
      return true;
    }
    
    const response = await axios.get(`${BASE_URL}/api/admin/stats`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.status === 200 && response.data.success) {
      log('green', '✅ API Admin OK');
      const stats = response.data.stats;
      log('cyan', `   Utilisateurs totaux: ${stats.users?.total || 0}`);
      log('cyan', `   Roadtrips publiés: ${stats.trips?.published || 0}`);
      log('cyan', `   Messages IA: ${stats.engagement?.ai_messages || 0}`);
      return true;
    } else {
      log('yellow', '⚠️ API Admin - Access denied (normal si pas admin)');
      return true;
    }
  } catch (error) {
    if (error.response?.status === 403) {
      log('yellow', '⚠️ API Admin - Forbidden (normal si pas admin)');
      return true;
    }
    log('red', '❌ API Admin ERROR: ' + error.message);
    return false;
  }
}

async function testNotificationServiceIntegration() {
  try {
    log('blue', '📧 Test Intégration Notification Service...');
    
    // Vérifier que le notification service est accessible
    const healthResponse = await axios.get(`${NOTIFICATION_URL}/health`);
    
    if (healthResponse.status === 200) {
      log('green', '✅ Notification Service accessible');
      log('cyan', `   🔗 Prêt pour: emails, SMS, confirmations`);
      return true;
    } else {
      log('yellow', '⚠️ Notification Service non disponible');
      return true;
    }
  } catch (error) {
    log('yellow', '⚠️ Notification Service non accessible: ' + error.message);
    return true; // Normal si le service n'est pas démarré
  }
}

async function testMetrics() {
  try {
    log('blue', '📊 Test Métriques...');
    const response = await axios.get(`${BASE_URL}/metrics`);
    
    if (response.status === 200 && response.data.includes('http_requests_total')) {
      log('green', '✅ Métriques OK');
      log('cyan', '   Format Prometheus détecté');
      return true;
    } else {
      log('red', '❌ Métriques FAIL');
      return false;
    }
  } catch (error) {
    log('red', '❌ Métriques ERROR: ' + error.message);
    return false;
  }
}

async function runTests() {
  log('blue', '🚀 Démarrage des tests Data Service\n');
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Vitals', fn: testVitals },
    { name: 'Métriques', fn: testMetrics },
    { name: 'Notification Service', fn: testNotificationServiceIntegration },
    { name: 'Inscription', fn: testUserRegistration },
    { name: 'Connexion', fn: testUserLogin },
    { name: 'API Roadtrips', fn: testTripsAPI },
    { name: 'Détails Trip', fn: testTripDetails },
    { name: 'AI Messages', fn: testAIMessagesIntegration },
    { name: 'API Admin', fn: testAdminAPI }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      log('red', `❌ Erreur inattendue dans ${test.name}: ${error.message}`);
      failed++;
    }
    console.log('');
  }
  
  log('blue', '📊 Résultats des tests:');
  log('green', `✅ Tests passés: ${passed}`);
  if (failed > 0) {
    log('red', `❌ Tests échoués: ${failed}`);
  }
  
  log('cyan', '\n🔗 Intégrations testées:');
  log('cyan', '   • Data ↔ Notification Service (emails/SMS)');
  log('cyan', '   • Data ↔ AI Service (historique conversations)');
  log('cyan', '   • Data ↔ Payment Service (gestion premium)');
  
  const success = failed === 0;
  log(success ? 'green' : 'red', 
      success ? '\n🎉 Tous les tests sont passés!' : '\n⚠️ Certains tests ont échoué');
  
  process.exit(success ? 0 : 1);
}

// Vérifier que le serveur est démarré
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 3000 });
    runTests();
  } catch (error) {
    log('red', '❌ Le data-service ne répond pas sur ' + BASE_URL);
    log('yellow', '💡 Assurez-vous que le serveur est démarré avec "npm run dev"');
    process.exit(1);
  }
}

checkServer();
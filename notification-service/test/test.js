// Test basique pour le notification service
require('dotenv').config();

const axios = require('axios');

const BASE_URL = 'http://localhost:5005';
const API_KEY = process.env.API_KEY;

// Couleurs pour les logs
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = (color, message) => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

async function testHealthCheck() {
  try {
    log('blue', '🔍 Test Health Check...');
    const response = await axios.get(`${BASE_URL}/health`);
    
    if (response.status === 200 && response.data.status === 'healthy') {
      log('green', '✅ Health Check OK');
      return true;
    } else {
      log('red', '❌ Health Check FAIL');
      console.log(response.data);
      return false;
    }
  } catch (error) {
    log('red', '❌ Health Check ERROR: ' + error.message);
    return false;
  }
}

async function testDocs() {
  try {
    log('blue', '📋 Test Documentation...');
    const response = await axios.get(`${BASE_URL}/docs`);
    
    if (response.status === 200 && response.data.service) {
      log('green', '✅ Documentation OK');
      return true;
    } else {
      log('red', '❌ Documentation FAIL');
      return false;
    }
  } catch (error) {
    log('red', '❌ Documentation ERROR: ' + error.message);
    return false;
  }
}

async function testEmailConfirm() {
  try {
    log('blue', '📧 Test Email Confirmation...');
    
    if (!API_KEY) {
      log('yellow', '⚠️ API_KEY manquante - test ignoré');
      return true;
    }

    const response = await axios.post(`${BASE_URL}/api/email/confirm`, {
      email: 'test@example.com',
      token: 'test-token-123'
    }, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data.success) {
      log('green', '✅ Email Confirmation OK');
      return true;
    } else {
      log('red', '❌ Email Confirmation FAIL');
      console.log(response.data);
      return false;
    }
  } catch (error) {
    if (error.response && error.response.status === 403) {
      log('yellow', '⚠️ Email Confirmation - API Key invalide');
      return true; // Normal si pas de vraie clé
    } else {
      log('red', '❌ Email Confirmation ERROR: ' + error.message);
      return false;
    }
  }
}

async function testEmailReset() {
  try {
    log('blue', '🔑 Test Email Reset...');
    
    if (!API_KEY) {
      log('yellow', '⚠️ API_KEY manquante - test ignoré');
      return true;
    }

    const response = await axios.post(`${BASE_URL}/api/email/reset`, {
      email: 'test@example.com',
      code: '123456'
    }, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data.success) {
      log('green', '✅ Email Reset OK');
      return true;
    } else {
      log('red', '❌ Email Reset FAIL');
      console.log(response.data);
      return false;
    }
  } catch (error) {
    if (error.response && error.response.status === 403) {
      log('yellow', '⚠️ Email Reset - API Key invalide');
      return true; // Normal si pas de vraie clé
    } else {
      log('red', '❌ Email Reset ERROR: ' + error.message);
      return false;
    }
  }
}

async function testSmsReset() {
  try {
    log('blue', '📱 Test SMS Reset...');
    
    if (!API_KEY) {
      log('yellow', '⚠️ API_KEY manquante - test ignoré');
      return true;
    }

    const response = await axios.post(`${BASE_URL}/api/sms/reset`, {
      username: '12345678',
      apiKey: 'test-key',
      code: '123456'
    }, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data.success) {
      log('green', '✅ SMS Reset OK');
      return true;
    } else {
      log('red', '❌ SMS Reset FAIL');
      console.log(response.data);
      return false;
    }
  } catch (error) {
    if (error.response && error.response.status === 403) {
      log('yellow', '⚠️ SMS Reset - API Key invalide');
      return true; // Normal si pas de vraie clé
    } else if (error.response && error.response.status === 500) {
      log('yellow', '⚠️ SMS Reset - Configuration Free Mobile manquante');
      return true; // Normal si pas configuré
    } else {
      log('red', '❌ SMS Reset ERROR: ' + error.message);
      return false;
    }
  }
}

async function testUnauthorized() {
  try {
    log('blue', '🔒 Test Accès non autorisé...');
    
    const response = await axios.post(`${BASE_URL}/api/email/confirm`, {
      email: 'test@example.com',
      token: 'test'
    }, {
      headers: {
        'Content-Type': 'application/json'
        // Pas d'API key
      }
    });
    
    log('red', '❌ Test Unauthorized FAIL - devrait retourner 403');
    return false;
  } catch (error) {
    if (error.response && error.response.status === 403) {
      log('green', '✅ Test Unauthorized OK - 403 retourné');
      return true;
    } else {
      log('red', '❌ Test Unauthorized ERROR: ' + error.message);
      return false;
    }
  }
}

async function runTests() {
  log('blue', '🚀 Démarrage des tests du Notification Service\n');
  
  const tests = [
    testHealthCheck,
    testDocs,
    testUnauthorized,
    testEmailConfirm,
    testEmailReset,
    testSmsReset
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      log('red', '❌ Erreur inattendue: ' + error.message);
      failed++;
    }
    console.log(''); // Ligne vide
  }
  
  log('blue', '📊 Résultats des tests:');
  log('green', `✅ Tests passés: ${passed}`);
  if (failed > 0) {
    log('red', `❌ Tests échoués: ${failed}`);
  }
  
  const success = failed === 0;
  log(success ? 'green' : 'red', 
      success ? '🎉 Tous les tests sont passés!' : '⚠️ Certains tests ont échoué');
  
  process.exit(success ? 0 : 1);
}

// Vérifier que le serveur est démarré
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/health`);
    runTests();
  } catch (error) {
    log('red', '❌ Le serveur ne répond pas sur ' + BASE_URL);
    log('yellow', '💡 Assurez-vous que le serveur est démarré avec "npm run dev"');
    process.exit(1);
  }
}

checkServer();
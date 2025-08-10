// fix-index.js - Créez ce fichier dans votre dossier backend
require('dotenv').config();
const mongoose = require('mongoose');

async function fixPhoneNumberIndex() {
  try {
    console.log('🔄 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
    console.log('✅ Connecté à MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('users');

    // 1. Lister les index existants
    console.log('\n📋 Index existants:');
    const existingIndexes = await collection.indexes();
    existingIndexes.forEach(index => {
      console.log(`  - ${index.name}:`, index.key);
    });

    // 2. Supprimer l'ancien index phoneNumber
    console.log('\n🗑️ Suppression de l\'ancien index phoneNumber...');
    try {
      await collection.dropIndex('phoneNumber_1');
      console.log('✅ Index phoneNumber_1 supprimé');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️ Index phoneNumber_1 n\'existait pas');
      } else {
        console.error('❌ Erreur suppression index:', error.message);
      }
    }

    // 3. Créer le nouvel index avec sparse: true
    console.log('\n🔧 Création du nouvel index phoneNumber (sparse: true)...');
    await collection.createIndex(
      { phoneNumber: 1 }, 
      { 
        unique: true, 
        sparse: true,
        name: 'phoneNumber_1_sparse'
      }
    );
    console.log('✅ Nouvel index phoneNumber créé avec sparse: true');

    // 4. Vérifier les nouveaux index
    console.log('\n📋 Index après correction:');
    const newIndexes = await collection.indexes();
    newIndexes.forEach(index => {
      console.log(`  - ${index.name}:`, index.key, index.sparse ? '(sparse)' : '');
    });

    // 5. Tester avec des données
    console.log('\n🧪 Tests:');
    const totalUsers = await collection.countDocuments({});
    const nullPhoneUsers = await collection.countDocuments({ phoneNumber: null });
    const undefinedPhoneUsers = await collection.countDocuments({ phoneNumber: { $exists: false } });
    
    console.log(`  - Total utilisateurs: ${totalUsers}`);
    console.log(`  - Utilisateurs phoneNumber null: ${nullPhoneUsers}`);
    console.log(`  - Utilisateurs sans phoneNumber: ${undefinedPhoneUsers}`);

    // 6. Nettoyer les phoneNumber null → undefined pour éviter les conflits futurs
    console.log('\n🧹 Nettoyage des phoneNumber null...');
    const updateResult = await collection.updateMany(
      { phoneNumber: null },
      { $unset: { phoneNumber: "" } }
    );
    console.log(`✅ ${updateResult.modifiedCount} utilisateurs nettoyés (phoneNumber null → undefined)`);

    console.log('\n🎉 Correction terminée avec succès !');
    console.log('\n💡 Vous pouvez maintenant modifier votre profil sans erreur.');

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erreur lors de la correction:', error);
    process.exit(1);
  }
}

console.log('🚀 Démarrage de la correction d\'index MongoDB...');
fixPhoneNumberIndex();
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import * as fs from 'fs';
import * as path from 'path';

async function ensureUploadDirectories() {
  console.log('🗂️  Vérification des dossiers d\'upload...');
  
  const directories = [
    'uploads',
    'uploads/profiles',
  ];

  for (const dir of directories) {
    const dirPath = path.join(process.cwd(), dir);
    
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ Dossier créé: ${dirPath}`);
    } else {
      console.log(`✅ Dossier existe: ${dirPath}`);
    }
  }

  // Créer un fichier .gitkeep pour préserver les dossiers dans git
  const gitkeepPath = path.join(process.cwd(), 'uploads/profiles/.gitkeep');
  if (!fs.existsSync(gitkeepPath)) {
    fs.writeFileSync(gitkeepPath, '# Ce fichier permet de préserver ce dossier dans git\n');
    console.log('✅ Fichier .gitkeep créé dans uploads/profiles/');
  }

  console.log('🎉 Dossiers d\'upload configurés avec succès!');
}

if (require.main === module) {
  ensureUploadDirectories()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Erreur lors de la configuration des dossiers:', error);
      process.exit(1);
    });
}

export { ensureUploadDirectories };
// Polyfill pour Node.js 18
import './polyfills';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Configuration CORS pour permettre les requêtes depuis le frontend (AVANT les autres middleware)
  app.enableCors({
    origin: ['http://localhost:4200', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'x-user-id', // Header personnalisé pour l'ID utilisateur
    ],
  });

  // Configuration pour servir les fichiers statiques (AVANT le préfixe global)
  app.useStaticAssets(join(process.cwd(), 'assets'), {
    prefix: '/assets/',
  });

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Configuration spécifique pour les dossiers d'autorisations et bons de commande
  app.useStaticAssets(join(process.cwd(), 'uploads', 'autorisations'), {
    prefix: '/uploads/autorisations/',
  });

  app.useStaticAssets(join(process.cwd(), 'uploads', 'bons-de-commande'), {
    prefix: '/uploads/bons-de-commande/',
  });

  // Ajout d'un log pour déboguer le chemin des uploads
  console.log('📁 Chemin uploads:', join(process.cwd(), 'uploads'));
  console.log('📁 Chemin assets:', join(process.cwd(), 'assets'));
  console.log('📁 Chemin autorisations:', join(process.cwd(), 'uploads', 'autorisations'));
  console.log('📁 Chemin bons-de-commande:', join(process.cwd(), 'uploads', 'bons-de-commande'));

  // Middleware pour les cookies
  app.use(cookieParser());

  // Filtre global pour la gestion des erreurs
  app.useGlobalFilters(new AllExceptionsFilter());

  // Validation globale des DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Préfixe global pour toutes les routes API (APRÈS les fichiers statiques)
  // Exclure les routes statiques du préfixe global
  app.setGlobalPrefix('api', {
    exclude: ['/uploads/(.*)', '/uploads/autorisations/(.*)', '/uploads/bons-de-commande/(.*)', '/assets/(.*)']
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Serveur Velosi ERP démarré sur le port ${port}`);
  console.log(`📖 API disponible sur: http://localhost:${port}/api`);
  console.log(`🔐 Authentification: http://localhost:${port}/api/auth`);
}
bootstrap();

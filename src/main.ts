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
    ],
  });

  // Configuration pour servir les fichiers statiques (AVANT le préfixe global)
  app.useStaticAssets(join(__dirname, '..', 'assets'), {
    prefix: '/assets/',
  });

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Ajout d'un log pour déboguer le chemin des uploads
  console.log('📁 Chemin uploads:', join(__dirname, '..', 'uploads'));
  console.log('📁 Chemin assets:', join(__dirname, '..', 'assets'));

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
    exclude: ['/uploads/(.*)', '/assets/(.*)']
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Serveur Velosi ERP démarré sur le port ${port}`);
  console.log(`📖 API disponible sur: http://localhost:${port}/api`);
  console.log(`🔐 Authentification: http://localhost:${port}/api/auth`);
}
bootstrap();

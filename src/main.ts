// Polyfill pour Node.js 18
import './polyfills';

import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { MultiTenantInterceptor } from './common/multi-tenant.interceptor';

async function bootstrap() {
  console.log('========================================');
  console.log('🚀 Démarrage de l\'application Velosi ERP');
  console.log('========================================');
  console.log('');
  
  // Afficher quel fichier d'environnement est utilisé
  const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
  const mode = process.env.NODE_ENV === 'production' ? '☁️ PRODUCTION' : '🏠 DÉVELOPPEMENT';
  
  console.log('📋 Configuration :');
  console.log(`  - Mode          : ${mode}`);
  console.log(`  - NODE_ENV      : ${process.env.NODE_ENV || 'development'}`);
  console.log(`  - Fichier .env  : ${envFile}`);
  console.log('');
  
  console.log('🔐 Keycloak :');
  console.log(`  - URL           : ${process.env.KEYCLOAK_URL || 'non défini'}`);
  console.log(`  - Realm         : ${process.env.KEYCLOAK_REALM || 'non défini'}`);
  console.log(`  - Client ID     : ${process.env.KEYCLOAK_CLIENT_ID || 'non défini'}`);
  console.log('');
  
  console.log('🗄️ Base de données :');
  console.log(`  - Host          : ${process.env.DB_ADDR || 'non défini'}`);
  console.log(`  - Port          : ${process.env.DB_PORT || 'non défini'}`);
  console.log(`  - Database      : ${process.env.DB_DATABASE || 'non défini'}`);
  console.log('');
  
  console.log('🌐 Frontend :');
  console.log(`  - URL           : ${process.env.FRONTEND_URL || 'http://localhost:4200'}`);
  console.log('');
  
  console.log('⚙️ Serveur :');
  console.log(`  - Port          : ${process.env.PORT || 3000}`);
  console.log('');
  
  // 🔧 FIX: Désactiver le body parser par défaut pour le gérer manuellement
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false, // Désactiver pour le configurer manuellement
  });

  // 🔧 Middleware pour les cookies (AVANT tout)
  app.use(cookieParser());

  // 🔧 Middleware de détection et bypass pour les requêtes multipart
  app.use((req: any, res: any, next: any) => {
    const contentType = req.headers['content-type'] || '';
    const url = req.url || '';
    
    console.log('🔍 [Middleware] Content-Type:', contentType);
    console.log('🔍 [Middleware] URL:', url);
    
    // Marquer les requêtes multipart pour bypass du JSON parser
    // Vérifier AUSSI l'URL pour les endpoints d'upload connus
    const isMultipartByContentType = contentType.includes('multipart/form-data');
    const isUploadEndpoint = url.includes('/upload-logo') || 
                            url.includes('/upload-profile-image') || 
                            url.includes('/complete-setup');
    
    if (isMultipartByContentType || isUploadEndpoint) {
      console.log('🔧 [Bypass] Requête multipart/upload détectée:', req.method, req.url);
      req.isMultipart = true;
      return next();
    }
    
    console.log('🔍 [Middleware] Pas de multipart, continuer normalement');
    next();
  });

  // 🔧 Middleware conditionnel pour parser le JSON body
  app.use((req: any, res: any, next: any) => {
    console.log('🔍 [JSON Parser] Vérification req.isMultipart:', req.isMultipart);
    
    // Si marqué comme multipart, skip totalement
    if (req.isMultipart) {
      console.log('🔧 [Skip JSON] Multipart bypass activé pour:', req.url);
      return next();
    }
    
    console.log('🔍 [JSON Parser] Parsing JSON pour:', req.url);
    // Sinon, parser le JSON normalement
    return express.json({ limit: '50mb' })(req, res, next);
  });

  // Middleware pour parser les données URL-encoded (sauf multipart)
  app.use((req: any, res: any, next: any) => {
    if (req.isMultipart) {
      return next();
    }
    return express.urlencoded({ extended: true, limit: '50mb' })(req, res, next);
  });

  // Configuration CORS pour permettre les requêtes depuis le frontend (AVANT les autres middleware)
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:4200', 'http://localhost:3000'];
  
  console.log('🔒 CORS - Origines autorisées :');
  console.log('   - Depuis .env:', allowedOrigins);
  
  app.enableCors({
    origin: [
      ...allowedOrigins,
      'http://localhost:4200',  // Frontend Angular LOCAL (toujours autorisé)
      'http://localhost:3000',  // Tests LOCAL (toujours autorisé)
      'https://localhost:4200',  // Frontend Angular LOCAL avec SSL
      'https://192.168.1.72:4200',  // Frontend Angular réseau local avec SSL (pour tests mobiles)
      'http://192.168.1.72:4200',  // Frontend Angular réseau local HTTP (pour tests mobiles)
      'https://wyselogiquote.com',  // Frontend Angular PRODUCTION (domaine principal)
      'https://www.wyselogiquote.com',  // Frontend Angular PRODUCTION (avec www)
      'https://vps-3b4fd3be.vps.ovh.ca:443',  // Frontend Angular VPS OVH (HTTPS port 443 explicite)
      'https://vps-3b4fd3be.vps.ovh.ca',  // Frontend Angular VPS OVH (HTTPS sans port)
      'http://vps-3b4fd3be.vps.ovh.ca:4200',  // Frontend Angular VPS OVH (HTTP port 4200)
      'http://vps-3b4fd3be.vps.ovh.ca:8080',  // Frontend Angular VPS OVH (HTTP port 8080)
      'https://velosi-front.vercel.app',  // ✅ Frontend Vercel PRODUCTION
      'https://velosi-front-git-main-mahdi945s-projects.vercel.app',  // ✅ Vercel Preview (branch main)
    ],
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
  
  console.log('✅ CORS configuré avec succès');
  console.log('');

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

  // Configuration pour les pièces jointes des activités CRM
  app.useStaticAssets(join(process.cwd(), 'uploads', 'activites'), {
    prefix: '/uploads/activites/',
  });

  // Configuration pour les logos des armateurs
  app.useStaticAssets(join(process.cwd(), 'uploads', 'logos_armateurs'), {
    prefix: '/uploads/logos_armateurs/',
  });

  // Configuration pour les logos des fournisseurs
  app.useStaticAssets(join(process.cwd(), 'uploads', 'logos_fournisseurs'), {
    prefix: '/uploads/logos_fournisseurs/',
  });

  // Configuration pour les logos des correspondants
  app.useStaticAssets(join(process.cwd(), 'uploads', 'correspondants-logo'), {
    prefix: '/uploads/correspondants-logo/',
  });

  // Configuration pour les logos des organisations (admin MSP)
  app.useStaticAssets(join(process.cwd(), 'uploads', 'logos'), {
    prefix: '/uploads/logos/',
  });

  // Ajout d'un log pour déboguer le chemin des uploads
  console.log('📁 Chemin uploads:', join(process.cwd(), 'uploads'));
  console.log('📁 Chemin assets:', join(process.cwd(), 'assets'));
  console.log('📁 Chemin autorisations:', join(process.cwd(), 'uploads', 'autorisations'));
  console.log('📁 Chemin bons-de-commande:', join(process.cwd(), 'uploads', 'bons-de-commande'));
  console.log('📁 Chemin activites:', join(process.cwd(), 'uploads', 'activites'));
  console.log('📁 Chemin logos_armateurs:', join(process.cwd(), 'uploads', 'logos_armateurs'));
  console.log('📁 Chemin logos_fournisseurs:', join(process.cwd(), 'uploads', 'logos_fournisseurs'));
  console.log('📁 Chemin correspondants-logo:', join(process.cwd(), 'uploads', 'correspondants-logo'));
  console.log('📁 Chemin logos organisations:', join(process.cwd(), 'uploads', 'logos'));

  // Filtre global pour la gestion des erreurs
  app.useGlobalFilters(new AllExceptionsFilter());

  // ✅ INTERCEPTEUR GLOBAL MULTI-TENANT
  // S'applique automatiquement à TOUTES les requêtes pour injecter les infos d'organisation
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new MultiTenantInterceptor(reflector));
  console.log('🏢 Intercepteur Multi-Tenant activé globalement');
  console.log('');

  // Validation globale des DTOs (avec exception pour les uploads)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
        excludeExtraneousValues: false,
      },
      // 🔧 FIX: Ne pas valider si le body est vide (cas des multipart)
      skipMissingProperties: true,
      skipNullProperties: false,
      skipUndefinedProperties: false,
    }),
  );

  // Préfixe global pour toutes les routes API (APRÈS les fichiers statiques)
  // Exclure les routes statiques du préfixe global
  app.setGlobalPrefix('api', {
    exclude: ['/uploads/(.*)', '/uploads/autorisations/(.*)', '/uploads/bons-de-commande/(.*)', '/uploads/activites/(.*)', '/uploads/logos_armateurs/(.*)', '/uploads/logos_fournisseurs/(.*)', '/uploads/correspondants-logo/(.*)', '/uploads/logos/(.*)', '/assets/(.*)']
  });

  const port = process.env.PORT || 3000;
  
  // Important: écouter sur 0.0.0.0 pour Render (pas localhost)
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Serveur Velosi ERP démarré sur le port ${port}`);
  console.log(`📖 API disponible sur: http://0.0.0.0:${port}/api`);
  console.log(`🔐 Authentification: http://0.0.0.0:${port}/api/auth`);
}
bootstrap();

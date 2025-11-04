import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { ConfigService } from '@nestjs/config';
import { createCloudinaryStorage } from './cloudinary.config';
import { BadRequestException } from '@nestjs/common';

/**
 * Factory pour créer le storage adapté selon l'environnement
 * - Localhost: diskStorage (uploads/)
 * - Production/Railway: Cloudinary
 */
export const createProfileImageStorage = (configService: ConfigService) => {
  // Vérifier si Cloudinary est configuré
  const hasCloudinary = 
    configService.get('CLOUDINARY_CLOUD_NAME') && 
    configService.get('CLOUDINARY_API_KEY') && 
    configService.get('CLOUDINARY_API_SECRET');

  if (hasCloudinary) {
    console.log('☁️ [Storage] Utilisation de Cloudinary pour les images de profil');
    return createCloudinaryStorage(configService);
  } else {
    console.log('💾 [Storage] Utilisation du stockage local (diskStorage) pour les images de profil');
    
    // Créer le dossier uploads/profiles s'il n'existe pas
    const uploadPath = './uploads/profiles';
    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
      console.log(`📁 [Storage] Dossier créé: ${uploadPath}`);
    }

    return diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadPath);
      },
      filename: (req: any, file, cb) => {
        // Format: user-{userId}-{timestamp}.{extension}
        // req.user peut ne pas être disponible dans le callback Multer
        const userId = (req as any).user?.id || 'unknown';
        const timestamp = Date.now();
        const extension = file.originalname.split('.').pop();
        const filename = `user-${userId}-${timestamp}.${extension}`;
        cb(null, filename);
      },
    });
  }
};

/**
 * Filtre pour valider les fichiers image
 */
export const imageFileFilter = (req: any, file: Express.Multer.File, callback: any) => {
  // Vérifier le type MIME
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedMimes.includes(file.mimetype)) {
    return callback(
      new BadRequestException('Type de fichier non supporté. Utilisez JPG, PNG, WEBP ou GIF.'),
      false
    );
  }

  // Vérifier l'extension
  const allowedExtensions = /jpeg|jpg|png|webp|gif/;
  const extname = allowedExtensions.test(file.originalname.toLowerCase());
  
  if (!extname) {
    return callback(
      new BadRequestException('Extension de fichier invalide.'),
      false
    );
  }

  callback(null, true);
};

/**
 * Obtenir le chemin ou l'URL du fichier selon le storage utilisé
 */
export const getFilePath = (file: Express.Multer.File, configService: ConfigService): string => {
  const hasCloudinary = 
    configService.get('CLOUDINARY_CLOUD_NAME') && 
    configService.get('CLOUDINARY_API_KEY') && 
    configService.get('CLOUDINARY_API_SECRET');

  if (hasCloudinary) {
    // Cloudinary retourne l'URL complète dans file.path
    console.log('☁️ [Storage] Image uploadée sur Cloudinary:', file.path);
    return file.path;
  } else {
    // DiskStorage retourne le chemin relatif
    const relativePath = `uploads/profiles/${file.filename}`;
    console.log('💾 [Storage] Image uploadée localement:', relativePath);
    return relativePath;
  }
};

export default {
  createProfileImageStorage,
  imageFileFilter,
  getFilePath,
};

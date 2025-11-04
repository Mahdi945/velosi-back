import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { ConfigService } from '@nestjs/config';

/**
 * Configuration Cloudinary pour le stockage des images
 * Utilise les variables d'environnement:
 * - CLOUDINARY_CLOUD_NAME
 * - CLOUDINARY_API_KEY
 * - CLOUDINARY_API_SECRET
 */
export const configureCloudinary = (configService: ConfigService) => {
  const cloudName = configService.get('CLOUDINARY_CLOUD_NAME');
  const apiKey = configService.get('CLOUDINARY_API_KEY');
  const apiSecret = configService.get('CLOUDINARY_API_SECRET');

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn('⚠️ [Cloudinary] Variables d\'environnement manquantes - Utilisation du stockage local (diskStorage)');
    console.warn('📝 Pour activer Cloudinary, définir: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
    return null;
  }

  console.log('☁️ [Cloudinary] Configuration avec cloud:', cloudName);
  
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true, // Utiliser HTTPS
  });

  return cloudinary;
};

/**
 * Storage Cloudinary pour Multer
 * Les images de profil seront uploadées dans le dossier "velosi/profiles"
 */
export const createCloudinaryStorage = (configService: ConfigService): CloudinaryStorage | null => {
  const cloudinaryInstance = configureCloudinary(configService);
  
  if (!cloudinaryInstance) {
    return null;
  }

  return new CloudinaryStorage({
    cloudinary: cloudinaryInstance,
    params: async (req, file) => {
      return {
        folder: 'velosi/profiles', // Dossier dans Cloudinary
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        public_id: `user-${Date.now()}`, // Nom unique basé sur timestamp
        transformation: [
          { 
            width: 800, 
            height: 800, 
            crop: 'limit', // Ne pas agrandir, seulement réduire si nécessaire
            quality: 'auto', // Optimisation automatique
            fetch_format: 'auto' // Format optimal selon le navigateur
          }
        ],
      };
    },
  });
};

/**
 * Supprimer une image de Cloudinary par son URL publique
 */
export const deleteCloudinaryImage = async (imageUrl: string, configService: ConfigService): Promise<boolean> => {
  try {
    const cloudinaryInstance = configureCloudinary(configService);
    
    if (!cloudinaryInstance) {
      console.log('⚠️ [Cloudinary] Pas configuré - Impossible de supprimer l\'image');
      return false;
    }

    // Extraire le public_id de l'URL Cloudinary
    // Ex: https://res.cloudinary.com/cloud-name/image/upload/v1234/velosi/profiles/user-123.jpg
    // Public ID: velosi/profiles/user-123
    const urlParts = imageUrl.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    
    if (uploadIndex === -1) {
      console.error('❌ [Cloudinary] URL invalide:', imageUrl);
      return false;
    }

    // Extraire le public_id (tout après "upload/v{version}/")
    const publicIdWithExtension = urlParts.slice(uploadIndex + 2).join('/');
    const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, ''); // Enlever l'extension

    console.log('🗑️ [Cloudinary] Suppression de l\'image:', publicId);
    
    const result = await cloudinaryInstance.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      console.log('✅ [Cloudinary] Image supprimée avec succès');
      return true;
    } else {
      console.warn('⚠️ [Cloudinary] Échec de suppression:', result);
      return false;
    }
  } catch (error) {
    console.error('❌ [Cloudinary] Erreur lors de la suppression:', error.message);
    return false;
  }
};

/**
 * Obtenir l'URL optimisée d'une image Cloudinary
 */
export const getOptimizedImageUrl = (imageUrl: string, width?: number, height?: number): string => {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
    return imageUrl; // Ce n'est pas une URL Cloudinary
  }

  // Si des dimensions sont spécifiées, les ajouter à l'URL
  if (width || height) {
    const transformations = [];
    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
    transformations.push('c_fill', 'q_auto', 'f_auto');
    
    const transformationString = transformations.join(',');
    
    // Insérer les transformations dans l'URL
    return imageUrl.replace('/upload/', `/upload/${transformationString}/`);
  }

  return imageUrl;
};

export default {
  configureCloudinary,
  createCloudinaryStorage,
  deleteCloudinaryImage,
  getOptimizedImageUrl,
};

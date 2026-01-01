import { diskStorage } from 'multer';
import { extname } from 'path';
import { Request } from 'express';

// Types de fichiers autorisés
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
];

// Extensions autorisées
const ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.csv',
  '.zip',
  '.rar',
  '.7z',
];

// Taille maximale par fichier : 10MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB en bytes

// Nombre maximum de fichiers
export const MAX_FILES_COUNT = 10;

// Filtre de validation des fichiers
export const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  const ext = extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return callback(
      new Error(
        `Extension de fichier non autorisée: ${ext}. Extensions autorisées: ${ALLOWED_EXTENSIONS.join(', ')}`,
      ),
      false,
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return callback(
      new Error(
        `Type MIME non autorisé: ${mimeType}. Types autorisés: images, PDF, documents Office, archives`,
      ),
      false,
    );
  }

  callback(null, true);
};

// Configuration du stockage
export const activityStorage = diskStorage({
  destination: (req, file, callback) => {
    // Le dossier sera créé dynamiquement dans le controller
    // car on a besoin de l'ID de l'activité
    callback(null, './uploads/activites/temp');
  },
  filename: (req, file, callback) => {
    // Générer un nom unique pour éviter les conflits
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    const baseName = file.originalname
      .replace(ext, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);
    callback(null, `${baseName}-${uniqueSuffix}${ext}`);
  },
});

// Validation de la taille totale
export const validateTotalSize = (files: Express.Multer.File[]): void => {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const maxTotalSize = MAX_FILE_SIZE * MAX_FILES_COUNT; // 100MB max au total

  if (totalSize > maxTotalSize) {
    throw new Error(
      `Taille totale des fichiers trop grande: ${(totalSize / 1024 / 1024).toFixed(2)}MB. Maximum autorisé: ${(maxTotalSize / 1024 / 1024).toFixed(2)}MB`,
    );
  }
};

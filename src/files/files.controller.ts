import { Controller, Get, Param, Res, NotFoundException, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { join, extname } from 'path';
import * as fs from 'fs';

@Controller('files')
export class FilesController {
  
  /**
   * Route publique pour servir les images de profil
   * GET /api/files/profile/:filename
   */
  @Get('profile/:filename')
  async getProfileImage(@Param('filename') filename: string, @Res() res: Response) {
    try {
      // Sécurité: vérifier que le nom de fichier ne contient pas de caractères dangereux
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        throw new BadRequestException('Nom de fichier invalide');
      }

      // Construire le chemin vers le fichier
      const filePath = join(process.cwd(), 'uploads', 'profiles', filename);
      
      // Vérifier que le fichier existe
      if (!fs.existsSync(filePath)) {
        throw new NotFoundException('Image de profil introuvable');
      }

      // Déterminer le type MIME basé sur l'extension
      const ext = extname(filename).toLowerCase();
      let contentType = 'image/jpeg'; // par défaut
      
      switch (ext) {
        case '.png':
          contentType = 'image/png';
          break;
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg';
          break;
        case '.webp':
          contentType = 'image/webp';
          break;
        case '.gif':
          contentType = 'image/gif';
          break;
      }

      // Configurer les headers de cache et CORS
      res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache d'un an
        'ETag': filename,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      });

      // Envoyer le fichier
      return res.sendFile(filePath);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Erreur lors de la récupération de l'image: ${error.message}`);
    }
  }
}
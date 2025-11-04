import { Controller, Get, Param, Res, NotFoundException, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { join, extname } from 'path';
import * as fs from 'fs';
import { Personnel } from '../entities/personnel.entity';
import { Client } from '../entities/client.entity';

/**
 * Contrôleur pour servir les fichiers (images de profil, etc.)
 * 
 * Ce contrôleur gère l'accès aux fichiers uploadés :
 * - En production : redirige vers Cloudinary
 * - En développement : sert les fichiers locaux
 */
@Controller('files')
export class FilesController {
  constructor(
    private configService: ConfigService,
    @InjectRepository(Personnel)
    private personnelRepository: Repository<Personnel>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
  ) {}
  
  /**
   * Route publique pour servir les images de profil
   * GET /api/files/profile/:filename
   * 
   * En production :
   * - Si l'utilisateur a une URL Cloudinary dans la BDD, redirige vers Cloudinary
   * - Sinon, renvoie une erreur 404
   * 
   * En développement :
   * - Sert le fichier depuis le dossier uploads/profiles
   */
  @Get('profile/:filename')
  async getProfileImage(@Param('filename') filename: string, @Res() res: Response) {
    try {
      console.log('🖼️ [Files] Récupération image de profil:', filename);

      // Sécurité: vérifier que le nom de fichier ne contient pas de caractères dangereux
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        throw new BadRequestException('Nom de fichier invalide');
      }

      // Vérifier si Cloudinary est configuré (= production)
      const hasCloudinary =
        this.configService.get('CLOUDINARY_CLOUD_NAME') &&
        this.configService.get('CLOUDINARY_API_KEY') &&
        this.configService.get('CLOUDINARY_API_SECRET');

      if (hasCloudinary) {
        console.log('☁️ [Files] Mode production - Recherche URL Cloudinary dans la BDD');

        // Extraire l'ID utilisateur depuis le nom de fichier (format: user-{id}-{timestamp}.ext)
        const userIdMatch = filename.match(/^user-(\d+)-/);
        if (!userIdMatch) {
          console.warn('⚠️ [Files] Format de nom de fichier invalide:', filename);
          throw new NotFoundException('Image de profil introuvable');
        }

        const userId = parseInt(userIdMatch[1], 10);
        console.log('🔍 [Files] ID utilisateur extrait:', userId);

        // Rechercher l'utilisateur dans Personnel ou Client
        let photoUrl: string | null = null;
        
        const personnel = await this.personnelRepository.findOne({
          where: { id: userId },
        });
        
        if (personnel && personnel.photo) {
          photoUrl = personnel.photo;
          console.log('👤 [Files] Photo trouvée dans Personnel:', photoUrl);
        } else {
          const client = await this.clientRepository.findOne({
            where: { id: userId },
          });
          
          if (client && client.photo) {
            photoUrl = client.photo;
            console.log('👤 [Files] Photo trouvée dans Client:', photoUrl);
          }
        }

        // Si on a trouvé une URL Cloudinary, rediriger vers celle-ci
        if (photoUrl && (photoUrl.startsWith('http://') || photoUrl.startsWith('https://'))) {
          console.log('✅ [Files] Redirection vers Cloudinary:', photoUrl);
          return res.redirect(photoUrl);
        }

        // Si pas d'URL Cloudinary trouvée, retourner 404
        console.warn('⚠️ [Files] Aucune URL Cloudinary trouvée pour l\'utilisateur:', userId);
        throw new NotFoundException('Image de profil introuvable');
      } else {
        // Mode développement - servir le fichier local
        console.log('💾 [Files] Mode développement - Service fichier local');

        const filePath = join(process.cwd(), 'uploads', 'profiles', filename);
        console.log('📁 [Files] Chemin fichier:', filePath);

        // Vérifier que le fichier existe
        if (!fs.existsSync(filePath)) {
          console.warn('⚠️ [Files] Fichier introuvable:', filePath);
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

        console.log('✅ [Files] Envoi du fichier local');
        return res.sendFile(filePath);
      }
    } catch (error) {
      console.error('❌ [Files] Erreur:', error);
      
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Erreur lors de la récupération de l'image: ${error.message}`);
    }
  }
}
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Fournisseur } from '../entities/fournisseur.entity';
import { FournisseursService } from '../services/fournisseurs.service';
import { FournisseursController } from '../controllers/fournisseurs.controller';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';

// Créer le dossier uploads/logos_fournisseurs s'il n'existe pas
const uploadPath = './uploads/logos_fournisseurs';
if (!existsSync(uploadPath)) {
  mkdirSync(uploadPath, { recursive: true });
}

@Module({
  imports: [
    TypeOrmModule.forFeature([Fournisseur]),
    MulterModule.register({
      storage: diskStorage({
        destination: uploadPath,
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `fournisseur-${uniqueSuffix}-${file.originalname}`);
        },
      }),
    }),
  ],
  controllers: [FournisseursController],
  providers: [FournisseursService],
  exports: [FournisseursService],
})
export class FournisseursModule {}

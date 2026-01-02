import { IsString, IsOptional, IsDateString, IsEnum, IsBoolean, IsNumber, IsPositive, Length, IsNotEmpty, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

// DEPRECATED: Utilisez CreateBonCommandeDto dans tva-complete.dto.ts
// Ce DTO est maintenu temporairement pour la compatibilité
export class CreateBCsusTVADto {
  @IsNotEmpty()
  @IsNumber()
  autorisationId: number;

  @IsString()
  @Length(1, 50)
  @IsNotEmpty()
  numeroBonCommande: string;

  @IsNotEmpty()
  @IsDateString()
  dateBonCommande: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  montantBonCommande: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['ACTIF', 'EXPIRE', 'SUSPENDU', 'ANNULE'])
  statut?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateBCsusTVADto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  numeroBonCommande?: string;

  @IsOptional()
  @IsDateString()
  dateBonCommande?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  montantBonCommande?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['ACTIF', 'EXPIRE', 'SUSPENDU', 'ANNULE'])
  statut?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  imagePath?: string;
}

export class BCsusTVAResponseDto {
  id: number;
  autorisationId: number;
  numeroBonCommande: string;
  dateBonCommande: Date;
  montantBonCommande: number;
  description?: string;
  imagePath?: string;
  statut: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  statusText: string;
  isValid: boolean;
  isExpired: boolean;
  numeroAutorisationFromRelation?: string;
}

export class UploadImageTVADto {
  @IsString()
  @IsNotEmpty()
  entityType: 'autorisation' | 'suspension';

  @IsString()
  @IsNotEmpty()
  entityId: string;
}
import { IsString, IsOptional, IsDateString, IsBoolean, IsNumber, IsNotEmpty, Length } from 'class-validator';

// ===============================
// DTOs pour AutorisationsTVA
// ===============================

export class CreateAutorisationTVADto {
  @IsNotEmpty()
  @IsNumber()
  clientId: number;

  @IsString()
  @Length(1, 50)
  @IsNotEmpty()
  numeroAutorisation: string;

  @IsOptional()
  @IsDateString()
  dateDebutValidite?: string;

  @IsOptional()
  @IsDateString()
  dateFinValidite?: string;

  @IsOptional()
  @IsDateString()
  dateAutorisation?: string;

  @IsOptional()
  @IsString()
  typeDocument?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  referenceDocument?: string;

  @IsOptional()
  @IsString()
  statutAutorisation?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateAutorisationTVADto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  numeroAutorisation?: string;

  @IsOptional()
  @IsDateString()
  dateDebutValidite?: string;

  @IsOptional()
  @IsDateString()
  dateFinValidite?: string;

  @IsOptional()
  @IsDateString()
  dateAutorisation?: string;

  @IsOptional()
  @IsString()
  typeDocument?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  referenceDocument?: string;

  @IsOptional()
  @IsString()
  statutAutorisation?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

// ===============================
// DTOs pour BCsusTVA (Bons de commande)
// ===============================

export class CreateBonCommandeDto {
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
  montantBonCommande: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  statut?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateBonCommandeDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  numeroBonCommande?: string;

  @IsOptional()
  @IsDateString()
  dateBonCommande?: string;

  @IsOptional()
  @IsNumber()
  montantBonCommande?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  statut?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  imagePath?: string | null;
}
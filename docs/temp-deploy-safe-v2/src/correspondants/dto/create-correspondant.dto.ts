import { IsString, IsNotEmpty, IsOptional, IsEmail, IsUrl, IsNumber, IsBoolean, IsIn, Min, Max, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCorrespondantDto {
  @ApiPropertyOptional({ description: 'Code unique (auto-généré si non fourni)', example: 'COR000001' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'Nature du correspondant', enum: ['LOCAL', 'ETRANGER'], example: 'LOCAL' })
  @IsNotEmpty({ message: 'La nature est obligatoire' })
  @IsIn(['LOCAL', 'ETRANGER'], { message: 'La nature doit être LOCAL ou ETRANGER' })
  nature: string;

  @ApiProperty({ description: 'Nom du correspondant', example: 'A PLUS TRADING LIMITED' })
  @IsNotEmpty({ message: 'Le libellé est obligatoire' })
  @IsString()
  libelle: string;

  @ApiPropertyOptional({ description: 'Chemin du logo', example: 'uploads/correspondants-logo/logo.png' })
  @IsOptional()
  @IsString()
  logo?: string;

  // Coordonnées
  @ApiPropertyOptional({ description: 'Adresse', example: '2/F YAU BUILDING 167 LOCK' })
  @IsOptional()
  @IsString()
  adresse?: string;

  @ApiPropertyOptional({ description: 'Ville', example: 'WANCHAI' })
  @IsOptional()
  @IsString()
  ville?: string;

  @ApiPropertyOptional({ description: 'Code postal', example: '13000' })
  @IsOptional()
  @IsString()
  codePostal?: string;

  @ApiPropertyOptional({ description: 'Pays', example: 'HONG KONG' })
  @IsOptional()
  @IsString()
  pays?: string;

  // Contacts
  @ApiPropertyOptional({ description: 'Téléphone principal', example: '+852-25755599' })
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiPropertyOptional({ description: 'Téléphone secondaire', example: '+852-25755600' })
  @IsOptional()
  @IsString()
  telephoneSecondaire?: string;

  @ApiPropertyOptional({ description: 'Numéro de fax', example: '+852-28911996' })
  @IsOptional()
  @IsString()
  fax?: string;

  @ApiPropertyOptional({ description: 'Adresse email', example: 'info@aplus.trade' })
  @IsOptional()
  @ValidateIf(o => o.email !== '' && o.email !== null)
  @IsEmail({}, { message: 'Email invalide' })
  email?: string;

  @ApiPropertyOptional({ description: 'Site web', example: 'https://www.aplus.trade' })
  @IsOptional()
  @ValidateIf(o => o.siteWeb !== '' && o.siteWeb !== null)
  @IsUrl({}, { message: 'URL invalide' })
  siteWeb?: string;

  // Informations fiscales
  @ApiPropertyOptional({ description: 'État fiscal', example: 'Assujeti' })
  @IsOptional()
  @IsString()
  etatFiscal?: string;

  @ApiPropertyOptional({ description: 'Taux FOIDS/VOLUME', example: 0.000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  txFoidsVolume?: number;

  @ApiPropertyOptional({ description: 'Matricule fiscal', example: '123456789' })
  @IsOptional()
  @IsString()
  matriculeFiscal?: string;

  @ApiPropertyOptional({ description: 'Type de matricule fiscal' })
  @IsOptional()
  @IsString()
  typeMf?: string;

  @ApiPropertyOptional({ description: 'Timbre (Oui/Non)', example: 'Oui' })
  @IsOptional()
  @IsString()
  timbre?: string;

  @ApiPropertyOptional({ description: 'Échéance en jours', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  echeance?: number;

  // Informations comptables
  @ApiPropertyOptional({ description: 'Débit initial', example: 0.000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  debitInitial?: number;

  @ApiPropertyOptional({ description: 'Crédit initial', example: 0.000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditInitial?: number;

  @ApiPropertyOptional({ description: 'Solde', example: 0.000 })
  @IsOptional()
  @IsNumber()
  solde?: number;

  @ApiPropertyOptional({ description: 'Devise', example: 'TND' })
  @IsOptional()
  @IsString()
  devise?: string;

  // Compétences
  @ApiPropertyOptional({ description: 'Compétence maritime', example: true })
  @IsOptional()
  @IsBoolean()
  competenceMaritime?: boolean;

  @ApiPropertyOptional({ description: 'Compétence routier', example: false })
  @IsOptional()
  @IsBoolean()
  competenceRoutier?: boolean;

  @ApiPropertyOptional({ description: 'Compétence aérien', example: false })
  @IsOptional()
  @IsBoolean()
  competenceAerien?: boolean;

  // Notes
  @ApiPropertyOptional({ description: 'Notes ou commentaires' })
  @IsOptional()
  @IsString()
  notes?: string;

  // Statut
  @ApiPropertyOptional({ description: 'Statut', enum: ['actif', 'inactif'], example: 'actif' })
  @IsOptional()
  @IsIn(['actif', 'inactif'])
  statut?: string;
}

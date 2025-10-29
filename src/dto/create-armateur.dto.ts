import { IsString, IsOptional, IsBoolean, IsNumber, IsEmail, IsUrl, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateArmateurDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  code?: string; // Généré automatiquement si non fourni

  @IsString()
  @MaxLength(100)
  nom: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  abreviation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  adresse?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ville?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  pays?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  codePostal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telephone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telephoneSecondaire?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  fax?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  siteWeb?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tarif20Pieds?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tarif40Pieds?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tarif45Pieds?: number;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

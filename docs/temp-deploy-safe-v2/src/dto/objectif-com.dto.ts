import { IsString, IsOptional, IsNumber, IsDateString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateObjectifComDto {
  @IsNumber()
  id_personnel: number;

  @IsOptional()
  @IsString()
  titre?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value !== '' && value !== null ? parseFloat(value) : undefined)
  objectif_ca?: number;

  @IsOptional()
  @IsNumber()
  objectif_clients?: number;

  @IsOptional()
  @IsDateString()
  date_debut?: string;

  @IsOptional()
  @IsDateString()
  date_fin?: string;

  @IsOptional()
  @IsString()
  statut?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value !== '' && value !== null ? parseFloat(value) : undefined)
  progression?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateObjectifComDto {
  @IsOptional()
  @IsNumber()
  id_personnel?: number;

  @IsOptional()
  @IsString()
  titre?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value !== '' && value !== null ? parseFloat(value) : undefined)
  objectif_ca?: number;

  @IsOptional()
  @IsNumber()
  objectif_clients?: number;

  @IsOptional()
  @IsDateString()
  date_debut?: string;

  @IsOptional()
  @IsDateString()
  date_fin?: string;

  @IsOptional()
  @IsString()
  statut?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value !== '' && value !== null ? parseFloat(value) : undefined)
  progression?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

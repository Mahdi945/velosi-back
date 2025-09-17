import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateObjectifComDto {
  @IsNumber()
  personnelId: number;

  @IsString()
  titre: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
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
  progression?: number;
}

export class UpdateObjectifComDto {
  @IsOptional()
  @IsNumber()
  personnelId?: number;

  @IsOptional()
  @IsString()
  titre?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
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
  progression?: number;
}

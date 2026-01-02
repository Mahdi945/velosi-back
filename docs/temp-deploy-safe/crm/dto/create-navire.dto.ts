import { IsString, IsOptional, IsNumber, MaxLength, IsInt } from 'class-validator';

export class CreateNavireDto {
  @IsString()
  @MaxLength(255)
  libelle: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationalite?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  conducteur?: string;

  @IsOptional()
  @IsNumber()
  longueur?: number;

  @IsOptional()
  @IsNumber()
  largeur?: number;

  @IsOptional()
  @IsNumber()
  tirantAir?: number;

  @IsOptional()
  @IsNumber()
  tirantEau?: number;

  @IsOptional()
  @IsInt()
  jaugeBrute?: number;

  @IsOptional()
  @IsInt()
  jaugeNet?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  codeOmi?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  pav?: string;

  @IsOptional()
  @IsInt()
  armateurId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  statut?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

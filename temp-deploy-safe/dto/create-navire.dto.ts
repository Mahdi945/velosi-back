import { IsString, IsOptional, IsNumber, MaxLength, IsInt, IsNotEmpty } from 'class-validator';

export class CreateNavireDto {
  @IsString()
  @IsNotEmpty({ message: 'Le code du navire est obligatoire' })
  @MaxLength(50, { message: 'Le code ne peut pas dépasser 50 caractères' })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'Le libellé du navire est obligatoire' })
  @MaxLength(255, { message: 'Le libellé ne peut pas dépasser 255 caractères' })
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

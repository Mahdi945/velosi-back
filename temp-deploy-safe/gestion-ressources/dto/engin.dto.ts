import { IsString, IsOptional, IsNumber, IsBoolean, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateEnginDto {
  @IsString()
  @MaxLength(200)
  libelle: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  conteneurRemorque?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value ? parseFloat(value) : null)
  poidsVide?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  pied?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateEnginDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  libelle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  conteneurRemorque?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value ? parseFloat(value) : null)
  poidsVide?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  pied?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class ToggleEnginActiveDto {
  @IsBoolean()
  isActive: boolean;
}

export class EnginFiltersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  pied?: string;

  @IsOptional()
  @IsString()
  conteneurRemorque?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  is_active?: boolean;

  @IsOptional()
  @Transform(({ value }) => value !== undefined ? parseInt(value, 10) : undefined)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => value !== undefined ? parseInt(value, 10) : undefined)
  limit?: number;
}

import { IsString, IsOptional, IsDateString, IsEnum, IsBoolean, Length, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAutorisationTVADto {
  @IsNotEmpty()
  clientId: number;

  @IsString()
  @Length(1, 15)
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
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateAutorisationTVADto {
  @IsOptional()
  @IsString()
  @Length(1, 15)
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
  @IsBoolean()
  is_active?: boolean;
}

export class AutorisationTVAResponseDto {
  id: number;
  clientId: number;
  numeroAutorisation: string;
  dateDebutValidite?: Date;
  dateFinValidite?: Date;
  dateAutorisation?: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  statusText: string;
  isValid: boolean;
  isExpired: boolean;
}
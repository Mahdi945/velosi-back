import { IsString, IsOptional, IsNumber, IsBoolean, MaxLength, IsEmail, Matches, ValidateIf } from 'class-validator';

export class CreateContactClientDto {
  @IsNumber()
  clientId: number;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Le nom ne peut pas dépasser 100 caractères' })
  nom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Le prénom ne peut pas dépasser 100 caractères' })
  prenom?: string;

  @IsOptional()
  @ValidateIf((o) => o.tel1 && o.tel1.trim().length > 0)
  @IsString()
  @MaxLength(20, { message: 'Le téléphone ne peut pas dépasser 20 caractères' })
  @Matches(/^[0-9+\-\s()]+$/, { message: 'Format de téléphone invalide' })
  tel1?: string;

  @IsOptional()
  @ValidateIf((o) => o.tel2 && o.tel2.trim().length > 0)
  @IsString()
  @MaxLength(20, { message: 'Le téléphone ne peut pas dépasser 20 caractères' })
  @Matches(/^[0-9+\-\s()]+$/, { message: 'Format de téléphone invalide' })
  tel2?: string;

  @IsOptional()
  @ValidateIf((o) => o.tel3 && o.tel3.trim().length > 0)
  @IsString()
  @MaxLength(20, { message: 'Le téléphone ne peut pas dépasser 20 caractères' })
  @Matches(/^[0-9+\-\s()]+$/, { message: 'Format de téléphone invalide' })
  tel3?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Le fax ne peut pas dépasser 20 caractères' })
  fax?: string;

  @IsOptional()
  @ValidateIf((o) => o.mail1 && o.mail1.trim().length > 0)
  @IsEmail({}, { message: 'Format email invalide' })
  @MaxLength(100, { message: "L'email ne peut pas dépasser 100 caractères" })
  mail1?: string;

  @IsOptional()
  @ValidateIf((o) => o.mail2 && o.mail2.trim().length > 0)
  @IsEmail({}, { message: 'Format email invalide' })
  @MaxLength(100, { message: "L'email ne peut pas dépasser 100 caractères" })
  mail2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La fonction ne peut pas dépasser 100 caractères' })
  fonction?: string;

  @IsOptional()
  @IsBoolean()
  is_principal?: boolean;
}

export class UpdateContactClientDto {
  @IsOptional()
  @IsNumber()
  clientId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Le nom ne peut pas dépasser 100 caractères' })
  nom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Le prénom ne peut pas dépasser 100 caractères' })
  prenom?: string;

  @IsOptional()
  @ValidateIf((o) => o.tel1 && o.tel1.trim().length > 0)
  @IsString()
  @MaxLength(20, { message: 'Le téléphone ne peut pas dépasser 20 caractères' })
  @Matches(/^[0-9+\-\s()]+$/, { message: 'Format de téléphone invalide' })
  tel1?: string;

  @IsOptional()
  @ValidateIf((o) => o.tel2 && o.tel2.trim().length > 0)
  @IsString()
  @MaxLength(20, { message: 'Le téléphone ne peut pas dépasser 20 caractères' })
  @Matches(/^[0-9+\-\s()]+$/, { message: 'Format de téléphone invalide' })
  tel2?: string;

  @IsOptional()
  @ValidateIf((o) => o.tel3 && o.tel3.trim().length > 0)
  @IsString()
  @MaxLength(20, { message: 'Le téléphone ne peut pas dépasser 20 caractères' })
  @Matches(/^[0-9+\-\s()]+$/, { message: 'Format de téléphone invalide' })
  tel3?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Le fax ne peut pas dépasser 20 caractères' })
  fax?: string;

  @IsOptional()
  @ValidateIf((o) => o.mail1 && o.mail1.trim().length > 0)
  @IsEmail({}, { message: 'Format email invalide' })
  @MaxLength(100, { message: "L'email ne peut pas dépasser 100 caractères" })
  mail1?: string;

  @IsOptional()
  @ValidateIf((o) => o.mail2 && o.mail2.trim().length > 0)
  @IsEmail({}, { message: 'Format email invalide' })
  @MaxLength(100, { message: "L'email ne peut pas dépasser 100 caractères" })
  mail2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La fonction ne peut pas dépasser 100 caractères' })
  fonction?: string;

  @IsOptional()
  @IsBoolean()
  is_principal?: boolean;
}

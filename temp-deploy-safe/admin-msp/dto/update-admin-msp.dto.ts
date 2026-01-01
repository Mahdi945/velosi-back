import { IsString, IsEmail, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateAdminMspDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  prenom?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nom_utilisateur?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  mot_de_passe?: string;

  @IsOptional()
  @IsEnum(['super_admin', 'admin', 'viewer'])
  role?: 'super_admin' | 'admin' | 'viewer';

  @IsOptional()
  @IsEnum(['actif', 'inactif', 'suspendu'])
  statut?: 'actif' | 'inactif' | 'suspendu';

  @IsOptional()
  @IsString()
  notes?: string;
}

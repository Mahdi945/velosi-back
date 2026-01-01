import { IsString, IsEmail, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateAdminMspDto {
  @IsString()
  @MaxLength(100)
  nom: string;

  @IsString()
  @MaxLength(100)
  prenom: string;

  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(100)
  nom_utilisateur: string;

  @IsString()
  @MinLength(6)
  mot_de_passe: string;

  @IsEnum(['super_admin', 'admin', 'viewer'])
  role: 'super_admin' | 'admin' | 'viewer';

  @IsOptional()
  @IsString()
  notes?: string;
}

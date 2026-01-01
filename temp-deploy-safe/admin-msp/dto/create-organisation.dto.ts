import { IsNotEmpty, IsString, IsEmail, IsOptional, Length, IsBoolean, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrganisationDto {
  @IsNotEmpty({ message: 'Le nom de l\'organisation est requis' })
  @IsString()
  @Length(2, 255)
  nom: string;

  @IsOptional()
  @IsString()
  @Length(3, 100)
  database_name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email invalide' })
  email_contact?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsString()
  adresse?: string;

  @IsOptional()
  @IsString()
  logo_url?: string;

  @IsOptional()
  @IsString()
  nom_affichage?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsDateString()
  date_creation?: string;

  @IsOptional()
  @IsDateString()
  date_expiration_abonnement?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  smtp_enabled?: boolean;

  @IsOptional()
  @IsString()
  smtp_host?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  smtp_port?: number;

  @IsOptional()
  @IsString()
  smtp_user?: string;

  @IsOptional()
  @IsString()
  smtp_password?: string;

  @IsOptional()
  @IsString()
  smtp_from_email?: string;

  @IsOptional()
  @IsString()
  smtp_from_name?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  smtp_use_tls?: boolean;

  // Champs footer d'impression
  @IsOptional()
  @IsString()
  tel1?: string;

  @IsOptional()
  @IsString()
  tel2?: string;

  @IsOptional()
  @IsString()
  tel3?: string;

  @IsOptional()
  @IsString()
  site_web?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email service technique invalide' })
  email_service_technique?: string;

  // Champs du superviseur (pour création complète)
  @IsOptional()
  @IsString()
  superviseur_prenom?: string;

  @IsOptional()
  @IsString()
  superviseur_nom?: string;

  @IsOptional()
  @IsString()
  superviseur_username?: string;

  @IsOptional()
  @IsString()
  superviseur_genre?: string;

  @IsOptional()
  @IsEmail()
  superviseur_email?: string;

  @IsOptional()
  @IsString()
  superviseur_telephone?: string;

  @IsOptional()
  @IsString()
  @Length(8, 100)
  superviseur_mot_de_passe?: string;

  @IsOptional()
  @IsString()
  superviseur_mot_de_passe_confirm?: string;

  // Options de création
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  send_email?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  full_creation?: boolean;
}


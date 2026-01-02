import { IsNotEmpty, IsString, IsEmail, IsOptional, Length, MinLength, IsBoolean, IsNumber } from 'class-validator';

export class CompleteSetupDto {
  // Informations du superviseur (obligatoires)
  @IsNotEmpty({ message: 'Le prénom du superviseur est requis' })
  @IsString()
  superviseur_prenom: string;

  @IsNotEmpty({ message: 'Le nom du superviseur est requis' })
  @IsString()
  superviseur_nom: string;

  @IsOptional()
  @IsString()
  superviseur_username?: string;

  @IsOptional()
  @IsString()
  superviseur_genre?: string;

  @IsNotEmpty({ message: 'L\'email du superviseur est requis' })
  @IsEmail({}, { message: 'Email invalide' })
  superviseur_email: string;

  @IsOptional()
  @IsString()
  superviseur_telephone?: string;

  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  superviseur_mot_de_passe: string;

  // Nom de la base de données (optionnel - peut être modifié par le client)
  @IsOptional()
  @IsString()
  @Length(3, 100)
  database_name?: string;

  // Autres informations de l'organisation (optionnelles)
  @IsOptional()
  @IsString()
  nom_affichage?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email de contact invalide' })
  email_contact?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  adresse?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsString()
  logo_url?: string;

  // Configuration SMTP (optionnelle)
  @IsOptional()
  @IsBoolean()
  smtp_enabled?: boolean;

  @IsOptional()
  @IsString()
  smtp_host?: string;

  @IsOptional()
  @IsNumber()
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
  smtp_use_tls?: boolean;

  // Footer d'impression (nouveaux champs)
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
}

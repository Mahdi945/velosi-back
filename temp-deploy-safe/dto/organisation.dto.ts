import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';

// DTO pour la création d'une organisation
export class CreateOrganisationDto {
  @IsNotEmpty()
  @IsString()
  token: string; // Token de setup reçu par email

  @IsNotEmpty()
  @IsString()
  nom_entreprise: string;

  @IsOptional()
  @IsString()
  nom_affichage?: string;

  @IsNotEmpty()
  @IsString()
  database_name: string; // Nom de la BDD (sera préfixé par shipnology_)

  @IsNotEmpty()
  @IsEmail()
  email_contact: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  // Informations du superviseur (premier admin)
  @IsNotEmpty()
  superviseur: {
    nom: string;
    prenom: string;
    email: string;
    nom_utilisateur: string;
    mot_de_passe: string;
  };
}

// DTO pour la génération d'un token
export class GenerateSetupTokenDto {
  @IsNotEmpty()
  @IsEmail()
  email_destinataire: string;

  @IsNotEmpty()
  @IsString()
  nom_contact: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  validite_heures?: number; // Défaut: 48h
}

// DTO pour vérifier un token
export class VerifyTokenDto {
  @IsNotEmpty()
  @IsString()
  token: string;
}

// DTO pour mettre à jour une organisation
export class UpdateOrganisationDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  nom_affichage?: string;

  @IsOptional()
  @IsEmail()
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
  @IsEnum(['actif', 'suspendu', 'inactif'])
  statut?: 'actif' | 'suspendu' | 'inactif';

  @IsOptional()
  @IsString()
  plan?: string;
}

// DTO pour login admin MSP
export class LoginAdminMspDto {
  @IsNotEmpty()
  @IsString()
  usernameOrEmail: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;
}

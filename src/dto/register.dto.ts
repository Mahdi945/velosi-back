import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsIn,
  MinLength,
  ValidateIf,
  Matches,
  Length,
  IsEnum,
  IsBoolean,
  IsArray,
  IsInt,
  MaxLength,
} from 'class-validator';
import { EtatFiscal } from '../entities/client.entity';

export class CreatePersonnelDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  @MaxLength(100, { message: 'Le nom ne peut pas dépasser 100 caractères' })
  nom: string;

  @IsString()
  @IsNotEmpty({ message: 'Le prénom est requis' })
  @MaxLength(100, { message: 'Le prénom ne peut pas dépasser 100 caractères' })
  prenom: string;

  @IsString()
  @IsNotEmpty({ message: "Le nom d'utilisateur est requis" })
  @MaxLength(50, { message: "Le nom d'utilisateur ne peut pas dépasser 50 caractères" })
  nom_utilisateur: string;

  @IsString()
  @IsNotEmpty({ message: 'Le rôle est requis' })
  @IsIn(
    ['administratif', 'commercial', 'exploitation', 'finance', 'chauffeur'],
    {
      message:
        'Le rôle doit être: administratif, commercial, exploitation, finance, ou chauffeur',
    },
  )
  role: string;

  @IsOptional()
  @ValidateIf((o) => o.telephone && o.telephone.trim().length > 0)
  @IsString({ message: 'Le téléphone doit être une chaîne de caractères' })
  @Matches(/^[0-9+\-\s()]+$/, { 
    message: 'Le téléphone ne peut contenir que des chiffres, +, -, espaces et parenthèses' 
  })
  @Length(8, 20, { 
    message: 'Le téléphone doit contenir entre 8 et 20 caractères' 
  })
  telephone?: string;

  @IsOptional()
  @ValidateIf((o) => o.email && o.email.length > 0)
  @IsEmail({}, { message: 'Email invalide' })
  @MaxLength(100, { message: "L'email ne peut pas dépasser 100 caractères" })
  email?: string;

  @IsString()
  @IsNotEmpty({ message: 'Le genre est requis' })
  @IsIn(['Homme', 'Femme'], {
    message: 'Le genre doit être Homme ou Femme',
  })
  genre: string;

  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères',
  })
  @MaxLength(100, { message: 'Le mot de passe ne peut pas dépasser 100 caractères' })
  mot_de_passe: string;
}

export class CreateClientDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  @MaxLength(100, { message: 'Le nom ne peut pas dépasser 100 caractères' })
  nom: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: "L'interlocuteur ne peut pas dépasser 100 caractères" })
  interlocuteur?: string;

  @IsString()
  @IsOptional()
  @MaxLength(300, { message: "L'adresse ne peut pas dépasser 300 caractères" })
  adresse?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'La ville ne peut pas dépasser 100 caractères' })
  ville?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Le pays ne peut pas dépasser 100 caractères' })
  pays?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20, { message: 'Le code postal ne peut pas dépasser 20 caractères' })
  code_postal?: string;

  @IsString()
  @IsOptional()
  @IsIn(['particulier', 'entreprise'], {
    message: 'Le type de client doit être: particulier ou entreprise',
  })
  type_client?: string;

  @IsString()
  @IsOptional()
  @IsIn(['local', 'etranger'], {
    message: 'La catégorie doit être: local ou etranger',
  })
  categorie?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20, { message: "L'identifiant fiscal ne peut pas dépasser 20 caractères" })
  id_fiscal?: string;

  @IsOptional()
  @IsEnum(EtatFiscal, {
    message: 'L\'état fiscal doit être: ASSUJETTI_TVA, SUSPENSION_TVA, ou EXONERE',
  })
  etat_fiscal?: EtatFiscal;

  @IsString()
  @IsOptional()
  @IsIn(['TND', 'EUR', 'USD'], {
    message: 'La devise doit être: TND, EUR, ou USD',
  })
  devise?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, {
    message: 'Le mot de passe doit contenir au moins 6 caractères',
  })
  @MaxLength(100, { message: 'Le mot de passe ne peut pas dépasser 100 caractères' })
  mot_de_passe?: string;

  // Champs de contact - emails optionnels et validés seulement si non vides
  @IsOptional()
  @ValidateIf((o) => o.contact_tel1 && o.contact_tel1.trim().length > 0)
  @IsString({ message: 'Le téléphone principal doit être une chaîne de caractères' })
  @Matches(/^[0-9+\-\s()]+$/, { 
    message: 'Le téléphone principal ne peut contenir que des chiffres, +, -, espaces et parenthèses' 
  })
  @Length(8, 20, { 
    message: 'Le téléphone principal doit contenir entre 8 et 20 caractères' 
  })
  contact_tel1?: string;

  @IsOptional()
  @ValidateIf((o) => o.contact_tel2 && o.contact_tel2.trim().length > 0)
  @IsString({ message: 'Le téléphone secondaire doit être une chaîne de caractères' })
  @Matches(/^[0-9+\-\s()]+$/, { 
    message: 'Le téléphone secondaire ne peut contenir que des chiffres, +, -, espaces et parenthèses' 
  })
  @Length(8, 20, { 
    message: 'Le téléphone secondaire doit contenir entre 8 et 20 caractères' 
  })
  contact_tel2?: string;

  @IsOptional()
  @ValidateIf((o) => o.contact_tel3 && o.contact_tel3.trim().length > 0)
  @IsString({ message: 'Le téléphone tertiaire doit être une chaîne de caractères' })
  @Matches(/^[0-9+\-\s()]+$/, { 
    message: 'Le téléphone tertiaire ne peut contenir que des chiffres, +, -, espaces et parenthèses' 
  })
  @Length(8, 20, { 
    message: 'Le téléphone tertiaire doit contenir entre 8 et 20 caractères' 
  })
  contact_tel3?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Le fax ne peut pas dépasser 20 caractères' })
  contact_fax?: string;

  @IsOptional()
  @ValidateIf((o) => o.contact_mail1 && o.contact_mail1.trim().length > 0)
  @IsEmail({}, { message: "L'email de contact principal doit être valide" })
  @MaxLength(100, { message: "L'email ne peut pas dépasser 100 caractères" })
  contact_mail1?: string;

  @IsOptional()
  @ValidateIf((o) => o.contact_mail2 && o.contact_mail2.trim().length > 0)
  @IsEmail({}, { message: "L'email de contact secondaire doit être valide" })
  @MaxLength(100, { message: "L'email ne peut pas dépasser 100 caractères" })
  contact_mail2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La fonction ne peut pas dépasser 100 caractères' })
  contact_fonction?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  charge_com_ids?: number[]; // Array des IDs des commerciaux assignés

  @IsOptional()
  @IsString()
  @IsIn(['actif', 'inactif', 'suspendu'], {
    message: 'Le statut doit être: actif, inactif, ou suspendu',
  })
  statut?: string;

  @IsOptional()
  @IsBoolean()
  is_permanent?: boolean;
}

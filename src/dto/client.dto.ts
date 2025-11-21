import { IsString, IsOptional, IsDateString, IsEnum, IsBoolean, Length, IsNotEmpty, IsArray, IsInt, MaxLength, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { EtatFiscal } from '../entities/client.entity';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Le nom ne peut pas dépasser 100 caractères' })
  nom: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: "L'interlocuteur ne peut pas dépasser 100 caractères" })
  interlocuteur?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'La catégorie ne peut pas dépasser 50 caractères' })
  categorie?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Le type client ne peut pas dépasser 50 caractères' })
  type_client?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300, { message: "L'adresse ne peut pas dépasser 300 caractères" })
  adresse?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Le code postal ne peut pas dépasser 20 caractères' })
  code_postal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La ville ne peut pas dépasser 100 caractères' })
  ville?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Le pays ne peut pas dépasser 100 caractères' })
  pays?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: "L'identifiant fiscal ne peut pas dépasser 20 caractères" })
  id_fiscal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'La nature ne peut pas dépasser 50 caractères' })
  nature?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Le code douane ne peut pas dépasser 20 caractères' })
  c_douane?: string;

  @IsOptional()
  nbr_jour_ech?: number;

  @IsOptional()
  @IsEnum(EtatFiscal)
  etat_fiscal?: EtatFiscal;

  @IsOptional()
  @IsString()
  n_auto?: string;

  @IsOptional()
  @IsDateString()
  date_auto?: string;

  @IsOptional()
  franchise_sur?: number;

  @IsOptional()
  @IsDateString()
  date_fin?: string;

  @IsOptional()
  @IsBoolean()
  blocage?: boolean;

  @IsOptional()
  @IsString()
  devise?: string;

  @IsOptional()
  @IsBoolean()
  timbre?: boolean;

  @IsOptional()
  @IsString()
  compte_cpt?: string;

  @IsOptional()
  @IsString()
  sec_activite?: string;

  @IsOptional()
  @IsString()
  charge_com?: string; // DEPRECATED: Conservé pour compatibilité, utiliser charge_com_ids

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  charge_com_ids?: number[]; // Array des IDs des commerciaux assignés

  @IsOptional()
  @IsBoolean()
  stop_envoie_solde?: boolean;

  @IsOptional()
  @IsBoolean()
  maj_web?: boolean;

  @IsOptional()
  d_initial?: number;

  @IsOptional()
  c_initial?: number;

  @IsOptional()
  solde?: number;

  @IsOptional()
  @IsString()
  mot_de_passe?: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsString()
  statut?: string;

  @IsOptional()
  @IsBoolean()
  is_permanent?: boolean = false;

  @IsOptional()
  @IsString()
  contact_tel1?: string;

  @IsOptional()
  @IsString()
  contact_mail1?: string;

  @IsOptional()
  @IsString()
  contact_fonction?: string;

  // Informations bancaires
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Le nom de la banque ne peut pas dépasser 100 caractères' })
  banque?: string;

  @IsOptional()
  @IsString()
  @MaxLength(34, { message: "L'IBAN ne peut pas dépasser 34 caractères" })
  @Matches(/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/, { 
    message: 'Format IBAN invalide (ex: FR7630006000011234567890189)' 
  })
  iban?: string;

  @IsOptional()
  @IsString()
  @MaxLength(23, { message: 'Le RIB ne peut pas dépasser 23 caractères' })
  rib?: string;

  @IsOptional()
  @IsString()
  @MaxLength(11, { message: 'Le code SWIFT ne peut pas dépasser 11 caractères' })
  @Matches(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, { 
    message: 'Format SWIFT/BIC invalide (ex: BNPAFRPPXXX)' 
  })
  swift?: string;

  @IsOptional()
  @IsString()
  @MaxLength(11, { message: 'Le code BIC ne peut pas dépasser 11 caractères' })
  @Matches(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, { 
    message: 'Format BIC invalide (ex: BNPAFRPPXXX)' 
  })
  bic?: string;
}

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Le nom ne peut pas dépasser 100 caractères' })
  nom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: "L'interlocuteur ne peut pas dépasser 100 caractères" })
  interlocuteur?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'La catégorie ne peut pas dépasser 50 caractères' })
  categorie?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Le type client ne peut pas dépasser 50 caractères' })
  type_client?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300, { message: "L'adresse ne peut pas dépasser 300 caractères" })
  adresse?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Le code postal ne peut pas dépasser 20 caractères' })
  code_postal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La ville ne peut pas dépasser 100 caractères' })
  ville?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Le pays ne peut pas dépasser 100 caractères' })
  pays?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: "L'identifiant fiscal ne peut pas dépasser 20 caractères" })
  id_fiscal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'La nature ne peut pas dépasser 50 caractères' })
  nature?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Le code douane ne peut pas dépasser 20 caractères' })
  c_douane?: string;

  @IsOptional()
  nbr_jour_ech?: number;

  @IsOptional()
  @IsEnum(EtatFiscal)
  etat_fiscal?: EtatFiscal;

  @IsOptional()
  @IsString()
  n_auto?: string;

  @IsOptional()
  @IsDateString()
  date_auto?: string;

  @IsOptional()
  franchise_sur?: number;

  @IsOptional()
  @IsDateString()
  date_fin?: string;

  @IsOptional()
  @IsBoolean()
  blocage?: boolean;

  @IsOptional()
  @IsString()
  devise?: string;

  @IsOptional()
  @IsBoolean()
  timbre?: boolean;

  @IsOptional()
  @IsString()
  compte_cpt?: string;

  @IsOptional()
  @IsString()
  sec_activite?: string;

  @IsOptional()
  @IsString()
  charge_com?: string; // DEPRECATED: Conservé pour compatibilité, utiliser charge_com_ids

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  charge_com_ids?: number[]; // Array des IDs des commerciaux assignés

  @IsOptional()
  @IsBoolean()
  stop_envoie_solde?: boolean;

  @IsOptional()
  @IsBoolean()
  maj_web?: boolean;

  @IsOptional()
  d_initial?: number;

  @IsOptional()
  c_initial?: number;

  @IsOptional()
  solde?: number;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsString()
  statut?: string;

  @IsOptional()
  @IsBoolean()
  is_permanent?: boolean;

  // Informations bancaires
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Le nom de la banque ne peut pas dépasser 100 caractères' })
  banque?: string;

  @IsOptional()
  @IsString()
  @MaxLength(34, { message: "L'IBAN ne peut pas dépasser 34 caractères" })
  @Matches(/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/, { 
    message: 'Format IBAN invalide (ex: FR7630006000011234567890189)' 
  })
  iban?: string;

  @IsOptional()
  @IsString()
  @MaxLength(23, { message: 'Le RIB ne peut pas dépasser 23 caractères' })
  rib?: string;

  @IsOptional()
  @IsString()
  @MaxLength(11, { message: 'Le code SWIFT ne peut pas dépasser 11 caractères' })
  @Matches(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, { 
    message: 'Format SWIFT/BIC invalide (ex: BNPAFRPPXXX)' 
  })
  swift?: string;

  @IsOptional()
  @IsString()
  @MaxLength(11, { message: 'Le code BIC ne peut pas dépasser 11 caractères' })
  @Matches(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, { 
    message: 'Format BIC invalide (ex: BNPAFRPPXXX)' 
  })
  bic?: string;
}
import { IsString, IsOptional, IsDateString, IsEnum, IsBoolean, Length, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { EtatFiscal } from '../entities/client.entity';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  nom: string;

  @IsOptional()
  @IsString()
  interlocuteur?: string;

  @IsOptional()
  @IsString()
  categorie?: string;

  @IsOptional()
  @IsString()
  type_client?: string;

  @IsOptional()
  @IsString()
  adresse?: string;

  @IsOptional()
  @IsString()
  code_postal?: string;

  @IsOptional()
  @IsString()
  ville?: string;

  @IsOptional()
  @IsString()
  pays?: string;

  @IsOptional()
  @IsString()
  id_fiscal?: string;

  @IsOptional()
  @IsString()
  nature?: string;

  @IsOptional()
  @IsString()
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
  banque?: string;

  @IsOptional()
  @IsString()
  iban?: string;

  @IsOptional()
  @IsString()
  rib?: string;

  @IsOptional()
  @IsString()
  swift?: string;

  @IsOptional()
  @IsString()
  bic?: string;
}

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  interlocuteur?: string;

  @IsOptional()
  @IsString()
  categorie?: string;

  @IsOptional()
  @IsString()
  type_client?: string;

  @IsOptional()
  @IsString()
  adresse?: string;

  @IsOptional()
  @IsString()
  code_postal?: string;

  @IsOptional()
  @IsString()
  ville?: string;

  @IsOptional()
  @IsString()
  pays?: string;

  @IsOptional()
  @IsString()
  id_fiscal?: string;

  @IsOptional()
  @IsString()
  nature?: string;

  @IsOptional()
  @IsString()
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
  banque?: string;

  @IsOptional()
  @IsString()
  iban?: string;

  @IsOptional()
  @IsString()
  rib?: string;

  @IsOptional()
  @IsString()
  swift?: string;

  @IsOptional()
  @IsString()
  bic?: string;
}
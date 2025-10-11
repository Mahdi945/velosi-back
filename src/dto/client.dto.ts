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
  charge_com?: string;

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

  @IsString()
  @IsNotEmpty()
  mot_de_passe: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsString()
  statut?: string;
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
  charge_com?: string;

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
}
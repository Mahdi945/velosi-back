import { IsString, IsOptional, IsBoolean, IsNumber, IsEmail, IsIn, MaxLength } from 'class-validator';

export class CreateFournisseurDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string; // Auto-généré si non fourni

  @IsString()
  @MaxLength(100)
  nom: string;

  @IsOptional()
  @IsString()
  @IsIn(['local', 'etranger'])
  typeFournisseur?: string;

  @IsOptional()
  @IsString()
  @IsIn(['personne_morale', 'personne_physique'])
  categorie?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  activite?: string;

  @IsOptional()
  @IsString()
  @IsIn(['mf', 'cin', 'passeport', 'carte_sejour', 'autre'])
  natureIdentification?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  numeroIdentification?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  codeFiscal?: string;

  @IsOptional()
  @IsNumber()
  typeMf?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  adresse?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  adresse2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  adresse3?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  ville?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  codePostal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  pays?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  nomContact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telephone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  fax?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Format email invalide' })
  @MaxLength(50)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  ribIban?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  swift?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  adresseBanque?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  codePaysPayeur?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  modalitePaiement?: string;

  @IsOptional()
  @IsNumber()
  delaiPaiement?: number;

  @IsOptional()
  @IsBoolean()
  timbreFiscal?: boolean;

  @IsOptional()
  @IsBoolean()
  estFournisseurMarchandise?: boolean;

  @IsOptional()
  @IsBoolean()
  aChargeFixe?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  compteComptable?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

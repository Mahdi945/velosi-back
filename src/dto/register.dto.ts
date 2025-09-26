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
} from 'class-validator';

export class CreatePersonnelDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  nom: string;

  @IsString()
  @IsNotEmpty({ message: 'Le prénom est requis' })
  prenom: string;

  @IsString()
  @IsNotEmpty({ message: "Le nom d'utilisateur est requis" })
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
  mot_de_passe: string;
}

export class CreateClientDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  nom: string;

  @IsString()
  @IsOptional()
  interlocuteur?: string;

  @IsString()
  @IsOptional()
  adresse?: string;

  @IsString()
  @IsOptional()
  ville?: string;

  @IsString()
  @IsOptional()
  pays?: string;

  @IsString()
  @IsOptional()
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
  id_fiscal?: string;

  @IsString()
  @IsOptional()
  @IsIn(['assujetti_tva', 'exonere_tva', 'non_assujetti'], {
    message: 'L\'état fiscal doit être: assujetti_tva, exonere_tva, ou non_assujetti',
  })
  etat_fiscal?: string;

  @IsString()
  @IsOptional()
  @IsIn(['TND', 'EUR', 'USD'], {
    message: 'La devise doit être: TND, EUR, ou USD',
  })
  devise?: string;

  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @MinLength(6, {
    message: 'Le mot de passe doit contenir au moins 6 caractères',
  })
  mot_de_passe: string;

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
  contact_fax?: string;

  @IsOptional()
  @ValidateIf((o) => o.contact_mail1 && o.contact_mail1.trim().length > 0)
  @IsEmail({}, { message: "L'email de contact principal doit être valide" })
  contact_mail1?: string;

  @IsOptional()
  @ValidateIf((o) => o.contact_mail2 && o.contact_mail2.trim().length > 0)
  @IsEmail({}, { message: "L'email de contact secondaire doit être valide" })
  contact_mail2?: string;

  @IsOptional()
  @IsString()
  contact_fonction?: string;

  @IsOptional()
  @IsString()
  @IsIn(['actif', 'inactif', 'suspendu', 'bloque'], {
    message: 'Le statut doit être: actif, inactif, suspendu, ou bloque',
  })
  statut?: string;
}

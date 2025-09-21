import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsIn,
  MinLength,
  ValidateIf,
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

  @IsString()
  @IsOptional()
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
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @MinLength(6, {
    message: 'Le mot de passe doit contenir au moins 6 caractères',
  })
  mot_de_passe: string;

  // Champs de contact - emails optionnels et validés seulement si non vides
  @IsOptional()
  @IsString()
  contact_tel1?: string;

  @IsOptional()
  @IsString()
  contact_tel2?: string;

  @IsOptional()
  @IsString()
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
}

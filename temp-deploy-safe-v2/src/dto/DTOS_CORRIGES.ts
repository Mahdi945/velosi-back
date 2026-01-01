/**
 * 🔒 DTOs AMÉLIORÉS AVEC VALIDATIONS COMPLÈTES
 * 
 * Ce fichier contient les versions corrigées des DTOs avec:
 * - Validations MaxLength pour prévenir les débordements
 * - Validations de format (IBAN, SWIFT, email, téléphone)
 * - Messages d'erreur clairs en français
 * - Protection contre les injections
 * 
 * @author GitHub Copilot
 * @date 2025-11-21
 * 
 * 📝 INSTRUCTIONS D'UTILISATION:
 * 1. Copier les sections nécessaires dans vos fichiers DTO existants
 * 2. Adapter les imports selon votre structure
 * 3. Tester les validations avec des données invalides
 */

import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEmail,
  IsEnum,
  IsBoolean,
  IsArray,
  IsInt,
  IsNumber,
  MaxLength,
  MinLength,
  Matches,
  Length,
  ValidateIf,
  IsDateString,
  IsIn,
  IsDecimal,
} from 'class-validator';
import { EtatFiscal } from '../entities/client.entity';

// ============================================
// CLIENT DTO - CORRIGÉ
// ============================================

export class CreateClientDtoSecure {
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom est requis' })
  @MaxLength(100, { message: 'Le nom ne peut pas dépasser 100 caractères' })
  @Matches(/^[a-zA-ZÀ-ÿ0-9\s\-\.,'&]+$/, { 
    message: 'Le nom contient des caractères non autorisés' 
  })
  nom: string;

  @IsOptional()
  @IsString({ message: "L'interlocuteur doit être une chaîne de caractères" })
  @MaxLength(100, { message: "L'interlocuteur ne peut pas dépasser 100 caractères" })
  @Matches(/^[a-zA-ZÀ-ÿ\s\-\.,']+$/, { 
    message: "L'interlocuteur contient des caractères non autorisés" 
  })
  interlocuteur?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Le type de client ne peut pas dépasser 20 caractères' })
  @IsIn(['particulier', 'entreprise', 'administration'], {
    message: 'Type de client invalide',
  })
  type_client?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'La catégorie ne peut pas dépasser 20 caractères' })
  @IsIn(['local', 'etranger'], {
    message: 'La catégorie doit être: local ou etranger',
  })
  categorie?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300, { message: "L'adresse ne peut pas dépasser 300 caractères" })
  adresse?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10, { message: 'Le code postal ne peut pas dépasser 10 caractères' })
  @Matches(/^[0-9A-Z\-\s]+$/, { message: 'Format de code postal invalide' })
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
  @MaxLength(20, { message: "L'ID fiscal ne peut pas dépasser 20 caractères" })
  @Matches(/^[0-9A-Z]+$/, { 
    message: "L'ID fiscal ne doit contenir que des chiffres et lettres majuscules" 
  })
  id_fiscal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Le code douane ne peut pas dépasser 20 caractères' })
  c_douane?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10, { message: 'La nature ne peut pas dépasser 10 caractères' })
  nature?: string;

  @IsOptional()
  @IsInt({ message: "Le nombre de jours d'échéance doit être un entier" })
  nbr_jour_ech?: number;

  @IsOptional()
  @IsEnum(EtatFiscal, {
    message: "L'état fiscal doit être: ASSUJETTI_TVA, SUSPENSION_TVA, ou EXONERE",
  })
  etat_fiscal?: EtatFiscal;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: "Le numéro d'autorisation ne peut pas dépasser 20 caractères" })
  n_auto?: string;

  @IsOptional()
  @IsDateString({}, { message: "Format de date d'autorisation invalide" })
  date_auto?: string;

  @IsOptional()
  @IsNumber({}, { message: 'La franchise doit être un nombre' })
  franchise_sur?: number;

  @IsOptional()
  @IsDateString({}, { message: 'Format de date de fin invalide' })
  date_fin?: string;

  @IsOptional()
  @IsBoolean({ message: 'Le blocage doit être un booléen' })
  blocage?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(3, { message: 'Le code devise ne peut pas dépasser 3 caractères' })
  @IsIn(['TND', 'EUR', 'USD', 'GBP', 'CHF'], {
    message: 'Devise non supportée',
  })
  devise?: string;

  @IsOptional()
  @IsBoolean()
  timbre?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Le compte comptable ne peut pas dépasser 20 caractères' })
  compte_cpt?: string;

  // ===== INFORMATIONS BANCAIRES =====

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Le nom de la banque ne peut pas dépasser 100 caractères' })
  banque?: string;

  @IsOptional()
  @IsString()
  @MaxLength(34, { message: "L'IBAN ne peut pas dépasser 34 caractères (norme ISO 13616)" })
  @Matches(/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/, {
    message: 'Format IBAN invalide (ex: TN5914207207100707129648)',
  })
  iban?: string;

  @IsOptional()
  @IsString()
  @MaxLength(24, { message: 'Le RIB ne peut pas dépasser 24 caractères' })
  @Matches(/^[0-9]+$/, { message: 'Le RIB ne doit contenir que des chiffres' })
  rib?: string;

  @IsOptional()
  @IsString()
  @MaxLength(11, { message: 'Le code SWIFT ne peut pas dépasser 11 caractères (norme ISO 9362)' })
  @Matches(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, {
    message: 'Format SWIFT/BIC invalide (ex: BIATTNTTXXX)',
  })
  swift?: string;

  @IsOptional()
  @IsString()
  @MaxLength(11, { message: 'Le BIC ne peut pas dépasser 11 caractères' })
  @Matches(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, {
    message: 'Format BIC invalide',
  })
  bic?: string;

  // ===== AUTRES CHAMPS =====

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: "Le secteur d'activité ne peut pas dépasser 100 caractères" })
  sec_activite?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Le chargé de clientèle ne peut pas dépasser 100 caractères' })
  charge_com?: string; // DEPRECATED

  @IsOptional()
  @IsArray({ message: 'Les IDs des commerciaux doivent être un tableau' })
  @IsInt({ each: true, message: 'Chaque ID commercial doit être un entier' })
  charge_com_ids?: number[];

  @IsOptional()
  @IsBoolean()
  stop_envoie_solde?: boolean;

  @IsOptional()
  @IsBoolean()
  maj_web?: boolean;

  @IsOptional()
  @IsNumber({}, { message: 'Le débit initial doit être un nombre' })
  d_initial?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Le crédit initial doit être un nombre' })
  c_initial?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Le solde doit être un nombre' })
  solde?: number;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @MaxLength(100, { message: 'Le mot de passe ne peut pas dépasser 100 caractères' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/, {
    message: 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre',
  })
  mot_de_passe?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Le chemin de la photo ne peut pas dépasser 255 caractères' })
  photo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Le statut ne peut pas dépasser 20 caractères' })
  @IsIn(['actif', 'inactif', 'suspendu', 'archive'], {
    message: 'Statut invalide',
  })
  statut?: string;

  @IsOptional()
  @IsBoolean()
  is_permanent?: boolean;

  @IsOptional()
  @IsBoolean()
  is_fournisseur?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Le code fournisseur ne peut pas dépasser 20 caractères' })
  code_fournisseur?: string;
}

// ============================================
// FOURNISSEUR DTO - CORRIGÉ
// ============================================

export class CreateFournisseurDtoSecure {
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Le code ne peut pas dépasser 20 caractères' })
  @Matches(/^[A-Z0-9\-]+$/, { 
    message: 'Le code ne doit contenir que des majuscules, chiffres et tirets' 
  })
  code?: string;

  @IsString({ message: 'Le nom est requis' })
  @IsNotEmpty({ message: 'Le nom ne peut pas être vide' })
  @MaxLength(100, { message: 'Le nom ne peut pas dépasser 100 caractères' })
  @Matches(/^[a-zA-ZÀ-ÿ0-9\s\-\.,'&]+$/, { 
    message: 'Le nom contient des caractères non autorisés' 
  })
  nom: string;

  @IsOptional()
  @IsString()
  @IsIn(['local', 'etranger'], { message: 'Type de fournisseur invalide' })
  typeFournisseur?: string;

  @IsOptional()
  @IsString()
  @IsIn(['personne_morale', 'personne_physique'], { message: 'Catégorie invalide' })
  categorie?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250, { message: "L'activité ne peut pas dépasser 250 caractères" })
  activite?: string;

  @IsOptional()
  @IsString()
  @IsIn(['mf', 'cin', 'passeport', 'carte_sejour', 'autre'], {
    message: 'Nature d\'identification invalide',
  })
  natureIdentification?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Le numéro d\'identification ne peut pas dépasser 20 caractères' })
  @Matches(/^[A-Z0-9]+$/, { 
    message: 'Le numéro d\'identification ne doit contenir que des lettres majuscules et chiffres' 
  })
  numeroIdentification?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Le code fiscal ne peut pas dépasser 20 caractères' })
  codeFiscal?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Format email invalide' })
  @MaxLength(100, { message: 'L\'email ne peut pas dépasser 100 caractères' })
  email?: string;

  @IsOptional()
  @ValidateIf((o) => o.telephone && o.telephone.trim().length > 0)
  @IsString()
  @Matches(/^[0-9+\-\s()]+$/, {
    message: 'Le téléphone ne peut contenir que des chiffres, +, -, espaces et parenthèses',
  })
  @Length(8, 20, {
    message: 'Le téléphone doit contenir entre 8 et 20 caractères',
  })
  telephone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(34, { message: 'Le RIB/IBAN ne peut pas dépasser 34 caractères' })
  ribIban?: string;

  @IsOptional()
  @IsString()
  @MaxLength(11, { message: 'Le code SWIFT ne peut pas dépasser 11 caractères' })
  swift?: string;

  // ... autres champs similaires avec MaxLength
}

// ============================================
// NAVIRE DTO - CORRIGÉ
// ============================================

export class CreateNavireDtoSecure {
  // ⚠️ AJOUT IMPORTANT: Le champ code est obligatoire et unique
  @IsString({ message: 'Le code est requis' })
  @IsNotEmpty({ message: 'Le code ne peut pas être vide' })
  @MaxLength(50, { message: 'Le code ne peut pas dépasser 50 caractères' })
  @Matches(/^[A-Z0-9\-]+$/, { 
    message: 'Le code ne doit contenir que des majuscules, chiffres et tirets' 
  })
  code: string;

  @IsString({ message: 'Le libellé est requis' })
  @IsNotEmpty({ message: 'Le libellé ne peut pas être vide' })
  @MaxLength(255, { message: 'Le libellé ne peut pas dépasser 255 caractères' })
  libelle: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La nationalité ne peut pas dépasser 100 caractères' })
  nationalite?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Le conducteur ne peut pas dépasser 255 caractères' })
  conducteur?: string;

  @IsOptional()
  @IsNumber({}, { message: 'La longueur doit être un nombre' })
  longueur?: number;

  @IsOptional()
  @IsNumber({}, { message: 'La largeur doit être un nombre' })
  largeur?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Le code OMI ne peut pas dépasser 50 caractères' })
  @Matches(/^[A-Z0-9]+$/, { message: 'Le code OMI doit contenir uniquement des lettres et chiffres' })
  codeOmi?: string;

  // ... autres champs
}

// ============================================
// PORT DTO - DÉJÀ BON MAIS EXEMPLE
// ============================================

export class CreatePortDtoSecure {
  @IsString()
  @IsNotEmpty({ message: 'Le libellé est requis' })
  @MaxLength(200, { message: 'Le libellé ne peut pas dépasser 200 caractères' })
  libelle: string;

  @IsString()
  @IsOptional()
  @MaxLength(10, { message: 'L\'abréviation ne peut pas dépasser 10 caractères' })
  @Matches(/^[A-Z]{2,5}[A-Z0-9]*$/, { 
    message: 'L\'abréviation doit suivre le format UN/LOCODE (ex: TNRAD)' 
  })
  abbreviation?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'La ville ne peut pas dépasser 100 caractères' })
  ville?: string;

  @IsString()
  @IsNotEmpty({ message: 'Le pays est requis' })
  @MaxLength(100, { message: 'Le pays ne peut pas dépasser 100 caractères' })
  pays: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// ============================================
// CONTACT CLIENT DTO - CORRIGÉ
// ============================================

export class CreateContactClientDtoSecure {
  @IsInt({ message: 'L\'ID du client doit être un entier' })
  id_client: number;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Le nom ne peut pas dépasser 100 caractères' })
  nom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Le prénom ne peut pas dépasser 100 caractères' })
  prenom?: string;

  @IsOptional()
  @ValidateIf((o) => o.tel1 && o.tel1.trim().length > 0)
  @IsString()
  @Matches(/^[0-9+\-\s()]+$/, {
    message: 'Le téléphone 1 ne peut contenir que des chiffres, +, -, espaces et parenthèses',
  })
  @Length(8, 20, {
    message: 'Le téléphone 1 doit contenir entre 8 et 20 caractères',
  })
  tel1?: string;

  @IsOptional()
  @ValidateIf((o) => o.mail1 && o.mail1.trim().length > 0)
  @IsEmail({}, { message: 'Format email invalide pour mail1' })
  @MaxLength(100, { message: 'L\'email ne peut pas dépasser 100 caractères' })
  mail1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La fonction ne peut pas dépasser 100 caractères' })
  fonction?: string;

  @IsOptional()
  @IsBoolean()
  is_principal?: boolean;
}

/**
 * 📝 NOTES D'IMPLÉMENTATION:
 * 
 * 1. Copier les DTOs pertinents dans vos fichiers existants
 * 2. Adapter les imports selon votre structure de dossiers
 * 3. Mettre à jour les tests unitaires pour vérifier les validations
 * 4. Tester avec des données invalides pour confirmer les validations
 * 
 * 🧪 TESTS RECOMMANDÉS:
 * 
 * ```typescript
 * describe('CreateClientDtoSecure', () => {
 *   it('devrait rejeter un nom trop long', async () => {
 *     const dto = new CreateClientDtoSecure();
 *     dto.nom = 'a'.repeat(101);
 *     const errors = await validate(dto);
 *     expect(errors.length).toBeGreaterThan(0);
 *   });
 * 
 *   it('devrait rejeter un IBAN invalide', async () => {
 *     const dto = new CreateClientDtoSecure();
 *     dto.iban = 'INVALID123';
 *     const errors = await validate(dto);
 *     expect(errors.length).toBeGreaterThan(0);
 *   });
 * });
 * ```
 */

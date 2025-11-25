import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDate,
  IsArray,
  ValidateNested,
  IsEmail,
  Min,
  Max,
  IsBoolean,
  IsInt,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Enums
export enum QuoteStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  VIEWED = 'viewed',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum QuoteItemCategory {
  GROUPAGE = 'groupage', // LCL
  COMPLET = 'complet', // FCL
  ROUTIER = 'routier',
  AERIEN_NORMALE = 'aerien_normale',
  AERIEN_EXPRESSE = 'aerien_expresse',
}

export enum VehicleType {
  VAN = 'van',
  TRUCK_3_5T = 'truck_3_5t',
  TRUCK_7_5T = 'truck_7_5t',
  TRUCK_12T = 'truck_12t',
  TRUCK_19T = 'truck_19t',
  TRUCK_26T = 'truck_26t',
  SEMI_TRAILER = 'semi_trailer',
  CONTAINER = 'container',
}

// ServiceType n'est plus un enum mais une string VARCHAR
// Valeurs possibles: "avec_livraison" ou "sans_livraison"

// DTO pour les lignes de devis
export class CreateQuoteItemDto {
  @IsString()
  description: string;

  @IsOptional()
  @IsEnum(QuoteItemCategory)
  category?: QuoteItemCategory;

  @IsOptional()
  @IsString()
  vehicleDescription?: string;

  @IsOptional()
  @IsString()
  cargoDesignation?: string;

  @IsOptional()
  @IsNumber()
  packagesCount?: number;

  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @IsOptional()
  @IsString()
  originStreet?: string;

  @IsOptional()
  @IsString()
  originCity?: string;

  @IsOptional()
  @IsString()
  originPostalCode?: string;

  @IsOptional()
  @IsString()
  originCountry?: string;

  @IsOptional()
  @IsString()
  destinationStreet?: string;

  @IsOptional()
  @IsString()
  destinationCity?: string;

  @IsOptional()
  @IsString()
  destinationPostalCode?: string;

  @IsOptional()
  @IsString()
  destinationCountry?: string;

  @IsOptional()
  @IsNumber()
  distanceKm?: number;

  @IsOptional()
  @IsNumber()
  volumeM3?: number;

  // 🆕 Dimensions pour calcul de volume (aérien/groupage)
  @IsOptional()
  @IsNumber()
  lengthCm?: number;

  @IsOptional()
  @IsNumber()
  widthCm?: number;

  @IsOptional()
  @IsNumber()
  heightCm?: number;

  // 🆕 Poids volumétrique calculé
  @IsOptional()
  @IsNumber()
  volumetricWeight?: number;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  // Service type devient string (VARCHAR)
  @IsOptional()
  @IsString()
  serviceType?: string;

  // 💱 Devise de la ligne (fret peut avoir différentes devises, frais annexes toujours TND)
  @IsOptional()
  @IsString()
  currency?: string;

  // Taux de conversion pour transformation en TND (nullable)
  // Exemple: 1 USD = 3.15 TND, donc conversionRate = 3.15
  // Exemple: 1 EUR = 3.35 TND, donc conversionRate = 3.35
  @IsOptional()
  @IsNumber()
  @Min(0)
  conversionRate?: number;

  // 🆕 Unité de mesure (ex: 40HC, TONNE, M3, PIECE, etc.)
  @IsOptional()
  @IsString()
  unit?: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @IsOptional()
  @IsString()
  itemType?: string;

  @IsOptional()
  @IsNumber()
  lineOrder?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  // 🆕 TAXATION PAR LIGNE
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsBoolean()
  isTaxable?: boolean;

  @IsOptional()
  @IsString()
  taxableAccount?: string;

  @IsOptional()
  @IsString()
  nonTaxableAccount?: string;

  // 🆕 CLASSIFICATION
  @IsOptional()
  @IsBoolean()
  isDebours?: boolean;

  @IsOptional()
  @IsString()
  caType?: string;
}

export class UpdateQuoteItemDto extends CreateQuoteItemDto {
  @IsOptional()
  @IsNumber()
  id?: number;
}

// DTO pour créer un devis
export class CreateQuoteDto {
  @IsString()
  title: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value.id !== undefined) return Number(value.id);
    const parsed = Number(value);
    return isNaN(parsed) ? null : parsed;
  })
  @IsNumber()
  opportunityId?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value.id !== undefined) return Number(value.id);
    const parsed = Number(value);
    return isNaN(parsed) ? null : parsed;
  })
  @IsNumber()
  leadId?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value.id !== undefined) return Number(value.id);
    const parsed = Number(value);
    return isNaN(parsed) ? null : parsed;
  })
  @IsNumber()
  clientId?: number;

  @Type(() => Date)
  @IsDate()
  validUntil: Date;

  @IsString()
  clientName: string;

  @IsString()
  clientCompany: string;

  @IsEmail()
  clientEmail: string;

  @IsOptional()
  @IsString()
  clientPhone?: string;

  @IsOptional()
  @IsString()
  clientAddress?: string;

  // Champs spécifiques transport
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  tiers?: string;

  @IsOptional()
  @IsString()
  attentionTo?: string;

  @IsOptional()
  @IsString()
  pickupLocation?: string;

  @IsOptional()
  @IsString()
  deliveryLocation?: string;

  @IsOptional()
  @IsString()
  transitTime?: string;

  @IsOptional()
  @IsString()
  departureFrequency?: string;

  @IsOptional()
  @IsString()
  clientType?: string;

  @IsOptional()
  @IsString()
  importExport?: string;

  @IsOptional()
  @IsString()
  fileStatus?: string;

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  paymentConditions?: string;

  @IsOptional()
  @IsString()
  requester?: string;

  @IsOptional()
  @IsNumber()
  vehicleId?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  deliveryTerms?: string;

  @IsOptional()
  @IsString()
  termsConditions?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  internalInstructions?: string;

  @IsOptional()
  @IsString()
  customerRequest?: string;

  @IsOptional()
  @IsString()
  exchangeNotes?: string;

  @IsOptional()
  @IsNumber()
  commercialId?: number; // 🔴 Ancien - compatibilité

  // ✅ NOUVEAU SYSTÈME - Array de commerciaux
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => parseInt(v));
    return [parseInt(value)];
  })
  commercialIds?: number[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteItemDto)
  items: CreateQuoteItemDto[];
}

export class UpdateQuoteDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(QuoteStatus)
  status?: QuoteStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  validUntil?: Date;

  // ✅ CORRECTION: Permettre la mise à jour des IDs de liaison (opportunité, lead, client)
  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value.id !== undefined) return Number(value.id);
    const parsed = Number(value);
    return isNaN(parsed) ? null : parsed;
  })
  @IsNumber()
  opportunityId?: number | null;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value.id !== undefined) return Number(value.id);
    const parsed = Number(value);
    return isNaN(parsed) ? null : parsed;
  })
  @IsNumber()
  leadId?: number | null;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value.id !== undefined) return Number(value.id);
    const parsed = Number(value);
    return isNaN(parsed) ? null : parsed;
  })
  @IsNumber()
  clientId?: number | null;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsString()
  clientCompany?: string;

  @IsOptional()
  @IsEmail()
  clientEmail?: string;

  @IsOptional()
  @IsString()
  clientPhone?: string;

  @IsOptional()
  @IsString()
  clientAddress?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  tiers?: string;

  @IsOptional()
  @IsString()
  attentionTo?: string;

  @IsOptional()
  @IsString()
  pickupLocation?: string;

  @IsOptional()
  @IsString()
  deliveryLocation?: string;

  @IsOptional()
  @IsString()
  transitTime?: string;

  @IsOptional()
  @IsString()
  departureFrequency?: string;

  @IsOptional()
  @IsString()
  clientType?: string;

  @IsOptional()
  @IsString()
  importExport?: string;

  @IsOptional()
  @IsString()
  fileStatus?: string;

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  paymentConditions?: string;

  @IsOptional()
  @IsString()
  requester?: string;

  @IsOptional()
  @IsNumber()
  vehicleId?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  deliveryTerms?: string;

  @IsOptional()
  @IsString()
  termsConditions?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  internalInstructions?: string;

  @IsOptional()
  @IsString()
  customerRequest?: string;

  @IsOptional()
  @IsString()
  exchangeNotes?: string;

  @IsOptional()
  @IsNumber()
  commercialId?: number; // 🔴 Ancien - compatibilité

  // ✅ NOUVEAU SYSTÈME - Array de commerciaux
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => parseInt(v));
    return [parseInt(value)];
  })
  commercialIds?: number[];

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  // 🆕 Champs de transport pour fiche dossier
  @IsOptional()
  @IsNumber()
  armateurId?: number;

  @IsOptional()
  @IsNumber()
  navireId?: number;

  @IsOptional()
  @IsNumber()
  portEnlevementId?: number;

  @IsOptional()
  @IsNumber()
  portLivraisonId?: number;

  @IsOptional()
  @IsNumber()
  aeroportEnlevementId?: number;

  @IsOptional()
  @IsNumber()
  aeroportLivraisonId?: number;

  @IsOptional()
  @IsString()
  hbl?: string;

  @IsOptional()
  @IsString()
  mbl?: string;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateQuoteItemDto)
  items?: UpdateQuoteItemDto[];
}

// DTO pour les actions sur les devis
export class SendQuoteDto {
  @IsEmail()
  recipientEmail: string;

  @IsOptional()
  @IsString()
  emailSubject?: string;

  @IsOptional()
  @IsString()
  emailBody?: string;

  @IsOptional()
  @IsBoolean()
  sendCopy?: boolean;
}

export class AcceptQuoteDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  convertToClient?: boolean;

  // Champs pour fiche dossier
  @IsOptional()
  @IsNumber()
  armateurId?: number;

  @IsOptional()
  @IsNumber()
  navireId?: number;

  @IsOptional()
  @IsNumber()
  portEnlevementId?: number;

  @IsOptional()
  @IsNumber()
  portLivraisonId?: number;

  @IsOptional()
  @IsNumber()
  aeroportEnlevementId?: number;

  @IsOptional()
  @IsNumber()
  aeroportLivraisonId?: number;

  @IsOptional()
  @IsString()
  hbl?: string;

  @IsOptional()
  @IsString()
  mbl?: string;

  @IsOptional()
  @IsString()
  condition?: string;
}

export class RejectQuoteDto {
  @IsString()
  reason: string;
}

// DTO pour les filtres
export class QuoteFilterDto {
  @IsOptional()
  @IsEnum(QuoteStatus)
  status?: QuoteStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  opportunityId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  leadId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  clientId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  commercialId?: number; // 🔴 Ancien - pour compatibilité filtres

  // ✅ NOUVEAU - Filtre par array de commerciaux
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => parseInt(v));
    return [parseInt(value)];
  })
  commercialIds?: number[];

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  type?: 'cotation' | 'fiche_dossier'; // 🆕 Filtre par type

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isArchived?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minTotal?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxTotal?: number;

  @IsOptional()
  @IsString()
  importExport?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  // ✅ Pas de limite maximale pour permettre le chargement de toutes les cotations côté client
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}

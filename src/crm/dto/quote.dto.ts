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
} from 'class-validator';
import { Type } from 'class-transformer';

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
  GROUPAGE = 'groupage',
  AERIEN = 'aerien',
  ROUTIER = 'routier',
  COMPLET = 'complet',
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

export enum ServiceType {
  PICKUP_DELIVERY = 'pickup_delivery',
  DOOR_TO_DOOR = 'door_to_door',
  EXPRESS_DELIVERY = 'express_delivery',
  SCHEDULED_DELIVERY = 'scheduled_delivery',
  SAME_DAY = 'same_day',
  NEXT_DAY = 'next_day',
  WAREHOUSING = 'warehousing',
  PACKAGING = 'packaging',
  INSURANCE = 'insurance',
}

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

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsOptional()
  @IsEnum(ServiceType)
  serviceType?: ServiceType;

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
  @IsNumber()
  opportunityId?: number;

  @IsOptional()
  @IsNumber()
  leadId?: number;

  @IsOptional()
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
  commercialId?: number;

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
  commercialId?: number;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

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
  commercialId?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}

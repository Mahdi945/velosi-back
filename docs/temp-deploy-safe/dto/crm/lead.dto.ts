import { IsEmail, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsArray, IsString, IsDateString, IsBoolean, IsInt, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { LeadSource, LeadStatus, Priority } from '../../entities/crm/lead.entity';
import { TransportType, TrafficType } from '../../entities/crm/opportunity.entity';

export class CreateLeadDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200, { message: 'Le nom complet ne peut pas dépasser 200 caractères' })
  fullName: string;

  @IsEmail()
  @MaxLength(100, { message: "L'email ne peut pas dépasser 100 caractères" })
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Le téléphone ne peut pas dépasser 20 caractères' })
  phone?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200, { message: "Le nom de l'entreprise ne peut pas dépasser 200 caractères" })
  company: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Le poste ne peut pas dépasser 100 caractères' })
  position?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Le site web ne peut pas dépasser 200 caractères' })
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: "L'industrie ne peut pas dépasser 100 caractères" })
  industry?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    return parseInt(value);
  })
  employeeCount?: number;

  @IsEnum(LeadSource)
  source: LeadSource;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transportNeeds?: string[];

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  annualVolume?: number;

  @IsOptional()
  @IsString()
  currentProvider?: string;

  @IsOptional()
  @IsDateString()
  contractEndDate?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsBoolean()
  isLocal?: boolean;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  assignedToId?: number;

  // ✅ NOUVEAU SYSTÈME - Array de commerciaux
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => parseInt(v));
    return [parseInt(value)];
  })
  assignedToIds?: number[];

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  estimatedValue?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  nextFollowupDate?: string;

  @IsOptional()
  @IsEnum(TrafficType)
  traffic?: TrafficType;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    return parseInt(value);
  })
  employeeCount?: number;

  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transportNeeds?: string[];

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  annualVolume?: number;

  @IsOptional()
  @IsString()
  currentProvider?: string;

  @IsOptional()
  @IsDateString()
  contractEndDate?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsBoolean()
  isLocal?: boolean;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  assignedToId?: number;

  // ✅ NOUVEAU SYSTÈME - Array de commerciaux
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => parseInt(v));
    return [parseInt(value)];
  })
  assignedToIds?: number[];

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  estimatedValue?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  nextFollowupDate?: string;

  @IsOptional()
  @IsEnum(TrafficType)
  traffic?: TrafficType;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class LeadQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  assignedToId?: number;

  // ✅ NOUVEAU: Filtrage multi-commercial (pluriel)
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => parseInt(v));
    return [parseInt(value)];
  })
  assignedToIds?: number[];

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsBoolean()
  isLocal?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isArchived?: boolean;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class ConvertLeadDto {
  @IsNotEmpty()
  @IsString()
  opportunityTitle: string;

  @IsOptional()
  @IsString()
  opportunityDescription?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  opportunityValue?: number;

  @IsOptional()
  @IsString()
  currency?: string; // 💱 Code ISO de la devise (EUR, USD, TND, etc.)

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @IsOptional()
  @IsString()
  originAddress?: string;

  @IsOptional()
  @IsString()
  destinationAddress?: string;

  @IsOptional()
  @IsEnum(TransportType)
  transportType?: TransportType;

  @IsOptional()
  @IsEnum(TrafficType)
  traffic?: TrafficType;

  @IsOptional()
  @IsString()
  serviceFrequency?: string;

  @IsOptional()
  @IsString()
  specialRequirements?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  probability?: number;

  @IsOptional()
  @IsString()
  priority?: string;
}
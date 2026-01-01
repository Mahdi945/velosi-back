import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  IsArray,
  IsBoolean,
  Min,
  Max,
  IsNotEmpty,
  IsInt,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { OpportunityStage, TransportType, ServiceFrequency, Priority, TrafficType } from '../../entities/crm/opportunity.entity';

export class CreateOpportunityDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200, { message: 'Le titre ne peut pas dépasser 200 caractères' })
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'La description ne peut pas dépasser 2000 caractères' })
  description?: string;

  @IsOptional()
  @IsInt()
  leadId?: number;

  @IsOptional()
  @IsInt()
  clientId?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value) || 0)
  value?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => parseInt(value) || 0)
  probability?: number = 0;

  @IsOptional()
  @IsEnum(OpportunityStage)
  stage?: OpportunityStage = OpportunityStage.PROSPECTING;

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300, { message: "L'adresse d'origine ne peut pas dépasser 300 caractères" })
  originAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'L\'adresse de destination ne peut pas dépasser 300 caractères' })
  destinationAddress?: string;

  @IsOptional()
  @IsEnum(TransportType)
  transportType?: TransportType;

  @IsOptional()
  @IsEnum(TrafficType)
  traffic?: TrafficType;

  @IsOptional()
  @IsEnum(ServiceFrequency)
  serviceFrequency?: ServiceFrequency;

  @IsOptional()
  @IsInt()
  engineType?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Les exigences spéciales ne peuvent pas dépasser 1000 caractères' })
  specialRequirements?: string;

  @IsOptional()
  @IsInt()
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
  @IsString()
  @MaxLength(100, { message: 'La source ne peut pas dépasser 100 caractères' })
  source?: string = 'inbound';

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority = Priority.MEDIUM;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[] = [];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  competitors?: string[] = [];

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'La description de gain ne peut pas dépasser 1000 caractères' })
  wonDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La raison de perte ne peut pas dépasser 500 caractères' })
  lostReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Le concurrent ne peut pas dépasser 200 caractères' })
  lostToCompetitor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3, { message: 'Le code devise ne peut pas dépasser 3 caractères' })
  currency?: string;
}

export class UpdateOpportunityDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  value?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  probability?: number;

  @IsOptional()
  @IsEnum(OpportunityStage)
  stage?: OpportunityStage;

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @IsOptional()
  @IsDateString()
  actualCloseDate?: string;

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
  @IsEnum(ServiceFrequency)
  serviceFrequency?: ServiceFrequency;

  @IsOptional()
  @IsInt()
  engineType?: number;

  @IsOptional()
  @IsString()
  specialRequirements?: string;

  @IsOptional()
  @IsInt()
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
  @IsString()
  source?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  competitors?: string[];

  @IsOptional()
  @IsString()
  wonDescription?: string;

  @IsOptional()
  @IsString()
  lostReason?: string;

  @IsOptional()
  @IsString()
  lostToCompetitor?: string;
}

export class OpportunityQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(OpportunityStage)
  stage?: OpportunityStage;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsInt()
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
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  leadId?: number;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsEnum(TransportType)
  transportType?: TransportType;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  minValue?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  maxValue?: number;

  @IsOptional()
  @IsDateString()
  expectedCloseDateFrom?: string;

  @IsOptional()
  @IsDateString()
  expectedCloseDateTo?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isArchived?: boolean;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value) || 1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => Math.min(100, Math.max(1, parseInt(value) || 25)))
  limit?: number = 25;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

// DTO pour améliorer la conversion depuis ConvertLeadDto existant
export class ConvertLeadToOpportunityDto {
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
  @IsDateString()
  expectedCloseDate?: string;

  @IsOptional()
  @IsEnum(TransportType)
  transportType?: TransportType;

  @IsOptional()
  @IsEnum(TrafficType)
  traffic?: TrafficType;

  @IsOptional()
  @IsString()
  originAddress?: string;

  @IsOptional()
  @IsString()
  destinationAddress?: string;

  @IsOptional()
  @IsEnum(ServiceFrequency)
  serviceFrequency?: ServiceFrequency;

  @IsOptional()
  @IsInt()
  engineType?: number;

  @IsOptional()
  @IsString()
  specialRequirements?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number = 25;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority = Priority.MEDIUM;

  @IsOptional()
  @IsString()
  currency?: string; // 💱 Code ISO de la devise

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  assignedToIds?: number[]; // ✅ Array de commerciaux pour système 1:N
}

export class MoveOpportunityDto {
  @IsNotEmpty()
  @IsEnum(OpportunityStage)
  toStage: OpportunityStage;
}
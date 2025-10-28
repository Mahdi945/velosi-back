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
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { OpportunityStage, TransportType, ServiceFrequency, Priority, TrafficType } from '../../entities/crm/opportunity.entity';

export class CreateOpportunityDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
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

  @IsOptional()
  @IsString()
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
  wonDescription?: string;

  @IsOptional()
  @IsString()
  lostReason?: string;

  @IsOptional()
  @IsString()
  lostToCompetitor?: string;
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
}

export class MoveOpportunityDto {
  @IsNotEmpty()
  @IsEnum(OpportunityStage)
  toStage: OpportunityStage;
}
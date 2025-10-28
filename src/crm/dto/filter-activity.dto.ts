import {
  IsOptional,
  IsEnum,
  IsNumber,
  IsString,
  IsDateString,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ActivityType,
  ActivityStatus,
  ActivityPriority,
} from '../entities/activity.entity';

export class FilterActivityDto {
  @IsOptional()
  @IsEnum(ActivityType)
  type?: ActivityType;

  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  @IsOptional()
  @IsEnum(ActivityPriority)
  priority?: ActivityPriority;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  leadId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  opportunityId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  quoteId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  clientId?: number;

  @IsOptional()
  @IsString()
  linkedTo?: 'prospect' | 'opportunity' | 'client' | 'quote'; // ✅ NOUVEAU: Filtre par type de liaison

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  assignedTo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  createdBy?: number;

  @IsOptional()
  @IsDateString()
  scheduledFrom?: string;

  @IsOptional()
  @IsDateString()
  scheduledTo?: string;

  @IsOptional()
  @IsDateString()
  dueFrom?: string;

  @IsOptional()
  @IsDateString()
  dueTo?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

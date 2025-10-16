import {
  IsOptional,
  IsEnum,
  IsNumber,
  IsString,
  IsDateString,
  IsArray,
} from 'class-validator';
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
  @IsNumber()
  leadId?: number;

  @IsOptional()
  @IsNumber()
  opportunityId?: number;

  @IsOptional()
  @IsNumber()
  quoteId?: number;

  @IsOptional()
  @IsNumber()
  clientId?: number;

  @IsOptional()
  @IsNumber()
  assignedTo?: number;

  @IsOptional()
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

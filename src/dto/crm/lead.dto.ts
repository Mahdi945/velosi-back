import { IsEmail, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsArray, IsString, IsDateString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { LeadSource, LeadStatus, Priority } from '../../entities/crm/lead.entity';

export class CreateLeadDto {
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsNotEmpty()
  @IsString()
  company: string;

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
  @Transform(({ value }) => parseInt(value))
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
  @Transform(({ value }) => parseInt(value))
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

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsBoolean()
  isLocal?: boolean;

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
  @IsDateString()
  expectedCloseDate?: string;

  @IsOptional()
  @IsString()
  originAddress?: string;

  @IsOptional()
  @IsString()
  destinationAddress?: string;

  @IsOptional()
  @IsString()
  transportType?: string;

  @IsOptional()
  @IsString()
  serviceFrequency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vehicleTypes?: string[];

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
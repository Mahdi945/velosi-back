import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsDateString,
  ValidateNested,
  MaxLength,
  IsInt,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  ActivityType,
  ActivityStatus,
  ActivityPriority,
} from '../entities/activity.entity';
import {
  ParticipantType,
  ResponseStatus,
} from '../entities/activity-participant.entity';

export class CreateActivityParticipantDto {
  @IsEnum(ParticipantType)
  participantType: ParticipantType;

  @IsOptional()
  @IsNumber()
  personnelId?: number;

  @IsString()
  @MaxLength(255)
  fullName: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEnum(ResponseStatus)
  responseStatus?: ResponseStatus;
}

export class CreateActivityDto {
  @IsEnum(ActivityType)
  type: ActivityType;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  @IsOptional()
  @IsEnum(ActivityPriority)
  priority?: ActivityPriority;

  // Relations CRM
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

  // Dates et durée
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  durationMinutes?: number;

  @IsOptional()
  @IsDateString()
  reminderAt?: string;

  // Localisation
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  meetingLink?: string;

  // Gestion
  @IsOptional()
  @IsNumber()
  assignedTo?: number; // 🔴 Ancien - compatibilité

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
  createdBy?: number; // Sera rempli automatiquement par le controller depuis le JWT

  // Résultats
  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsString()
  nextSteps?: string;

  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  // Récurrence
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  recurringPattern?: any;

  @IsOptional()
  @IsNumber()
  parentActivityId?: number;

  // Métadonnées
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  // Pièces jointes (métadonnées uniquement, les fichiers sont gérés séparément)
  @IsOptional()
  @IsArray()
  attachments?: Array<{
    fileName: string;
    originalName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: Date;
  }>;

  // Participants
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateActivityParticipantDto)
  participants?: CreateActivityParticipantDto[];
}

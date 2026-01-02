import { IsNumber, IsString, IsOptional, IsBoolean, IsEnum, IsDate } from 'class-validator';
import { Transform } from 'class-transformer';

export enum UserType {
  PERSONNEL = 'personnel',
  CLIENT = 'client'
}

export class UnifiedUserDto {
  @IsNumber()
  id: number;

  // Champs pour personnel
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  prenom?: string;

  @IsOptional()
  @IsString()
  poste?: string;

  // Champs pour client
  @IsOptional()
  @IsString()
  interlocuteur?: string;

  @IsOptional()
  @IsString()
  societe?: string;

  @IsOptional()
  @IsNumber()
  charge_com?: number;

  // Champs communs
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsBoolean()
  is_chat_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @IsOptional()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  @IsDate()
  lastSeen?: Date;

  @IsEnum(UserType)
  user_type: UserType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  info?: string; // poste pour personnel, societe pour client
}

export class VeChatConversationDto {
  @IsNumber()
  id: number;

  @IsNumber()
  participant1_id: number;

  @IsString()
  participant1_type: string;

  @IsString()
  participant1_name: string;

  @IsOptional()
  @IsString()
  participant1_photo?: string;

  @IsNumber()
  participant2_id: number;

  @IsString()
  participant2_type: string;

  @IsString()
  participant2_name: string;

  @IsOptional()
  @IsString()
  participant2_photo?: string;

  @IsOptional()
  @IsString()
  last_message?: string;

  @IsOptional()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  @IsDate()
  last_message_at?: Date;

  @IsOptional()
  @IsNumber()
  unread_count?: number;

  @Transform(({ value }) => new Date(value))
  @IsDate()
  created_at: Date;

  @Transform(({ value }) => new Date(value))
  @IsDate()
  updated_at: Date;
}

export class VeChatMessageDto {
  @IsNumber()
  id: number;

  @IsNumber()
  conversation_id: number;

  @IsNumber()
  sender_id: number;

  @IsString()
  sender_type: string;

  @IsString()
  sender_name: string;

  @IsOptional()
  @IsString()
  sender_photo?: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  message_type?: string;

  @IsOptional()
  @IsString()
  file_url?: string;

  @IsOptional()
  @IsString()
  file_name?: string;

  @IsOptional()
  @IsString()
  file_type?: string;

  @IsOptional()
  @IsNumber()
  file_size?: number;

  @IsOptional()
  @IsBoolean()
  is_read?: boolean;

  @Transform(({ value }) => new Date(value))
  @IsDate()
  created_at: Date;

  @Transform(({ value }) => new Date(value))
  @IsDate()
  updated_at: Date;
}

export class CreateConversationDto {
  @IsNumber()
  participant1_id: number;

  @IsString()
  participant1_type: string;

  @IsNumber()
  participant2_id: number;

  @IsString()
  participant2_type: string;
}

export class SendMessageDto {
  @IsNumber()
  conversation_id: number;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  message_type?: string;

  @IsOptional()
  @IsString()
  file_url?: string;

  @IsOptional()
  @IsString()
  file_name?: string;

  @IsOptional()
  @IsString()
  file_type?: string;

  @IsOptional()
  @IsNumber()
  file_size?: number;
}
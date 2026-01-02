import { IsNotEmpty, IsString, IsOptional, IsNumber, IsEnum, IsArray, IsBoolean } from 'class-validator';

export class CreateMessageDto {
  @IsNumber()
  @IsNotEmpty()
  receiver_id: number;

  @IsEnum(['personnel', 'client'])
  @IsNotEmpty()
  receiver_type: 'personnel' | 'client';

  @IsString()
  @IsOptional()
  message?: string;

  @IsEnum(['text', 'file', 'image', 'voice', 'video', 'audio', 'location'])
  @IsOptional()
  message_type?: 'text' | 'file' | 'image' | 'voice' | 'video' | 'audio' | 'location' = 'text';

  @IsString()
  @IsOptional()
  file_url?: string;

  @IsString()
  @IsOptional()
  file_name?: string;

  @IsNumber()
  @IsOptional()
  file_size?: number;

  @IsString()
  @IsOptional()
  file_type?: string;

  @IsNumber()
  @IsOptional()
  reply_to_message_id?: number;

  // Champs pour la localisation
  @IsNumber()
  @IsOptional()
  location_latitude?: number;

  @IsNumber()
  @IsOptional()
  location_longitude?: number;

  @IsNumber()
  @IsOptional()
  location_accuracy?: number;

  // Champs pour l'audio
  @IsNumber()
  @IsOptional()
  audio_duration?: number;

  @IsString()
  @IsOptional()
  audio_waveform?: string;

  // Objet location_data pour faciliter l'envoi depuis le frontend
  @IsOptional()
  location_data?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp?: number;
  };
}

export class UpdateMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class MarkReadDto {
  @IsArray()
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  messageIds: number[];
}

export class CreateConversationDto {
  @IsNumber()
  @IsNotEmpty()
  participant1_id: number;

  @IsEnum(['personnel', 'client'])
  @IsNotEmpty()
  participant1_type: 'personnel' | 'client';

  @IsNumber()
  @IsNotEmpty()
  participant2_id: number;

  @IsEnum(['personnel', 'client'])
  @IsNotEmpty()
  participant2_type: 'personnel' | 'client';
}

export class UpdatePresenceDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsEnum(['personnel', 'client'])
  @IsNotEmpty()
  userType: 'personnel' | 'client';

  @IsEnum(['online', 'offline', 'away', 'busy'])
  @IsNotEmpty()
  status: 'online' | 'offline' | 'away' | 'busy';
}

export class UpdateUserSettingsDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsEnum(['personnel', 'client'])
  @IsNotEmpty()
  userType: 'personnel' | 'client';

  @IsBoolean()
  @IsOptional()
  email_notifications?: boolean;

  @IsBoolean()
  @IsOptional()
  push_notifications?: boolean;

  @IsBoolean()
  @IsOptional()
  sound_notifications?: boolean;

  @IsEnum(['light', 'dark', 'auto'])
  @IsOptional()
  theme?: 'light' | 'dark' | 'auto';

  @IsEnum(['small', 'medium', 'large'])
  @IsOptional()
  font_size?: 'small' | 'medium' | 'large';

  @IsBoolean()
  @IsOptional()
  show_online_status?: boolean;

  @IsBoolean()
  @IsOptional()
  show_read_receipts?: boolean;
}

export class ArchiveConversationDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsEnum(['personnel', 'client'])
  @IsNotEmpty()
  userType: 'personnel' | 'client';
}

export class MuteConversationDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsEnum(['personnel', 'client'])
  @IsNotEmpty()
  userType: 'personnel' | 'client';

  @IsBoolean()
  @IsNotEmpty()
  muted: boolean;
}

export class DeleteMessageDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsEnum(['personnel', 'client'])
  @IsNotEmpty()
  userType: 'personnel' | 'client';
}
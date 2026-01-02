import { IsNumber, IsOptional, IsString, IsIn, Min, Max, IsBoolean } from 'class-validator';

export class LocationUpdateDto {
  @IsNumber({}, { message: 'La latitude doit être un nombre' })
  @Min(-90, { message: 'La latitude doit être supérieure ou égale à -90' })
  @Max(90, { message: 'La latitude doit être inférieure ou égale à 90' })
  latitude: number;

  @IsNumber({}, { message: 'La longitude doit être un nombre' })
  @Min(-180, { message: 'La longitude doit être supérieure ou égale à -180' })
  @Max(180, { message: 'La longitude doit être inférieure ou égale à 180' })
  longitude: number;

  @IsOptional()
  @IsNumber({}, { message: 'La précision doit être un nombre' })
  @Min(0, { message: 'La précision doit être positive' })
  accuracy?: number;

  @IsOptional()
  @IsString({ message: 'La source doit être une chaîne de caractères' })
  @IsIn(['gps', 'network', 'passive', 'fused', 'unknown'], {
    message: 'Source invalide (gps, network, passive, fused, unknown)'
  })
  source?: string;
}

export class LocationTrackingToggleDto {
  @IsBoolean({ message: 'Le statut doit être un booléen' })
  enabled: boolean;
}

export class LocationSearchDto {
  @IsNumber({}, { message: 'La latitude doit être un nombre' })
  @Min(-90, { message: 'La latitude doit être supérieure ou égale à -90' })
  @Max(90, { message: 'La latitude doit être inférieure ou égale à 90' })
  latitude: number;

  @IsNumber({}, { message: 'La longitude doit être un nombre' })
  @Min(-180, { message: 'La longitude doit être supérieure ou égale à -180' })
  @Max(180, { message: 'La longitude doit être inférieure ou égale à 180' })
  longitude: number;

  @IsOptional()
  @IsNumber({}, { message: 'Le rayon doit être un nombre' })
  @Min(0.1, { message: 'Le rayon doit être supérieur à 0.1 km' })
  @Max(100, { message: 'Le rayon doit être inférieur à 100 km' })
  radius?: number;
}

export class LocationResponseDto {
  id: number;
  nom: string;
  prenom: string;
  role: string;
  latitude: number | null;
  longitude: number | null;
  last_location_update: Date | null;
  location_accuracy: number | null;
  location_source: string;
  is_location_active: boolean;
  location_tracking_enabled: boolean;
}

export class LocationStatsResponseDto {
  totalPersonnel: number;
  trackingEnabled: number;
  currentlyActive: number;
  withPosition: number;
  lastHourUpdates: number;
}

export class PersonnelLocationUpdateEvent {
  personnelId: number;
  nom: string;
  prenom: string;
  role: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  source: string;
  timestamp: Date;
  isActive: boolean;
}

export class PersonnelTrackingStatusEvent {
  personnelId: number;
  nom: string;
  prenom: string;
  trackingEnabled: boolean;
}
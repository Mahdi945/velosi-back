import { IsString, IsNotEmpty, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAeroportDto {
  @ApiProperty({ description: 'Nom complet de l\'aéroport', example: 'Aéroport International de Tunis-Carthage' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  libelle: string;

  @ApiPropertyOptional({ description: 'Code IATA ou ICAO de l\'aéroport', example: 'TUN' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  abbreviation?: string;

  @ApiPropertyOptional({ description: 'Ville de l\'aéroport', example: 'Tunis' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  ville?: string;

  @ApiProperty({ description: 'Pays de l\'aéroport', example: 'Tunisie' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  pays: string;

  @ApiPropertyOptional({ description: 'Statut actif/inactif', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateAeroportDto {
  @ApiPropertyOptional({ description: 'Nom complet de l\'aéroport' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  libelle?: string;

  @ApiPropertyOptional({ description: 'Code IATA ou ICAO de l\'aéroport' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  abbreviation?: string;

  @ApiPropertyOptional({ description: 'Ville de l\'aéroport' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  ville?: string;

  @ApiPropertyOptional({ description: 'Pays de l\'aéroport' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  pays?: string;

  @ApiPropertyOptional({ description: 'Statut actif/inactif' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

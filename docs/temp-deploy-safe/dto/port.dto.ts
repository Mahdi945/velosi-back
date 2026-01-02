import { IsString, IsNotEmpty, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePortDto {
  @ApiProperty({ description: 'Nom complet du port', example: 'Port de Radès' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  libelle: string;

  @ApiPropertyOptional({ description: 'Code UN/LOCODE du port', example: 'TNRAD' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  abbreviation?: string;

  @ApiPropertyOptional({ description: 'Ville du port', example: 'Radès' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  ville?: string;

  @ApiProperty({ description: 'Pays du port', example: 'Tunisie' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  pays: string;

  @ApiPropertyOptional({ description: 'Statut actif/inactif', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdatePortDto {
  @ApiPropertyOptional({ description: 'Nom complet du port' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  libelle?: string;

  @ApiPropertyOptional({ description: 'Code UN/LOCODE du port' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  abbreviation?: string;

  @ApiPropertyOptional({ description: 'Ville du port' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  ville?: string;

  @ApiPropertyOptional({ description: 'Pays du port' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  pays?: string;

  @ApiPropertyOptional({ description: 'Statut actif/inactif' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

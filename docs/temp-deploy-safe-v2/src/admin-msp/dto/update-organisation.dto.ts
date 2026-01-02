import { PartialType } from '@nestjs/mapped-types';
import { CreateOrganisationDto } from './create-organisation.dto';
import { IsOptional, IsIn } from 'class-validator';

export class UpdateOrganisationDto extends PartialType(CreateOrganisationDto) {
  @IsOptional()
  @IsIn(['actif', 'inactif', 'en_attente'])
  statut?: 'actif' | 'inactif' | 'en_attente';
}

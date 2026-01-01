import { PartialType } from '@nestjs/mapped-types';
import { CreateArmateurDto } from './create-armateur.dto';
import { Exclude } from 'class-transformer';

export class UpdateArmateurDto extends PartialType(CreateArmateurDto) {
  // Ces champs sont auto-générés par la base de données et doivent être exclus
  @Exclude()
  id?: number;

  @Exclude()
  createdAt?: Date;

  @Exclude()
  updatedAt?: Date;

  @Exclude()
  createdBy?: number;

  @Exclude()
  updatedBy?: number;
}

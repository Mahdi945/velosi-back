import { PartialType } from '@nestjs/mapped-types';
import { CreateFournisseurDto } from './create-fournisseur.dto';
import { Exclude } from 'class-transformer';

export class UpdateFournisseurDto extends PartialType(CreateFournisseurDto) {
  // Ces champs sont auto-générés et doivent être exclus
  @Exclude()
  id?: number;

  @Exclude()
  createdAt?: Date;

  @Exclude()
  updatedAt?: Date;
}

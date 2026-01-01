import { IsNotEmpty, IsNumber } from 'class-validator';

export class ConvertClientToFournisseurDto {
  @IsNotEmpty()
  @IsNumber()
  clientId: number;
}

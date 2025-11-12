import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateContactClientDto {
  @IsNumber()
  clientId: number;

  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  prenom?: string;

  @IsOptional()
  @IsString()
  tel1?: string;

  @IsOptional()
  @IsString()
  tel2?: string;

  @IsOptional()
  @IsString()
  tel3?: string;

  @IsOptional()
  @IsString()
  fax?: string;

  @IsOptional()
  @IsString()
  mail1?: string;

  @IsOptional()
  @IsString()
  mail2?: string;

  @IsOptional()
  @IsString()
  fonction?: string;

  @IsOptional()
  @IsBoolean()
  is_principal?: boolean;
}

export class UpdateContactClientDto {
  @IsOptional()
  @IsNumber()
  clientId?: number;

  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  prenom?: string;

  @IsOptional()
  @IsString()
  tel1?: string;

  @IsOptional()
  @IsString()
  tel2?: string;

  @IsOptional()
  @IsString()
  tel3?: string;

  @IsOptional()
  @IsString()
  fax?: string;

  @IsOptional()
  @IsString()
  mail1?: string;

  @IsOptional()
  @IsString()
  mail2?: string;

  @IsOptional()
  @IsString()
  fonction?: string;

  @IsOptional()
  @IsBoolean()
  is_principal?: boolean;
}

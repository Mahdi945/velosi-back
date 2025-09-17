import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateContactClientDto {
  @IsNumber()
  clientId: number;

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
}

export class UpdateContactClientDto {
  @IsOptional()
  @IsNumber()
  clientId?: number;

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
}

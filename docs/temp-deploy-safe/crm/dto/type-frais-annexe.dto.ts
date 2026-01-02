import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';

export class CreateTypeFraisAnnexeDto {
  @IsString()
  @MinLength(3, { message: 'La description doit contenir au moins 3 caractères' })
  @MaxLength(200, { message: 'La description ne peut pas dépasser 200 caractères' })
  description: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTypeFraisAnnexeDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

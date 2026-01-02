import { PartialType } from '@nestjs/mapped-types';
import { CreateNavireDto } from './create-navire.dto';

export class UpdateNavireDto extends PartialType(CreateNavireDto) {}

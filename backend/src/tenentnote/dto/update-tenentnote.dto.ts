import { PartialType } from '@nestjs/swagger';
import { CreateTenentnoteDto } from './create-tenentnote.dto';

export class UpdateTenentnoteDto extends PartialType(CreateTenentnoteDto) {}

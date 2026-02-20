import { PartialType } from '@nestjs/swagger';
import { CreateSubuserDto } from './create-subuser.dto';

export class UpdateSubuserDto extends PartialType(CreateSubuserDto) {}

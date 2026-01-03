import { ApiProperty } from "@nestjs/swagger";
import { IsOptional } from "class-validator";

export class CreateAdminDto {

    @ApiProperty({ example : 'admin@example.com' })
    email: string;

    @ApiProperty({ example : 'John Doe' })
    @IsOptional()
    name?: string;

    @ApiProperty({ example : 'password123' })
    password: string;
}

import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
    @ApiProperty({
        example: 'Electronics',
        description: 'Category name',
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({
        example: 'Electronic gadgets and devices',
        description: 'Category description',
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({
        example: true,
        description: 'Category active status',
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    isactive?: boolean;
}

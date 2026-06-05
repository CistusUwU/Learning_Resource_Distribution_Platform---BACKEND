import { IsNumber, IsOptional, IsString, Min, ArrayMinSize, IsArray } from "class-validator";

export class UpdateBookDto {
    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    description?: string;
    
    @IsNumber()
    @IsOptional()
    @Min(1000)
    price?: number;

    @IsString()
    @IsOptional()
    file_url?: string;

    @IsString()
    @IsOptional()
    cover_image?: string;

    @IsArray()
    @IsOptional()
    @ArrayMinSize(1)
    majorIds?: number[];
}
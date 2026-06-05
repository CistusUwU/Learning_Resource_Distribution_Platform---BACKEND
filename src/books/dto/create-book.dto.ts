import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, ArrayMinSize, IsArray } from "class-validator";

export class CreateBookDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;
    
    @IsNumber()
    @Min(1000)
    price: number;

    @IsString()
    @IsNotEmpty()
    file_url: string;

    @IsString()
    @IsOptional()
    cover_image?: string;

    @IsArray()
    @ArrayMinSize(1)
    majorIds: number[];
}
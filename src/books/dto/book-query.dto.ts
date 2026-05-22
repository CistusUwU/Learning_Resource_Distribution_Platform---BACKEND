import { Type } from "class-transformer";
import { IsOptional, IsString, IsInt, Min, Max } from "class-validator";

export class BookQueryDto{
    @IsOptional()
    @IsString()
    search?:string;

    @IsOptional()
    @IsInt()
    @Type(() => Number)
    @Min(1)
    categoryId?:number;

    @IsOptional()
    @IsInt()
    @Type(() => Number)
    @Min(1)
    page?:number;

    @IsOptional()
    @IsInt()
    @Type(() => Number)
    @Min(1)
    @Max(100)
    limit?:number;
}
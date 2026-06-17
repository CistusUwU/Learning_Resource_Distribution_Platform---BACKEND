import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class QueryRevenueDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(12)
    month?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(4)
    quarter?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(2026)
    @Max(2100)
    year?: number;
}
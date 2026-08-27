import { Type } from "class-transformer";
import { IsInt, IsOptional, Min, Max } from "class-validator";

export class PaginationQueryDto {
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @IsInt()
    @Type(() => Number)
    @Min(1)
    @Max(100)
    limit?: number = 10;
}
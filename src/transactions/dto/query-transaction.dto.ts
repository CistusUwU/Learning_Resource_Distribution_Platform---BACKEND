import { payment_status, payment_method } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min, IsDateString } from "class-validator";

export class QueryTransactionDto {
    @IsOptional()
    @IsEnum(payment_status)
    status?: payment_status;

    @IsOptional()
    @IsString()
    bankCode?: string;

    @IsOptional()
    @IsDateString()
    fromDate?: string;

    @IsOptional()
    @IsDateString()
    toDate?: string;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsInt()
    @Type(() => Number)
    @Min(1)
    page?: number;

    @IsOptional()
    @IsInt()
    @Type(() => Number)
    @Min(1)
    @Max(100)
    limit?: number;
}
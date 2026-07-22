import { Transform, Type } from "class-transformer";
import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsArray } from "class-validator";

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

    @IsOptional()
    @IsIn(['price', 'created_at', 'title'])
    sortBy?: 'price' | 'created_at' | 'title';

    @IsOptional()
    @IsIn(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc';

    @IsOptional()
    @IsIn(['all', 'unpurchased', 'purchased'])
    purchaseFilter?: 'all' | 'unpurchased' | 'purchased';

    @IsOptional()
    @Transform(({ value }) =>
        Array.isArray(value)
            ? value.map(Number)
            : String(value).split(',').map(Number)
    )
    @IsArray()
    @IsInt({ each: true })
    ids?: number[];
}
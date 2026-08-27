import { IsOptional, IsString, IsIn } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class AdminBookQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsIn(['APPROVED', 'PENDING'])
    status?: 'APPROVED' | 'PENDING';
}
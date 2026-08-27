import { IsOptional, IsIn } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { book_approval_status } from "@prisma/client";

export class StaffBookQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsIn(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'UPDATE_REQUIRED'])
    status?: book_approval_status;
}
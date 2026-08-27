import { IsOptional, IsIn } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { order_status } from "@prisma/client";

export class OrderQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsIn(['PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED'])
    status?: order_status;
}
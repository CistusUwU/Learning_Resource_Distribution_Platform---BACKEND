import { Controller, Get, Param, Query } from "@nestjs/common";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/role.enum";
import { TransactionService } from "./transactions.service";
import { QueryTransactionDto } from "./dto/query-transaction.dto";

@Roles(UserRole.ADMIN)
@Controller('transactions')
export class TransactionController {
    constructor(private readonly transactionService: TransactionService) {}

    @Get()
    findAll(@Query() query: QueryTransactionDto) {
        return this.transactionService.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id') id: string){
        return this.transactionService.findOne(id);
    }
}
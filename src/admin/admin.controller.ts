import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/role.enum";
import { AdminService } from "./admin.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { BookRejectionDto } from "../books/dto/book-rejection.dto";
import { QueryRevenueDto } from "../revenue/dto/query-revenue.dto";
import { CreatePayoutDto } from "../revenue/dto/create-payout.dto";
import { PaginationQueryDto } from "src/common/dto/pagination-query.dto";
import { AdminBookQueryDto } from "src/admin/dto/admin-book-query.dto";

@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) {}
    @Get('books/pending')
    getPendingBook(@Query() query: PaginationQueryDto) {
        return this.adminService.getPendingBooks(query);
    }

    @Get('books')
    getManagedBooks(@Query() query: AdminBookQueryDto) {
        return this.adminService.getManagedBooks(query);
    }

    @Patch('books/:bookId/archive')
    toggleArchive(@Param('bookId', ParseIntPipe) bookId: number) {
        return this.adminService.toggleArchive(bookId);
    }

    @Patch('books/approve-multiple')
    approveBooks(
        @CurrentUser() user: { id: number },
        @Body() body: { book_ids: number[] },
    ) {
        return this.adminService.approveBooks(user.id, body.book_ids);
    }

    @Patch('books/:bookId/approve')
    approveBook(
        @CurrentUser() user: { id: number },
        @Param('bookId', ParseIntPipe) bookId: number,
    ) {
        return this.adminService.approveBook(user.id, bookId);
    }

    @Patch('books/:bookId/reject')
    rejectBook(
        @CurrentUser() user: { id: number },
        @Param('bookId', ParseIntPipe) bookId: number,
        @Body() dto: BookRejectionDto,
    ) {
        return this.adminService.rejectBook(user.id, bookId, dto)
    }

    @Get('revenue/stats')
    getRevenueStats(@Query() query: QueryRevenueDto) {
        return this.adminService.getRevenueStats(query);
    }

    @Get('revenue/lecturers/:lecturerId/transactions')
    getLecturerTransactions(
        @Param('lecturerId', ParseIntPipe) lecturerId: number,
        @Query() query: PaginationQueryDto,
    ) {
        return this.adminService.getLecturerTransactions(lecturerId, query);
    }

    @Get('revenue/payouts')
    getPayoutBatches(@Query() query: PaginationQueryDto) {
        return this.adminService.getPayoutBatches(query);
    }

    @Post('revenue/payouts')
    createPayout(@Body() dto:CreatePayoutDto) {
        return this.adminService.createPayout(dto);
    }

    @Patch('revenue/payouts/:id/confirm')
    confirmPayout(@Param('id') id: string) {
        return this.adminService.confirmPayout(id);
    }

    @Get('revenue/payouts/:id/export')
    exportCSV(@Param('id') id: string){
        return this.adminService.exportCSV(id);
    }
}
import { Injectable } from "@nestjs/common";
import { BooksService } from "../books/books.service";
import { PrismaService } from "../prisma/prisma.service";
import { BookRejectionDto } from "../books/dto/book-rejection.dto";
import { QueryRevenueDto } from "../revenue/dto/query-revenue.dto";
import { RevenueService } from "../revenue/revenue.service";
import { CreatePayoutDto } from "../revenue/dto/create-payout.dto";
import { PaginationQueryDto } from "src/common/dto/pagination-query.dto";
import { AdminBookQueryDto } from "src/admin/dto/admin-book-query.dto";

@Injectable()
export class AdminService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly booksService: BooksService,
        private readonly revenueService: RevenueService
    ) {}

    async getPendingBooks(query: PaginationQueryDto) {
        return this.booksService.getPendingBook(query);
    }

    async getManagedBooks(query: AdminBookQueryDto) {
        return this.booksService.getAdminManagedBooks(query);
    }

    async toggleArchive(bookId: number) {
        return this.booksService.toggleArchive(bookId);
    }

    async approveBook(userId: number, bookId: number){
        return this.booksService.approveBook(userId, bookId);
    }

    async approveBooks(userId: number, bookIds: number[]){
        return this.booksService.approveBooks(userId, bookIds);
    }

    async rejectBook(userId: number, bookId: number, dto: BookRejectionDto) {
        return this.booksService.rejectBook(userId, bookId, dto);
    }

    async getRevenueStats(query: QueryRevenueDto){
        return this.revenueService.getStats(query);
    }

    async createPayout(dto: CreatePayoutDto) {
        return this.revenueService.createPayout(dto);
    }

    async confirmPayout(id: string) {
        return this.revenueService.confirmPayout(id);
    }

    async exportCSV(id: string) {
        return this.revenueService.exportCSV(id);
    }
}
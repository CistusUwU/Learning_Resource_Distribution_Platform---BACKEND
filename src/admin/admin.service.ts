import { Injectable } from "@nestjs/common";
import { BooksService } from "../books/books.service";
import { PrismaService } from "../prisma/prisma.service";
import { BookRejectionDto } from "../books/dto/book-rejection.dto";

@Injectable()
export class AdminService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly booksService: BooksService
    ) {}

    async getPendingBooks() {
        return this.booksService.getPendingBook();
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
}
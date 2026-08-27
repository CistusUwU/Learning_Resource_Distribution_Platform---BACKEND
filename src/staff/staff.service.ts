import { Injectable } from "@nestjs/common";
import { CreateBookDto } from "../books/dto/create-book.dto";
import { BooksService } from "../books/books.service";
import { SubmitBookDto } from "../books/dto/submit-book.dto";
import { UpdateBookDto } from "../books/dto/update-book.dto";
import { RevenueService } from "../revenue/revenue.service";
import { PaginationQueryDto } from "src/common/dto/pagination-query.dto";
import { StaffBookQueryDto } from "src/staff/dto/staff-book-query.dto";

@Injectable()
export class StaffService {
    constructor(
        private readonly booksService: BooksService,
        private readonly revenueService: RevenueService,
    ) {}

    getMyBooks(lecturerId: number, query: StaffBookQueryDto) {
        return this.booksService.findBooksByLecturer(lecturerId, query);
    }

    getMyRevenue(lecturerId: number) {
        return this.revenueService.getMyRevenue(lecturerId);
    }

    createBook(lecturerId: number, dto: CreateBookDto){
        return this.booksService.createBook(lecturerId, dto);
    }

    updateBook(lecturerId: number, bookId: number, dto: UpdateBookDto){
        return this.booksService.updateBook(lecturerId, bookId, dto);
    }

    submitBook(lecturerId: number, bookId: number, dto: SubmitBookDto) {
        return this.booksService.submitBook(lecturerId, bookId, dto);
    }

    cancelSubmission(lecturerId: number, bookId: number) {
        return this.booksService.cancelSubmission(lecturerId, bookId);
    }
}
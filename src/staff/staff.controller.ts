import { UserRole } from "../common/enums/role.enum";
import { StaffService } from "./staff.service";
import { Roles } from "../common/decorators/roles.decorator";
import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CreateBookDto } from "../books/dto/create-book.dto";
import { UpdateBookDto } from "../books/dto/update-book.dto";
import { SubmitBookDto } from "../books/dto/submit-book.dto";
import { FileInterceptor } from "@nestjs/platform-express";
import { coverUploadOptions, pdfUploadOptions } from "./upload.config";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { StaffBookQueryDto } from "src/staff/dto/staff-book-query.dto";

@Roles(UserRole.STAFF, UserRole.ADMIN)
@Controller('staff')
export class StaffController {
    constructor(private readonly staffService: StaffService) {}
    @Get('books')
    getMyBooks(@CurrentUser() user: { id: number }, @Query() query: StaffBookQueryDto) {
        return this.staffService.getMyBooks(user.id, query);
    }

    @Get('revenue')
    getMyRevenue(@CurrentUser() user: { id: number }) {
        return this.staffService.getMyRevenue(user.id);
    }

    @Post('books')
    createBook(
        @CurrentUser() user: { id: number },
        @Body() dto: CreateBookDto,
    ) {
        return this.staffService.createBook(user.id, dto);
    }

    @Put('books/:bookId')
    updateBook(
        @CurrentUser() user: { id: number },
        @Param('bookId', ParseIntPipe) bookId: number,
        @Body() dto: UpdateBookDto,
    ) {
        return this.staffService.updateBook(user.id, bookId, dto);
    }

    @Post('books/:bookId/submit')
    submitBook(
        @CurrentUser() user: { id: number },    
        @Param('bookId', ParseIntPipe) bookId: number,
        @Body() dto: SubmitBookDto,
    ) {
        return this.staffService.submitBook(user.id, bookId, dto);
    }

    @Patch('books/:bookId/cancel')
    cancelSubmission(
        @CurrentUser() user: { id: number },
        @Param('bookId', ParseIntPipe) bookId: number,
    ) {
        return this.staffService.cancelSubmission(user.id, bookId);
    }

    @Post('upload/pdf')
    @UseInterceptors(FileInterceptor('file', pdfUploadOptions))
    uploadPdf(@UploadedFile() file: Express.Multer.File){
        if (!file) throw new BadRequestException('Không có file được upload');
        return {
            file_url: `/uploads/books/${file.filename}`,
            file_name: file.originalname,
            file_size: file.size,
        };
    }

    @Post('upload/cover')
    @UseInterceptors(FileInterceptor('file', coverUploadOptions))
    uploadCover(@UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('Không có file được upload');
        return {
            cover_image: `/uploads/covers/${file.filename}`,
            file_name: file.originalname,
            file_size: file.size,
        };
    }
}
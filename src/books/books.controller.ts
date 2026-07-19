import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { BookQueryDto } from "./dto/book-query.dto";
import { BooksService } from "./books.service";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { UserRole } from "src/common/enums/role.enum";
@Controller('books')
export class BooksController {
    constructor (private readonly booksService: BooksService) {}

    @Get()
    findAll(@Query() query: BookQueryDto, @CurrentUser() user: { id: number }) {
        return this.booksService.findAll(query, user.id);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { id: number; role: UserRole }) {
        return this.booksService.findOne(id, user.id, user.role);
    }
}
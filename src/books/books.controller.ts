import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { BookQueryDto } from "./dto/book-query.dto";
import { BooksService } from "./books.service";
@Controller('books')
export class BooksController {
    constructor (private readonly booksService: BooksService) {}

    @Get()
    findAll(@Query() query: BookQueryDto){
        return this.booksService.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.booksService.findOne(id);
    }
}
import { Body, Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { LibraryService } from './library.service';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';

@Roles(UserRole.STUDENT)
@Controller('library')
export class LibraryController {
    constructor(private readonly libraryService: LibraryService) {}

    @Get()
    findAll(@CurrentUser() user: { id: number }) {
        return this.libraryService.findAll(user.id);
    }

    @Get(':bookId')
    findOne(
        @CurrentUser() user: { id: number },
        @Param('bookId', ParseIntPipe) bookId: number,
    ) {
        return this.libraryService.findOne(user.id, bookId);
    }

    @Patch(':bookId/progress')
    updateProgress(
        @CurrentUser() user: { id: number },
        @Param('bookId', ParseIntPipe) bookId: number,
        @Body() dto: UpdateProgressDto,
    ) {
        return this.libraryService.updateProgress(user.id, bookId, dto.page);
    }
}
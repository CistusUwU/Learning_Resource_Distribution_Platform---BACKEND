import { UserRole } from "../common/enums/role.enum";
import { StudioService } from "./studio.service";
import { Roles } from "../common/decorators/roles.decorator";
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { BookIdDto, ChatDto } from "./dto/studio.dto";

@Roles(UserRole.STUDENT)
@Controller('studio')
export class StudioController{
    constructor(private readonly studioService: StudioService) {}

    @Get('flashcards')
    getFlashcards(
        @CurrentUser() user: { id: number },
        @Query() query: BookIdDto,
    ) {
        return this.studioService.getFlashcards(user.id, query.bookId);
    }

    @Get('quiz')
    getQuiz(
        @CurrentUser() user: { id: number },
        @Query() query: BookIdDto,
    ) {
        return this.studioService.getQuiz(user.id, query.bookId);
    }

    @Get('mindmap')
    getMindmap(
        @CurrentUser() user: { id: number },
        @Query() query: BookIdDto,
    ) {
        return this.studioService.getMindMap(user.id, query.bookId);
    }

    @Post('chat')
    chat(
        @CurrentUser() user: { id: number },
        @Body() dto: ChatDto,
    ){
        return this.studioService.chat(user.id, dto.bookId, dto.message, dto.history || []);
    }

    @Delete('cache/:bookId')
    clearCache(
        @CurrentUser() user: { id: number },
        @Param('bookId', ParseIntPipe) bookId: number,
    ) {
        return this.studioService.clearCache(user.id, bookId);
    }

    @Get('ai-status')
    getAiStatus(){
        return this.studioService.getAiStatus();
    }
}
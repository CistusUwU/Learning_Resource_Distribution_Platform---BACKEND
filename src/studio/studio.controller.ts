import { UserRole } from "../common/enums/role.enum";
import { StudioService } from "./studio.service";
import { Roles } from "../common/decorators/roles.decorator";
import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { BookIdDto, ChatDto, GenerateDto } from "./dto/studio.dto";

@Roles(UserRole.STUDENT)
@Controller('studio')
export class StudioController {
    constructor(private readonly studioService: StudioService) {}

    @Post('generate')
    generate(@CurrentUser() user: { id: number }, @Body() dto: GenerateDto) {
        return this.studioService.generate(user.id, dto.bookId, dto.type, dto.isAuto ?? false);
    }

    @Get('history')
    getHistory(@CurrentUser() user: { id: number }, @Query() query: BookIdDto) {
        return this.studioService.getHistory(user.id, query.bookId);
    }

    @Get('history/:id')
    getHistoryItem(@CurrentUser() user: { id: number }, @Param('id') id: string) {
        return this.studioService.getHistoryItem(user.id, id);
    }

    @Delete('history/:id')
    deleteHistoryItem(@CurrentUser() user: { id: number }, @Param('id') id: string) {
        return this.studioService.deleteHistoryItem(user.id, id);
}

    @Post('chat')
    chat(@CurrentUser() user: { id: number }, @Body() dto: ChatDto) {
        return this.studioService.chat(user.id, dto.bookId, dto.message, dto.history || []);
    }

    @Get('ai-status')
    getAiStatus() {
        return this.studioService.getAiStatus();
    }
}
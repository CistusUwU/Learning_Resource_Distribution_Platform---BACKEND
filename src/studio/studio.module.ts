import { Module } from '@nestjs/common';
import { StudioController } from './studio.controller';
import { StudioService } from './studio.service';
import { AiService } from './ai.service';

@Module({
    controllers: [StudioController],
    providers: [
        StudioService, 
        AiService
    ],
})
export class StudioModule {}
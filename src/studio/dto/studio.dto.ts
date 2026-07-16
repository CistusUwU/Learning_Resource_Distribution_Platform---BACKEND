import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength, ValidateNested } from "class-validator";

export class BookIdDto {
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    bookId: number;
}

export class GenerateDto {
    @IsInt()
    @IsPositive()
    bookId: number;

    @IsIn(['flashcard', 'quiz', 'mindmap'])
    type: 'flashcard' | 'quiz' | 'mindmap';

    @IsOptional()
    @IsBoolean()
    isAuto?: boolean;
}

export class ChatHistoryItemDto {
    @IsString()
    role: string;

    @IsString()
    content: string;
}

export class ChatDto {
    @IsInt()
    @IsPositive()
    bookId: number;

    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    message: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ChatHistoryItemDto)
    history?: ChatHistoryItemDto[];
}
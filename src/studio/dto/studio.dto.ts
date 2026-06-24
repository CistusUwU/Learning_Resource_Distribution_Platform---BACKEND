import { Type } from "class-transformer";
import { IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from "class-validator";

export class BookIdDto {
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    bookId: number;
}

export class QuizDto {
    @IsInt()
    @IsPositive()
    bookId:number;

    @IsOptional()
    @IsIn(['multiple_choice', 'essay'])
    type?: 'multiple_choice' | 'essay';
}

export class ChatDto {
    @IsInt()
    @IsPositive()
    bookId: number;

    @IsString()
    @IsNotEmpty()
    message: string;

    @IsOptional()
    @IsArray()
    history?: Array<{ role: string; content: string }>;
}
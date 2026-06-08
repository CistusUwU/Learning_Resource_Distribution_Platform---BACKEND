import { IsNotEmpty, IsString } from "class-validator";

export class BookRejectionDto{
    @IsString()
    @IsNotEmpty()
    rejection_reason: string;
}
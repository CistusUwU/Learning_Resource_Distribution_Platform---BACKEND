import { ArrayMinSize, IsArray, IsInt } from "class-validator";

export class CreateOrderDto {
    @IsArray()
    @IsInt({ each: true })
    @ArrayMinSize(1)
    bookIds: number[];
}
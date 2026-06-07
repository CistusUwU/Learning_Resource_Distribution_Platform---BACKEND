import { IsOptional, IsString } from "class-validator";

export class SubmitBookDto {
    @IsString()
    @IsOptional()
    change_log?:string;
}
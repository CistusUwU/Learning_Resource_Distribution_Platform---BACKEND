import { IsInt, Min } from 'class-validator';

export class UpdateProgressDto {
    @IsInt()
    @Min(1)
    page!: number;
}
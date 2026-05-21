import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto{
    @IsString()
    @IsNotEmpty()
    identifier: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    @IsOptional()
    @IsString()
    @IsIn(['STUDENT', 'STAFF'])
    role?: 'STUDENT' | 'STAFF';
}
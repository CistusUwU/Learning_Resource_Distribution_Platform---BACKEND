import { Controller, Post, Body, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserResponseDto } from './dto/auth-response.dto';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService
    ) {}
    @Get('me')
    getme(@CurrentUser() user): Promise<UserResponseDto> {
        return this.authService.getProfile(user.user_id);
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login (@Body() loginDto: LoginDto){
        return this.authService.login(loginDto);
    }
}
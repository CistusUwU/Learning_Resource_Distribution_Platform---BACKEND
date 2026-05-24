import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { StringValue } from 'ms'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ?? "7d") as StringValue,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    JwtStrategy, 
    JwtAuthGuard,
    
  ],
  exports: [
    AuthService, 
    JwtAuthGuard
  ],
})
export class AuthModule {}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy){
    constructor(
        private configService: ConfigService,
        private authService: AuthService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                (req:any) => (typeof req?.query?.token === 'string' ? req.query.token : null),
            ]),
            ignoreExpiration: false,
            secretOrKey:configService.get<string>('JWT_SECRET') ?? 'fallback-secret',
        });
    }

    async validate(payload: any){
        const user = await this.authService.validateUser(payload.sub);
        if (!user) {
            throw new UnauthorizedException();
        }

        return {
            ...user,
            id: user.user_id,
        };
    }
}
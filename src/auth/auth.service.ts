import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { UserResponseDto } from './dto/auth-response.dto';
import { user as User } from '@prisma/client'

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService
    ) {}

    async login(loginDto: LoginDto){
        const { identifier,password, role } = loginDto;
        const code = identifier.trim();
        const errStudent = 'Mã số sinh viên hoặc mật khẩu không đúng';
        const errStaff = 'Mã số cán bộ hoặc mật khẩu không đúng';

        let user: User | null = null;
        let university_id = '';
        let full_name = '';
        let resolvedRole: 'STUDENT' | 'STAFF' = role || 'STUDENT';

        if (resolvedRole === 'STAFF') {
            const lecturer = await this.prisma.lecturer.findUnique({
                where: { lecturer_code: code },
                include: { user: true },
            });
            if (lecturer?.user) {
                user = lecturer.user;
                university_id = lecturer.lecturer_code;
                full_name = lecturer.full_name;
            }
            if (!user) throw new UnauthorizedException(errStaff);
        } else {
            const student = await this.prisma.student.findUnique({
                where: {student_code: code},
                include: { user: true },
            });
            if (student?.user){
                user = student.user;
                university_id = student.student_code;
                full_name = student.full_name;
            }
            if (!user) throw new UnauthorizedException(errStudent);
        }

        if (!user.is_active){
            throw new UnauthorizedException('Tài khoản bị khóa');
        }

        let isPasswordValid = false;
        if (user.password_hash){
            if (user.password_hash.startsWith('$2b$') || user.password_hash.startsWith('$2a$')) {
                isPasswordValid = await bcrypt.compare(password, user.password_hash);
            }
        }

        if (!isPasswordValid){
            throw new UnauthorizedException(resolvedRole === 'STAFF' ? errStaff : errStudent);
        }

        const payload = {sub: user.user_id, email: user.email};
        const access_token = this.jwtService.sign(payload);

        return {
            access_token,
            user: {
                id: user.user_id,
                university_id,
                full_name,
                email: user.email,
                role: resolvedRole,
            },
        };
    }

    async validateUser(userId: number){
        const user = await this.prisma.user.findUnique({
            where: { user_id: userId},
        });

        if (!user || !user.is_active){
            return null;
        }

        return user;
    }

    async getProfile(userId: number): Promise<UserResponseDto> {
        const lecturer = await this.prisma.lecturer.findUnique({
            where:  { user_id: userId },
            include: { user: true },
        });

        if (lecturer){
            return {
                id: userId,
                university_id: lecturer.lecturer_code,
                full_name: lecturer.full_name,
                email: lecturer.user.email,
                role: 'STAFF',
            };
        }

        const student = await this.prisma.student.findUnique({
            where: { user_id: userId },
            include: { user: true },
        });

        if (student){
            return{
                id:userId,
                university_id: student.student_code,
                full_name: student.full_name,
                email: student.user.email,
                role: 'STUDENT',
            };
        }

        throw new UnauthorizedException('Không tìm thấy người dùng');
    }
}
import { Injectable, NotFoundException } from "@nestjs/common";
import { UserRole } from "../common/enums/role.enum";
import { PrismaService } from "../prisma/prisma.service";
import { UserProfileDto } from "./dto/users-profile.dto";

@Injectable()
export class UsersService {
    constructor (private readonly prisma: PrismaService) {}
    async findMe(userId: number): Promise<UserProfileDto> {
        const user = await this.prisma.user.findUnique({
            where: { user_id: userId },
            select: {
                user_id: true,
                email: true,
                student: {
                    select: {
                        student_code: true,
                        full_name: true,
                        avatar_url: true,
                        major: {
                            select: {
                                major_id: true,
                                major_code: true,
                                major_name: true,
                            }
                        }
                    }
                },
                lecturer: {
                    select: {
                        lecturer_code: true,
                        full_name: true,
                        avatar_url: true,
                        is_admin: true,
                        major: {
                            select: {
                                major_id: true,
                                major_code: true,
                                major_name: true,
                            }
                        }
                    }
                },
            }
        });
        if (!user) throw new NotFoundException('Không tìm thấy người dùng');

        if (user.student) {
            return {
                id: user.user_id,
                email: user.email,
                university_id: user.student.student_code,
                full_name: user.student.full_name,
                avatar_url: user.student.avatar_url,
                role: UserRole.STUDENT,
                major: user.student.major ?? null,
            };
        }

        if (user.lecturer) {
            return {
                id: user.user_id,
                email: user.email,
                university_id: user.lecturer.lecturer_code,
                full_name: user.lecturer.full_name,
                avatar_url: user.lecturer.avatar_url,
                role: UserRole.STAFF,
                is_admin: user.lecturer.is_admin ?? false,
                major: user.lecturer.major ?? null,
            };
        }

        throw new NotFoundException('Không tìm thấy thông tin người dùng');
    }
}
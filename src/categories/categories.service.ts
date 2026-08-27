import { Injectable } from "@nestjs/common";
import { book_approval_status } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CategoriesService {
    constructor (private prisma: PrismaService) {}

    async findAll() {
        const majors = await this.prisma.major.findMany({
            select: {
                major_id: true,
                major_name: true,
                major_code: true,
                _count: {
                    select: {
                        book_major:{
                            where: {
                                book: {
                                    approval_status: book_approval_status.APPROVED,
                                    is_archived: false,
                                }
                            },
                        }
                    }
                },
            },
            orderBy: {
                major_name: 'asc',
            },
        });

        return majors;
    }
}
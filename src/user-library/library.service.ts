import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LibraryService {
    constructor(private readonly prisma: PrismaService) {}
    async findAll(userId: number) {
        const library = await this.prisma.library.findMany({
            where: { student_id: userId },
            select: {
                library_id: true,
                purchased_date: true,
                reading_progress: true,
                last_accessed: true,
                book: {
                    select: {
                        book_id: true,
                        title: true,
                        cover_image: true,
                        price: true,
                        book_author: {
                            select: {
                                lecturer: {
                                    select: {
                                        full_name: true,
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { purchased_date: 'desc' },
        });
    
        return library;
    }

    async findOne(userId: number, bookId: number) {
        const item = await this.prisma.library.findFirst({
            where: {
                student_id: userId,
                book_id: bookId,
            },
            select: {
                library_id: true,
                purchased_date: true,
                reading_progress: true,
                last_accessed: true,
                access_expiry: true,
                book: {
                    select: {
                        book_id: true,
                        title: true,
                        cover_image: true,
                        price: true,
                        description: true,
                        book_author: {
                            select: {
                                lecturer: {
                                    select: {
                                        full_name: true,
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    
        if (!item) throw new NotFoundException('Sách không có trong thư viện');
    
        return item;
    }
}
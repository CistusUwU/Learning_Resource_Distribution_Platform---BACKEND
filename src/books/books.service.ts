import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BookQueryDto } from "./dto/book-query.dto";
import { book_approval_status, book_version_history_status, Prisma } from "@prisma/client";

@Injectable()
export class BooksService{
    constructor(
        private prisma: PrismaService,
    ){}

    async findAll(query: BookQueryDto) {
        const { search, categoryId, page = 1, limit = 50 } = query;
        const skip = (page - 1) * limit;
        const where: Prisma.bookWhereInput = {};
        where.approval_status = book_approval_status.APPROVED;

        if (categoryId) {
            where.book_major = { some: {major_id: categoryId } };
        }

        if (search){
            where.OR = [
               { title: { contains: search } },
               { description: { contains: search } }
            ];
        }

        const [books, total] = await Promise.all([
            this.prisma.book.findMany({
                where,
                select: {
                    book_id: true,
                    title: true,
                    description: true,
                    price: true,
                    cover_image: true,
                    pages: true,
                    created_at: true,
                    book_author: {
                        select: { 
                            lecturer: {
                                select: { 
                                    full_name: true,
                                }
                            }
                        }
                    },
                    book_major: {
                        select: {
                            major: {
                                select: {
                                    major_id: true,
                                    major_name: true,
                                    major_code: true,
                                }
                            }
                        }
                    },
                    library: {
                        select: { 
                            student_id: true 
                        }
                      },
                },  
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.book.count({ where }),
        ]);

        return {
            books,
            total,
            page,
            limit,
        };
    }

    async findOne(id: number) {
        const book = await this.prisma.book.findUnique({
            where: { 
                book_id: id 
            },
            select: {
                book_id: true,
                title: true,
                description: true,
                price: true,
                cover_image: true,
                pages: true,
                file_url: true,
                created_at: true,
                book_author: {
                    select: { 
                        lecturer: {
                            select: { 
                                full_name: true,
                            }
                        }
                    }
                },
                book_major: {
                    select: {
                        major: {
                            select: {
                                major_id: true,
                                major_name: true,
                                major_code: true,
                            }
                        }
                    }
                },
                library:{
                    select: {
                        student_id: true
                    }
                },
                book_version_history: {
                    where: { status: book_version_history_status.APPROVED },
                    orderBy: { submitted_at: 'desc' },
                    take: 1,
                    select: { version_number: true },
                },
            },
        });

        if (!book) throw new NotFoundException(`Book with ID ${id} not found`);

        return book;
    }
}
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BookQueryDto } from "./dto/book-query.dto";
import { book_approval_status, book_version_history_status, Prisma } from "@prisma/client";
import { CreateBookDto } from "./dto/create-book.dto";
import { UpdateBookDto } from "./dto/update-book.dto";
import { SubmitBookDto } from "./dto/submit-book.dto";
import { BookRejectionDto } from "./dto/book-rejection.dto";


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

    async findBooksByLecturer(lecturerId: number) {
        return this.prisma.book.findMany({
            where: {
                book_author: {
                    some: {
                        lecturer_id: lecturerId
                    }
                }    
            },
            select: {
                book_id: true,
                title: true,
                price: true,
                file_url: true,
                cover_image: true,
                approval_status: true,
                submitted_at: true,
                approved_at: true,
                rejection_reason: true,
                created_at: true,
                book_major: {
                    select: {
                        major: {
                            select: {
                                major_id: true,
                                major_name: true,
                            }
                        }
                    }
                }
            },
            orderBy: { created_at: 'desc' },
        })
    }

    async createBook(lecturerId: number, dto: CreateBookDto){
        return this.prisma.$transaction(async (tx) => {
            const book = await tx.book.create({
                data:{
                    title: dto.title,
                    description: dto.description,
                    price: dto.price,
                    file_url: dto.file_url,
                    cover_image: dto.cover_image,
                    approval_status: book_approval_status.DRAFT,
                },
                select: {
                    book_id: true,
                    title: true,
                    description: true,
                    price: true,
                    file_url: true,
                    cover_image: true,
                    approval_status: true,
                    created_at: true,
                }
            });

            await tx.book_author.create({
                data: {
                    book_id: book.book_id,
                    lecturer_id: lecturerId,
                },
            });

            await tx.book_major.createMany({
                data: dto.majorIds.map((majorId) => ({
                    book_id: book.book_id,
                    major_id: majorId,
                })),
            });

            return book;
        });
    }

    async updateBook(lecturerId: number, bookId: number, dto: UpdateBookDto) {
        const book = await this.prisma.book.findFirst({
            where: {
                book_id: bookId,
                book_author: {
                    some: {
                        lecturer_id: lecturerId
                    }
                },
            },
        });

        if (!book) throw new NotFoundException('Không tìm thấy sách');

        if (book.approval_status === book_approval_status.PENDING ||
            book.approval_status === book_approval_status.APPROVED
        ) {
            throw new BadRequestException('Không thể sửa sách đang chờ duyệt hoặc đang bán');
        }

        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.book.update({
                where: {
                    book_id: bookId
                },
                data: {
                    title: dto.title,
                    description: dto.description,
                    price: dto.price,
                    file_url: dto.file_url,
                    cover_image: dto.cover_image,
                },
                select: {
                    book_id: true,
                    title: true,
                    description: true,
                    price: true,
                    file_url: true,
                    cover_image: true,
                    approval_status: true,
                    created_at: true,
                }
            });

            if (dto.majorIds) {
                await tx.book_major.deleteMany({
                    where: {
                        book_id: bookId
                    }
                });

                await tx.book_major.createMany({
                    data: dto.majorIds.map((majorId) => ({
                        book_id: bookId,
                        major_id: majorId,
                    })),
                });
            }

            return updated;
        })
    }

    async submitBook(lecturerId: number, bookId: number, dto: SubmitBookDto){
        const book = await this.prisma.book.findFirst({
            where: {
                book_id: bookId,
                book_author: {
                    some: {
                        lecturer_id:lecturerId
                    }
                }
            },
        });

        if (!book) throw new NotFoundException('Không tìm thấy sách');

        if (
            book.approval_status === book_approval_status.PENDING ||
            book.approval_status === book_approval_status.APPROVED
        ) {
            throw new BadRequestException('Không thể submit sách ở trạng thái này');
        }

        const versionCount = await this.prisma.book_version_history.count({
            where: {
                book_id: bookId,
                status: {
                    not: book_version_history_status.CANCELLED
                }
            },
        });

        const versionNumber = `v${versionCount + 1}`;

        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.book.update({
                where: {
                    book_id: bookId
                },
                data: {
                    approval_status: book_approval_status.PENDING,
                    submitted_at: new Date(),
                },
                select: {
                    book_id: true,
                    title: true,
                    description: true,
                    price: true,
                    file_url: true,
                    cover_image: true,
                    approval_status: true,
                    created_at: true,
                }
            });

            await tx.book_version_history.create({
                data: {
                    book_id: bookId,
                    version_number: versionNumber,
                    status: book_version_history_status.PENDING,
                    change_log: dto.change_log,
                    submitted_at: new Date(),
                },
            });

            return updated;
        });
    }

    async cancelSubmission(lecturerId: number, bookId: number) {
        const book = await this.prisma.book.findFirst({
            where: {
                book_id: bookId,
                book_author: {
                    some: {
                        lecturer_id: lecturerId
                    }
                }
            },
        });

        if (!book) throw new NotFoundException('Không tìm thấy sách');

        if (book.approval_status !== book_approval_status.PENDING) {
            throw new BadRequestException('Chỉ có thể hủy sách đang chờ duyệt');
        }

        return this.prisma.$transaction(async (tx) => {
            await tx.book.update({
                where: {
                    book_id: bookId
                },
                data: {
                    approval_status: book_approval_status.DRAFT,
                    submitted_at: null,
                },
            });

            const latestVersion = await tx.book_version_history.findFirst({
                where: {
                    book_id: bookId,
                    status: book_version_history_status.PENDING,
                },
                orderBy: { submitted_at: 'desc' },
            });

            if (latestVersion) {
                await tx.book_version_history.update({
                    where: { version_history_id: latestVersion.version_history_id },
                    data: { status: book_version_history_status.CANCELLED },
                });
            }

            return { success: true };
        })
    }

    async getPendingBook(){
        return this.prisma.book.findMany({
            where: {
                approval_status: book_approval_status.PENDING
            },
            select:{
                book_id: true,
                title: true,
                description: true,
                price: true,
                cover_image: true,
                file_url: true,
                submitted_at: true,
                created_at: true,
                book_author: {
                    select: {
                        lecturer: {
                            select: {
                                full_name: true,
                                lecturer_code: true,
                            }
                        }
                    }
                },
                book_major: {
                    select: {
                        major: {
                            select: {
                                major_id: true,
                                major_code: true,
                            }
                        }
                    }
                },
                book_version_history: {
                    orderBy: { submitted_at: 'desc' },
                    take: 1,
                    select: {
                        version_number: true,
                        change_log: true,
                        submitted_at: true,
                    }
                }
            },
            orderBy: { submitted_at: 'asc' },
        });
    }

    async approveBook(userId: number, bookId: number) {
        const book = await this.prisma.book.findUnique({
            where: {
                book_id: bookId
            },
        });

        if (!book) throw new NotFoundException('Không tìm thấy sách');

        if (book.approval_status !== book_approval_status.PENDING) {
            throw new BadRequestException('Chỉ có thể duyệt sách đang chờ duyệt');
        }

        return this.prisma.$transaction(async (tx) => {
            await tx.book.update({
                where: {
                    book_id: bookId
                },
                data: {
                    approval_status: book_approval_status.APPROVED,
                    approved_by_id: userId,
                    approved_at: new Date(),
                },
            });

            const latestVersion = await tx.book_version_history.findFirst({
                where: {
                    book_id: bookId,
                    status: book_version_history_status.PENDING,
                },
                orderBy: { submitted_at: 'desc' }
            });

            if (latestVersion) {
                await tx.book_version_history.update({
                    where: { version_history_id: latestVersion.version_history_id },
                    data: {
                        status: book_version_history_status.APPROVED,
                        reviewed_by_id: userId,
                        reviewed_at: new Date()
                    },
                });
            }

            return { success: true };
        })
    }

    async approveBooks(userId: number, bookIds: number[]) {
        const approved: number[] = [];
        const skipped: number[] = [];

        await this.prisma.$transaction(async (tx) => {

            for (const bookId of bookIds) {
                const book = await tx.book.findUnique({
                    where: { book_id: bookId },
                });

                if (!book || book.approval_status !== book_approval_status.PENDING){
                    skipped.push(bookId);
                    continue;
                }
                    
            

                await tx.book.update({
                    where: { book_id: bookId },
                    data: {
                        approval_status: book_approval_status.APPROVED,
                        approved_by_id: userId,
                        approved_at: new Date(),
                    },
                });

                const latestVersion = await tx.book_version_history.findFirst({
                    where: {
                        book_id: bookId,
                        status: book_version_history_status.PENDING,
                    },
                    orderBy: { submitted_at: 'desc' },
                });

                if (latestVersion) {
                    await tx.book_version_history.update({
                        where: { version_history_id: latestVersion.version_history_id },
                        data: {
                            status: book_version_history_status.APPROVED,
                            reviewed_by_id: userId,
                            reviewed_at: new Date()
                        },
                    });
                }

                approved.push(bookId);
            }
        });
        
        return { approved, skipped };
    }

    async rejectBook(userId: number, bookId: number, dto: BookRejectionDto) {
        const book = await this.prisma.book.findUnique({
            where: { book_id: bookId },
        });

        if (!book) throw new NotFoundException('Không tìm thấy sách');

        if (book.approval_status !== book_approval_status.PENDING) {
            throw new BadRequestException('Chỉ có thể từ chối sách đang chờ duyệt');
        }

        return this.prisma.$transaction(async (tx) => {
            await tx.book.update({
                where: {
                    book_id: bookId
                },
                data: {
                    approval_status: book_approval_status.REJECTED,
                    rejection_reason: dto.rejection_reason,
                },
            });

            const latestVersion = await tx.book_version_history.findFirst({
                where: {
                    book_id: bookId,
                    status: book_version_history_status.PENDING,
                },
                orderBy: { submitted_at: 'desc' },
            });

            if (latestVersion) {
                await tx.book_version_history.update({
                    where: { version_history_id: latestVersion?.version_history_id },
                    data: {
                        status: book_version_history_status.REJECTED,
                        reviewed_by_id: userId,
                        reviewed_at: new Date(),
                        rejection_reason: dto.rejection_reason,
                    },
                });
            }

            return { success: true };
        });
    }
}
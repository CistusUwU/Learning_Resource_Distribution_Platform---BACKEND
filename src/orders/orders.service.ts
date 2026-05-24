import { BadRequestException, Injectable } from "@nestjs/common";
import { CreateOrderDto } from "./dto/create-order.dto";
import { PrismaService } from "../prisma/prisma.service";
import { book_approval_status, order_status } from "@prisma/client";
@Injectable()
export class OrdersService {
    constructor(private prisma: PrismaService){}

    async createOrder(userId: number, dto: CreateOrderDto) {
        const books = await this.prisma.book.findMany({
            where: {
                book_id: { in: dto.bookIds },
                approval_status: book_approval_status.APPROVED,
            },
            select: {
                book_id: true,
                price: true,
            }
        });

        if (books.length !== dto.bookIds.length) {
            throw new BadRequestException('Some books are invalid or not approved');
        }

        const existingBooks = await this.prisma.library.findMany({
            where: {
                student_id: userId,
                book_id: { in: dto.bookIds },
            },
            select: {
                book_id: true,
            }
        });
        
        const existingBookIds = existingBooks.map(eb => eb.book_id);
        
        const pendingItems = await this.prisma.order_item.findMany({
            where: {
                book_id: { in: dto.bookIds },
                order: {
                    student_id: userId,
                    status: order_status.PENDING,
                }
            },
            select: { 
                book_id: true,
            }
        });

        const pendingBookIds = pendingItems.map(item => item.book_id);

        if (existingBookIds.length > 0){
            throw new BadRequestException('Some books are already in your library')
        }
        
        if (pendingBookIds.length > 0){
            throw new BadRequestException('Some books already have pending orders — please complete payment first')
        }


        const totalAmount = books.reduce((sum, book) => sum + Number(book.price), 0);

        const orderCode = `ORD-${Date.now()}-${userId}`;

        const order = await this.prisma.order.create({
            data: {
                student_id: userId,
                order_code: orderCode,
                subtotal: totalAmount,
                total_amount: totalAmount,
                status: order_status.PENDING,
                order_item: {
                    create: books.map(book => ({
                            book_id: book.book_id,
                            unit_price: book.price,
                            subtotal: book.price,
                            quantity: 1,
                        })),
                },
            },
            select: {
                order_id: true,
                order_code: true,
                total_amount: true,
                status: true,
                created_at: true,
                order_item: {
                    select: {
                        book_id: true,
                        unit_price: true,
                        quantity: true,
                    }
                }
            }
        });

        return order;
    }

    async getUserOrders(userId: number) {
        return this.prisma.order.findMany({
            where: { student_id: userId },
            select: {
                order_id: true,
                order_code: true,
                total_amount: true,
                status: true,
                created_at: true,
                order_item: {
                    select: {
                        book_id: true,
                        unit_price: true,
                        quantity: true,
                        book: {
                            select: {
                                title: true,
                                cover_image: true,
                            }
                        }
                    }
                }
            },
            orderBy: { created_at: 'desc' },
        });
    }
}

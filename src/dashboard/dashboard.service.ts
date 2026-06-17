import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { book_approval_status, royalty_record_status } from "@prisma/client";

@Injectable()
export class DashboardService {
    constructor(private readonly prisma: PrismaService) {}

    async getAdminDashboard() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const [
            pendingBooks,
            monthlyRevenue,
            unpaidRevenue,
        ] = await Promise.all([
            this.prisma.book.count({
                where: { approval_status: book_approval_status.PENDING },
            }),

            this.prisma.royalty_record.aggregate({
                where: {
                    created_at: { gte: startOfMonth, lt: endOfMonth },
                },
                _sum: { earned_amount: true },
            }),

            this.prisma.royalty_record.aggregate({
                where: { status: royalty_record_status.PENDING },
                _sum: { earned_amount: true },
            }),
        ]);

        return {
            pending_books: pendingBooks,
            monthly_revenue: Number(monthlyRevenue._sum.earned_amount ?? 0),
            unpaid_revenue: Number(unpaidRevenue._sum.earned_amount ?? 0),
        };
    }

    async getStaffDashboard(lecturerId: number) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const [
            booksByStatus,
            monthlyRevenue,
            unpaid_revenue,
        ] = await Promise.all([
            this.prisma.book.groupBy({
                by: ['approval_status'],
                where: {
                    book_author: {
                        some: { lecturer_id: lecturerId }
                    }
                },
                _count: { book_id: true },
            }),

            this.prisma.royalty_record.aggregate({
                where: {
                    lecturer_id: lecturerId,
                    created_at: { gte: startOfMonth, lt: endOfMonth },
                },
                _sum: { earned_amount: true },
            }),

            this.prisma.royalty_record.aggregate({
                where: {
                    lecturer_id: lecturerId,
                    status: royalty_record_status.PENDING,
                },
                _sum: { earned_amount: true },
            }),
        ]);

        const books = {
            draft: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
        };

        for (const item of booksByStatus) {
            if (item.approval_status) {
                books[item.approval_status.toLowerCase()] = item._count.book_id;
            }
        }

        return {
            books,
            monthly_revenue: Number(monthlyRevenue._sum.earned_amount ?? 0),
            unpaid_revenue: Number(unpaid_revenue._sum.earned_amount?? 0),
        };
    }
}
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

    async getAdminRevenueTrend() {
        const now = new Date();
        const months: { month: number; year: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({ month: d.getMonth() + 1, year: d.getFullYear() });
        }

        const rangeStart = new Date(months[0].year, months[0].month - 1, 1);
        const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const records = await this.prisma.royalty_record.findMany({
            where: {
                created_at: { gte: rangeStart, lt: rangeEnd },
            },
            select: {
                earned_amount: true,
                created_at: true,
            },
        });

        const totals = new Map<string, number>();
        for (const { month, year } of months) {
            totals.set(`${year}-${month}`, 0);
        }

        for (const record of records) {
            const d = record.created_at;
            const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
            if (totals.has(key)) {
                totals.set(key, (totals.get(key) ?? 0) + Number(record.earned_amount));
            }
        }

        return months.map(({ month, year }) => ({
            month,
            year,
            revenue: totals.get(`${year}-${month}`) ?? 0,
        }));
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
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QueryRevenueDto } from "./dto/query-revenue.dto";
import { payout_batch_status, Prisma, royalty_record_status } from "@prisma/client";
import { CreatePayoutDto } from "./dto/create-payout.dto";

@Injectable()
export class RevenueService {
    constructor (private readonly prisma: PrismaService) {}

    async getMyRevenue(lecturerId: number) {
        const records = await this.prisma.royalty_record.findMany({
            where: { lecturer_id: lecturerId },
            select: {
                id: true,
                gross_amount: true,
                share_percent: true,
                earned_amount: true,
                status: true,
                created_at: true,
                paid_at: true,
                book: {
                    select: {
                        book_id: true,
                        title: true,
                        cover_image: true,
                    }
                }
            },
            orderBy: { created_at: 'desc' },
        });

        const totalEarned = records.reduce((sum, r) => sum + Number(r.earned_amount), 0);
        const totalPending = records
            .filter(r => r.status === royalty_record_status.PENDING)
            .reduce((sum, r) => sum + Number(r.earned_amount), 0);
        const totalPaid = records
            .filter(r => r.status === royalty_record_status.PAID)
            .reduce((sum, r) => sum + Number(r.earned_amount), 0);

        return { 
            totalEarned, 
            totalPending, 
            totalPaid, 
            records: records.map(r => ({
                ...r,
                share_percent: Number(r.share_percent),
                gross_amount: Number(r.gross_amount),
                earned_amount: Number(r.earned_amount),
            })) 
        };
    }

    async getStats(query: QueryRevenueDto) {
        const { month, quarter, year } = query;

        const where: Prisma.royalty_recordWhereInput = {};

        if (year) {
            if (month) {
                where.created_at = {
                    gte: new Date(year, month - 1, 1),
                    lt: new Date (year, month, 1),
                };
            } else if (quarter) {
                const startMonth = (quarter - 1) * 3;
                where.created_at = {
                    gte: new Date(year, startMonth, 1),
                    lt: new Date(year, startMonth + 3, 1),
                };
            } else {
                where.created_at = {
                    gte: new Date(year, 0, 1),
                    lt: new Date(year + 1, 0, 1),
                };
            }
        }

        const records = await this.prisma.royalty_record.findMany({
            where,
            select: {
                lecturer_id: true,
                earned_amount: true,
                status: true,
                book_id: true,
                lecturer: {
                    select: {
                        full_name: true,
                        lecturer_code: true,
                    }
                }
            }
        });

        const grouped = new Map<number, {
            lecturer: { 
                full_name: string; lecturer_code: string 
            };
            totalEarned: number;
            totalPending: number;
            totalPaid: number;
            bookCount: number;
        }>();

        for (const record of records) {
            const existing = grouped.get(record.lecturer_id) ?? {
                lecturer: record.lecturer,
                totalEarned: 0,
                totalPending: 0,
                totalPaid: 0,
                bookCount: 0,
            };

            existing.totalEarned += Number(record.earned_amount);
            if (record.status === royalty_record_status.PENDING) existing.totalPending += Number(record.earned_amount);
            if (record.status === royalty_record_status.PAID) existing.totalPaid += Number(record.earned_amount);
            existing.bookCount++;

            grouped.set(record.lecturer_id, existing);
        }

        return Array.from(grouped.values())
            .sort((a, b) => b.totalPending - a.totalPending);
    }

    async createPayout(dto: CreatePayoutDto) {
        const { month, year, note } = dto;

        const existing = await this.prisma.payout_batch.findFirst({
            where: { month, year },
        });
        if (existing) {
            throw new BadRequestException(`Đợt thanh toán tháng ${month}/${year} đã tồn tại`);
        }
        
        const pendingRecords = await this.prisma.royalty_record.findMany({
            where: {
                status: royalty_record_status.PENDING,
                created_at: {
                    gte: new Date(year, month - 1, 1),
                    lt: new Date(year, month, 1),
                },
            },
        });

        if (pendingRecords.length === 0 ) {
            throw new BadRequestException(`Không có giao dịch nào cần thanh toán trong tháng ${month}/${year}`);
        }

        const totalAmount = pendingRecords.reduce((sum, r) => sum + Number(r.earned_amount), 0);

        return this.prisma.$transaction(async (tx) => {
            const batch = await tx.payout_batch.create({
                data: {
                    id: `PAY-BATCH-${Date.now()}`,
                    month,
                    year,
                    total_amount: totalAmount,
                    status: payout_batch_status.PENDING,
                    note: note ?? null,
                    updated_at: new Date()
                },
            });

            await tx.royalty_record.updateMany({
                where: { id: { in: pendingRecords.map(r => r.id) } },
                data: { payout_id: batch.id },
            });

            return batch;
        });
    }

    async confirmPayout(id: string) {
        const batch = await this.prisma.payout_batch.findUnique({
            where: { id },
        });

        if (!batch) throw new NotFoundException('Không tìm thấy đợt thanh toán');

        if (batch.status !== payout_batch_status.PENDING) {
            throw new BadRequestException('Đợt thanh toán này đã được xử lý');
        }

        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.payout_batch.update({
                where: { id },
                data: {
                    status: payout_batch_status.COMPLETED,
                    processed_at: new Date(),
                    updated_at: new Date(),
                },
                select: {
                    id: true,
                    month: true,
                    year: true,
                    total_amount: true,
                    status: true,
                    processed_at: true,
                }
            });

            await tx.royalty_record.updateMany({
                where: { payout_id: id },
                data: {
                    status: royalty_record_status.PAID,
                    paid_at: new Date(),
                },
            });

            return updated;
        })
    }

    async exportCSV(id: string) {
        const batch = await this.prisma.payout_batch.findUnique({
            where: { id },
        });

        if (!batch) throw new NotFoundException('Không tìm thấy đợt thanh toán');

        const records = await this.prisma.royalty_record.findMany({
            where: { payout_id: id },
            select: {
                earned_amount: true,
                lecturer: {
                    select: {
                        full_name: true,
                        lecturer_code: true,
                    }
                }
            }
        });

        const grouped = new Map<string, {
            lecturer_code: string;
            full_name: string;
            count: number;
            total: number;
        }>();

        for (const record of records) {
            const code  = record.lecturer.lecturer_code;
            const existing = grouped.get(code) ?? {
                lecturer_code: code,
                full_name: record.lecturer.full_name,
                count: 0,
                total: 0,
            };
            existing.count++;
            existing.total += Number(record.earned_amount);
            grouped.set(code, existing);
        }

        const rows = Array.from(grouped.values());
        const header = 'Mã GV,Họ tên,Số giao dịch,Tổng tiền';
        const lines = rows.map(r =>
            `${r.lecturer_code},"${r.full_name}",${r.count},${r.total}`
        );

        return [header, ...lines].join('\n');
    }
}
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QueryTransactionDto } from "./dto/query-transaction.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class TransactionService{
    constructor(private readonly prisma: PrismaService) {}

    async findAll(query: QueryTransactionDto) {
        const { status, bankCode, fromDate, toDate, search, page = 1, limit = 20 } = query;
        
        const where: Prisma.paymentWhereInput = {};


        if (status) where.status = status;
        if (bankCode) where.vnpayBankCode = bankCode;
        if (fromDate || toDate) {
            where.createdAt = {
                ...(fromDate && { gte: new Date(fromDate) }),
                ...(toDate && { lte: new Date(toDate) }),
            };
        }
        if (search) {
            where.OR = [
                { txnRef: {contains: search } },
                { orderId: { contains: search } },
            ];
        }

        const [data, total] = await Promise.all([
            this.prisma.payment.findMany({
                where,
                select: {
                        id: true,
                        orderId: true,
                        txnRef: true,
                        amount: true,
                        method: true,
                        status: true,
                        vnpayBankCode: true,
                        vnpayCardType: true,
                        vnpayTxnNo: true,
                        vnpayPayDate: true,
                        createdAt: true,
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.payment.count({ where })
        ]);   

        return { data, total, page, limit };
    }

    async findOne(id: string){
        const transaction = await this.prisma.payment.findUnique({
            where: { id },
            select: {
                id: true,
                orderId: true,
                txnRef: true,
                amount: true,
                method: true,
                status: true,
                vnpayBankCode: true,
                vnpayCardType: true,
                vnpayTxnNo: true,
                vnpayPayDate: true,
                vnpayResponseCode: true,
                createdAt: true,
                updatedAt: true, 
            },
        });

        if (!transaction) throw new NotFoundException(`Transaction ${id} not found`);

        return transaction;
    }
}
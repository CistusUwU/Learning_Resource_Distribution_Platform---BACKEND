import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { order_status, payment_method, payment_status } from "@prisma/client";
import { VNPayHelper } from "./helpers/vnpay.helper";

@Injectable()
export class PaymentService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
    ) {}

    async createPaymentUrl(orderCode: string, ipAddr: string): Promise<string> {
        const order = await this.prisma.order.findUnique({
            where: { order_code: orderCode },
            select: {
                order_code: true,
                total_amount: true,
                status: true,
            }
        });
        
        if (!order) {
            throw new NotFoundException('Không tìm thấy đơn hàng');
        }

        if (order.status !== order_status.PENDING) {
            throw new BadRequestException('Đơn hàng không ở trạng thái chờ thanh toán');
        }

        await this.prisma.payment.upsert({
            where: {orderId: orderCode },
            create: {
                id: `PAY-${Date.now()}`,
                orderId: orderCode,
                txnRef: orderCode,
                amount: Number(order.total_amount),
                method: payment_method.VNPAY_ATM,
                status: payment_status.PENDING,
                updatedAt: new Date(),
            },
            update: {
                status: payment_status.PENDING,
                updatedAt: new Date(),
            },
        });
        return VNPayHelper.buildPaymentUrl({
            tmnCode: this.config.get<string>('VNPAY_TMN_CODE')!,
            hashSecret: this.config.get<string>('VNPAY_HASH_SECRET')!,
            vnpayUrl: this.config.get<string>('VNPAY_URL')!,
            returnUrl: this.config.get<string>('VNPAY_RETURN_URL')!,
            orderId: order.order_code,
            amount: Number(order.total_amount),
            ipAddr,
        });
    }

    async handleIpn(
        query: Record<string, string>,
    ): Promise<{ RspCode: string; Message: string }> {
        const hashSecret = this.config.get<string>('VNPAY_HASH_SECRET')!;

        const isValid = VNPayHelper.verifySignature(query, hashSecret);
        if (!isValid) {
            return { RspCode: '97', Message: 'Invalid signature' };
        }

        const orderCode = query['vnp_TxnRef'];
        const responseCode = query['vnp_ResponseCode'];
        const vnpAmount = parseInt(query['vnp_Amount']) / 100;

        const order = await this.prisma.order.findUnique({
            where: { order_code: orderCode },
            select: {
                order_code: true,
                total_amount: true,
                status: true,
                student_id: true,
                order_item: {
                    select: { book_id:true }
                }
            }
        });

        if (!order) return { RspCode: '01', Message: 'Order not found' };

        if (Number(order.total_amount) !== vnpAmount) {
            return { RspCode: '04', Message: 'Invalid amount' };
        }

        if (order.status !== order_status.PENDING) {
            return { RspCode: '02', Message: 'Order already confirmed' };
        }

        const isSuccess = responseCode === '00';

        try{
            await this.prisma.$transaction(async (tx) => {
                await tx.order.update({
                    where: { order_code: orderCode },
                    data: {
                        status: isSuccess ? order_status.COMPLETED : order_status.CANCELLED,
                        payment_method: payment_method.VNPAY_ATM,
                        completed_at: isSuccess ? new Date(): null,
                    },
                });
    
                await tx.payment.update({
                    where: { orderId: orderCode },
                    data: {
                        status: isSuccess ? payment_status.SUCCESS : payment_status.FAILED,
                        vnpayTxnNo: query['vnp_TransactionNo'] ?? null,
                        vnpayBankCode: query['vnp_BankCode'] ?? null,
                        vnpayPayDate: query['vnp_PayDate'] ?? null,
                        vnpayResponseCode: responseCode,
                        updatedAt: new Date(),
                    },
                });
    
                if (isSuccess) {
                    await tx.library.createMany({
                        data: order.order_item.map((item) => ({
                            student_id: order.student_id,
                            book_id: item.book_id,
                            purchased_date: new Date (),
                        })),
                        skipDuplicates: true,
                    });
                }
            });
    
            return { RspCode: '00', Message: 'Confirm success' };
        } catch (error){
            return { RspCode: '99', Message: 'Transaction failed'};
        }
        
    }

    async handleReturn(query: Record<string, string>) {
        const hashSecret = this.config.get<string>('VNPAY_HASH_SECRET')!;
        const isValid = VNPayHelper.verifySignature(query, hashSecret);

        return {
            success: isValid && query['vnp_ResponseCode'] === '00',
            orderCode: query['vnp_TxnRef'],
            amount: parseInt(query['vnp_Amount'] ?? '0') / 100,
            responseCode: query['vnp_ResponseCode'],
        }
    }
}
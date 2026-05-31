import { Controller, Post, Get, Param, Query, Req } from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { Public } from '../common/decorators/public.decorator';
import type { Request } from 'express'
@Controller('payment')
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) {}
        @Post('create/:orderCode')
        createPayment(
            @Param('orderCode') orderCode: string,
            @Req() req: Request,
        ){
            const ipAddr = 
                (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                req.socket.remoteAddress ||
                '127.0.0.1';

            return this.paymentService.createPaymentUrl(orderCode, ipAddr);
        }

        @Public()
        @Get('vnpay-ipn')
        handleIpn(@Query() query: Record<string, string>) {
            return this.paymentService.handleIpn(query);
        }

        @Public()
        @Get('vnpay-return')
        handleReturn(@Query() query: Record<string, string>){
            return this.paymentService.handleReturn(query);
        }
}
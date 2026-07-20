import { Controller, Post, Get, Param, Query, Req } from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { Public } from '../common/decorators/public.decorator';
import type { Request } from 'express'
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/role.enum";
import { CurrentUser } from "../common/decorators/current-user.decorator";
@Controller('payment')
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) {}
        @Roles(UserRole.STUDENT)
        @Post('create/:orderCode')
        createPayment(
            @Param('orderCode') orderCode: string,
            @CurrentUser() user: { id: number },
            @Req() req: Request,
        ){
            const ipAddr = 
                (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                req.socket.remoteAddress ||
                '127.0.0.1';

            return this.paymentService.createPaymentUrl(orderCode, ipAddr, user.id);
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
import { Body, Controller, Get, Post } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { UserRole } from "../common/enums/role.enum";
import { Roles } from "../common/decorators/roles.decorator";

@Roles(UserRole.STUDENT)
@Controller('orders')
export class OrdersController{
    constructor (private readonly ordersService: OrdersService) {}

    @Post()
    createOrder(@CurrentUser() user: { id: number }, @Body() dto: CreateOrderDto){
        return this.ordersService.createOrder(user.id, dto);
    }

    @Get()
    getUserOrders(@CurrentUser() user){
        return this.ordersService.getUserOrders(user.id);
    }
}
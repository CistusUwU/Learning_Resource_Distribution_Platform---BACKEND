import { Controller, Get } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { UsersService } from "./users.service";

@Controller('users')
export class UsersController {
    constructor (private readonly usersService: UsersService) {}

    @Get('me')
    getProfile(@CurrentUser() user: { id:number }) {
        return this.usersService.findMe(user.id);
    }
}
import { Controller, Get } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/role.enum";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Roles(UserRole.ADMIN)
    @Get('admin')
    getAdminDashboard() {
        return this.dashboardService.getAdminDashboard();
    }
    
    @Roles(UserRole.ADMIN)
    @Get('admin/revenue-trend')
    getAdminRevenueTrend() {
        return this.dashboardService.getAdminRevenueTrend();
    }

    @Roles(UserRole.STAFF, UserRole.ADMIN)
    @Get('staff')
    getStaffDashboard(@CurrentUser() user: { id: number }) {
        return this.dashboardService.getStaffDashboard(user.id);
    }
}
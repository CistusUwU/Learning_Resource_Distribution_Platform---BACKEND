import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "../enums/role.enum";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate{
    constructor (private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requireRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        const request = context.switchToHttp().getRequest();
        const user = request.user;
        
        if (!requireRoles) return true;

        if (!user) throw new ForbiddenException('User not authenticated');

        if (!requireRoles.includes(user.role)) {
            throw new ForbiddenException ('Access denied');
        }

        return true;
    }
}
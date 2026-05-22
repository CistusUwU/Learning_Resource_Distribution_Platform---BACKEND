import { UserRole } from "src/common/enums/role.enum";

export class UserResponseDto{
    id: number;
    university_id: string;
    full_name: string;
    email: string;
    role: UserRole;
}

export class AuthResponseDto{
    access_token: string;
    user: UserResponseDto;
}
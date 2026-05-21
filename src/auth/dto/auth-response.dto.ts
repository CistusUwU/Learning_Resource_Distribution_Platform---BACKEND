export class UserResponseDto{
    id: number;
    university_id: string;
    full_name: string;
    email: string;
    role: 'STUDENT' | 'STAFF';
}

export class AuthResponseDto{
    access_token: string;
    user: UserResponseDto;
}
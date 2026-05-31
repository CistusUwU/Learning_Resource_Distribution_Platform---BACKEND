export class MajorDto {
    major_id: number;
    major_code: string;
    major_name: string;
}

export class UserProfileDto{
    id: number;
    email: string;
    university_id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
    is_admin?: boolean;
    major: MajorDto | null;
}
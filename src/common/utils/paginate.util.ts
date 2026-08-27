export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export async function paginate<T>(
    findMany: (skip: number, take: number) => Promise<T[]>,
    count: () => Promise<number>,
    page: number,
    limit: number,
): Promise<PaginatedResult<T>> {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([findMany(skip, limit), count()]);

    return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
}
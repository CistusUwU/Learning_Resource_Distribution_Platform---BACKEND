import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AiService } from "./ai.service";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";

type CacheType = 'flashcard' | 'quiz' | 'mindmap';

export interface StudioEntry {
    id: string;
    studentId: number | null;
    bookId: number;
    type: CacheType;
    title: string;
    isAuto: boolean;
    data: unknown;
    createdAt: number;
}

@Injectable()
export class StudioService {
    private entries = new Map<string, StudioEntry>();

    constructor(
        private readonly prisma: PrismaService,
        private readonly aiService: AiService,
        private readonly config: ConfigService,
    ) {}

    private async checkAccess(studentId: number, bookId: number) {
        const hasBook = await this.prisma.library.findFirst({
            where: { student_id: studentId, book_id: bookId },
        });
        if (!hasBook) throw new ForbiddenException('Bạn chưa sở hữu giáo trình này');
    }

    private async getBookPdfUrl(bookId: number): Promise<string> {
        const book = await this.prisma.book.findUnique({
            where: { book_id: bookId },
            select: { file_url: true },
        });
        if (!book?.file_url) throw new NotFoundException('Không tìm thấy file PDF');
        const fileUrl = book.file_url.trim();
        if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
        const backendUrl = (this.config.get<string>('BACKEND_PUBLIC_URL') || 'http://localhost:3001').replace(/\/+$/, '');
        const path = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
        return `${backendUrl}${path}`;
    }

    private defaultTitle(type: CacheType): string {
        const label = type === 'flashcard' ? 'Thẻ ghi nhớ' : type === 'quiz' ? 'Bài kiểm tra' : 'Sơ đồ tư duy';
        const time = new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        return `${label} · ${time}`;
    }

    private findEntry(studentId: number, bookId: number, type: CacheType) {
        return Array.from(this.entries.values())
            .find((e) => e.studentId === studentId && e.bookId === bookId && e.type === type);
    }

    private findMindmap(bookId: number) {
        return Array.from(this.entries.values())
            .find((e) => e.type === 'mindmap' && e.bookId === bookId);
    }


    async generate(studentId: number, bookId: number, type: CacheType, isAuto: boolean) {
        await this.checkAccess(studentId, bookId);

        if (type === 'mindmap') {
            const existing = this.findMindmap(bookId);
            if (existing) return existing;
        }

        const fileUrl = await this.getBookPdfUrl(bookId);

        let data: unknown;
        if (type === 'flashcard') {
            const res = await this.aiService.generateFlashcards(fileUrl);
            data = { cards: res.cards };
        } else if (type === 'quiz') {
            const res = await this.aiService.generateQuiz(fileUrl);
            data = { questions: res.questions };
        } else {
            const res = await this.aiService.generateMindMap(fileUrl);
            data = { html: res.html };
        }

        const entry: StudioEntry = {
            id: randomUUID(),
            studentId: type === 'mindmap' ? null : studentId,
            bookId,
            type,
            title: this.defaultTitle(type),
            isAuto,
            data,
            createdAt: Date.now(),
        };
        this.entries.set(entry.id, entry);
        return entry;
    }

    async getHistory(studentId: number, bookId: number) {
        await this.checkAccess(studentId, bookId);
        return Array.from(this.entries.values())
            .filter((e) => e.bookId === bookId && e.studentId === studentId)
            .sort((a, b) => b.createdAt - a.createdAt)
            .map(({ id, type, title, isAuto, createdAt }) => ({ id, type, title, isAuto, createdAt }));
    }

    async getHistoryItem(studentId: number, id: string) {
        const entry = this.entries.get(id);
        if (!entry || entry.studentId !== studentId) throw new NotFoundException('Không tìm thấy');
        await this.checkAccess(studentId, entry.bookId);
        return entry;
    }

    async deleteHistoryItem(studentId: number, id: string) {
        const entry = this.entries.get(id);
        if (!entry) throw new NotFoundException('Không tìm thấy');
        if (entry.type === 'mindmap') throw new ForbiddenException('Sơ đồ tư duy không thể xóa');
        if (entry.studentId !== studentId) throw new NotFoundException('Không tìm thấy');
        await this.checkAccess(studentId, entry.bookId);
        this.entries.delete(id);
        return { success: true };
    }

    async chat(studentId: number, bookId: number, message: string, history: Array<{ role: string; content: string }>) {
        await this.checkAccess(studentId, bookId);
        const fileUrl = await this.getBookPdfUrl(bookId);
        const reply = await this.aiService.chat(fileUrl, message, history || []);
        return { reply };
    }

    async getAiStatus() {
        const connected = await this.aiService.checkHealth();
        return {
            connected,
            gradio_url: process.env.GRADIO_API_URL || null,
            message: connected ? 'Kết nối Gradio thành công' : 'Không kết nối được Gradio',
        };
    }
}
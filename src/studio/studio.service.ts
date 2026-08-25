import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AiService } from "./ai.service";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";

type CacheType = 'flashcard' | 'quiz' | 'mindmap';

@Injectable()
export class StudioService {
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

    async generate(studentId: number, bookId: number, type: CacheType, isAuto: boolean) {
        await this.checkAccess(studentId, bookId);

        if (type === 'mindmap') {
            const existing = await this.prisma.studiocache.findFirst({
                where: { bookId, type: 'mindmap' },
            });
            if (existing) return existing;
        }

        const fileUrl = await this.getBookPdfUrl(bookId);

        let data: unknown;
        let source: 'gradio' | 'mock';
        if (type === 'flashcard') {
            const res = await this.aiService.generateFlashcards(fileUrl);
            data = { cards: res.cards };
            source = res.source;
        } else if (type === 'quiz') {
            const res = await this.aiService.generateQuiz(fileUrl);
            data = { questions: res.questions };
            source = res.source;
        } else {
            const res = await this.aiService.generateMindMap(fileUrl);
            data = { html: res.html };
            source = res.source;
        }

        if (source === 'mock') {
            throw new Error('AI hiện không phản hồi được. Vui lòng thử lại sau.');
        }

        return this.prisma.studiocache.create({
            data: {
                id: randomUUID(),
                studentId: type === 'mindmap' ? null : studentId,
                bookId,
                type,
                title: this.defaultTitle(type),
                isAuto,
                data: data as object,
                updatedAt: new Date(),
            },
        });
    }

    async getHistory(studentId: number, bookId: number) {
        await this.checkAccess(studentId, bookId);
        const entries = await this.prisma.studiocache.findMany({
            where: { bookId, studentId },
            orderBy: { createdAt: 'desc' },
            select: { id: true, type: true, title: true, isAuto: true, createdAt: true },
        });
        return entries;
    }

    async getHistoryItem(studentId: number, id: string) {
        const entry = await this.prisma.studiocache.findUnique({ where: { id } });
        if (!entry || entry.studentId !== studentId) throw new NotFoundException('Không tìm thấy');
        await this.checkAccess(studentId, entry.bookId);
        return entry;
    }

    async deleteHistoryItem(studentId: number, id: string) {
        const entry = await this.prisma.studiocache.findUnique({ where: { id } });
        if (!entry) throw new NotFoundException('Không tìm thấy');

        if (entry.type === 'mindmap') {
            await this.checkAccess(studentId, entry.bookId);
            await this.prisma.studiocache.delete({ where: { id } });
            return { success: true };
        }

        if (entry.studentId !== studentId) throw new NotFoundException('Không tìm thấy');
        await this.checkAccess(studentId, entry.bookId);
        await this.prisma.studiocache.delete({ where: { id } });
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
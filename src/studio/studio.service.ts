import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AiService, FlashcardItem, QuizItem } from "./ai.service";
import { ConfigService } from "@nestjs/config";

type  CacheType = 'flashcard' | 'quiz' | 'mindmap';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class StudioService {
    private cache = new Map<string, {data: unknown; expiredAt: number }>();

    constructor(
        private readonly prisma: PrismaService,
        private readonly aiService: AiService,
        private readonly config: ConfigService,
    ) {}

    private getCache<T>(bookId: number, type: CacheType): T | null {
        const key = `${bookId}:${type}`;
        const cached = this.cache.get(key);
        if (!cached) return null;
        if (Date.now() > cached.expiredAt) {
            this.cache.delete(key);
            return null;
        }
        return cached.data as T;
    }

    private setCache(bookId: number, type: CacheType, data: unknown) {
        const key = `${bookId}:${type}`;
        this.cache.set(key, {data, expiredAt: Date.now() + CACHE_TTL_MS });
    }

    private async checkAccess(studentId: number, bookId: number) {
        const hasBook = await this.prisma.library.findFirst({
            where: {
                student_id: studentId,
                book_id: bookId,
            }
        });
        if (!hasBook) throw new ForbiddenException('Bạn chưa sở hữu giáo trình này');
    }

    private async getBookPdfUrl(bookId: number): Promise<string> {
        const book = await this.prisma.book.findUnique({
            where: {
                book_id: bookId
            },
            select: {
                file_url: true
            }
        });
        if (!book?.file_url) throw new NotFoundException('Không tìm thấy file PDF');

        const fileUrl = book.file_url.trim();

        if (/^https?:\/\//i.test(fileUrl)) return fileUrl;

        const backendUrl = (
            this.config.get<string>('BACKEND_PUBLIC_URL') || 'http://localhost:3001'
        ).replace(/\/+$/, '');

        const path = fileUrl.startsWith('/') ? fileUrl: `/${fileUrl}`;
        return `${backendUrl}${path}`;
    }

    async getFlashcards(studentId: number, bookId: number) {
        await this.checkAccess(studentId, bookId);
        const cached = this.getCache<{ cards: FlashcardItem[] }>(bookId, 'flashcard');

        if (cached) return cached;

        const fileUrl = await this.getBookPdfUrl(bookId);
        const { cards, source } = await this.aiService.generateFlashcards(fileUrl);
        if(source === 'gradio') this.setCache(bookId, 'flashcard', { cards });
        return { cards };
    }

    async getQuiz(studentId: number, bookId: number) {
        await this.checkAccess(studentId, bookId);
        const cached = this.getCache<{ questions: QuizItem[] }>(bookId, 'quiz');
        if (cached) return cached;

        const fileUrl = await this.getBookPdfUrl(bookId);
        const { questions, source } = await this.aiService.generateQuiz(fileUrl);
        if (source === 'gradio') this.setCache(bookId, 'quiz', { questions });
        return { questions };
    }

    async getMindMap(studentId: number, bookId: number) {
        await this.checkAccess(studentId, bookId);
        const cached = this.getCache<{ html: string }>(bookId, 'mindmap');
        if (cached) return cached;

        const fileUrl = await this.getBookPdfUrl(bookId);
        const { html, source } = await this.aiService.generateMindMap(fileUrl);
        if (source === 'gradio') this.setCache(bookId, 'mindmap', { html });
        return { html };
    }

    async chat(studentId: number, bookId: number, message: string, history: Array<{ role: string; content: string}>) {
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
            message: connected ? 'Kết nối Gradio thành công' : 'Không kết nối được Gradio'
        };
    }

    async clearCache(studentId: number, bookId: number) {
        await this.checkAccess(studentId, bookId);
        this.cache.delete(`${bookId}:flashcard`);
        this.cache.delete(`${bookId}:quiz`);
        this.cache.delete(`${bookId}:mindmap`);
        return { success: true };
    }
}
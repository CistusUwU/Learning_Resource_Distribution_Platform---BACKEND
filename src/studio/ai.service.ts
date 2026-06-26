import { Injectable, Logger } from "@nestjs/common";

export interface FlashcardItem {
    id: string;
    front: string;
    back: string;
}

export interface QuizItem {
    id: string;
    question: string;
    type: 'multiple_choice' | 'essay';
    options?: string [];
    answer: string;
}

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private readonly gradioApiUrl = process.env.GRADIO_API_URL?.trim();
    private static readonly TIMEOUT_MS = 300_000;

    private getBaseUrl(): string {
        if (!this.gradioApiUrl) throw new Error('GRADIO_API_URL chưa được cấu hình');
        return this.gradioApiUrl.replace(/\/+$/, '');
    }

    private buildFilePayload(fileUrl: string): Record<string, unknown>{
        const orgiName = fileUrl.split('/').pop() || 'document.pdf';
        return {
            path: fileUrl,
            url: fileUrl,
            orig_name: orgiName,
            mime_type: 'application/pdf',
            is_stream: false,
            meta: {_type: 'gradio.FileData'},
        };
    }

    private async callGradio(apiName: string, data: unknown[]): Promise<unknown[]> {
        const base = this.getBaseUrl();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), AiService.TIMEOUT_MS);

        try {
            const initRes = await fetch(`${base}/gradio_api/call/${apiName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data }),
                signal: controller.signal,
            });
            
            if (!initRes.ok) throw new Error(`POST ${apiName} HTTP ${initRes.status}`);

            const { event_id } = await initRes.json();
            if (!event_id) throw new Error('Missing event_id from Gradio');

            const sseRes = await fetch (`${base}/gradio_api/call/${apiName}/${event_id}`, {
                headers: { Accept: 'text/event-stream' },
                signal: controller.signal,
            });

            if (!sseRes.ok) throw new Error(`SSE ${apiName} HTTP ${sseRes.status}`);

            const sseText = await sseRes.text();
            return this.parseSseResult(sseText, apiName);
        } finally {
            clearTimeout(timeout);
        }
    }

    private parseSseResult(sseText: string, apiName: string): unknown[] {
        const lines = sseText.split(/\r?\n/);
        let lastEvent = '';

        for (const line of lines) {
            if (line.startsWith('event:')) {
                lastEvent = line.slice(6).trim().toLowerCase();
                continue;
            }
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === 'COMPLETE') continue;

            if (lastEvent === 'error') {
                throw new Error(`Gradio error (${apiName}): ${payload}`);
            }

            try {
                const parsed = JSON.parse(payload);
                const arr = Array.isArray(parsed) ? parsed :
                    Array.isArray(parsed?.data) ? parsed.data : null;
                if (arr && lastEvent === 'complete') return arr;
                if (arr) return arr;
            } catch { }
        }

        throw new Error(`No result from Gradio SSE (${apiName})`);
    }

    
    async generateFlashcards(fileUrl: string): Promise<{ cards: FlashcardItem[]; source: 'gradio' | 'mock'} > {
        const mockCards = this.mockFlashcards();
        if (!this.gradioApiUrl) return { cards: mockCards, source: 'mock' };

        try {
            
            const data = await this.callGradio('handle_create_flashcards', [this.buildFilePayload(fileUrl)]);
            
            const statusText = typeof data [0] === 'string' ? data[0] : '';
            const match = statusText.match(/(\d+)\s*thẻ/i);
            const total = match ? parseInt(match[1]) : 1;

            const cards: FlashcardItem[] = [];

            const firstHtml = typeof data[1] === 'string' ? data[1] : '';
            const firstCard = this.parseFlashcardFromHtml(firstHtml);
            if(firstCard) cards.push({ id: 'fc-1', ...firstCard });

                for (let i = 2; i <= total; i++) {
                    try {
                        const gradioResponse = await this.callGradio('go_next', []);
                        const html = typeof gradioResponse[0] === 'string' ? gradioResponse[0] : '';
                        const card = this.parseFlashcardFromHtml(html);
                        if (card) cards.push({ id: `fc-${i}`, ...card });
                    } catch (e) {
                        this.logger.warn(`go_next thẻ ${i} thất bại: ${(e as Error).message}`);
                        break;
                    }
                }
            
            if (cards.length > 0) return { cards, source: 'gradio' };
            return { cards: mockCards, source: 'mock' };
        } catch (e) {
            this.logger.warn(`Flashcards failed: ${(e as Error).message}`);
            return { cards: mockCards, source: 'mock' };
        }
    }

    private parseFlashcardFromHtml(html: string): { front: string; back: string } | null {
        if (!html) return null;
        const q = html.match(/class="question-style"[^>]*>([^<]+)/);
        const a = html.match(/class="answer-style"[^>]*>([^<]+)/);
        if (q?.[1] && a?.[1]) return { front: q[1].trim(), back: a[1].trim() };
        return null;
    }
    
    async generateQuiz(fileUrl: string): Promise<{ questions: QuizItem[]; source: 'gradio' | 'mock' }> {
        const mockQuestions = this.mockQuiz();
        if (!this.gradioApiUrl) return { questions: mockQuestions, source: 'mock' };

        try {
            const data = await this.callGradio('handle_create_quiz', [this.buildFilePayload(fileUrl)]);
            const questions = this.parseQuizFromGradio(data);
            if (questions.length > 0) return { questions ,source: 'gradio' };
            return { questions: mockQuestions, source: 'mock' };
        } catch (e) {
            this.logger.warn(`Quiz failed: ${(e as Error).message}`);
            return { questions: mockQuestions, source: 'mock' };
        }
    }

    private parseQuizFromGradio(data: unknown[]): QuizItem[] {
        const questions: QuizItem[] = [];
        for (const item of data) {
            if (!item || typeof item !== 'object') continue;
            const obj = item as Record<string, unknown>;
            const label = (obj.label || obj.question || '') as string;
            const choicesRaw = (obj.choices || obj.options || []) as unknown[];

            const choices = choicesRaw.map(c =>
                Array.isArray(c) ? String(c[0] || '') : String(c)
            ).filter(Boolean);

            if (label && choices.length >= 2) {
                questions.push({
                    id: `q-${questions.length + 1}`,
                    question: label.replace(/^Câu\s*\d+[:.]\s*/i, '').trim(),
                    type: 'multiple_choice',
                    options: choices,
                    answer: '',
                });
            } 
        }
        return questions;
    }

    async generateMindMap(fileUrl: string): Promise<{ html: string; source: 'gradio' | 'mock' }> {
        const mockHtml = this.mockMindmapHtml();
        if (!this.gradioApiUrl) return { html: mockHtml, source: 'mock' };

        try {
            const data = await this.callGradio('handle_create_mindmap', [this.buildFilePayload(fileUrl)]);
            const fileData = data[1] as Record<string, unknown>;
            const filePath = (fileData?.url || fileData?.path || '') as string;

            if (!filePath) return { html: mockHtml, source: 'mock'};

            const base = this.getBaseUrl();
            const htmlRes = await fetch(`${base}/gradio_api/file=${filePath}`);
            if (!htmlRes.ok) return { html: mockHtml, source: 'mock' };

            const html = await htmlRes.text();
            return { html, source: 'gradio' };
        } catch (e) {
            this.logger.warn(`Mindmap failed: ${(e as Error).message}`);
            return { html: mockHtml, source: 'mock' };
        }
    }

    async chat(
        fileUrl: string,
        message: string,
        history: Array<{ role: string; content: string }>,
    ): Promise<string> {
        if (!this.gradioApiUrl) return `Câu trả lời mẫu cho: ${message}`;

        try {
            const gradioHistory: [string, string][] = [];
            for (let i = 0; i < history.length - 1; i += 2) {   
                const user = history[i]?.content || '';
                const bot = history[i + 1]?.content || '';
                gradioHistory.push([user, bot]);
            }

            const data = await this.callGradio('handle_chat_1', [
                this.buildFilePayload(fileUrl),
                message,
                gradioHistory,
            ]);

            const updatedHistory = data[0] as [string, string][];
            const lastTurn = updatedHistory?.[updatedHistory.length - 1];
            return lastTurn?.[1] || `Không lấy được câu trả lời`;
        } catch (e) {
            this.logger.warn(`Chat failed: ${(e as Error).message}`);
            return `Lỗi kết nối AI: ${(e as Error).message}`;
        }
    }

    async checkHealth(): Promise<boolean> {
        if (!this.gradioApiUrl) return false;
        try {
            const res = await fetch(`${this.getBaseUrl()}/`, {
                signal: AbortSignal.timeout(10_000),
            });
            return res.ok;
        } catch {
            return false;
        }
    }


    private mockFlashcards(): FlashcardItem[] {
        return [
            { id: 'fc-1', front: 'Khái niệm cốt lõi của tài liệu là gì?', back: 'Tài liệu trình bày các kiến thức nền tảng và ứng dụng thực tế.' },
            { id: 'fc-2', front: 'Khi áp dụng thực tế cần lưu ý điều gì?', back: 'Cần đối chiếu điều kiện bài toán và ràng buộc nghiệp vụ.' },
            { id: 'fc-3', front: 'Dấu hiệu cho thấy đã hiểu bài?', back: 'Có thể tự giải thích và làm đúng bài tập tương tự.' },
        ];
    }

    private mockQuiz(): QuizItem[] {
        return Array.from({ length: 5 }, (_, i) => ({
            id: `q-${i + 1}`,
            question: `Câu ${i + 1}: Nội dung nào mô tả đúng nhất về tài liệu?`,
            type: 'multiple_choice',
            options: ['A) Chỉ lý thuyết', 'B) Có kiến thức và ứng dụng', 'C) Chỉ bài tập', 'D) Không thực hành'],
            answer: 'B',
        }));
    }

    private mockMindmapHtml(): string {
        return `<!DOCTYPE html><html><body><h1>Sơ đồ tư duy</h1><p>Chưa kết nối Gradio</p></body></html>`;
    }
}
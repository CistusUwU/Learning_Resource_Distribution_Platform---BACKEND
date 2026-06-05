import { extname } from "path";
import { diskStorage } from 'multer';

const createFilename = (prefix: string) => (req: any, file: Express.Multer.File, cb: Function) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${prefix}-${uniqueSuffix}${extname(file.originalname)}`);
};

export const pdfUploadOptions = {
    storage: diskStorage({
        destination: './uploads/books',
        filename: createFilename('book'),       
    }),

    fileFilter: (req: any, file: Express.Multer.File, cb: Function) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file PDF'), false);
        }
    },
    limits: { fileSize: 50 * 1024 * 1024 },
};

export const coverUploadOptions = {
    storage: diskStorage({
        destination: './uploads/covers',
        filename: createFilename('cover'),
    }),
    fileFilter: (req: any, file: Express.Multer.File, cb: Function) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file ảnh'), false);
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 },
};

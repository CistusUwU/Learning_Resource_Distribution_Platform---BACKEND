import { BadRequestException, Injectable } from "@nestjs/common";

@Injectable()
export class UploadService{
    uploadPdf(file: Express.Multer.File){
        if (!file) throw new BadRequestException('Không có file được upload');
        return {
            file_url: `/uploads/books/${file.filename}`,
            file_name: Buffer.from(file.originalname, 'latin1').toString('utf8'),
            file_size: file.size,
        };
    }

    uploadCover(file: Express.Multer.File){
        if (!file) throw new BadRequestException('Không có file được upload');
        return {
            cover_image: `/uploads/covers/${file.filename}`,
            file_name: Buffer.from(file.originalname, 'latin1').toString('utf8'),
            file_size: file.size,
        };
    }
}
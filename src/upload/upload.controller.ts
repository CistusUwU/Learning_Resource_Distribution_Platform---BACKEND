import { Controller, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/role.enum";
import { coverUploadOptions, pdfUploadOptions } from "./upload.config";
import { UploadService } from "./upload.service";

@Roles(UserRole.STAFF, UserRole.ADMIN)
@Controller('upload')
export class UploadController {
    constructor(private readonly uploadService: UploadService){}

    @Post('pdf')
    @UseInterceptors(FileInterceptor('file', pdfUploadOptions))
    uploadPdf(@UploadedFile() file: Express.Multer.File) {
        return this.uploadService.uploadPdf(file);
    }

    @Post('cover')
    @UseInterceptors(FileInterceptor('file', coverUploadOptions))
    uploadCover(@UploadedFile() file: Express.Multer.File) {
        return this.uploadService.uploadCover(file);
    }
}
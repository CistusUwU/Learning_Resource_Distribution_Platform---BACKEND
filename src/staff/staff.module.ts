import { Module } from "@nestjs/common";
import { BooksModule } from "../books/books.module";
import { StaffController } from "./staff.controller";
import { StaffService } from "./staff.service";

@Module({
    imports: [
       BooksModule 
    ],
    controllers: [
        StaffController,
    ],
    providers: [
        StaffService
    ]
})
export class StaffModule {}
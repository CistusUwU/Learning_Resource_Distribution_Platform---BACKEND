import { Module } from "@nestjs/common";
import { BooksModule } from "../books/books.module";
import { StaffController } from "./staff.controller";
import { StaffService } from "./staff.service";
import { RevenueModule } from "src/revenue/revenue.module";

@Module({
    imports: [
       BooksModule,
       RevenueModule 
    ],
    controllers: [
        StaffController,
    ],
    providers: [
        StaffService
    ]
})
export class StaffModule {}
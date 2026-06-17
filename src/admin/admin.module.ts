import { RevenueModule } from "src/revenue/revenue.module";
import { BooksModule } from "../books/books.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { Module } from "@nestjs/common";

@Module({
    imports: [
        BooksModule,
        RevenueModule,
    ],
    controllers: [
        AdminController
    ],
    providers: [
        AdminService
    ],
    exports: [
        AdminService
    ]
})
export class AdminModule {};
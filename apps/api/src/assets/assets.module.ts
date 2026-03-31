import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { AssetsController } from "./assets.controller";
import { AssetsService } from "./assets.service";
import { ProjectGuard } from "src/guards/project.guard";

@Module({
    imports: [PrismaModule],
    controllers: [AssetsController],
    providers: [AssetsService, ProjectGuard],
    exports: [AssetsService]
})
export class AssetsModule {}
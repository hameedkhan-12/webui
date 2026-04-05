import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { TemplatesController } from "./templates.controller";
import { TemplateService } from "./templates.service";

@Module({
    imports: [PrismaModule],
    controllers: [TemplatesController],
    providers: [TemplateService],
    exports: [TemplateService]
})

export class TemplatesModule {}
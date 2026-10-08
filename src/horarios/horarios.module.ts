import { Module } from "@nestjs/common";
import { HorariosController } from "./horarios.controller";
import { HorariosService } from "./horarios.service";
import { HorarioPrismaRepository } from "./infra/horario-prisma.repository";
import { HORARIO_REPOSITORY } from "./horarios.tokens";

@Module({
  controllers: [HorariosController],
  providers: [
    HorariosService,
    {
      provide: HORARIO_REPOSITORY,
      useClass: HorarioPrismaRepository,
    },
  ],
  exports: [HorariosService],
})
export class HorariosModule {}

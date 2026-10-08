import { Module } from "@nestjs/common";
import { InscripcionesController } from "./inscripciones.controller";
import { InscripcionesService } from "./inscripciones.service";
import { InscripcionPrismaRepository } from "./infra/inscripcion-prisma.repository";
import { INSCRIPCION_REPOSITORY } from "./inscripciones.tokens";

@Module({
  controllers: [InscripcionesController],
  providers: [
    InscripcionesService,
    {
      provide: INSCRIPCION_REPOSITORY,
      useClass: InscripcionPrismaRepository,
    },
  ],
})
export class InscripcionesModule {}

import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { nullableMutation } from "../../prisma/nullable-mutation";
import type { InscripcionRepository } from "../dominio/inscripcion.repository";
import type { NuevaInscripcion } from "../dominio/entidades";
import {
  CupoLlenoError,
  HorarioNoEncontradoError,
  InscripcionDuplicadaError,
} from "../dominio/errores";

@Injectable()
export class InscripcionPrismaRepository implements InscripcionRepository {
  constructor(private readonly prisma: PrismaService) {}
  listar() {
    return this.prisma.inscripcion.findMany({ orderBy: { id: "asc" } });
  }
  buscarPorId(id: number) {
    return this.prisma.inscripcion.findUnique({ where: { id } });
  }
  buscarPorHorario(horarioId: number) {
    return this.prisma.inscripcion.findMany({ where: { horarioId } });
  }
  buscarHorario(id: number) {
    return this.prisma.horario.findUnique({ where: { id } });
  }
  buscarMiembro(id: number) {
    return this.prisma.miembro.findUnique({ where: { id } });
  }
  guardar(datos: NuevaInscripcion) {
    // Serializa las altas del mismo horario. El Service conserva sus reglas;
    // esta comprobacion atomica evita que dos peticiones ocupen el ultimo lugar.
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM horario WHERE id = ${datos.horarioId} FOR UPDATE`;
        const horario = await tx.horario.findUnique({
          where: { id: datos.horarioId },
        });
        if (!horario) throw new HorarioNoEncontradoError(datos.horarioId);
        const where = { horarioId_miembroId: datos };
        const anterior = await tx.inscripcion.findUnique({ where });
        if (anterior?.estado === "confirmada")
          throw new InscripcionDuplicadaError(datos.horarioId, datos.miembroId);
        const ocupados = await tx.inscripcion.count({
          where: { horarioId: datos.horarioId, estado: "confirmada" },
        });
        if (ocupados >= horario.cupoMaximo)
          throw new CupoLlenoError(horario.id, horario.cupoMaximo);
        // La clave compuesta es unica incluso si esta cancelada: se reactiva
        // la fila existente para permitir la reinscripcion de la practica 8.
        return tx.inscripcion.upsert({
          where,
          create: datos,
          update: { estado: "confirmada", creadaEn: new Date() },
        });
      },
      { isolationLevel: "ReadCommitted" },
    );
  }
  cancelar(id: number) {
    return nullableMutation(() =>
      this.prisma.inscripcion.update({
        where: { id },
        data: { estado: "cancelada" },
      }),
    );
  }
}

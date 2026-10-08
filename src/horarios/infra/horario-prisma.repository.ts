import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { nullableMutation } from "../../prisma/nullable-mutation";
import type { HorarioRepository } from "../dominio/horario.repository";
import { CrearHorarioDto } from "../dto/crear-horario.dto";
import { ActualizarHorarioDto } from "../dto/actualizar-horario.dto";

@Injectable()
export class HorarioPrismaRepository implements HorarioRepository {
  constructor(private readonly prisma: PrismaService) {}
  listar() {
    return this.prisma.horario.findMany({ orderBy: { id: "asc" } });
  }
  buscarPorId(id: number) {
    return this.prisma.horario.findUnique({ where: { id } });
  }
  crear(datos: CrearHorarioDto) {
    return this.prisma.horario.create({ data: datos });
  }
  actualizar(id: number, datos: ActualizarHorarioDto) {
    return nullableMutation(() =>
      this.prisma.horario.update({ where: { id }, data: datos }),
    );
  }
  eliminar(id: number) {
    return nullableMutation(() =>
      this.prisma.horario.delete({ where: { id } }),
    );
  }
}

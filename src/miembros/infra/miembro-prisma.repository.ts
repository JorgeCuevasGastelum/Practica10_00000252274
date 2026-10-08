import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { nullableMutation } from "../../prisma/nullable-mutation";
import type { MiembroRepository } from "../dominio/miembro.repository";
import { CrearMiembroDto } from "../dto/crear-miembro.dto";
import { ActualizarMiembroDto } from "../dto/actualizar-miembro.dto";

@Injectable()
export class MiembroPrismaRepository implements MiembroRepository {
  constructor(private readonly prisma: PrismaService) {}
  listar() {
    return this.prisma.miembro.findMany({ orderBy: { id: "asc" } });
  }
  buscarPorId(id: number) {
    return this.prisma.miembro.findUnique({ where: { id } });
  }
  crear(datos: CrearMiembroDto) {
    return this.prisma.miembro.create({ data: datos });
  }
  actualizar(id: number, datos: ActualizarMiembroDto) {
    return nullableMutation(() =>
      this.prisma.miembro.update({ where: { id }, data: datos }),
    );
  }
  eliminar(id: number) {
    return nullableMutation(() =>
      this.prisma.miembro.delete({ where: { id } }),
    );
  }
}

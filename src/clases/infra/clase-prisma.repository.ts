import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { nullableMutation } from "../../prisma/nullable-mutation";
import type { ClaseRepository } from "../dominio/clase.repository";
import { CrearClaseDto } from "../dto/crear-clase.dto";
import { ActualizarClaseDto } from "../dto/actualizar-clase.dto";

@Injectable()
export class ClasePrismaRepository implements ClaseRepository {
  constructor(private readonly prisma: PrismaService) {}
  listar() {
    return this.prisma.clase.findMany({ orderBy: { id: "asc" } });
  }
  buscarPorId(id: number) {
    return this.prisma.clase.findUnique({ where: { id } });
  }
  crear(datos: CrearClaseDto) {
    return this.prisma.clase.create({ data: datos });
  }
  actualizar(id: number, datos: ActualizarClaseDto) {
    return nullableMutation(() =>
      this.prisma.clase.update({ where: { id }, data: datos }),
    );
  }
  eliminar(id: number) {
    return nullableMutation(() => this.prisma.clase.delete({ where: { id } }));
  }
}

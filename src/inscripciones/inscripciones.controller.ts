import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { InscripcionesService } from "./inscripciones.service";
import { CrearInscripcionDto } from "./dto/crear-inscripcion.dto";
import { aInscripcionDto } from "./dto/inscripcion-respuesta.dto";
import { UsuarioActual } from "../auth/decoradores/usuario-actual.decorator";
import { Roles } from "../auth/decoradores/roles.decorator";
import { Rol, type PayloadJwt } from "../auth/dominio/usuario";

@Controller("inscripciones")
export class InscripcionesController {
  constructor(private readonly servicio: InscripcionesService) {}

  @Get()
  async listar() {
    const lista = await this.servicio.listar();
    return lista.map(aInscripcionDto);
  }

  @Get(":id")
  async buscar(@Param("id", ParseIntPipe) id: number) {
    const inscripcion = await this.servicio.buscar(id);
    if (!inscripcion) {
      throw new NotFoundException(`No existe la inscripcion ${id}`);
    }
    return aInscripcionDto(inscripcion);
  }

  // Sin try/catch: si el Service lanza CupoLlenoError, el error sale de
  // aqui y el DominioExceptionFilter lo convierte en 409.
  @Post()
  @HttpCode(201)
  async crear(
    @Body() dto: CrearInscripcionDto,
    @UsuarioActual() usuario: PayloadJwt, // quien viene en el token
    @Res({ passthrough: true }) res: Response,
  ) {
    // Quien eres lo dice el TOKEN, no el cuerpo.
    // Un miembro solo puede inscribirse a si mismo...
    if (usuario.rol === Rol.miembro && usuario.miembroId !== dto.miembroId) {
      // ...si intenta inscribir a otro: 403 (se quien eres y no puedes).
      throw new ForbiddenException("Solo puedes inscribirte a ti mismo");
    }
    // El entrenador y el admin si pueden inscribir a cualquiera.
    const inscripcion = await this.servicio.crear(dto); // si falla, lanza y sale
    res.setHeader("Location", `/inscripciones/${inscripcion.id}`); // 201 + donde quedo
    return aInscripcionDto(inscripcion); // nunca la entidad, el DTO
  }

  // Tarea: solo el entrenador y el admin cancelan. Sin token 401 (lo
  // decide el JwtAuthGuard), con miembro 403 (lo decide el RolesGuard).
  @Roles(Rol.entrenador, Rol.admin)
  @Delete(":id")
  async cancelar(@Param("id", ParseIntPipe) id: number) {
    const cancelada = await this.servicio.cancelar(id);
    if (!cancelada) {
      throw new NotFoundException(`No existe la inscripcion ${id}`);
    }
    return aInscripcionDto(cancelada);
  }
}

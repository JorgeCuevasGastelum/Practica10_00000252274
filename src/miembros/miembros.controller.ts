import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { MiembrosService } from "./miembros.service";
import { CrearMiembroDto } from "./dto/crear-miembro.dto";
import { ActualizarMiembroDto } from "./dto/actualizar-miembro.dto";

@Controller("miembros")
export class MiembrosController {
  constructor(private readonly miembrosService: MiembrosService) {}

  /** GET /miembros */
  @Get()
  listar() {
    return this.miembrosService.listar();
  }

  /** GET /miembros/2 */
  @Get(":id")
  async buscar(@Param("id", ParseIntPipe) id: number) {
    const miembro = await this.miembrosService.buscar(id);
    if (!miembro) {
      throw new NotFoundException(`No existe el miembro ${id}`);
    }
    return miembro;
  }

  /** POST /miembros */
  @Post()
  @HttpCode(201)
  crear(@Body() dto: CrearMiembroDto) {
    return this.miembrosService.crear(dto);
  }

  /** PATCH /miembros/2 */
  @Patch(":id")
  async actualizar(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ActualizarMiembroDto,
  ) {
    const miembro = await this.miembrosService.actualizar(id, dto);
    if (!miembro) {
      throw new NotFoundException(`No existe el miembro ${id}`);
    }
    return miembro;
  }

  /** DELETE /miembros/2 */
  @Delete(":id")
  async eliminar(@Param("id", ParseIntPipe) id: number) {
    const miembro = await this.miembrosService.eliminar(id);
    if (!miembro) {
      throw new NotFoundException(`No existe el miembro ${id}`);
    }
    return miembro;
  }
}

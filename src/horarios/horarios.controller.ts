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
import { HorariosService } from "./horarios.service";
import { CrearHorarioDto } from "./dto/crear-horario.dto";
import { ActualizarHorarioDto } from "./dto/actualizar-horario.dto";
import { Publico } from "../auth/decoradores/publico.decorator";

@Controller("horarios")
export class HorariosController {
  constructor(private readonly horariosService: HorariosService) {}

  /** GET /horarios */
  @Publico() // los horarios los ve cualquiera, sin cuenta
  @Get()
  listar() {
    return this.horariosService.listar();
  }

  /** GET /horarios/2 */
  @Publico()
  @Get(":id")
  async buscar(@Param("id", ParseIntPipe) id: number) {
    const horario = await this.horariosService.buscar(id);
    if (!horario) {
      throw new NotFoundException(`No existe el horario ${id}`);
    }
    return horario;
  }

  /** POST /horarios */
  @Post()
  @HttpCode(201)
  crear(@Body() dto: CrearHorarioDto) {
    return this.horariosService.crear(dto);
  }

  /** PATCH /horarios/2 */
  @Patch(":id")
  async actualizar(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ActualizarHorarioDto,
  ) {
    const horario = await this.horariosService.actualizar(id, dto);
    if (!horario) {
      throw new NotFoundException(`No existe el horario ${id}`);
    }
    return horario;
  }

  /** DELETE /horarios/2 */
  @Delete(":id")
  async eliminar(@Param("id", ParseIntPipe) id: number) {
    const horario = await this.horariosService.eliminar(id);
    if (!horario) {
      throw new NotFoundException(`No existe el horario ${id}`);
    }
    return horario;
  }
}

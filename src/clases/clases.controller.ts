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
import { ClasesService } from "./clases.service";
import { CrearClaseDto } from "./dto/crear-clase.dto";
import { ActualizarClaseDto } from "./dto/actualizar-clase.dto";
import { Publico } from "../auth/decoradores/publico.decorator";

@Controller("clases")
export class ClasesController {
  constructor(private readonly clasesService: ClasesService) {}

  /** GET /clases */
  @Publico() // el catalogo lo ve cualquiera, sin cuenta
  @Get()
  listar() {
    return this.clasesService.listar();
  }

  /** GET /clases/2 */
  @Publico()
  @Get(":id")
  async buscar(@Param("id", ParseIntPipe) id: number) {
    const clase = await this.clasesService.buscar(id);
    if (!clase) {
      throw new NotFoundException(`No existe la clase ${id}`);
    }
    return clase;
  }

  /** POST /clases */
  @Post()
  @HttpCode(201)
  crear(@Body() dto: CrearClaseDto) {
    return this.clasesService.crear(dto);
  }

  /** PATCH /clases/2 */
  @Patch(":id")
  async actualizar(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ActualizarClaseDto,
  ) {
    const clase = await this.clasesService.actualizar(id, dto);
    if (!clase) {
      throw new NotFoundException(`No existe la clase ${id}`);
    }
    return clase;
  }

  /** DELETE /clases/2 */
  @Delete(":id")
  async eliminar(@Param("id", ParseIntPipe) id: number) {
    const clase = await this.clasesService.eliminar(id);
    if (!clase) {
      throw new NotFoundException(`No existe la clase ${id}`);
    }
    return clase;
  }
}

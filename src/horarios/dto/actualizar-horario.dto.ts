import { PartialType } from "@nestjs/mapped-types";
import { CrearHorarioDto } from "./crear-horario.dto";
export class ActualizarHorarioDto extends PartialType(CrearHorarioDto, {
  skipNullProperties: false,
}) {}

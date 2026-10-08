import { PartialType } from "@nestjs/mapped-types";
import { CrearMiembroDto } from "./crear-miembro.dto";
import { IsBoolean, ValidateIf } from "class-validator";
export class ActualizarMiembroDto extends PartialType(CrearMiembroDto, {
  skipNullProperties: false,
}) {
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  activo?: boolean;
}

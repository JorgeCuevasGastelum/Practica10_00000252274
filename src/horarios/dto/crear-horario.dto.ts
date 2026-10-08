import {
  IsIn,
  IsInt,
  IsString,
  Matches,
  MaxLength,
  Min,
} from "class-validator";

export class CrearHorarioDto {
  @IsInt()
  @Min(1)
  claseId!: number;

  @IsIn([
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
    "domingo",
  ])
  dia!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  horaInicio!: string;

  @IsInt()
  @Min(1)
  cupoMaximo!: number;

  @IsString()
  @Matches(/\S/)
  @MaxLength(191)
  entrenador!: string;
}

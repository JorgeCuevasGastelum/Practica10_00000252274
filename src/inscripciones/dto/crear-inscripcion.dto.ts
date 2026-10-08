import { IsInt, Min } from "class-validator";

export class CrearInscripcionDto {
  @IsInt()
  @Min(1)
  horarioId!: number;

  @IsInt()
  @Min(1)
  miembroId!: number;
}

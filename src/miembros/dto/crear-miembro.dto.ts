import { IsEmail, IsIn, IsString, Matches, MaxLength } from "class-validator";

export class CrearMiembroDto {
  @IsString()
  @Matches(/\S/)
  @MaxLength(191)
  nombre!: string;

  @IsEmail()
  @MaxLength(191)
  correo!: string;

  @IsIn(["basica", "plus", "premium"])
  membresia!: string;
}

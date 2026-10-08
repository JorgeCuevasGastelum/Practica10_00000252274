import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class CrearClaseDto {
  @IsString()
  @Matches(/\S/)
  @MaxLength(191)
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}

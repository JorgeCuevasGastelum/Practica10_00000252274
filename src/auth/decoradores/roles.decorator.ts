// Tarea: decorador de roles. Igual que @Publico(), solo guarda un dato
// pegado al metodo; el RolesGuard es quien lo lee y decide.
import { SetMetadata } from "@nestjs/common";
import { Rol } from "../dominio/usuario";

export const ROLES = "roles"; // la llave del dato

// Uso: @Roles(Rol.entrenador, Rol.admin) encima de un metodo o controller.
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES, roles);

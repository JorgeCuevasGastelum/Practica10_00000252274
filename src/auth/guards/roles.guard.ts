// Tarea: el segundo guardia. Corre DESPUES del JwtAuthGuard, cuando ya se
// sabe quien es (req.user). Este solo responde: ¿su rol puede entrar aqui?
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES } from "../decoradores/roles.decorator";
import { PayloadJwt, Rol } from "../dominio/usuario";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    // Los roles que pide la ruta, con @Roles(...) en el metodo o la clase.
    const permitidos = this.reflector.getAllAndOverride<Rol[] | undefined>(
      ROLES,
      [contexto.getHandler(), contexto.getClass()],
    );
    // Sin @Roles() la ruta no exige rol: basta con traer token.
    if (!permitidos || permitidos.length === 0) return true;

    // Si llego aqui sin usuario es una ruta @Publico(): no hay rol que revisar.
    const usuario = contexto
      .switchToHttp()
      .getRequest<{ user?: PayloadJwt }>().user;
    if (!usuario) return true;

    // Se sabe quien es y no le toca: 403, no 401.
    if (!permitidos.includes(usuario.rol)) {
      throw new ForbiddenException(
        `Esta accion requiere rol: ${permitidos.join(" o ")}`,
      );
    }
    return true;
  }
}

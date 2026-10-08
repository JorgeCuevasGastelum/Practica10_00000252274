import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import type { Request, Response } from "express";
import { Prisma } from "../../../generated/prisma/client";
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaFilter implements ExceptionFilter {
  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const statusCode =
      error.code === "P2025"
        ? 404
        : ["P2002", "P2003"].includes(error.code)
          ? 409
          : 500;
    const message =
      error.code === "P2002"
        ? "Ya existe un registro con esos datos unicos"
        : error.code === "P2003"
          ? "La operacion entra en conflicto con un registro relacionado"
          : statusCode === 404
            ? "No existe el registro"
            : "Error interno del servidor";
    http.getResponse<Response>().status(statusCode).json({
      statusCode,
      message,
      path: http.getRequest<Request>().originalUrl,
      timestamp: new Date().toISOString(),
    });
  }
}

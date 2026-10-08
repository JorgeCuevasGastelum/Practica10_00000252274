// dotenv primero: JwtModule.register() lee JWT_SECRET en cuanto se importa
// auth.module.ts, antes de que exista la app.
import "dotenv/config";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory, Reflector } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { RolesGuard } from "./auth/guards/roles.guard";
import { DominioExceptionFilter } from "./comun/filtros/dominio.filter";
import { PrismaFilter } from "./comun/filtros/prisma.filter";
import { LoggingInterceptor } from "./comun/interceptores/logging.interceptor";
import { SobreInterceptor } from "./comun/interceptores/sobre.interceptor";

async function bootstrap() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET falta en .env o tiene menos de 32 caracteres");
  }

  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    }),
  );

  // Paso 1: los errores de dominio se traducen en un solo lugar.
  app.useGlobalFilters(new DominioExceptionFilter(), new PrismaFilter());

  // Pasos 3 y 4: primero se mide, luego se envuelve en { data, meta }.
  app.useGlobalInterceptors(new LoggingInterceptor(), new SobreInterceptor());

  // Parte 2, Paso 4: TODAS las rutas piden token, salvo las @Publico().
  // Tarea: despues del token se revisa el rol de las rutas con @Roles().
  const reflector = app.get(Reflector); // el guard lo usa para leer @Publico()
  app.useGlobalGuards(new JwtAuthGuard(reflector), new RolesGuard(reflector));

  // Paso 5: le dice al NAVEGADOR que origenes pueden leer las respuestas.
  app.enableCors({
    origin: ["http://localhost:5173"], // el puerto de Vite (React, Unidad III)
    exposedHeaders: ["Location", "X-Request-Id"], // encabezados que el front puede leer
  });

  // Parte 2, Paso 6: la documentacion OpenAPI en /docs.
  const config = new DocumentBuilder()
    .setTitle("API del Gimnasio") // titulo que sale arriba de /docs
    .setVersion("1.0")
    .addBearerAuth() // agrega el boton Authorize
    .addSecurityRequirements("bearer") // pone el candado en todas las rutas
    .build();
  const documento = SwaggerModule.createDocument(app, config); // recorre controllers y DTO
  SwaggerModule.setup("docs", app, documento); // lo publica en /docs

  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

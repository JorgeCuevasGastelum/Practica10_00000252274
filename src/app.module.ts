import { PrismaModule } from "./prisma/prisma.module";
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { ClasesModule } from "./clases/clases.module";
import { InscripcionesModule } from "./inscripciones/inscripciones.module";
import { MiembrosModule } from "./miembros/miembros.module";
import { HorariosModule } from "./horarios/horarios.module";
import { PeticionIdMiddleware } from "./comun/middleware/peticion-id.middleware";

@Module({
  imports: [
    PrismaModule,
    AuthModule, // registro, login y la estrategia JWT
    ClasesModule,
    InscripcionesModule,
    MiembrosModule,
    HorariosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
// Un middleware NO va en providers: se registra implementando NestModule y
// su metodo configure().
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(PeticionIdMiddleware) // que middleware
      .forRoutes("*"); // en que rutas: '*' = todas
  }
}

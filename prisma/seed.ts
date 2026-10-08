import * as bcrypt from "bcryptjs";
import { PrismaService } from "../src/prisma/prisma.service";
import { HORARIOS, MIEMBROS } from "../src/datos/gimnasio.seed";

// Borra y vuelve a llenar la base: los datos del gimnasio y las tres
// cuentas de prueba. Se corre con: npx prisma db seed
async function seed() {
  const prisma = new PrismaService();
  try {
    // Las tres cuentas usan "gimnasio2026". Se guarda el HASH, nunca el texto.
    const passwordHash = await bcrypt.hash("gimnasio2026", 10);
    await prisma.$transaction(async (tx) => {
      // De hijos a padres, para no chocar con las llaves foraneas.
      await tx.inscripcion.deleteMany();
      await tx.horario.deleteMany();
      await tx.clase.deleteMany();
      await tx.miembro.deleteMany();
      await tx.usuario.deleteMany();

      await tx.clase.createMany({
        data: [
          { id: 1, nombre: "Yoga" },
          { id: 2, nombre: "Spinning" },
        ],
      });
      await tx.horario.createMany({ data: HORARIOS });
      await tx.miembro.createMany({ data: MIEMBROS });
      // Las tres cuentas de prueba, ahora guardadas en MySQL.
      await tx.usuario.createMany({
        data: [
          {
            correo: "karla@itson.mx",
            passwordHash,
            rol: "miembro",
            miembroId: 1,
          },
          { correo: "ana@itson.mx", passwordHash, rol: "entrenador" },
          { correo: "admin@itson.mx", passwordHash, rol: "admin" },
        ],
      });
    });
    console.log("Datos iniciales y cuentas de prueba creados.");
  } finally {
    await prisma.$disconnect();
  }
}
void seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

/* Pruebas HTTP reales contra una base MySQL temporal y exclusiva de esta ejecucion. */
require("dotenv").config({ quiet: true });
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { spawn, execFileSync } = require("node:child_process");
const { once } = require("node:events");
const mariadb = require("mariadb");
const results = [];
const dbName = `gimnasio_p10_test_${Date.now()}`;
const port = 3110;
let child;
let admin;
let consola = ""; // todo lo que escribe el servidor (logs de [HTTP] y [Dominio])

async function request(title, method, route, expected, body, headers = {}) {
  const response = await fetch(`http://localhost:${port}${route}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  const record = {
    title,
    method,
    route,
    requestHeaders: headers,
    body,
    status: response.status,
    headers: Object.fromEntries(response.headers),
    response: data,
  };
  results.push(record);
  assert.equal(response.status, expected, JSON.stringify(record, null, 2));
  console.log(`OK ${expected} ${title}`);
  return record;
}

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

// El payload de un JWT es base64url: se lee sin conocer el secreto.
function leerJwt(token) {
  const [header, payload, firma] = token.split(".");
  const decodificar = (parte) =>
    JSON.parse(Buffer.from(parte, "base64url").toString("utf8"));
  return { header: decodificar(header), payload: decodificar(payload), firma };
}

async function start(env) {
  child = spawn(process.execPath, ["dist/src/main.js"], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let output = "";
  const guardar = (chunk) => {
    output += chunk;
    consola += chunk;
  };
  child.stdout.on("data", guardar);
  child.stderr.on("data", guardar);
  for (let i = 0; i < 600; i++) {
    if (child.exitCode !== null) throw new Error(output);
    try {
      if ((await fetch(`http://localhost:${port}/clases`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`La API no arranco: ${output}`);
}
async function stop() {
  // En Windows un proceso matado queda con exitCode null y signalCode "SIGTERM".
  if (child && child.exitCode === null && child.signalCode === null) {
    const done = once(child, "exit");
    child.kill();
    await done;
  }
}

async function login(correo, password = "gimnasio2026") {
  const r = await request(`Login ${correo}`, "POST", "/auth/login", 200, {
    correo,
    password,
  });
  return r.response.data.access_token;
}

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  admin = await mariadb.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    allowPublicKeyRetrieval: true,
  });
  await admin.query(`CREATE DATABASE \`${dbName}\``);
  url.pathname = `/${dbName}`;
  const env = {
    ...process.env,
    DATABASE_URL: url.toString(),
    PORT: String(port),
  };
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    { env, stdio: "pipe", windowsHide: true },
  );
  execFileSync(process.execPath, ["dist/prisma/seed.js"], {
    env,
    stdio: "pipe",
    windowsHide: true,
  });
  await start(env);

  // ============ PARTE 2 primero: sin token no se pasa ============
  let r = await request(
    "P2-01 GET /inscripciones sin token",
    "GET",
    "/inscripciones",
    401,
  );
  assert.equal(r.response.statusCode, 401);
  r = await request("P2-02 GET /clases es publica", "GET", "/clases", 200);
  r = await request("P2-03 GET / es publica", "GET", "/", 200);

  // Inicio de sesion de las tres cuentas del seed.
  const tKarla = await login("karla@itson.mx");
  const tAna = await login("ana@itson.mx");
  const tAdmin = await login("admin@itson.mx");
  const jwt = leerJwt(tKarla);
  assert.equal(jwt.header.alg, "HS256");
  assert.equal(jwt.payload.correo, "karla@itson.mx");
  assert.equal(jwt.payload.rol, "miembro");
  assert.equal(jwt.payload.miembroId, 1);
  assert.equal(jwt.payload.exp - jwt.payload.iat, 3600);
  assert.ok(!("passwordHash" in jwt.payload));

  // Mismo mensaje con correo inexistente y con contrasena incorrecta.
  const malCorreo = await request(
    "P2-04 Login con correo que no existe",
    "POST",
    "/auth/login",
    401,
    { correo: "nadie@itson.mx", password: "gimnasio2026" },
  );
  const malPass = await request(
    "P2-05 Login con contrasena incorrecta",
    "POST",
    "/auth/login",
    401,
    { correo: "karla@itson.mx", password: "otra-cosa" },
  );
  assert.deepEqual(malCorreo.response, malPass.response);

  r = await request(
    "P2-06 GET /auth/yo con token",
    "GET",
    "/auth/yo",
    200,
    undefined,
    bearer(tKarla),
  );
  assert.equal(r.response.data.correo, "karla@itson.mx");
  assert.equal(r.response.data.sub, jwt.payload.sub);

  // Alguien cambia el payload a rol "admin" sin conocer el secreto.
  const [h, , f] = tKarla.split(".");
  const payloadFalso = Buffer.from(
    JSON.stringify({ ...jwt.payload, rol: "admin", miembroId: null }),
  ).toString("base64url");
  await request(
    "P2-07 Token con payload alterado (rol admin)",
    "GET",
    "/auth/yo",
    401,
    undefined,
    bearer(`${h}.${payloadFalso}.${f}`),
  );
  await request(
    "P2-08 Token basura",
    "GET",
    "/inscripciones",
    401,
    undefined,
    bearer("no.es.token"),
  );

  // ============ PARTE 1: filtro, X-Request-Id, sobre ============
  r = await request(
    "P1-01 Karla se inscribe a si misma",
    "POST",
    "/inscripciones",
    201,
    { horarioId: 1, miembroId: 1 },
    bearer(tKarla),
  );
  assert.equal(r.headers.location, "/inscripciones/1");
  assert.equal(r.response.data.miembroId, 1);
  r = await request(
    "P2-09 Karla intenta inscribir a Sofia (miembro 3)",
    "POST",
    "/inscripciones",
    403,
    { horarioId: 2, miembroId: 3 },
    bearer(tKarla),
  );
  assert.equal(r.response.message, "Solo puedes inscribirte a ti mismo");
  await request(
    "P1-02 El entrenador inscribe a Omar, se llena el cupo",
    "POST",
    "/inscripciones",
    201,
    { horarioId: 1, miembroId: 2 },
    bearer(tAna),
  );
  r = await request(
    "P1-03 Cupo lleno: 409 con la nueva forma",
    "POST",
    "/inscripciones",
    409,
    { horarioId: 1, miembroId: 3 },
    bearer(tAdmin),
  );
  assert.equal(r.response.error, "CupoLlenoError");
  assert.equal(r.response.path, "/inscripciones");
  assert.ok(!Number.isNaN(Date.parse(r.response.timestamp)));
  assert.ok(!("data" in r.response), "los errores no van en el sobre");
  r = await request(
    "P1-04 Inscripcion duplicada",
    "POST",
    "/inscripciones",
    409,
    { horarioId: 1, miembroId: 1 },
    bearer(tKarla),
  );
  assert.equal(r.response.error, "InscripcionDuplicadaError");
  r = await request(
    "P1-05 Horario inexistente",
    "POST",
    "/inscripciones",
    404,
    { horarioId: 99, miembroId: 1 },
    bearer(tKarla),
  );
  assert.equal(r.response.error, "HorarioNoEncontradoError");
  r = await request(
    "P1-06 Miembro inexistente",
    "POST",
    "/inscripciones",
    404,
    { horarioId: 3, miembroId: 99 },
    bearer(tAdmin),
  );
  assert.equal(r.response.error, "MiembroNoEncontradoError");
  r = await request(
    "P1-07 Validacion sigue en 400",
    "POST",
    "/inscripciones",
    400,
    { horarioId: "hola" },
    bearer(tAdmin),
  );
  assert.ok(Array.isArray(r.response.message));

  r = await request("P1-08 X-Request-Id generado", "GET", "/clases", 200);
  assert.match(r.headers["x-request-id"], /^[0-9a-f-]{36}$/);
  r = await request(
    "P1-09 X-Request-Id que manda el cliente",
    "GET",
    "/clases",
    200,
    undefined,
    { "X-Request-Id": "practica10-prueba-123" },
  );
  assert.equal(r.headers["x-request-id"], "practica10-prueba-123");

  r = await request("P1-10 Respuesta con sobre", "GET", "/clases", 200);
  assert.ok(Array.isArray(r.response.data));
  assert.equal(r.response.data[0].nombre, "Yoga");
  assert.equal(r.response.meta.ruta, "/clases");
  assert.equal(typeof r.response.meta.duracionMs, "number");

  // CORS: el servidor responde en los dos casos; solo cambia el encabezado.
  r = await request(
    "P1-11 CORS http://localhost:5173",
    "GET",
    "/clases",
    200,
    undefined,
    { Origin: "http://localhost:5173" },
  );
  assert.equal(
    r.headers["access-control-allow-origin"],
    "http://localhost:5173",
  );
  assert.match(r.headers["access-control-expose-headers"], /X-Request-Id/);
  r = await request(
    "P1-12 CORS http://localhost:4000",
    "GET",
    "/clases",
    200,
    undefined,
    { Origin: "http://localhost:4000" },
  );
  assert.equal(r.headers["access-control-allow-origin"], undefined);
  r = await request(
    "P1-13 Preflight permitido",
    "OPTIONS",
    "/inscripciones",
    204,
    undefined,
    {
      Origin: "http://localhost:5173",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type,authorization",
    },
  );
  assert.equal(
    r.headers["access-control-allow-origin"],
    "http://localhost:5173",
  );

  // ============ Tarea: solo entrenador y admin cancelan ============
  await request("T-01 Cancelar sin token", "DELETE", "/inscripciones/1", 401);
  await request(
    "T-02 Cancelar con miembro",
    "DELETE",
    "/inscripciones/1",
    403,
    undefined,
    bearer(tKarla),
  );
  r = await request(
    "T-03 Cancelar con entrenador",
    "DELETE",
    "/inscripciones/1",
    200,
    undefined,
    bearer(tAna),
  );
  assert.equal(r.response.data.estado, "cancelada");
  await request(
    "T-04 Cancelar con admin",
    "DELETE",
    "/inscripciones/2",
    200,
    undefined,
    bearer(tAdmin),
  );
  r = await request(
    "Reinscribir cancelada sin violar clave unica",
    "POST",
    "/inscripciones",
    201,
    { horarioId: 1, miembroId: 1 },
    bearer(tKarla),
  );
  assert.equal(r.response.data.id, 1);
  assert.equal(r.response.data.estado, "confirmada");

  // ============ Registro ============
  r = await request(
    "P2-10 Registro de una cuenta nueva",
    "POST",
    "/auth/registro",
    201,
    { correo: "Luis@ITSON.mx", password: "secreto123" },
  );
  assert.equal(leerJwt(r.response.data.access_token).payload.rol, "miembro");
  await request(
    "P2-11 Registro con correo repetido",
    "POST",
    "/auth/registro",
    409,
    { correo: "luis@itson.mx", password: "secreto123" },
  );
  r = await request("P2-12 Registro invalido", "POST", "/auth/registro", 400, {
    correo: "sin-arroba",
    password: "corta",
    rol: "dios",
  });
  assert.equal(r.response.message.length, 3);

  // ============ CRUD de la Practica 9, ahora con token ============
  const A = bearer(tAdmin);
  await request(
    "Listar inscripciones",
    "GET",
    "/inscripciones",
    200,
    undefined,
    A,
  );
  await request("Crear clase sin token", "POST", "/clases", 401, {
    nombre: "Funcional",
  });
  await request(
    "Crear clase",
    "POST",
    "/clases",
    201,
    { nombre: "Funcional" },
    A,
  );
  await request("Buscar clase", "GET", "/clases/3", 200);
  await request(
    "Actualizar clase",
    "PATCH",
    "/clases/3",
    200,
    { nombre: "Funcional Avanzado" },
    A,
  );
  await request("Clase inexistente", "GET", "/clases/99", 404);
  await request("Eliminar clase", "DELETE", "/clases/3", 200, undefined, A);
  await request("Miembros sin token", "GET", "/miembros", 401);
  await request("Listar miembros", "GET", "/miembros", 200, undefined, A);
  await request(
    "Crear miembro",
    "POST",
    "/miembros",
    201,
    { nombre: "Luis Prueba", correo: "luis@itson.mx", membresia: "basica" },
    A,
  );
  r = await request(
    "Dar de baja miembro",
    "PATCH",
    "/miembros/4",
    200,
    { activo: false },
    A,
  );
  assert.equal(r.response.data.activo, false);
  await request("Eliminar miembro", "DELETE", "/miembros/4", 200, undefined, A);
  await request("Listar horarios", "GET", "/horarios", 200);
  await request(
    "Crear horario",
    "POST",
    "/horarios",
    201,
    {
      claseId: 2,
      dia: "jueves",
      horaInicio: "18:00",
      cupoMaximo: 5,
      entrenador: "Luis Fierro",
    },
    A,
  );
  await request("Horario inexistente", "GET", "/horarios/99", 404);
  await request(
    "Campo desconocido",
    "POST",
    "/clases",
    400,
    { nombre: "Yoga", administrador: true },
    A,
  );
  await request("Parametro invalido", "GET", "/clases/hola", 400);
  await request(
    "Correo duplicado (Prisma P2002)",
    "POST",
    "/miembros",
    409,
    { nombre: "Otra", correo: "karla@itson.mx", membresia: "basica" },
    A,
  );
  await request(
    "Eliminar registro relacionado (Prisma P2003)",
    "DELETE",
    "/clases/1",
    409,
    undefined,
    A,
  );

  // ============ OpenAPI ============
  r = await request("P2-13 Documentacion en /docs", "GET", "/docs", 200);
  assert.match(r.response, /swagger/i);
  r.response = "(HTML de Swagger UI)";
  r = await request("P2-14 Documento OpenAPI", "GET", "/docs-json", 200);
  const doc = r.response;
  assert.ok(doc.components.securitySchemes.bearer);
  assert.deepEqual(doc.security, [{ bearer: [] }]);
  assert.equal(
    doc.components.schemas.RegistroDto.properties.password.minLength,
    8,
  );
  r.response = {
    info: doc.info,
    security: doc.security,
    securitySchemes: doc.components.securitySchemes,
    rutas: Object.keys(doc.paths),
    RegistroDto: doc.components.schemas.RegistroDto,
  };

  // ============ Reinicio: los usuarios viven en MySQL ============
  await stop();
  await start(env);
  const tLuis = await login("luis@itson.mx", "secreto123");
  results.at(-1).title =
    "P2-15 Login de la cuenta registrada despues de reiniciar";
  r = await request(
    "P2-16 Persistencia de inscripciones despues de reiniciar",
    "GET",
    "/inscripciones/1",
    200,
    undefined,
    bearer(tLuis),
  );
  assert.equal(r.response.data.estado, "confirmada");

  // Concurrencia: el cupo se sigue respetando con varias peticiones a la vez.
  const horario = (
    await request(
      "Horario de concurrencia",
      "POST",
      "/horarios",
      201,
      {
        claseId: 1,
        dia: "lunes",
        horaInicio: "12:00",
        cupoMaximo: 1,
        entrenador: "Ana",
      },
      A,
    )
  ).response.data;
  const concurrentes = await Promise.all(
    [1, 2, 3].map((miembroId) =>
      fetch(`http://localhost:${port}/inscripciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...A },
        body: JSON.stringify({ horarioId: horario.id, miembroId }),
      }),
    ),
  );
  assert.deepEqual(concurrentes.map((x) => x.status).sort(), [201, 409, 409]);
  console.log("OK Concurrencia: 1 alta y 2 conflictos, sin sobrecupo");
  await stop();

  fs.mkdirSync("evidencias", { recursive: true });
  fs.writeFileSync(
    "evidencias/resultados.json",
    JSON.stringify(
      {
        fecha: new Date().toISOString(),
        total: results.length + 1,
        concurrencia: [201, 409, 409],
        jwtKarla: { token: tKarla, ...jwt },
        resultados: results,
      },
      null,
      2,
    ),
  );
  // Sin los codigos de color ANSI, para que se lea en cualquier editor.
  fs.writeFileSync(
    "evidencias/consola-servidor.log",
    consola.replace(/\x1b\[[0-9;]*m/g, ""),
  );
  console.log(`${results.length + 1} comprobaciones correctas.`);
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await stop();
    if (admin) {
      // El identificador solo se genera arriba; nunca se elimina la base de DATABASE_URL.
      if (!/^gimnasio_p10_test_\d+$/.test(dbName))
        throw new Error("Nombre de base temporal invalido");
      await admin.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
      await admin.end();
    }
  });

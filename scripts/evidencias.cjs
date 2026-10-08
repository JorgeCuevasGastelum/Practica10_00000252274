/* Convierte evidencias/resultados.json (lo escribe npm test) en reportes HTML
 * y, si hay Microsoft Edge, en capturas PNG. Uso: node scripts/evidencias.cjs */
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const os = require("node:os");

const datos = JSON.parse(fs.readFileSync("evidencias/resultados.json", "utf8"));
const consola = fs.readFileSync("evidencias/consola-servidor.log", "utf8");
const escape = (v) =>
  String(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const json = (v) => escape(JSON.stringify(v, null, 2));
const por = (...prefijos) =>
  datos.resultados.filter((r) => prefijos.some((p) => r.title.startsWith(p)));

// Encabezados que importan en cada evidencia; el resto es ruido.
const RELEVANTES = [
  "x-request-id",
  "location",
  "access-control-allow-origin",
  "access-control-expose-headers",
  "content-type",
];

function tarjeta(r, { todos = false } = {}) {
  const headers = Object.entries(r.headers)
    .filter(([k]) => todos || RELEVANTES.includes(k))
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  const peticion = { headers: r.requestHeaders, body: r.body };
  if (peticion.headers.Authorization)
    peticion.headers = {
      ...peticion.headers,
      Authorization: peticion.headers.Authorization.slice(0, 40) + "…",
    };
  return `<article><h2>${escape(r.title)}</h2>
<p class="ruta">${r.method} ${escape(r.route)} → <b class="s${String(r.status)[0]}">HTTP ${r.status}</b></p>
<h3>Petición</h3><pre>${json(peticion)}</pre>
<h3>Encabezados de respuesta</h3><pre>${escape(headers || "(ninguno relevante)")}</pre>
<h3>Cuerpo de respuesta</h3><pre>${typeof r.response === "string" ? escape(r.response) : json(r.response)}</pre></article>`;
}

function pagina(titulo, subtitulo, contenido, columnas = 2) {
  return `<!doctype html><html lang="es"><meta charset="utf-8"><title>${titulo}</title><style>
*{box-sizing:border-box}body{font:15px system-ui,sans-serif;margin:0;padding:32px;background:#eef2f6;color:#152434}
header{margin-bottom:20px}h1{font-size:28px;margin:6px 0}header p{color:#46566a;margin:4px 0}
.grid{display:grid;grid-template-columns:repeat(${columnas},minmax(0,1fr));gap:18px}
article{background:#fff;border:1px solid #ccd5df;border-radius:12px;padding:20px}
h2{font-size:17px;margin:0 0 12px}h3{font-size:13px;color:#46566a;margin:14px 0 6px}
.ruta{font-family:Consolas,monospace;font-weight:bold;color:#155b71;margin:0}
.s2{color:#1a7f37}.s4{color:#b3261e}.s5{color:#b3261e}
pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f4f6f9;border-radius:6px;padding:12px;font:12.5px/1.5 Consolas,monospace;margin:0}
.nota{background:#fff8e1;border:1px solid #f0d68a;border-radius:8px;padding:12px 14px;margin-top:16px}
footer{margin-top:20px;color:#46566a;font-size:12px}
.jwt span{font:14px/1.6 Consolas,monospace;overflow-wrap:anywhere}.h{color:#d63aff}.p{color:#00a3c4}.f{color:#fb015b}
</style><header><p>PRÁCTICA 10 · Jorge Cuevas Gastelum · 00000252274</p><h1>${titulo}</h1><p>${subtitulo}</p></header>
<main>${contenido}</main><footer>Generado por scripts/evidencias.cjs a partir de respuestas HTTP reales (npm test, NestJS + Prisma + MySQL) · ${escape(datos.fecha)}</footer></html>`;
}

const grid = (rs, cols, opciones) =>
  `<div class="grid" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${rs.map((r) => tarjeta(r, opciones)).join("")}</div>`;

const reportes = [];
const agregar = (archivo, titulo, subtitulo, contenido, cols, alto = 1100) =>
  reportes.push({
    archivo,
    html: pagina(titulo, subtitulo, contenido, cols),
    alto,
  });

// ---------------- Parte 1 ----------------
agregar(
  "p1-01-conflicto-409",
  "409 con la nueva forma (DominioExceptionFilter)",
  "El cupo lleno y la inscripción duplicada salen del filtro: error = nombre de la clase, path y timestamp.",
  grid(por("P1-03", "P1-04"), 2),
);
agregar(
  "p1-02-x-request-id",
  "X-Request-Id (PeticionIdMiddleware)",
  "Si el cliente no manda uno se genera un UUID; si lo manda, se respeta.",
  grid(por("P1-08", "P1-09"), 2),
);
const lineasHttp = consola
  .split(/\r?\n/)
  .filter((l) => /\[(HTTP|Dominio)\]/.test(l))
  .slice(0, 40)
  .join("\n");
agregar(
  "p1-03-consola-tiempos",
  "Consola con los tiempos (LoggingInterceptor)",
  "Líneas [HTTP] del interceptor y [Dominio] del filtro. Los 409/404 sólo salen como WARN [Dominio]: el tap() no corre cuando hay error.",
  `<article><pre>${escape(lineasHttp)}</pre></article>`,
  1,
  1200,
);
agregar(
  "p1-04-sobre",
  "Respuesta con el sobre { data, meta } (SobreInterceptor)",
  "Las respuestas exitosas vienen envueltas; los errores no (comparar con el 409).",
  grid(por("P1-10", "P1-03"), 2),
);
agregar(
  "p1-05-cors",
  "CORS: origen permitido vs. no permitido",
  "El servidor responde 200 en los dos casos. Sólo al permitido le manda Access-Control-Allow-Origin.",
  grid(por("P1-11", "P1-12"), 2),
);
agregar(
  "p1-06-next-comentado",
  "Middleware con next() comentado",
  "La petición se queda colgada: no hay respuesta ni error.",
  `<article><pre>${escape(fs.readFileSync("evidencias/next-comentado.txt", "utf8"))}</pre></article>`,
  1,
  800,
);

// ---------------- Parte 2 ----------------
agregar(
  "p2-01-401-sin-token",
  "401 sin token (JwtAuthGuard global)",
  "Todo pide token salvo lo marcado con @Publico(). GET /clases sigue abierto.",
  grid(por("P2-01", "P2-08", "P2-02"), 3),
);
agregar(
  "p2-02-login",
  "Inicio de sesión (POST /auth/login)",
  "Credenciales buenas → 200 con el token. Correo inexistente y contraseña mala → el MISMO 401.",
  grid(por("Login karla", "P2-04", "P2-05"), 3),
);
const t = datos.jwtKarla;
const [th, tp, tf] = t.token.split(".");
agregar(
  "p2-03-datos-token",
  "Datos del token (lo que se lee sin el secreto)",
  "Las dos primeras partes son base64url: cualquiera las decodifica (como jwt.io). La firma no se puede rehacer sin JWT_SECRET.",
  `<article class="jwt"><h2>Token de karla@itson.mx</h2><p><span class="h">${th}</span>.<span class="p">${tp}</span>.<span class="f">${tf}</span></p></article>
<div class="grid" style="margin-top:18px"><article><h2 class="h">HEADER</h2><pre>${json(t.header)}</pre>
<h2 class="p" style="margin-top:16px">PAYLOAD</h2><pre>${json(t.payload)}</pre>
<p class="nota">iat = ${new Date(t.payload.iat * 1000).toISOString()}<br>exp = ${new Date(t.payload.exp * 1000).toISOString()} (1 hora después)<br>No viene la contraseña ni el hash.</p></article>
${tarjeta(por("P2-06")[0])}</div>
<div class="grid" style="margin-top:18px">${tarjeta(por("P2-07")[0])}<article><h2>¿Qué pasó?</h2><p>Se tomó el token de Karla, se cambió el payload a <code>"rol": "admin"</code> y se dejó la misma firma. El servidor recalcula HMAC-SHA256(header.payload, JWT_SECRET), no coincide con la firma y responde 401.</p></article></div>`,
  2,
  1750,
);
agregar(
  "p2-04-403",
  "403: se sabe quién eres y no puedes",
  "Karla (miembro 1) intenta inscribir a Sofía (miembro 3). El miembroId sale del token, no del cuerpo.",
  grid(por("P1-01", "P2-09"), 2),
);
const migracion = fs
  .readdirSync("prisma/migrations")
  .filter((d) => d.endsWith("_usuarios"))[0];
const arbol = fs
  .readdirSync("prisma/migrations")
  .map((d) =>
    d === migracion ? `├─ ${d}/   ← NUEVA\n│    └─ migration.sql` : `├─ ${d}`,
  )
  .join("\n");
agregar(
  "p2-06-migracion-usuarios",
  "Migración de usuarios",
  "npx prisma migrate dev --name usuarios",
  `<div class="grid"><article><h2>prisma/migrations/</h2><pre>${escape(arbol)}</pre></article>
<article><h2>${migracion}/migration.sql</h2><pre>${escape(fs.readFileSync(path.join("prisma/migrations", migracion, "migration.sql"), "utf8"))}</pre></article></div>`,
  2,
  800,
);
agregar(
  "p2-07-login-despues-de-reiniciar",
  "Inicio de sesión después de reiniciar el servidor",
  "La cuenta se registra, el servidor se detiene y se vuelve a levantar, y el login sigue funcionando: el usuario está en MySQL.",
  grid(por("P2-10", "P2-15", "P2-16"), 3),
);
agregar(
  "p2-08-tarea-roles",
  "Tarea: sólo entrenador y admin cancelan (RolesGuard + @Roles)",
  "La misma ruta DELETE /inscripciones/1: sin token 401, con miembro 403, con entrenador 200.",
  grid(por("T-01", "T-02", "T-03"), 3),
);

fs.mkdirSync("evidencias/html", { recursive: true });
for (const r of reportes)
  fs.writeFileSync(`evidencias/html/${r.archivo}.html`, r.html);
console.log(`${reportes.length} reportes HTML en evidencias/html/`);

// Capturas PNG con Edge sin ventana, si esta instalado.
const edge = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find((p) => fs.existsSync(p));
if (!edge) {
  console.log("Sin Edge: no se generaron PNG.");
} else {
  for (const r of reportes) {
    const html = path.resolve(`evidencias/html/${r.archivo}.html`);
    // perfil nuevo en cada captura: si el perfil esta en uso, Edge le pasa el
    // trabajo a esa instancia y regresa sin escribir el PNG
    const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "edge-p10-"));
    execFileSync(
      edge,
      [
        "--headless=new",
        `--user-data-dir=${perfil}`,
        "--disable-gpu",
        "--hide-scrollbars",
        `--window-size=1500,${r.alto}`,
        `--screenshot=${path.resolve(`evidencias/${r.archivo}.png`)}`,
        `file:///${html.replaceAll("\\", "/")}`,
      ],
      { stdio: "ignore" },
    );
    // Edge puede seguir escribiendo unos segundos despues de regresar.
    const png = path.resolve(`evidencias/${r.archivo}.png`);
    const limite = Date.now() + 15000;
    while (!fs.existsSync(png) && Date.now() < limite)
      execFileSync(process.execPath, ["-e", "setTimeout(()=>{},300)"]);
    if (!fs.existsSync(png)) console.log(`No se genero ${r.archivo}.png`);
    try {
      fs.rmSync(perfil, { recursive: true, force: true, maxRetries: 5 });
    } catch {
      // Edge todavia tiene archivos abiertos; es una carpeta temporal, se queda.
    }
  }
  console.log(`${reportes.length} capturas PNG en evidencias/`);
}

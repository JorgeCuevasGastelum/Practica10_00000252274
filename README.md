# Practica 10 — Blindar la API, JWT y OpenAPI
## Jorge Cuevas Gastelum - 00000252274
## Topico de Aplicaciones Web 7:30 - 9:00 P:M

La misma API del gimnasio de la Practica 9 (NestJS + Prisma + MySQL), ahora
terminada. En la Parte 1 los errores se traducen en un solo filtro, cada
peticion lleva un X-Request-Id, se mide cuanto tarda, todas las respuestas
buenas salen en un sobre { data, meta } y se abre CORS para el React de la
Unidad III. En la Parte 2 se sabe quien hace cada peticion con JWT, los
usuarios viven en MySQL y la documentacion OpenAPI esta en /docs.

Los dominios, servicios y repositorios de la Practica 9 no se tocaron. Lo
nuevo esta en src/comun/ (filtro, middleware, interceptores) y en src/auth/
(usuario, registro, login, estrategia, guards y decoradores).


### Evidencias

| Que se pide | Archivo |
|---|---|
| El 409 con la nueva forma | `evidencias/p1-01-conflicto-409.png` |
| Una respuesta con X-Request-Id | `evidencias/p1-02-x-request-id.png` |
| La consola con los tiempos | `evidencias/p1-03-consola-tiempos.png` y `consola-servidor.log` |
| Una respuesta con el sobre | `evidencias/p1-04-sobre.png` |
| Las dos pruebas de CORS | `evidencias/p1-05-cors.png` |
| next() comentado | `evidencias/p1-06-next-comentado.png` |
| El 401 sin token | `evidencias/p2-01-401-sin-token.png` |
| El inicio de sesion | `evidencias/p2-02-login.png` |
| Los datos del token | `evidencias/p2-03-datos-token.png` |
| El 403 | `evidencias/p2-04-403.png` |
| /docs con el candado | `evidencias/p2-05-docs-openapi.png` |
| La carpeta de la migracion de usuarios | `evidencias/p2-06-migracion-usuarios.png` |
| Login despues de reiniciar el servidor | `evidencias/p2-07-login-despues-de-reiniciar.png` |
| Tarea: roles | `evidencias/p2-08-tarea-roles.png` |
| Dibujo del flujo de JWT | `evidencias/jwt-flujo.png` |

Todas salen de respuestas HTTP reales guardadas en
`evidencias/resultados.json`.



## Preguntas de reflexion — Parte 1

### 1. ¿Por que el filtro atrapa la clase base y no cada error por separado?

Porque asi le llega cualquier error del gimnasio, el de hoy y el que se
agregue manana, sin tener que listarlos. Si se crea un error nuevo y no se
mapea, sale 500 con su nombre y un WARN en la consola: se nota que falta.

Y los errores que no son de dominio (un 400 del ValidationPipe, un
NotFoundException) no heredan de ErrorDeDominio, asi que el filtro no se
mete con ellos.

### 2. ¿Que pasa si se comenta next()?

La peticion se queda colgada. Con curl y un limite de 8 segundos se corto
por tiempo sin recibir nada: ni estado, ni encabezados, ni cuerpo. En la
consola tampoco salio ningun error (`evidencias/next-comentado.txt`).
Nadie contesta y nadie se queja.

### 3. ¿Por que este middleware no podria decidir si un usuario tiene permiso para una ruta?

Porque corre antes de que Nest sepa que controller y que metodo van a
atender la peticion. Para decidir permisos hay que leer @Publico() o
@Roles(), que son metadatos del metodo, y eso solo se puede con el
ExecutionContext que tienen los guards. El middleware solo ve la URL.

### 4. ¿Por que la peticion que responde 409 no aparece en ese registro?

Porque tap() solo corre cuando el controller responde bien. Si el Service
lanza CupoLlenoError, el error se salta el tap y se va directo al filtro.
Por eso el 409 aparece como `WARN [Dominio]`, que lo escribe el filtro, y
no como `[HTTP]`.

### 5. ¿Por que este cambio rompe a cualquier cliente que ya estuviera usando la API?

Porque cambia la forma de todas las respuestas. Antes GET /clases regresaba
un arreglo y ahora `{ data, meta }`. Un cliente que hacia `res[0]` o
`res.map(...)` ahora truena, aunque el servidor siga respondiendo 200. Por
eso se decide ahora, antes de que exista el React de la Unidad III.

### 6. Si el servidor respondio en los dos casos, ¿quien bloquea y a quien protege?

Bloquea el navegador y protege al usuario. El servidor respondio 200 a los
dos origenes; la diferencia es que solo a 5173 le mando
`Access-Control-Allow-Origin`. Sin ese encabezado el navegador no deja que
el JavaScript de la pagina lea la respuesta. Al servidor no lo protege:
curl o Postman leen todo igual.


## Preguntas de reflexion — Parte 2

### 1. ¿Por que el campo se llama passwordHash y no password?

Para que sea imposible guardar la contrasena en claro por descuido. El DTO
trae `password` y la entidad pide `passwordHash`, asi que no se puede pasar
uno por el otro sin llamar a bcrypt.hash(). Ademas dice lo que de verdad
hay en la columna.

### 2. ¿Por que los dos errores del inicio de sesion dicen exactamente lo mismo?

Para no revelar que correos existen. Si fueran distintos, cualquiera podria
probar correos uno por uno y saber cuales estan registrados. Con el mismo
401 "Credenciales invalidas" no se puede distinguir.

### 3. ¿Que se puede leer del token sin conocer el secreto?

Todo menos validar la firma. El header y el payload son base64url, no van
cifrados. Del token de Karla se lee `alg: HS256`, y en el payload `sub`,
`correo`, `rol`, `miembroId`, `iat` y `exp` (`p2-03-datos-token.png`).

### 4. Si el contenido se puede leer, ¿que es lo que protege la firma?

Protege que nadie lo cambie. La firma es HMAC-SHA256 del header y el
payload con JWT_SECRET. Si alguien cambia el payload a `"rol": "admin"`, la
firma ya no coincide y no puede hacer otra sin el secreto. Lo probe en
P2-07 y el servidor respondio 401.

### 5. ¿Por que es mas seguro proteger todo y abrir a mano, que al reves?

Porque si se olvida un @Publico(), la ruta da 401 y se nota de inmediato.
Si todo estuviera abierto y se olvida proteger una ruta, funciona normal y
nadie ve el hueco hasta que alguien lo usa.

### 6. ¿Cual es la diferencia entre un 401 y un 403?

401 es "no se quien eres": no hay token o no es valido. 403 es "se quien
eres y no puedes": el token es bueno pero no tienes permiso. Por ejemplo,
Karla inscribiendo a Sofia da 403.

### 7. ¿Cuantas lineas del AuthService tuvieron que cambiar para pasar de memoria a MySQL? ¿Por que?

Ninguna. Solo cambio una linea de auth.module.ts:

```ts
{ provide: USUARIO_REPOSITORY, useClass: UsuarioPrismaRepository },
```

El AuthService depende de la interfaz UsuarioRepository, no de una clase
concreta. Mientras el repositorio nuevo cumpla el contrato, el Service no
se entera.

### 8. ¿Por que es importante tomar al usuario de los claims del token y no de un parametro de la URL o del cuerpo?

Porque la URL y el cuerpo los escribe el cliente y puede poner lo que
quiera. Si la API confiara en `GET /miembros/3/inscripciones`, Karla
cambiaria el 3 por cualquier numero y veria las inscripciones de otros. Si
confiara en el `miembroId` del cuerpo, podria inscribir a Sofia.

Por eso el controller compara el `miembroId` del cuerpo contra el claim
`miembroId` del token (que llega con @UsuarioActual()). El cliente no lo
puede falsificar porque el payload va firmado con JWT_SECRET: si lo cambia,
la firma no coincide y el guard responde 401. El dibujo del flujo esta en
`evidencias/jwt-flujo.png`.

### Tarea: roles

Hice un decorador `@Roles(...)` y un `RolesGuard` global que corre despues
del JwtAuthGuard y compara el rol del token con los que pide la ruta. En
inscripciones solo se agrego `@Roles(Rol.entrenador, Rol.admin)` al DELETE.
Resultado (`p2-08-tarea-roles.png`): sin token 401, con miembro 403 y con
entrenador 200.


## Preguntas de reflexion — Practica 9

### 1. ¿Que linea del Service o Controller cambio para conectar Clases con MySQL?

Ninguna. Solo cambio el proveedor del modulo a
`useClass: ClasePrismaRepository`.

### 2. ¿Por que InscripcionesService conserva las reglas de cupo y duplicados?

Porque depende del contrato InscripcionRepository, no de como se guardan
los datos. Las reglas siguen en el servicio.

### 3. ¿Por que una interfaz no valida en tiempo de ejecucion?

Porque TypeScript borra las interfaces al compilar y class-validator no
tiene nada que revisar. Por eso los DTO son clases.

### 4. ¿Que estado y cuerpo devuelve la validacion?

400 Bad Request, con `message` como arreglo de errores. Los 400 no van en
el sobre.

### 5. ¿Cuantas lineas se redujo el controlador?

De 81 a 56 lineas al quitar el try/catch y la traduccion de los errores.

### 6. Si llegan ambas respuestas, ¿quien bloquea y a quien protege CORS?

El navegador, y protege al usuario (ver la pregunta 6 de la Parte 1).

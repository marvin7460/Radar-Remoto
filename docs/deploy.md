# Deploy paso a paso (todo en planes gratuitos)

Piezas: **Turso** (base de datos), **Netlify** (la web), **GitHub Actions** (ingesta cada 6 h y resumen diario)
y **Resend** (correos). Tiempo estimado: 30–40 minutos.

## 1. Base de datos: Turso

1. Crea una cuenta en <https://turso.tech> e instala la CLI: <https://docs.turso.tech/cli/installation>.
2. En una terminal:

   ```bash
   turso auth login
   turso db create radar-remoto
   turso db show radar-remoto --url       # → TURSO_DATABASE_URL (empieza con libsql://)
   turso db tokens create radar-remoto    # → TURSO_AUTH_TOKEN
   ```

3. Pon esos dos valores en `.env.local` y aplica las migraciones desde tu máquina:

   ```bash
   npm run db:migrate
   npm run ingest      # primera carga de vacantes (opcional; GitHub Actions lo hará cada 6 h)
   ```

## 2. Correos: Resend

1. Crea una cuenta en <https://resend.com> y una API key (**Send access** basta) → `RESEND_API_KEY`.
2. Para pruebas puedes usar el remitente `onboarding@resend.dev`, pero **solo envía a tu propio correo**.
   Para mandar a cualquiera, verifica un dominio en Resend → Domains y usa algo como
   `EMAIL_FROM="Radar Remoto <alertas@tudominio.com>"`.
3. Límites del plan gratuito: 100 correos al día y 3,000 al mes. El resumen se detiene en 80 por corrida para dejar
   espacio a los links de acceso.

## 3. Secretos

Genera dos valores aleatorios:

```bash
openssl rand -hex 32   # → AUTH_SECRET (firma los links de baja)
openssl rand -hex 24   # → ADMIN_TOKEN (entrada a /admin para etiquetar)
```

## 4. Web: Netlify

1. <https://app.netlify.com> → **Add new site** → **Import an existing project** → GitHub → `Radar-Remoto`.
2. La configuración de build se lee de `netlify.toml` (no cambies nada).
3. **Site configuration → Environment variables**, agrega:

   | Variable             | Valor                                                                            |
   | -------------------- | -------------------------------------------------------------------------------- |
   | `TURSO_DATABASE_URL` | de Turso                                                                         |
   | `TURSO_AUTH_TOKEN`   | de Turso                                                                         |
   | `AUTH_SECRET`        | el que generaste                                                                 |
   | `ADMIN_TOKEN`        | el que generaste                                                                 |
   | `RESEND_API_KEY`     | de Resend                                                                        |
   | `EMAIL_FROM`         | `Radar Remoto <onboarding@resend.dev>` o tu dominio                              |
   | `APP_URL`            | la URL de tu sitio, p. ej. `https://radar-remoto.netlify.app` (sin `/` al final) |

4. **Deploy**. Cada push a la rama de producción vuelve a publicar.
5. Si cambias `APP_URL`, vuelve a desplegar: `robots.txt` se genera en el build.

## 5. Tareas programadas: GitHub Actions

En GitHub: **Settings → Secrets and variables → Actions**.

- **Secrets** (pestaña _Secrets_): `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `RESEND_API_KEY`, `AUTH_SECRET`.
- **Variables** (pestaña _Variables_): `APP_URL`, `EMAIL_FROM`.

Luego, en la pestaña **Actions**:

1. **Ingest jobs** → _Run workflow_: confirma que termina en verde. Después corre solo cada 6 horas.
2. **Daily alert emails** → _Run workflow_: manda el resumen a mano. Después corre solo a las 9:00 (hora de México).
3. **Refresh API fixtures** (opcional): actualiza las respuestas reales que usan los tests.

> Los workflows programados solo corren desde la **rama por defecto** del repositorio. Si trabajas en otra
> rama, haz merge a la principal para activarlos.

## 6. Verificación

- `/` lista vacantes con su fuente; prueba filtros y búsqueda.
- `/estado` muestra la última ingesta de cada fuente y las métricas.
- `/entrar` → te llega un correo → **Entrar** → crea una alerta desde una búsqueda.
- `/admin` con tu `ADMIN_TOKEN` → etiqueta vacantes para medir el clasificador.

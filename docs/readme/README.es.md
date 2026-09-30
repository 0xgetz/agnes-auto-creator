<div align="center">

<img src="../assets/banner.svg" alt="Agnes Auto Creator" width="820">

<br>

**Aprovisionamiento automático de cuentas y claves API para Agnes AI — correo nuevo, credenciales aleatorias, de principio a fin.**

<br>

[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-3EC6A0?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Playwright](https://img.shields.io/badge/Playwright-1.47.2-39B4C8?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev)
[![License](https://img.shields.io/badge/License-MIT-2B8FD6?style=flat-square)](../LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-3EC6A0?style=flat-square)](../CHANGELOG.md)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows-2B8FD6?style=flat-square)](#requisitos)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-3EC6A0?style=flat-square)](../CONTRIBUTING.md)

<br>

[English](../README.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [简体中文](README.zh-CN.md) · [Español](README.es.md)

</div>

---

## ✨ Qué hace

**Agnes Auto Creator** crea cuentas de [Agnes AI](https://platform.agnes-ai.com)
de forma totalmente automática. Para cada cuenta:

1. 🎲 Genera una identidad aleatoria — correo, contraseña fuerte y nombre.
2. 📧 Usa una bandeja temporal nueva de [zenvex.dev](https://zenvex.dev).
3. 🔐 Solicita y lee el código de verificación por correo de Agnes.
4. ✅ Registra la cuenta.
5. 🔑 Inicia sesión y crea una **clave API** con nombre aleatorio.

Todo está automatizado y listo para ejecutarse en un VPS con Ubuntu.

> **Resultado por cuenta:** una clave API `sk-...` junto con las credenciales,
> guardadas en un archivo JSON local.

## 🚀 Inicio rápido

```bash
git clone https://github.com/0xgetz/agnes-auto-creator.git
cd agnes-auto-creator
chmod +x setup.sh
./setup.sh                 # instala dependencias y crea 1 cuenta
```

O manualmente:

```bash
npm install
npx playwright install --with-deps chromium
node src/index.mjs -n 3 -o accounts.json
```

## 🖥️ Requisitos

| Elemento  | Mínimo                            |
| --------- | --------------------------------- |
| Node.js   | 18+                               |
| SO        | Linux (Ubuntu/Debian), macOS      |
| Disco     | ~400 MB (Chromium)                |
| Red       | HTTPS saliente a Agnes y zenvex   |

> **¿Por qué Playwright?** La API de Agnes no necesita navegador: es HTTPS puro.
> Solo la bandeja de **zenvex.dev** está detrás de una capa anti-bot de
> Cloudflare que rechaza clientes HTTP básicos, por lo que debe leerse con un
> Chromium real. Ver [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).

## 🛠️ Uso

```bash
node src/index.mjs [opciones]
```

| Opción               | Predeterminado                    | Descripción                       |
| -------------------- | --------------------------------- | --------------------------------- |
| `-n, --count N`      | `1`                               | número de cuentas                 |
| `-d, --domain D`     | aleatorio de la lista             | dominio de recepción de zenvex    |
| `-o, --out FILE`     | `agnes-accounts-<timestamp>.json` | archivo de salida                 |
| `-t, --timeout MS`   | `120000`                          | espera máxima del correo          |
| `--concurrency N`    | `1`                               | cuentas creadas en paralelo       |
| `--headful`          | desactivado                      | mostrar el navegador (depuración) |
| `-q, --quiet`        | desactivado                      | solo el resumen final             |
| `-h, --help`         | —                                 | mostrar ayuda                     |

### Ejemplos

```bash
# crear una cuenta
node src/index.mjs

# crear cinco cuentas en un dominio concreto
node src/index.mjs -n 5 -d znvx.me -o accounts.json

# crear tres cuentas, dos a la vez
node src/index.mjs -n 3 --concurrency 2
```

### Úsalo como librería

```js
import { chromium } from "playwright";
import { provisionOne } from "./src/core/provision.mjs";

const browser = await chromium.launch();
const context = await browser.newContext();
const account = await provisionOne(context, { domain: "souss.dev" });

console.log(account.api_key);
await browser.close();
```

Más en [`examples/programmatic.mjs`](../examples/programmatic.mjs).

## 📦 Formato de salida

```json
[
  {
    "ok": true,
    "email": "swiftfox482913@souss.dev",
    "password": "Xk7!mQ2vPz9rLt4w",
    "full_name": "Putri Maharani",
    "email_provider": "zenvex.dev (souss.dev)",
    "api_key_name": "prod-token-7421",
    "api_key": "sk-................................",
    "user_id": 995419,
    "user_display_id": "20260927133451462",
    "elapsed_ms": 21430,
    "created_at": "2026-09-30T13:36:01.000Z"
  }
]
```

El archivo se escribe **después de cada cuenta**, así el trabajo terminado
sobrevive a un fallo.

## 🗂️ Estructura del proyecto

```
src/
  index.mjs            CLI · argumentos · pool de workers
  core/provision.mjs   flujo completo de una cuenta
  agnes/client.mjs     cliente REST de Agnes
  inbox/zenvex.mjs     lector de bandeja zenvex.dev (Playwright)
  utils/random.mjs     generadores de identidad aleatoria
  utils/logger.mjs     logger estructurado con color
docs/
  ARCHITECTURE.md      cómo funciona y mapa de endpoints
  readme/              traducciones (en, id, ja, zh-CN)
  assets/              logo · banner · wordmark
examples/              uso como librería
```

## ⚠️ Notas y advertencias

- **Límites por dominio.** Agnes puede responder *"Too many registration
  attempts from this email domain"* en algunos dominios temporales. Si ocurre,
  reintenta con otro `--domain` (p. ej. `znvx.me`).
- **Los códigos caducan rápido.** El script lee y envía el código de inmediato;
  subir `--timeout` más de unos minutos no aporta nada.
- **Chromium sin interfaz en un VPS** necesita `--no-sandbox` (ya configurado) y
  las librerías del sistema de `npx playwright install --with-deps chromium`.
- **Secretos generados.** Los archivos de salida están en `.gitignore`. Nunca los
  subas al repositorio.

## 🧭 Filosofía

Este proyecto **no incluye CI a propósito** — sin GitHub Actions, sin runners,
sin secretos en la nube. Lo ejecutas localmente, en tu propia máquina, donde se
crean las cuentas. Menos piezas móviles, nada que filtrar.

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Lee primero [CONTRIBUTING.md](../CONTRIBUTING.md)
y [SECURITY.md](../SECURITY.md).

## 📄 Licencia

Publicado bajo la [Licencia MIT](../LICENSE) © 0xgetz

<div align="center">
<br>
<sub>Sin afiliación con Agnes AI ni SapiensAI. Úsalo de forma responsable y conforme a sus términos de servicio.</sub>
</div>

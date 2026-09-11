# Proyecto: Inmobiliaria Municipal Caribe — Web

## 1. Identidad del Proyecto

Plataforma web de la **Inmobiliaria Municipal Caribe**, entidad que administra y publica inmuebles (apartamentos, casas y locales) en Caracas, Venezuela.

La plataforma tiene doble propósito:
- **Cara externa (pública):** Catálogo de inmuebles + sección de Noticias/Labor Social (próximamente).
- **Cara interna (privada):** Panel administrativo para gestionar el catálogo de inmuebles.

---

## 2. Módulos

| Módulo | Audiencia | Estado |
|---|---|---|
| Catálogo de Inmuebles | Usuarios externos | MVP |
| Administración de Catálogo | Usuarios internos | MVP |
| Noticias / Labor Social | Público general | Próximamente (solo estructura y placeholders) |
| Preguntas / Consultas por Inmueble | Público + internos | Fase posterior (chat estilo Mercado Libre) |

---

## 3. Stack Técnico

- **Frontend:** React (Vite) + TypeScript + TailwindCSS + React Router
- **Enfoque:** Mobile-First (diseñar primero para 375px y escalar)
- **Backend / BaaS:** Supabase (auth + DB): gestiona los inicios de sesión y las tablas del sistema administrativo; guarda metadatos y URLs de imágenes, no archivos.
- **Almacenamiento de imágenes:** Google Drive como fuente de los archivos: carpeta raíz `catalogo_inmuebles/` con una subcarpeta por inmueble; Supabase guarda las URLs.
- **Hosting:** Firebase Hosting
- **Estado global:** Zustand o Context API (elegir el más simple según necesidad)
- **Formularios:** React Hook Form + Zod
- **UI components:** shadcn/ui o componentes propios sobre Tailwind

---

## 4. Design System

- **Fuente de verdad del estilo visual:** se pasará un archivo `.md` con el manual de estilos que el agente leerá como contexto. Este archivo vivirá en `/design-system/brand-guide.md`.
- Los tokens derivados (colores, tipografía, radios, espaciado) se generarán a partir de ese `.md` y se colocarán en `/design-system/tokens.json`.
- Los assets de marca estarán en `/public/brand/` (logo full, icono, monocromo).
- **Regla:** NUNCA hardcodear colores hex en componentes. Siempre usar clases Tailwind derivadas de `tailwind.config.ts` que lee `tokens.json`.
- Antes de crear un componente de UI, revisar `/design-system/components.md` (si existe) para reutilizar antes que reinventar.

### Flujo del manual de estilos
1. Se provee `brand-guide.md` con paleta de color, tipografías, uso de logo, versiones, imágenes.
2. El agente genera `tokens.json` a partir de ese `.md`.
3. Se configura `tailwind.config.ts` para consumir `tokens.json`.
4. Todos los componentes usan las clases Tailwind resultantes.

**Estructura sugerida del `brand-guide.md`:**
```markdown
# Manual de Marca — Inmobiliaria Municipal Caribe

## Paleta de colores
- Primary: #______ (uso: ______)
- Secondary: #______ (uso: ______)
- Accent: #______ (uso: ______)
- Neutrales: ______
- Semánticos: danger, success, warning

## Tipografías
- Heading: ______
- Body: ______
- Escala: h1, h2, h3, body, small

## Logo
- Versión full: ______
- Versión icono: ______
- Versión monocromo: ______
- Tamaño mínimo: ______
- Espacio de respeto: ______
- Usos prohibidos: ______

## Imágenes
- Estilo fotográfico: ______
- Tono: ______
- Tratamiento: ______

## Espaciado y radios
- Unidad base: ______
- Radios: ______
```

---

## 5. Estructura de Carpetas

```text
src/
├── assets/
├── components/
│   ├── ui/          # átomos reutilizables (Button, Input, Card)
│   ├── layout/      # Navbar, Footer, Container
│   └── catalog/     # PropertyCard, PropertyGallery, Filters
├── features/
│   ├── catalog/     # páginas y lógica del catálogo
│   ├── admin/       # panel administrativo
│   └── news/        # noticias (placeholder)
├── hooks/
├── lib/             # supabase client, drive client, utils
├── routes/
├── types/
└── main.tsx
```

```text
design-system/
├── brand-guide.md   # Manual de estilos (input humano)
├── tokens.json      # Design tokens (generado)
└── components.md    # Catálogo de componentes (opcional)
```

```text
public/
└── brand/           # logos, placeholders, iconos
```

---

## 6. Reglas de Código
1. TypeScript estricto. Nada de `any` sin justificación.
2. Componentes funcionales con hooks. Nada de clases.
3. Mobile-First: toda clase Tailwind arranca sin prefijo para móvil y escala con `sm:`, `md:`, `lg:`.
4. Accesibilidad: `alt` en imágenes, `label`s en inputs, contraste AA mínimo.
5. Nombres: componentes en PascalCase, archivos de utilidades en camelCase.
6. Imágenes de inmuebles: mínimo 5 por propiedad, se sirven desde Google Drive (URL directa transformada).
7. Comentarios: solo cuando la lógica no sea obvia.
8. Idioma del código: inglés. Idioma de UI: español (Venezuela).

## 7. Flujo de Imágenes de Inmuebles
1. En Google Drive existe la carpeta raíz `catalogo_inmuebles/`; dentro, una subcarpeta por inmueble con nombre legible para humanos (ej. `apartamento-la-florida-001`).
2. Al registrar un inmueble en el admin, el código crea su subcarpeta en Drive: la organización la manejan los eventos del sistema, no el admin.
3. Carga de fotos — dos vías soportadas:
   - **Manual (MVP):** el admin sube 5+ fotos a la subcarpeta de Drive.
   - **Por app (fase posterior):** el admin sube las fotos desde el formulario y el sistema las envía a Drive vía API.
4. Un servicio (Google Drive API) obtiene los IDs de los archivos y genera las URLs directas.
5. Las URLs se guardan en Supabase (tabla `properties.images[]`).
6. El frontend consume las URLs desde Supabase, NO lista Drive directamente (para evitar rate limits).
7. Placeholder: si un inmueble no tiene imágenes, usar `/public/brand/placeholder-property.webp`.

## 8. Entornos de Imágenes
1. Entorno Front (Landing Page): imágenes de presentación de la página.
2. Entorno Catálogo: mínimo 5 imágenes por inmueble.
3. Entorno Noticias/Reportes: pendiente definir.

## 9. Roadmap Inmediato
□ Setup Vite + React + TS + Tailwind + Router
☑ Recibir brand-guide.md y generar tokens.json
□ Configurar Tailwind con tokens.json
□ Cliente Supabase + auth
□ Layout base (Navbar + Footer responsivos)
□ Página Landing (hero, destacados, CTA)
□ Catálogo público con filtros (tipo, precio, zona)
□ Detalle de inmueble con galería
□ Login admin + CRUD de inmuebles
□ Sync manual de Drive: leer carpetas y generar URLs (MVP)
□ Subida de fotos desde el admin vía Drive API (post-MVP)
□ Estructura de Noticias (placeholder)

## 10. Lo que NO se debe Hacer
1. No inventar colores, tipografías ni assets de marca.
2. No agregar dependencias sin consultarlo.
3. No crear componentes "por si acaso". Solo lo que la tarea pide.
4. No usar localStorage para datos sensibles.
5. No exponer claves de Supabase/Drive en el cliente (usar .env + RLS).

## 11. Dominio y Despliegue
Dominio elegido
inmobiliaria-caribe.com ✅ (registrado vía K2WebHost)

Registrador
K2WebHost — https://www.k2webhost.com/

Proveedor local venezolano, acepta Pago Móvil y transferencia en bolívares.

No aplica bloqueos por sanciones a Venezuela.

Incluye privacidad WHOIS y renovación automática.

Conectar dominio a Firebase Hosting
Firebase Console → Hosting → Agregar dominio personalizado

Escribir inmobiliaria-caribe.com y usar Quick Setup

Agregar registros DNS en el panel de K2WebHost:

Registro TXT (verificación de propiedad):

Tipo: TXT

Host: @

Valor: el string único que da Firebase

Registros A (apuntar tráfico):

Tipo: A

Host: @

Valor: 199.36.158.100

Registro CNAME (para www, opcional):

Tipo: CNAME

Host: www

Valor: el que indique Firebase

Esperar propagación DNS (2-24 horas).

Firebase aprovisiona SSL automáticamente.

Escenario alternativo (mover dominio entre proyectos Firebase):

Opción rápida: eliminar dominio en proyecto origen → agregar en proyecto destino.

Opción sin downtime: usar Advanced Setup, primero TXT, esperar CERT_ACTIVE, luego cambiar A records.

firebase hosting:sites:list
firebase deploy --only hosting
dig inmobiliaria-caribe.com

---

## 12. Roles y Permisos

Cuatro roles para el sistema administrativo, aplicados vía Supabase (tabla de usuarios + políticas RLS). El catálogo público no requiere login.

| Rol | Creación de cuenta | Vista | Edición | Agregar | Eliminar | Interactuar | Gestiona usuarios |
|---|---|---|---|---|---|---|---|
| Master | Solo manual (Supabase) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (módulo propio) |
| Gerente | Por Master (front) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Supervisor | Por Master (front) | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Invitado | Por Master (front) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

- **Master:** cuenta creada únicamente de forma manual en Supabase. Es el único rol con acceso al módulo de administración de usuarios en el front, desde donde crea Gerentes, Supervisores e Invitados.
- **Interactuar:** responder consultas del público en el chat de preguntas por inmueble (fase posterior).
# Documentación Backend — Inmobiliaria Municipal Caribe

- **Fecha de creación:** 2026-09-22
- **Autor:** Equipo de backend
- **Estado:** Vigente
- **Alcance:** Diseño, diagnóstico y hoja de ruta del backend (Supabase + Edge Functions + Google Drive).

---

## ¿Para qué sirve esta carpeta?

Documenta el estado **real** del backend, las decisiones arquitectónicas tomadas y el plan de
implementación. Se escribió tras una auditoría del esquema productivo (introspección SQL del
22/09/2026) y del código existente.

## Índice

| Documento | Contenido |
|---|---|
| [`01-estado-actual.md`](./01-estado-actual.md) | Inventario real de la base de datos y comparación con las migraciones. |
| [`02-arquitectura-backend.md`](./02-arquitectura-backend.md) | Escenario B (Híbrido): frontera lectura/escritura y justificación. |
| [`03-codigo-compartido-edge-functions.md`](./03-codigo-compartido-edge-functions.md) | Diseño del módulo `_shared/` y refactor de las Edge Functions. |
| [`04-integracion-drive.md`](./04-integracion-drive.md) | Informe de Google Drive + Apps Script, capacidad y correcciones. |
| [`05-deuda-tecnica-y-riesgos.md`](./05-deuda-tecnica-y-riesgos.md) | Hallazgos priorizados y riesgos. |
| [`06-hoja-de-ruta.md`](./06-hoja-de-ruta.md) | Plan de implementación con responsabilidades (quién hace qué). |
| [`07-informe-implementacion.md`](./07-informe-implementacion.md) | Informe de los cambios de código ya realizados. |
| [`08-pasos-del-usuario.md`](./08-pasos-del-usuario.md) | Guía paso a paso para desplegar (tareas del usuario). |
| [`09-catalogo-enriquecido.md`](./09-catalogo-enriquecido.md) | Tipos administrables, división territorial y métricas (2026-09-23). |
| [`sql/introspect.sql`](./sql/introspect.sql) | Script reutilizable para volver a auditar el esquema. |

## Convenciones

- **Código** (nombres de archivos, tablas, funciones, variables): inglés.
- **Documentación y UI:** español (Venezuela).
- Las referencias a código usan el formato `ruta/archivo.ts:línea`.
- Los hallazgos se etiquetan con severidad: 🔴 Crítico · 🟠 Alto · 🟡 Medio · 🔵 Bajo.

## Decisiones vigentes (resumen ejecutivo)

1. **Superficie de backend:** Escenario **B (Híbrido)**.
   - Lecturas públicas → PostgREST/RLS (rápido, sin cambios).
   - Escrituras y reglas de negocio → Edge Functions.
2. **Migraciones:** se mantienen **manuales** en el dashboard de Supabase (sin CLI para la DB).
3. **Edge Functions:** se desplegarán con **Supabase CLI (`--use-api`, sin Docker)** para habilitar
   código compartido (`_shared/`).
4. **Imágenes:** se mantiene **Google Drive + Apps Script**, con las correcciones de
   `04-integracion-drive.md`.
5. **Alcance inicial:** documentar y auditar **antes** de tocar código productivo.

## Glosario rápido

- **PostgREST:** capa que Supabase genera automáticamente para exponer las tablas como API REST.
- **RLS (Row Level Security):** políticas de PostgreSQL que deciden fila por fila qué puede ver o
  modificar cada usuario.
- **Edge Function:** función serverless (Deno) que corre en la red de Supabase.
- **Apps Script:** script de Google que actúa como puente entre Supabase y Google Drive.
- **`_shared/`:** carpeta de código común a varias Edge Functions (no se despliega como función).

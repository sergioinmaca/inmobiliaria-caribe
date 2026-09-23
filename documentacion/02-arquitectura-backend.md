# 02 — Arquitectura de backend (Escenario B: Híbrido)

- **Estado:** Decisión aprobada
- **Decisión:** lecturas públicas por PostgREST/RLS; **escrituras y reglas de negocio por Edge Functions**.

---

## 1. Por qué Híbrido

Se evaluaron tres superficies de backend:

| Criterio | A · BaaS puro | **B · Híbrido** | C · API propia |
|---|---|---|---|
| Esfuerzo inicial | Bajo | Medio | Alto |
| Reglas de negocio en servidor | No | **Sí** | Sí |
| Front acoplado al esquema | Alto | Medio | Bajo |
| Velocidad de lectura | Alta | **Alta** | Media |
| Auditable | Difícil | **Sí** | Sí |
| Encaje con el proyecto | Aceptable | **Óptimo** | Sobredimensionado |

**Híbrido** conserva la velocidad de PostgREST para el catálogo (que es de solo lectura y público) y
mueve al servidor lo que hoy es frágil: las escrituras y las reglas de negocio que el cliente puede
saltarse llamando la API directamente.

---

## 2. Frontera lectura / escritura

```
                            ┌─────────────────────────────────────────┐
   Público (sin login)      │  Catálogo, landing, detalle             │
   LECTURAS ───────────────▶│  supabase.from('propiedades')           │
                            │  .select(...)   → PostgREST → RLS        │
                            └─────────────────────────────────────────┘

                            ┌─────────────────────────────────────────┐
   Admin (con login)        │  Crear/editar/activar/eliminar inmueble  │
   ESCRITURAS ─────────────▶│  supabase.functions.invoke('propiedades')│
                            │  → Edge Function (valida rol + reglas)   │
                            └─────────────────────────────────────────┘

                            ┌─────────────────────────────────────────┐
   Imágenes                 │  supabase.functions.invoke('drive')      │
                            │  → Edge Function → Apps Script → Drive   │
                            └─────────────────────────────────────────┘

                            ┌─────────────────────────────────────────┐
   Usuarios (solo Master)   │  supabase.functions.invoke('admin')      │
                            │  → Edge Function (service_role)          │
                            └─────────────────────────────────────────┘
```

### ¿Qué se queda como lectura directa (PostgREST)?
- Catálogo público (`useProperties`) y detalle de inmueble.
- Lectura del perfil propio (`useSession`).
- Lectura de `settings.usd_to_bs_rate` para mostrar precios.

### ¿Qué pasa a Edge Functions (escritura)?
- CRUD de inmuebles y cambio de estado (`propiedades`).
- Todas las operaciones de `drive` (ya lo están).
- Creación/desactivación de usuarios (`admin`; ya lo está).

---

## 3. Capas de seguridad (defensa en profundidad)

Con Escenario B hay **tres** capas, no una:

1. **RLS (PostgreSQL):** sigue activa. Aunque una Edge Function use `service_role`, las lecturas
   públicas siguen pasando por RLS. Es la última línea de defensa.
2. **Edge Function (servidor):** valida JWT, rol real y reglas de negocio antes de escribir.
3. **Cliente (UX):** `RequireRole` y avisos; ya **no** es la seguridad, solo la experiencia.

> Regla de oro: la autorización se decide en el servidor. El cliente nunca es fuente de verdad.

---

## 4. Ciclo de vida de una escritura (ejemplo: activar inmueble)

Hoy (`src/features/admin/AdminListPage.tsx:92-119`):
1. El cliente valida ≥5 imágenes y campos.
2. `supabase.from('propiedades').update({ is_active: true })` directo a la DB.
3. Si alguien llama la API sin pasar por la UI, la regla se salta.

Con Escenario B:
1. El cliente llama `supabase.functions.invoke('propiedades', { body: { action: 'setActive', id, isActive: true } })`.
2. La Edge Function **autentica** (JWT) y **valida rol** (`master`/`gerente`).
3. La Edge Function lee el inmueble (service role), valida **en servidor** ≥5 imágenes y campos.
4. Si falla, devuelve `400` con mensaje claro; si pasa, escribe y sincroniza visibilidad en Drive.
5. Responde `{ ok: true }`.

La regla ya **no** puede saltarse desde el navegador.

---

## 5. Matriz de roles (vigente)

| Rol | Vista | Edición | Agregar | Eliminar | Gestiona usuarios |
|---|---|---|---|---|---|
| Master | ✅ | ✅ | ✅ | ✅ | ✅ (módulo propio) |
| Gerente | ✅ | ✅ | ✅ | ✅ | ❌ |
| Supervisor | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invitado | ✅ | ❌ | ❌ | ❌ | ❌ |

- **Master:** cuenta creada manualmente en Supabase; único con módulo de usuarios.
- En fotos: solo **Gerente** y **Master** gestionan imágenes (subir, reordenar, eliminar, sincronizar).

Estas reglas deberán codificarse en las Edge Functions (`requireRole`) **y** reflejarse en RLS.

---

## 6. Funciones previstas

| Función | Acciones | Roles | Estado |
|---|---|---|---|
| `admin` | `createUser` | master | Existe; se refactoriza |
| `drive` | `createFolder`, `list`, `sync`, `upload`, `delete`, `setVisibility`, ... | gerente, master | Existe; se refactoriza |
| `propiedades` | `create`, `update`, `setActive`, `delete` | gerente, master (según acción) | **Nueva** |

---

## 7. Consecuencias del Escenario B

**Ventajas**
- Reglas de negocio centralizadas y auditables.
- El cliente no puede violar invariantes.
- Contrato estable (payload de la función) menos acoplado al esquema que PostgREST.
- Camino natural de crecimiento a nuevos módulos (noticias, consultas).

**Costos**
- Dos caminos de acceso; hay que respetar la frontera.
- *Cold start* de Edge Functions (cientos de milisegundos) en escrituras.
- Necesita el código compartido (`03-codigo-compartido-edge-functions.md`) para no duplicar.
- Requiere desplegar funciones con CLI (solo funciones; migraciones siguen manuales).

# SincroAI Office — Contexto del Proyecto

## Descripción
**sincroai-office** es la Oficina Virtual de SincroAI: un sistema de automatización con IA para clínicas estéticas. Cinco agentes de IA trabajan en equipo para prospectar, cerrar, onboardear y dar soporte a clientes.

## Stack
- **Next.js 14** (App Router, Server Components por default)
- **TypeScript**
- **Tailwind CSS** con tema oscuro y acentos violet
- **Supabase** — base de datos y auth (mock en Fase 1)
- **Resend** — emails transaccionales
- **Radix UI** — primitivos accesibles (@radix-ui/react-dialog, react-select, react-separator, react-slot)
- **lucide-react** — iconos
- **class-variance-authority** — variantes de componentes
- **tailwind-merge** + **clsx** — combinación de clases

## Fase actual: 1
UI completa con datos mock. Sin conexión real a Supabase todavía. Las funciones en `lib/supabase.ts` devuelven datos de `lib/mock-data.ts` y tienen comentarios `// TODO Fase 2` para cuando se conecte la DB real.

## Convenciones

### Componentes
- Siguen el patrón shadcn/ui con CSS variables definidas en `tailwind.config.ts`
- Tema oscuro por default: fondos `gray-900`/`gray-950`, bordes `gray-700`/`gray-800`, acento `violet-500`/`violet-600`
- Usar siempre `cn()` de `lib/utils.ts` para combinar clases de Tailwind
- `'use client'` solo donde haga falta interactividad (`useState`, `useEffect`, `onClick`, `usePathname`, etc.)

### TypeScript
- Tipos centralizados en `lib/types.ts`
- Path alias `@/*` apunta a la raíz del proyecto

### UI
- Idioma de la interfaz: **español**
- Acentos: violet (`#8B5CF6` / `violet-500`)

## Estructura del proyecto

```
app/
  page.tsx                  → Dashboard principal
  agents/
    page.tsx                → Lista de agentes
    [id]/page.tsx           → Detalle de agente
  control/page.tsx          → Centro de control (enviar comandos)
  activity/page.tsx         → Log de actividad completo
  api/
    notify/route.ts         → Notificaciones con Resend

lib/
  types.ts                  → Tipos TypeScript (Agent, Task, Message, ActivityLog, etc.)
  mock-data.ts              → Datos demo + helpers (getAgentById, getTasksByAgent, etc.)
  supabase.ts               → Cliente Supabase + funciones de datos (mock en Fase 1)
  utils.ts                  → cn(), formatTimestamp()

components/
  ui/
    button.tsx              → Button con variantes CVA
    card.tsx                → Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
    badge.tsx               → Badge con variantes de status
    input.tsx               → Input con focus ring violet
    dialog.tsx              → Modal wrapper de Radix Dialog
    select.tsx              → Select wrapper de Radix Select
  sidebar.tsx               → Sidebar de navegación
```

## Agentes del sistema

| Agente | Rol | Status | Avatar |
|--------|-----|--------|--------|
| Luna | Prospector — identifica y califica clínicas | active | 🔍 |
| Marco | Closer — convierte prospectos en clientes | active | 🤝 |
| Vera | Onboarder — configura el sistema para nuevos clientes | idle | ⚡ |
| Atlas | Support — monitorea y mantiene los sistemas 24/7 | active | 🛡️ |
| Nova | Strategist — analiza métricas y optimiza revenue | busy | 📊 |

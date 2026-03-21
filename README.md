# SincroAI Virtual Office

Dashboard de control para los agentes de IA de SincroAI.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (configurado via env vars)

## Setup local

```bash
npm install
cp .env.example .env.local
# completar las variables en .env.local
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Deploy en Vercel

1. Push este repo a GitHub
2. Importar en [vercel.com](https://vercel.com)
3. Agregar las variables de entorno del `.env.example`
4. Deploy automático

## Estructura

```
app/
  page.tsx              → Dashboard principal
  agents/page.tsx       → Lista de agentes
  agents/[id]/page.tsx  → Detalle de agente
  control/page.tsx      → Centro de control
  activity/page.tsx     → Log de actividad
lib/
  mock-data.ts          → Datos demo (reemplazar por Supabase en Fase 2)
  types.ts              → Tipos TypeScript
  supabase.ts           → Cliente Supabase
```

## Fases

- **Fase 1 (actual):** UI completa con datos mock
- **Fase 2:** Conectar agentes reales + email outreach (Resend)
- **Fase 3:** Agentes autónomos con acceso a herramientas reales

# Capital Clash — Brief para Claude Design

> **Estado: IMPLEMENTADO** ✅ — El pase visual "Naive Style" diseñado en
> Claude Design (`Capital Clash - Naive Style.dc.html`) ya está aplicado a
> toda la app: paleta crema/tinta con acento rojo `#E63946`, bordes gruesos,
> sombras duras, Satoshi + JetBrains Mono, toggle claro/oscuro, podio con
> corona y confetti, y la tarjeta "¡a 1 voto!" animada. Las capturas de
> `screenshots/` reflejan el estilo implementado. Este brief se conserva como
> referencia del sistema y para futuros pases.

Este documento contiene todo lo necesario para llevar la interfaz del MVP
(funcional y ya construida — ver `screenshots/`) a un nivel visual
sobresaliente. El objetivo del pase de diseño es **refinar, no reconstruir**:
la app ya usa tokens CSS, modo claro/oscuro y componentes consistentes.

## 1. Identidad

- **Nombre:** Capital Clash
- **Tagline actual:** "Tu fondo. Tu equipo. Tu victoria." (abierto a mejora)
- **Personalidad:** competitivo + financiero + entre amigos. Serio con los
  números (es dinero, aunque sea simulado), juguetón en el tono. Referencias:
  la energía de una fantasy league deportiva con la sobriedad de una terminal
  financiera. Nunca "casino", nunca "banco corporativo aburrido".
- **Logo actual:** placeholder (cuadro azul con "CC"). Se necesita un
  wordmark/isotipo real; ideas: espadas cruzadas formando una vela japonesa,
  una "C" que es una gráfica que sube.
- **Idioma de la UI:** español (México). Tono de "tu grupo de amigos", nunca
  de asesor bancario.

## 2. Sistema visual actual (tokens en `app/globals.css`)

Basado en la paleta validada del skill dataviz (accesible y CVD-safe). Los
tokens se consumen vía Tailwind (`bg-surface`, `text-ink`, `text-gain`…):

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--bg` | `#f9f9f7` | `#0d0d0d` | plano de página |
| `--surface` | `#fcfcfb` | `#1a1a19` | tarjetas, gráficas |
| `--ink` / `--ink2` / `--muted` | `#0b0b0b` / `#52514e` / `#898781` | `#ffffff` / `#c3c2b7` / `#898781` | jerarquía de texto |
| `--line` | `#e1e0d9` | `#2c2c2a` | hairlines, bordes, grid |
| `--accent` | `#2a78d6` | `#3987e5` | marca, CTAs, serie "Fondo" |
| `--gain` / `--loss` | `#006300` / `#d03b3b` | `#0ca30c` / `#e66767` | SOLO ganancia/pérdida |

**Reglas no negociables:**
- Verde/rojo reservados exclusivamente para ganancia/pérdida y estados; el
  acento de marca es azul.
- Ganancia/pérdida **nunca** se comunica solo con color: siempre signo
  explícito (+/−) y flecha (▲/▼). Ya implementado en el componente `PnlText`.
- Tipografía: **Geist Sans** para UI, **Geist Mono** (`.figures`, con
  `tabular-nums`) para cifras, tickers y códigos. Mantener esta dualidad.
- Modo oscuro es de primera clase (ver `16-dashboard-dark.png`), no un filtro.
- En gráficas: líneas 2px, grid hairline sólido recesivo, texto en tokens de
  texto (nunca del color de la serie), leyenda para 2+ series, tooltip.

## 3. Inventario de pantallas (capturas actuales en `screenshots/`)

| Pantalla | Captura | Elemento dominante | Estados vacíos a cuidar |
|---|---|---|---|
| Landing `/` | `01-landing.png` | Tagline + 3 pasos | — |
| Login demo `/login` | `02-login.png` | Selector de jugador | — |
| Mis grupos `/grupos` | — | Tarjetas de grupo + crear/unirse | "sin grupos" |
| Dashboard `/g/[id]` | `04-dashboard.png`, `16-dashboard-dark.png` | **Valor del fondo (hero) + Índice Capital Clash** | grupo sin temporada; temporada sin datos de gráfica |
| Portafolio | `05-portafolio.png` | Tabla de posiciones con P/L | sin posiciones |
| Propuestas | `06-propuestas.png`, `17-mobile-propuestas.png` (móvil) | Tarjetas de votación + formulario | sin propuestas |
| Participantes | — | Tarjetas por jugador (parte del fondo, sus propuestas, puntería) | sin propuestas ejecutadas ("—") |
| Historial | — | Tabla cronológica de operaciones | sin operaciones |
| Ranking | `11-ranking.png` | **Podio con corona 👑** + tabla + estadísticas | pocos jugadores (<3 en podio) |
| Temporada | — | Estado de la temporada + crear/cerrar (admin) | sin temporada |

## 4. Componentes clave a diseñar/refinar

1. **Tarjeta de estadística** (`StatCard`): label + valor + delta con
   flecha/signo. La variante hero (Valor del fondo) es el número más
   importante de toda la app.
2. **Índice Capital Clash** (`FundChart`): línea del fondo (azul) vs S&P 500
   (gris). Respetar las specs de dataviz listadas arriba.
3. **Tarjeta de propuesta** (`VoteCard` en `propuestas/page.tsx`): el
   componente con más vida del juego — badge compra/venta, ticker, tesis
   citada, barra de progreso de votos, quién votó qué, botones Votar sí/no,
   cuenta regresiva de expiración, y el estado "¡a 1 voto de aprobarse!"
   (hoy: borde azul + texto).
4. **Tabla de posiciones** con P/L coloreado + signo (portafolio e historial).
5. **Podio del ranking**: hoy son 3 tarjetas con medallas emoji; pide un
   diseño celebratorio real (elevación del 1º, quizá confetti al cerrar
   temporada).
6. **Badges**: modo (Dinero real / Simulado), temporada (activa/cerrada),
   Admin, "Modo demo" (header), estados de propuesta (En votación / Aprobada /
   Ejecutada / Rechazada / Expirada).
7. **Selector de jugador demo** (login): la primera impresión de la demo.

## 5. Momentos de emoción (donde el juego debe sentirse juego)

- **"¡A 1 voto de aprobarse!"** — el momento de máxima tensión; hoy es solo
  texto azul. Merece más energía (pulso, glow sutil).
- **Voto emitido** — feedback inmediato y satisfactorio.
- **Propuesta ejecutada** — transición de "En votación" a "Ejecutada" con
  celebración ligera.
- **Cierre de temporada** — el gran final: podio, confetti, resumen de la
  temporada. Hoy es un simple redirect al ranking.
- **Ranking en vivo** — sensación de tabla de posiciones deportiva.
- Micro-momentos: copiar código de invitación ("¡Copiado!"), efectivo
  insuficiente (error amable), "Te toca votar" en el dashboard.

## 6. Guías técnicas para el pase de diseño

- Todo en **Tailwind 4** (`@theme` en `app/globals.css`); nuevos colores →
  nuevos tokens CSS, nunca hex sueltos en JSX.
- Gráficas con **Recharts**; si se agregan gráficas nuevas, seguir el skill
  `dataviz` (validar paletas con su script).
- **Mobile-first**: los amigos votarán desde el teléfono (ver
  `17-mobile-propuestas.png`). Tablas con scroll horizontal contenido; tabs
  con scroll horizontal ya implementados.
- **Accesibilidad**: mantener signo+flecha junto al color en P/L; focus
  visible en botones/inputs; contraste AA sobre `--surface` en ambos modos.
- Animaciones: CSS/Tailwind (`transition`, `animate-*`); nada pesado — la app
  es server-first y el JS de cliente es mínimo (mantenerlo así).
- No romper los data-attributes/textos que usan los tests e2e de
  `scratchpad` (títulos de sección como "Índice Capital Clash", botones
  "Votar sí ✓" / "Votar no ✗").

## 7. Fuera del alcance del pase de diseño

Nuevas funcionalidades (ligas, insignias, notificaciones, IA), cambios al
modelo de datos o a las reglas del juego, y la app móvil nativa. El pase es
100% capa visual + micro-interacciones sobre las pantallas existentes.

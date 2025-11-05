# Mundum

Juego 3D online para navegador: mundo abierto estilo Minecraft/Roblox en primera persona,
con progresión de criaturas, loot y misiones al estilo Tibia / MapleStory — pero con
personajes redondeados, nada de cubos.

**Jugable con teclado/ratón y también táctil (móvil/tablet), desde la misma web.**

## Cómo probarlo en local

No hay build ni dependencias que instalar. Solo hace falta un servidor estático:

```bash
python3 -m http.server 8123
# y abrir http://localhost:8123
```

## Cómo desplegarlo (GitHub Pages, gratis)

1. En GitHub: **Settings → Pages → Source: Deploy from a branch**.
2. Elegir la rama (`main` cuando se haga merge desde `dev`) y carpeta `/ (root)`.
3. El juego queda en `https://<usuario>.github.io/Mundum/`.

No necesita Actions ni build: es 100% estático.

## Controles

| Acción | Teclado | Táctil |
|---|---|---|
| Moverse | `WASD` / flechas | Joystick (mitad izquierda) |
| Mirar | Ratón (clic para capturar) | Arrastrar (mitad derecha) |
| Saltar | `Espacio` | Botón ⬆ |
| Correr | `Shift` | Joystick a tope |
| Cámara 1ª/3ª persona | `C` | Botón 👁 |

## Estado del proyecto

- [x] **Fase 1 — Mundo y personaje**: terreno procedural infinito con semilla fija
  (el mundo es idéntico para todos), bosques, lagos, montañas con nieve, ciclo
  día/noche ligado a la hora real del dispositivo, personaje redondeado con colores
  de ropa personalizables, primera/tercera persona, saltar, correr, nadar.
- [ ] **Fase 2 — Combate y criaturas**: ~300 criaturas data-driven, aggro, loot con
  rarezas (normal / Elite / Legendary 0.5%), elementos, experiencia y niveles,
  armas visibles (espada, hacha, arco, escudo, varita que cambia de color).
- [ ] **Fase 3 — Ciudades e items**: tiendas, depots por ciudad, equipamiento
  completo (amuleto, casco, armadura, legs, botas, bag/backpack), puertas.
- [ ] **Fase 4 — Online**: cuentas, otros jugadores visibles, chat e intercambios
  (backend: Supabase).
- [ ] **Fase 5 — Quests y eventos**: misiones tipo Tibia/MapleStory, eventos x2
  diarios y de fin de semana.

## Estructura

```
index.html        Página única del juego (UI + HUD + controles táctiles)
style.css         Estilos de la interfaz
src/main.js       Arranque, bucle principal, cámara, pantalla de creación
src/world.js      Terreno procedural por chunks, vegetación, agua
src/noise.js      Ruido con semilla (mundo determinista)
src/character.js  Constructor del personaje redondeado (cápsulas/esferas)
src/player.js     Física: movimiento, salto, nado, colisión con el terreno
src/controls.js   Entrada unificada teclado + ratón + táctil
src/daynight.js   Ciclo día/noche según la hora real del dispositivo
vendor/           Three.js (sin CDN: funciona offline)
```

## Notas técnicas

- La semilla del mundo (`SEED` en `src/main.js`) es fija a propósito: cuando llegue
  el online, todos los jugadores comparten exactamente el mismo mapa sin tener que
  descargarlo.
- De noche (según el reloj del dispositivo) las criaturas pegarán un **+30%** de
  daño — el multiplicador ya está expuesto en `src/daynight.js`.

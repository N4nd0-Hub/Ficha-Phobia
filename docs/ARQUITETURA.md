# Arquitetura

Guia rápido para quem vai ler ou mexer no código.

## Visão geral

O site começou como um único `index.html` (ficha + mapa). Com o tempo, a interface
nova (HUD, temas, páginas repaginadas) foi construída **em camadas por cima** dessa
base, em arquivos separados dentro de `assets/`. A base continua sendo a dona do
estado e do save; as camadas só leem/alteram `state` e chamam funções da base.

```
index.html  (base)                       assets/  (camadas, carregadas no fim do <body>)
┌──────────────────────────────┐         ┌────────────────────────────────────┐
│ <style>  visual base         │         │ core/   hud.js monta a casca HUD   │
│ <body>   marcação das abas   │  ◀────  │         e liga body.hud            │
│ <script> state, save,        │         │ sheet/  repagina cada aba          │
│          cálculos, render*() │         │ map/    câmera, pistas, distritos  │
└──────────────────────────────┘         │ pc/ player-chat/  extras           │
                                         └────────────────────────────────────┘
```

Enquanto `body.hud` não existe, a página mostra só a tela de carregamento
(`#bootSplash`, no começo do `<body>`), para o visual base não aparecer piscando.

## A base (`index.html`)

| Parte | Onde | O quê |
|---|---|---|
| Estilos base | `<style>` no `<head>` | Visual original ("Character Magazine"), mapa, calendário, modais |
| Marcação | `<body>` | Abas da ficha (`#sheet-panel-*`), mapa (`#mapPage`), páginas Guia/Agenda/Notas |
| Estado padrão | `const DEFAULT` | Formato completo do save (`state`) |
| Save | `loadState()` / `saveState()` | IndexedDB `PersonaPhobiaLargeSave/saves/main` + espelho `localStorage.phobiaTokyoV2` |
| Cálculos | `calculateSheet()` | PV/PM (curvas por arquétipo), atributos efetivos, crítico, carga etc. |
| Dados do sistema | `const` em MAIÚSCULAS | Arcanas, Dissonantes, Tiers sociais, Grimório (`PERSONA_SPELL_LIBRARY`), Vantagens/Defeitos |
| Renderização | `render*()`, `hydrateCharacterSheet()` | Desenha cada aba a partir de `state` |
| Navegação | `switchWorkspace(mode)`, `setSheetSection(id)` | Troca entre mapa/ficha e entre abas |

Regras do sistema que mais aparecem no código:
- **PV/PM**: `RESOURCE_CURVES` + `ARCANA_CURVE` (Padrão / Sacrificial / Conjurador).
- **Dados de magia**: `spellDiceCap(tier)` limita os dados-base; dano soma MAG (físicas: FOR).
- **Tipos mágicos**: `chosenMagicTypes()` / `magicTypeAllowed()` (4 escolhidos + Miscelânea, Defesa, Passivas).
- **Vantagens/Defeitos**: `traitBudget()` e `traitRequirementMissing()`; sem teto de Defeitos.

## Camadas (`assets/`)

### `core/` — casca da interface
| Arquivo | Função |
|---|---|
| `hud.js` / `hud.css` | Monta o HUD sobre a base (move controles existentes para painéis), transições de página |
| `hud-pages.*`, `hud-sheet.css` | Visual HUD do Guia, Agenda, topo da ficha |
| `sheet-style.*` | Botão VISUAL: temas (inclusive os especiais de protagonista) e fundos animados |
| `theme-fx.*` | Transições e efeitos próprios de cada tema especial |
| `ui-sfx.*` | Sons de interface sintetizados (WebAudio) e botão de volume |
| `deck-p5.css`, `deck-file.js` | Barra inferior (player, data, área) e menu Arquivo/Notas |
| `fichas.*` | Várias fichas no mesmo navegador (slots no IndexedDB, à prova de perda) |
| `attr-formulas.js` | Troca "MAGd8" etc. por números do personagem nos textos |
| `sheet-editorial.css`, `sheet-fixes.css` | Ajustes de layout da ficha |

### `sheet/` — abas da ficha
| Arquivo | Aba |
|---|---|
| `integrity-bar.*` | Barra de Integridade (Ficha Base) |
| `persona-page.*`, `persona-types.js`, `dissonant-look.*` | Persona: elementos, 4 tipos mágicos, Arcana Dissonante |
| `magic-cd.*` | Magias: deck em forma de CDs |
| `social-fame.*` | Social: disco de fama e Tiers |
| `awaken-deck.*` | Despertares |
| `equip-rig.*` | Equipamentos |
| `traits-cards.*`, `traits-deck.*` | Vantagens & Defeitos |
| `bonds-net.*` | Vínculos (rede de confidentes) |
| `dossie.*` | Dossiê |
| `instrument-skills*` | Habilidades básicas de instrumento (catálogo + UI) |
| `combat-mode.*` | Modo de Combate |
| `dice3d.*` | Rolador de dados 3D (Margem Crítica só em ataques/magias) |

### `map/` — Tokyo e distritos
| Arquivo | Função |
|---|---|
| `map-camera.js` | Câmera (pan/zoom) compartilhada; testável em Node |
| `map-explorer.*` | Apresentação do mapa, busca, painel do distrito |
| `map-roads.*` | Pistas, linhas de metrô, rios, parques e fundo do mapa de Tokyo |
| `map-motion.*` | Animações do mapa (voo da câmera, entrada das pistas) |
| `map-photos.js` | Fotos dos locais com fonte e licença |
| `district-badges.*` | Ilustrações dos distritos recoloridas para o tema |
| `district-local.*` | Mapa interno de cada distrito (SVG gerado) |
| `district-life.*` | Vida no mapa interno: trânsito em canvas, clima por estação, dia/noite |
| `map-3d.*` | Modo 3D de Tokyo (botão 3D). Three.js em `assets/vendor/three/`, carregado só ao ligar |

### `pc/` — o PC do personagem
`net-os.*` (NET//TRACE como "Phobia OS"), `case-board.*` (Quadro de Investigação e atalhos dos sites).

### `player-chat/`
`phobia-deck.*` (player com playlist), `phobia-chat.*` (Phobia Messenger, Supabase).

## Outras páginas

- `gm.html` — Portal do Narrador: jogadores, PINs, NPCs, pontos de Vantagem extras.
- `livro/` — Livro de Regras em estilo revista. Os capítulos de regra são texto em `livro/index.html`; os compêndios (Arcanas, Dissonantes, magias, Vantagens/Defeitos, Integridade, curvas) vêm de `livro/livro-data.js`, **gerado** a partir das tabelas do `index.html` com `node tools/build-livro-data.cjs`. Rode o script sempre que mudar essas tabelas na ficha.
- `rewind/` — Rewind (rede social estilo 2000). Usa as RPCs `rw_*` do Supabase.

## Backend (Supabase)

Tudo passa por funções `security definer` (`phobia_*`, `rw_*`) que validam o token
de sessão do jogador; ações de mestre checam `tanaka_is_admin()`. O front só usa a
chave pública. Uploads de mídia do Rewind passam pela edge function `rewind-media`.

## Como adicionar uma funcionalidade

1. Crie `assets/<pasta>/nome.js` (+ `.css`) com o cabeçalho padrão e uma IIFE.
2. Inclua no `index.html` com `?v=1`, **depois** dos scripts da base.
3. Leia/escreva em `state` e chame `saveState(true)`; não mude o formato do save.
4. Se precisar reagir a uma função da base, embrulhe-a (`var o = window.f; window.f = function(){ var r = o.apply(this, arguments); …; return r; }`).
5. Rode `node --test tests/*.test.cjs`.

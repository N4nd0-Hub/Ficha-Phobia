# Ficha — Persona // Phobia

Ficha de personagem, mapa de Tokyo e ferramentas de mesa para a campanha
**Persona — Phobia** (TTRPG). Site estático, publicado no GitHub Pages:
<https://n4nd0-hub.github.io/Ficha-Phobia/>

> Projeto pessoal, sem fins lucrativos.

## Como rodar

Não há build. Qualquer servidor estático serve:

```bash
python3 -m http.server 8765        # e abra http://localhost:8765/
node --test tests/*.test.cjs       # testes (Node 18+)
```

## Estrutura

```
index.html            Ficha + mapa (página principal; HTML, estilos e lógica base)
gm.html               Portal do Narrador (contas dos jogadores, NPCs, pontos)
rewind/               Rewind: rede social estilo Orkut aberta pelo PC da ficha
livro/                Livro de Regras (revista). livro-data.js é GERADO: node tools/build-livro-data.cjs
tools/                Scripts de apoio (gerar os dados do livro)
assets/
  core/               Casca da interface (HUD, temas, sons, barra inferior, várias fichas)
  sheet/              Abas da ficha (Persona, Magias, Social, Vantagens, Combate, Dados…)
  map/                Mapa de Tokyo e mapas internos dos distritos
  pc/                 Coisas do "PC" do personagem (NET//TRACE, Quadro de Investigação)
  player-chat/        Player de música da barra inferior e Phobia Messenger
  vendor/three/        Three.js (MIT), usado só pelo mapa 3D
  arcana/ builtin/ district-badges/ map-icons/ map-photos/   Imagens (webp)
tests/                Testes com node:test
docs/ARQUITETURA.md   Como as peças se encaixam (leia antes de mexer)
```

O mapa completo de cada arquivo está em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Convenções

- **Sem framework e sem build.** JavaScript puro (ES2018+), um arquivo por funcionalidade,
  cada um dentro de uma IIFE (`(function(){ 'use strict'; … })()`).
- **Camadas.** O `index.html` é a base e é dono do estado (`state`) e do save.
  Os arquivos em `assets/` são camadas por cima: remontam a interface, embrulham
  funções globais (`window.nome = wrapper`) e nunca mudam o formato do save.
- **Cache dos navegadores.** Todo `<script>`/`<link>` usa `?v=N`. Ao alterar um arquivo,
  aumente o `N` correspondente no `index.html`.
- **Textos da interface em português**, comentários em português.
- **Formatação:** ver `.editorconfig` (2 espaços, UTF-8, LF).

## Dados e saves

- Save principal no **IndexedDB** (`PersonaPhobiaLargeSave` → `saves` → `main`), com
  espelho em `localStorage` (`phobiaTokyoV2`). Várias fichas ficam em `slot:<id>`.
- Músicas do player ficam no IndexedDB e não vão para o backup JSON.
- Recursos online (Messenger, Rewind, Portal do Narrador) usam **Supabase** via RPCs
  `security definer` com token de sessão; a chave usada no front é a chave pública.

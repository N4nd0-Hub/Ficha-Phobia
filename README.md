# Ficha — Phobia

Ficha de personagem e navegação de Tokyo para a campanha Persona — Phobia.

A página Vantagens e Defeitos reúne 55 Vantagens em Combate / Instrumentos, Atributos, Sociais e Persona & Combos Musicais, além de 60 Defeitos e 20 Arcanas Dissonantes. O personagem começa com 1 ponto e pode receber até 5 pontos por defeitos, incluindo uma Dissonante de 5 pontos. As compras verificam pontos, atributos, Tiers sociais e incompatibilidades; definições e condições de história ficam registradas em cada escolha. O catálogo possui busca, filtros e uma área de escolhas adquiridas. Os bônus permanentes aplicáveis aos cálculos da ficha são atualizados após a compra e com a progressão dos níveis.

As escolhas e suas anotações fazem parte do save completo e dos backups JSON. Saves anteriores preservam os dados do personagem, arquivam as antigas seleções de Feitos e registram as Vantagens retiradas do catálogo em traits.retiredAdvantages. Os custos das Vantagens arquivadas voltam ao saldo. Os seletores de Dissonante de Persona e Despertares compartilham o mesmo orçamento; a segunda Dissonante de A Fome não concede outro crédito.

As imagens de interface e cartas ficam em arquivos separados em `assets/`, com carregamento sob demanda nas áreas ocultas. Os ícones foram redimensionados para a resolução de uso; as cartas de Arcana mantêm os arquivos originais. As fontes externas são opcionais e só são solicitadas após a abertura do documento.

O save completo usa IndexedDB. A abertura e as transações têm limite de tempo. Se a leitura inicial falhar, a ficha interrompe o estado de carregamento e impede que uma cópia incompleta sobrescreva os saves existentes. Recarregar permite tentar a leitura novamente. O nome do banco e o formato dos backups foram mantidos.

A barra inferior reúne o player, a data da história e a área atual. O player aceita várias músicas (MP3, M4A, OGG, WAV), com playlist, ordem aleatória, repetição, capa por faixa e teclas de mídia. Os arquivos de áudio ficam no navegador (IndexedDB) e não entram no backup JSON; em outro navegador a faixa aparece como ausente e pode ser reanexada.

A interface segue o estilo HUD (assets/hud.css e assets/hud.js): o mapa ocupa a tela, e período, camada, busca, ferramentas do mestre, fundo e legenda ficam em painéis flutuantes. O hud.js move os controles existentes para esses painéis sem mudar a lógica deles, e anima as trocas de página e de aba da ficha.

Execute as verificações com `node --test tests/*.test.cjs`.

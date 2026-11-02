# Ficha — Phobia

Ficha de personagem e navegação de Tokyo para a campanha Persona — Phobia.

A página Vantagens e Defeitos reúne 60 vantagens sociais, 60 defeitos sociais e 20 Arcanas Dissonantes. O personagem começa com 1 ponto e pode receber até 5 pontos por defeitos, incluindo uma Dissonante de 5 pontos. As compras verificam pontos, atributos, Tiers sociais e incompatibilidades; definições e condições de história ficam registradas em cada escolha. O catálogo possui busca, filtros e uma área de escolhas adquiridas.

As escolhas e suas anotações fazem parte do save completo e dos backups JSON. Saves anteriores preservam os dados do personagem e arquivam as antigas seleções de Feitos, sem convertê-las em compras. Os seletores de Dissonante de Persona e Despertares compartilham o mesmo orçamento; a segunda Dissonante de A Fome não concede outro crédito.

As imagens de interface e cartas ficam em arquivos separados em `assets/`, com carregamento sob demanda nas áreas ocultas. Os ícones foram redimensionados para a resolução de uso; as cartas de Arcana mantêm os arquivos originais. As fontes externas são opcionais e só são solicitadas após a abertura do documento.

O save completo usa IndexedDB. A abertura e as transações têm limite de tempo. Se a leitura inicial falhar, a ficha interrompe o estado de carregamento e impede que uma cópia incompleta sobrescreva os saves existentes. Recarregar permite tentar a leitura novamente. O nome do banco e o formato dos backups foram mantidos.

Execute as verificações com `node --test tests/*.test.cjs`.

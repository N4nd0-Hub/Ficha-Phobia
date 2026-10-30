# Ficha — Phobia

Ficha de personagem e navegação de Tokyo para a campanha Persona — Phobia.

As imagens de interface e cartas ficam em arquivos separados em `assets/`, com carregamento sob demanda nas áreas ocultas. Os ícones foram redimensionados para a resolução de uso; as cartas de Arcana mantêm os arquivos originais. As fontes externas são opcionais e só são solicitadas após a abertura do documento.

O save completo usa IndexedDB. A abertura e as transações têm limite de tempo. Se a leitura inicial falhar, a ficha interrompe o estado de carregamento e impede que uma cópia incompleta sobrescreva os saves existentes. Recarregar permite tentar a leitura novamente. O nome do banco e o formato dos backups foram mantidos.

Execute as verificações com `node --test tests/*.test.cjs`.

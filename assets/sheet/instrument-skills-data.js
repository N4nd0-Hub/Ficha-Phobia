/* ==========================================================
   PERSONA // PHOBIA — Habilidades Básicas de Instrumento (catálogo)
   Formato de cada linha do texto:
     texto comum            → parágrafo
     >tipo texto            → efeito (tipo: dmg acc pm hp mov def deb mus star time block)
     OU / E                 → separador
     ~texto                 → observação
   Dentro do texto: **negrito**, [valor ou termo], (frequência)
   ========================================================== */
window.INSTRUMENT_SKILL_RULES = {
  intro: 'Cada **[Instrumento Específico]** possui **2 espaços** para Habilidades Básicas. Elas definem a função que você escolheu para aquele Instrumento e são universais: qualquer Instrumento pode usá-las, independentemente da **[Família Musical]**.',
  superior: ['Melhores **Habilidades Básicas**', 'Melhores valores de combate', 'Bônus próprios', 'Uma **3ª Habilidade**']
};
window.INSTRUMENT_SKILL_CATEGORIES = [
  { id: 'ofensiva', name: 'Ofensiva', color: '#ff4d6a', skills: [
    { name: 'Acento Forte', text: 'Uma vez por (Rodada), quando uma [Ofensiva Instrumental] também realizar uma [Etapa Perfeita], recebe [+1 Dado de Dano].' },
    { name: 'Sobrecarga', cost: '8 PM', text: 'Ao causar Dano através de uma [Ofensiva Instrumental], poderá aumentar sua potência em [+2 Dados de Dano].\nAté o início de sua próxima Rodada:\n>mov Recebe [-2 de Esquiva].' },
    { name: 'Forte', text: 'Todas as suas [Ofensivas Instrumentais] recebem:\n>dmg [+1 Dado de Dano].\nPorém:\n>acc [-2 de Acerto Instrumental].' },
    { name: 'Explosão Sonora', text: 'Uma vez por (Combate), antes de realizar uma Ofensiva Instrumental, poderá amplificá-la para receber:\n>dmg [+3 Dados de Dano].\nCaso a Ofensiva seja mal sucedida:\n>pm Perde adicionalmente [5 PM].' },
    { name: 'Crescendo Ofensivo', text: 'Sempre que atingir o mesmo alvo com uma Ofensiva Instrumental em Rodadas consecutivas, recebe [1 Crescendo] contra aquele alvo.\nMáximo:\n>mus [2 Crescendos].\nCada Crescendo concede:\n>dmg [+1 Dado de Dano].\nPerde todos os Crescendos caso:\n~Ataque outro alvo. Erre uma Ofensiva Instrumental. Passe uma Rodada sem causar Dano Instrumental naquele alvo.' },
    { name: 'Ataque de Oportunidade', text: 'Quando um inimigo dentro do seu Alcance falhar em uma [Ação Ofensiva], sua próxima Ofensiva Instrumental contra ele recebe:\n>acc [+5 de Acerto].\n>dmg [+1 Dado de Dano].\n~O benefício desaparece no final de sua próxima Rodada.' }
  ] },
  { id: 'compasso', name: 'Compasso Cognitivo', color: '#6ce6ff', skills: [
    { name: 'Pulso Constante', text: 'Após realizar uma [Execução Instrumental] bem-sucedida, o próximo aliado que realizar uma Execução antes do início de sua próxima Rodada recebe:\n>acc [+2 de Acerto Instrumental].\nCaso sua Execução tenha sido uma [Etapa Perfeita]:\n>acc O bônus aumenta para [+5].' },
    { name: 'Entrada Segura', text: 'Quando tentar realizar uma Etapa atualmente revelada do [Compasso Cognitivo], recebe:\n>acc [+2 de Acerto Instrumental].\nCaso seja a primeira tentativa do grupo naquela Etapa:\n>acc [+5 de Acerto] em vez disso.' },
    { name: 'Segunda Tentativa', cost: '6 PM', text: 'Uma vez por (Rodada), ao falhar em uma Execução Instrumental que tentava realizar uma Etapa do Compasso, poderá realizar novamente o Teste. Pode pagar [+2 PM] para que o efeito seja utilizado em um (Aliado) que possa ouvir você.\n~O segundo resultado deve obrigatoriamente ser utilizado.' },
    { name: 'Pegue o Ritmo', text: 'Quando falhar em uma Execução Instrumental tentando realizar uma Etapa do Compasso, o próximo aliado que tentar aquela mesma Etapa recebe:\n>acc [Vantagem].\n~Não poderá beneficiar sua própria tentativa.' },
    { name: 'Ressonância Acumulada', text: 'Sempre que realizar uma [Etapa Perfeita], recebe:\n>mus [1 Ressonância].\nMáximo:\n>mus [2 Ressonâncias].\nAntes de uma Execução Instrumental, poderá consumir [1 Ressonância] para escolher:\n>acc [+5 de Acerto Instrumental].\n>dmg [+1 Dado de Dano].\n>pm [-5 PM] no custo de Magias ou Habilidades de Instrumentos.\n~Todas as Ressonâncias desaparecem no final do Combate.' },
    { name: 'No Tempo Certo', text: 'Caso sua Execução Instrumental seja realizada imediatamente após uma [Etapa Perfeita] de outro personagem:\n>acc Recebe [+3 de Acerto Instrumental].\nCaso sua Execução também realize uma Etapa Perfeita:\n>pm Recupera [5 PM].' },
    { name: 'Passagem Fluida', text: 'Quando realizar uma [Etapa Perfeita], escolha um aliado que ainda não tenha realizado uma Execução Instrumental naquela Rodada.\nA primeira Execução dele recebe:\n>acc [+2 de Acerto Instrumental].\nCaso ela também seja uma Etapa Perfeita:\n>pm Você recupera [5 PM].' }
  ] },
  { id: 'combo', name: 'Sound Combo', color: '#ffd84d', skills: [
    { name: 'One More Time!', text: 'Uma vez por (Combate), quando participar da ativação de um [Sound Combo], mantenha a última Execução utilizada nele como:\n>mus **Primeiro Registro do próximo Sound Combo**.\nCaso sua própria Execução tenha sido responsável por completar o Combo:\n>mus Escolha também [1 outra Execução] daquele Combo para permanecer registrada.' },
    { name: 'Jam Session', text: 'Quando as últimas [3 Execuções] registradas pertencerem a **3 Famílias Musicais diferentes**, o próximo personagem a realizar uma Execução Instrumental recebe:\n>acc [+5 de Acerto Instrumental].\nCaso essa Execução complete um Sound Combo:\n>pm Todos os participantes recuperam [MAG + 2 de PM].' },
    { name: 'Fake Out!', text: 'Uma vez por (Combate), quando quatro Execuções estiverem registradas e **não formarem um Sound Combo**, escolha uma delas.\nEla poderá ser considerada como:\n>mus **Qualquer Família Musical**\napenas para verificar novamente aquela sequência.\nCaso isso forme um Sound Combo:\n>star Ative-o imediatamente.\n~A Família original da Execução não é alterada para nenhum outro efeito.' },
    { name: 'Back to Back', text: 'Quando sua Execução utilizar a mesma [Família Musical] da Execução imediatamente anterior:\n>acc Recebe [+2 de Acerto Instrumental].\nUma vez por (Combate), caso seja bem-sucedida:\n>mus Registre sua Execução [2 vezes consecutivas] no Sound Combo.\n~O segundo registro ativa Habilidades e não realiza Etapa Perfeita.' },
    { name: 'Hit It!', text: 'Uma vez por (Rodada), antes de um aliado realizar sua Execução Instrumental, escolha uma [Família Musical].\nCaso ele utilize exatamente a Família escolhida:\n>acc Recebe [+2 de Acerto Instrumental].\nCaso também complete um Sound Combo ou faça uma Etapa Perfeita:\n>pm Você e o aliado recuperam [10 PM].' },
    { name: 'Drop!', text: 'Quando sua Execução for responsável por completar um [Sound Combo], escolha um inimigo afetado por ela.\nSua próxima Ofensiva Instrumental contra esse alvo recebe:\n>dmg [+2 Dados de Dano].\nCaso seja realizada antes do final de sua próxima Rodada:\n>acc Recebe também [+1 de Margem Crítica].' },
    { name: 'Crowd Goes Wild!', text: 'A banda começa a ganhar força conforme diferentes Sound Combos são realizados durante o Combate.\nAo ativar [2 Sound Combos diferentes]:\n>acc Todos que participaram de pelo menos um recebem [+2 de Acerto Instrumental] até o final da próxima Rodada.\nAo ativar [3 Sound Combos diferentes]:\n>pm Todos os participantes recuperam [10 + MAG% do PM Máximo].\nAo ativar [4 Sound Combos diferentes]:\n>star A próxima Execução Instrumental do grupo recebe [Vantagem].\n~Cada estágio ativa apenas uma vez por Combate.' },
    { name: 'Mashup', text: 'Uma vez por (Combate), depois de participar de um Sound Combo, escolha uma das [Famílias Musicais] utilizadas nele.\nAté o final de sua próxima Rodada, suas Execuções serão consideradas simultaneamente como:\n>mus **Sua Família Musical original**\nE\n>mus **A Família escolhida**\npara efeitos de **Sound Combo**.\n~Não altera o Compasso Cognitivo.' }
  ] },
  { id: 'suporte', name: 'Suporte & Recuperação', color: '#ff7eb6', skills: [
    { name: 'Harmonia Restauradora', text: 'Uma vez por (Rodada), depois de uma Execução Instrumental bem-sucedida, escolha você ou um aliado que possa ouvi-lo.\nRecupere:\n>hp [5 PV].\nOU\n>pm [3 PM].\nCaso sua Execução tenha sido uma [Etapa Perfeita]:\n>star Dobre o valor recuperado.' },
    { name: 'Pulso Revigorante', text: 'Sempre que participar da ativação de um [Sound Combo], escolha um dos participantes.\nEle recupera:\n>hp [10% do PV Máximo].\nOU\n>pm [10% do PM Máximo].' },
    { name: 'Inspiração', text: 'Uma vez por (Rodada), após uma Execução Instrumental bem-sucedida, escolha um aliado.\nEle recebe:\n>acc [+2] em seu próximo Teste.\nCaso sua Execução tenha sido uma Etapa Perfeita:\n>acc O bônus aumenta para [+4].' },
    { name: 'Harmonia de Palco', text: 'Uma vez por (Combate), quando participar de um [Sound Combo], todos os participantes recebem até o final da Cena:\n>mov [+2 de Esquiva].\n>acc [+2 de Acerto Instrumental].' },
    { name: 'Sustentação', text: 'Uma vez por (Rodada), depois de uma Execução Instrumental bem-sucedida, escolha um [Buff, Debuff ou Melhoria] aplicado por você que possua duração em Rodadas.\nA duração aumenta em:\n>time [+1 Rodada].\n~O mesmo efeito só poderá receber Sustentação uma vez por aplicação.' },
    { name: 'Linha de Apoio', text: 'Uma vez por (Rodada), quando um aliado realizar uma [Etapa Perfeita] imediatamente após sua Execução, escolha:\n>pm O aliado recupera [5 PM].\nOU\n>acc A próxima Execução Instrumental do grupo recebe [+2 de Acerto].' },
    { name: 'Boa Vibração', text: 'Quando remover ou auxiliar um aliado a se recuperar de um [Status Negativo]:\n>acc Ele recebe [+3] em sua próxima Execução Instrumental.\nCaso o efeito removido seja [Mental]:\n>acc O bônus aumenta para [+5].' }
  ] },
  { id: 'defesa', name: 'Defesa & Proteção', color: '#96ff45', skills: [
    { name: 'Barreira Harmônica', text: 'Uma vez por (Rodada), quando realizar uma [Etapa Perfeita], escolha você ou um aliado.\nO próximo Dano recebido antes do início de sua próxima Rodada é reduzido em:\n>def [2 × VIT].' },
    { name: 'Ritmo Defensivo', text: 'Após realizar uma Execução Instrumental bem-sucedida:\n>mov Recebe [+2 de Esquiva] até o início de sua próxima Rodada.\nCaso seja uma Etapa Perfeita:\n>mov O bônus aumenta para [+4].' },
    { name: 'Cobertura Sonora', text: 'Uma vez por (Combate), quando um aliado que participou do último [Sound Combo] receber Dano, utilize uma [Ação de Interromper] para:\n>def Reduzir o Dano recebido em [50%].' },
    { name: 'Contratempo', text: 'Quando for bem-sucedido em uma [Esquiva]:\n>acc Sua próxima Execução Instrumental recebe [+5 de Acerto].\nCaso seja uma Etapa Perfeita:\n>pm Recupera [10 PM].' },
    { name: 'Postura de Palco', text: 'Enquanto possuir [50% ou mais de seu PV Máximo]:\n>def Recebe [+5 de RD].\nEnquanto possuir [50% ou menos de seu PV Máximo]:\n>acc Recebe [+2 de Acerto Instrumental].' }
  ] },
  { id: 'controle', name: 'Controle', color: '#c8aaff', skills: [
    { name: 'Queda de Volume', text: 'Uma vez por (Rodada), quando causar Dano através de uma Técnica Instrumental, o alvo recebe:\n>deb [-2 de Acerto].\nCaso a Ofensiva também realize uma Etapa Perfeita:\n>deb A Penalidade aumenta para [-5].\n~Dura até o início de sua próxima Rodada.' },
    { name: 'Pressão Sonora', text: 'Quando uma Ofensiva Instrumental atingir um alvo que já esteja sob qualquer [Status Negativo]:\n>dmg Recebe [+1 Dado de Dano].\nUma vez por Rodada, caso também realize uma Etapa Perfeita:\n>deb O alvo recebe [-2 em sua próxima Reação].' },
    { name: 'Descompasso', text: 'Uma vez por (Rodada), depois de realizar uma Etapa Perfeita contra um inimigo:\n>deb Ele recebe [-2 de Esquiva] até o final de sua próxima Rodada.' },
    { name: 'Ruptura de Ritmo', text: 'Uma vez por (Combate), quando completar um [Sound Combo]:\n>block O alvo não poderá realizar [Reações] contra a próxima Execução Instrumental direcionada a ele.\n~O efeito desaparece no final da próxima Rodada caso não seja utilizado.' }
  ] },
  { id: 'economia', name: 'Economia & Recursos', color: '#a77bff', skills: [
    { name: 'Economia de Movimento', text: 'Uma vez por (Rodada), quando realizar uma [Etapa Perfeita]:\n>pm Reduza em [5 PM] o custo de sua próxima Técnica Instrumental/Magia, sua ou de um Aliado, naquela Rodada.\n~Custo mínimo de 1 PM.' },
    { name: 'Recuperação de Fôlego', text: 'Quando participar da ativação de um [Sound Combo]:\n>pm Recupera [10 + MAG de PM].\nCaso sua Execução tenha sido responsável por completar o Combo:\n>pm Recupera [10 + (MAG×2) de PM] em vez disso.' },
    { name: 'Reserva de Palco', text: 'No início de cada Combate, recebe:\n>mus [1 Reserva].\nPode consumir a Reserva para:\n>pm Reduzir o custo de uma Técnica Instrumental/Magia/Habilidade Especial em [10 PM ou 10 de PV].\n~Máximo de 1 Reserva.' },
    { name: 'Fluxo Contínuo', text: 'Sempre que realizar [2 Execuções Instrumentais bem-sucedidas consecutivas] sem falhar entre elas:\n>pm Recupera [5 PM].\n~Máximo de uma ativação por Rodada.' }
  ] },
  { id: 'mobilidade', name: 'Mobilidade', color: '#5fe0c4', skills: [
    { name: 'Movimento de Palco', text: 'Depois de uma Execução Instrumental bem-sucedida:\n>mov Poderá se mover [6 Metros] como Ação Livre.\nCaso tenha realizado uma Etapa Perfeita:\n>mov Poderá se mover até [Metade de seu Movimento] como movimento bônus.' },
    { name: 'Entrada Triunfal', text: 'Sua primeira Execução Instrumental de cada (Combate) recebe:\n>acc [Vantagem].\nE sempre que realizar uma Etapa Perfeita:\n>pm Recupera [5 PM ou 5 de PV].' },
    { name: 'Troca de Posição', text: 'Uma vez por (Rodada), depois de realizar uma Etapa Perfeita, escolha um aliado próximo.\nVocê e o aliado poderão:\n>mov Se mover até [6 Metros].\n~Não consome as Ações normais de Movimento dos personagens.' }
  ] },
  { id: 'manipulacao', name: 'Manipulação Musical', color: '#ff9a52', skills: [
    { name: 'Improvisação', cost: '8 PM', text: 'Antes de realizar uma Execução Instrumental, poderá escolher uma [Família Musical diferente].\nCaso a Execução seja bem-sucedida, ela será considerada como a Família escolhida para:\n>mus **Sound Combo**.\n>mus **Compasso Cognitivo** que exija apenas uma Família Musical.' },
    { name: 'Adaptação', text: 'No início de cada Combate, escolha uma [Família Musical] diferente da sua. Sempre que ocorrer a (Ruptura Cognitiva) ou um (Sound Combo!), pode pagar [10 PM] para trocar a [Família Musical].' },
    { name: 'Eco', text: 'Uma vez por (Combate), depois de uma Execução Instrumental bem-sucedida realizada por um aliado, registre sua [Família Musical].\nAté o final de sua próxima Rodada:\n>mus Sua próxima Execução poderá utilizar aquela Família para efeitos de [Sound Combo].' },
    { name: 'Sample & Playback', text: 'Uma vez por (Rodada), depois de uma Execução Instrumental bem-sucedida realizada por outro personagem, armazene sua [Família Musical] como:\n>mus [Sample], com o máximo de [1 Sample].\n**Ativação:** caso possua um [Sample], poderá consumi-lo como [Ação Rápida] para:\n>mus Registrar aquela Família Musical como uma nova Execução no atual [Sound Combo].' }
  ] },
  { id: 'performance', name: 'Performance & Grupo', color: '#ef2b97', skills: [
    { name: 'Momento de Destaque', text: 'Uma vez por (Combate), depois de realizar uma Etapa Perfeita, sua próxima Execução antes do final da próxima Rodada recebe:\n>acc [+2 de Acerto Instrumental].\nCaso seja uma Ofensiva:\n>dmg [+3 de Margem Crítica].' },
    { name: 'Consonância', text: 'Caso outro personagem utilize uma [Família Musical diferente] imediatamente antes de sua Execução:\n>acc Recebe [+2 de Acerto Instrumental].\nCaso ambas sejam Etapas Perfeitas:\n>acc O bônus aumenta para [+5].' },
    { name: 'Sincronia', text: 'Uma vez por (Rodada), quando você e outro personagem realizarem [Etapas consecutivas], escolha um dos dois:\n>pm Recupera [5 PM].\nOU\n>acc Recebe [+3 de Acerto] na próxima Execução Instrumental.' },
    { name: 'Todos Juntos', text: 'Uma vez por (Combate), quando um [Sound Combo] do qual você participou for ativado:\n>pm Todos os participantes recuperam [MAG × 3 de PM].' }
  ] },
  { id: 'impacto', name: 'Alto Impacto', color: '#fff27a', skills: [
    { name: 'Perfect Timing', text: 'Uma vez por (Combate), após realizar a Rolagem de uma Execução Instrumental, poderá transformar o resultado em:\n>star [Sucesso Automático].\n~Ainda é necessário cumprir corretamente a Família ou Instrumento exigido para realizar uma Etapa Perfeita.' },
    { name: 'Refrão Final', text: 'Uma vez por (Combate), quando chegar a [25% ou menos de seu PV Máximo], sua próxima Execução Instrumental recebe:\n>acc [Vantagem].\n>dmg [+2 Dados de Dano].\n>pm [-10 PM ou PV de Custo].' },
    { name: 'Showstopper', text: 'Uma vez por (Combate), quando uma mesma Execução completar uma [Etapa Perfeita], escolha:\n>dmg [+3 Dados de Dano] naquela Execução.\n>hp Recuperar [10% do PV Máximo].\n>pm Recuperar [10% do PM Máximo].\n>acc Conceder [Vantagem] à próxima Execução Instrumental de um aliado.' },
    { name: 'Encore! Encore!', text: 'Uma vez por (Combate), imediatamente depois de um Sound Combo ser ativado:\n>mus Mantenha a **última Execução** do Combo como primeiro registro do próximo Sound Combo.\nCaso sua própria Execução tenha encerrado o Combo:\n>mus Mantenha também a **penúltima Execução**.' }
  ] }
];

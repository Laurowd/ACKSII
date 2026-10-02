// Summaries of Judge's Journal pp. 300–305. Conditional abilities remain explicit.
export function racialClassPowers(race: string) {
  const entries: Record<string,[string,string][]> = {
    dwarf: [
      ['Sensitivity to Rock and Stone','Surpresa +1 no subterrâneo. Adventuring: Searching e Listening 14+. Habilidades separadas: Searching +4, Listening +2.'],
      ['Dwarf Tongues','Idiomas adicionais: Dwarf, Gnome, Goblin e Kobold.'],
      ['Hardy','Bônus raciais já incluídos nos salvamentos: Blast +3; demais +4.'],
      ['Dwarven Training','Não usa espadas de duas mãos nem longbows. Seleções Narrow/Broad precisam incluir pelo menos quatro machados, flails, martelos ou maças. Cada valor racial concede uma proficiência geral e +1 em testes de proficiências/habilidades, exceto Adventuring: Searching/Listening e afastar mortos-vivos.'],
    ],
    elf: [
      ['Attunement to Nature','Surpresa +1 na natureza. Adventuring: Searching e Listening 14+. Habilidades separadas: Searching +2, Listening +4.'],
      ['Connection to Nature','Imune a doenças de mortos-vivos. Salvamentos contra Paralysis e Spells +1; PV inicial +1, incluídos nas tabelas.'],
      ['Elf Tongues','Idiomas adicionais: Elf, Gnoll, Hobgoblin e Orc.'],
      ['Animal Friendship','Animais comuns num raio de cinco milhas da fortaleza ficam amistosos.'],
      ['Elven Training','Narrow/Broad deve incluir pelo menos dois arcos, bestas, espadas ou adagas. Pode conjurar com as armaduras permitidas pela classe.'],
    ],
    halfling: [
      ['Child-like','Seguidores halflings: lealdade e moral +2. Outros seguidores: −2. Reações não mudam.'],
      ['Demi-human Ancestry','Paralysis e Spells +1, incluídos nos salvamentos.'],
      ['Difficult to Corrupt','Recebe metade da corrupção normal, se a campanha usar essa regra.'],
      ['Easily Encumbered','Carga normal 3 st; 60 pés com 3⅙–4½ st, 45 com 4⅔–6 st, 30 acima de 6 st; máximo 12 st, ajustado por STR.'],
      ['Halfling Tongues','Comum, língua natal e três idiomas escolhidos conforme a região.'],
      ['Heroic Breakfast','Uma refeição com bebida permite recuperar PV equivalentes a um dia de descanso, uma vez ao dia.'],
      ['Underfoot','Criaturas maiores que humanos sofrem −2 nos ataques contra o halfling.'],
      ['Short-Statured','Movimento sem carga: 90 pés. Não usa armas grandes; armas médias exigem duas mãos.'],
      ['Weak','Dungeonbashing −4; dado de vida um tamanho menor, já incluído na progressão.'],
    ],
    nobiran: [
      ['Blood of Kings','Pode contratar um seguidor adicional; moral base dos seguidores +1.'],
      ['Favor of the Empyrean Powers','Salvamentos +2, incluídos nas tabelas.'],
      ['Heroic Spirit','Limite de nível +1, incluído na progressão. Todos os atributos precisam ser pelo menos 11.'],
      ['Longeval','Vida três vezes mais longa; imune a doenças de mortos-vivos; PV inicial +1, incluído na tabela.'],
    ],
    zaharan: [
      ['Inexorable','Imunidade ao medo.'],
      ['Ancient Pacts','Reações +1 ao encontrar monstros caóticos inteligentes. Esses monstros sofrem −2 nos salvamentos contra magias charm conjuradas pelo zaharano.'],
      ['Dark Soul','Penalidade igual ao nível no resultado de Tampering with Mortality.'],
      ['After the Flesh','A alma pode continuar como morto-vivo; a conversão e avanço exigem resolução pelo mestre.'],
      ['Zaharan Tongues','Idiomas adicionais: Ancient Zaharan, Goblin, Orc e Kemeshi.'],
    ],
  }
  return (entries[race] || []).map(([name,description]) => ({name,description,minimumLevel:1,kind:'power'}))
}

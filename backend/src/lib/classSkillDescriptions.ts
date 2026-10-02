export function skillDescription(name:string) {
  const descriptions:Record<string,string>={
    Backstabbing:'Ataques traiçoeiros recebem +4 para atingir e multiplicam o dano: ×2 inicialmente, ×3 no nível 5, ×4 no 9 e ×5 no 13. Exige surpresa ou vantagem prevista pela regra. Não funciona com armadura média/pesada ou escudo.',
    Climbing:'Escala superfícies íngremes ou lisas; teste por trecho de 100 pés conforme a tabela da classe. Falhas podem causar queda.',
    Deciphering:'Decifra códigos, mapas e idiomas antigos, exceto escrita mágica. Uma página exige um turno e teste 4+; após falhar, só tenta novamente num nível superior.',
    Hiding:'Esconde-se em cobertura ou pouca luz com um teste secreto do mestre. Movimento ou ataque encerra o esconderijo. Não funciona com armadura média/pesada ou escudo.',
    Listening:'Escuta por uma rodada, em silêncio, próximo à origem. O mestre faz o teste em segredo; falha não revela se há algum som.',
    Lockpicking:'Requer ferramentas. Abrir apressadamente: uma rodada; metódico: um turno com +4. Falhas baixas podem quebrar a gazua e emperrar a fechadura.',
    Pickpocketing:'A até cinco pés, retira um objeto permitido sem ser percebido. Alvo desatento concede +4; falhas baixas revelam a tentativa. Não funciona com armadura média/pesada ou escudo.',
    Searching:'Busca armadilhas, portas secretas e objetos ocultos. Busca apressada: uma rodada; metódica: um turno com +4. O mestre faz o teste em segredo.',
    Scrollreading:'Lê e conjura pergaminhos arcanos ou divinos em uma rodada com teste 4+. Pode ler idiomas previamente decifrados. Falhas podem produzir efeitos perigosos definidos pelo mestre.',
    'Shadowy Senses':'Percebe como sob luz fraca num raio de 30 pés em movimento de exploração ou combate. Não distingue escrita, cores ou rostos; não funciona correndo, surdo, sob luz forte, escuridão mágica ou silêncio mágico.',
    Sneaking:'Move-se furtivamente com teste secreto. Até metade do movimento de combate sem penalidade; acima disso −5; correndo −10. Não funciona com armadura média/pesada ou escudo.',
    Trapbreaking:'Requer ferramentas. Desarmar apressadamente: uma rodada; metodicamente: um turno com +4. Falhas baixas podem disparar a armadilha.',
    'Jack of All Trades':'Escolhe uma proficiência de outra classe ou poder permitido pelo mestre; não concede conjuração. Registre a escolha na descrição da classe.',
    'Natural Stealth':'Oponentes sofrem −2 nos testes de surpresa quando o personagem se aproxima fora da linha de visão ou aguarda em cobertura ou escuridão.',
    Evasion:'Ao guiar o grupo em território familiar, concede +5 para evitar encontros na natureza. O grupo pode evadir mesmo quando surpreendido, desde que o personagem não esteja surpreendido.',
    'Arcane Dabbling':'Pode tentar usar implementos e itens exclusivos de conjuradores arcanos sem conhecer a palavra de comando. Exige teste 4+; falha causa efeito adverso definido pelo mestre.',
    'Beast Friendship':'Identifica plantas e animais com teste 11+, entende mensagens simples de animais e sabe lidar com animais treinados. Reações com animais comuns +2; pode contratar, treinar e conduzir seguidores animais.',
    'Magical Music':'Escolhe dois efeitos entre Slumber, Beguile Humanoid, Frighten Humanoid e Infuriate Humanoid. Exige Performance e teste 11+, reduzido em 1 por nível; graduações adicionais de Performance concedem até +2. Alvos precisam ver, ouvir, compreender o personagem e estar fora de combate. O efeito dura durante a apresentação; após um turno completo, também persiste pela duração da magia. Falha impede repetir no mesmo público naquele turno.',
    'Passing Without Trace':'Não deixa rastros e não pode ser rastreado. Pode ocultar os rastros de um companheiro adicional por nível. Os beneficiários não contam para o tamanho do grupo na evasão.',
    'Precise Shooting':'Pode atirar contra inimigo fora de combate corpo a corpo, além de cobertura ou aliados engajados, sem penalidade. Contra inimigo engajado sofre −4; escolhas adicionais da proficiência reduzem essa penalidade em 2 cada.',
    Running:'Velocidade base +30 pés enquanto usa armadura média ou mais leve e carrega até 7 st.',
    Skirmishing:'Pode decidir retirada ou recuo do combate depois da iniciativa. Não sofre penalidade de CA ao correr ou investir quando usa armadura média ou mais leve e carrega até 7 st.',
    Swashbuckling:'Com armadura leve ou sem armadura e carga até 5 st: CA +1, +2 no nível 7 e +3 no 13. Soma com Graceful Fighting; quando combinado com esse poder e usando armadura, o bônus de Swashbuckling fica limitado a +1.',
  }
  return descriptions[name]||'Habilidade definida pelo mestre.'
}

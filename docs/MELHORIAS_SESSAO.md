# Sessão, histórico e aprendizado — 05/10/2026

## Durante a sessão

A aba **Sessão** reúne PV, ações de dano/cura, CA, iniciativa, salvamentos, armas e conjuração. Cura respeita os PV máximos; dano admite valores negativos. As ações usam o mesmo salvamento e tratamento de falhas da ficha. Magias favoritas são guardadas por conta e ficha neste navegador. Há busca por magia e filtro de favoritas, além de busca por nome/anotação no inventário; filtros não alteram peso nem os registros exportados.

Conjuração valida a magia escolhida e o limite de escolhas válidas, distintas, do mesmo nível e tradição. Entradas antigas vazias, nomes fora do catálogo e magias de campanha ainda não cadastradas ou liberadas permanecem consultáveis, recebem um aviso e não bloqueiam as magias válidas. Essas referências não concedem conjuração automática. Homebrew cadastrada e liberada pelo mestre entra nas opções autorizadas e usa a conjuração normal; veja [magias de campanha](MAGIAS_DE_CAMPANHA.md). O limite de repertório de conjuradores estudiosos, os usos diários e a proteção de versão continuam ativos. Salvar o repertório normal ainda exige validar a lista completa.

Em **Exceções de magia (mestre)**, adicionar exige informar o nome e confirmar; cancelar não cria uma entrada vazia. O editor conserva nível e tradição nos registros. Para uma entrada antiga chamada “Magia”, corrija o nome nesse editor ou remova o registro, após conferir o que ele representa. Referências sem cadastro ou liberação mantêm controle manual pelo mestre.

O painel do mestre atualiza o grupo a cada 30 segundos enquanto está visível. É possível pausar a atualização; ela também fica pausada durante a distribuição de recompensas. Requisições não se sobrepõem e são canceladas ao sair. Falhas conservam a última leitura com aviso. Não há transmissão contínua por WebSocket.

Fichas abertas conferem uma revisão pequena, com os mesmos controles de acesso. Alterações na ficha ou nas configurações da campanha exibem um aviso. A atualização solicitada pelo usuário fica bloqueada enquanto houver edições, recuperação de rascunho ou salvamento em andamento. Nenhuma leitura periódica substitui as edições locais.

## Modificadores de combate

**Geral & Combate → Origens dos bônus de CA e iniciativa** apresenta DEX, armadura/efeitos antigos, ajuste manual, poderes e origens adicionais. As origens são salvas no estado de regras com versão e auditoria. Uma origem não pode ser contada duas vezes para o mesmo atributo. CA e iniciativa adicionais são os atributos estruturados desta etapa; ataque, dano e outros efeitos continuam com seus controles existentes.

Graceful Fighting e Swashbuckling exigem ativação explícita, declaração de armadura leve ou menor, peso da armadura até 2 stone e carga pessoal até 5 stone. Seus limites de combinação são respeitados. As fichas antigas mantêm os valores manuais: antes de ativar uma origem, remova a cópia do bônus já incluída na armadura ou no ajuste manual. Outros poderes condicionais continuam como orientação para o mestre.

Uma origem pode ser vinculada a um item identificado desta ficha. O bônus só é aplicado quando ativo e o item é carregado pessoalmente; guardado, em montaria/veículo, removido ou não identificado não concede bônus. Registrar uma descrição livre ou gastar uma carga não cria um efeito automaticamente. Tela, consulta do mestre e exportação compartilham os cálculos.

## Histórico da campanha

Mostra tipo da operação, autor, personagem/campanha, motivo, participantes e ganhos/saldos quando registrados. Operações do grupo aparecem como **Campanha**, sem nome de ficha inexistente. Há filtros por operação e páginas de 25 registros. A API mantém a resposta antiga para clientes sem o parâmetro de paginação.

## Portabilidade e aprendizado

Fórmulas adquiridas e origens manuais de bônus acompanham a importação JSON. Origens vinculadas a itens precisam de nova associação aos identificadores da cópia, com aviso; não são aplicadas silenciosamente. Estudos em andamento exigem revisão e um novo registro na cópia, preservando o registro e os recibos da ficha original. A importação não concede magias nem reaplica operações.

O fluxo de estudo segue Rulebook p. 182 e mantém grimório e repertório distintos; veja [fluxos ACKS II](FLUXOS_ACKS_II.md).

## Recuperação de senha

A página confere uma capacidade pública, independente da existência de uma conta. Com envio indisponível, apresenta a situação e bloqueia o pedido, permitindo repetir uma consulta que falhou. Links de redefinição já emitidos continuam utilizáveis. Configuração declarada não comprova entrega: confirme o recebimento e o uso do link com uma conta própria.

Em produção ainda é necessário cadastrar `SMTP_PASS` e `SMTP_FROM` no projeto Vercel e validar o remetente do Resend. As credenciais não devem ser enviadas pelo chat nem versionadas. Consulte [produção na Vercel](PRODUCAO_VERCEL.md).

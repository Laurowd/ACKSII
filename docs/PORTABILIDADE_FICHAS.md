# Exportação, importação e consulta de sessão

## Exportar os valores atuais

Abra uma ficha e use **Exportar JSON** para guardar seus dados em um arquivo. **Ficha para impressão/PDF** baixa um HTML independente e sem scripts: abra esse arquivo no navegador e pressione **Ctrl+P** (⌘+P no Mac), ou use **Imprimir** no menu do navegador, para salvar em PDF.

As duas exportações usam os atributos e os equipamentos atuais para calcular CA, iniciativa e movimento, como a tela da ficha. Também refletem as edições locais ainda pendentes de salvamento. Exportar não confirma essas alterações no servidor; **Salvar** informa se elas foram persistidas.

O JSON inclui os campos da ficha, armas, proficiências, inventário, magias, rituais, fórmulas, seguidores, domínio, cicatrizes, atividades, unidades militares, projetos de pesquisa e cargas comerciais. Quando disponível, inclui uma cópia da definição da classe para referência.

O formato atual é `acks-ii-character`, versão `1`. Dados da conta, vínculos com usuário/campanha, identificadores das relações e datas internas são omitidos.

O editor validado de repertório mantém um rascunho separado das magias registradas. Ele é preservado ao trocar de aba, indica pendências e pede confirmação ao sair. Use **Salvar repertório** para confirmar as escolhas; **Salvar** da ficha permite repetir um envio que falhou, preservando mudanças digitadas após a tentativa. O JSON guarda o rascunho pendente em `drafts.repertoire`; o HTML usa as magias registradas. Na importação, esse rascunho serve para recuperação e revisão manual: ele não substitui as magias registradas nem contorna a validação. A prévia e o resultado da importação informam isso.

A exportação aguarda o carregamento do catálogo e das regras da campanha. Em caso de falha, use a nova tentativa indicada na ficha antes de exportar, para preservar os cálculos e opções da mesa.

## Criar uma ficha a partir do JSON

1. Abra **Personagens** no menu e clique em **Importar JSON**.
2. Selecione uma exportação `.json` da aplicação. A prévia mostra nome, classe e nível.
3. Escolha **Sem campanha** ou uma campanha da qual você seja mestre ou membro aceito.
4. Clique em **Criar ficha importada**. A aplicação abre a nova ficha e informa os avisos de conversão.

A importação cria uma ficha na conta conectada. A ficha original permanece disponível. Repetir a importação cria outra cópia; conferir a prévia ajuda a evitar cópias involuntárias.

O limite do arquivo é **240 KB**. A API valida o formato, os tipos, os campos permitidos e os valores das relações; cada lista de registros relacionados admite até 500 entradas. Campos protegidos, nome de personagem vazio, magias com nível inválido ou dados de cargas inconsistentes são rejeitados. Registros vazios permitidos nos editores também podem ser restaurados. A ficha e seus registros são criados juntos: uma falha não deixa uma ficha parcialmente importada.

## Identificadores, classes e histórico

Todos os registros recebem novos identificadores. Links para a ficha anterior e referências externas a itens ou projetos continuam apontando para os registros originais. A nova ficha pertence à conta conectada e à campanha escolhida no diálogo.

A classe é vinculada a uma definição disponível no catálogo ou na campanha de destino, pelo identificador ou pelo nome. A definição incluída no JSON serve como referência; ela não cria uma classe de campanha automaticamente. Se a classe não puder ser encontrada, o nome e os valores são preservados como classe manual, com um aviso. Confira a progressão com o mestre, especialmente quando classes distintas têm o mesmo nome. Para manter uma classe própria, prepare sua definição na campanha de destino antes de importar.

XP, moedas, tesouro do domínio e demais saldos atuais são preservados. A importação não concede novamente XP, não cobra materiais e não executa compras ou fechamentos mensais. Usos de magia por tradição/nível e o dia do último descanso são preservados quando presentes e válidos.

O histórico de auditoria e os registros de operações ligados à ficha original não são restaurados. Fechamentos anteriores de aventuras e meses, períodos de pesquisa e vínculos internos de projetos permanecem na origem. A nova ficha ganha um registro de importação no histórico.

Projetos de pesquisa acompanhada em andamento são preservados com seu estado e prazo atuais como registros manuais. Combine a continuação com o mestre; os materiais já pagos não são cobrados novamente durante a importação. Dados de itens mágicos, incluindo cargas, são mantidos, mas o vínculo com o identificador do projeto original é removido.

Cargas importadas como vendidas não possuem o histórico de liquidação da ficha original. Elas continuam vendidas e não geram novo crédito. O mestre responsável pode usar **Reabrir registro manual**, com justificativa, apenas quando confirmou que o retorno ainda não foi recebido. Reabrir não movimenta moedas; uma venda liquidada nesta ficha não pode ser reaberta nem ter seus valores alterados.

Após importar, confira os saldos e os trabalhos em andamento antes de registrar novas operações. Para recuperar também usuários, campanhas e histórico completo, use os procedimentos de [backup e restauração](PRODUCAO_VERCEL.md).

## Consultar o grupo durante a sessão

O menu **Painel do Mestre → Sessão da campanha** mostra personagens das campanhas que você administra e suas próprias fichas avulsas. Outros mestres não recebem acesso às suas campanhas por terem o mesmo papel.

A tabela reúne PV atuais/máximos, CA, movimento de combate e exploração, os cinco salvamentos e usos restantes de magia por tradição e nível. A CA principal é sem escudo; a referência com escudo aparece abaixo. Classes sem cálculo automático de magia são identificadas como controle manual.

Use os filtros de campanha e nome do personagem/jogador para organizar o grupo. Clique no nome para abrir a ficha e em **Atualizar grupo** após alterações dos jogadores. O horário indica a última leitura concluída. Se a atualização falhar, a tela mantém os valores anteriores e informa que estão desatualizados.

**Consultar regras** preserva a busca no compêndio e as tabelas do escudo. Em celulares, cada personagem aparece como um cartão; os temas escuro e pergaminho compartilham os mesmos dados e cálculos.

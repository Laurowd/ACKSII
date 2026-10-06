# Magias de campanha e escolhas pesquisáveis

O mestre responsável cadastra homebrew em **Campanhas → Gerenciar → Magias de campanha**. Informe nome próprio, tradição arcana/divina, nível de 1 a 6, descrição, alcance e duração. Novas magias começam **secretas**. O cadastro aceita texto simples; a interrogação da ficha mostra o efeito e as referências de alcance e duração.

## Descoberta e visibilidade

- **Secreta:** nome e efeito aparecem somente no editor do mestre. Não aparecem no catálogo, nas sugestões ou na conferência de regras dos jogadores.
- **Disponível para toda a campanha:** membros aceitos podem consultar e escolher. Estas magias também aparecem na criação de novas fichas da campanha.
- **Revelada para personagens específicos:** escolha as fichas autorizadas. Ter outra ficha na mesma conta não concede acesso. A magia só aparece nas opções da ficha revelada; a criação de personagens ainda não possui uma ficha para receber essa autorização.

Revelar não ensina nem adiciona automaticamente. O mestre controla a disponibilidade, e o jogador escolhe a magia no repertório ou acompanha a aquisição da fórmula e a semana de estudo. Personagens de membros removidos não dão acesso aos efeitos de campanha. Outra campanha não recebe o catálogo homebrew.

Uma magia já presente no repertório precisa ser removida das fichas afetadas antes de ser ocultada, excluída ou ter nome, nível ou tradição alterados. Descrição, alcance e duração podem ser revisados. Isso evita deixar fichas com uma referência que perdeu sua aprovação. Fichas não aprendem novamente nem gastam usos por uma edição do cadastro.

## Escolha e conjuração

Na criação, no editor do repertório e nas escolhas de proficiência, abra a lista pela seta ou digite parte do nome para filtrar. A busca ignora diferenças de maiúsculas e acentos. Setas do teclado e Enter selecionam; Escape fecha. As listas de proficiência permanecem separadas entre classe e geral, com as especializações já disponíveis.

O campo **Nome da nova magia** e os nomes já registrados em **Exceções de magia (mestre)** também usam essa lista, filtrada por nível e tradição a partir das listas do Rulebook (p. 186–189), incluindo homebrew autorizadas. Selecionar um nome não cria a magia: use **Confirmar magia** para salvar. A proficiência geral inicial do construtor de classes usa o mesmo seletor pesquisável.

Magias de campanha liberadas mostram essa identificação na ficha. **Conjurar** desconta um uso diário do nível e tradição correspondentes. Requisitos de classe, níveis disponíveis, capacidade do repertório, descanso e proteção contra edições simultâneas continuam valendo. Disponibilizar uma magia divina constitui a autorização do mestre para incluí-la como opção da campanha; não aumenta os usos de magia da classe.

Alcance, duração e efeitos descrevem a magia; o sistema não resolve seus alvos, dano ou duração automaticamente. Entradas antigas livres permanecem referências manuais até corresponderem a uma magia do livro ou a um cadastro homebrew liberado. O cadastro da campanha não acompanha uma exportação JSON individual: uma cópia em outra campanha precisa de cadastro e liberação pelo seu mestre.

## Atualização

A migration `20261005203000_campaign_spells` acrescenta duas tabelas, sem apagar ou reescrever fichas. Atualize o cliente Prisma e aplique as migrations antes de iniciar esta versão:

```powershell
cd backend
npm.cmd run prisma:generate
npx.cmd prisma migrate deploy
```

Para produção, siga [o procedimento da Vercel](PRODUCAO_VERCEL.md), incluindo backup verificado e validação em ambiente isolado. Os testes novos de API usam somente PostgreSQL local descartável e verificam sigilo, revelação por ficha, aprendizado, usos, limites e revogação de acesso.

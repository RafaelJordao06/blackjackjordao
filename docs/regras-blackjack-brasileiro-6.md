# Regras - Blackjack Brasileiro 6

Fonte: tela de ajuda do jogo `Blackjack Brasileiro 6` da Pragmatic Play na Bullsbet.

## Regras principais

- O jogo usa 8 baralhos padrao de 52 cartas.
- O crupie compra cartas no 16 ou menos.
- O crupie sempre para no 17.
- O objetivo e ter uma pontuacao maior que a do crupie sem passar de 21.
- Blackjack natural acontece com as duas primeiras cartas totalizando 21.
- Blackjack natural vence qualquer 21 formado com mais cartas ou com As dividido.
- Se jogador e crupie tiverem Blackjack natural, o resultado e empate.
- Se a mao do jogador tiver o mesmo total que a do crupie, a aposta e devolvida.
- Se o jogador ultrapassar 21, perde automaticamente.
- Se o crupie ultrapassar 21, as maos restantes do jogador vencem.

## Valores das cartas

- Cartas de 2 a 10 valem o proprio valor numerico.
- Valete, Dama e Rei valem 10.
- As vale 1 ou 11, conforme for melhor para a mao.
- Uma mao suave tem um As contado como 11.
- Naipe nao importa no jogo principal de Blackjack.

## Decisoes disponiveis

- `Pedir`: recebe uma carta adicional.
- `Parar`: encerra as decisoes da mao.
- `Dobrar`: dobra a aposta e recebe exatamente uma carta adicional.
- `Dividir`: separa duas cartas iniciais de mesmo valor em duas maos.
- `Seguro`: disponivel quando a carta aberta do crupie e um As.
- `Saque`: cashout dinamico oferecido pela casa em algumas situacoes.

## Dobrar

- Pode dobrar com qualquer combinacao inicial de duas cartas.
- Pode dobrar depois de dividir, exceto ao dividir dois Ases.
- Depois de dobrar, apenas uma carta e distribuida.
- Se a decisao de dobrar falhar e for cancelada, ela e revertida para `Pedir`.

## Dividir

- Pode dividir cartas iniciais do mesmo valor.
- Somente uma divisao e permitida por mao.
- Dividir Ases e permitido.
- Nao e permitido pedir cartas em Ases divididos.
- Ao dividir Ases, cada mao recebe apenas uma carta adicional.
- As dividido com carta de valor 10 conta como 21, nao como Blackjack natural.
- Se a decisao de dividir falhar e for cancelada, ela e revertida para `Parar`.

## Seguro

- O seguro e oferecido quando a carta aberta do crupie e um As.
- O valor do seguro equivale a metade da aposta inicial.
- Seguro paga 2:1 se a carta oculta do crupie tiver valor 10.
- Se o crupie tiver Blackjack, a rodada termina apos a verificacao.
- Se o crupie nao tiver Blackjack, o seguro e perdido e a rodada continua.
- Se nenhuma decisao de seguro for tomada no tempo limite, a opcao padrao e `Nao`.

## Pagamentos

- Vitoria normal paga 1:1.
- Blackjack natural paga 3:2.
- Seguro paga 2:1.
- Empate devolve a aposta.

## Apostas paralelas

As apostas paralelas sao opcionais e nao afetam o jogo principal.

### Pares Perfeitos

- Par perfeito: 25:1.
- Par colorido: 12:1.
- Par misto: 6:1.

### 21+3

- Trinca de mesmo naipe: 100:1.
- Sequencia de mesmo naipe: 40:1.
- Trinca: 30:1.
- Straight: 10:1.
- Cor: 5:1.

## Retorno ao jogador

- RTP teorico ideal do Blackjack principal: 99.41%.
- RTP de Pares Perfeitos: 95.90%.
- RTP de 21+3: 96.30%.
- RTP com base na oferta de Saque: 98.00%.

## Regras operacionais

- A rodada usa uma carta de corte.
- Quando a carta de corte aparece, ela e removida e o crupie anuncia a ultima mao da maquina de carteado.
- Depois dessa mao, nenhuma outra carta e distribuida ate troca de maquina ou embaralhamento.
- O embaralhamento ocorre quando a carta de corte e removida e a rodada e concluida.
- A troca de cartas acontece uma vez a cada 24 horas ou em situacoes operacionais especificas.

## Padroes para simulador

- Modelar um shoe inicial com 8 baralhos: 416 cartas.
- Cada valor de As a 9 tem 32 cartas.
- Valor 10 tem 128 cartas, considerando 10, J, Q e K.
- Implementar primeiro apenas o jogo principal.
- Ignorar apostas paralelas no primeiro prototipo.
- Tratar `Saque` como recurso separado, pois o valor e dinamico e calculado pela casa.
- Acoes iniciais recomendadas para o motor: `hit`, `stand`, `double`, `split`, `insurance`.
- Considerar que o crupie para em todos os 17, incluindo soft 17, pois a regra diz que sempre para no 17.

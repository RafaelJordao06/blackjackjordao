# Blackjack

Projeto para estudar e simular decisoes estatisticas de Blackjack.

## Documentacao

- [Regras do Blackjack Brasileiro 6](docs/regras-blackjack-brasileiro-6.md)

## Escopo inicial

- Simular o jogo principal com 8 baralhos.
- Calcular probabilidades e valor esperado para `hit`, `stand`, `double`, `split` e `insurance`.
- Deixar apostas paralelas e cashout dinamico para etapas futuras.

## Interface de mesa em Node

Rode o servidor local:

```bash
npm start
```

Depois abra:

```txt
http://127.0.0.1:8765
```

A interface simula uma mesa com 1 a 7 assentos. Selecione o crupie ou um assento, clique nas cartas e o painel calcula a recomendacao do assento ativo. Use `Nova rodada` para limpar a mesa mantendo as cartas no shoe visto, e `Reset shoe` quando houver embaralhamento.

O calculo roda no proprio navegador com JavaScript, a partir de `web/engine.js`. O servidor Node apenas entrega os arquivos HTML, CSS e JS.

O EV exibido e medido em unidades da aposta principal. Por exemplo, `+0.1200` significa lucro esperado de 0.12 unidade por 1 unidade apostada.

### Dividir maos

Quando a mao ativa tiver duas cartas de mesmo valor, o painel libera o botao `Aplicar Dividir`.

Ao clicar nele, o assento vira duas maos:

- `Mao 1`
- `Mao 2`

Clique na mao que deseja alimentar e depois clique nas cartas recebidas. O painel passa a calcular a recomendacao da mao ativa. Em divisao de Ases, cada mao recebe apenas uma carta adicional e fica travada automaticamente.

### Dobrar

Quando a mao ativa tiver duas cartas e ainda nao estiver travada, o painel libera `Aplicar Dobrar`.

Ao clicar nele, a mao fica marcada como aguardando a unica carta adicional do double. Depois que voce informar essa carta, a mao fica travada automaticamente e nao recebe novas cartas.

## Validacao

Os testes usam o runner nativo do Node:

```bash
npm test
```

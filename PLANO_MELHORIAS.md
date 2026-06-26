# Plano de correção e melhoria — Blackjack do Jordão

## Objetivo

Transformar o projeto em um assistente estatístico mais confiável para blackjack ao vivo, com regras explícitas, cálculo de EV consistente, contagem de cartas, recomendação de aposta e uma base futura para módulos estatísticos de outros jogos.

> Observação importante: o sistema deve ser apresentado como calculadora/assistente estatístico. Ele não garante lucro e não deve ser vendido como previsão infalível de resultado.

---

## Diagnóstico atual

O projeto já tem uma boa base: o motor em `web/engine.js` calcula EV por ação usando a composição restante do shoe. Isso é mais forte do que uma simples tabela fixa de estratégia básica.

Pontos positivos:

- cálculo de EV para parar, pedir, dobrar e dividir;
- remoção das cartas vistas do shoe;
- suporte a múltiplos assentos;
- ações de desfazer, nova rodada e reset do shoe;
- testes básicos em `tests/engine.test.js`.

Problemas principais:

- inconsistência entre “Blackjack Brasileiro 6” e shoe de 416 cartas, que representa 8 decks;
- textos com “Crupie” em vez de “Crupiê”;
- regras da mesa não aparecem claramente para o usuário;
- ausência de running count e true count;
- ausência de recomendação de aposta;
- ausência de gestão de banca;
- falta de configuração centralizada de regras.

---

## Fase 1 — Correções rápidas

### 1. Corrigir nome e textos

Trocar todos os textos:

- `Crupie` → `Crupiê`
- `acao` → `ação`
- `Mao` → `Mão`
- `decisao` → `decisão`
- `indisponivel` → `indisponível`
- `nao` → `não`

Arquivos prováveis:

- `web/index.html`
- `web/app.js`
- `web/engine.js`
- `tests/engine.test.js`

### 2. Corrigir inconsistência de decks

Hoje o sistema usa 8 decks:

```js
buildShoe(options.decks || 8)
```

E o frontend envia:

```js
decks: 8
```

Além disso, o painel mostra 416 cartas, que equivale a 8 decks.

Decisão recomendada:

- manter 8 decks;
- trocar o texto “Blackjack Brasileiro 6” para “Blackjack Brasileiro — 8 decks”.

Alternativa:

- mudar tudo para 6 decks;
- shoe inicial deve virar 312 cartas.

---

## Fase 2 — Configuração central do jogo

Criar um arquivo ou objeto central de configuração.

Sugestão simples em `web/config.js`:

```js
const GAME_CONFIG = {
  decks: 8,
  dealerHitsSoft17: false,
  blackjackPayout: 1.5,
  doubleAfterSplit: true,
  surrender: false,
  insurancePayout: 2,
};
```

Depois usar essa configuração no `app.js` e no `engine.js`.

Benefícios:

- evita número fixo espalhado no código;
- facilita testar 6 vs 8 decks;
- permite adaptar para regras de diferentes cassinos;
- melhora confiança do usuário.

---

## Fase 3 — Mostrar regras na interface

Adicionar um bloco no topo da tela:

```txt
8 decks • Dealer para no soft 17 • Blackjack paga 3:2 • Dobrar após split: sim • Sem surrender
```

Também adicionar um aviso curto:

```txt
Assistente estatístico. Não garante lucro. Use apenas como apoio de decisão.
```

---

## Fase 4 — Contagem de cartas

Adicionar running count e true count usando Hi-Lo.

### Regra Hi-Lo

- 2, 3, 4, 5, 6 = +1
- 7, 8, 9 = 0
- 10, J, Q, K, A = -1

### Funções sugeridas

```js
function runningCount(seenCards) {
  return seenCards.reduce((count, card) => {
    const rank = normalizeCard(card);
    if (["2", "3", "4", "5", "6"].includes(rank)) return count + 1;
    if (["10", "A"].includes(rank)) return count - 1;
    return count;
  }, 0);
}

function trueCount(seenCards, remainingCards) {
  const decksRemaining = remainingCards / 52;
  if (decksRemaining <= 0) return 0;
  return runningCount(seenCards) / decksRemaining;
}
```

### Exibir na interface

Adicionar métricas:

- Running Count;
- True Count;
- Penetração do shoe;
- Status do shoe: ruim, neutro, favorável, muito favorável.

---

## Fase 5 — Recomendação de aposta

Criar recomendação simples baseada no true count.

Exemplo inicial:

```js
function betRecommendation(trueCount) {
  if (trueCount < 1) return "Aposta mínima ou não jogar";
  if (trueCount < 2) return "Aposta mínima";
  if (trueCount < 4) return "Aumentar moderado";
  return "Shoe forte: aumentar com cautela";
}
```

Versão futura com banca:

```js
function betUnits(trueCount) {
  if (trueCount < 1) return 0;
  if (trueCount < 2) return 1;
  if (trueCount < 3) return 2;
  if (trueCount < 4) return 4;
  return 6;
}
```

Campos novos na interface:

- banca atual;
- aposta mínima;
- limite máximo aceito;
- stop loss;
- stop win.

---

## Fase 6 — Melhorias no EV

Hoje o motor já calcula EV por composição do shoe. Melhorias futuras:

- permitir regra H17/S17;
- permitir payout de blackjack 3:2 ou 6:5;
- permitir ou bloquear double after split;
- implementar surrender quando existir;
- limitar resplit;
- tratar split de ases conforme regra da mesa;
- separar EV de jogada e EV de aposta inicial.

---

## Fase 7 — Testes

Adicionar testes para:

- 6 decks = 312 cartas;
- 8 decks = 416 cartas;
- normalização de J/Q/K para 10;
- running count;
- true count;
- insurance EV positivo quando há concentração alta de cartas 10;
- ação recomendada sempre ser a de maior EV;
- split indisponível quando não há par;
- double disponível somente com 2 cartas.

---

## Fase 8 — Módulo de dados com histórico

Criar módulo separado para jogos de dados, com foco em análise estatística e não em previsão.

Arquivos sugeridos:

```txt
web/dados.html
web/dice-engine.js
web/dice-app.js
```

Funcionalidades:

- registrar resultado de cada rodada;
- histórico das últimas rodadas;
- frequência de cada face;
- frequência de somas;
- comparação com valor esperado;
- alertas de desvio estatístico;
- simulação de estratégia;
- controle de banca.

Exemplo de engine:

```js
function analyzeDiceHistory(results) {
  const totalRounds = results.length;
  const dicePerRound = results[0]?.length || 0;
  const faceCounts = Object.fromEntries([1, 2, 3, 4, 5, 6].map((face) => [face, 0]));

  for (const roll of results) {
    for (const die of roll) {
      faceCounts[die] += 1;
    }
  }

  const expectedPerFace = totalRounds * dicePerRound / 6;

  return {
    totalRounds,
    dicePerRound,
    faceCounts,
    expectedPerFace,
    deviation: Object.fromEntries(
      Object.entries(faceCounts).map(([face, count]) => [face, count - expectedPerFace]),
    ),
  };
}
```

Importante: histórico de dados não prevê o próximo resultado se o jogo for justo. O valor do módulo é análise, disciplina e detecção de anomalias.

---

## Prioridade recomendada

1. Corrigir textos e decks.
2. Criar `GAME_CONFIG`.
3. Mostrar regras na tela.
4. Adicionar running count e true count.
5. Adicionar recomendação de aposta.
6. Adicionar gestão de banca.
7. Melhorar testes.
8. Criar módulo de dados.

---

## Conclusão

O foco principal deve continuar no blackjack, porque ele tem base matemática real para reduzir vantagem da casa e, em condições específicas, buscar uma pequena vantagem estatística.

O módulo de dados pode ser interessante como produto complementar, mas deve ser tratado como analisador histórico/estatístico, não como ferramenta de previsão garantida.

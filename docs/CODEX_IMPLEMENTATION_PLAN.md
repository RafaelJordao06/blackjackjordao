# CODEX_IMPLEMENTATION_PLAN.md

## Papel deste documento

Este documento foi escrito para orientar o Codex na evolução do projeto `blackjackjordao`.

O objetivo é transformar o projeto atual em uma plataforma local de análise estatística para jogos ao vivo, com interface web e automação local em Python para leitura de tela.

A plataforma deve ser construída como assistente estatístico, não como bot de apostas automáticas.

---

## Princípios obrigatórios

1. Não implementar clique automático em cassino.
2. Não implementar aposta automática.
3. Não prometer lucro garantido.
4. Não tratar histórico de dados/roleta como previsão confiável.
5. Separar claramente análise estatística de execução de apostas.
6. Priorizar segurança, clareza e validação dos dados reconhecidos.
7. Toda recomendação deve mostrar a base matemática: EV, probabilidade ou contagem.
8. Quando a confiança do reconhecimento for baixa, exigir confirmação manual.

---

# Estado atual do projeto

O projeto atual possui:

```txt
server.js
package.json
web/index.html
web/app.js
web/engine.js
tests/engine.test.js
```

O `web/engine.js` já contém um motor de blackjack capaz de calcular EV por composição do shoe.

Isso deve ser preservado e evoluído.

---

# Objetivo final

Criar uma plataforma híbrida:

```txt
Interface Web
  - Dashboard
  - Análise
  - Histórico
  - Gestão de banca
  - Configuração da mesa

Python Local
  - Captura da tela
  - Calibração de regiões
  - Reconhecimento de cartas
  - Reconhecimento de dados
  - Envio de JSON para a interface

Engine Estatístico
  - Blackjack
  - Sic Bo / dados
  - Bac Bo
  - Dragon Tiger
  - Baccarat
  - Roleta, apenas histórico/anomalias
```

---

# Arquitetura recomendada

```txt
blackjackjordao/

  web/
    index.html
    app.js
    engine.js
    config.js
    styles.css
    modules/
      blackjack-ui.js
      dice-ui.js
      bankroll-ui.js
      history-ui.js

  automation/
    requirements.txt
    README.md
    api.py
    capture.py
    calibrate.py
    models.py
    recognizers/
      cards.py
      dice.py
      baccarat.py
      dragon_tiger.py
    config/
      blackjack_regions.json
      dice_regions.json
    templates/
      cards/
      dice/

  docs/
    CODEX_IMPLEMENTATION_PLAN.md
    API_LOCAL.md
    AUTOMATION_PYTHON.md
    BLACKJACK_ENGINE.md
    DICE_ENGINE.md

  tests/
    engine.test.js
    count.test.js
    dice-engine.test.js
```

---

# Fase 1 — Correções imediatas no blackjack

## Tarefa 1.1 — Corrigir textos

Substituir:

- `Crupie` por `Crupiê`
- `Mao` por `Mão`
- `acao` por `ação`
- `decisao` por `decisão`
- `indisponivel` por `indisponível`
- `nao` por `não`

Arquivos prováveis:

- `web/index.html`
- `web/app.js`
- `web/engine.js`
- `tests/engine.test.js`

Critério de aceite:

- Interface não deve conter textos sem acento nesses casos.
- Testes devem continuar passando.

---

## Tarefa 1.2 — Resolver inconsistência de decks

Hoje o projeto mostra 416 cartas, equivalente a 8 decks, mas o texto menciona `Blackjack Brasileiro 6`.

Decisão padrão:

- usar 8 decks;
- alterar o texto para `Blackjack Brasileiro — 8 decks`.

Critério de aceite:

- O número de decks deve vir de configuração central.
- Não deve existir `416` fixo no app quando puder ser calculado por `decks * 52`.

---

## Tarefa 1.3 — Criar configuração central

Criar `web/config.js`:

```js
const GAME_CONFIG = {
  blackjack: {
    decks: 8,
    dealerHitsSoft17: false,
    blackjackPayout: 1.5,
    doubleAfterSplit: true,
    surrender: false,
    insurancePayout: 2,
    allowResplit: false,
    splitAcesOneCardOnly: true,
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = GAME_CONFIG;
}
```

Critério de aceite:

- `app.js` deve usar `GAME_CONFIG.blackjack.decks`.
- `engine.js` deve aceitar opções vindas dessa configuração.
- Testes devem cobrir 6 e 8 decks.

---

# Fase 2 — Contagem e métricas do shoe

## Tarefa 2.1 — Running Count Hi-Lo

Implementar no engine:

```js
function runningCount(seenCards) {
  return seenCards.reduce((count, card) => {
    const rank = normalizeCard(card);
    if (["2", "3", "4", "5", "6"].includes(rank)) return count + 1;
    if (["10", "A"].includes(rank)) return count - 1;
    return count;
  }, 0);
}
```

Critério de aceite:

- Exportar função no `BlackjackEngine`.
- Adicionar testes.

---

## Tarefa 2.2 — True Count

Implementar:

```js
function trueCount(seenCards, remainingCards) {
  const decksRemaining = remainingCards / 52;
  if (decksRemaining <= 0) return 0;
  return runningCount(seenCards) / decksRemaining;
}
```

Critério de aceite:

- Mostrar true count no painel.
- Arredondar para 1 ou 2 casas decimais.

---

## Tarefa 2.3 — Penetração do shoe

Implementar:

```js
function shoePenetration(seenCards, decks) {
  const totalCards = decks * 52;
  return seenCards.length / totalCards;
}
```

Mostrar:

```txt
Penetração: 42.3%
```

---

# Fase 3 — Recomendação de aposta responsável

A recomendação deve ser apresentada como gestão de risco, não como garantia de lucro.

Implementar:

```js
function betUnitsFromTrueCount(tc) {
  if (tc < 1) return 0;
  if (tc < 2) return 1;
  if (tc < 3) return 2;
  if (tc < 4) return 4;
  return 6;
}
```

Texto sugerido:

- `TC abaixo de 1: evitar ou aposta mínima`
- `TC entre 1 e 2: aposta mínima`
- `TC entre 2 e 3: aumentar pouco`
- `TC entre 3 e 4: aumentar moderado`
- `TC acima de 4: shoe favorável, usar limite de risco`

Critério de aceite:

- Interface deve mostrar unidade recomendada.
- Interface deve exibir aviso: `Não garante lucro`.
- Usuário deve conseguir configurar unidade base.

---

# Fase 4 — Gestão de banca

Adicionar campos:

- banca inicial;
- banca atual;
- unidade base;
- stop loss;
- stop win;
- limite máximo de unidades.

Métricas:

- lucro/prejuízo da sessão;
- drawdown;
- ROI;
- quantidade de mãos;
- EV acumulado estimado.

Persistência:

- usar `localStorage` no MVP;
- evoluir para `IndexedDB` depois.

Critério de aceite:

- Configurações permanecem após reload.
- Nenhum cálculo deve quebrar se campos estiverem vazios.

---

# Fase 5 — API local para receber automação

Criar uma API local em Python, não no servidor Node atual.

## Dependências

Criar `automation/requirements.txt`:

```txt
fastapi
uvicorn
pydantic
mss
opencv-python
numpy
websockets
```

## Servidor local

Criar `automation/api.py` com:

- `GET /health`
- `POST /state/blackjack`
- `POST /state/dice`
- `GET /state/current`
- WebSocket `/ws`

Exemplo de payload blackjack:

```json
{
  "game": "blackjack",
  "dealer": ["6"],
  "seats": [
    { "index": 0, "hands": [["8", "8"]] }
  ],
  "seen": ["2", "K", "5"],
  "confidence": 0.94,
  "source": "screen_capture"
}
```

Critério de aceite:

- API deve validar payload com Pydantic.
- Payload inválido deve retornar erro claro.
- Frontend deve conseguir consumir o estado local.

---

# Fase 6 — Integração Web com API local

No frontend:

- criar modo manual;
- criar modo automático;
- tentar conectar em `http://localhost:8000`;
- se falhar, permanecer em modo manual;
- se conectar, receber eventos via WebSocket.

Estados:

```txt
Manual
Conectando
Automático conectado
Automático com baixa confiança
Erro de automação
```

Critério de aceite:

- O app não pode depender da API local para funcionar.
- A versão hospedada na Vercel deve continuar abrindo normalmente.

---

# Fase 7 — Calibração de tela

Criar `automation/calibrate.py`.

Objetivo:

- usuário seleciona regiões da tela;
- salvar coordenadas em JSON;
- cada região recebe nome.

Exemplo `automation/config/blackjack_regions.json`:

```json
{
  "dealer_upcard": { "x": 100, "y": 120, "w": 80, "h": 110 },
  "seat_1_card_1": { "x": 300, "y": 500, "w": 80, "h": 110 },
  "seat_1_card_2": { "x": 390, "y": 500, "w": 80, "h": 110 }
}
```

Critério de aceite:

- Calibração deve salvar JSON.
- Captura deve conseguir ler as regiões salvas.

---

# Fase 8 — Captura de tela

Criar `automation/capture.py`.

Responsabilidades:

- capturar screenshot com `mss`;
- recortar regiões configuradas;
- passar recortes para recognizers;
- gerar estado estruturado;
- enviar para API local.

Pseudo fluxo:

```txt
load regions
while running:
  screenshot
  crop dealer/seat regions
  recognize cards
  build payload
  send to localhost API
  sleep 300ms
```

Critério de aceite:

- Captura deve funcionar sem abrir navegador automaticamente.
- Deve ter logs simples.
- Deve permitir desligar com Ctrl+C.

---

# Fase 9 — Reconhecimento de cartas

Começar com template matching.

Criar `automation/recognizers/cards.py`.

Função esperada:

```py
recognize_card(image) -> { "rank": "A", "confidence": 0.93 }
```

Normalização:

- J, Q, K retornam como rank visual, mas o motor pode normalizar para 10.
- Guardar carta visual e valor normalizado quando possível.

Exemplo:

```json
{
  "rank": "K",
  "normalized": "10",
  "confidence": 0.91
}
```

Critério de aceite:

- Se confiança abaixo de 0.80, retornar `unknown`.
- App deve mostrar aviso de confirmação manual.

---

# Fase 10 — Módulo de dados / Sic Bo

Criar `web/dice-engine.js`.

O motor deve enumerar as 216 combinações de três dados.

Funções:

- `allThreeDiceOutcomes()`;
- `sumDistribution()`;
- `isTriple(outcome)`;
- `probabilityOfBet(betType)`;
- `evForBet(probability, payout)`;
- `analyzeDiceHistory(results)`.

Apostas mínimas:

- Small 4-10, exceto triplos;
- Big 11-17, exceto triplos;
- Odd;
- Even;
- Any Triple;
- Specific Triple;
- Specific Total;
- Single Number.

Critério de aceite:

- Testes devem validar 216 combinações.
- Testes devem validar distribuição das somas.
- Interface deve deixar claro que histórico não prevê próximo resultado.

---

# Fase 11 — Reconhecimento de dados

Criar `automation/recognizers/dice.py`.

Começar simples:

```py
recognize_die(image) -> { "value": 4, "confidence": 0.90 }
```

Depois:

```py
recognize_three_dice(image) -> [3, 4, 6]
```

Critério de aceite:

- Se qualquer dado estiver com baixa confiança, payload deve marcar `requires_confirmation: true`.

---

# Fase 12 — Outros jogos

## Bac Bo

Capturar:

- dois dados do Player;
- dois dados do Banker;
- resultado.

Calcular:

- soma Player;
- soma Banker;
- winner;
- frequência;
- EV conforme payout.

## Dragon Tiger

Capturar:

- carta Dragon;
- carta Tiger;
- histórico;
- cartas vistas.

Calcular:

- probabilidade Dragon/Tiger/Tie baseada no shoe restante quando possível.

## Baccarat

Capturar:

- cartas Player;
- cartas Banker;
- resultado;
- cartas vistas.

Calcular:

- winner;
- histórico;
- EV por aposta principal conforme payout.

## Roleta

Capturar:

- número;
- cor;
- dúzia;
- coluna.

Calcular apenas:

- frequência;
- histórico;
- desvio esperado;
- alerta de anomalia.

Não tratar como previsão.

---

# Fase 13 — Histórico unificado

Criar modelo:

```json
{
  "id": "uuid",
  "game": "blackjack",
  "timestamp": "2026-06-26T22:00:00Z",
  "table": "manual",
  "input_mode": "manual|screen_capture",
  "payload": {},
  "analysis": {},
  "confidence": 0.93
}
```

Persistência MVP:

- `localStorage` para web;
- arquivo `.jsonl` para Python.

Futuro:

- SQLite local.

---

# Fase 14 — Qualidade e testes

## JS

Usar `node --test`.

Adicionar testes para:

- configs;
- contagem;
- true count;
- EV;
- dice engine;
- parsing de payload.

## Python

Usar `pytest`.

Adicionar testes para:

- validação de modelos;
- leitura de config;
- recognizer retornando baixa confiança;
- API health;
- payload blackjack.

---

# Fase 15 — UX de segurança

Adicionar avisos discretos:

```txt
Assistente estatístico. Não garante lucro.
```

```txt
Histórico de dados e roleta não prevê o próximo resultado em jogos justos.
```

```txt
Use confirmação manual quando a leitura automática estiver incerta.
```

---

# Ordem recomendada para o Codex implementar

1. Corrigir textos e decks.
2. Criar `web/config.js`.
3. Adicionar running count, true count e penetração.
4. Mostrar métricas no dashboard.
5. Adicionar recomendação de unidades.
6. Adicionar gestão de banca simples.
7. Criar `automation/requirements.txt`.
8. Criar `automation/api.py` com `/health` e `/state/blackjack`.
9. Criar integração opcional do frontend com API local.
10. Criar `automation/calibrate.py`.
11. Criar `automation/capture.py`.
12. Criar recognizer básico de cartas com retorno mockado primeiro.
13. Criar `web/dice-engine.js`.
14. Criar testes do dice engine.
15. Criar UI simples para dados.
16. Criar recognizer de dados.
17. Evoluir para Bac Bo, Dragon Tiger e Baccarat.

---

# Primeira tarefa concreta sugerida ao Codex

Executar somente esta primeira etapa:

```txt
1. Criar web/config.js.
2. Remover hardcode de 416 e decks: 8 do app.
3. Corrigir textos Crupie/Crupiê e Mao/Mão.
4. Adicionar métricas running count, true count e penetração no engine.
5. Adicionar testes para essas métricas.
6. Garantir npm test passando.
```

Não começar automação Python antes dessa base estar limpa.

---

# Critério de sucesso do projeto

O projeto será considerado bem estruturado quando:

- o blackjack funcionar manualmente e automaticamente;
- o motor estatístico for testável sem interface;
- o Python apenas observar a tela e enviar JSON;
- a web continuar funcionando sem Python;
- novos jogos puderem entrar como módulos;
- o usuário entender sempre a diferença entre análise estatística e previsão.

# Regras dos jogos e plano de automação por tela

## Objetivo

Documentar as regras mínimas que o sistema precisa entender para analisar jogos ao vivo e propor uma arquitetura para captura automática da tela usando Python/visão computacional.

Este documento serve como base para evoluir o projeto de um assistente manual de blackjack para um painel estatístico com leitura assistida da tela.

> Importante: a automação proposta aqui é para leitura de tela e preenchimento do analisador local. Não inclui clique automático, aposta automática ou tentativa de burlar regras de cassino/plataforma. Antes de usar em qualquer site real, verificar termos de uso da plataforma.

---

# Parte 1 — Jogos prioritários

## 1. Blackjack

### Tipo

Jogo de cartas com decisão do jogador.

### Informações que o sistema precisa capturar

- carta aberta do crupiê;
- cartas de cada assento;
- cartas adicionais compradas;
- cartas descartadas/visíveis;
- momento de nova rodada;
- momento de novo shoe;
- se o dealer compra ou para no soft 17;
- quantidade de decks;
- payout do blackjack;
- permissão de double after split;
- permissão de surrender;
- regra para split de ases.

### Regras básicas

- Cartas 2 a 10 valem seu número.
- J, Q e K valem 10.
- Ás vale 11 ou 1, conforme melhor para a mão.
- Blackjack natural é Ás + carta de valor 10 nas duas primeiras cartas.
- Jogador pode pedir, parar, dobrar ou dividir quando permitido.
- Crupiê joga por regra fixa, normalmente parando em 17 ou comprando no soft 17, dependendo da mesa.

### Análise possível

Este é o jogo mais promissor para o sistema porque as cartas já vistas alteram a composição do shoe. O sistema deve calcular:

- EV de parar;
- EV de pedir;
- EV de dobrar;
- EV de dividir;
- running count;
- true count;
- penetração do shoe;
- recomendação de aposta baseada no true count;
- recomendação de ação baseada no maior EV.

### Status no projeto atual

O projeto já calcula EV por composição do shoe, o que é uma base forte. O próximo passo é configurar regras da mesa e adicionar contagem/gestão de aposta.

---

## 2. Sic Bo

### Tipo

Jogo de dados com três dados de seis faces.

### Informações que o sistema precisa capturar

- resultado dos três dados;
- soma dos dados;
- se houve triplo;
- histórico das últimas rodadas;
- tipo de aposta escolhida;
- payout da mesa.

### Regras básicas

O jogo usa três dados. O jogador aposta em eventos que podem acontecer no lançamento, como:

- Big/Grande: soma de 11 a 17, normalmente perdendo se sair triplo;
- Small/Pequeno: soma de 4 a 10, normalmente perdendo se sair triplo;
- Par/Ímpar, dependendo da mesa;
- total específico, como 4, 5, 6 ... 17;
- triplo específico, como 3-3-3;
- qualquer triplo;
- combinação de dois números;
- número único aparecendo em um, dois ou três dados.

### Pontos importantes para o sistema

- Dados são independentes rodada a rodada.
- Histórico não prevê o próximo resultado em um jogo justo.
- O sistema deve funcionar como analisador estatístico, não como previsor.
- O motor deve calcular probabilidade real de cada aposta e comparar com o payout oferecido.

### Fórmula de EV

```js
EV = probabilidade_de_ganhar * lucro_pago - probabilidade_de_perder * aposta
```

Exemplo conceitual:

```js
function ev(probWin, payout) {
  const probLose = 1 - probWin;
  return probWin * payout - probLose;
}
```

### Probabilidades base

Com três dados há:

```txt
6 * 6 * 6 = 216 combinações possíveis
```

O sistema pode enumerar todas as combinações para calcular qualquer aposta.

---

## 3. Bac Bo

### Tipo

Jogo de dados inspirado no baccarat.

### Estrutura geral

Normalmente há dois lados:

- Player/Jogador;
- Banker/Banco.

Cada lado recebe dois dados. Soma maior vence.

### Informações que o sistema precisa capturar

- dois dados do Player;
- dois dados do Banker;
- soma do Player;
- soma do Banker;
- resultado: Player, Banker ou Tie;
- multiplicador do Tie, quando houver;
- histórico de resultados;
- payout real da mesa.

### Regras básicas

- Player rola dois dados.
- Banker rola dois dados.
- Quem tiver maior soma vence.
- Se as somas forem iguais, dá empate.
- Apostas comuns: Player, Banker e Tie.
- Algumas versões têm apostas laterais por empate específico, soma ou pares.

### Análise possível

O sistema pode calcular:

- frequência de Player/Banker/Tie;
- distribuição das somas de 2 a 12;
- frequência de pares;
- frequência de empates por soma;
- comparação entre frequência real e frequência esperada;
- EV de cada aposta conforme payout.

### Observação estatística

Como dados são independentes, histórico não cria vantagem por si só. A vantagem só apareceria se:

- payout estiver errado;
- houver viés físico ou técnico nos dados;
- a transmissão ou mesa tiver falha operacional;
- houver promoção com EV positivo.

---

## 4. Dragon Tiger

### Tipo

Jogo de cartas simples, parecido com baccarat simplificado.

### Estrutura geral

- Uma carta para Dragon.
- Uma carta para Tiger.
- Carta maior vence.
- Empate pode ser aposta separada.

### Informações que o sistema precisa capturar

- carta do Dragon;
- carta do Tiger;
- resultado da rodada;
- número de decks;
- cartas vistas;
- payout do Tie;
- se empate faz Dragon/Tiger perder tudo ou metade, conforme regra da mesa.

### Regras básicas

- Cada lado recebe uma carta.
- A carta mais alta vence.
- Ás pode ser baixo ou alto dependendo da versão, mas normalmente Ás é menor em algumas variantes asiáticas e maior em outras. A regra da mesa precisa ser configurável.
- Tie costuma pagar alto, mas geralmente tem house edge maior.

### Análise possível

Diferente de dados, cartas removidas do shoe mudam a composição. Portanto, em teoria, o sistema pode rastrear cartas vistas e estimar:

- probabilidade Dragon;
- probabilidade Tiger;
- probabilidade Tie;
- EV por aposta;
- contagem por ranks restantes.

### Observação

Apesar de ser mais simples que blackjack, há pouca decisão e o cassino costuma manter vantagem nos payouts. Pode ser útil como analisador, mas tende a ser menos promissor que blackjack.

---

## 5. Baccarat / Punto Banco

### Tipo

Jogo de cartas com decisões automáticas.

### Estrutura geral

Apostas principais:

- Banker;
- Player;
- Tie.

O jogador não decide comprar ou parar. As regras de compra são automáticas.

### Informações que o sistema precisa capturar

- cartas do Player;
- cartas do Banker;
- resultado da rodada;
- cartas vistas;
- número de decks;
- payout de Banker;
- comissão do Banker;
- payout do Tie;
- side bets disponíveis.

### Regras básicas

- O objetivo é chegar mais perto de 9.
- 10, J, Q e K valem 0.
- Ás vale 1.
- 2 a 9 valem seu número.
- Se a soma passar de 9, usa-se apenas o último dígito.
- Natural 8 ou 9 encerra a rodada.
- Player compra terceira carta com 0 a 5 e para com 6 ou 7.
- Banker segue uma tabela fixa baseada no total do Banker e na terceira carta do Player.

### Análise possível

- Frequência de Banker, Player e Tie;
- EV baseado no payout;
- contagem das cartas restantes;
- análise de side bets;
- comparação entre resultado observado e esperado.

### Observação

A aposta Banker costuma ter a menor vantagem da casa, seguida da Player. Tie geralmente é ruim apesar do payout alto. Contagem em baccarat tende a ter impacto muito pequeno no jogo principal.

---

## 6. Roleta

### Tipo

Jogo de roda com resultados independentes.

### Informações que o sistema precisa capturar

- número sorteado;
- cor;
- dúzia;
- coluna;
- histórico;
- tipo da roleta: europeia, americana ou triple zero;
- regra la partage/en prison, se existir.

### Regras básicas

- Roleta europeia: números 0 a 36.
- Roleta americana: 0, 00 e 1 a 36.
- Apostas internas pagam mais, mas têm menor chance.
- Apostas externas pagam menos, mas têm maior chance.

### Análise possível

- histórico de números;
- frequência por cor, dúzia, coluna;
- mapa de calor;
- comparação com distribuição esperada;
- detecção de anomalias.

### Observação

Em roleta justa, cada giro é independente. Histórico não prevê o próximo número. Só haveria vantagem real se existisse viés físico/operacional ou regra promocional favorável.

---

# Parte 2 — Arquitetura do sistema

## Visão geral

Separar o sistema em três camadas:

```txt
captura de tela -> reconhecimento -> motor estatístico -> interface
```

### 1. Captura de tela

Responsável por ler regiões específicas da tela.

Tecnologias possíveis:

- Python;
- mss;
- pyautogui;
- OpenCV;
- OBS virtual camera, se necessário.

### 2. Reconhecimento

Responsável por transformar imagem em dados estruturados.

Exemplos:

```json
{
  "game": "blackjack",
  "dealer": ["A"],
  "seats": [
    { "seat": 1, "cards": ["8", "8"] }
  ]
}
```

ou:

```json
{
  "game": "sic_bo",
  "dice": [2, 5, 6],
  "sum": 13
}
```

### 3. Motor estatístico

Responsável por calcular:

- probabilidades;
- EV;
- desvio estatístico;
- recomendação;
- alertas.

### 4. Interface

Pode continuar sendo web, recebendo dados do Python por:

- HTTP local;
- WebSocket;
- arquivo JSON temporário;
- clipboard controlado;
- API local.

---

# Parte 3 — Python olhando para a tela

## É possível?

Sim. Para blackjack e jogos de dados, é viável criar um processo em Python que observa a tela e preenche o sistema automaticamente.

## Melhor abordagem

### Para cartas

Evitar OCR puro. Cartas são visuais e repetitivas. Melhor usar:

- recorte de regiões fixas;
- template matching com OpenCV;
- modelo de classificação simples;
- ou YOLO/Detectron se a interface variar muito.

### Para dados

Também é melhor usar visão computacional do que OCR:

- detectar faces dos dados;
- contar pontos;
- ou classificar imagem do dado de 1 a 6;
- em Bac Bo, separar área Player e área Banker.

## MVP recomendado

Começar com regiões fixas da tela.

```txt
1. usuário abre o cassino sempre no mesmo tamanho;
2. usuário calibra as áreas: dealer, assento 1, assento 2, resultado dos dados etc.;
3. Python tira screenshots dessas áreas;
4. OpenCV identifica cartas/dados;
5. Python envia JSON para o app;
6. app atualiza análise automaticamente.
```

## Bibliotecas sugeridas

```txt
mss              captura rápida da tela
opencv-python    processamento de imagem
template matching reconhecimento simples
fastapi          API local
uvicorn          servidor local
websockets       atualização em tempo real
pydantic         validação de payload
numpy            manipulação de arrays
```

## Estrutura sugerida

```txt
automation/
  capture.py
  calibrate.py
  recognizers/
    cards.py
    dice.py
    roulette.py
  api.py
  models.py
  templates/
    cards/
    dice/
  config/
    blackjack_regions.json
    dice_regions.json
```

---

# Parte 4 — Exemplo de fluxo Python -> Web

## Payload blackjack

```json
{
  "game": "blackjack",
  "round_id": "2026-06-26T21:30:00",
  "dealer": ["6"],
  "seats": [
    { "index": 0, "hands": [["8", "8"]] },
    { "index": 1, "hands": [["10", "6"]] }
  ],
  "seen": ["2", "K", "5"],
  "shoe_reset": false
}
```

## Payload Sic Bo

```json
{
  "game": "sic_bo",
  "round_id": "2026-06-26T21:31:00",
  "dice": [3, 4, 6],
  "sum": 13,
  "triple": false
}
```

## Payload Bac Bo

```json
{
  "game": "bac_bo",
  "round_id": "2026-06-26T21:32:00",
  "player_dice": [2, 6],
  "banker_dice": [3, 3],
  "player_sum": 8,
  "banker_sum": 6,
  "result": "player"
}
```

---

# Parte 5 — Roadmap de implementação

## Sprint 1 — Preparar o Blackjack

- Criar `GAME_CONFIG`.
- Corrigir textos.
- Exibir regras da mesa.
- Adicionar running count.
- Adicionar true count.
- Adicionar status do shoe.

## Sprint 2 — API local

- Criar endpoint local para receber estado da mesa.
- Permitir que o frontend atualize cartas por JSON.
- Criar validação de payload.

## Sprint 3 — Captura manual/calibração

- Criar script Python para screenshot.
- Criar tela de calibração de regiões.
- Salvar regiões em JSON.

## Sprint 4 — Reconhecimento de cartas

- Criar templates de cartas.
- Implementar reconhecimento por região.
- Enviar cartas reconhecidas para o app.
- Exibir confiança do reconhecimento.

## Sprint 5 — Módulo de dados

- Criar `web/dados.html`.
- Criar `web/dice-engine.js`.
- Criar `web/dice-app.js`.
- Adicionar histórico, frequência e EV.

## Sprint 6 — Reconhecimento de dados

- Detectar resultado dos dados por imagem.
- Enviar payload para o módulo de dados.
- Criar alerta de baixa confiança.

---

# Parte 6 — Limites e cuidados

## O que o sistema pode fazer bem

- Preencher cartas automaticamente.
- Manter histórico sem erro manual.
- Calcular EV em tempo real.
- Calcular contagem de cartas.
- Mostrar anomalias estatísticas.
- Ajudar na disciplina de banca.

## O que o sistema não deve prometer

- lucro garantido;
- previsão do próximo resultado em dados/roleta;
- vencer cassino ao vivo sem condição matemática real;
- apostar automaticamente sem supervisão.

## Risco prático

Cassinos ao vivo podem:

- embaralhar cedo;
- limitar tempo de decisão;
- trocar o shoe;
- bloquear padrões suspeitos;
- proibir ferramentas externas nos termos de uso.

---

# Conclusão

O melhor caminho é evoluir primeiro o blackjack, porque ele permite vantagem estatística em condições específicas por causa da composição do shoe.

O módulo de dados deve ser construído como analisador estatístico e histórico. Ele pode ser útil para produto, visualização e disciplina, mas não deve ser tratado como previsor.

A automação por Python é viável, principalmente usando captura de tela + OpenCV + regiões calibradas. O primeiro MVP deve apenas ler a tela e preencher o app local, sem clicar ou apostar automaticamente.

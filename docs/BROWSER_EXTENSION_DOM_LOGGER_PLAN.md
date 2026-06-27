# BROWSER_EXTENSION_DOM_LOGGER_PLAN.md

## Objetivo

Criar uma extensão de navegador em modo `logger/mapeador` para descobrir, registrar e validar quais informações do jogo ficam expostas no DOM durante uma sessão ao vivo.

A extensão deve ser usada antes de criar qualquer leitor definitivo. O objetivo é observar o que já está visível/representado no HTML da página e transformar isso em logs estruturados para o Codex mapear seletores, estados e eventos.

Este módulo deve funcionar como ferramenta de diagnóstico e integração, não como bot de apostas.

---

## Conclusão a partir do HTML analisado

O HTML coletado mostra que algumas cartas estão expostas no DOM através de atributos `data-role`.

Exemplos encontrados:

```html
<span data-role="card-S8"></span>
<span data-role="card-C5"></span>
<span data-role="card-H4"></span>
<span data-role="card-back-of-card"></span>
```

Interpretação:

```txt
S8 = 8 de espadas
C5 = 5 de paus
H4 = 4 de copas
card-back-of-card = carta virada/oculta
```

Também aparecem regiões úteis:

```txt
data-role="dealer-virtual-cards"
data-role="firstHand-cards"
data-role="firstHand-score"
data-role="secondHand-cards"
data-role="secondHand-score"
data-role="score"
data-role="scoreBox"
data-role="status-text"
data-role="result-titles"
data-role="bet-limits"
data-role="table-name"
data-role="game-time"
```

Isso indica que uma extensão pode conseguir capturar estado do jogo via DOM, com mais precisão do que OCR, pelo menos nesse layout.

---

## Estratégia recomendada

Implementar em 3 etapas:

1. Logger de DOM;
2. Parser/adaptador Evolution Blackjack;
3. Integração com o dashboard.

Não começar pela lógica final de EV dentro da extensão. A extensão deve apenas coletar e enviar dados. O engine estatístico continua no web app.

---

# Etapa 1 — Extensão Logger

## Objetivo

Mapear todos os elementos relevantes da página durante várias rodadas.

A extensão deve:

- observar mudanças no DOM;
- capturar atributos `data-role`;
- detectar cartas;
- detectar scores;
- detectar status da rodada;
- detectar nome da mesa;
- detectar limites/pagamentos quando visíveis;
- salvar snapshots em JSON;
- permitir exportar logs.

---

## Estrutura sugerida

```txt
extension/
  manifest.json
  content.js
  background.js
  popup.html
  popup.js
  logger.js
  adapters/
    evolution-blackjack.js
  exporters/
    json-exporter.js
  README.md
```

---

## Manifest V3 básico

```json
{
  "manifest_version": 3,
  "name": "Casino DOM Mapper",
  "version": "0.1.0",
  "description": "Mapeia DOM visível de mesas ao vivo para análise estatística local.",
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup.html"
  }
}
```

Observação: no futuro, restringir `host_permissions` para domínios específicos usados nos testes.

---

# Etapa 2 — Logger genérico

## Coletar todos os data-role

```js
function collectDataRoles() {
  return [...document.querySelectorAll('[data-role]')].map((element) => ({
    role: element.getAttribute('data-role'),
    text: element.textContent?.trim() || '',
    tag: element.tagName,
    className: element.className?.toString() || '',
  }));
}
```

## Coletar cartas

```js
function collectCards() {
  return [...document.querySelectorAll('[data-role^="card-"]')]
    .map((element) => element.getAttribute('data-role'))
    .filter(Boolean);
}
```

## Normalizar carta

```js
function parseCardRole(role) {
  if (role === 'card-back-of-card') {
    return { hidden: true };
  }

  const match = role.match(/^card-([CDHS])([A23456789]|10|J|Q|K)$/);
  if (!match) return null;

  const [, suit, rank] = match;
  return {
    hidden: false,
    suit,
    rank,
    normalizedRank: ['J', 'Q', 'K'].includes(rank) ? '10' : rank,
  };
}
```

Suit mapping:

```txt
C = clubs / paus
D = diamonds / ouros
H = hearts / copas
S = spades / espadas
```

---

# Etapa 3 — MutationObserver

A extensão deve observar mudanças para registrar o momento exato em que cartas aparecem/somem.

```js
const observer = new MutationObserver(() => {
  const snapshot = buildSnapshot();
  saveSnapshot(snapshot);
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['data-role', 'data-state', 'style', 'class'],
});
```

Para evitar excesso de logs, usar debounce:

```js
let timer = null;
function scheduleSnapshot() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    saveSnapshot(buildSnapshot());
  }, 250);
}
```

---

# Etapa 4 — Snapshot estruturado

Formato recomendado:

```json
{
  "timestamp": "2026-06-26T22:10:00.000Z",
  "url": "https://...",
  "title": "Infinite Blackjack",
  "tableName": "Infinite Blackjack",
  "statusText": "PRÓXIMO JOGO EM BREVE",
  "cardsRaw": [
    "card-S8",
    "card-C5",
    "card-H4",
    "card-back-of-card"
  ],
  "cardsParsed": [
    { "hidden": false, "suit": "S", "rank": "8", "normalizedRank": "8" },
    { "hidden": false, "suit": "C", "rank": "5", "normalizedRank": "5" },
    { "hidden": false, "suit": "H", "rank": "4", "normalizedRank": "4" },
    { "hidden": true }
  ],
  "scores": {
    "firstHand": "9",
    "secondHand": ""
  },
  "roles": []
}
```

---

# Etapa 5 — Adaptador Evolution Blackjack

Criar `extension/adapters/evolution-blackjack.js`.

Responsabilidades:

- reconhecer se a página é blackjack da Evolution;
- mapear dealer;
- mapear primeira mão;
- mapear segunda mão;
- mapear carta oculta;
- mapear scores;
- mapear status da rodada;
- gerar payload compatível com o dashboard.

## Seletores iniciais baseados no HTML coletado

Dealer:

```js
'[data-role="dealer-virtual-cards"] [data-role^="card-"]'
```

Primeira mão:

```js
'[data-role="firstHand-cards"] [data-role^="card-"]'
```

Segunda mão:

```js
'[data-role="secondHand-cards"] [data-role^="card-"]'
```

Score primeira mão:

```js
'[data-role="firstHand-score"] [data-role="scoreBox"]'
```

Score segunda mão:

```js
'[data-role="secondHand-score"] [data-role="scoreBox"]'
```

Status:

```js
'[data-role="status-text"]'
```

Nome da mesa:

```js
'[data-role="table-name"]'
```

Limites/pagamentos:

```js
'[data-role="bet-limits"]'
```

---

# Etapa 6 — Payload para o dashboard

A extensão deve converter o DOM para um formato neutro:

```json
{
  "source": "browser_extension_dom",
  "provider": "evolution",
  "game": "blackjack",
  "tableName": "Infinite Blackjack",
  "status": "PRÓXIMO JOGO EM BREVE",
  "dealer": {
    "cards": ["8"],
    "rawCards": ["S8"],
    "hiddenCards": 1
  },
  "seats": [
    {
      "index": 0,
      "hands": [
        {
          "cards": ["5", "4"],
          "rawCards": ["C5", "H4"],
          "score": 9
        }
      ]
    }
  ],
  "confidence": 1,
  "requiresConfirmation": false
}
```

---

# Etapa 7 — Exportação de logs

O popup da extensão deve ter botões:

```txt
Iniciar log
Parar log
Baixar JSON
Limpar logs
Enviar para localhost
```

O logger deve salvar snapshots em `chrome.storage.local` ou em memória enquanto a aba está aberta.

Formato de exportação:

```json
{
  "version": "0.1.0",
  "createdAt": "2026-06-26T22:20:00.000Z",
  "snapshots": []
}
```

---

# Etapa 8 — Envio para API local

Depois que o mapeamento estiver validado, adicionar envio opcional para:

```txt
POST http://localhost:8000/state/blackjack
```

A extensão não deve falhar se a API local estiver offline.

---

# Ordem de implementação para Codex

1. Criar pasta `extension/`.
2. Criar `manifest.json`.
3. Criar `content.js` com `collectDataRoles`, `collectCards`, `parseCardRole` e `buildSnapshot`.
4. Criar `MutationObserver` com debounce.
5. Criar `popup.html` e `popup.js` com botões de iniciar/parar/exportar.
6. Criar `adapters/evolution-blackjack.js` com seletores específicos.
7. Criar exportação JSON.
8. Testar manualmente com HTML salvo antes de usar em página real.
9. Só depois integrar com API local/dashboard.

---

# Critérios de aceite

- A extensão consegue listar todos os `data-role` da página.
- A extensão detecta `card-S8`, `card-C5`, `card-H4` e `card-back-of-card`.
- A extensão converte cartas para formato estruturado.
- A extensão exporta snapshots em JSON.
- A extensão não clica em nada.
- A extensão não aposta.
- A extensão não lê credenciais.
- A extensão funciona mesmo se nenhuma carta for encontrada.
- O logger deve ser desligável pelo popup.

---

# Observações importantes

A estrutura DOM pode mudar entre provedores, mesas ou versões do frontend. Por isso o projeto deve ter adaptadores por provedor/jogo.

Exemplo futuro:

```txt
adapters/
  evolution-blackjack.js
  evolution-bacbo.js
  pragmatic-blackjack.js
  pragmatic-baccarat.js
```

Se o DOM deixar de expor cartas, o plano B é captura visual da aba ou Python/OpenCV.

---

# Próxima tarefa sugerida ao Codex

Implementar apenas a extensão logger, sem integrar ainda ao engine:

```txt
Criar extension/ com Manifest V3, content script, popup e exportação JSON.
O content script deve detectar todos os elementos [data-role], todas as cartas [data-role^="card-"], normalizar cartas, observar mudanças via MutationObserver e permitir exportar snapshots.
```

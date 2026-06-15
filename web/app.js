const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const actionLabels = {
  stand: "Parar",
  hit: "Pedir",
  double: "Dobrar",
  split: "Dividir",
};

function createHand(cards = [], options = {}) {
  return {
    cards: [...cards],
    locked: Boolean(options.locked),
    splitAces: Boolean(options.splitAces),
    doubled: Boolean(options.doubled),
    waitingDoubleCard: Boolean(options.waitingDoubleCard),
  };
}

function createSeat(index) {
  return {
    name: `Assento ${index + 1}`,
    hands: [createHand()],
    activeHand: 0,
  };
}

const state = {
  dealer: [],
  seats: Array.from({ length: 7 }, (_, index) => createSeat(index)),
  seatCount: 7,
  archive: [],
  active: { type: "seat", index: 0 },
  history: [],
};

const elements = {
  dealerTarget: document.querySelector("#dealerTarget"),
  dealerCards: document.querySelector("#dealerCards"),
  dealerStatus: document.querySelector("#dealerStatus"),
  seats: document.querySelector("#seats"),
  rankPad: document.querySelector("#rankPad"),
  activeTargetLabel: document.querySelector("#activeTargetLabel"),
  handTotal: document.querySelector("#handTotal"),
  recommendation: document.querySelector("#recommendation"),
  bustMetric: document.querySelector("#bustMetric"),
  insuranceMetric: document.querySelector("#insuranceMetric"),
  actionsList: document.querySelector("#actionsList"),
  dealerOutcomes: document.querySelector("#dealerOutcomes"),
  shoeRemaining: document.querySelector("#shoeRemaining"),
  shoeSeen: document.querySelector("#shoeSeen"),
  seatCountSelect: document.querySelector("#seatCountSelect"),
  splitButton: document.querySelector("#splitButton"),
  doubleButton: document.querySelector("#doubleButton"),
  undoButton: document.querySelector("#undoButton"),
  newRoundButton: document.querySelector("#newRoundButton"),
  resetShoeButton: document.querySelector("#resetShoeButton"),
};

function normalizeRank(rank) {
  return BlackjackEngine.normalizeCard(rank);
}

function cardValue(rank) {
  const normalized = normalizeRank(rank);
  return normalized === "A" ? 11 : Number(normalized);
}

function handValue(cards) {
  return BlackjackEngine.handValue(cards);
}

function allTableCards() {
  return [...state.dealer, ...visibleSeats().flatMap((seat) => seat.hands.flatMap((hand) => hand.cards))];
}

function visibleSeats() {
  return state.seats.slice(0, state.seatCount);
}

function selectedSeat() {
  return state.active.type === "seat" ? state.seats[state.active.index] : null;
}

function selectedHand() {
  const seat = selectedSeat();
  return seat ? seat.hands[seat.activeHand] : null;
}

function activeCards() {
  if (state.active.type === "dealer") {
    return state.dealer;
  }
  return selectedHand()?.cards || [];
}

function activeLabel() {
  if (state.active.type === "dealer") {
    return "Crupie";
  }
  const seat = state.seats[state.active.index];
  return seat.hands.length > 1 ? `${seat.name} - Mao ${seat.activeHand + 1}` : seat.name;
}

function cardsForSeen() {
  const activeSeat = selectedSeat();
  const activeHand = selectedHand();
  const otherSeats = visibleSeats()
    .filter((seat) => seat !== activeSeat)
    .flatMap((seat) => seat.hands.flatMap((hand) => hand.cards))
    .map(normalizeRank);
  const siblingHands = activeSeat
    ? activeSeat.hands.filter((hand) => hand !== activeHand).flatMap((hand) => hand.cards).map(normalizeRank)
    : [];
  return [...state.archive.map(normalizeRank), ...state.dealer.slice(1).map(normalizeRank), ...otherSeats, ...siblingHands];
}

function addCard(rank) {
  if (state.active.type === "dealer") {
    state.dealer.push(rank);
    state.history.push({ kind: "card", target: { ...state.active }, rank });
    render();
    requestAnalysis();
    return;
  }

  const hand = selectedHand();
  if (!hand || hand.locked) {
    return;
  }

  hand.cards.push(rank);
  state.history.push({ kind: "card", target: { ...state.active, handIndex: selectedSeat().activeHand }, rank });

  if (hand.waitingDoubleCard) {
    hand.waitingDoubleCard = false;
    hand.locked = true;
    activateNextOpenHand();
  }

  if (hand.splitAces && hand.cards.length >= 2) {
    hand.locked = true;
    activateNextOpenHand();
  }

  render();
  requestAnalysis();
}

function undo() {
  const item = state.history.pop();
  if (!item) return;

  if (item.kind === "split") {
    const seat = state.seats[item.seatIndex];
    seat.hands = item.previousHands.map(copyHand);
    seat.activeHand = item.previousActiveHand;
    state.active = { type: "seat", index: item.seatIndex };
    render();
    requestAnalysis();
    return;
  }

  if (item.kind === "double") {
    const seat = state.seats[item.target.index];
    const hand = seat.hands[item.target.handIndex ?? seat.activeHand];
    seat.activeHand = item.target.handIndex ?? seat.activeHand;
    hand.locked = item.previousHandState.locked;
    hand.doubled = item.previousHandState.doubled;
    hand.waitingDoubleCard = item.previousHandState.waitingDoubleCard;
    state.active = { type: "seat", index: item.target.index };
    render();
    requestAnalysis();
    return;
  }

  if (item.target.type === "dealer") {
    state.dealer.pop();
  } else {
    const seat = state.seats[item.target.index];
    const hand = seat.hands[item.target.handIndex ?? seat.activeHand];
    hand.cards.pop();
    if (item.previousHandState) {
      hand.locked = item.previousHandState.locked;
      hand.doubled = item.previousHandState.doubled;
      hand.waitingDoubleCard = item.previousHandState.waitingDoubleCard;
    }
    if (hand.splitAces && hand.cards.length < 2) {
      hand.locked = false;
    }
    state.active = { type: "seat", index: item.target.index };
    seat.activeHand = item.target.handIndex ?? seat.activeHand;
  }

  render();
  requestAnalysis();
}

function newRound() {
  state.archive.push(...allTableCards());
  state.dealer = [];
  state.seats.forEach((seat) => {
    seat.hands = [createHand()];
    seat.activeHand = 0;
  });
  state.history = [];
  render();
  requestAnalysis();
}

function resetShoe() {
  state.archive = [];
  state.dealer = [];
  state.seats.forEach((seat) => {
    seat.hands = [createHand()];
    seat.activeHand = 0;
  });
  state.history = [];
  render();
  requestAnalysis();
}

function setSeatCount(count) {
  state.seatCount = count;
  if (state.active.type === "seat" && state.active.index >= count) {
    state.active = { type: "seat", index: 0 };
  }
  state.history = state.history.filter((item) => item.target.type !== "seat" || item.target.index < count);
  render();
  requestAnalysis();
}

function selectTarget(type, index = 0) {
  state.active = { type, index };
  render();
  requestAnalysis();
}

function selectHand(seatIndex, handIndex) {
  state.seats[seatIndex].activeHand = handIndex;
  state.active = { type: "seat", index: seatIndex };
  render();
  requestAnalysis();
}

function copyHand(hand) {
  return createHand(hand.cards, {
    locked: hand.locked,
    splitAces: hand.splitAces,
    doubled: hand.doubled,
    waitingDoubleCard: hand.waitingDoubleCard,
  });
}

function activateNextOpenHand() {
  const seat = selectedSeat();
  if (!seat) return;
  const nextIndex = seat.hands.findIndex((hand, index) => index !== seat.activeHand && !hand.locked);
  if (nextIndex >= 0) {
    seat.activeHand = nextIndex;
  }
}

function canApplySplit() {
  const seat = selectedSeat();
  const hand = selectedHand();
  if (!seat || !hand || seat.hands.length > 1 || hand.cards.length !== 2) {
    return false;
  }
  return normalizeRank(hand.cards[0]) === normalizeRank(hand.cards[1]);
}

function canApplyDouble() {
  const hand = selectedHand();
  if (!hand || hand.locked || hand.waitingDoubleCard || hand.doubled) {
    return false;
  }
  return hand.cards.length === 2;
}

function applySplit() {
  const seat = selectedSeat();
  const hand = selectedHand();
  if (!seat || !hand || !canApplySplit()) {
    return;
  }

  const previousHands = seat.hands.map(copyHand);
  const previousActiveHand = seat.activeHand;
  const splitAces = normalizeRank(hand.cards[0]) === "A";
  seat.hands = [
    createHand([hand.cards[0]], { splitAces }),
    createHand([hand.cards[1]], { splitAces }),
  ];
  seat.activeHand = 0;
  state.history.push({
    kind: "split",
    seatIndex: state.active.index,
    previousHands,
    previousActiveHand,
  });

  render();
  requestAnalysis();
}

function applyDouble() {
  const seat = selectedSeat();
  const hand = selectedHand();
  if (!seat || !hand || !canApplyDouble()) {
    return;
  }

  const previousHandState = copyHand(hand);
  hand.doubled = true;
  hand.waitingDoubleCard = true;
  state.history.push({
    kind: "double",
    target: { ...state.active, handIndex: seat.activeHand },
    previousHandState,
  });

  render();
  requestAnalysis();
}

function renderCard(rank) {
  const card = document.createElement("span");
  card.className = `card ${normalizeRank(rank) === "10" ? "ten" : ""}`;
  card.textContent = rank;
  return card;
}

function renderCards(container, cards) {
  container.replaceChildren(...cards.map(renderCard));
}

function renderRankPad() {
  elements.rankPad.replaceChildren(
    ...ranks.map((rank) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `rank-button ${rank === "A" ? "ace" : ""} ${["J", "Q", "K"].includes(rank) ? "face" : ""}`;
      button.textContent = rank;
      button.addEventListener("click", () => addCard(rank));
      return button;
    }),
  );
}

function renderSeats() {
  elements.seats.style.setProperty("--seat-count", String(state.seatCount));
  const seatButtons = visibleSeats().map((seat, index) => {
    const activeHand = seat.hands[seat.activeHand];
    const value = handValue(activeHand.cards);
    const button = document.createElement("div");
    button.dataset.seat = String(index);
    button.className = `seat-button target-zone ${
      state.active.type === "seat" && state.active.index === index ? "active" : ""
    }`;
    button.setAttribute("role", "button");
    button.tabIndex = 0;
    button.addEventListener("click", () => selectTarget("seat", index));

    const meta = document.createElement("span");
    meta.className = "seat-meta";
    meta.innerHTML = `<strong>${seat.name}</strong><span class="seat-total">${activeHand.cards.length ? value.total : "--"}</span>`;

    const hands = document.createElement("div");
    hands.className = "seat-hands";
    seat.hands.forEach((hand, handIndex) => {
      const handButton = document.createElement("button");
      const handValueResult = handValue(hand.cards);
      handButton.type = "button";
      handButton.className = `hand-button ${
        state.active.type === "seat" && state.active.index === index && seat.activeHand === handIndex ? "active" : ""
      } ${hand.locked ? "locked" : ""} ${hand.doubled ? "doubled" : ""}`;
      handButton.addEventListener("click", (event) => {
        event.stopPropagation();
        selectHand(index, handIndex);
      });

      const label = document.createElement("span");
      label.className = "hand-label";
      label.textContent = seat.hands.length > 1 ? `Mao ${handIndex + 1}` : "Mao";

      const total = document.createElement("span");
      total.className = "hand-total";
      total.textContent = hand.cards.length ? `${handValueResult.total}${handValueResult.soft ? "s" : ""}` : "--";

      const stateLabel = document.createElement("span");
      stateLabel.className = "hand-state";
      stateLabel.textContent = hand.waitingDoubleCard ? "Dobrar: falta 1 carta" : hand.doubled ? "Dobrado" : "";

      const row = document.createElement("span");
      row.className = "card-row";
      renderCards(row, hand.cards);

      handButton.append(label, total, stateLabel, row);
      hands.append(handButton);
    });

    button.append(meta, hands);
    return button;
  });

  elements.seats.replaceChildren(...seatButtons);
}

function renderDealer() {
  elements.dealerTarget.classList.toggle("active", state.active.type === "dealer");
  renderCards(elements.dealerCards, state.dealer);
  elements.dealerStatus.textContent = state.dealer.length ? `Carta aberta: ${state.dealer[0]}` : "Sem carta";
}

function renderLocalTotals() {
  const cards = activeCards();
  const value = handValue(cards);
  elements.activeTargetLabel.textContent = activeLabel();
  elements.handTotal.textContent = cards.length ? `${value.total}${value.soft ? "s" : ""}` : "--";

  const seen = state.archive.length + allTableCards().length;
  elements.shoeRemaining.textContent = String(Math.max(0, 416 - seen));
  elements.shoeSeen.textContent = `${seen} vistas`;
  renderActionControls();
}

function render() {
  elements.seatCountSelect.value = String(state.seatCount);
  renderDealer();
  renderSeats();
  renderLocalTotals();
}

function renderActionControls() {
  const canSplit = canApplySplit();
  const canDouble = canApplyDouble();
  elements.splitButton.disabled = !canSplit;
  elements.splitButton.textContent = canSplit ? "Aplicar Dividir" : "Dividir indisponivel";
  elements.doubleButton.disabled = !canDouble;
  elements.doubleButton.textContent = canDouble ? "Aplicar Dobrar" : "Dobrar indisponivel";
}

function percent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function ev(value) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(4)}`;
}

function setWaiting(message) {
  elements.recommendation.className = "recommendation waiting";
  elements.recommendation.textContent = message;
  elements.bustMetric.textContent = "--";
  elements.insuranceMetric.textContent = "--";
  elements.actionsList.textContent = "";
  elements.dealerOutcomes.textContent = "";
  renderActionControls();
}

function renderAnalysis(payload) {
  if (!payload.ready) {
    setWaiting(payload.message);
    if (payload.remaining_cards !== undefined) {
      elements.shoeRemaining.textContent = String(Math.max(0, payload.remaining_cards));
    }
    return;
  }

  const analysis = payload.analysis;
  const hand = selectedHand();
  const recommendation = actionLabels[analysis.recommendation] || analysis.recommendation;
  elements.shoeRemaining.textContent = String(analysis.remaining_cards);
  elements.recommendation.className = "recommendation ready";
  elements.recommendation.innerHTML = hand?.locked
    ? `Mao travada<span class="action-name">${hand.doubled ? "Dobrado" : recommendation}</span>`
    : `Melhor decisao<span class="action-name">${recommendation}</span>`;
  elements.bustMetric.textContent = percent(analysis.bust_if_hit);
  elements.insuranceMetric.textContent =
    analysis.insurance_ev === null
      ? "--"
      : `${ev(analysis.insurance_ev)} ${analysis.insurance_ev > 0 ? "ok" : "nao"}`;

  const actionRows = Object.entries(analysis.action_ev)
    .sort((a, b) => b[1] - a[1])
    .map(([action, value]) => {
      const row = document.createElement("div");
      row.className = `row-line ${action === analysis.recommendation ? "best" : ""}`;
      row.innerHTML = `<span>${actionLabels[action] || action}</span><strong>${ev(value)}</strong>`;
      return row;
    });
  elements.actionsList.replaceChildren(...actionRows);

  const order = ["blackjack", "17", "18", "19", "20", "21", "bust"];
  const outcomeRows = order
    .filter((key) => key in analysis.dealer_outcomes)
    .map((key) => {
      const row = document.createElement("div");
      row.className = "row-line";
      row.innerHTML = `<span>${key}</span><strong>${percent(analysis.dealer_outcomes[key])}</strong>`;
      return row;
    });
  elements.dealerOutcomes.replaceChildren(...outcomeRows);
  renderActionControls();
}

function requestAnalysis() {
  const seat = selectedSeat();
  if (!seat) {
    setWaiting("Selecione um assento para analisar.");
    return;
  }

  const payload = {
    hand: selectedHand().cards.map(normalizeRank),
    dealer: state.dealer.map(normalizeRank),
    seen: cardsForSeen(),
    decks: 8,
  };

  try {
    renderAnalysis(BlackjackEngine.analyzeTable(payload));
  } catch (error) {
    setWaiting(`Nao foi possivel analisar esta mesa: ${error.message}`);
  }
}

elements.dealerTarget.addEventListener("click", () => selectTarget("dealer"));
elements.seatCountSelect.addEventListener("change", (event) => setSeatCount(Number(event.target.value)));
elements.splitButton.addEventListener("click", applySplit);
elements.doubleButton.addEventListener("click", applyDouble);
elements.undoButton.addEventListener("click", undo);
elements.newRoundButton.addEventListener("click", newRound);
elements.resetShoeButton.addEventListener("click", resetShoe);

renderRankPad();
render();
requestAnalysis();

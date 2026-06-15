(function (root) {
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
  const rankIndex = Object.fromEntries(ranks.map((rank, index) => [rank, index]));
  const tenRanks = new Set(["10", "T", "J", "Q", "K"]);
  const cardValues = {
    A: 11,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
    10: 10,
  };

  const dealerDistributionCache = new Map();
  const dealerPlayCache = new Map();
  const standCache = new Map();
  const optimalAfterHitCache = new Map();
  const hitCache = new Map();

  function normalizeCard(card) {
    const value = String(card).trim().toUpperCase();
    if (!value) throw new Error("Carta vazia.");
    if (["A", "AS", "ACE"].includes(value)) return "A";
    if (tenRanks.has(value)) return "10";
    if (rankIndex[value] !== undefined) return value;
    throw new Error(`Carta invalida: ${card}`);
  }

  function buildShoe(decks = 8) {
    if (decks <= 0) throw new Error("A quantidade de baralhos precisa ser positiva.");
    const counts = Array(ranks.length).fill(4 * decks);
    counts[rankIndex["10"]] = 16 * decks;
    return counts;
  }

  function totalCards(shoe) {
    return shoe.reduce((total, count) => total + count, 0);
  }

  function shoeKey(shoe) {
    return shoe.join(",");
  }

  function removeCards(shoe, cards) {
    const counts = [...shoe];
    for (const card of cards) {
      const rank = normalizeCard(card);
      const index = rankIndex[rank];
      if (counts[index] <= 0) {
        throw new Error(`Nao ha cartas restantes suficientes para remover ${rank}.`);
      }
      counts[index] -= 1;
    }
    return counts;
  }

  function drawCard(shoe, rank) {
    const index = rankIndex[normalizeCard(rank)];
    const counts = [...shoe];
    if (counts[index] <= 0) {
      throw new Error(`Nao ha cartas restantes suficientes para comprar ${rank}.`);
    }
    counts[index] -= 1;
    return counts;
  }

  function drawProbabilities(shoe) {
    const total = totalCards(shoe);
    if (total === 0) return [];
    return ranks
      .map((rank, index) => [rank, shoe[index] / total])
      .filter(([, probability]) => probability > 0);
  }

  function addRankToState(total, softAces, rank) {
    if (rank === "A") {
      total += 11;
      softAces += 1;
    } else {
      total += cardValues[rank];
    }

    while (total > 21 && softAces > 0) {
      total -= 10;
      softAces -= 1;
    }

    return [total, softAces];
  }

  function stateFromCards(cards) {
    let total = 0;
    let softAces = 0;
    for (const card of cards) {
      [total, softAces] = addRankToState(total, softAces, normalizeCard(card));
    }
    return [total, softAces];
  }

  function handValue(cards) {
    const [total, softAces] = stateFromCards(cards);
    return {
      total,
      soft: softAces > 0 && total <= 21,
      blackjack: cards.length === 2 && total === 21,
      bust: total > 21,
    };
  }

  function canSplit(hand) {
    return hand.length === 2 && normalizeCard(hand[0]) === normalizeCard(hand[1]);
  }

  function dealerDistribution(dealerUpcard, shoe) {
    dealerUpcard = normalizeCard(dealerUpcard);
    const key = `${dealerUpcard}|${shoeKey(shoe)}`;
    if (dealerDistributionCache.has(key)) return dealerDistributionCache.get(key);

    const outcomes = {};
    for (const [hiddenCard, probability] of drawProbabilities(shoe)) {
      const nextShoe = drawCard(shoe, hiddenCard);
      const [total, softAces] = stateFromCards([dealerUpcard, hiddenCard]);

      if (total === 21) {
        outcomes.blackjack = (outcomes.blackjack || 0) + probability;
        continue;
      }

      for (const [outcome, childProbability] of Object.entries(dealerPlay(total, softAces, nextShoe))) {
        outcomes[outcome] = (outcomes[outcome] || 0) + probability * childProbability;
      }
    }

    dealerDistributionCache.set(key, outcomes);
    return outcomes;
  }

  function dealerPlay(total, softAces, shoe) {
    const key = `${total}|${softAces}|${shoeKey(shoe)}`;
    if (dealerPlayCache.has(key)) return dealerPlayCache.get(key);

    if (total > 21) return { bust: 1 };
    if (total >= 17) return { [String(total)]: 1 };

    const outcomes = {};
    for (const [rank, probability] of drawProbabilities(shoe)) {
      const nextShoe = drawCard(shoe, rank);
      const [nextTotal, nextSoftAces] = addRankToState(total, softAces, rank);
      for (const [outcome, childProbability] of Object.entries(dealerPlay(nextTotal, nextSoftAces, nextShoe))) {
        outcomes[outcome] = (outcomes[outcome] || 0) + probability * childProbability;
      }
    }

    dealerPlayCache.set(key, outcomes);
    return outcomes;
  }

  function standEvByTotal(playerTotal, playerBlackjack, dealerUpcard, shoe) {
    const key = `${playerTotal}|${playerBlackjack ? 1 : 0}|${normalizeCard(dealerUpcard)}|${shoeKey(shoe)}`;
    if (standCache.has(key)) return standCache.get(key);

    if (playerTotal > 21) return -1;

    let expectedValue = 0;
    for (const [outcome, probability] of Object.entries(dealerDistribution(dealerUpcard, shoe))) {
      if (outcome === "bust") {
        expectedValue += probability;
      } else if (outcome === "blackjack") {
        expectedValue += probability * (playerBlackjack ? 0 : -1);
      } else {
        const dealerTotal = Number(outcome);
        if (playerBlackjack) expectedValue += probability * 1.5;
        else if (playerTotal > dealerTotal) expectedValue += probability;
        else if (playerTotal < dealerTotal) expectedValue -= probability;
      }
    }

    standCache.set(key, expectedValue);
    return expectedValue;
  }

  function standEv(hand, dealerUpcard, shoe, options = {}) {
    const value = handValue(hand);
    const playerBlackjack = options.blackjack ?? value.blackjack;
    return standEvByTotal(value.total, playerBlackjack, dealerUpcard, shoe);
  }

  function optimalEvAfterHit(playerTotal, softAces, handSize, dealerUpcard, shoe) {
    if (playerTotal > 21) return -1;
    const key = `${playerTotal}|${softAces}|${handSize}|${normalizeCard(dealerUpcard)}|${shoeKey(shoe)}`;
    if (optimalAfterHitCache.has(key)) return optimalAfterHitCache.get(key);

    const stand = standEvByTotal(playerTotal, false, dealerUpcard, shoe);
    const hit = hitEvFromState(playerTotal, softAces, handSize, dealerUpcard, shoe);
    const expectedValue = Math.max(stand, hit);
    optimalAfterHitCache.set(key, expectedValue);
    return expectedValue;
  }

  function hitEvFromState(playerTotal, softAces, handSize, dealerUpcard, shoe) {
    const key = `${playerTotal}|${softAces}|${handSize}|${normalizeCard(dealerUpcard)}|${shoeKey(shoe)}`;
    if (hitCache.has(key)) return hitCache.get(key);

    let expectedValue = 0;
    for (const [rank, probability] of drawProbabilities(shoe)) {
      const nextShoe = drawCard(shoe, rank);
      const [nextTotal, nextSoftAces] = addRankToState(playerTotal, softAces, rank);
      const childEv =
        nextTotal > 21 ? -1 : optimalEvAfterHit(nextTotal, nextSoftAces, handSize + 1, dealerUpcard, nextShoe);
      expectedValue += probability * childEv;
    }

    hitCache.set(key, expectedValue);
    return expectedValue;
  }

  function hitEv(hand, dealerUpcard, shoe) {
    const [total, softAces] = stateFromCards(hand);
    return hitEvFromState(total, softAces, hand.length, dealerUpcard, shoe);
  }

  function doubleEv(hand, dealerUpcard, shoe) {
    let expectedValue = 0;
    for (const [rank, probability] of drawProbabilities(shoe)) {
      const nextShoe = drawCard(shoe, rank);
      const nextHand = [...hand, rank];
      const value = handValue(nextHand);
      const childEv = value.bust ? -2 : 2 * standEv(nextHand, dealerUpcard, nextShoe, { blackjack: false });
      expectedValue += probability * childEv;
    }
    return expectedValue;
  }

  function splitEv(hand, dealerUpcard, shoe) {
    if (!canSplit(hand)) throw new Error("A mao nao pode ser dividida.");

    const splitRank = normalizeCard(hand[0]);
    let oneHandEv = 0;
    for (const [rank, probability] of drawProbabilities(shoe)) {
      const nextShoe = drawCard(shoe, rank);
      const splitHand = [splitRank, rank];
      const value = handValue(splitHand);
      let childEv;

      if (splitRank === "A") {
        childEv = standEv(splitHand, dealerUpcard, nextShoe, { blackjack: false });
      } else if (value.bust) {
        childEv = -1;
      } else {
        childEv = Math.max(
          standEv(splitHand, dealerUpcard, nextShoe, { blackjack: false }),
          hitEv(splitHand, dealerUpcard, nextShoe),
          doubleEv(splitHand, dealerUpcard, nextShoe),
        );
      }

      oneHandEv += probability * childEv;
    }

    return 2 * oneHandEv;
  }

  function bustProbabilityIfHit(hand, shoe) {
    const [total, softAces] = stateFromCards(hand);
    let probability = 0;
    for (const [rank, rankProbability] of drawProbabilities(shoe)) {
      const [nextTotal] = addRankToState(total, softAces, rank);
      if (nextTotal > 21) probability += rankProbability;
    }
    return probability;
  }

  function insuranceEv(dealerUpcard, shoe) {
    if (normalizeCard(dealerUpcard) !== "A") return null;
    const total = totalCards(shoe);
    if (total === 0) return null;
    const tenProbability = shoe[rankIndex["10"]] / total;
    return 1.5 * tenProbability - 0.5;
  }

  function actionValues(hand, dealerUpcard, shoe) {
    const value = handValue(hand);
    if (value.blackjack) return { stand: standEv(hand, dealerUpcard, shoe) };

    const actions = {
      stand: standEv(hand, dealerUpcard, shoe),
      hit: hitEv(hand, dealerUpcard, shoe),
    };
    if (hand.length === 2) actions.double = doubleEv(hand, dealerUpcard, shoe);
    if (canSplit(hand)) actions.split = splitEv(hand, dealerUpcard, shoe);
    return actions;
  }

  function analyzeHand(playerCards, dealerUpcard, options = {}) {
    const hand = playerCards.map(normalizeCard);
    const upcard = normalizeCard(dealerUpcard);
    const seenCards = options.seenCards || [];
    let shoe = buildShoe(options.decks || 8);
    shoe = removeCards(shoe, [...hand, upcard, ...seenCards]);

    const value = handValue(hand);
    const actions = actionValues(hand, upcard, shoe);
    const recommendation = Object.entries(actions).sort((a, b) => b[1] - a[1])[0][0];

    return {
      hand,
      dealer_upcard: upcard,
      remaining_cards: totalCards(shoe),
      hand_value: value,
      bust_if_hit: bustProbabilityIfHit(hand, shoe),
      dealer_outcomes: dealerDistribution(upcard, shoe),
      action_ev: actions,
      insurance_ev: insuranceEv(upcard, shoe),
      recommendation,
    };
  }

  function analyzeTable(payload) {
    const hand = (payload.hand || []).map(normalizeCard);
    const dealer = (payload.dealer || []).map(normalizeCard);
    const seen = (payload.seen || []).map(normalizeCard);
    const decks = payload.decks || 8;

    if (!dealer.length) {
      return {
        ready: false,
        message: "Informe a carta aberta do crupie.",
        remaining_cards: totalCards(buildShoe(decks)) - seen.length - hand.length,
      };
    }

    if (hand.length < 2) {
      return {
        ready: false,
        message: "Selecione pelo menos duas cartas para o assento ativo.",
        remaining_cards: totalCards(buildShoe(decks)) - seen.length - hand.length - dealer.length,
      };
    }

    return {
      ready: true,
      analysis: analyzeHand(hand, dealer[0], {
        seenCards: [...seen, ...dealer.slice(1)],
        decks,
      }),
    };
  }

  const api = {
    ranks,
    normalizeCard,
    buildShoe,
    removeCards,
    totalCards,
    handValue,
    canSplit,
    insuranceEv,
    analyzeHand,
    analyzeTable,
  };

  root.BlackjackEngine = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);

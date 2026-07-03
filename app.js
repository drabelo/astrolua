const SIGNS = [
  { sign: "Capricorn", from: [12, 22], to: [1, 19], element: "Earth", modality: "Cardinal" },
  { sign: "Aquarius", from: [1, 20], to: [2, 18], element: "Air", modality: "Fixed" },
  { sign: "Pisces", from: [2, 19], to: [3, 20], element: "Water", modality: "Mutable" },
  { sign: "Aries", from: [3, 21], to: [4, 19], element: "Fire", modality: "Cardinal" },
  { sign: "Taurus", from: [4, 20], to: [5, 20], element: "Earth", modality: "Fixed" },
  { sign: "Gemini", from: [5, 21], to: [6, 20], element: "Air", modality: "Mutable" },
  { sign: "Cancer", from: [6, 21], to: [7, 22], element: "Water", modality: "Cardinal" },
  { sign: "Leo", from: [7, 23], to: [8, 22], element: "Fire", modality: "Fixed" },
  { sign: "Virgo", from: [8, 23], to: [9, 22], element: "Earth", modality: "Mutable" },
  { sign: "Libra", from: [9, 23], to: [10, 22], element: "Air", modality: "Cardinal" },
  { sign: "Scorpio", from: [10, 23], to: [11, 21], element: "Water", modality: "Fixed" },
  { sign: "Sagittarius", from: [11, 22], to: [12, 21], element: "Fire", modality: "Mutable" },
];

const PAIR_SCORES = {
  "Taurus|Virgo": 93,
  "Virgo|Taurus": 93,
};

const ELEMENT_SCORES = {
  "Fire|Air": 86,
  "Air|Fire": 86,
  "Earth|Water": 89,
  "Water|Earth": 89,
  "Earth|Earth": 84,
  "Water|Water": 83,
  "Air|Air": 81,
  "Fire|Fire": 80,
  "Fire|Water": 63,
  "Water|Fire": 63,
  "Earth|Air": 67,
  "Air|Earth": 67,
  "Earth|Fire": 65,
  "Fire|Earth": 65,
  "Air|Water": 70,
  "Water|Air": 70,
};

const MODALITY_SCORES = {
  "Cardinal|Cardinal": 79,
  "Cardinal|Fixed": 73,
  "Fixed|Cardinal": 73,
  "Cardinal|Mutable": 80,
  "Mutable|Cardinal": 80,
  "Fixed|Fixed": 82,
  "Fixed|Mutable": 76,
  "Mutable|Fixed": 76,
  "Mutable|Mutable": 81,
};

const OPPOSITES = {
  Aries: "Libra",
  Taurus: "Scorpio",
  Gemini: "Sagittarius",
  Cancer: "Capricorn",
  Leo: "Aquarius",
  Virgo: "Pisces",
  Libra: "Aries",
  Scorpio: "Taurus",
  Sagittarius: "Gemini",
  Capricorn: "Cancer",
  Aquarius: "Leo",
  Pisces: "Virgo",
};

const SIGN_NOTES = {
  Aries: { love: "direct and passionate", need: "adventure and honesty" },
  Taurus: { love: "steady and sensual", need: "security and consistency" },
  Gemini: { love: "playful and curious", need: "mental connection and variety" },
  Cancer: { love: "protective and nurturing", need: "emotional safety and softness" },
  Leo: { love: "warm and expressive", need: "appreciation and affection" },
  Virgo: { love: "devoted and intentional", need: "reliability and practical care" },
  Libra: { love: "romantic and considerate", need: "balance and harmony" },
  Scorpio: { love: "deep and loyal", need: "trust and emotional depth" },
  Sagittarius: { love: "optimistic and spontaneous", need: "freedom and growth" },
  Capricorn: { love: "committed and dependable", need: "respect and long-term vision" },
  Aquarius: { love: "thoughtful and original", need: "space and intellectual bond" },
  Pisces: { love: "tender and intuitive", need: "empathy and emotional closeness" },
};

const ELEMENT_NOTES = {
  Fire: {
    romance: "bold passion, playful spontaneity, and expressive affection",
    emotional: "quick feelings that need honest, direct expression",
  },
  Earth: {
    romance: "consistency, loyalty, and acts of practical love",
    emotional: "steady reassurance and reliability over drama",
  },
  Air: {
    romance: "conversation, curiosity, and witty connection",
    emotional: "space to process through words and perspective",
  },
  Water: {
    romance: "deep intimacy, tenderness, and emotional fusion",
    emotional: "gentle listening, empathy, and meaningful closeness",
  },
  Unknown: {
    romance: "care and intentional affection",
    emotional: "open communication and patience",
  },
};

function inRange(month, day, [fromMonth, fromDay], [toMonth, toDay]) {
  if (fromMonth < toMonth || (fromMonth === toMonth && fromDay <= toDay)) {
    return (
      (month > fromMonth || (month === fromMonth && day >= fromDay)) &&
      (month < toMonth || (month === toMonth && day <= toDay))
    );
  }

  return (
    month > fromMonth ||
    month < toMonth ||
    (month === fromMonth && day >= fromDay) ||
    (month === toMonth && day <= toDay)
  );
}

function getSign(dateValue) {
  const [year, month, day] = dateValue.split("-").map(Number);
  if (!year || !month || !day) {
    return { sign: "Unknown", element: "Unknown", modality: "Unknown" };
  }

  for (const item of SIGNS) {
    if (inRange(month, day, item.from, item.to)) {
      return { sign: item.sign, element: item.element, modality: item.modality };
    }
  }

  return { sign: "Unknown", element: "Unknown", modality: "Unknown" };
}

function compatibilityFromElements(e1, e2) {
  return ELEMENT_SCORES[`${e1}|${e2}`] ?? 70;
}

function compatibilityFromModalities(m1, m2) {
  return MODALITY_SCORES[`${m1}|${m2}`] ?? 75;
}

function getScores(first, second) {
  const pairScore = PAIR_SCORES[`${first.sign}|${second.sign}`];
  const elementScore = compatibilityFromElements(first.element, second.element);
  const modalityScore = compatibilityFromModalities(first.modality, second.modality);
  const oppositeBonus = OPPOSITES[first.sign] === second.sign ? 3 : 0;

  const romanceScore = Math.round(
    Math.min(98, Math.max(58, 0.6 * elementScore + 0.4 * modalityScore + oppositeBonus))
  );
  const finalScore =
    pairScore ??
    Math.round(Math.min(98, Math.max(56, 0.58 * elementScore + 0.27 * modalityScore + 0.15 * romanceScore)));

  return {
    finalScore,
    elementScore,
    modalityScore,
    romanceScore,
  };
}

function vibeByScore(score, sameElement, sameModality) {
  if (score >= 92) return "Soulmate energy";
  if (score >= 86 && sameElement) return "Steady heart connection";
  if (score >= 84 && sameModality) return "In-sync relationship rhythm";
  if (score >= 84) return "Beautifully balanced";
  if (score >= 74) return "Sweet and evolving";
  return "Magnetic growth journey";
}

function scoreCaption(score) {
  if (score >= 92) return "Excellent long-term compatibility";
  if (score >= 84) return "Very strong romantic compatibility";
  if (score >= 75) return "Good compatibility with growth potential";
  return "Works best with clear communication and intention";
}

function romanticDateIdea(elementA, elementB, modalityA, modalityB) {
  const key = `${elementA}|${elementB}`;
  if (key === "Earth|Earth") {
    return "Cook a candlelit dinner together and leave handwritten love notes at each place setting.";
  }
  if (key.includes("Water")) return "Plan a sunset picnic with your favorite playlist and one slow dance.";
  if (key.includes("Fire")) return "Dress up for a dreamy night out, then end with stargazing and dessert.";
  if (modalityA === "Fixed" && modalityB === "Fixed") {
    return "Create a cozy monthly ritual date and repeat it as your signature romance tradition.";
  }
  return "Visit a cozy cafe, then walk hand-in-hand and talk about your next adventure.";
}

function buildReading(nameA, nameB, first, second, score) {
  if (score >= 92) {
    return `${nameA} and ${nameB}, your ${first.sign} + ${second.sign} match is naturally romantic, loyal, and built for long-term stability. You balance tenderness with commitment in a very rare way.`;
  }

  if (score >= 84) {
    return `${nameA} and ${nameB}, your ${first.sign} + ${second.sign} combination has sweet chemistry and strong relationship potential. The more intentional your communication, the more your love deepens.`;
  }

  return `${nameA} and ${nameB}, your ${first.sign} + ${second.sign} pairing carries real attraction and growth potential. Keep emotional clarity high and make space for each other's pace.`;
}

function buildStrengths(first, second) {
  const noteA = SIGN_NOTES[first.sign] ?? { love: "caring", need: "mutual respect" };
  const noteB = SIGN_NOTES[second.sign] ?? { love: "warm", need: "kindness" };
  return `${first.sign} is ${noteA.love}, while ${second.sign} is ${noteB.love}. Together, you can build a relationship that feels both affectionate and dependable.`;
}

function buildCommunication(first, second) {
  if (first.element === second.element) {
    return `Shared ${first.element.toLowerCase()} energy helps you understand each other quickly. Keep check-ins regular so comfort never becomes assumption.`;
  }

  if (first.modality === second.modality) {
    return `You move at a similar ${first.modality.toLowerCase()} rhythm. Use that alignment to create clear habits for conflict repair and appreciation.`;
  }

  return `${first.sign} needs ${SIGN_NOTES[first.sign]?.need ?? "care"}, while ${second.sign} needs ${
    SIGN_NOTES[second.sign]?.need ?? "clarity"
  }. Name your needs early and kindly.`;
}

function buildEmotionalFocus(nameA, nameB, first, second) {
  return `${nameA}'s ${first.sign} core seeks ${SIGN_NOTES[first.sign]?.need ?? "warmth"}, while ${nameB}'s ${
    second.sign
  } core seeks ${SIGN_NOTES[second.sign]?.need ?? "stability"}. Prioritize reassurance and quality time to keep the bond emotionally full.`;
}

function buildReminders(first, second) {
  if (first.modality === "Fixed" || second.modality === "Fixed") {
    return "When one of you gets stubborn, pause and return to the conversation with softness instead of proving a point.";
  }
  if (first.modality === "Cardinal" || second.modality === "Cardinal") {
    return "If things feel rushed, slow down and reconnect emotionally before deciding the next step together.";
  }
  return "Avoid mixed signals: confirm plans, express affection clearly, and celebrate small relationship wins.";
}

function buildRomanceStyle(first, second) {
  return `${first.sign} brings ${ELEMENT_NOTES[first.element].romance}; ${second.sign} brings ${ELEMENT_NOTES[second.element].romance}. Your best romance style is consistent affection + intentional quality time.`;
}

function buildEmotionalStyle(first, second) {
  return `${first.sign} needs ${ELEMENT_NOTES[first.element].emotional}, while ${second.sign} needs ${ELEMENT_NOTES[second.element].emotional}. Name feelings early and reflect back what you heard.`;
}

function buildConflictStyle(first, second) {
  if (first.modality === "Fixed" && second.modality === "Fixed") {
    return "Both of you can hold your ground. Use a repair ritual: pause, validate each other, then return with one concrete request each.";
  }
  if (first.modality === "Cardinal" || second.modality === "Cardinal") {
    return "At least one of you moves quickly. Slow arguments down by agreeing on one issue at a time, then choosing one small next step.";
  }
  return "You both adapt fast, but clarity can slip. During conflict, repeat agreements out loud and write them down.";
}

function buildGrowthStyle(first, second, score) {
  if (score >= 90) {
    return "Your chart dynamics support long-term building: home, shared routines, and emotional safety grow quickly when nurtured.";
  }
  if (score >= 80) {
    return "Great potential for lasting love. The relationship strengthens most when expectations and boundaries are explicit.";
  }
  return "This pairing can become powerful through emotional maturity: curiosity over defensiveness is your growth superpower.";
}

function buildRoadmap(first, second) {
  const now =
    first.element === second.element
      ? "Schedule one no-phone quality-time night and protect it."
      : "Create a weekly emotional check-in with zero interruptions.";
  const next =
    first.modality === second.modality
      ? "Design one shared relationship routine you both commit to."
      : "Agree on your conflict-repair script and practice it twice.";
  const later =
    OPPOSITES[first.sign] === second.sign
      ? "Use your complementary traits to build a balanced long-term vision."
      : "Build a shared 12-month plan around love, money, and lifestyle priorities.";
  return { now, next, later };
}

function buildRituals(first, second) {
  const rituals = [
    "6-second kiss + 20-second hug every day, no exceptions.",
    "Weekly appreciation round: each person names 3 things they loved this week.",
    "Monthly romance date where phones stay away for the full date.",
  ];
  if (first.element === "Earth" || second.element === "Earth") {
    rituals[2] = "Monthly cozy home date: cook together and write each other one short love note.";
  } else if (first.element === "Fire" || second.element === "Fire") {
    rituals[2] = "Monthly adventure date: do something new together, then debrief feelings after.";
  } else if (first.element === "Water" || second.element === "Water") {
    rituals[2] = "Monthly deep-talk night with candles, music, and a shared relationship check-in.";
  }
  return rituals;
}

function buildFlags(first, second) {
  const green = [
    `Natural ${first.element.toLowerCase()} + ${second.element.toLowerCase()} chemistry that supports emotional bonding.`,
    "Strong potential for loyalty when both people communicate needs early.",
    "Mutual care style can become a stable, romantic long-term rhythm.",
  ];

  const watch = [
    "Assuming love is understood without saying it explicitly.",
    "Letting conflict drag instead of using a clear repair conversation.",
    "Prioritizing routine so much that romance rituals disappear.",
  ];

  if (first.modality === "Fixed" || second.modality === "Fixed") {
    watch[0] = "Digging in during disagreement instead of staying curious.";
  } else if (first.modality === "Mutable" && second.modality === "Mutable") {
    watch[1] = "Changing plans too often without confirming each other's expectations.";
  }

  return { green, watch };
}

function setBar(id, score) {
  const bar = document.querySelector(id);
  bar.style.width = `${score}%`;
}

function updateUI() {
  const p1Name = (document.querySelector("#p1-name").value.trim() || "Person 1").split(" ")[0];
  const p2Name = (document.querySelector("#p2-name").value.trim() || "Person 2").split(" ")[0];
  const p1Date = document.querySelector("#p1-date").value;
  const p2Date = document.querySelector("#p2-date").value;
  const p1Time = document.querySelector("#p1-time").value.trim();
  const p2Time = document.querySelector("#p2-time").value.trim();
  const p1Place = document.querySelector("#p1-place").value.trim();
  const p2Place = document.querySelector("#p2-place").value.trim();

  const first = getSign(p1Date);
  const second = getSign(p2Date);
  const { finalScore, elementScore, modalityScore, romanceScore } = getScores(first, second);

  const vibe = vibeByScore(finalScore, first.element === second.element, first.modality === second.modality);
  const hasBirthDetails = Boolean(p1Time && p2Time && p1Place && p2Place);
  const roadmap = buildRoadmap(first, second);
  const rituals = buildRituals(first, second);
  const flags = buildFlags(first, second);

  document.querySelector("#couple-name").textContent = `${p1Name} + ${p2Name}`;
  document.querySelector("#score").textContent = String(finalScore);
  document.querySelector("#score-caption").textContent = scoreCaption(finalScore);
  document.querySelector("#signs-chip").textContent = `${first.sign} + ${second.sign}`;
  document.querySelector("#element-chip").textContent = `${first.element} + ${second.element}`;
  document.querySelector("#modality-chip").textContent = `${first.modality} + ${second.modality}`;
  document.querySelector("#vibe-chip").textContent = vibe;
  document.querySelector("#reading").textContent = buildReading(p1Name, p2Name, first, second, finalScore);
  document.querySelector("#strengths").textContent = buildStrengths(first, second);
  document.querySelector("#communication").textContent = buildCommunication(first, second);
  document.querySelector("#date-idea").textContent = romanticDateIdea(
    first.element,
    second.element,
    first.modality,
    second.modality
  );
  document.querySelector("#emotional-focus").textContent = buildEmotionalFocus(p1Name, p2Name, first, second);
  document.querySelector("#reminders").textContent = buildReminders(first, second);
  document.querySelector("#romance-style").textContent = buildRomanceStyle(first, second);
  document.querySelector("#emotional-style").textContent = buildEmotionalStyle(first, second);
  document.querySelector("#conflict-style").textContent = buildConflictStyle(first, second);
  document.querySelector("#growth-style").textContent = buildGrowthStyle(first, second, finalScore);
  document.querySelector("#roadmap-now").textContent = roadmap.now;
  document.querySelector("#roadmap-next").textContent = roadmap.next;
  document.querySelector("#roadmap-later").textContent = roadmap.later;
  document.querySelector("#ritual-1").textContent = rituals[0];
  document.querySelector("#ritual-2").textContent = rituals[1];
  document.querySelector("#ritual-3").textContent = rituals[2];
  document.querySelector("#green-1").textContent = flags.green[0];
  document.querySelector("#green-2").textContent = flags.green[1];
  document.querySelector("#green-3").textContent = flags.green[2];
  document.querySelector("#watch-1").textContent = flags.watch[0];
  document.querySelector("#watch-2").textContent = flags.watch[1];
  document.querySelector("#watch-3").textContent = flags.watch[2];
  document.querySelector("#element-score").textContent = `${elementScore}%`;
  document.querySelector("#modality-score").textContent = `${modalityScore}%`;
  document.querySelector("#romance-score").textContent = `${romanceScore}%`;
  setBar("#element-bar", elementScore);
  setBar("#modality-bar", modalityScore);
  setBar("#romance-bar", romanceScore);
  document.querySelector("#accuracy-note").textContent = hasBirthDetails
    ? "You already included birth time and place for both people. For the most accurate next step, run full synastry with Moon, Venus, Mars, Ascendant, inter-chart aspects, and a composite chart."
    : "For deeper accuracy, include complete birth time/place for both people, then compare Moon, Venus, Mars, Ascendant, inter-chart aspects, and a composite chart.";
}

document.querySelector("#calculate-btn").addEventListener("click", updateUI);
document.querySelectorAll("input").forEach((field) => field.addEventListener("change", updateUI));
updateUI();

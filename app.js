const SIGNS = [
  { sign: "Capricorn", from: [12, 22], to: [1, 19], element: "Earth" },
  { sign: "Aquarius", from: [1, 20], to: [2, 18], element: "Air" },
  { sign: "Pisces", from: [2, 19], to: [3, 20], element: "Water" },
  { sign: "Aries", from: [3, 21], to: [4, 19], element: "Fire" },
  { sign: "Taurus", from: [4, 20], to: [5, 20], element: "Earth" },
  { sign: "Gemini", from: [5, 21], to: [6, 20], element: "Air" },
  { sign: "Cancer", from: [6, 21], to: [7, 22], element: "Water" },
  { sign: "Leo", from: [7, 23], to: [8, 22], element: "Fire" },
  { sign: "Virgo", from: [8, 23], to: [9, 22], element: "Earth" },
  { sign: "Libra", from: [9, 23], to: [10, 22], element: "Air" },
  { sign: "Scorpio", from: [10, 23], to: [11, 21], element: "Water" },
  { sign: "Sagittarius", from: [11, 22], to: [12, 21], element: "Fire" },
];

const PAIR_SCORES = {
  "Taurus|Virgo": 94,
  "Virgo|Taurus": 94,
};

const ELEMENT_SCORES = {
  "Fire|Air": 84,
  "Air|Fire": 84,
  "Earth|Water": 88,
  "Water|Earth": 88,
  "Earth|Earth": 86,
  "Water|Water": 84,
  "Air|Air": 80,
  "Fire|Fire": 79,
  "Fire|Water": 62,
  "Water|Fire": 62,
  "Earth|Air": 66,
  "Air|Earth": 66,
  "Earth|Fire": 67,
  "Fire|Earth": 67,
  "Air|Water": 68,
  "Water|Air": 68,
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
    return { sign: "Unknown", element: "Unknown" };
  }

  for (const item of SIGNS) {
    if (inRange(month, day, item.from, item.to)) {
      return { sign: item.sign, element: item.element };
    }
  }

  return { sign: "Unknown", element: "Unknown" };
}

function compatibilityFromElements(e1, e2) {
  return ELEMENT_SCORES[`${e1}|${e2}`] ?? 70;
}

function getCompatibility(signA, signB, elementA, elementB) {
  return PAIR_SCORES[`${signA}|${signB}`] ?? compatibilityFromElements(elementA, elementB);
}

function vibeByScore(score, sameElement) {
  if (score >= 92) return "Soulmate energy";
  if (score >= 84 && sameElement) return "Grounded soulmates";
  if (score >= 84) return "Beautifully balanced";
  if (score >= 74) return "Sweet and evolving";
  return "Growth and chemistry";
}

function romanticDateIdea(elementA, elementB) {
  const key = `${elementA}|${elementB}`;
  if (key === "Earth|Earth") return "Cook a candlelit dinner together with a handwritten love note under each plate.";
  if (key.includes("Water")) return "Sunset picnic with your favorite songs and a slow dance.";
  if (key.includes("Fire")) return "Dress up for a dreamy night out and finish with stargazing.";
  return "Visit a cozy cafe, then walk hand-in-hand and talk about your next adventure.";
}

function buildReading(nameA, nameB, signA, signB, score) {
  if (score >= 92) {
    return `${nameA} and ${nameB}, your ${signA} + ${signB} match is naturally loyal, affectionate, and deeply supportive. You two make love feel safe and magical at the same time.`;
  }

  if (score >= 84) {
    return `${nameA} and ${nameB}, your ${signA} + ${signB} combo has tender chemistry and a strong emotional rhythm. Keep choosing each other in little ways every day.`;
  }

  return `${nameA} and ${nameB}, your ${signA} + ${signB} pairing brings contrast that can become beautiful harmony with patience and communication.`;
}

function updateUI() {
  const p1Name = document.querySelector("#p1-name").value.trim() || "Person 1";
  const p2Name = document.querySelector("#p2-name").value.trim() || "Person 2";
  const p1Date = document.querySelector("#p1-date").value;
  const p2Date = document.querySelector("#p2-date").value;

  const first = getSign(p1Date);
  const second = getSign(p2Date);

  const score = getCompatibility(first.sign, second.sign, first.element, second.element);
  const vibe = vibeByScore(score, first.element === second.element);

  document.querySelector("#couple-name").textContent = `${p1Name.split(" ")[0]} + ${p2Name.split(" ")[0]}`;
  document.querySelector("#score").textContent = String(score);
  document.querySelector("#signs-chip").textContent = `${first.sign} + ${second.sign}`;
  document.querySelector("#element-chip").textContent = `${first.element} + ${second.element}`;
  document.querySelector("#vibe-chip").textContent = vibe;
  document.querySelector("#reading").textContent = buildReading(
    p1Name.split(" ")[0],
    p2Name.split(" ")[0],
    first.sign,
    second.sign,
    score
  );
  document.querySelector("#strengths").textContent =
    "Loyalty, emotional consistency, and building a peaceful life together with practical care.";
  document.querySelector("#reminders").textContent =
    "Say what you feel before stress builds, and keep romance alive with small daily affection.";
  document.querySelector("#date-idea").textContent = romanticDateIdea(first.element, second.element);
}

document.querySelector("#calculate-btn").addEventListener("click", updateUI);
updateUI();

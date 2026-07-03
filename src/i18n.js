// All user-facing text, PT (default) and EN.
// Interpretations are written against the couple's real computed placements
// in chartData.js — if those numbers change, this copy needs review too.

export const I18N = {
  pt: {
    langName: 'Português',
    title: 'Dailton & Felipe — escrito nas estrelas',
    heroKicker: 'astrolua apresenta',
    heroNames: 'Dailton & Felipe',
    heroTagline: 'Um mapa do céu a dois — carinhoso, mas de verdade.',
    heroBirthDailton: 'Dailton · 29 de abril de 1994, 07:20 · Jussara, GO',
    heroBirthFelipe: 'Felipe · 13 de setembro de 1995, 09:54 · Goiânia, GO',
    scrollHint: 'desça para ler o céu ✨',

    chartsTitle: 'Dois céus, um encontro',
    chartsIntro:
      'Antes da sinastria, cada um tem o seu próprio céu. Estes são os mapas natais calculados com efemérides reais — sem arredondar, sem inventar.',

    dailtonCard: {
      title: 'O céu de Dailton',
      lines: [
        { label: 'Sol em Touro · 8°52\'', text: 'Firme, sensorial e leal. Quando ama, constrói — com paciência e presença. E sim: teimoso, mas do tipo que fica.' },
        { label: 'Lua em Sagitário · 28°58\'', text: 'Por dentro, precisa de horizonte: humor, sinceridade e espaço pra sonhar grande. Uma Lua no último grau — intensa e sábia.' },
        { label: 'Ascendente em Touro · 19°12\'', text: 'Chega trazendo calma. As pessoas sentem estabilidade só de estar perto — e o Sol no mesmo signo do Ascendente deixa tudo ainda mais inteiro: o que se vê é o que é.' },
        { label: 'Vênus em Câncer · 10°08\'', text: 'Ama cuidando: casa, comida, colo. Carinho, pra Dailton, é um verbo que se conjuga todos os dias.' },
        { label: 'Marte em Peixes · 21°44\'', text: 'Age pela intuição e evita briga à toa — a força é mansa, mas é força.' },
      ],
    },
    felipeCard: {
      title: 'O céu de Felipe',
      lines: [
        { label: 'Sol em Virgem · 20°16\'', text: 'Amor em forma de gesto útil: reparar, melhorar, resolver. Perfeccionista com o mundo — e consigo mesmo.' },
        { label: 'Lua em Touro · 13°18\'', text: 'O coração pede constância: toque, conforto, rotina boa. Quando se sente seguro, é porto.' },
        { label: 'Ascendente em Escorpião · 25°13\'', text: 'Primeira impressão: olhar profundo, presença magnética, mistério. Não se entrega de cara — mas quando entrega, é inteiro.' },
        { label: 'Vênus em Libra · 5°41\'', text: 'Ama em dupla: equilíbrio, beleza, gentileza. Vênus em casa própria — romântico de nascença.' },
        { label: 'Marte junto de Plutão em Sagitário', text: 'Quando quer algo, quer inteiro. Uma determinação silenciosa e profunda.' },
      ],
    },

    synastryTitle: 'Onde os céus se abraçam',
    synastryIntro:
      'Sinastria é sobreposição: o mapa de um tocando o mapa do outro. Estes são os contatos reais mais fortes entre vocês — com o grau exato de cada um.',
    aspects: {
      sunMoon: {
        title: 'A Lua dele sobre o Sol seu',
        badge: 'Lua de Felipe ☌ Sol de Dailton · em Touro',
        text: 'O aspecto clássico dos casais duradouros. O que Felipe precisa sentir para estar em paz é exatamente o que Dailton simplesmente é. Em Touro, isso vira algo concreto: casa, cheiro de café, presença. Vocês não precisam se esforçar para "funcionar" — o encaixe é de fábrica.',
      },
      moonAsc: {
        title: 'O coração dele no seu horizonte',
        badge: 'Lua de Felipe ☌ Ascendente de Dailton · em Touro',
        text: 'A Lua de Felipe também abraça o Ascendente de Dailton. O jeito de Dailton existir no mundo é, para Felipe, sinônimo de segurança emocional. Perto de você, ele se sente em casa — literalmente.',
      },
      ascSun: {
        title: 'Terra com terra',
        badge: 'Ascendente de Dailton △ Sol e Mercúrio de Felipe · orbes 1°04\' e 0°18\'',
        text: 'O Ascendente taurino de Dailton forma trígonos exatos com o Sol e o Mercúrio de Felipe. Fluidez rara no dia a dia: o essencial de um não atrapalha o essencial do outro — apoia. Conversa fácil, convivência que rende.',
      },
      mcJupiter: {
        title: 'Sorte no futuro a dois',
        badge: 'Júpiter de Felipe ✶ Meio-do-Céu de Dailton · orbe 0°04\' — exato',
        text: 'Com precisão de quatro minutos de arco, o Júpiter de Felipe abençoa o ponto de carreira e direção de vida de Dailton. Felipe abre portas para o futuro de Dailton — torce, expande, acredita. Ter alguém assim do lado muda trajetórias.',
      },
      venusMoon: {
        title: 'Carinho que chega inteiro',
        badge: 'Vênus de Dailton ✶ Lua de Felipe · água e terra',
        text: 'A Vênus canceriana de Dailton cuida; a Lua taurina de Felipe recebe. O afeto de um é exatamente o alimento do outro. Domingo em casa, comida boa, silêncio confortável: o amor de vocês tem endereço.',
      },
      jupiterMoon: {
        title: 'Expansão do coração',
        badge: 'Júpiter de Dailton ☍ Lua de Felipe',
        text: 'Dailton amplia o que Felipe sente — mais riso, mais fé, mais apetite de vida. O único cuidado: generosidade demais às vezes promete além do combinado. Mas como defeito, é dos bons.',
      },
    },

    realTalkTitle: 'Papo reto (o céu também é sério)',
    realTalkIntro:
      'Nenhuma sinastria de verdade é só flores. Estes aspectos pedem trabalho — e são exatamente os que fazem um amor amadurecer.',
    realAspects: {
      marsSaturn: {
        title: 'O freio e o motor',
        badge: 'Saturno de Felipe ☌ Marte de Dailton · orbe 0°26\' — exato',
        text: 'O Saturno de Felipe pousa em cima do Marte de Dailton com precisão cirúrgica. Tradução: às vezes o realismo de Felipe soa como freio no impulso de Dailton — e pode doer como crítica, mesmo quando é cuidado. O lado bom é enorme: essa é a assinatura de casais que constroem coisas de longo prazo. O combinado: Felipe tempera o realismo com incentivo; Dailton lembra que "vai devagar" não significa "não vai".',
      },
      marsSun: {
        title: 'Faísca de verdade',
        badge: 'Marte de Dailton ☍ Sol de Felipe · orbe 1°28\'',
        text: 'Atração e atrito nascem do mesmo aspecto. Vocês se acendem — e de vez em quando batem de frente. A regra de ouro: briguem pelo assunto, nunca um contra o outro. Essa energia, bem usada, é paixão que não esfria.',
      },
      plutoAsc: {
        title: 'Intensidade que transforma',
        badge: 'Plutão de Dailton ☌ Ascendente de Felipe · orbe 1°21\'',
        text: 'O Plutão de Dailton toca o Ascendente escorpiano de Felipe: essa relação mexe fundo em quem Felipe é — magnetismo forte, e às vezes a sensação de ser visto até demais. O acordo silencioso: profundidade sim, controle não. Transformar sem tentar possuir.',
      },
      venusVenus: {
        title: 'Duas línguas de amor',
        badge: 'Vênus de Dailton □ Vênus de Felipe · Câncer e Libra',
        text: 'Dailton demonstra amor com profundidade emocional e cuidado; Felipe, com harmonia, estética e palavras gentis. Nenhum dos dois está errado — mas sem tradução, um pode não reconhecer o gesto do outro como amor. Perguntem-se de vez em quando: "como você quer ser amado hoje?"',
      },
    },

    todayTitle: 'O céu de hoje para vocês',
    todayIntro: 'Esta parte se recalcula sozinha, todos os dias, com a posição real dos astros.',
    todayMoonIn: 'Lua em',
    todayPhaseLabel: 'fase',
    forDailton: 'Para Dailton',
    forFelipe: 'Para Felipe',
    noMajorTransit: 'Céu tranquilo: nenhum trânsito apertado hoje — aproveitem a calmaria.',
    loveNoteLabel: 'nota de amor do dia',
    updatedAt: 'Calculado em',

    phases: {
      'new': 'Lua nova', 'waxing-crescent': 'Lua crescente', 'first-quarter': 'Quarto crescente',
      'waxing-gibbous': 'Gibosa crescente', 'full': 'Lua cheia', 'waning-gibbous': 'Gibosa minguante',
      'last-quarter': 'Quarto minguante', 'waning-crescent': 'Lua minguante',
    },
    signs: {
      aries: 'Áries', taurus: 'Touro', gemini: 'Gêmeos', cancer: 'Câncer', leo: 'Leão', virgo: 'Virgem',
      libra: 'Libra', scorpio: 'Escorpião', sagittarius: 'Sagitário', capricorn: 'Capricórnio',
      aquarius: 'Aquário', pisces: 'Peixes',
    },
    planets: {
      sun: 'o Sol', moon: 'a Lua', mercury: 'Mercúrio', venus: 'Vênus', mars: 'Marte',
      jupiter: 'Júpiter', saturn: 'Saturno', uranus: 'Urano', neptune: 'Netuno', pluto: 'Plutão',
    },
    points: {
      sun: 'o Sol', moon: 'a Lua', mercury: 'o Mercúrio', venus: 'a Vênus', mars: 'o Marte',
      jupiter: 'o Júpiter', saturn: 'o Saturno', ascendant: 'o Ascendente', midheaven: 'o Meio-do-Céu',
    },
    aspectNames: { conjunction: 'conjunção com', sextile: 'sextil com', square: 'quadratura com', trine: 'trígono com', opposition: 'oposição com' },
    transitTemplate: (planet, aspect, point) => `${cap(planet)} em ${aspect} ${point} natal.`,
    transitTones: {
      harmonious: {
        moon: 'O clima emocional flui — bom dia para conversa mole e carinho à toa.',
        sun: 'Energia vital em sintonia: as coisas andam sem precisar empurrar.',
        mercury: 'As palavras saem fáceis. Aproveitem para combinar aquilo que ficou pendente.',
        venus: 'Afeto em maré alta. Um gesto pequeno hoje vale por três.',
        mars: 'Disposição de sobra — canalizem juntos em algo com corpo: cozinhar, treinar, arrumar.',
      },
      tense: {
        moon: 'Sensibilidade à flor da pele hoje. Respirem antes de responder.',
        sun: 'Os egos podem se esbarrar. Lembrem: mesmo time.',
        mercury: 'Risco de ruído na comunicação — confirmem antes de supor.',
        venus: 'Os gostos podem divergir hoje. Cedam um pouco cada um.',
        mars: 'Pavio mais curto no ar. Gastem essa energia em movimento, não em discussão.',
      },
      blend: {
        moon: 'Dia de emoções em destaque — nomear o que sente já resolve metade.',
        sun: 'Foco pessoal em evidência: dividam os holofotes.',
        mercury: 'Muitas ideias no ar — anotem as boas.',
        venus: 'O coração pede beleza: façam algo bonito juntos hoje.',
        mars: 'Energia de sobra procurando direção. Deem uma a ela.',
      },
    },
    loveNotes: [
      'A Lua dele mora no seu Sol. Alguns encaixes ninguém ensaia.',
      'Um sextil de 0°04\' não é sorte — é o céu sendo específico sobre vocês.',
      'Touro no Sol de um, na Lua do outro: quando vocês dois dizem "fica", é pra valer.',
      'O Saturno dele guarda o seu fogo. Chama protegida dura mais.',
      'Vênus em Câncer cuida, Lua em Touro recebe. O amor de vocês tem cheiro de casa.',
      'A Lua dele nasceu no seu horizonte. Ele te viu e reconheceu o caminho de casa.',
      'Casais de verdade têm quadraturas de verdade. As suas têm solução: conversa.',
      'Nasceram a 160 km de distância e o céu já tinha combinado tudo.',
      'O amor firme não é o que nunca vacila — é o que volta. Os mapas de vocês voltam um pro outro.',
      'Hoje, como todo dia, o céu gira — e esse encaixe de vocês continua no lugar.',
    ],
    disclaimer:
      'Feito com efemérides astronômicas reais (astronomy-engine) e muito amor. Astrologia é linguagem simbólica — usem o que servir, sorriam do resto.',
    footer: 'astrolua · feito para Dailton & Felipe',
  },

  en: {
    langName: 'English',
    title: 'Dailton & Felipe — written in the stars',
    heroKicker: 'astrolua presents',
    heroNames: 'Dailton & Felipe',
    heroTagline: 'A two-person sky map — sweet, but honest.',
    heroBirthDailton: 'Dailton · April 29 1994, 7:20 am · Jussara, GO, Brazil',
    heroBirthFelipe: 'Felipe · September 13 1995, 9:54 am · Goiânia, GO, Brazil',
    scrollHint: 'scroll to read the sky ✨',

    chartsTitle: 'Two skies, one meeting',
    chartsIntro:
      'Before synastry, each of you has your own sky. These natal charts are computed from real ephemerides — no rounding, no making things up.',

    dailtonCard: {
      title: "Dailton's sky",
      lines: [
        { label: "Sun in Taurus · 8°52'", text: 'Steady, sensory, loyal. When he loves, he builds — with patience and presence. And yes: stubborn, but the kind that stays.' },
        { label: "Moon in Sagittarius · 28°58'", text: 'Inside, he needs horizon: humor, honesty, and room to dream big. A last-degree Moon — intense and wise.' },
        { label: "Taurus Ascendant · 19°12'", text: 'He walks in carrying calm. People feel steadier just being near him — and with Sun and Ascendant in the same sign, what you see is what he is.' },
        { label: "Venus in Cancer · 10°08'", text: 'He loves by caring: home, food, holding you close. For Dailton, affection is a verb conjugated daily.' },
        { label: "Mars in Pisces · 21°44'", text: 'He acts on intuition and avoids pointless fights — the strength is gentle, but it is strength.' },
      ],
    },
    felipeCard: {
      title: "Felipe's sky",
      lines: [
        { label: "Sun in Virgo · 20°16'", text: 'Love in the shape of useful gestures: fixing, improving, solving. A perfectionist with the world — and with himself.' },
        { label: "Moon in Taurus · 13°18'", text: 'His heart asks for constancy: touch, comfort, good routine. When he feels safe, he is a harbor.' },
        { label: "Scorpio Ascendant · 25°13'", text: "First impression: deep gaze, magnetic presence, mystery. He doesn't hand himself over at once — but when he does, it's whole." },
        { label: "Venus in Libra · 5°41'", text: 'He loves in pairs: balance, beauty, kindness. Venus in her own sign — a born romantic.' },
        { label: 'Mars conjunct Pluto in Sagittarius', text: 'When he wants something, he wants it whole. A quiet, deep determination.' },
      ],
    },

    synastryTitle: 'Where your skies embrace',
    synastryIntro:
      'Synastry is an overlay: one chart touching the other. These are your strongest real contacts — each with its exact degree.',
    aspects: {
      sunMoon: {
        title: 'His Moon on your Sun',
        badge: "Felipe's Moon ☌ Dailton's Sun · in Taurus",
        text: "The classic aspect of lasting couples. What Felipe needs in order to feel at peace is exactly what Dailton simply is. In Taurus it becomes concrete: home, the smell of coffee, presence. You don't have to work at 'fitting' — the fit came from the factory.",
      },
      moonAsc: {
        title: 'His heart on your horizon',
        badge: "Felipe's Moon ☌ Dailton's Ascendant · in Taurus",
        text: "Felipe's Moon also embraces Dailton's Ascendant. The way Dailton simply exists in the world is, for Felipe, the feeling of emotional safety. Near you, he is home — literally.",
      },
      ascSun: {
        title: 'Earth with earth',
        badge: "Dailton's Ascendant △ Felipe's Sun and Mercury · orbs 1°04' and 0°18'",
        text: "Dailton's Taurus Ascendant makes exact trines to Felipe's Sun and Mercury. Rare ease in daily life: what is essential to one supports — rather than obstructs — what is essential to the other. Easy talk, a shared life that simply works.",
      },
      mcJupiter: {
        title: 'Luck in the future you share',
        badge: "Felipe's Jupiter ✶ Dailton's Midheaven · orb 0°04' — exact",
        text: "To within four arc-minutes, Felipe's Jupiter blesses Dailton's career point and life direction. Felipe opens doors to Dailton's future — believing, expanding, cheering. Having someone like that beside you changes trajectories.",
      },
      venusMoon: {
        title: 'Affection that arrives whole',
        badge: "Dailton's Venus ✶ Felipe's Moon · water and earth",
        text: "Dailton's Cancer Venus nurtures; Felipe's Taurus Moon receives. One's way of giving love is exactly the other's food. Sunday at home, good food, comfortable silence: your love has an address.",
      },
      jupiterMoon: {
        title: 'The heart, expanded',
        badge: "Dailton's Jupiter ☍ Felipe's Moon",
        text: 'Dailton amplifies what Felipe feels — more laughter, more faith, more appetite for life. One caution: too much generosity sometimes promises past the plan. But as flaws go, this is a good one.',
      },
    },

    realTalkTitle: 'Real talk (the sky is serious too)',
    realTalkIntro:
      'No true synastry is all flowers. These aspects ask for work — and they are exactly the ones that make a love grow up.',
    realAspects: {
      marsSaturn: {
        title: 'The brake and the engine',
        badge: "Felipe's Saturn ☌ Dailton's Mars · orb 0°26' — exact",
        text: "Felipe's Saturn lands on Dailton's Mars with surgical precision. Translation: sometimes Felipe's realism feels like a brake on Dailton's drive — and can sting like criticism even when it's care. The upside is huge: this is the signature of couples who build long-term things. The deal: Felipe seasons realism with encouragement; Dailton remembers that 'slow down' doesn't mean 'don't go'.",
      },
      marsSun: {
        title: 'Real spark',
        badge: "Dailton's Mars ☍ Felipe's Sun · orb 1°28'",
        text: "Attraction and friction are born from the same aspect. You light each other up — and now and then you butt heads. Golden rule: fight about the topic, never against each other. Used well, this energy is passion that doesn't cool.",
      },
      plutoAsc: {
        title: 'Intensity that transforms',
        badge: "Dailton's Pluto ☌ Felipe's Ascendant · orb 1°21'",
        text: "Dailton's Pluto touches Felipe's Scorpio Ascendant: this relationship reaches deep into who Felipe is — strong magnetism, and sometimes the feeling of being seen almost too well. The quiet agreement: depth yes, control no. Transform without trying to possess.",
      },
      venusVenus: {
        title: 'Two love languages',
        badge: "Dailton's Venus □ Felipe's Venus · Cancer and Libra",
        text: "Dailton shows love through emotional depth and caretaking; Felipe through harmony, beauty, and gentle words. Neither is wrong — but without translation, one may not recognize the other's gesture as love. Ask each other now and then: 'how do you want to be loved today?'",
      },
    },

    todayTitle: 'Today’s sky for you two',
    todayIntro: 'This section recalculates itself every day from the real positions of the planets.',
    todayMoonIn: 'Moon in',
    todayPhaseLabel: 'phase',
    forDailton: 'For Dailton',
    forFelipe: 'For Felipe',
    noMajorTransit: 'A quiet sky: no tight transits today — enjoy the calm.',
    loveNoteLabel: 'love note of the day',
    updatedAt: 'Computed at',

    phases: {
      'new': 'New Moon', 'waxing-crescent': 'Waxing crescent', 'first-quarter': 'First quarter',
      'waxing-gibbous': 'Waxing gibbous', 'full': 'Full Moon', 'waning-gibbous': 'Waning gibbous',
      'last-quarter': 'Last quarter', 'waning-crescent': 'Waning crescent',
    },
    signs: {
      aries: 'Aries', taurus: 'Taurus', gemini: 'Gemini', cancer: 'Cancer', leo: 'Leo', virgo: 'Virgo',
      libra: 'Libra', scorpio: 'Scorpio', sagittarius: 'Sagittarius', capricorn: 'Capricorn',
      aquarius: 'Aquarius', pisces: 'Pisces',
    },
    planets: {
      sun: 'the Sun', moon: 'the Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars',
      jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto',
    },
    points: {
      sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars',
      jupiter: 'Jupiter', saturn: 'Saturn', ascendant: 'Ascendant', midheaven: 'Midheaven',
    },
    aspectNames: { conjunction: 'conjunct', sextile: 'sextile', square: 'square', trine: 'trine', opposition: 'opposite' },
    transitTemplate: (planet, aspect, point) => `${cap(planet)} ${aspect} natal ${point}.`,
    transitTones: {
      harmonious: {
        moon: 'The emotional weather flows — a good day for easy talk and affection for no reason.',
        sun: 'Vital energy in sync: things move without pushing.',
        mercury: 'Words come easily. Use it to settle the thing you kept postponing.',
        venus: 'Affection at high tide. One small gesture today counts as three.',
        mars: 'Energy to spare — channel it together into something physical: cook, train, tidy.',
      },
      tense: {
        moon: 'Feelings run close to the skin today. Breathe before replying.',
        sun: 'Egos may bump. Remember: same team.',
        mercury: 'Static on the line — confirm before assuming.',
        venus: 'Tastes may clash today. Each give a little.',
        mars: 'Shorter fuses in the air. Spend the energy on movement, not argument.',
      },
      blend: {
        moon: 'Emotions take the stage — naming the feeling solves half of it.',
        sun: 'Personal focus is lit: share the spotlight.',
        mercury: 'Ideas everywhere — write down the good ones.',
        venus: 'The heart asks for beauty: make something lovely together today.',
        mars: 'Spare energy looking for a direction. Give it one.',
      },
    },
    loveNotes: [
      'His Moon lives on your Sun. Some fits no one rehearses.',
      "A 0°04' sextile isn't luck — it's the sky being specific about you two.",
      "Taurus in one's Sun, in the other's Moon: when you two say \"stay\", you mean it.",
      'His Saturn guards your fire. A sheltered flame burns longer.',
      'Venus in Cancer gives care, Moon in Taurus receives it. Your love smells like home.',
      'His Moon rose on your horizon. He saw you and recognized the way home.',
      'Real couples have real squares. Yours come with a fix: talking.',
      'Born 160 km apart, and the sky had already arranged everything.',
      "Steady love isn't the kind that never wavers — it's the kind that returns. Your charts keep returning to each other.",
      'Today, like every day, the sky turns — and this fit of yours stays put.',
    ],
    disclaimer:
      'Built with real astronomical ephemerides (astronomy-engine) and plenty of love. Astrology is a symbolic language — keep what serves you, smile at the rest.',
    footer: 'astrolua · made for Dailton & Felipe',
  },
};

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

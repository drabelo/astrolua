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
        { label: 'Vênus em Gêmeos · 3°51\'', text: 'Ama conversando: piada interna, mensagem no meio do dia, curiosidade um pelo outro. Pra Dailton, papo bom é carinho.' },
        { label: 'Marte em Áries · 11°21\'', text: 'Fogo direto: quando decide, vai. Pavio rápido também — mas apaga rápido e não guarda mágoa.' },
      ],
    },
    felipeCard: {
      title: 'O céu de Felipe',
      lines: [
        { label: 'Sol em Virgem · 20°16\'', text: 'Amor em forma de gesto útil: reparar, melhorar, resolver. Perfeccionista com o mundo — e consigo mesmo.' },
        { label: 'Lua em Touro · 13°18\'', text: 'O coração pede constância: toque, conforto, rotina boa. Quando se sente seguro, é porto.' },
        { label: 'Ascendente em Escorpião · 25°13\'', text: 'Primeira impressão: olhar profundo, presença magnética, mistério. Não se entrega de cara — mas quando entrega, é inteiro.' },
        { label: 'Vênus em Virgem · 26°41\'', text: 'Ama em forma de cuidado prático: consertar, lembrar, facilitar a sua vida. O gesto pequeno e certeiro é a declaração dele.' },
        { label: 'Marte em Escorpião · 4°09\'', text: 'No signo do próprio Ascendente: vontade silenciosa e profunda. Quando quer algo, quer inteiro.' },
      ],
    },

    elements: {
      title: 'A química dos elementos',
      intro:
        'Fogo, terra, ar e água: quanto de cada elemento cada mapa carrega, olhando os dez planetas e o Ascendente de cada um.',
      labels: { fire: 'Fogo', earth: 'Terra', air: 'Ar', water: 'Água' },
      combined:
        'Juntos, o casal pesa pra terra: construir, cuidar e sustentar é o que vem mais fácil pra vocês dois. A água também tem peso de sobra — sentimento fundo, intuição, memória emocional. O que rareia é leveza: pouco ar (as palavras, nomear o que sente) e pouco fogo (espontaneidade, a faísca do improviso). Não é defeito, é convite: digam em voz alta o que sentem, e coloquem a aventura na agenda — porque, sozinha, ela não costuma aparecer nos mapas de nenhum dos dois.',
    },

    synastryTitle: 'Onde os céus se abraçam',
    synastryIntro:
      'Sinastria é sobreposição: o mapa de um tocando o mapa do outro. Estes são os contatos reais mais fortes entre vocês — com o grau exato de cada um.',
    aspects: {
      sunMoon: {
        title: 'A Lua dele sobre o Sol seu',
        badge: 'Lua de Felipe ☌ Sol e Ascendente de Dailton · em Touro',
        text: 'O aspecto clássico dos casais duradouros. O que Felipe precisa sentir para estar em paz é exatamente o que Dailton simplesmente é — a Lua dele abraça o seu Sol e o seu Ascendente de uma vez. Em Touro, isso vira algo concreto: casa, cheiro de café, presença. Vocês não precisam se esforçar para "funcionar" — o encaixe é de fábrica.',
      },
      ascSun: {
        title: 'Terra com terra',
        badge: 'Ascendente de Dailton △ Sol de Felipe · orbe 1°04\'',
        text: 'O Ascendente taurino de Dailton forma um trígono exato com o Sol virginiano de Felipe. Fluidez rara no cotidiano: o jeito de viver de um apoia — em vez de atrapalhar — o essencial do outro. Convivência que simplesmente rende.',
      },
      uranusVenus: {
        title: 'A faísca que não envelhece',
        badge: 'Urano de Dailton △ Vênus de Felipe · orbe 0°20\' — quase exato',
        text: 'O contato mais preciso da sinastria de vocês (e o mais forte do relatório): Urano de Dailton eletriza a Vênus de Felipe, com Plutão dando profundidade no mesmo ponto. Tradução: pra Felipe, amar Dailton nunca vira rotina — tem sempre uma surpresa, um frio na barriga que renova. É o antídoto natural contra a mesmice.',
      },
      venusJupiter: {
        title: 'Romance em tamanho grande',
        badge: 'Vênus de Dailton ☍ Júpiter de Felipe · orbe 4°14\'',
        text: 'O afeto de um encontra o otimismo do outro e tudo cresce: planos, presentes, risadas, mesa cheia. Só um lembrete carinhoso: generosidade também cabe no orçamento. Exagerar junto é ótimo — combinem só o tamanho do exagero.',
      },
      jupiterMoon: {
        title: 'Expansão do coração',
        badge: 'Júpiter de Dailton ☍ Lua de Felipe · orbe 3°24\'',
        text: 'Dailton amplia o que Felipe sente — mais riso, mais fé, mais apetite de vida. O único cuidado: generosidade demais às vezes promete além do combinado. Mas como defeito, é dos bons.',
      },
    },

    realTalkTitle: 'Papo reto (o céu também é sério)',
    realTalkIntro:
      'Nenhuma sinastria de verdade é só flores. Estes aspectos pedem trabalho — e são exatamente os que fazem um amor amadurecer.',
    realAspects: {
      moonVenus: {
        title: 'Coração livre, amor preciso',
        badge: 'Lua de Dailton □ Vênus de Felipe · orbe 2°17\'',
        text: 'A Lua sagitariana de Dailton precisa de espaço, espontaneidade e verdade dita sem filtro. A Vênus virginiana de Felipe ama nos detalhes: o plano, o cuidado, o jeito certo. Às vezes o improviso de um soa como descuido, e o zelo do outro soa como cobrança. Nenhum dos dois é o vilão — é só tradução: liberdade não é desamor, e detalhe não é crítica.',
      },
      saturnJupiter: {
        title: 'O pé no chão e o pé na estrada',
        badge: 'Saturno de Dailton □ Júpiter de Felipe · orbe 1°58\'',
        text: 'O senso de limite de Dailton faz ângulo com o otimismo expansivo de Felipe. Nos planos grandes — dinheiro, mudanças, apostas — um vai querer garantias e o outro, fé. A dupla funciona quando cada um faz o seu papel: Felipe sonha o destino, Dailton constrói a estrada.',
      },
      mercuryMars: {
        title: 'Palavras com pimenta',
        badge: 'Mercúrio de Dailton ☍ Marte de Felipe · orbe 3°33\'',
        text: 'O jeito de falar de um acende o motor do outro — ótimo para debates, perigoso para discussões às onze da noite. Se o tom subir, façam uma pausa e voltem: a faísca que inflama conversa é a mesma que esquenta o resto. Usem a seu favor.',
      },
      plutoAsc: {
        title: 'Intensidade que transforma',
        badge: 'Plutão de Dailton ☌ Ascendente de Felipe · orbe 1°59\'',
        text: 'O Plutão de Dailton toca o Ascendente escorpiano de Felipe: essa relação mexe fundo em quem Felipe é — magnetismo forte, e às vezes a sensação de ser visto até demais. O acordo silencioso: profundidade sim, controle não. Transformar sem tentar possuir.',
      },
    },
    weeklyTitle: 'A semana de vocês',
    weeklyIntro: 'Horóscopo semanal personalizado, calculado sobre os mapas natais completos — renovado toda segunda-feira.',
    weeklyFor: { dailton: 'Para Dailton', felipe: 'Para Felipe' },
    weeklyUpdated: 'Atualizado em',
    todayTitle: 'O céu de hoje para vocês',
    todayIntro: 'Esta parte se recalcula sozinha, todos os dias, com a posição real dos astros.',
    todayMoonIn: 'Lua em',
    todayPhaseLabel: 'fase',
    forDailton: 'Para Dailton',
    forFelipe: 'Para Felipe',
    noMajorTransit: 'Céu tranquilo: nenhum trânsito apertado hoje — aproveitem a calmaria.',
    loveNoteLabel: 'nota de amor do dia',
    updatedAt: 'Calculado em',

    moons: {
      title: 'As próximas luas',
      intro: 'Catorze dias de lua, do jeito que o céu vai desenhar — e as duas luas que vêm por aí, nova e cheia, cada uma com o signo em que acontece.',
      nextNew: 'Próxima Lua Nova',
      nextFull: 'Próxima Lua Cheia',
      newLine: 'Boa lua pra plantar uma semente juntos — uma intenção, um plano, um começo pequeno.',
      fullLine: 'Boa lua pra celebrar ou fechar um ciclo juntos — o que já floresceu entre vocês.',
    },

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
      'Um trígono de 0°20\' não é sorte — é o céu sendo específico sobre vocês.',
      'Touro no Sol de um, na Lua do outro: quando vocês dois dizem "fica", é pra valer.',
      'Marte em Áries acende, Lua em Touro sustenta. Fogo com lareira.',
      'Vênus em Gêmeos conversa, Vênus em Virgem cuida. O amor de vocês fala e faz.',
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
        { label: "Venus in Gemini · 3°51'", text: 'He loves by talking: inside jokes, a message in the middle of the day, curiosity about you. For Dailton, good conversation is affection.' },
        { label: "Mars in Aries · 11°21'", text: "Direct fire: once he decides, he goes. A quick fuse too — but it burns out fast and holds no grudges." },
      ],
    },
    felipeCard: {
      title: "Felipe's sky",
      lines: [
        { label: "Sun in Virgo · 20°16'", text: 'Love in the shape of useful gestures: fixing, improving, solving. A perfectionist with the world — and with himself.' },
        { label: "Moon in Taurus · 13°18'", text: 'His heart asks for constancy: touch, comfort, good routine. When he feels safe, he is a harbor.' },
        { label: "Scorpio Ascendant · 25°13'", text: "First impression: deep gaze, magnetic presence, mystery. He doesn't hand himself over at once — but when he does, it's whole." },
        { label: "Venus in Virgo · 26°41'", text: 'He loves through practical care: fixing things, remembering things, making your life easier. The small precise gesture is his declaration.' },
        { label: "Mars in Scorpio · 4°09'", text: 'In the sign of his own Ascendant: a quiet, deep will. When he wants something, he wants it whole.' },
      ],
    },

    elements: {
      title: 'Your elemental chemistry',
      intro:
        'Fire, earth, air, and water: how much of each element each chart carries, looking at the ten planets and each of your Ascendants.',
      labels: { fire: 'Fire', earth: 'Earth', air: 'Air', water: 'Water' },
      combined:
        "Together, this couple leans earth-heavy: building, tending, and holding steady comes easiest to you two. Water carries plenty of weight too — deep feeling, intuition, emotional memory. What runs thin is lightness: little air (words, naming what you feel) and little fire (spontaneity, the spark of improvising). That's not a flaw, it's an invitation: say out loud what you feel, and put the adventure on the calendar — because left alone, it doesn't tend to show up in either of your charts.",
    },

    synastryTitle: 'Where your skies embrace',
    synastryIntro:
      'Synastry is an overlay: one chart touching the other. These are your strongest real contacts — each with its exact degree.',
    aspects: {
      sunMoon: {
        title: 'His Moon on your Sun',
        badge: "Felipe's Moon ☌ Dailton's Sun and Ascendant · in Taurus",
        text: "The classic aspect of lasting couples. What Felipe needs in order to feel at peace is exactly what Dailton simply is — his Moon embraces your Sun and your Ascendant at once. In Taurus it becomes concrete: home, the smell of coffee, presence. You don't have to work at 'fitting' — the fit came from the factory.",
      },
      ascSun: {
        title: 'Earth with earth',
        badge: "Dailton's Ascendant △ Felipe's Sun · orb 1°04'",
        text: "Dailton's Taurus Ascendant makes an exact trine to Felipe's Virgo Sun. Rare ease in daily life: the way one lives supports — rather than obstructs — what is essential to the other. A shared life that simply works.",
      },
      uranusVenus: {
        title: 'The spark that never ages',
        badge: "Dailton's Uranus △ Felipe's Venus · orb 0°20' — near exact",
        text: "The most precise contact in your synastry (and the strongest in the report): Dailton's Uranus electrifies Felipe's Venus, with Pluto adding depth at the same point. Translation: for Felipe, loving Dailton never turns into routine — there is always a surprise, a flutter that renews itself. It is the natural antidote to sameness.",
      },
      venusJupiter: {
        title: 'Romance, size large',
        badge: "Dailton's Venus ☍ Felipe's Jupiter · orb 4°14'",
        text: "One's affection meets the other's optimism and everything grows: plans, gifts, laughter, a full table. One loving reminder: generosity has a budget too. Overdoing it together is wonderful — just agree on the size of the overdoing.",
      },
      jupiterMoon: {
        title: 'The heart, expanded',
        badge: "Dailton's Jupiter ☍ Felipe's Moon · orb 3°24'",
        text: 'Dailton amplifies what Felipe feels — more laughter, more faith, more appetite for life. One caution: too much generosity sometimes promises past the plan. But as flaws go, this is a good one.',
      },
    },
    realTalkTitle: 'Real talk (the sky is serious too)',
    realTalkIntro:
      'No true synastry is all flowers. These aspects ask for work — and they are exactly the ones that make a love grow up.',
    realAspects: {
      moonVenus: {
        title: 'Free heart, precise love',
        badge: "Dailton's Moon □ Felipe's Venus · orb 2°17'",
        text: "Dailton's Sagittarius Moon needs space, spontaneity, and truth said without a filter. Felipe's Virgo Venus loves in the details: the plan, the care, the right way. Sometimes one's improvising reads as carelessness, and the other's diligence reads as nitpicking. Neither is the villain — it just needs translating: freedom isn't unlove, and detail isn't criticism.",
      },
      saturnJupiter: {
        title: 'One foot on the ground, one on the road',
        badge: "Dailton's Saturn □ Felipe's Jupiter · orb 1°58'",
        text: "Dailton's sense of limits squares Felipe's expansive optimism. In the big plans — money, moves, bets — one will want guarantees and the other, faith. The duo works when each plays his part: Felipe dreams the destination, Dailton builds the road.",
      },
      mercuryMars: {
        title: 'Words with pepper',
        badge: "Dailton's Mercury ☍ Felipe's Mars · orb 3°33'",
        text: "The way one talks revs the other's engine — great for debates, dangerous for arguments at eleven p.m. If the tone climbs, pause and come back: the spark that heats an argument is the same one that heats everything else. Use it in your favor.",
      },
      plutoAsc: {
        title: 'Intensity that transforms',
        badge: "Dailton's Pluto ☌ Felipe's Ascendant · orb 1°59'",
        text: "Dailton's Pluto touches Felipe's Scorpio Ascendant: this relationship reaches deep into who Felipe is — strong magnetism, and sometimes the feeling of being seen almost too well. The quiet agreement: depth yes, control no. Transform without trying to possess.",
      },
    },
    weeklyTitle: 'Your week ahead',
    weeklyIntro: 'A personalized weekly horoscope computed on the full natal charts — refreshed every Monday.',
    weeklyFor: { dailton: 'For Dailton', felipe: 'For Felipe' },
    weeklyUpdated: 'Updated',
    todayTitle: 'Today’s sky for you two',
    todayIntro: 'This section recalculates itself every day from the real positions of the planets.',
    todayMoonIn: 'Moon in',
    todayPhaseLabel: 'phase',
    forDailton: 'For Dailton',
    forFelipe: 'For Felipe',
    noMajorTransit: 'A quiet sky: no tight transits today — enjoy the calm.',
    loveNoteLabel: 'love note of the day',
    updatedAt: 'Computed at',

    moons: {
      title: 'The coming moons',
      intro: "Fourteen days of moon, drawn the way the sky will show it — plus the next two moons ahead, new and full, each with the sign it lands in.",
      nextNew: 'Next New Moon',
      nextFull: 'Next Full Moon',
      newLine: 'A good moon to plant a seed together — an intention, a plan, a small beginning.',
      fullLine: 'A good moon to celebrate or complete something together — whatever has bloomed between you two.',
    },

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
      "A 0°20' trine isn't luck — it's the sky being specific about you two.",
      "Taurus in one's Sun, in the other's Moon: when you two say \"stay\", you mean it.",
      'Mars in Aries lights the fire, Moon in Taurus keeps it burning. Flame with a hearth.',
      'Venus in Gemini talks, Venus in Virgo does. Your love both says and shows.',
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

// Pure data module: quest-giver and flavor NPCs for each city.
// No Three.js, no DOM. UI strings carry both languages via {es,en}.

// Layout notes: offsets are relative to the city temple center.
// Reserved spots to avoid: temple at (0,0), shop at (+9,0),
// depot at (-9,0), portal at (0,+11). The city is radius ~40, so offsets can
// reach the themed districts (mage ~NE, knight ~NW, market ~SW).

// Vendor `shop` descriptor (consumed by cities.js shop helpers):
//   buyMult  price the player pays  = floor(item.value * buyMult)
//   sellMult coins the player gets  = floor(item.value * sellMult)
//   sells    what the vendor offers to BUY-from: { kinds:[], types:[], slots:[], excludePct } or { all:true }
//   buys     what the vendor accepts when the player SELLS: same shape (omit = nothing)

export const NPCS = [
  // Rivertown: starter town by the river.
  {
    id: 'rivertown_priest', name: 'Brother Aldo', city: 'rivertown', role: 'priest',
    model: 'priest', color: 0xeee6d2, offset: { x: 0, z: -4 },
    greeting: { es: 'Que la luz te guie, viajero.', en: 'May the light guide you, traveler.' },
    lines: {
      es: ['El templo siempre tiene las puertas abiertas.', 'Descansa y cura tus heridas aqui.', 'Los recien llegados son bienvenidos en Rivertown.'],
      en: ['The temple doors are always open.', 'Rest and heal your wounds here.', 'Newcomers are welcome in Rivertown.'],
    },
  },
  {
    id: 'rivertown_elder', name: 'Elder Mira', city: 'rivertown', role: 'questgiver',
    model: 'woman', color: 0x6f9bd1, offset: { x: -5, z: 3 },
    greeting: { es: 'Hola, joven. Necesito tu ayuda.', en: 'Hello, young one. I need your help.' },
    lines: {
      es: ['Los gusanos y ratas molestan a los granjeros.', 'Si limpias los campos, te recompensare.', 'Cada heroe empieza por tareas pequenas.'],
      en: ['Worms and rats trouble our farmers.', 'Clear the fields and I will reward you.', 'Every hero starts with small tasks.'],
    },
  },
  {
    id: 'rivertown_guard', name: 'Guard Tomas', city: 'rivertown', role: 'guard',
    model: 'guard', color: 0x8a8f98, offset: { x: 6, z: -5 },
    greeting: { es: 'Manten la calma en la ciudad.', en: 'Keep the peace in the city.' },
    lines: {
      es: ['Vigilo las puertas dia y noche.', 'Mas alla del rio hay criaturas peligrosas.', 'Lleva una buena arma antes de salir.'],
      en: ['I watch the gates day and night.', 'Beyond the river lurk dangerous creatures.', 'Carry a good weapon before you leave.'],
    },
  },
  {
    id: 'rivertown_merchant', name: 'Merchant Bea', city: 'rivertown', role: 'vendor',
    model: 'woman', color: 0xd2a04b, district: 'market',
    greeting: { es: 'Buenas ofertas para aventureros!', en: 'Great deals for adventurers!' },
    // The general store in the Market Hall: buys and sells everything basic, so
    // the big market building always has a shopkeeper with a Buy option.
    shop: { buyMult: 1, sellMult: 0.5, sells: { all: true }, buys: { all: true } },
    lines: {
      es: ['Tengo de todo un poco, echa un vistazo.', 'Guarda tus tesoros en el deposito.', 'El oro siempre encuentra buen uso.'],
      en: ['A bit of everything here, take a look.', 'Store your treasures in the depot.', 'Gold always finds good use.'],
    },
  },

  // Rivertown vendors, spread across the themed districts of the starting city.
  // Knight district (NW): a weaponsmith and an armorer.
  {
    id: 'rivertown_weaponsmith', name: 'Smith Orin', city: 'rivertown', role: 'vendor',
    model: 'smith', color: 0x7a5230, district: 'knight', offset: { x: -17, z: 20 },
    shop: { buyMult: 1, sellMult: 0.4, sells: { types: ['sword', 'axe'] }, buys: { types: ['sword', 'axe'] } },
    greeting: { es: 'Acero recien forjado, mira esto.', en: 'Fresh-forged steel, take a look.' },
    lines: {
      es: ['Compro y vendo toda clase de armas.', 'Una buena hoja te salva la vida.'],
      en: ['I buy and sell every kind of weapon.', 'A good blade saves your life.'],
    },
  },
  {
    id: 'rivertown_armorer', name: 'Armorer Dela', city: 'rivertown', role: 'vendor',
    model: 'smith', color: 0x9aa0ab, district: 'knight', offset: { x: -22, z: 16 },
    shop: { buyMult: 1, sellMult: 0.4, sells: { kinds: ['armor', 'shield'] }, buys: { kinds: ['armor', 'shield'] } },
    greeting: { es: 'Protege tu pellejo, aventurero.', en: 'Protect your hide, adventurer.' },
    lines: {
      es: ['Cascos, petos y escudos a buen precio.', 'La mejor defensa de Rivertown.'],
      en: ['Helmets, plates and shields, fair prices.', 'The best defense in Rivertown.'],
    },
  },
  // Mage district (NE): a wand seller.
  {
    id: 'rivertown_wandseller', name: 'Mage Ysel', city: 'rivertown', role: 'vendor',
    model: 'wizard', color: 0x6a5bef, district: 'mage', offset: { x: 18, z: 19 },
    shop: { buyMult: 1, sellMult: 0.4, sells: { types: ['wand'] }, buys: { types: ['wand'] } },
    greeting: { es: 'Varitas para canalizar tu poder.', en: 'Wands to channel your power.' },
    lines: {
      es: ['Cada varita afina un elemento distinto.', 'El arcano recompensa al estudioso.'],
      en: ['Each wand tunes a different element.', 'The arcane rewards the studious.'],
    },
  },
  // Market district (SW): apothecary and a fruit trader.
  {
    id: 'rivertown_apothecary', name: 'Herbalist Fen', city: 'rivertown', role: 'vendor',
    model: 'apothecary', color: 0x6aa05a, district: 'potion', offset: { x: -18, z: -19 },
    shop: { buyMult: 1, sellMult: 0.4, sells: { kinds: ['potion'] }, buys: { kinds: ['potion'] } },
    greeting: { es: 'Pociones frescas para el camino.', en: 'Fresh potions for the road.' },
    lines: {
      es: ['Vida y mana, lo basico para todo heroe.', 'Nunca salgas sin una pocion.'],
      en: ['Health and mana, the basics every hero needs.', 'Never leave without a potion.'],
    },
  },
  {
    id: 'rivertown_trader', name: 'Cook Pol', city: 'rivertown', role: 'vendor',
    model: 'merchant', color: 0xc06a32, district: 'food', offset: { x: -22, z: -15 },
    shop: { buyMult: 1, sellMult: 0.6, sells: { tiers: ['fruit', 'low'] }, buys: { tiers: ['fruit', 'low'] } },
    greeting: { es: 'Bienvenido a la Olla de Cobre! Comida caliente.', en: 'Welcome to the Copper Kettle! Hot food here.' },
    lines: {
      es: ['Pan, fruta y guiso, lo que el camino pide.', 'Lo que cae de los bichos, yo lo cocino y te lo compro.', 'Come bien antes de salir de la ciudad.'],
      en: ['Bread, fruit and stew, whatever the road demands.', 'Whatever drops from beasts, I cook it and I buy it.', 'Eat well before you leave the city.'],
    },
  },
  {
    id: 'rivertown_bagseller', name: 'Sela of the Sacks', city: 'rivertown', role: 'vendor',
    model: 'woman', color: 0xc06bb0, district: 'bag', offset: { x: -22, z: -8 },
    shop: { buyMult: 1, sellMult: 0.45, sells: { kinds: ['container'] }, buys: { kinds: ['container'] } },
    greeting: { es: 'Bolsas y mochilas, de todos los colores!', en: 'Bags and backpacks, in every color!' },
    lines: {
      es: [
        'Cosí cada mochila a mano. La roja, la azul, la que prefieras.',
        'Una buena mochila carga más botín y te hace ver con estilo.',
        'Me llaman Sela de los Sacos. Nadie tiene más bolsas que yo.',
      ],
      en: [
        'I stitched every backpack by hand. Red, blue, whichever you fancy.',
        'A good backpack carries more loot — and looks sharp doing it.',
        'They call me Sela of the Sacks. No one carries more bags than I do.',
      ],
    },
  },
  // Archer district: a fletcher selling bows and arrows.
  {
    id: 'rivertown_fletcher', name: 'Fletcher Wynn', city: 'rivertown', role: 'vendor',
    model: 'merchant', color: 0x6a8f3a, district: 'archer', offset: { x: 20, z: -16 },
    shop: { buyMult: 1, sellMult: 0.4, sells: { types: ['bow'] }, buys: { types: ['bow'] } },
    greeting: { es: 'Arcos y flechas, los mejores de Greenhollow.', en: 'Bows and arrows, the finest in Greenhollow.' },
    lines: {
      es: ['Tenso cada cuerda yo mismo.', 'Un buen arco golpea antes de que te vean.'],
      en: ['I string every bow myself.', 'A good bow strikes before they ever see you.'],
    },
  },
  // Bank district: the banker, who reminds you to use the vault (the depot).
  {
    id: 'rivertown_banker', name: 'Banker Goss', city: 'rivertown', role: 'banker',
    model: 'merchant', color: 0xd9b34a, district: 'bank', offset: { x: -12, z: 0 },
    greeting: { es: 'Bienvenido al Banco de Greenhollow.', en: 'Welcome to the Bank of Greenhollow.' },
    lines: {
      es: ['Guarda tu oro y tus tesoros en la bóveda, están seguros aquí.', 'Habla conmigo en el mostrador para abrir tu caja fuerte.', 'Un héroe rico es un héroe vivo.'],
      en: ['Store your gold and treasures in the vault — they are safe here.', 'Speak to me at the counter to open your strongbox.', 'A rich hero is a living hero.'],
    },
  },
  // Town Hall: the mayor offers to register the player as a resident of the city.
  {
    id: 'rivertown_mayor', name: 'Mayor Halden', city: 'rivertown', role: 'mayor',
    model: 'king', color: 0x7a2030, district: 'townhall', offset: { x: 20, z: 16 },
    greeting: { es: 'Bienvenido al Ayuntamiento de Greenhollow.', en: 'Welcome to the Greenhollow Town Hall.' },
    lines: {
      es: ['¿Deseas residenciarte en esta ciudad? Renacerás aquí.', 'Los residentes de Greenhollow siempre tienen un hogar al que volver.'],
      en: ['Would you like to settle in this city? You will respawn here.', 'Residents of Greenhollow always have a home to return to.'],
    },
  },
  // Stable Master: sells the two starter mounts (horse + wolf) and points the
  // way to the mount-quest givers. role:'stable' opens the mount shop UI (it has
  // no item `shop`, so it skips the normal vendor path). district:'stable' homes
  // him INSIDE The Stable building (a corner barn) so he stays put there instead
  // of roaming the streets.
  {
    id: 'rivertown_stablemaster', name: 'Stable Master Brent', city: 'rivertown', role: 'stable',
    district: 'stable',
    model: 'merchant', color: 0x7a5a30, offset: { x: 12, z: -10 },
    greeting: { es: '¿Buscas montura? Tengo las mejores bestias domadas.', en: 'Looking for a mount? I have the finest tamed beasts.' },
    lines: {
      es: ['Un caballo o un lobo, para empezar. Las bestias raras se ganan en gestas.', 'Una montura te hace un 30% más veloz y saltas más alto.', 'Pulsa G para montar y desmontar.'],
      en: ['A horse or a wolf, to start. The rare beasts are earned through deeds.', 'A mount makes you 30% faster and you jump higher.', 'Press G to mount and dismount.'],
    },
  },
  // North Keep spur: the guard captain who watches the northern gate.
  {
    id: 'rivertown_captain', name: 'Captain Roa', city: 'rivertown', role: 'guard',
    model: 'guard', color: 0x6b6f78, district: 'temple2', offset: { x: 0, z: -70 },
    greeting: { es: 'El Torreón Norte vigila los caminos.', en: 'The North Keep watches the roads.' },
    lines: {
      es: ['Desde aquí se ve venir a cualquiera por el norte.', 'La guardia de Greenhollow nunca duerme.'],
      en: ['From here we see anyone coming from the north.', 'The Greenhollow guard never sleeps.'],
    },
  },
  // Tavern spur (west): the innkeeper sells food and drink.
  {
    id: 'rivertown_innkeeper', name: 'Innkeeper Mabel', city: 'rivertown', role: 'vendor',
    model: 'woman', color: 0xc06a32, district: 'tavern', offset: { x: -100, z: 50 },
    shop: { buyMult: 1, sellMult: 0.6, sells: { tiers: ['fruit', 'low'] }, buys: { tiers: ['fruit', 'low'] } },
    greeting: { es: '¡Pasa al Posada del Viajero! Cama caliente y buena cerveza.', en: 'Step into the Wayfarer Inn! Warm bed and good ale.' },
    lines: {
      es: ['Una jarra y un guiso, lo que un aventurero necesita.', 'Aquí descansan los que vienen de lejos.'],
      en: ['A mug and a stew, just what an adventurer needs.', 'Those who travel far rest their bones here.'],
    },
  },
  // Jeweler spur (east): buys and sells fine amulets.
  {
    id: 'rivertown_jeweler', name: 'Gemcutter Sol', city: 'rivertown', role: 'vendor',
    model: 'merchant', color: 0x6a5bef, district: 'jeweler', offset: { x: 100, z: -50 },
    shop: { buyMult: 1, sellMult: 0.5, sells: { slots: ['amulet'] }, buys: { slots: ['amulet'] } },
    greeting: { es: 'Joyas y amuletos tallados a mano.', en: 'Hand-cut jewels and amulets.' },
    lines: {
      es: ['Un buen amuleto vale su peso en oro.', 'Cada gema la pulo yo mismo.'],
      en: ['A fine amulet is worth its weight in gold.', 'I cut and polish every gem myself.'],
    },
  },

  // Oakvale: forest town, home of hunters.
  {
    id: 'oakvale_priest', name: 'Sister Lia', city: 'oakvale', role: 'priest',
    model: 'priest', color: 0xe8ead8, offset: { x: 0, z: -4 },
    greeting: { es: 'Bienvenido al bosque, alma noble.', en: 'Welcome to the forest, noble soul.' },
    lines: {
      es: ['Los arboles guardan viejos secretos.', 'Cura aqui antes de adentrarte.', 'La naturaleza recompensa a los valientes.'],
      en: ['The trees keep old secrets.', 'Heal here before you venture in.', 'Nature rewards the brave.'],
    },
  },
  {
    id: 'oakvale_hunter', name: 'Hunter Rolf', city: 'oakvale', role: 'questgiver',
    model: 'man', color: 0x5e7d3a, offset: { x: -6, z: 4 },
    greeting: { es: 'Buen ojo, cazador? Vamos a verlo.', en: 'Sharp eye, hunter? Let us see.' },
    lines: {
      es: ['Los lobos y jabalies rondan el bosque.', 'Trae pieles y tendras tu pago.', 'Un buen arco vale mas que el oro.'],
      en: ['Wolves and boars roam the woods.', 'Bring me hides and you will be paid.', 'A good bow is worth more than gold.'],
    },
  },
  {
    id: 'oakvale_forager', name: 'Old Wren', city: 'oakvale', role: 'questgiver',
    model: 'woman', color: 0x7a6f4d, offset: { x: 6, z: 4 },
    greeting: { es: 'Las hierbas no se recogen solas.', en: 'The herbs will not gather themselves.' },
    lines: {
      es: ['Las setas crecen entre las raices.', 'Cuidado con las arañas en los matorrales.', 'Ayudame y compartire mis recetas.'],
      en: ['Mushrooms grow among the roots.', 'Beware the spiders in the thickets.', 'Help me and I will share my recipes.'],
    },
  },
  {
    id: 'oakvale_guard', name: 'Guard Esa', city: 'oakvale', role: 'guard',
    model: 'guard', color: 0x6b7d5a, offset: { x: -5, z: -5 },
    greeting: { es: 'Alto. Quien anda por el bosque?', en: 'Halt. Who walks the woods?' },
    lines: {
      es: ['Patrullo los senderos de Oakvale.', 'Los kobolds bajan de las colinas.', 'No camines de noche sin escudo.'],
      en: ['I patrol the paths of Oakvale.', 'Kobolds come down from the hills.', 'Do not walk at night without a shield.'],
    },
  },
  {
    id: 'oakvale_villager', name: 'Young Pip', city: 'oakvale', role: 'villager',
    model: 'man', color: 0xb5793c, offset: { x: 4, z: -5 },
    greeting: { es: 'Algun dia sere un gran heroe!', en: 'One day I will be a great hero!' },
    lines: {
      es: ['Mi abuela cuenta historias de dragones.', 'Dicen que hay tesoros en las cuevas.', 'Ensename a luchar cuando seas fuerte!'],
      en: ['My grandmother tells dragon tales.', 'They say caves hide treasure.', 'Teach me to fight when you are strong!'],
    },
  },
  // --- Oakvale vendors, one per themed district, plus more townsfolk ---------
  {
    id: 'oakvale_fletcher', name: 'Bowyer Tamsin', city: 'oakvale', role: 'vendor',
    model: 'merchant', color: 0x6a8f3a, district: 'archer',
    shop: { buyMult: 1, sellMult: 0.4, sells: { types: ['bow'] }, buys: { types: ['bow'] } },
    greeting: { es: 'Arcos de tejo del bosque de Oakvale.', en: 'Yew bows from the Oakvale woods.' },
    lines: {
      es: ['Cada arco lo tallo de la rama mas recta.', 'Un cazador sin arco es solo un paseante.'],
      en: ['I carve each bow from the straightest bough.', 'A hunter without a bow is just a stroller.'],
    },
  },
  {
    id: 'oakvale_weaponsmith', name: 'Smith Bramble', city: 'oakvale', role: 'vendor',
    model: 'smith', color: 0x7a5230, district: 'knight',
    shop: { buyMult: 1, sellMult: 0.4, sells: { types: ['sword', 'axe'] }, buys: { types: ['sword', 'axe'] } },
    greeting: { es: 'Hachas para lena y para lobos.', en: 'Axes for firewood and for wolves.' },
    lines: {
      es: ['Mi forja es pequena pero el acero es honesto.', 'Afilo gratis si me traes una buena historia.'],
      en: ['My forge is small but the steel is honest.', 'I sharpen free if you bring me a good tale.'],
    },
  },
  {
    id: 'oakvale_herbalist', name: 'Herbwife Nessa', city: 'oakvale', role: 'vendor',
    model: 'apothecary', color: 0x6aa05a, district: 'potion',
    shop: { buyMult: 1, sellMult: 0.4, sells: { kinds: ['potion'] }, buys: { kinds: ['potion'] } },
    greeting: { es: 'Tonicos de raiz y rocio del bosque.', en: 'Tonics of root and forest dew.' },
    lines: {
      es: ['Las mejores hierbas crecen donde nadie mira.', 'Old Wren me enseno todo lo que se.'],
      en: ['The best herbs grow where no one looks.', 'Old Wren taught me everything I know.'],
    },
  },
  {
    id: 'oakvale_grocer', name: 'Grocer Tobin', city: 'oakvale', role: 'vendor',
    model: 'merchant', color: 0xc06a32, district: 'market',
    shop: { buyMult: 1, sellMult: 0.55, sells: { tiers: ['fruit', 'low'] }, buys: { tiers: ['fruit', 'low'] } },
    greeting: { es: 'Fruta del huerto, recien cogida!', en: 'Orchard fruit, just picked!' },
    lines: {
      es: ['Manzanas, nueces y miel del bosque.', 'Compro lo que cae de los bichos para cocinar.'],
      en: ['Apples, nuts and forest honey.', 'I buy what drops from beasts, for the pot.'],
    },
  },
  {
    id: 'oakvale_carpenter', name: 'Carver Hollis', city: 'oakvale', role: 'villager',
    model: 'man', color: 0x8a6a3a, offset: { x: -38, z: -22 },
    greeting: { es: 'El roble bueno tarda cien anos.', en: 'Good oak takes a hundred years.' },
    lines: {
      es: ['Construi la mitad de las casas que ves.', 'El Gran Roble del centro es mas viejo que el pueblo.', 'Respeta los arboles y ellos te daran cobijo.'],
      en: ['I built half the houses you see.', 'The Great Oak at the center is older than the town.', 'Respect the trees and they will shelter you.'],
    },
  },
  {
    id: 'oakvale_child', name: 'Little Fern', city: 'oakvale', role: 'villager',
    model: 'woman', color: 0xd07ab0, offset: { x: 30, z: -26 },
    greeting: { es: 'Has visto un ciervo blanco? Yo si!', en: 'Have you seen a white deer? I have!' },
    lines: {
      es: ['Mama dice que no vaya sola al bosque.', 'Le pongo nombre a todas las ardillas.', 'Cuando sea grande sere cazadora como Rolf.'],
      en: ['Mama says not to go in the woods alone.', 'I name every squirrel I meet.', 'When I grow up I will hunt like Rolf.'],
    },
  },
  {
    id: 'oakvale_druid', name: 'Druid Aelwen', city: 'oakvale', role: 'questgiver',
    model: 'wizard', color: 0x3f7a4a, district: 'mage',
    greeting: { es: 'El bosque susurra, y yo escucho.', en: 'The forest whispers, and I listen.' },
    lines: {
      es: ['Algo enferma a los arboles del norte.', 'Los treants despiertan cuando el bosque sufre.', 'Trae savia corrupta y leere su origen.'],
      en: ['Something sickens the northern trees.', 'Treants wake when the woods suffer.', 'Bring me tainted sap and I will read its source.'],
    },
  },
  {
    id: 'oakvale_innkeeper', name: 'Innkeeper Bess', city: 'oakvale', role: 'vendor',
    model: 'woman', color: 0xc06a32, offset: { x: -28, z: 30 },
    shop: { buyMult: 1, sellMult: 0.6, sells: { tiers: ['fruit', 'low'] }, buys: { tiers: ['fruit', 'low'] } },
    greeting: { es: 'Posada del Roble: cama, sopa y chismes.', en: 'The Oak Rest: a bed, soup and gossip.' },
    lines: {
      es: ['Los cazadores cuentan las mejores mentiras aqui.', 'Una sopa caliente cura casi todo.'],
      en: ['Hunters tell the tallest tales in here.', 'A hot soup cures nearly anything.'],
    },
  },
  {
    id: 'oakvale_trapper', name: 'Trapper Cole', city: 'oakvale', role: 'villager',
    model: 'man', color: 0x5e7d3a, offset: { x: 40, z: 18 },
    greeting: { es: 'Mis trampas nunca fallan. Casi.', en: 'My snares never miss. Almost.' },
    lines: {
      es: ['Pieles de zorro, conejo y lobo, todo legal.', 'Los jabalies rompen mis cercas cada semana.', 'Camina sin hacer ruido y veras el doble.'],
      en: ['Fox, rabbit and wolf pelts, all above board.', 'Boars smash my fences every week.', 'Walk quiet and you will see twice as much.'],
    },
  },
  {
    id: 'oakvale_mayor', name: 'Elder Fendrel', city: 'oakvale', role: 'mayor',
    model: 'king', color: 0x5a6a2a, offset: { x: 0, z: 20 },
    greeting: { es: 'Oakvale te acoge bajo sus ramas.', en: 'Oakvale welcomes you under its branches.' },
    lines: {
      es: ['Quieres residenciarte aqui? Renaceras bajo el roble.', 'Somos pocos, pero ninguno pasa hambre.'],
      en: ['Would you settle here? You will respawn under the oak.', 'We are few, but none of us go hungry.'],
    },
  },

  // Stonehaven: fortified mountain town.
  {
    id: 'stonehaven_priest', name: 'Father Garm', city: 'stonehaven', role: 'priest',
    model: 'priest', color: 0xdfe2e8, offset: { x: 0, z: -4 },
    greeting: { es: 'La piedra nos protege a todos.', en: 'The stone protects us all.' },
    lines: {
      es: ['Reza por los mineros de las profundidades.', 'Aqui hallaras refugio y cura.', 'La fe es mas dura que el acero.'],
      en: ['Pray for the miners in the deep.', 'Here you will find shelter and healing.', 'Faith is harder than steel.'],
    },
  },
  {
    id: 'stonehaven_captain', name: 'Captain Dur', city: 'stonehaven', role: 'questgiver',
    model: 'guard', color: 0x9aa3ad, offset: { x: -6, z: 3 },
    greeting: { es: 'Necesitamos manos firmes en las minas.', en: 'We need steady hands in the mines.' },
    lines: {
      es: ['Los esqueletos infestan los tuneles.', 'Limpialos y la ciudad te lo agradecera.', 'El acero de Stonehaven es el mejor.'],
      en: ['Skeletons infest the tunnels.', 'Clear them and the city will thank you.', 'Stonehaven steel is the finest.'],
    },
  },
  {
    id: 'stonehaven_smith', name: 'Smith Ingra', city: 'stonehaven', role: 'questgiver',
    model: 'woman', color: 0xc0703a, offset: { x: 6, z: 3 },
    greeting: { es: 'Trae mineral y forjare maravillas.', en: 'Bring me ore and I will forge wonders.' },
    lines: {
      es: ['Los golems guardan vetas de metal.', 'Mi yunque nunca descansa.', 'Una buena armadura salva vidas.'],
      en: ['Golems guard veins of metal.', 'My anvil never rests.', 'Good armor saves lives.'],
    },
  },
  {
    id: 'stonehaven_king', name: 'King Baldric', city: 'stonehaven', role: 'questgiver',
    model: 'king', color: 0x7a3f8c, offset: { x: 0, z: 6 },
    greeting: { es: 'Te recibo en mi salon, valiente.', en: 'I receive you in my hall, brave one.' },
    lines: {
      es: ['Mi reino enfrenta amenazas oscuras.', 'Demuestra tu valor y seras honrado.', 'Los orcos amenazan nuestras fronteras.'],
      en: ['My realm faces dark threats.', 'Prove your worth and be honored.', 'Orcs threaten our borders.'],
    },
  },
  {
    id: 'stonehaven_guard', name: 'Guard Hald', city: 'stonehaven', role: 'guard',
    model: 'guard', color: 0x868d96, offset: { x: 5, z: -5 },
    greeting: { es: 'Las murallas resisten cualquier asedio.', en: 'These walls resist any siege.' },
    lines: {
      es: ['Vigilo desde lo alto de la torre.', 'Los trolls bajan cuando hace frio.', 'Manten tu escudo siempre listo.'],
      en: ['I watch from the high tower.', 'Trolls come down when it grows cold.', 'Keep your shield always ready.'],
    },
  },
  // --- Stonehaven vendors (one per district) and more mountain folk ----------
  {
    id: 'stonehaven_armorer', name: 'Armorer Brunn', city: 'stonehaven', role: 'vendor',
    model: 'smith', color: 0x9aa0ab, district: 'knight',
    shop: { buyMult: 1, sellMult: 0.4, sells: { kinds: ['armor', 'shield'], types: ['mace', 'axe'] }, buys: { kinds: ['armor', 'shield'], types: ['mace', 'axe'] } },
    greeting: { es: 'Placas forjadas con mineral de las minas.', en: 'Plate forged from deep-mine ore.' },
    lines: {
      es: ['Mi acero ha parado garras de troll.', 'Pesado, si. Pero estaras vivo para quejarte.'],
      en: ['My steel has stopped troll claws.', 'Heavy, yes. But you will live to complain.'],
    },
  },
  {
    id: 'stonehaven_alchemist', name: 'Alchemist Vex', city: 'stonehaven', role: 'vendor',
    model: 'apothecary', color: 0x7a9a8a, district: 'potion',
    shop: { buyMult: 1, sellMult: 0.4, sells: { kinds: ['potion'] }, buys: { kinds: ['potion'] } },
    greeting: { es: 'Pociones para no congelarse en la mina.', en: 'Potions to keep the mine from freezing you.' },
    lines: {
      es: ['Hiervo musgo de cueva y sal de roca.', 'Una pocion caliente vale oro alla abajo.'],
      en: ['I boil cave moss and rock salt.', 'A warm potion is worth gold down there.'],
    },
  },
  {
    id: 'stonehaven_runesmith', name: 'Runesmith Kara', city: 'stonehaven', role: 'vendor',
    model: 'wizard', color: 0x5a6abf, district: 'mage',
    shop: { buyMult: 1, sellMult: 0.4, sells: { types: ['wand'] }, buys: { types: ['wand'] } },
    greeting: { es: 'Runas grabadas en la piedra viva.', en: 'Runes cut into the living rock.' },
    lines: {
      es: ['La magia y la piedra son viejas amigas.', 'Cada varita lleva una runa de proteccion.'],
      en: ['Magic and stone are old friends.', 'Each wand carries a rune of warding.'],
    },
  },
  {
    id: 'stonehaven_trader', name: 'Trader Olfa', city: 'stonehaven', role: 'vendor',
    model: 'merchant', color: 0xc0703a, district: 'market',
    shop: { buyMult: 1, sellMult: 0.5, sells: { tiers: ['fruit', 'low'] }, buys: { tiers: ['fruit', 'low'] } },
    greeting: { es: 'Provisiones para la montana, viajero.', en: 'Mountain provisions, traveler.' },
    lines: {
      es: ['Pan duro, queso curado y carne seca.', 'Aqui arriba todo se conserva bien.'],
      en: ['Hard bread, aged cheese and dried meat.', 'Up here everything keeps well.'],
    },
  },
  {
    id: 'stonehaven_banker', name: 'Banker Thane', city: 'stonehaven', role: 'banker',
    model: 'merchant', color: 0xd9b34a, offset: { x: -12, z: 0 },
    greeting: { es: 'La boveda de Stonehaven es la mas segura.', en: 'Stonehaven vault is the safest there is.' },
    lines: {
      es: ['Tallada en la propia montana, nadie la fuerza.', 'Guarda tu oro antes de bajar a las minas.'],
      en: ['Cut into the mountain itself, none can force it.', 'Store your gold before you go down the mines.'],
    },
  },
  {
    id: 'stonehaven_miner', name: 'Miner Dorn', city: 'stonehaven', role: 'questgiver',
    model: 'man', color: 0x7a6a5a, offset: { x: -36, z: -20 },
    greeting: { es: 'Otra veta perdida por culpa de los golems.', en: 'Another vein lost to the golems.' },
    lines: {
      es: ['Los golems de piedra guardan el mejor mineral.', 'Rompe unos cuantos y te pago en plata.', 'El pico es mi espada y la roca mi enemiga.'],
      en: ['Stone golems guard the richest ore.', 'Break a few and I will pay you in silver.', 'The pick is my sword and the rock my foe.'],
    },
  },
  {
    id: 'stonehaven_widow', name: 'Widow Sten', city: 'stonehaven', role: 'villager',
    model: 'woman', color: 0x8a8aa0, offset: { x: 34, z: -22 },
    greeting: { es: 'Mi marido no volvio de los tuneles.', en: 'My husband never came back from the tunnels.' },
    lines: {
      es: ['Si bajas, ten cuidado con los esqueletos.', 'Le tejo una bufanda cada invierno, por si vuelve.', 'La montana se queda con los que ama.'],
      en: ['If you go down, beware the skeletons.', 'I knit him a scarf each winter, just in case.', 'The mountain keeps the ones it loves.'],
    },
  },
  {
    id: 'stonehaven_lorekeeper', name: 'Lorekeeper Havel', city: 'stonehaven', role: 'questgiver',
    model: 'priest', color: 0xc9d0dc, district: 'library',
    greeting: { es: 'Los archivos guardan el nombre de cada rey.', en: 'The archives hold the name of every king.' },
    lines: {
      es: ['Un minotauro antiguo merodea las galerias hondas.', 'Trae su cuerno y lo anadire a la cronica.', 'El saber pesa mas que el oro, y dura mas.'],
      en: ['An ancient minotaur stalks the deep galleries.', 'Bring me its horn and I will add it to the chronicle.', 'Lore weighs more than gold, and lasts longer.'],
    },
  },
  {
    id: 'stonehaven_boy', name: 'Pebble', city: 'stonehaven', role: 'villager',
    model: 'man', color: 0x9a8a7a, offset: { x: 22, z: 26 },
    greeting: { es: 'Quiero ser minero como mi padre!', en: 'I want to be a miner like my dad!' },
    lines: {
      es: ['Encontre un cristal brillante el otro dia.', 'Dicen que hay un dragon de hielo bajo la montana.', 'Las cuevas hacen eco si gritas tu nombre.'],
      en: ['I found a shiny crystal the other day.', 'They say an ice dragon sleeps under the mountain.', 'The caves echo if you shout your name.'],
    },
  },
  {
    id: 'stonehaven_mayor', name: 'Steward Greta', city: 'stonehaven', role: 'mayor',
    model: 'king', color: 0x4a5a7a, offset: { x: 0, z: 20 },
    greeting: { es: 'Bienvenido al salon de Stonehaven.', en: 'Welcome to the hall of Stonehaven.' },
    lines: {
      es: ['Deseas residenciarte? Renaceras tras estos muros.', 'Mientras la piedra aguante, Stonehaven aguanta.'],
      en: ['Would you settle here? You will respawn behind these walls.', 'While the stone holds, Stonehaven holds.'],
    },
  },

  // Dragonreach: distant town near the dragon peaks.
  {
    id: 'dragonreach_priest', name: 'Oracle Sena', city: 'dragonreach', role: 'priest',
    model: 'priest', color: 0xf0d9b5, offset: { x: 0, z: -4 },
    greeting: { es: 'Los dragones observan desde las cumbres.', en: 'Dragons watch from the peaks.' },
    lines: {
      es: ['Solo los mas fuertes llegan tan lejos.', 'Cura tus heridas, las necesitaras.', 'El fuego antiguo aun arde alli arriba.'],
      en: ['Only the strongest reach this far.', 'Heal your wounds, you will need it.', 'Ancient fire still burns up there.'],
    },
  },
  {
    id: 'dragonreach_warden', name: 'Warden Kael', city: 'dragonreach', role: 'questgiver',
    model: 'man', color: 0xbf4a3a, offset: { x: -6, z: 3 },
    greeting: { es: 'Pocos se atreven a venir aqui.', en: 'Few dare to come here.' },
    lines: {
      es: ['Los demonios surgen de las grietas.', 'Detenlos y seras una leyenda.', 'La gloria espera a los temerarios.'],
      en: ['Demons rise from the rifts.', 'Stop them and become a legend.', 'Glory awaits the bold.'],
    },
  },
  {
    id: 'dragonreach_sage', name: 'Sage Orin', city: 'dragonreach', role: 'questgiver',
    model: 'wizard', color: 0x4a55a8, offset: { x: 6, z: 3 },
    greeting: { es: 'Conozco los secretos de los dragones.', en: 'I know the secrets of dragons.' },
    lines: {
      es: ['Las escamas de dragon tienen gran poder.', 'Traeme reliquias de las cumbres.', 'El saber antiguo abre nuevas puertas.'],
      en: ['Dragon scales hold great power.', 'Bring me relics from the peaks.', 'Old wisdom opens new doors.'],
    },
  },
  {
    id: 'dragonreach_guard', name: 'Guard Vesa', city: 'dragonreach', role: 'guard',
    model: 'guard', color: 0x9c5a4a, offset: { x: 5, z: -5 },
    greeting: { es: 'Este es el ultimo bastion del mundo.', en: 'This is the world last bastion.' },
    lines: {
      es: ['Mas alla solo hay fuego y garras.', 'Vigilo el cielo por si vuelan dragones.', 'No avances sin estar bien preparado.'],
      en: ['Beyond lie only fire and claws.', 'I watch the sky for flying dragons.', 'Do not advance unprepared.'],
    },
  },
  // --- Dragonreach vendors (one per district) and desert-city folk -----------
  {
    id: 'dragonreach_smith', name: 'Smith Khareth', city: 'dragonreach', role: 'vendor',
    model: 'smith', color: 0xbf5a3a, district: 'knight',
    shop: { buyMult: 1, sellMult: 0.4, sells: { kinds: ['armor', 'shield'], types: ['sword', 'axe', 'lance'] }, buys: { kinds: ['armor', 'shield'], types: ['sword', 'axe', 'lance'] } },
    greeting: { es: 'Acero templado en fuego de dragon.', en: 'Steel tempered in dragonfire.' },
    lines: {
      es: ['Forjo con carbon del desierto, arde mas caliente.', 'Una lanza larga mantiene a las garras lejos.'],
      en: ['I forge with desert coal, it burns hotter.', 'A long lance keeps the claws at bay.'],
    },
  },
  {
    id: 'dragonreach_potionseller', name: 'Embalmer Isi', city: 'dragonreach', role: 'vendor',
    model: 'apothecary', color: 0xc9a86a, district: 'potion',
    shop: { buyMult: 1, sellMult: 0.4, sells: { kinds: ['potion'] }, buys: { kinds: ['potion'] } },
    greeting: { es: 'Elixires contra el calor y el veneno.', en: 'Elixirs against heat and venom.' },
    lines: {
      es: ['El veneno de escorpion mata, pero tambien cura.', 'Bebe antes de cruzar las dunas, o caeras.'],
      en: ['Scorpion venom kills, but it also heals.', 'Drink before you cross the dunes, or you will drop.'],
    },
  },
  {
    id: 'dragonreach_enchanter', name: 'Enchanter Mose', city: 'dragonreach', role: 'vendor',
    model: 'wizard', color: 0x8a5abf, district: 'mage',
    shop: { buyMult: 1, sellMult: 0.4, sells: { types: ['wand'] }, buys: { types: ['wand'] } },
    greeting: { es: 'Varitas que canalizan el fuego antiguo.', en: 'Wands that channel the ancient fire.' },
    lines: {
      es: ['Las escamas de dragon guardan magia dormida.', 'Una varita de fuego no teme a la noche del desierto.'],
      en: ['Dragon scales hold sleeping magic.', 'A fire wand fears no desert night.'],
    },
  },
  {
    id: 'dragonreach_merchant', name: 'Caravan Master Dahl', city: 'dragonreach', role: 'vendor',
    model: 'merchant', color: 0xc89a4a, district: 'market',
    shop: { buyMult: 1, sellMult: 0.5, sells: { tiers: ['fruit', 'low'] }, buys: { tiers: ['fruit', 'low'] } },
    greeting: { es: 'Mi caravana cruza el desierto cada luna.', en: 'My caravan crosses the desert each moon.' },
    lines: {
      es: ['Datiles, agua y especias de tierras lejanas.', 'Compro reliquias; no preguntes de donde salen.'],
      en: ['Dates, water and spices from far lands.', 'I buy relics; do not ask where they come from.'],
    },
  },
  {
    id: 'dragonreach_banker', name: 'Treasurer Amset', city: 'dragonreach', role: 'banker',
    model: 'merchant', color: 0xd9b34a, offset: { x: -12, z: 0 },
    greeting: { es: 'La camara del tesoro esta sellada con runas.', en: 'The treasure chamber is sealed with runes.' },
    lines: {
      es: ['Ni la arena ni los ladrones entran aqui.', 'Guarda tu oro antes de retar a los dragones.'],
      en: ['Neither sand nor thieves get in here.', 'Store your gold before you challenge dragons.'],
    },
  },
  {
    id: 'dragonreach_scout', name: 'Scout Nima', city: 'dragonreach', role: 'questgiver',
    model: 'woman', color: 0xc0784a, offset: { x: -34, z: 22 },
    greeting: { es: 'He visto huellas de orco entre las dunas.', en: 'I have seen orc tracks among the dunes.' },
    lines: {
      es: ['Una partida de orcos acampa cerca del paso.', 'Despejalos y el camino al este quedara libre.', 'Conozco cada duna como las lineas de mi mano.'],
      en: ['An orc warband camps near the pass.', 'Clear them and the eastern road opens.', 'I know each dune like the lines of my hand.'],
    },
  },
  {
    id: 'dragonreach_digger', name: 'Tomb-digger Set', city: 'dragonreach', role: 'villager',
    model: 'man', color: 0xb08a5a, offset: { x: 34, z: 20 },
    greeting: { es: 'Cavar tumbas paga mejor de lo que crees.', en: 'Digging tombs pays better than you think.' },
    lines: {
      es: ['Las piramides esconden mas que faraones muertos.', 'No abras un sarcofago de noche. Hazme caso.', 'Las momias caminan cuando la luna esta llena.'],
      en: ['The pyramids hide more than dead pharaohs.', 'Never open a sarcophagus at night. Trust me.', 'Mummies walk when the moon is full.'],
    },
  },
  {
    id: 'dragonreach_dancer', name: 'Dancer Layla', city: 'dragonreach', role: 'villager',
    model: 'woman', color: 0xc05a8a, offset: { x: 24, z: -28 },
    greeting: { es: 'El desierto es duro; alegralo un poco.', en: 'The desert is harsh; brighten it a little.' },
    lines: {
      es: ['Bailo para los que vuelven vivos de las cumbres.', 'Una moneda y te cuento el rumor del dia.', 'Hasta los dragones se calman con buena musica.'],
      en: ['I dance for those who return alive from the peaks.', 'A coin and I will tell you today rumor.', 'Even dragons settle for good music.'],
    },
  },
  {
    id: 'dragonreach_keeper', name: 'Flamekeeper Ren', city: 'dragonreach', role: 'questgiver',
    model: 'priest', color: 0xe0a060, district: 'library',
    greeting: { es: 'La llama eterna no debe apagarse jamas.', en: 'The eternal flame must never die.' },
    lines: {
      es: ['Los demonios surgen cuando la llama flaquea.', 'Trae brasas de las grietas y la alimentare.', 'El fuego que cuido es mas viejo que la ciudad.'],
      en: ['Demons rise when the flame falters.', 'Bring embers from the rifts and I will feed it.', 'The fire I tend is older than the city.'],
    },
  },
  {
    id: 'dragonreach_mayor', name: 'Vizier Tahar', city: 'dragonreach', role: 'mayor',
    model: 'king', color: 0xa05a2a, offset: { x: 0, z: 20 },
    greeting: { es: 'Bienvenido a Dragonreach, el ultimo bastion.', en: 'Welcome to Dragonreach, the last bastion.' },
    lines: {
      es: ['Deseas residenciarte? Renaceras bajo las piramides.', 'Solo los valientes hacen hogar tan cerca de los dragones.'],
      en: ['Would you settle here? You will respawn beneath the pyramids.', 'Only the bold make a home this close to dragons.'],
    },
  },
  {
    id: 'dragonreach_orphan', name: 'Little Sufi', city: 'dragonreach', role: 'villager',
    model: 'man', color: 0xc99a6a, offset: { x: -22, z: -28 },
    greeting: { es: 'Vendiste algo a una momia alguna vez?', en: 'Ever sold something to a mummy?' },
    lines: {
      es: ['Recojo escamas brillantes en la arena.', 'Cuando sea grande montare un dragon. De verdad.', 'Si me das una moneda vigilo tu espalda.'],
      en: ['I collect shiny scales in the sand.', 'When I grow up I will ride a dragon. Really.', 'Give me a coin and I will watch your back.'],
    },
  },

  // ===========================================================================
  // Westharbor: a teal-roofed river PORT in the far west forest. Fishers,
  // shipwrights and sailors; its story is the sea trade and a lighthouse keeper.
  // ===========================================================================
  {
    id: 'westharbor_priest', name: 'Sister Coral', city: 'westharbor', role: 'priest',
    model: 'priest', color: 0xdcefe8, offset: { x: 0, z: -4 },
    greeting: { es: 'Que las mareas te traigan de vuelta.', en: 'May the tides bring you back.' },
    lines: {
      es: ['Bendigo cada barco antes de zarpar.', 'Cura aqui antes de salir a la costa.', 'El mar da y el mar quita.'],
      en: ['I bless every ship before it sails.', 'Heal here before you take the coast road.', 'The sea gives and the sea takes.'],
    },
  },
  {
    id: 'westharbor_harbormaster', name: 'Harbormaster Quill', city: 'westharbor', role: 'questgiver',
    model: 'man', color: 0x3a6a8f, offset: { x: -6, z: 4 },
    greeting: { es: 'Quien atraca en mi puerto responde ante mi.', en: 'Whoever docks in my port answers to me.' },
    lines: {
      es: ['Cangrejos gigantes destrozan las redes en la playa.', 'Limpia la costa y tendras tu paga en monedas de plata.', 'Conozco cada barco que entra y sale.'],
      en: ['Giant crabs wreck the nets on the beach.', 'Clear the shore and you will be paid in silver.', 'I know every ship that comes and goes.'],
    },
  },
  {
    id: 'westharbor_lighthouse', name: 'Keeper Maren', city: 'westharbor', role: 'questgiver',
    model: 'woman', color: 0x4a7a9a, offset: { x: 6, z: 4 },
    greeting: { es: 'Mantengo la luz encendida, llueva o truene.', en: 'I keep the light burning, rain or storm.' },
    lines: {
      es: ['Algo apaga mi faro de noche. No es el viento.', 'Sin la luz, los barcos chocan contra las rocas.', 'Sube conmigo y veras toda la costa oeste.'],
      en: ['Something snuffs my light at night. It is not the wind.', 'Without the light, ships break on the rocks.', 'Climb with me and you will see the whole west coast.'],
    },
  },
  {
    id: 'westharbor_guard', name: 'Guard Pell', city: 'westharbor', role: 'guard',
    model: 'guard', color: 0x5a7a8a, offset: { x: -5, z: -5 },
    greeting: { es: 'Vigilo los muelles dia y noche.', en: 'I watch the docks day and night.' },
    lines: {
      es: ['Los contrabandistas no descansan, ni yo.', 'Cuidado con las sirenas; cantan dulce y muerden fuerte.', 'Lleva un arma al salir por la costa.'],
      en: ['Smugglers never rest, and neither do I.', 'Beware the sirens; they sing sweet and bite hard.', 'Carry a weapon on the coast road.'],
    },
  },
  {
    id: 'westharbor_fisherman', name: 'Old Salt Bren', city: 'westharbor', role: 'villager',
    model: 'man', color: 0x4a6a7a, offset: { x: -34, z: 26 },
    greeting: { es: 'Cuarenta anos pescando y aun me sorprende.', en: 'Forty years fishing and it still surprises me.' },
    lines: {
      es: ['Saque una bota, un anillo y un pez con dientes hoy.', 'Si el mar esta calmo, desconfia.', 'El mejor cebo es la paciencia.'],
      en: ['Caught a boot, a ring and a fish with teeth today.', 'If the sea is calm, do not trust it.', 'The best bait is patience.'],
    },
  },
  {
    id: 'westharbor_weaponsmith', name: 'Smith Galen', city: 'westharbor', role: 'vendor',
    model: 'smith', color: 0x7a6a5a, district: 'knight',
    shop: { buyMult: 1, sellMult: 0.4, sells: { types: ['sword', 'axe'], kinds: ['shield'] }, buys: { types: ['sword', 'axe'], kinds: ['shield'] } },
    greeting: { es: 'Acero que no se oxida con la sal del mar.', en: 'Steel that does not rust in the sea salt.' },
    lines: {
      es: ['Forjo arpones y cuchillos de marinero.', 'La humedad come el hierro; el mio no.'],
      en: ['I forge harpoons and sailor knives.', 'Damp eats iron; not mine.'],
    },
  },
  {
    id: 'westharbor_netmender', name: 'Netmender Sora', city: 'westharbor', role: 'vendor',
    model: 'merchant', color: 0x4a8f7a, district: 'archer',
    shop: { buyMult: 1, sellMult: 0.4, sells: { types: ['bow'] }, buys: { types: ['bow'] } },
    greeting: { es: 'Arcos y ballestas, secos y listos.', en: 'Bows and crossbows, dry and ready.' },
    lines: {
      es: ['Tenso cuerdas de barco, las mejores que hay.', 'Un buen tiro alcanza al ave antes de que vuele.'],
      en: ['I string ship-rope, the finest there is.', 'A good shot drops the bird before it flies.'],
    },
  },
  {
    id: 'westharbor_apothecary', name: 'Brewer Tidd', city: 'westharbor', role: 'vendor',
    model: 'apothecary', color: 0x5a9a8a, district: 'potion',
    shop: { buyMult: 1, sellMult: 0.4, sells: { kinds: ['potion'] }, buys: { kinds: ['potion'] } },
    greeting: { es: 'Tonicos contra el mareo y las heridas.', en: 'Tonics for seasickness and wounds.' },
    lines: {
      es: ['Algas, sal y un secreto que no contare.', 'Bebe esto y ni la peor tormenta te tumba.'],
      en: ['Kelp, salt and a secret I will not tell.', 'Drink this and no storm will lay you low.'],
    },
  },
  {
    id: 'westharbor_wandseller', name: 'Tidecaller Wisp', city: 'westharbor', role: 'vendor',
    model: 'wizard', color: 0x4a6abf, district: 'mage',
    shop: { buyMult: 1, sellMult: 0.4, sells: { types: ['wand'] }, buys: { types: ['wand'] } },
    greeting: { es: 'Magia de agua, fria y profunda.', en: 'Water magic, cold and deep.' },
    lines: {
      es: ['Cada varita la pulio una corriente marina.', 'El mar tiene su propia magia; yo solo la pido prestada.'],
      en: ['Each wand was polished by an ocean current.', 'The sea has its own magic; I only borrow it.'],
    },
  },
  {
    id: 'westharbor_fishmonger', name: 'Fishwife Della', city: 'westharbor', role: 'vendor',
    model: 'woman', color: 0x4a8a9a, district: 'market',
    shop: { buyMult: 1, sellMult: 0.55, sells: { tiers: ['fruit', 'low'] }, buys: { tiers: ['fruit', 'low'] } },
    greeting: { es: 'Pescado fresco! Lo de esta manana!', en: 'Fresh fish! Caught this morning!' },
    lines: {
      es: ['Grito mas fuerte que las gaviotas, y vendo mas.', 'Compro lo que cae de los bichos para el guiso.'],
      en: ['I shout louder than the gulls, and sell more.', 'I buy what drops from beasts, for the chowder.'],
    },
  },
  {
    id: 'westharbor_banker', name: 'Banker Coyne', city: 'westharbor', role: 'banker',
    model: 'merchant', color: 0xd9b34a, offset: { x: -12, z: 0 },
    greeting: { es: 'El oro flota mejor en mi boveda que en el mar.', en: 'Gold floats better in my vault than in the sea.' },
    lines: {
      es: ['Los marineros pierden monedas; yo las guardo.', 'Deposita antes de zarpar, por si naufragas.'],
      en: ['Sailors lose coins; I keep them.', 'Deposit before you sail, in case you sink.'],
    },
  },
  {
    id: 'westharbor_shipwright', name: 'Shipwright Honce', city: 'westharbor', role: 'villager',
    model: 'man', color: 0x6a5a3a, offset: { x: 36, z: -20 },
    greeting: { es: 'Una buena quilla es media travesia.', en: 'A good keel is half the voyage.' },
    lines: {
      es: ['Construi el barco mas rapido de la costa.', 'La madera del bosque oeste es la mejor para casco.', 'Un dia cruzare el oceano hasta el borde del mundo.'],
      en: ['I built the fastest ship on the coast.', 'West-forest wood is the best for a hull.', 'One day I will sail to the edge of the world.'],
    },
  },
  {
    id: 'westharbor_sailor', name: 'Sailor Jónsa', city: 'westharbor', role: 'villager',
    model: 'woman', color: 0x3a7a8f, offset: { x: 28, z: 26 },
    greeting: { es: 'He visto cosas en mar abierto, creeme.', en: 'I have seen things on the open sea, believe me.' },
    lines: {
      es: ['Una isla que no estaba en ningun mapa.', 'Las tormentas del oeste cantan antes de golpear.', 'En tierra firme me mareo. Es verdad.'],
      en: ['An island that was on no map at all.', 'The western storms sing before they strike.', 'On dry land I get dizzy. It is true.'],
    },
  },
  {
    id: 'westharbor_child', name: 'Gull-boy Finn', city: 'westharbor', role: 'villager',
    model: 'man', color: 0x7aa0b0, offset: { x: -24, z: -26 },
    greeting: { es: 'Le doy de comer a las gaviotas. Son mis amigas.', en: 'I feed the gulls. They are my friends.' },
    lines: {
      es: ['Una gaviota me trajo una moneda de oro!', 'Cuando crezca sere capitana, digo capitan.', 'Si silbas asi, vienen volando todas.'],
      en: ['A gull brought me a gold coin once!', 'When I grow up I will be a captain.', 'Whistle like this and they all come flying.'],
    },
  },
  {
    id: 'westharbor_mayor', name: 'Portreeve Adra', city: 'westharbor', role: 'mayor',
    model: 'king', color: 0x2f6a64, offset: { x: 0, z: 20 },
    greeting: { es: 'Bienvenido a Westharbor, puerta del oeste.', en: 'Welcome to Westharbor, gate of the west.' },
    lines: {
      es: ['Deseas residenciarte? Renaceras junto al faro.', 'Aqui todo el mundo llega por mar o no llega.'],
      en: ['Would you settle here? You will respawn by the lighthouse.', 'Here everyone arrives by sea, or not at all.'],
    },
  },

  // ===========================================================================
  // Frostpeak: a frozen mining outpost in the far north, sharper and colder than
  // Stonehaven. Ice miners, a wolf-tamer and an ice-dragon legend.
  // ===========================================================================
  {
    id: 'frostpeak_priest', name: 'Father Yule', city: 'frostpeak', role: 'priest',
    model: 'priest', color: 0xeaf2f8, offset: { x: 0, z: -4 },
    greeting: { es: 'Que el calor del hogar nunca te falte.', en: 'May the hearth-warmth never leave you.' },
    lines: {
      es: ['Rezo por los que el hielo se llevo.', 'Cura aqui; afuera el frio no perdona.', 'La fe es la unica hoguera que no se apaga.'],
      en: ['I pray for those the ice took.', 'Heal here; outside the cold forgives nothing.', 'Faith is the one fire that never goes out.'],
    },
  },
  {
    id: 'frostpeak_foreman', name: 'Foreman Ingr', city: 'frostpeak', role: 'questgiver',
    model: 'guard', color: 0xb0c4d4, offset: { x: -6, z: 4 },
    greeting: { es: 'El hielo guarda mineral, si sabes picar.', en: 'The ice hides ore, if you know how to dig.' },
    lines: {
      es: ['Los elementales de hielo bloquean la galeria norte.', 'Rompelos y la mina volvera a producir.', 'Aqui el que no trabaja, se congela.'],
      en: ['Ice elementals block the north gallery.', 'Break them and the mine produces again.', 'Here, the one who does not work, freezes.'],
    },
  },
  {
    id: 'frostpeak_tamer', name: 'Wolf-tamer Skadi', city: 'frostpeak', role: 'questgiver',
    model: 'woman', color: 0x8aa8c4, offset: { x: 6, z: 4 },
    greeting: { es: 'Mis lobos son mas leales que la mayoria.', en: 'My wolves are more loyal than most people.' },
    lines: {
      es: ['Una manada salvaje acosa el paso del norte.', 'Traeme sus colmillos y amaestrare a los cachorros.', 'Un lobo te huele el miedo antes de verte.'],
      en: ['A wild pack harries the north pass.', 'Bring me their fangs and I will tame the pups.', 'A wolf smells your fear before it sees you.'],
    },
  },
  {
    id: 'frostpeak_guard', name: 'Guard Borin', city: 'frostpeak', role: 'guard',
    model: 'guard', color: 0x9ab4c8, offset: { x: -5, z: -5 },
    greeting: { es: 'Aguanto en el muro aunque hiele las cejas.', en: 'I hold the wall even when it frosts my brows.' },
    lines: {
      es: ['Los trolls de hielo bajan con la ventisca.', 'Si ves brillar el cielo de noche, escondete.', 'Manten el escudo en alto, congela menos asi.'],
      en: ['Ice trolls come down with the blizzard.', 'If the night sky glows, take cover.', 'Keep the shield up, it frosts less that way.'],
    },
  },
  {
    id: 'frostpeak_iceminer', name: 'Iceminer Hodd', city: 'frostpeak', role: 'villager',
    model: 'man', color: 0x7a98b0, offset: { x: -34, z: 26 },
    greeting: { es: 'Pico hielo azul, el que no se derrite.', en: 'I mine blue ice, the kind that never melts.' },
    lines: {
      es: ['El hielo azul vale mas que el oro en el sur.', 'Encontre un mamut entero congelado el otro dia.', 'Si oyes crujir el suelo, corre. No mires.'],
      en: ['Blue ice is worth more than gold down south.', 'Found a whole frozen mammoth the other day.', 'If the ground cracks, run. Do not look.'],
    },
  },
  {
    id: 'frostpeak_armorer', name: 'Smith Frida', city: 'frostpeak', role: 'vendor',
    model: 'smith', color: 0xa0b0c0, district: 'knight',
    shop: { buyMult: 1, sellMult: 0.4, sells: { kinds: ['armor', 'shield'], types: ['mace', 'axe'] }, buys: { kinds: ['armor', 'shield'], types: ['mace', 'axe'] } },
    greeting: { es: 'Armadura forrada para el frio del norte.', en: 'Armor lined for the northern cold.' },
    lines: {
      es: ['Forjo junto a la unica fragua caliente del pueblo.', 'Pesada y abrigada: no morirás de hierro ni de frio.'],
      en: ['I forge by the only warm hearth in town.', 'Heavy and warm: you will die of neither iron nor cold.'],
    },
  },
  {
    id: 'frostpeak_hunter', name: 'Furrier Vask', city: 'frostpeak', role: 'vendor',
    model: 'merchant', color: 0x7a8a9a, district: 'archer',
    shop: { buyMult: 1, sellMult: 0.4, sells: { types: ['bow'] }, buys: { types: ['bow'] } },
    greeting: { es: 'Arcos de hueso de morsa, no se hielan.', en: 'Walrus-bone bows, they never freeze.' },
    lines: {
      es: ['Cazo focas y osos blancos en la banquisa.', 'Un arco de hueso aguanta el frio mejor que la madera.'],
      en: ['I hunt seals and white bears on the ice.', 'A bone bow takes the cold better than wood.'],
    },
  },
  {
    id: 'frostpeak_apothecary', name: 'Healer Embla', city: 'frostpeak', role: 'vendor',
    model: 'apothecary', color: 0x8ab0a0, district: 'potion',
    shop: { buyMult: 1, sellMult: 0.4, sells: { kinds: ['potion'] }, buys: { kinds: ['potion'] } },
    greeting: { es: 'Pociones que descongelan hasta los huesos.', en: 'Potions that thaw you to the bone.' },
    lines: {
      es: ['Mezclo musgo de nieve y grasa de oso.', 'Sin una de estas, no cruces el paso del norte.'],
      en: ['I mix snow-moss and bear fat.', 'Without one of these, do not cross the north pass.'],
    },
  },
  {
    id: 'frostpeak_seer', name: 'Frost-seer Auni', city: 'frostpeak', role: 'vendor',
    model: 'wizard', color: 0x7fb0cc, district: 'mage',
    shop: { buyMult: 1, sellMult: 0.4, sells: { types: ['wand'] }, buys: { types: ['wand'] } },
    greeting: { es: 'El hielo me muestra lo que vendra.', en: 'The ice shows me what is to come.' },
    lines: {
      es: ['Una varita de escarcha congela en un parpadeo.', 'Vi un dragon de hielo en mis suenos. Sigue dormido.'],
      en: ['A frost wand freezes in a blink.', 'I saw an ice dragon in my dreams. It still sleeps.'],
    },
  },
  {
    id: 'frostpeak_trader', name: 'Trader Olin', city: 'frostpeak', role: 'vendor',
    model: 'merchant', color: 0xc0a070, district: 'market',
    shop: { buyMult: 1, sellMult: 0.5, sells: { tiers: ['fruit', 'low'] }, buys: { tiers: ['fruit', 'low'] } },
    greeting: { es: 'Comida que aguanta el invierno entero.', en: 'Food that lasts the whole winter.' },
    lines: {
      es: ['Pescado seco, bayas heladas y caldo de hueso.', 'El sur me trae fruta; yo le mando hielo azul.'],
      en: ['Dried fish, frozen berries and bone broth.', 'The south sends me fruit; I send them blue ice.'],
    },
  },
  {
    id: 'frostpeak_banker', name: 'Banker Sigr', city: 'frostpeak', role: 'banker',
    model: 'merchant', color: 0xd9b34a, offset: { x: -12, z: 0 },
    greeting: { es: 'Tu oro no se congela en mi boveda.', en: 'Your gold will not freeze in my vault.' },
    lines: {
      es: ['Tallada en glaciar, mas dura que cualquier muro.', 'Guarda tus monedas antes de subir al paso.'],
      en: ['Cut into a glacier, harder than any wall.', 'Store your coins before you climb the pass.'],
    },
  },
  {
    id: 'frostpeak_oldwoman', name: 'Granny Haela', city: 'frostpeak', role: 'villager',
    model: 'woman', color: 0xb0bcc8, offset: { x: 34, z: -20 },
    greeting: { es: 'Sienta-te junto al fuego, criatura.', en: 'Sit by the fire, child.' },
    lines: {
      es: ['He visto cuarenta inviernos y todos quisieron matarme.', 'El dragon de hielo es real; mi abuela lo vio.', 'Bebe algo caliente o te saldra escarcha por dentro.'],
      en: ['I have seen forty winters, and all of them tried to kill me.', 'The ice dragon is real; my grandmother saw it.', 'Drink something hot or you will frost from within.'],
    },
  },
  {
    id: 'frostpeak_boy', name: 'Snowball', city: 'frostpeak', role: 'villager',
    model: 'man', color: 0x9ab0c4, offset: { x: 24, z: 26 },
    greeting: { es: 'Te tiro una bola de nieve? Es broma. O no.', en: 'Want a snowball? Joking. Or not.' },
    lines: {
      es: ['Hice un muneco mas alto que mi padre!', 'Patino sobre el lago helado, pero no se lo digas a mama.', 'Los lobos de Skadi me dejan acariciarlos.'],
      en: ['I built a snowman taller than my dad!', 'I skate on the frozen lake, but do not tell mama.', 'Skadi wolves let me pet them.'],
    },
  },
  {
    id: 'frostpeak_explorer', name: 'Explorer Tove', city: 'frostpeak', role: 'questgiver',
    model: 'man', color: 0x6a8aa0, district: 'library',
    greeting: { es: 'He cartografiado glaciares que nadie pisara.', en: 'I have mapped glaciers no one will ever walk.' },
    lines: {
      es: ['Mas al norte hay un templo bajo el hielo.', 'Traeme una reliquia helada y marcare el camino.', 'El frio borra las huellas; el mapa, no.'],
      en: ['Further north there is a temple under the ice.', 'Bring me a frozen relic and I will mark the way.', 'The cold erases tracks; the map does not.'],
    },
  },
  {
    id: 'frostpeak_mayor', name: 'Jarl Stenn', city: 'frostpeak', role: 'mayor',
    model: 'king', color: 0x4a6a8a, offset: { x: 0, z: 20 },
    greeting: { es: 'Bienvenido a Frostpeak, donde el hielo manda.', en: 'Welcome to Frostpeak, where the ice rules.' },
    lines: {
      es: ['Deseas residenciarte? Renaceras junto a la torre de hielo.', 'Quien sobrevive a un invierno aqui, sobrevive a todo.'],
      en: ['Would you settle here? You will respawn by the ice tower.', 'Survive one winter here and you survive anything.'],
    },
  },

  // ===========================================================================
  // Sandport: a sun-baked OASIS town in the far south-east desert. Caravans,
  // glassblowers, a water-keeper guarding the precious pool.
  // ===========================================================================
  {
    id: 'sandport_priest', name: 'Oasis-keeper Nael', city: 'sandport', role: 'priest',
    model: 'priest', color: 0xf2e2c0, offset: { x: 0, z: -4 },
    greeting: { es: 'El agua es vida; bebe y descansa.', en: 'Water is life; drink and rest.' },
    lines: {
      es: ['Bendigo el pozo cada amanecer.', 'Cura aqui antes de cruzar las dunas.', 'Quien protege el agua, protege a todos.'],
      en: ['I bless the well each dawn.', 'Heal here before you cross the dunes.', 'Who guards the water guards everyone.'],
    },
  },
  {
    id: 'sandport_waterkeeper', name: 'Water-keeper Zila', city: 'sandport', role: 'questgiver',
    model: 'woman', color: 0xc0a060, offset: { x: -6, z: 4 },
    greeting: { es: 'El oasis se seca. Necesito tu ayuda.', en: 'The oasis is drying. I need your help.' },
    lines: {
      es: ['Escorpiones gigantes envenenan el manantial.', 'Limpia el nido y el agua volvera a fluir limpia.', 'Sin el oasis, Sandport es solo arena.'],
      en: ['Giant scorpions poison the spring.', 'Clear the nest and the water will run clean again.', 'Without the oasis, Sandport is just sand.'],
    },
  },
  {
    id: 'sandport_caravan', name: 'Caravaneer Rashid', city: 'sandport', role: 'questgiver',
    model: 'man', color: 0xc89a5a, offset: { x: 6, z: 4 },
    greeting: { es: 'Mi ruta cruza dunas que matan a los necios.', en: 'My route crosses dunes that kill the foolish.' },
    lines: {
      es: ['Bandidos del desierto asaltan mis caravanas.', 'Echalos del paso y compartire mis rutas secretas.', 'Una caravana es una ciudad que camina.'],
      en: ['Desert bandits raid my caravans.', 'Drive them from the pass and I will share my secret routes.', 'A caravan is a city that walks.'],
    },
  },
  {
    id: 'sandport_guard', name: 'Guard Halun', city: 'sandport', role: 'guard',
    model: 'guard', color: 0xa07a4a, offset: { x: -5, z: -5 },
    greeting: { es: 'Vigilo el oasis bajo el sol implacable.', en: 'I watch the oasis under the merciless sun.' },
    lines: {
      es: ['Las momias salen de las tumbas al anochecer.', 'No bebas agua que no venga del pozo bendecido.', 'El sol mata mas que cualquier espada aqui.'],
      en: ['Mummies rise from the tombs at dusk.', 'Do not drink water that is not from the blessed well.', 'The sun kills more than any blade here.'],
    },
  },
  {
    id: 'sandport_glassblower', name: 'Glassblower Suri', city: 'sandport', role: 'villager',
    model: 'woman', color: 0xc06a8a, offset: { x: -34, z: 26 },
    greeting: { es: 'Hago cristal de la propia arena. Mira.', en: 'I make glass from the sand itself. Look.' },
    lines: {
      es: ['El fuego del desierto funde la arena en vidrio.', 'Mis lamparas iluminan media ciudad.', 'Un dia hare una ventana del tamano de una puerta.'],
      en: ['Desert fire melts the sand into glass.', 'My lamps light half the town.', 'One day I will make a window the size of a door.'],
    },
  },
  {
    id: 'sandport_smith', name: 'Smith Jabir', city: 'sandport', role: 'vendor',
    model: 'smith', color: 0xbf7a3a, district: 'knight',
    shop: { buyMult: 1, sellMult: 0.4, sells: { types: ['sword', 'axe', 'lance'], kinds: ['shield'] }, buys: { types: ['sword', 'axe', 'lance'], kinds: ['shield'] } },
    greeting: { es: 'Curvas como la luna, afiladas como el sol.', en: 'Curved like the moon, sharp as the sun.' },
    lines: {
      es: ['Mis cimitarras cortan la seda al caer.', 'El acero del desierto es ligero y rapido.'],
      en: ['My scimitars cut falling silk.', 'Desert steel is light and swift.'],
    },
  },
  {
    id: 'sandport_bowyer', name: 'Bowyer Faris', city: 'sandport', role: 'vendor',
    model: 'merchant', color: 0xa0903a, district: 'archer',
    shop: { buyMult: 1, sellMult: 0.4, sells: { types: ['bow'] }, buys: { types: ['bow'] } },
    greeting: { es: 'Arcos cortos para disparar a caballo.', en: 'Short bows for shooting from the saddle.' },
    lines: {
      es: ['Un jinete arquero es el terror del desierto.', 'Flechas con plumas de buitre, vuelan rectas.'],
      en: ['A horse-archer is the terror of the desert.', 'Arrows fletched with vulture feathers fly straight.'],
    },
  },
  {
    id: 'sandport_apothecary', name: 'Herbalist Dunya', city: 'sandport', role: 'vendor',
    model: 'apothecary', color: 0x9aa05a, district: 'potion',
    shop: { buyMult: 1, sellMult: 0.4, sells: { kinds: ['potion'] }, buys: { kinds: ['potion'] } },
    greeting: { es: 'Remedios del oasis contra el veneno y el sol.', en: 'Oasis remedies against venom and sun.' },
    lines: {
      es: ['El cactus tiene agua y el aloe cura quemaduras.', 'Lleva una pocion fria o el sol te tumbara.'],
      en: ['The cactus holds water and aloe heals burns.', 'Carry a cool potion or the sun will lay you low.'],
    },
  },
  {
    id: 'sandport_mystic', name: 'Sand-mystic Oren', city: 'sandport', role: 'vendor',
    model: 'wizard', color: 0xbf9a4a, district: 'mage',
    shop: { buyMult: 1, sellMult: 0.4, sells: { types: ['wand'] }, buys: { types: ['wand'] } },
    greeting: { es: 'La arena guarda secretos de mil anos.', en: 'The sand holds secrets a thousand years old.' },
    lines: {
      es: ['Una varita de sol abrasa a quien toca.', 'Leo el futuro en como cae la arena.'],
      en: ['A sun wand scorches whoever it touches.', 'I read the future in how the sand falls.'],
    },
  },
  {
    id: 'sandport_spicetrader', name: 'Spice-trader Maha', city: 'sandport', role: 'vendor',
    model: 'woman', color: 0xc07a3a, district: 'market',
    shop: { buyMult: 1, sellMult: 0.55, sells: { tiers: ['fruit', 'low'] }, buys: { tiers: ['fruit', 'low'] } },
    greeting: { es: 'Especias que valen su peso en oro!', en: 'Spices worth their weight in gold!' },
    lines: {
      es: ['Azafran, comino y datiles dulces como la miel.', 'Compro lo que traen los cazadores; todo tiene uso.'],
      en: ['Saffron, cumin and dates sweet as honey.', 'I buy what hunters bring; everything has a use.'],
    },
  },
  {
    id: 'sandport_banker', name: 'Banker Qasim', city: 'sandport', role: 'banker',
    model: 'merchant', color: 0xd9b34a, offset: { x: -12, z: 0 },
    greeting: { es: 'Bajo la arena guardo tu fortuna a salvo.', en: 'Beneath the sand I keep your fortune safe.' },
    lines: {
      es: ['Ni el viento ni los bandidos hallan mi boveda.', 'Deposita antes de adentrarte en las dunas.'],
      en: ['Neither wind nor bandits find my vault.', 'Deposit before you venture into the dunes.'],
    },
  },
  {
    id: 'sandport_storyteller', name: 'Storyteller Bahar', city: 'sandport', role: 'villager',
    model: 'man', color: 0xa0703a, offset: { x: 36, z: -20 },
    greeting: { es: 'Una moneda, y te cuento las mil dunas.', en: 'One coin, and I will tell you the thousand dunes.' },
    lines: {
      es: ['Conozco la historia de cada faraon enterrado.', 'Dicen que un genio vive en el pozo viejo.', 'El desierto recuerda todo lo que olvidamos.'],
      en: ['I know the tale of every buried pharaoh.', 'They say a genie lives in the old well.', 'The desert remembers all we forget.'],
    },
  },
  {
    id: 'sandport_child', name: 'Little Amira', city: 'sandport', role: 'villager',
    model: 'woman', color: 0xd07a90, offset: { x: 24, z: 26 },
    greeting: { es: 'Mira mi escarabajo de la suerte!', en: 'Look at my lucky beetle!' },
    lines: {
      es: ['Hago castillos de arena mas altos que yo.', 'El agua del oasis sabe mejor que cualquier cosa.', 'Cuando sea grande guiare caravanas.'],
      en: ['I build sand castles taller than me.', 'The oasis water tastes better than anything.', 'When I grow up I will guide caravans.'],
    },
  },
  {
    id: 'sandport_oldman', name: 'Old Tariq', city: 'sandport', role: 'villager',
    model: 'man', color: 0xb09060, offset: { x: -24, z: -26 },
    greeting: { es: 'Llevo aqui desde antes que el pozo tuviera nombre.', en: 'I have been here since before the well had a name.' },
    lines: {
      es: ['Vi caer una estrella en las dunas del este.', 'Donde cayo, la arena brilla de noche.', 'El sol y yo somos viejos conocidos.'],
      en: ['I saw a star fall in the eastern dunes.', 'Where it fell, the sand glows at night.', 'The sun and I are old acquaintances.'],
    },
  },
  {
    id: 'sandport_mayor', name: 'Sheikh Idris', city: 'sandport', role: 'mayor',
    model: 'king', color: 0x9a6a2a, offset: { x: 0, z: 20 },
    greeting: { es: 'Bienvenido a Sandport, joya del desierto.', en: 'Welcome to Sandport, jewel of the desert.' },
    lines: {
      es: ['Deseas residenciarte? Renaceras junto al oasis.', 'Aqui el agua se comparte y el extrano es huesped.'],
      en: ['Would you settle here? You will respawn by the oasis.', 'Here water is shared and the stranger is a guest.'],
    },
  },
];

// A "remains buyer" in EVERY city: buys creature trophies (rat tail, demon horn,
// dragon claw…) for small money so players have a steady grind-and-sell income.
// Generated for each city so we don't hand-write one per town.
const REMAINS_CITIES = ['rivertown', 'oakvale', 'stonehaven', 'frostpeak', 'sandport', 'westharbor', 'dragonreach'];
const REMAINS_NAMES = {
  rivertown: 'Tanner Gus', oakvale: 'Old Wregg', stonehaven: 'Grizzla',
  frostpeak: 'Frostpelt Yan', sandport: 'Bonepicker Sett', westharbor: 'Salty Mara',
  dragonreach: 'Scaler Dorn',
};
for (let i = 0; i < REMAINS_CITIES.length; i++) {
  const city = REMAINS_CITIES[i];
  NPCS.push({
    id: `${city}_remains_buyer`, name: REMAINS_NAMES[city] || 'Remains Buyer', city, role: 'vendor',
    model: 'merchant', color: 0x7a6a4a, district: 'food',
    offset: { x: 14 + (i % 3) * 3, z: -14 - (i % 2) * 3 },
    // Buys trophies AND crafting materials (silk, hides, scales, fangs, essences…),
    // paying value × sellMult — a steady grind-and-sell income loop.
    shop: { buyMult: 1, sellMult: 0.5, sells: {}, buys: { kinds: ['trophy', 'material'] } },
    greeting: { es: 'Compro restos y materiales de bestias. Trae colas, sedas, cuernos, escamas...', en: 'I buy beast remains and materials. Bring tails, silk, horns, scales...' },
    lines: {
      es: ['Todo resto tiene su precio, por humilde que sea.', 'Los cazadores listos venden hasta las colas de rata.'],
      en: ['Every scrap has a price, however humble.', 'Smart hunters sell even rat tails.'],
    },
  });
}

// A loose RENEGADE ORC standing in the wild near the orc camp. Non-aggressive,
// gives a quest, but speaks an INVENTED orc tongue the player can't read — its
// lines are gibberish words (orcLang), so the player shrugs and moves on unless
// they puzzle out the quest. worldPos places it out in the world (no city).
NPCS.push({
  id: 'renegade_orc', name: 'Grakûl', role: 'questgiver',
  model: 'orc', color: 0x6a8a4a,
  worldPos: { x: 470, z: -200 },   // just outside the orc-territory zone
  orcLang: true,                   // dialog rendered in gibberish orc speech
  greeting: { es: 'Gruk... zog mâ thrazak?', en: 'Gruk... zog mâ thrazak?' },
  lines: {
    es: ['Brakka thûm gûl-gûl. Zarrak!', 'Mog... mog uzdûk thar. Nazg brakk?', 'Wagh! Thrak-thrak ozûl.'],
    en: ['Brakka thûm gûl-gûl. Zarrak!', 'Mog... mog uzdûk thar. Nazg brakk?', 'Wagh! Thrak-thrak ozûl.'],
  },
});

const NPC_MAP = new Map(NPCS.map((n) => [n.id, n]));

export function getNpc(id) { return NPC_MAP.get(id); }

export function npcsForCity(cityId) { return NPCS.filter((n) => n.city === cityId); }

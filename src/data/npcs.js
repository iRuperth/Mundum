// Pure data module: quest-giver and flavor NPCs for each city.
// No Three.js, no DOM. UI strings carry both languages via {es,en}.

// Layout notes: offsets are relative to the city temple center.
// Reserved spots to avoid: temple at (0,0), shop at (+9,0),
// depot at (-9,0), portal at (0,+11). Keep offsets within ~ -14..14.

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
    id: 'rivertown_merchant', name: 'Merchant Bea', city: 'rivertown', role: 'merchant',
    model: 'woman', color: 0xd2a04b, offset: { x: 5, z: 5 },
    greeting: { es: 'Buenas ofertas para aventureros!', en: 'Great deals for adventurers!' },
    lines: {
      es: ['La tienda esta justo al este de la plaza.', 'Guarda tus tesoros en el deposito.', 'El oro siempre encuentra buen uso.'],
      en: ['The shop is just east of the plaza.', 'Store your treasures in the depot.', 'Gold always finds good use.'],
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
];

const NPC_MAP = new Map(NPCS.map((n) => [n.id, n]));

export function getNpc(id) { return NPC_MAP.get(id); }

export function npcsForCity(cityId) { return NPCS.filter((n) => n.city === cityId); }

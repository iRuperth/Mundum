// Lightweight i18n. Spanish is the default; English is optional.
// Item proper names stay in English in both languages (set in the data module).
const STRINGS = {
  es: {
    createHero: 'Crea tu personaje',
    name: 'Nombre',
    namePlaceholder: 'Aventurero',
    play: 'Jugar',
    male: 'Chico',
    female: 'Chica',
    hairShort: 'Corto',
    hairLong: 'Largo',
    hairSpiky: 'Puntas',
    hairBald: 'Calvo',
    phaseTag: 'Fase 2 · Combate, criaturas e items',

    hintDesktop: 'WASD moverse · Espacio saltar · Shift correr · Clic atacar · C cámara · E interactuar · I mochila · Enter chat',
    level: 'Nivel',
    hp: 'Vida',
    xp: 'Exp',
    capacity: 'Capacidad',
    city: 'Ciudad',
    enemy: 'Enemigo',
    player: 'Jugador',
    wilderness: 'Tierras salvajes',

    slotAmulet: 'Amuleto',
    slotHelmet: 'Casco',
    slotWeapon: 'Arma',
    slotArmor: 'Armadura',
    slotShield: 'Escudo',
    slotLegs: 'Pantalón',
    slotBoots: 'Botas',
    slotBag: 'Mochila',
    backpack: 'Mochila',

    attack: 'Ataque',
    defense: 'Defensa',
    element: 'Elemento',
    weight: 'Peso',
    levelReq: 'Nivel req.',

    equip: 'Equipar',
    unequip: 'Quitar',
    drop: 'Tirar',
    use: 'Usar',
    buy: 'Comprar',
    sell: 'Vender',
    close: 'Cerrar',
    trade: 'Intercambiar',
    talk: 'Hablar',
    cancel: 'Cancelar',
    accept: 'Aceptar',
    offer: 'Ofrecer',

    youDied: 'Has muerto',
    respawn: 'Reaparecer',
    lostItem: 'Has perdido: ',
    keptItems: 'No perdiste nada del equipo',
    gainedXp: '+{0} exp',
    levelUp: '¡Subiste al nivel {0}!',
    looted: 'Conseguiste: {0}',
    gold: 'Oro',
    full: 'No puedes cargar más',
    needLevel: 'Necesitas nivel {0}',
    tooHeavy: 'Demasiado pesado',

    event2xp: '¡Evento: Experiencia x2!',
    event2drop: '¡Evento: Botín x2!',
    weekendXp: '¡Finde: Experiencia x2!',
    night: 'Noche · criaturas +30% daño',

    shop: 'Tienda',
    depot: 'Depósito',
    depotHint: 'Guarda objetos a salvo en esta ciudad',
    teleport: 'Teleport',
    teleportHint: 'Viaja a otra ciudad',
    travel: 'Viajar',
    temple: 'Templo',
    questBoard: 'Misiones',
    chest: 'Cofre',
    interact: 'Pulsa E para interactuar',
    healed: '¡Curado!',
    questDone: '¡Misión completada!',
    firstQuestHint: 'Mira tus misiones arriba a la izquierda y el mapa para llegar',
    onboard1: 'Pulsa E para hablar con el NPC que brilla y coger una misión',
    onboard2: 'Haz clic para atacar criaturas y recoge su botín',
    onboard3: 'Cúrate gratis en el templo, compra en la tienda, guarda en el depósito',

    connected: '{0} se ha conectado',
    disconnected: '{0} se ha desconectado',
    friendAdded: '{0} añadido a amigos',
    addFriend: 'Agregar amigo',
    friends: 'Amigos',
    tradeRequest: '{0} quiere intercambiar',
    tradeDone: 'Intercambio completado',
    tradeCancelled: 'Intercambio cancelado',

    offline: 'Sin conexión · modo local',
    chatPlaceholder: 'Escribe y pulsa Enter…',
  },
  en: {
    createHero: 'Create your hero',
    name: 'Name',
    namePlaceholder: 'Adventurer',
    play: 'Play',
    male: 'Boy',
    female: 'Girl',
    hairShort: 'Short',
    hairLong: 'Long',
    hairSpiky: 'Spiky',
    hairBald: 'Bald',
    phaseTag: 'Phase 2 · Combat, creatures and items',

    hintDesktop: 'WASD move · Space jump · Shift run · Click attack · C camera · E interact · I backpack · Enter chat',
    level: 'Level',
    hp: 'HP',
    xp: 'Exp',
    capacity: 'Capacity',
    city: 'City',
    enemy: 'Enemy',
    player: 'You',
    wilderness: 'Wilderness',

    slotAmulet: 'Amulet',
    slotHelmet: 'Helmet',
    slotWeapon: 'Weapon',
    slotArmor: 'Armor',
    slotShield: 'Shield',
    slotLegs: 'Legs',
    slotBoots: 'Boots',
    slotBag: 'Bag',
    backpack: 'Backpack',

    attack: 'Attack',
    defense: 'Defense',
    element: 'Element',
    weight: 'Weight',
    levelReq: 'Level req.',

    equip: 'Equip',
    unequip: 'Unequip',
    drop: 'Drop',
    use: 'Use',
    buy: 'Buy',
    sell: 'Sell',
    close: 'Close',
    trade: 'Trade',
    talk: 'Talk',
    cancel: 'Cancel',
    accept: 'Accept',
    offer: 'Offer',

    youDied: 'You died',
    respawn: 'Respawn',
    lostItem: 'You lost: ',
    keptItems: 'You kept all your gear',
    gainedXp: '+{0} exp',
    levelUp: 'You reached level {0}!',
    looted: 'You got: {0}',
    gold: 'Gold',
    full: 'You can\'t carry more',
    needLevel: 'You need level {0}',
    tooHeavy: 'Too heavy',

    event2xp: 'Event: Double experience!',
    event2drop: 'Event: Double loot!',
    weekendXp: 'Weekend: Double experience!',
    night: 'Night · creatures +30% damage',

    shop: 'Shop',
    depot: 'Depot',
    depotHint: 'Store items safely in this city',
    teleport: 'Teleport',
    teleportHint: 'Travel to another city',
    travel: 'Travel',
    temple: 'Temple',
    questBoard: 'Quests',
    chest: 'Chest',
    interact: 'Press E to interact',
    healed: 'Healed!',
    questDone: 'Quest complete!',
    firstQuestHint: 'Check your quests top-left and the map to find your way',
    onboard1: 'Press E to talk to the glowing NPC and get a quest',
    onboard2: 'Click to attack creatures and grab the loot they drop',
    onboard3: 'Heal free at the temple, buy at the shop, store at the depot',

    connected: '{0} has connected',
    disconnected: '{0} has disconnected',
    friendAdded: '{0} added as friend',
    addFriend: 'Add friend',
    friends: 'Friends',
    tradeRequest: '{0} wants to trade',
    tradeDone: 'Trade completed',
    tradeCancelled: 'Trade cancelled',

    offline: 'Offline · local mode',
    chatPlaceholder: 'Type and press Enter…',
  },
};

const ELEMENT_NAMES = {
  es: { none: 'Normal', fire: 'Fuego', water: 'Agua', plant: 'Planta' },
  en: { none: 'Normal', fire: 'Fire', water: 'Water', plant: 'Plant' },
};

const LANG_KEY = 'mundum.lang';
let lang = 'es';

export function initLang() {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === 'es' || saved === 'en') lang = saved;
  else lang = (navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
  applyHtmlLang();
  return lang;
}

export function getLang() { return lang; }

export function setLang(l) {
  lang = l === 'en' ? 'en' : 'es';
  localStorage.setItem(LANG_KEY, lang);
  applyHtmlLang();
  applyStaticDom();
}

function applyHtmlLang() {
  const root = document.getElementById('html-root');
  if (root) root.setAttribute('lang', lang);
}

export function t(key, ...args) {
  let s = (STRINGS[lang] && STRINGS[lang][key]) || (STRINGS.es[key]) || key;
  args.forEach((a, i) => { s = s.replace('{' + i + '}', a); });
  return s;
}

export function elementName(el) {
  return (ELEMENT_NAMES[lang] && ELEMENT_NAMES[lang][el]) || el;
}

// Fill any element carrying data-i18n / data-i18n-label / data-i18n-ph / title attrs.
export function applyStaticDom() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-label]').forEach((el) => {
    const key = el.getAttribute('data-i18n-label');
    const node = el.childNodes[0];
    if (node && node.nodeType === 3) node.textContent = t(key) + ' ';
  });
  document.querySelectorAll('[data-slot]').forEach((el) => {
    const slot = el.getAttribute('data-slot');
    const map = { amulet: 'slotAmulet', helmet: 'slotHelmet', weapon: 'slotWeapon', armor: 'slotArmor', shield: 'slotShield', legs: 'slotLegs', boots: 'slotBoots', bag: 'slotBag' };
    if (map[slot]) el.title = t(map[slot]);
  });
  const nameInput = document.getElementById('name-input');
  if (nameInput) nameInput.placeholder = t('namePlaceholder');
  const chatInput = document.getElementById('chat-input');
  if (chatInput) chatInput.placeholder = t('chatPlaceholder');
}

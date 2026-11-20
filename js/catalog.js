/* ------------------------------------------------------------------
   Built-in sample catalog used by the MOCK AI and the trade-in form.
   Prices are made-up placeholders for the demo, NOT real market data.
   In production these would come from a price-guide API (see ai.js).
------------------------------------------------------------------- */

const SYSTEMS = {
  GB:   { name: 'Game Boy',          tag: 'gameboy',     color: '#8b8f3a' },
  GBC:  { name: 'Game Boy Color',    tag: 'gameboycolor',color: '#7a3fb0' },
  GBA:  { name: 'Game Boy Advance',  tag: 'gba',         color: '#3a49a8' },
  NES:  { name: 'NES',               tag: 'nes',         color: '#9a2f2f' },
  SNES: { name: 'Super Nintendo',              tag: 'snes',        color: '#5b4a9e' },
  N64:  { name: 'Nintendo 64',               tag: 'n64',         color: '#2f7d4a' },
  GCN:  { name: 'GameCube',          tag: 'gamecube',    color: '#4b3d8f' },
  GEN:  { name: 'Sega Genesis',      tag: 'segagenesis', color: '#222831' },
  PS1:  { name: 'PlayStation',       tag: 'ps1',         color: '#5e6470' },
};

const CATEGORIES = {
  cartridge: 'Cartridge game',
  disc: 'Disc game',
  handheld: 'Handheld system',
  console: 'Home system (console)',
  accessory: 'Accessory',
};

/* Grade names follow common retro-market wording. Every grade is tested working. */
const CONDITIONS = {
  A: 'Good – works and looks good, only minor wear',
  B: 'Acceptable – works, more noticeable wear',
  C: 'Cosmetically Flawed – works; stickers, cracks, yellowing or label damage',
};
const condName = k => (CONDITIONS[k] || '').split(' –')[0];

/* Completeness. Titles keep the short Loose/CIB code; shoppers see the plain label. */
const PACKAGING = {
  Loose: { label: 'Game Only', long: 'Loose (Game Only)' },
  CIB:   { label: 'Complete in Box', long: 'CIB (Complete in Box)' },
};

/* Shipping weight template, in ounces, per category + packaging. */
const WEIGHT_TEMPLATE_OZ = {
  cartridge: { Loose: 3,  CIB: 8 },
  disc:      { Loose: 6,  CIB: 10 },
  handheld:  { Loose: 14, CIB: 24 },
  console:   { Loose: 96, CIB: 160 },
  accessory: { Loose: 8,  CIB: 12 },
};

/* Spec / trust box fields per category. `opts` = select, otherwise text. */
const SPEC_TEMPLATES = {
  handheld: [
    { k: 'model',   label: 'Model',          opts: 'models' },
    { k: 'shell',   label: 'Shell',          opts: ['Original', 'Original – deep cleaned', 'Aftermarket (replacement shell)'] },
    { k: 'screen',  label: 'Screen',         opts: ['Original', 'IPS screen mod', 'Original + new lens'] },
    { k: 'battery', label: 'Battery health', placeholder: 'e.g. 90% / holds ~8 hrs' },
    { k: 'charger', label: 'Charger included', opts: ['No', 'Yes – OEM', 'Yes – aftermarket'] },
  ],
  cartridge: [
    { k: 'saveBattery', label: 'Save battery',   opts: ['Holds save', 'Replaced (new battery)', 'Not applicable', 'Dead – will not save'] },
    { k: 'label',       label: 'Label',          opts: ['Original', 'Original – worn', 'Ripped / faded / missing', 'Reproduction'] },
    { k: 'authentic',   label: '100% authentic (board checked)', opts: ['Yes', 'No'] },
    { k: 'contacts',    label: 'Deep cleaned (contacts)', opts: ['Yes', 'No'] },
  ],
  disc: [
    { k: 'surface', label: 'Disc surface', opts: ['Like new', 'Light scratches', 'Resurfaced'] },
    { k: 'manual',  label: 'Manual',       opts: ['No', 'Yes'] },
    { k: 'case',    label: 'Case',         opts: ['Original', 'Replacement', 'None'] },
  ],
  console: [
    { k: 'model',       label: 'Model',       opts: 'models' },
    { k: 'region',      label: 'Region',      opts: ['NTSC (US)', 'NTSC-J (Japan)', 'PAL'] },
    { k: 'controllers', label: 'Controllers', placeholder: 'e.g. 1 original controller / 1 third-party' },
    { k: 'cables',      label: 'Cables',      opts: ['Power + AV', 'Power + HDMI adapter', 'None'] },
    { k: 'mods',        label: 'Mods',        placeholder: 'e.g. none / RGB mod' },
  ],
  accessory: [
    { k: 'oem', label: 'OEM or third-party', opts: ['OEM', 'Third-party'] },
  ],
};

/* Sample catalog. loose/cib = placeholder "market" prices in USD. */
const CATALOG = [
  { id: 'pkmn-red',    game: 'Pokemon Red',      system: 'GB',   category: 'cartridge', loose: 40,  cib: 210, save: true,  aliases: ['pokemon red', 'red'] },
  { id: 'pkmn-blue',   game: 'Pokemon Blue',     system: 'GB',   category: 'cartridge', loose: 38,  cib: 200, save: true,  aliases: ['pokemon blue', 'blue'] },
  { id: 'pkmn-yellow', game: 'Pokemon Yellow',   system: 'GB',   category: 'cartridge', loose: 45,  cib: 230, save: true,  aliases: ['pokemon yellow', 'yellow', 'pikachu'] },
  { id: 'tetris',      game: 'Tetris',           system: 'GB',   category: 'cartridge', loose: 9,   cib: 45,  save: false, aliases: ['tetris'] },
  { id: 'kirby-dl',    game: "Kirby's Dream Land", system: 'GB', category: 'cartridge', loose: 15,  cib: 70,  save: false, aliases: ['kirby', 'dream land'] },
  { id: 'pkmn-gold',   game: 'Pokemon Gold',     system: 'GBC',  category: 'cartridge', loose: 55,  cib: 260, save: true,  aliases: ['pokemon gold', 'gold'] },
  { id: 'pkmn-silver', game: 'Pokemon Silver',   system: 'GBC',  category: 'cartridge', loose: 50,  cib: 250, save: true,  aliases: ['pokemon silver', 'silver'] },
  { id: 'pkmn-crystal',game: 'Pokemon Crystal',  system: 'GBC',  category: 'cartridge', loose: 65,  cib: 330, save: true,  aliases: ['pokemon crystal', 'crystal'] },
  { id: 'zelda-la',    game: "The Legend of Zelda: Link's Awakening DX", system: 'GBC', category: 'cartridge', loose: 35, cib: 160, save: true, aliases: ['links awakening', 'zelda dx', 'link awakening'] },
  { id: 'pkmn-emerald',game: 'Pokemon Emerald',  system: 'GBA',  category: 'cartridge', loose: 80,  cib: 330, save: true,  aliases: ['pokemon emerald', 'emerald'] },
  { id: 'pkmn-fr',     game: 'Pokemon FireRed',  system: 'GBA',  category: 'cartridge', loose: 55,  cib: 230, save: false, aliases: ['firered', 'fire red'] },
  { id: 'metroid-fus', game: 'Metroid Fusion',   system: 'GBA',  category: 'cartridge', loose: 25,  cib: 110, save: false, aliases: ['metroid fusion', 'fusion'] },
  { id: 'gba-sp',      game: 'Game Boy Advance SP', system: 'GBA', category: 'handheld', loose: 95, cib: 190, save: false, aliases: ['gba sp', 'sp', 'advance sp', 'ags'], models: ['AGS-001 (frontlit)', 'AGS-101 (backlit)'] },
  { id: 'gbc-console', game: 'Game Boy Color',   system: 'GBC',  category: 'handheld', loose: 70,  cib: 150, save: false, aliases: ['game boy color console', 'gbc console', 'cgb'], models: ['CGB-001'] },
  { id: 'smw',         game: 'Super Mario World',system: 'SNES', category: 'cartridge', loose: 28,  cib: 95,  save: true,  aliases: ['super mario world', 'mario world'] },
  { id: 'chrono',      game: 'Chrono Trigger',   system: 'SNES', category: 'cartridge', loose: 190, cib: 600, save: true,  aliases: ['chrono trigger', 'chrono'] },
  { id: 'earthbound',  game: 'EarthBound',       system: 'SNES', category: 'cartridge', loose: 280, cib: 1100,save: true,  aliases: ['earthbound'] },
  { id: 'smetroid',    game: 'Super Metroid',    system: 'SNES', category: 'cartridge', loose: 60,  cib: 220, save: true,  aliases: ['super metroid'] },
  { id: 'smk',         game: 'Super Mario Kart', system: 'SNES', category: 'cartridge', loose: 45,  cib: 170, save: true,  aliases: ['super mario kart'] },
  { id: 'dkc',         game: 'Donkey Kong Country', system: 'SNES', category: 'cartridge', loose: 25, cib: 110, save: true, aliases: ['donkey kong country', 'dkc'] },
  { id: 'snes-console',game: 'Super Nintendo Console', system: 'SNES', category: 'console', loose: 130, cib: 300, save: false, aliases: ['snes console', 'super nintendo console'], models: ['SNS-001', 'SNS-101 (mini)'] },
  { id: 'oot',         game: 'The Legend of Zelda: Ocarina of Time', system: 'N64', category: 'cartridge', loose: 38, cib: 140, save: false, aliases: ['ocarina', 'ocarina of time'] },
  { id: 'mk64',        game: 'Mario Kart 64',    system: 'N64',  category: 'cartridge', loose: 40,  cib: 130, save: false, aliases: ['mario kart 64', 'mk64'] },
  { id: 'sm64',        game: 'Super Mario 64',   system: 'N64',  category: 'cartridge', loose: 35,  cib: 120, save: false, aliases: ['super mario 64', 'mario 64'] },
  { id: 'goldeneye',   game: 'GoldenEye 007',    system: 'N64',  category: 'cartridge', loose: 30,  cib: 110, save: false, aliases: ['goldeneye', '007'] },
  { id: 'banjo',       game: 'Banjo-Kazooie',    system: 'N64',  category: 'cartridge', loose: 30,  cib: 100, save: false, aliases: ['banjo', 'kazooie'] },
  { id: 'n64-console', game: 'Nintendo 64 Console', system: 'N64', category: 'console', loose: 110, cib: 260, save: false, aliases: ['n64 console', 'nintendo 64 console'], models: ['NUS-001 Charcoal', 'NUS-001 Jungle Green', 'NUS-001 Atomic Purple'] },
  { id: 'melee',       game: 'Super Smash Bros. Melee', system: 'GCN', category: 'disc', loose: 55, cib: 85, save: false, aliases: ['melee', 'smash bros melee'] },
  { id: 'ff7',         game: 'Final Fantasy VII',system: 'PS1',  category: 'disc',      loose: 22,  cib: 50,  save: false, aliases: ['final fantasy vii', 'ff7', 'final fantasy 7'] },
  { id: 'sonic2',      game: 'Sonic the Hedgehog 2', system: 'GEN', category: 'cartridge', loose: 12, cib: 30, save: false, aliases: ['sonic 2', 'sonic the hedgehog 2'] },
  { id: 'smb3',        game: 'Super Mario Bros. 3', system: 'NES', category: 'cartridge', loose: 25, cib: 120, save: false, aliases: ['mario bros 3', 'smb3'] },
];

// Love songs, R&B, and Hip-Hop focused hashtags
export const trendingMusicHashtags = [
  // Love & Romance
  '#lovesong',
  '#romance',
  '#love',
  '#heartbreak',
  '#relationship',
  '#couple',
  '#valentine',
  '#romantic',
  '#emotional',
  '#feelings',
  '#heart',
  '#soulmate',
  '#forever',
  '#together',
  '#missingyou',
  '#thinkingofyou',
  '#loveyou',
  '#myheart',
  '#soulful',
  '#passionate',

  // R&B & Soul
  '#rnb',
  '#soul',
  '#rnbmusic',
  '#soulmusic',
  '#rnbsoul',
  '#rnbvibes',
  '#soulful',
  '#rnbartist',
  '#rnbsinger',
  '#rnbproducer',
  '#rnbbeat',
  '#rnblyrics',
  '#rnbmood',
  '#rnbfeels',
  '#rnblove',
  '#rnbheartbreak',
  '#rnbromance',
  '#rnbnight',
  '#rnbvibes',
  '#rnbflow',

  // Hip-Hop & Rap
  '#hiphop',
  '#rap',
  '#hiphopmusic',
  '#rapmusic',
  '#hiphopartist',
  '#rapper',
  '#hiphopbeat',
  '#rapbeat',
  '#hiphoplyrics',
  '#raplyrics',
  '#hiphopflow',
  '#rapflow',
  '#hiphopvibes',
  '#rapvibes',
  '#hiphopculture',
  '#rapculture',
  '#hiphoplife',
  '#raplife',
  '#hiphoplove',
  '#raplove',

  // General Music
  '#music',
  '#song',
  '#newmusic',
  '#musiclover',
  '#musician',
  '#artist',
  '#singer',
  '#producer',
  '#beatmaker',
  '#musicproducer',

  // Music Discovery
  '#underground',
  '#indieartist',
  '#newartist',
  '#emergingartist',
  '#unsigned',
  '#independent',
  '#originalmusic',
  '#original',
  '#selfproduced',
  '#homemade',

  // Music Creation
  '#studio',
  '#recording',
  '#songwriting',
  '#lyrics',
  '#melody',
  '#beat',
  '#instrumental',
  '#acoustic',
  '#live',
  '#performance',

  // Engagement
  '#fyp',
  '#viral',
  '#trending',
  '#musicmonday',
  '#newmusicfriday',
  '#musicdiscovery',
  '#musiccommunity',
  '#supportlocal',
  '#musiclovers',
  '#musicislife',

  // Mood & Vibes
  '#vibe',
  '#mood',
  '#feels',
  '#emotional',
  '#deep',
  '#real',
  '#authentic',
  '#raw',
  '#honest',
  '#storytelling',
  '#underrated',
  '#hidden',
  '#gem',
  '#diamond',
  '#rare',
  '#exclusive',
  '#fresh',
  '#fire',
  '#heat',
  '#banger',
];

// Function to get random hashtags
export function getRandomHashtags(count = 5) {
  const shuffled = [...trendingMusicHashtags].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Function to get hashtags by category
export function getHashtagsByCategory(category) {
  const categories = {
    general: ['#music', '#song', '#newmusic', '#musiclover', '#artist'],
    genres: ['#hiphop', '#rap', '#rnb', '#pop', '#indie'],
    discovery: ['#underground', '#indieartist', '#newartist', '#originalmusic'],
    creation: ['#studio', '#recording', '#songwriting', '#lyrics', '#beat'],
    engagement: ['#fyp', '#viral', '#musicdiscovery', '#supportlocal'],
  };
  return categories[category] || [];
}

// Catchy post titles
export const catchyTitles = [
  '🎵 New vibes just dropped',
  '✨ Fresh sounds incoming',
  '🔥 This one hits different',
  '💎 Hidden gem alert',
  '🎶 Underrated masterpiece',
  '🌟 Pure musical magic',
  '🎤 Raw talent unleashed',
  '🎧 Turn up the volume',
  '🎵 Musical journey begins',
  '✨ Sound waves incoming',
  '🔥 Fire track alert',
  '💎 Diamond in the rough',
  '🎶 Melodic perfection',
  '🌟 Musical goldmine',
  '🎤 Authentic artistry',
  '🎧 Audio excellence',
  '🎵 Sonic storytelling',
  '✨ Musical revelation',
  '🔥 Beat drop incoming',
  '💎 Rare musical find',
  '🎶 Harmonic beauty',
  '🌟 Sound innovation',
  '🎤 Creative expression',
  '🎧 Audio adventure',
  '🎵 Musical discovery',
  '✨ Fresh perspective',
  '🔥 Energy unleashed',
  '💎 Musical treasure',
  '🎶 Soulful sounds',
  '🌟 Artistic vision',
];

// Function to get random catchy title
export function getRandomTitle() {
  return catchyTitles[Math.floor(Math.random() * catchyTitles.length)];
}

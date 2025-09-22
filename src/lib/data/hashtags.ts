// Trending music and song-related hashtags
export const trendingMusicHashtags = [
  // General music
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

  // Genres
  '#hiphop',
  '#rap',
  '#rnb',
  '#pop',
  '#rock',
  '#indie',
  '#alternative',
  '#electronic',
  '#edm',
  '#trap',
  '#drill',
  '#afrobeats',
  '#reggaeton',
  '#country',
  '#jazz',
  '#blues',
  '#funk',
  '#soul',

  // Music discovery
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

  // Music creation
  '#studio',
  '#recording',
  '#mixing',
  '#mastering',
  '#songwriting',
  '#lyrics',
  '#melody',
  '#beat',
  '#instrumental',
  '#acoustic',
  '#live',
  '#performance',

  // Music sharing
  '#musicvideo',
  '#mv',
  '#visualizer',
  '#lyricvideo',
  '#behindthescenes',
  '#studio',
  '#recording',
  '#musicproduction',

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

  // Specific to your style
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
];

// Function to get random hashtags
export function getRandomHashtags(count = 5): string[] {
  const shuffled = [...trendingMusicHashtags].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Function to get hashtags by category
export function getHashtagsByCategory(category: string): string[] {
  const categories: Record<string, string[]> = {
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
export function getRandomTitle(): string {
  return catchyTitles[Math.floor(Math.random() * catchyTitles.length)];
}

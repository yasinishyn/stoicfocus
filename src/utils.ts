export const classifyDomain = (input: string): 'social' | 'news' | 'shopping' | 'entertainment' | 'custom' => {
  const domain = input.toLowerCase();
  
  const categories = {
    social: ['twitter', 'facebook', 'instagram', 'tiktok', 'linkedin', 'reddit', 'threads', 'bluesky', 'pinterest', 'snapchat', 'whatsapp', 'telegram', 'discord'],
    shopping: ['amazon', 'ebay', 'shopify', 'etsy', 'temu', 'shein', 'walmart', 'target', 'bestbuy', 'aliexpress', 'nike', 'ikea'],
    news: ['cnn', 'bbc', 'nytimes', 'fox', 'washingtonpost', 'reuters', 'wsj', 'bloomberg', 'theguardian', 'guardian', 'npr', 'forbes', 'usatoday'],
    entertainment: ['netflix', 'hulu', 'youtube', 'twitch', 'primevideo', 'disneyplus', 'disney', 'hbo', 'spotify', 'apple.com/tv', 'roblox', 'steam']
  };

  for (const [cat, keywords] of Object.entries(categories)) {
    if (keywords.some(k => domain.includes(k))) return cat as any;
  }

  return 'custom';
};
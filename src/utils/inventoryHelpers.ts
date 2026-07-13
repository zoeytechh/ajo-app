const EMOJI_MAP: { keywords: string[]; emoji: string }[] = [
  { keywords: ['provision', 'grocery', 'grocerie', 'supermarket', 'food store'], emoji: '🛒' },
  { keywords: ['cloth', 'fashion', 'wear', 'dress', 'shirt', 'trouser', 'shoe', 'bag', 'textile'], emoji: '👗' },
  { keywords: ['electron', 'phone', 'laptop', 'computer', 'gadget', 'device', 'tech'], emoji: '📱' },
  { keywords: ['food', 'cooked', 'meal', 'restaurant', 'eatery', 'snack', 'drink', 'water', 'bev'], emoji: '🍲' },
  { keywords: ['beauty', 'cosmetic', 'makeup', 'hair', 'cream', 'lotion', 'skincare'], emoji: '💄' },
  { keywords: ['build', 'material', 'cement', 'iron', 'rod', 'tile', 'paint', 'hardware'], emoji: '🏗️' },
  { keywords: ['pharma', 'medicine', 'drug', 'health', 'hospital', 'clinic', 'medical'], emoji: '💊' },
  { keywords: ['auto', 'car', 'vehicle', 'spare', 'part', 'motor', 'tyre', 'bike'], emoji: '🚗' },
  { keywords: ['book', 'station', 'pen', 'paper', 'school', 'office'], emoji: '📚' },
  { keywords: ['farm', 'produce', 'crop', 'grain', 'seed', 'agro', 'fish', 'meat', 'poultry'], emoji: '🌾' },
  { keywords: ['furniture', 'household', 'home', 'chair', 'table', 'kitchen', 'decor'], emoji: '🪑' },
  { keywords: ['recharge', 'airtime', 'data', 'card'], emoji: '📶' },
  { keywords: ['jewelry', 'jewellery', 'gold', 'silver', 'accessory', 'watch'], emoji: '💍' },
  { keywords: ['baby', 'child', 'children', 'kid', 'toy', 'infant'], emoji: '🍼' },
];

export function getCategoryEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const { keywords, emoji } of EMOJI_MAP) {
    if (keywords.some(k => lower.includes(k))) return emoji;
  }
  return '📦';
}

export function formatStock(qty: number): string {
  if (qty === 0) return 'Out of stock';
  if (qty === 1) return '1 piece left';
  if (qty < 5) return `Only ${qty} left`;
  return `${qty} in stock`;
}

export function stockColor(qty: number): string {
  if (qty === 0) return '#C62828';
  if (qty < 5) return '#E65100';
  return '#2E7D32';
}

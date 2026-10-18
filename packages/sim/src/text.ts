import type { Rng } from './rng'
import type { PlaceCategory } from './types'

const dishes: Partial<Record<PlaceCategory, string[]>> = {
  RESTAURANT: [
    'şeftali kebabı',
    'molehiya',
    'hellimli köfte',
    'kleftiko',
    'meze tabağı',
    'balık ızgara',
    'kolokas',
    'pilavuna',
  ],
  FAST_FOOD: ['hellim tost', 'dürüm', 'burger', 'lahmacun', 'pide', 'kumpir'],
  CAFE: ['Türk kahvesi', 'soğuk kahve', 'ekmek kadayıfı', 'gül tatlısı', 'macun', 'cheesecake'],
  BAR: ['yerel bira', 'zivaniya', 'kokteyl', 'limonata'],
}

const praise = [
  '{dish} efsaneydi, kesinlikle tekrar geleceğim.',
  'Servis hızlı, {dish} tam kıvamındaydı.',
  "Mağusa'da böylesi zor bulunur. {dish} için bile gelinir.",
  'Ortam çok sıcak, {dish} harikaydı.',
]
const okay = [
  '{dish} fena değildi ama biraz beklettiler.',
  'İdare eder. {dish} biraz özensizdi.',
  'Fiyatına göre makul, {dish} ortalama.',
  'Bir kere denenir. {dish} beklediğim gibi değildi ama kötü de değildi.',
]
const bad = [
  '{dish} soğuk geldi, pek memnun kalmadım.',
  'Uzun süre bekledim, {dish} vasattı.',
  'Bir daha gelir miyim bilmiyorum. {dish} hayal kırıklığıydı.',
]

const spotPraise = [
  'Manzara inanılmazdı, saatlerce kalabilirim.',
  'Her geldiğimde başka bir detay fark ediyorum.',
  'Gün batımında buraya gelmek ayrı bir keyif.',
  'Kafamı dinlemek için mükemmel bir yer.',
]
const spotOkay = [
  'Güzeldi ama biraz kalabalıktı.',
  'Fena değil, bir dahaki sefere daha erken gelmeli.',
  'Hoş bir mola oldu.',
]
const spotBad = [
  'Hava çok sıcaktı, pek tadını çıkaramadım.',
  'Beklediğim kadar etkileyici değildi.',
]

export function dishFor(rng: Rng, category: PlaceCategory): string | null {
  const list = dishes[category]
  return list ? rng.pick(list) : null
}

export function reviewComment(rng: Rng, rating: number, dish: string | null) {
  const food = dish !== null
  const pool = food
    ? rating >= 4
      ? praise
      : rating >= 3
        ? okay
        : bad
    : rating >= 4
      ? spotPraise
      : rating >= 3
        ? spotOkay
        : spotBad
  const text = rng.pick(pool)
  const filled = dish ? text.replace('{dish}', dish) : text
  return filled.replace(
    /(^|[.!?]\s+)(\p{L})/gu,
    (_, pre: string, ch: string) => pre + ch.toLocaleUpperCase('tr'),
  )
}

export const thoughts = {
  hungry: ['Karnım zil çalıyor.', 'Bir şeyler yemem lazım.', 'Açlıktan gözüm dönüyor.'],
  tired: ['Gözlerim kapanıyor...', 'Biraz dinlenmem lazım.'],
  bored: ['Canım sıkıldı, bir yerlere gitmeliyim.', 'Biraz hava almak iyi gelir.'],
  lonely: ['Birileriyle oturup sohbet etmek istiyorum.', 'Kafede biraz insan göreyim.'],
  rich: ['Hesapta para birikiyor, yeni araba yakın!', 'Biriktirdikçe hayaller büyüyor.'],
  broke: ['Bu ay kemer sıkmam lazım.', 'Para suyunu çekti, idareli olmalıyım.'],
}

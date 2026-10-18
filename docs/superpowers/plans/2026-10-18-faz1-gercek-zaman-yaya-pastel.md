# Faz 1: Gerçek zaman, ulaşım kararı, yaya hayatı ve pastel harita

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deniz gerçek KKTC saatinde yaşasın, her yolculukta yürümek, arabayla gitmek ya da taksi arasında kendisi karar versin, haritada yaya ya da araçla görünsün; harita pastel olsun ve gerçek hava durumu kararları etkilesin.

**Architecture:** Motor (`packages/sim`) saf kalır. Saati runner verir, motora "şu kadar dakika ilerle" denir. Yolculuk, bir veya birden fazla **bacaktan** (leg: car/foot/taxi) oluşan tek bir `travel` etkinliğine dönüşür. Ulaşım kararı ayrı, saf bir modüldür (`transport.ts`). Hava durumu `World.weather` girdisidir. API'de rota servisi kip (mode) bilir. Hava durumu servisi Open-Meteo'yu 15 dakikada bir çeker. Web'de kendi pastel stil dosyamız ve saate göre palet geçişi vardır.

**Tech Stack:** TypeScript 6, Vitest 5, Prisma 7, Fastify 5, Next.js 16, MapLibre GL 6, `@vis.gl/react-maplibre`.

**Spec:** `docs/superpowers/specs/2026-10-18-yasayan-deniz-design.md` (bölüm 1, 2, 3, 4'teki "Hava durumu" ve "Benim verdiğim kararlar").

**Kapsam dışı (sonraki planlar):** Faz 2 gerçek veri (OSM mekanlar, fiyatlar, aylık maaş ve kira); Faz 3 arkadaşlar ve uzun vadeli hayat; Faz 4 topluluk, moderasyon, Claude ve VPS yayını. Bu fazda mekanlar mevcut seed verisidir. Park yerleri ve "zor park" bilgisi bu fazda elle 2–3 mekana eklenir; OSM'den Faz 2'de gelir.

## Global Constraints

- Saat dilimi: `Asia/Famagusta`. Canlı simülasyon her zaman 1:1 gerçek zaman.
- Hızlandırma yalnızca geliştirme için `SIM_SPEED` ortam değişkeniyle (varsayılan `1`). Admin panelinde hız ayarı yok, yalnızca "duraklat".
- Kesinti telafisi tavanı: 48 saat. Daha uzunsa "uzun uyku" olayı, Deniz eve alınır.
- Motor deterministik ve saf kalır; ağ ve DB yalnızca `apps/api` içinde.
- Ulaşım kararında sabit mesafe eşiği yok; karar spec bölüm 2'deki etkenlerle puanlanır ve gerekçesi akışa yazılır.
- İçki içeceği buluşmaya (BAR) arabayla gidilmez; içtikten sonra 6 saat araba kullanılmaz, araba olduğu yerde kalır.
- `AgentState.version` 2'ye çıkar. Sürüm 1 durum bulunursa karakter sıfırlanır ("Yeni bir sayfa" olayı). Göç yazılmaz.
- Yaya rotaları: `https://routing.openstreetmap.de/routed-foot/route/v1/driving/{lng,lat;lng,lat}?overview=full&geometries=geojson`. Araba ve taksi: mevcut `OSRM_URL`.
- Hava: `https://api.open-meteo.com/v1/forecast?latitude=35.125&longitude=33.94&current=temperature_2m,precipitation,weather_code,is_day&timezone=Asia%2FFamagusta`, 15 dakikada bir.
- Yürüme hızı 80 m/dk. Taksi ücreti: 100 ₺ açılış + 45 ₺/km.
- Arayüz metinleri Türkçe; tasarım ilkeleri ilk sürümdeki gibi (ALL-CAPS etiket yok, ok süsü yok).
- Commit mesajları Türkçe, Conventional Commits, **Claude co-author satırı yok**.
- Kod stili Biome (`pnpm lint` temiz olmalı).

## Review Focus

1. **Yaz saati geçişi (DST):** Ekim sonunda saat geri alınınca duvar saati bir saat geri gider. Simülasyon saati asla geri gitmemeli, o saat boyunca beklemeli. Mart sonunda ileri alınınca 60 dakika tek seferde ilerlemeli. Testi Task 1'de.
2. **Uzun kesinti:** API 3 gün kapalı kaldıysa açılışta 48 saat taklidi yapılmamalı; "uzun uyku" yolu çalışmalı. 10 saatlik kesintide ise 10 saat hızlıca simüle edilmeli ve yüzlerce SSE yayını yapılmamalı. Testi Task 2'de (`planCatchUp`).
3. **Rota servisi çökük ya da 429:** Gerçek zamanda 4 simülasyon dakikası 4 gerçek dakikadır. Deniz kapıda o kadar beklememeli; 30 saniye içinde düz çizgi rotaya düşmeli. Testi Task 4'te.
4. **Araba başka yerde:** İçip arabayı barda bıraktıktan sonra ertesi sabah evdeyken araba bacağı asla evden başlamamalı. Önce arabayı almalı (yürüyerek ya da taksiyle). Testi Task 4'te (değişmez: araba bacağı başlarken `car.placeId === leg.from`).
5. **Hava verisi yok:** Open-Meteo erişilemezse `weather` `null` olur ve kararlar nötr davranmalı; hiçbir yerde çökmemeli. Testi Task 3'te.

---

## Dosya yapısı

```
packages/sim/src/
  time.ts          (değişir)  gerçek saat → clock, DST güvenli
  clock.ts         (yeni)     planCatchUp: kesinti telafisi kararı
  transport.ts     (yeni)     chooseMode: yürü / araba / taksi kararı
  travel.ts        (yeni)     bacak planlama ve ilerletme (engine'den ayrılır)
  types.ts         (değişir)  Activity 'travel', Leg, CarState.placeId, Weather, AgentState v2
  engine.ts        (değişir)  advance(minutes), travel.ts'i kullanır, içki ve araba alma
  view.ts          (değişir)  yolculuk görünümü (mode, bacak, park edilmiş araba)
packages/sim/test/
  time.test.ts, clock.test.ts, transport.test.ts, travel.test.ts (yeni), engine.test.ts (değişir)
packages/db/prisma/
  schema.prisma    Route.mode, Place.parkingPlaceId + hardParking, SimSettings sadeleşir, PARKING kategorisi
  data.ts          2–3 park noktası ve hardParking işaretleri
packages/contracts/src/index.ts   snapshot: travel, parkedCar, weather; simSettings sadeleşir
apps/api/src/
  env.ts           SIM_SPEED, FOOT_ROUTING_URL
  sim/routing.ts   mode'lu rota anahtarı ve kip başına sunucu
  sim/weather.ts   (yeni) Open-Meteo istemcisi
  sim/runner.ts    gerçek saat, catch-up, v2 sıfırlama, hava
apps/web/
  public/map/pastel.json             (yeni) stil
  src/components/map/palette.ts      (yeni) gün/gece paleti ve saat geçişi
  src/components/map/markers.ts      (car-marker.ts yerine) araba, yaya, taksi, park edilmiş araba
  src/components/map/live-map.tsx    yeni işaretçiler, bacak enterpolasyonu, ikonlu mekan rozetleri
  src/components/map/place-icons.ts  (yeni) kategori ikonlarını haritaya görsel olarak ekler
  src/components/live/weather-chip.tsx (yeni)
  src/app/globals.css               pastel arayüz tonları, CSS filtre kaldırılır
apps/admin/src/app/(panel)/dashboard.tsx   hız kaydırıcıları kalkar, duraklat kalır
```

---

### Task 1: Gerçek yerel saatten simülasyon saati

**Files:**
- Modify: `packages/sim/src/time.ts`
- Test: `packages/sim/test/time.test.ts`

**Interfaces:**
- Produces: `TIMEZONE = 'Asia/Famagusta'`; `wallClock(now: Date, tz?: string): number` (SIM_EPOCH'tan beri yerel duvar saati dakikası, tam sayı olmayabilir); mevcut `toDate`, `dayOf`, `minuteOfDay`, `dayOfWeek`, `formatClock` aynen kalır.

- [ ] **Step 1: Failing testleri yaz**

```ts
import { describe, expect, it } from 'vitest'
import { dayOfWeek, formatClock, minuteOfDay, wallClock } from '../src/time'

describe('wallClock', () => {
  it('kışın UTC+2', () => {
    const c = wallClock(new Date('2026-01-05T10:00:00Z'))
    expect(formatClock(c)).toBe('12:00')
    expect(dayOfWeek(c)).toBe(1)
  })
  it('yazın UTC+3', () => {
    expect(formatClock(wallClock(new Date('2026-07-01T09:30:00Z')))).toBe('12:30')
  })
  it('saniyeleri kesirli dakika olarak taşır', () => {
    expect(minuteOfDay(wallClock(new Date('2026-07-01T09:30:30Z')))).toBeCloseTo(750.5)
  })
  it('ekim geri alımında aynı duvar saati iki kez görünür', () => {
    // 25 Ekim 2026 04:00 yerel → 03:00
    const a = wallClock(new Date('2026-10-25T00:30:00Z')) // 03:30 EEST
    const b = wallClock(new Date('2026-10-25T01:30:00Z')) // 03:30 EET
    expect(b).toBe(a)
  })
})
```

- [ ] **Step 2: Çalıştır, başarısız olduğunu gör**

Run: `pnpm --filter @mapcar/sim test -- time`
Expected: FAIL, `wallClock is not a function`

- [ ] **Step 3: `wallClock` yaz**

`Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year, month, day, hour, minute, second })` ile yerel parçaları al. `Date.UTC(...)` ile "yerel saat UTC'ymiş gibi" bir epoch üret. `(o - SIM_EPOCH) / 60000` döndür. `Intl` nesnesi modül düzeyinde bir kez oluşturulsun.

- [ ] **Step 4: Testler geçsin**

Run: `pnpm --filter @mapcar/sim test -- time`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add packages/sim/src/time.ts packages/sim/test/time.test.ts
git commit -m "feat(sim): KKTC yerel saatinden simülasyon saati"
```

---

### Task 2: Kesinti telafisi kararı

**Files:**
- Create: `packages/sim/src/clock.ts`
- Test: `packages/sim/test/clock.test.ts`
- Modify: `packages/sim/src/index.ts` (export)

**Interfaces:**
- Consumes: `wallClock` (Task 1)
- Produces:
  ```ts
  export const MAX_CATCH_UP_MIN = 48 * 60
  export type CatchUp =
    | { kind: 'none' }                       // fark ≤ 0 (DST geri alımı dahil): bekle
    | { kind: 'step'; minutes: number }      // fark ≤ 2 dk: normal adım
    | { kind: 'fast'; minutes: number }      // 2 dk < fark ≤ 48 saat: yayınsız hızlı ilerlet
    | { kind: 'long_sleep'; minutes: number } // > 48 saat: uzun uyku, saat hedefe atlar
  export function planCatchUp(stateClock: number, targetClock: number): CatchUp
  ```

- [ ] **Step 1: Failing testleri yaz**

```ts
it('geride kalmadıysa bekler', () => expect(planCatchUp(100, 99.5)).toEqual({ kind: 'none' }))
it('normal adım', () => expect(planCatchUp(100, 100.0167)).toEqual({ kind: 'step', minutes: expect.closeTo(0.0167, 4) }))
it('10 saatlik kesinti hızlı ilerler', () => expect(planCatchUp(0, 600)).toEqual({ kind: 'fast', minutes: 600 }))
it('48 saat sınırda hızlı', () => expect(planCatchUp(0, 2880).kind).toBe('fast'))
it('3 günlük kesinti uzun uyku', () => expect(planCatchUp(0, 3 * 1440)).toEqual({ kind: 'long_sleep', minutes: 4320 }))
it('mart ileri alımı (60 dk) hızlı ilerler', () => expect(planCatchUp(0, 60).kind).toBe('fast'))
```

- [ ] **Step 2: Çalıştır, FAIL gör**

Run: `pnpm --filter @mapcar/sim test -- clock`

- [ ] **Step 3: `planCatchUp` yaz** (sınırlar yukarıdaki türde yazılı)

- [ ] **Step 4: PASS gör**

- [ ] **Step 5: Commit** `feat(sim): kesinti telafisi kararı`

---

### Task 3: Ulaşım kararı (`chooseMode`)

**Files:**
- Create: `packages/sim/src/transport.ts`
- Modify: `packages/sim/src/types.ts` (Weather, TransportMode)
- Test: `packages/sim/test/transport.test.ts`

**Interfaces:**
- Produces (types.ts):
  ```ts
  export type TransportMode = 'foot' | 'car' | 'taxi'
  export interface Weather { tempC: number; precipitationMm: number; code: number; isDay: boolean; updatedAt: number }
  ```
- Produces (transport.ts):
  ```ts
  export interface ModeInput {
    distanceM: number            // kuş uçuşu × 1.3 tahmini
    hour: number                 // 0–24
    weather: Weather | null
    energy: number; fun: number  // 0–100
    action: ActionKind           // amaç
    drinking: boolean            // hedef BAR veya son 6 saatte içti
    carAvailable: boolean        // araba bulunduğu yerde ve kullanılabilir
    fuelOk: boolean
    hardParking: boolean         // hedefte park zor
    money: number
    walkAffinity: number         // 0–1, hobi ve topluluk etkisi (bu fazda 0.3 sabit)
  }
  export interface ModeChoice { mode: TransportMode; reason: string; scores: Record<TransportMode, number> }
  export const WALK_SPEED_M_PER_MIN = 80
  export const taxiFare = (distanceM: number) => Math.round(100 + (distanceM / 1000) * 45)
  export function chooseMode(input: ModeInput): ModeChoice
  ```
- Kurallar (puanlama, rastgelelik yok):
  - `car` uygun değilse (`!carAvailable || !fuelOk || drinking`) puanı `-Infinity`.
  - `action` ∈ {groceries, buy_car, service, refuel} ise yalnızca `car` (araba yoksa `taxi`; `service`/`refuel`/`buy_car` araba yoksa zaten seçilmez).
  - Yürüme süresi > 50 dk ise `foot` `-Infinity`. Gece (22–06) ve yürüme > 20 dk ise ağır ceza.
  - Yağmur (`precipitationMm > 0.2`) ya da `tempC > 33` iken `foot` cezası. `18 ≤ tempC ≤ 28` ve yağmur yoksa yürüme bonusu.
  - `energy < 30` → `foot` cezası. `fun < 40` ve hava iyiyse → küçük `foot` bonusu.
  - `hardParking` → `car` cezası (park arama süresi +8 dk sayılır).
  - `taxiFare > money * 0.15` → `taxi` `-Infinity`. Taksi taban puanı düşük; yalnızca içkiliyken ya da araba yokken ve yürüme kötüyken kazanmalı.
- `reason`: kazanan kipin en etkili gerekçesi, Türkçe tam cümle, aşağıdaki testlerde geçen metinlerle.

- [ ] **Step 1: Failing testleri yaz**

```ts
const base: ModeInput = { distanceM: 600, hour: 18, weather: { tempC: 24, precipitationMm: 0, code: 0, isDay: true, updatedAt: 0 },
  energy: 70, fun: 60, action: 'eat', drinking: false, carAvailable: true, fuelOk: true, hardParking: false, money: 10_000, walkAffinity: 0.3 }

it('güzel havada yakın yere yürür', () => {
  const c = chooseMode(base)
  expect(c.mode).toBe('foot')
  expect(c.reason).toBe('Hava çok güzel, yürümeye karar verdi.')
})
it('uzak yere arabayla gider', () => expect(chooseMode({ ...base, distanceM: 6000 }).mode).toBe('car'))
it('yağmurda yakın yere bile arabayla', () => {
  const c = chooseMode({ ...base, weather: { ...base.weather!, precipitationMm: 2 } })
  expect(c.mode).toBe('car')
  expect(c.reason).toBe('Yağmur yağıyor, arabayı aldı.')
})
it('içki içecekse arabaya binmez', () => {
  const c = chooseMode({ ...base, distanceM: 4000, drinking: true, action: 'socialize' })
  expect(c.mode).toBe('taxi')
  expect(c.reason).toBe('İçki içeceği için arabayı bıraktı, taksiye bindi.')
})
it('içkili ama yakınsa yürür', () => expect(chooseMode({ ...base, drinking: true }).mode).toBe('foot'))
it('market alışverişi arabayla', () => expect(chooseMode({ ...base, distanceM: 300, action: 'groceries' }).mode).toBe('car'))
it('çok yorgunken yürümez', () => expect(chooseMode({ ...base, distanceM: 900, energy: 15 }).mode).toBe('car'))
it('park zor ve yakınsa yürür', () => expect(chooseMode({ ...base, distanceM: 1500, hardParking: true }).mode).toBe('foot'))
it('gece geç saatte uzun yürüyüş yapmaz', () => expect(chooseMode({ ...base, distanceM: 2200, hour: 23.5 }).mode).toBe('car'))
it('parası yoksa taksiye binmez', () => {
  const c = chooseMode({ ...base, distanceM: 4000, carAvailable: false, money: 300 })
  expect(c.mode).toBe('foot')
})
it('hava verisi yoksa nötr davranır ve çökmez', () => {
  expect(() => chooseMode({ ...base, weather: null })).not.toThrow()
  expect(chooseMode({ ...base, weather: null, distanceM: 6000 }).mode).toBe('car')
})
it('araba yoksa ve yol uzunsa taksi', () => expect(chooseMode({ ...base, distanceM: 5000, carAvailable: false }).mode).toBe('taxi'))
```

- [ ] **Step 2: FAIL gör** (`pnpm --filter @mapcar/sim test -- transport`)

- [ ] **Step 3: `chooseMode` yaz.** Kip başına puan: `-(tahmini dakika) * 0.05` + yukarıdaki bonus ve cezalar. Gerekçe, kazananın puanına en çok katkı yapan kuraldan seçilir. Gerekçe metinleri:
  - `'Hava çok güzel, yürümeye karar verdi.'`
  - `'Yağmur yağıyor, arabayı aldı.'`
  - `'Hava çok sıcak, arabayı aldı.'`
  - `'İçki içeceği için arabayı bıraktı, taksiye bindi.'`
  - `'İçki içeceği için arabayı bıraktı, yürüyerek gitti.'`
  - `'Orada park bulmak zor, yürümeyi seçti.'`
  - `'Yorgun, arabayla gitti.'`
  - `'Yol uzun, arabayla gitti.'`
  - `'Arabası yanında değil, taksi çağırdı.'`
  - `'Arabası yanında değil, yürüyerek gitti.'`
  - `'Alışveriş için arabayı aldı.'`
  - `'Gece geç oldu, arabayla gitti.'`
  - Diğer durumlar: `'Yakın, yürüyerek gitti.'` ya da `'Arabayla gitti.'`

- [ ] **Step 4: PASS gör** (12 test)

- [ ] **Step 5: Commit** `feat(sim): karakterin ulaşım kararı (yürü, araba, taksi)`

---

### Task 4: Bacaklı yolculuk (`travel`) ve motorun gerçek zamana geçişi

En büyük görev: motorun yolculuk modelini değiştirir. `advance` artık simülasyon dakikası alır.

**Files:**
- Create: `packages/sim/src/travel.ts`
- Modify: `packages/sim/src/types.ts`, `packages/sim/src/engine.ts`, `packages/sim/src/view.ts`, `packages/sim/src/index.ts`
- Test: `packages/sim/test/travel.test.ts`, `packages/sim/test/engine.test.ts`, `packages/sim/test/fixture.ts`

**Interfaces:**
- Consumes: `chooseMode`, `ModeInput`, `TransportMode`, `Weather`, `WALK_SPEED_M_PER_MIN`, `taxiFare` (Task 3)
- Produces (types.ts):
  ```ts
  export const routeKey = (from: string, to: string, mode: 'car' | 'foot' = 'car') => `${mode}:${from}->${to}`
  export interface Leg { mode: TransportMode; fromPlaceId: string; toPlaceId: string; distanceM: number; speed: number } // speed m/dk
  // Activity 'waiting_route' | 'driving' | 'stopped' YERİNE:
  | { kind: 'travel'; action: ActionKind; destPlaceId: string; legs: Leg[]; leg: number; progressM: number;
      startedAt: number; pendingSince: number | null; stoppedUntil: number | null; stopReason: string | null }
  export interface CarState { /* mevcut alanlar */ placeId: string | null } // null = üstünde yolda
  export interface WorldPlace { /* mevcut */ parkingPlaceId: string | null; hardParking: boolean }
  export interface World { /* mevcut */ weather: Weather | null }
  export type PlaceCategory = ... | 'PARKING'
  export interface AgentState { version: 2; /* mevcut */ drankAt: number | null }
  export interface SimSettings { } // boş arayüz kaldırılır; advance ayar almaz
  ```
  `Effect` `need_route` artık `mode: 'car' | 'foot'` taşır.
- Produces (travel.ts):
  ```ts
  /** Kip ve araba durumuna göre bacakları kurar. Araba başka yerdeyse önce arabaya yürüme/taksi bacağı eklenmez:
      bu durumda car kipi seçilemez (carAvailable=false). Hedefin parkingPlaceId'si varsa car → parking + foot → hedef. */
  export function planLegs(mode: TransportMode, from: WorldPlace, dest: WorldPlace, world: World): Omit<Leg, 'distanceM' | 'speed'>[]
  /** Bacağın rotasını bulur ya da (pendingSince + 0.5 dk aşıldıysa) düz çizgiye düşer; yoksa null. */
  export function resolveLeg(leg: Omit<Leg, 'distanceM' | 'speed'>, world: World, waitedMin: number, cruiseKmh: number | null): Leg | null
  ```
- Produces (engine.ts):
  ```ts
  export function advance(prev: AgentState, world: World, minutes: number): AdvanceResult // alt adımlar en fazla 1 dk
  ```
  Yeni eylem: `'fetch_car'`. Araba Deniz'in bulunduğu yerde değilse ve araba gerektiren bir iş planlanırsa ya da sabah 07–11 arası evdeyse aday olur. Arabanın durduğu yere yürüyerek ya da taksiyle gider, sonra boşa düşer; araba artık orada olduğu için sonraki karar araba kullanabilir.
  BAR'da `socialize` bitince `drankAt = clock`. `clock - drankAt < 360` iken `drinking = true`.
  Taksi bacağı bitince `taxiFare(distanceM)` kadar `tx(-fare, 'LEISURE', 'Taksi')`.
  Akış: yolculuk başında `depart` olayının mesajı `chooseMode().reason`, `data.mode` alanı kipi taşır.
  Rota bekleme: `pendingSince + 0.5` dakikada düz çizgiye düşer.

- [ ] **Step 1: Fixture'ı güncelle**

`makeWorld()`'e `weather: { tempC: 24, precipitationMm: 0, code: 0, isDay: true, updatedAt: 0 }`, her yere `parkingPlaceId: null, hardParking: false` eklenir. Bir `PARKING` yeri (`kale-park`) eklenir. `castle` için `parkingPlaceId: 'kale-park', hardParking: true`. Bir `BAR` yeri zaten var.

- [ ] **Step 2: Failing testleri yaz (`travel.test.ts`)**

```ts
it('park yeri olan hedefe arabayla: car + foot bacakları', () => {
  const w = makeWorld(); const legs = planLegs('car', place(w, 'home'), place(w, 'castle'), w)
  expect(legs.map((l) => [l.mode, l.toPlaceId])).toEqual([['car', 'kale-park'], ['foot', 'castle']])
})
it('yürüyüşte tek foot bacağı', () => expect(planLegs('foot', place(w,'home'), place(w,'kebap'), w)).toHaveLength(1))
it('rota yoksa 0.5 dk sonra düz çizgiye düşer', () => {
  expect(resolveLeg(leg, w, 0.2, 62)).toBeNull()
  expect(resolveLeg(leg, w, 0.6, 62)?.distanceM).toBeGreaterThan(0)
})
it('foot hızı 80 m/dk', () => expect(resolveLeg(footLeg, w, 1, 62)?.speed).toBe(80))
```

- [ ] **Step 3: Failing testleri yaz (`engine.test.ts`)**

`run(days)` artık `advance(state, world, 1)` (1 dakika) ile döner. Mevcut testler bu imzaya uyarlanır. Yeni testler:

```ts
it('araba bacağı her zaman arabanın durduğu yerden başlar', () => {
  // 10 gün boyunca her adımda: travel etkinliğinin şu anki bacağı car ise ve progressM===0 ise
  // önceki adımın state.car.placeId === leg.fromPlaceId olmalı
})
it('barda içtikten sonra araba kullanmaz, ertesi gün arabayı alır', () => {
  // karakteri BAR'a ışınla, sosyalleşme bitsin; sonraki 6 saatte hiçbir car bacağı başlamaz;
  // 36 saat içinde 'fetch_car' activity_start olayı görülür ve araba eve döner
})
it('yolculuk başında gerekçe akışa yazılır', () => {
  // ilk depart olayının data.mode'u 'foot'|'car'|'taxi' ve message boş değil
})
it('taksi ücreti cüzdandan düşer', () => {
  // carModelId null ile başlat, uzak bir yere giderken 'Taksi' açıklamalı negatif transaction görülür
})
```

Testleri yazarken somut kurulumları fixture yardımcılarıyla kur. Değişmez testi her adımda `prev.car.placeId` ile kontrol eder.

- [ ] **Step 4: FAIL gör** (`pnpm --filter @mapcar/sim test`)

- [ ] **Step 5: travel.ts'i yaz, engine.ts'i dönüştür**
  - `begin()`: hedef aynı yerse hemen başla. Değilse `ModeInput` kur, `chooseMode` ile kipi seç, `planLegs` ile bacakları kur, `travel` etkinliği başlat, eksik rotalar için `need_route` (mode ile) yayınla.
  - `step()` içindeki `waiting_route` / `driving` / `stopped` dalları tek `travel` dalına iner:
    - bacak henüz çözülmediyse `resolveLeg` ile çöz
    - çözüldüyse ilerle; bacak bitince `leg++`
    - araba bacağı başlarken `car.placeId = null`, bitince `car.placeId = leg.toPlaceId`
    - son bacak bitince `startAt`
    - olaylar (lastik, benzin bitmesi) yalnızca car bacaklarında; `stoppedUntil` / `stopReason` kullanılır
  - Yakıt ve kilometre yalnızca car bacağında. Taksi bacağı yakıt harcamaz, ücret ister.
  - Hava `decide()`'ı etkiler: `precipitationMm > 0.2` iken `beach` ve `explore` (PARK) adayı eklenmez. `tempC > 33` ve saat 12–16 arasında dış mekan adaylarının puanı 0.5 düşer. `weather === null` iken kural uygulanmaz.
  - `advance(prev, world, minutes)`: dakikaları ≤1'lik alt adımlarla tüketir; `SimSettings` parametresi kalkar.
  - `createInitialState`: `version: 2`, `car.placeId = homePlaceId`, `drankAt: null`.
  - `view.ts`: `travel` için etiket `PURPOSE_LABEL[action]`. Ek alanlar: `mode` (o anki bacak), `progress` (bacak içi), `legIndex`.

- [ ] **Step 6: PASS gör ve lint**

Run: `pnpm --filter @mapcar/sim test && pnpm --filter @mapcar/sim typecheck && pnpm lint`
Expected: hepsi geçer

- [ ] **Step 7: Commit** `feat(sim): bacaklı yolculuk, içki kuralı, araba alma ve gerçek zamanlı ilerleme`

---

### Task 4b: Gezinti yürüyüşleri

**Files:**
- Modify: `packages/sim/src/types.ts`, `packages/sim/src/engine.ts`, `packages/sim/src/travel.ts`
- Create: `packages/sim/src/strolls.ts`
- Test: `packages/sim/test/strolls.test.ts`

**Interfaces:**
- Consumes: `travel` etkinliği, `planLegs`, `resolveLeg` (Task 4)
- Produces:
  ```ts
  export interface StrollRoute { id: string; name: string; city: string; waypoints: string[] } // yer slug'ları, ilk = başlangıç
  export const STROLLS: StrollRoute[] // 'kaleici-turu': lala-mustafa-pasa-camii → othello-kalesi → namik-kemal-zindani → canbulat-tabyasi
                                      // 'sahil-yuruyusu': magusa-sahil-parki → glapsides-plaji
                                      // 'salamis-gezisi': salamis-antik-kenti → salamis-plaji
  export function strollLegs(route: StrollRoute, world: World): Omit<Leg, 'distanceM' | 'speed'>[] // ardışık foot bacakları
  ```
  Yeni eylem `'stroll'`. Aday olur: hava iyi (yağmur yok, 15–31 °C), saat 9–20, enerji > 40 ve keyif < 75 ya da hafta sonu. Puanı `explore` ile aynı ölçekte. Başlangıç noktasına normal yolculuk (`chooseMode`) ile gidilir, ardından `travel` etkinliği `strollLegs` bacaklarıyla sürer. Her ara noktaya varışta 5–15 dakikalık durak olur ve `activity_start` olayı yazılır (`'{yer} önünde mola verdi.'`). Durak sırasında keyif artar. Bitince ilk ara noktanın park yeri ya da başlangıcı yeni konumdur. Yürüyüş boyunca `fun` dakikada +0.25, `energy` −0.06.

- [ ] **Step 1: Failing testler**

```ts
it('Kaleiçi turu ardışık foot bacakları üretir', () => {
  const legs = strollLegs(STROLLS.find((r) => r.id === 'kaleici-turu')!, world)
  expect(legs.every((l) => l.mode === 'foot')).toBe(true)
  expect(legs).toHaveLength(3)
})
it('yağmurda gezintiye çıkmaz', () => { /* weather.precipitationMm=3 ile 2 gün çalıştır, 'stroll' activity_start yok */ })
it('güzel bir hafta sonunda en az bir gezinti yapar', () => { /* fixture'a STROLLS slug'ları eklenmiş dünya, 2 hafta sonu günü, ≥1 stroll */ })
```

- [ ] **Step 2: FAIL gör**
- [ ] **Step 3: Uygula** (fixture'a gezinti ara noktaları eklenir)
- [ ] **Step 4: PASS gör** (`pnpm --filter @mapcar/sim test`)
- [ ] **Step 5: Commit** `feat(sim): Kaleiçi turu, sahil yürüyüşü ve Salamis gezisi`

---

### Task 5: Veritabanı ve sözleşme güncellemesi

**Files:**
- Modify: `packages/db/prisma/schema.prisma`, `packages/db/prisma/data.ts`, `packages/db/prisma/seed.ts`
- Create: migration (`pnpm db:migrate --name faz1-zaman-yaya`)
- Modify: `packages/contracts/src/index.ts`
- Test: `apps/api/test/server.test.ts` (sözleşme kullanımı derlenir)

**Interfaces:**
- Produces (schema):
  - `enum PlaceCategory` + `PARKING`
  - `Place`: `parkingPlaceId String?` (kendine ilişki `parking Place? @relation("Parking")`), `hardParking Boolean @default(false)`
  - `Route`: `mode String @default("car")`, unique `[fromPlaceId, toPlaceId, mode]`
  - `SimSettings`: yalnızca `id`, `paused`, `updatedAt` (`driveRate`, `activityRate` silinir)
- Produces (data.ts): `kaleici-otopark` (35.1238, 33.9367, PARKING) ve `salamis-otopark` (35.1838, 33.9030, PARKING). `lala-mustafa-pasa-camii`, `othello-kalesi`, `namik-kemal-zindani`, `kaleici-ocakbasi`, `sur-dibi-meyhane`, `venedik-bar`, `macun-tatli`, `liman-kahve-evi` için `parking: 'kaleici-otopark', hardParking: true`. `salamis-antik-kenti` için `parking: 'salamis-otopark'`. Seed `parking` slug'ını id'ye çevirir; iki geçişte çalışır: önce bütün yerler, sonra park bağlantıları.
- Produces (contracts):
  ```ts
  simSettings = z.object({ paused: z.boolean() })
  weather = z.object({ tempC: z.number(), precipitationMm: z.number(), code: z.number(), isDay: z.boolean(), label: z.string() }).nullable()
  liveSnapshot.activity: + mode: z.enum(['foot','car','taxi']).nullable(), legIndex: z.number().int().nullable()
  liveSnapshot: + parkedCar: z.object({ position: lngLat, placeName: z.string().nullable() }).nullable()   // araba Deniz'in yanında değilse
  liveSnapshot: + weather, + speed: z.number()   // SIM_SPEED; 1 değilse arayüz "hızlandırılmış" gösterir
  liveSnapshot.routeKey artık mode önekli anahtar
  ```
  `placeInput` + `parkingPlaceId: z.string().nullable().default(null)`, `hardParking: z.boolean().default(false)`.

- [ ] **Step 1: Şemayı değiştir, migration üret**

Run: `pnpm db:migrate -- --name faz1-zaman-yaya`
Expected: yeni migration klasörü, `Your database is now in sync`

- [ ] **Step 2: data.ts ve seed'i güncelle, seed'i iki kez çalıştır** (idempotent olmalı)

Run: `pnpm db:seed && pnpm db:seed`
Expected: iki çalıştırmada da `✓ 54 yer, 10 araba, 6 iş`

- [ ] **Step 3: Sözleşmeleri güncelle; `pnpm typecheck` hatalarını bir sonraki görevlerin dosyaları dışında bırak**

Run: `pnpm --filter @mapcar/contracts typecheck && pnpm --filter @mapcar/db typecheck`
Expected: geçer

- [ ] **Step 4: Commit** `feat(db): park yerleri, kipli rotalar, sade simülasyon ayarları`

---

### Task 6: API: gerçek saat, kesinti telafisi, kipli rotalar, hava durumu

**Files:**
- Modify: `apps/api/src/env.ts`, `apps/api/src/sim/routing.ts`, `apps/api/src/sim/world.ts`, `apps/api/src/sim/runner.ts`, `apps/api/src/routes/admin.ts`, `.env.example`
- Create: `apps/api/src/sim/weather.ts`
- Test: `apps/api/test/weather.test.ts`, `apps/api/test/routing.test.ts`, `apps/api/test/server.test.ts`

**Interfaces:**
- Consumes: `wallClock`, `planCatchUp`, `advance(prev, world, minutes)`, `routeKey(from, to, mode)`, `Weather` (Task 1–4); contracts (Task 5)
- Produces (env): `SIM_SPEED` (`z.coerce.number().min(1).max(600).default(1)`), `FOOT_ROUTING_URL` (default `https://routing.openstreetmap.de/routed-foot`), `WEATHER_URL` (default Global Constraints'teki URL).
- Produces (weather.ts):
  ```ts
  export function parseOpenMeteo(body: unknown, now: number): Weather | null   // geçersizse null
  export function weatherLabel(code: number, isDay: boolean): string           // WMO kodu → 'Açık', 'Parçalı bulutlu', 'Yağmurlu', 'Gök gürültülü'…
  export class WeatherService { constructor(url: string, log, onUpdate: (w: Weather | null) => void); start(): void; stop(): void } // 15 dk aralık, hata → son değer korunur, 2 saatten eskiyse null
  ```
- Produces (routing.ts): `request(from, to, mode)`. Mode `foot` ise `FOOT_ROUTING_URL`, `car` ise `OSRM_URL`. Kip başına ayrı kuyruk ve ayrı 1,1 sn aralık. Prisma `Route` upsert'ü `mode` ile.
- Runner:
  - **Saat:** `SIM_SPEED === 1` ise hedef `wallClock(new Date())`. Değilse runner açılışta `virtualStart = state.clock` tutar, hedef `virtualStart + (gerçek geçen sn × SIM_SPEED) / 60` olur.
  - **Tick:** `planCatchUp(state.clock, target)`:
    - `none`: hiçbir şey yapma
    - `step`: `advance` + normal yayın
    - `fast`: 60'ar dakikalık parçalarla `advance`, effect'leri kaydet. Feed yayını yapılmaz, yalnızca en son snapshot yayınlanır.
    - `long_sleep`: Deniz'i eve ışınla (`activity` idle at home, `car.placeId` korunur), saati `target`'a ayarla, `'incident'` olayı yay: `'Uzun bir uykudan uyandı. Neler kaçırdı kim bilir?'`
  - **Açılış:** `state.version !== 2` ise `reset()` çağrılır ve `'Yeni bir sayfa: Deniz Mağusa'da gerçek zamanlı yeni hayatına başladı.'` olayı yayınlanır.
  - **Hava:** `WeatherService` `world.weather`'ı günceller.
  - **Rota yayını:** `routePayload()` ve `/v1/live/route` yalnızca **aktif bacağın** rotasını döner. Anahtar `routeKey(leg.fromPlaceId, leg.toPlaceId, leg.mode === 'foot' ? 'foot' : 'car')`, alanlar `{ key, geometry, distanceM, mode }`. Bacak değişince `route` SSE olayı yayınlanır. Contracts'taki `route` şemasına `mode: z.enum(['foot','car','taxi'])` eklenir.
  - **Snapshot:** `weather` (label ile), `speed`, `parkedCar` (araba `placeId` Deniz'in bulunduğu yerden farklıysa), `activity.mode` ve `legIndex` doldurulur.
  - **Duraklatma:** `paused` true iken tick hiçbir şey yapmaz. False'a dönünce bir sonraki tick `planCatchUp` ile doğal olarak telafi eder.
- `admin.ts`: `PATCH /settings` yalnızca `{ paused }` kabul eder.

- [ ] **Step 1: Failing testleri yaz**

```ts
// weather.test.ts
it('Open-Meteo yanıtını çözer', () => {
  const w = parseOpenMeteo({ current: { temperature_2m: 24.4, precipitation: 0, weather_code: 2, is_day: 1 } }, 100)
  expect(w).toEqual({ tempC: 24.4, precipitationMm: 0, code: 2, isDay: true, updatedAt: 100 })
})
it('bozuk yanıtta null', () => expect(parseOpenMeteo({ nope: 1 }, 0)).toBeNull())
it('WMO etiketleri', () => {
  expect(weatherLabel(0, true)).toBe('Açık')
  expect(weatherLabel(0, false)).toBe('Açık gece')
  expect(weatherLabel(61, true)).toBe('Yağmurlu')
  expect(weatherLabel(95, true)).toBe('Gök gürültülü')
})
// routing.test.ts: fetch'i vi.stubGlobal ile taklit et
it('foot isteği yaya sunucusuna gider', async () => { /* çağrılan URL routed-foot ile başlar, world.routes'a 'foot:' anahtarıyla eklenir */ })
it('sunucu 429 dönerse düz çizgi rotayı kaydeder', async () => { /* source 'straight' ile upsert */ })
// server.test.ts
it('ayarlar yalnızca paused kabul eder', async () => { /* { driveRate: 1 } → 400 */ })
```

- [ ] **Step 2: FAIL gör** (`pnpm --filter @mapcar/api test`)
- [ ] **Step 3: weather.ts, routing.ts, env.ts, runner.ts, admin.ts'i uygula**
- [ ] **Step 4: PASS gör; tip kontrolü**

Run: `pnpm --filter @mapcar/api test && pnpm --filter @mapcar/api typecheck`

- [ ] **Step 5: Elle doğrulama**

Run: `pnpm --filter @mapcar/api dev`, ardından `curl -s localhost:4000/v1/live | jq '.date, .weather, .activity'`
Expected: `date` saati şu anki KKTC saatiyle aynı (dakika hassasiyetinde), `weather.label` dolu, ilk açılışta akışta "Yeni bir sayfa" olayı.

- [ ] **Step 6: Commit** `feat(api): gerçek zamanlı runner, kesinti telafisi, yaya rotaları ve hava durumu`

---

### Task 7: Pastel harita stili ve gün döngüsü paleti

**Files:**
- Create: `apps/web/public/map/pastel.json`, `apps/web/src/components/map/palette.ts`, `apps/web/src/components/map/place-icons.ts`
- Modify: `apps/web/src/components/map/style.ts`, `apps/web/src/components/map/live-map.tsx`, `apps/web/src/lib/ambient.ts`, `apps/web/src/app/globals.css`
- Test: `apps/web/src/components/map/palette.test.ts` (web'e vitest eklenir: `"test": "vitest run"`, devDependency `vitest 5.0.5`)

**Interfaces:**
- Produces (palette.ts):
  ```ts
  export interface MapPalette { background: string; water: string; park: string; residential: string; building: string;
    road: string; roadCasing: string; sand: string; label: string; labelHalo: string }
  export const DAY: MapPalette; export const NIGHT: MapPalette; export const DUSK: MapPalette
  export function paletteAt(hour: number): MapPalette   // 0–5 NIGHT, 5–7 NIGHT→DAY (DUSK üzerinden), 7–17 DAY, 17–20 DAY→DUSK, 20–22 DUSK→NIGHT, 22–24 NIGHT
  export function applyPalette(map: MlMap, p: MapPalette): void // katman kimliği → boya özelliği eşlemesi
  ```
  Gündüz değerleri:
  - `background #FBEFE6` (açık kayısı)
  - `water #BFE3F2` (bebek mavisi)
  - `park #CDEFD9` (nane)
  - `residential #F6E6EC`
  - `building #E3DAF5` (lavanta)
  - `road #FFFFFF`, `roadCasing #F5CDB8` (şeftali)
  - `sand #FBEFC5`
  - `label #6B4E71`, `labelHalo #FFFFFF`

  Gece değerleri:
  - `background #2E3150`, `water #3E5A87`, `park #3B5450`, `residential #393B5E`, `building #4A4772`
  - `road #6F6D9C`, `roadCasing #F2C97E` (sokak lambası)
  - `sand #5A5370`
  - `label #F3E9FF`, `labelHalo #2E3150`

  DUSK: DAY ve NIGHT arası, gökyüzü tonu `#F7B9A6` ağırlıklı.
- `pastel.json`: OpenFreeMap positron'un katman listesinden türetilir. Kaynak `https://tiles.openfreemap.org/planet`, glyphs aynı; renkler DAY paletinden; etiket `text-field` → `coalesce(name:tr, name:latin, name)`. Yakın zoomda (≥ 15.5) `building` için `fill-extrusion`, yükseklik `render_height`.
- `place-icons.ts`: `registerPlaceIcons(map: MlMap): Promise<void>`. Her kategori grubu (food, sight, sea, daily, life, parking) için 40×40 px'lik pastel daire ve beyaz kenar üstüne lucide ikon path'ini canvas'a çizip `map.addImage('pin-food', …, { pixelRatio: 2 })` ile ekler. `places-dot` circle katmanı yerine `places-pin` symbol katmanı (`icon-image: ['concat','pin-',['get','group']]`) kullanılır. `PARKING` yalnızca zoom ≥ 15'te görünür.
- `ambient.ts`: `mapFilter` ve CSS filtresi kaldırılır. `isNight` ve `phaseLabel` kalır. `globals.css` içindeki `.map-shell .maplibregl-canvas { filter }` kuralı silinir.
- Arayüz tonları (`globals.css :root`): `--background #FFF8F3`, `--tas-soft #FBE7D6`, `--korfez-soft #DCEFF8`, `--narenciye #F2895A` (pastel turuncu, kontrast için metinlerde kullanılmaz), `--border #F0E2D8`. Koyu tema değişmez.

- [ ] **Step 1: Failing test**

```ts
it('öğlen gündüz paleti', () => expect(paletteAt(12)).toEqual(DAY))
it('gece yarısı gece paleti', () => expect(paletteAt(0)).toEqual(NIGHT))
it('akşam 18:30 geçiş renkleri hex', () => expect(paletteAt(18.5).water).toMatch(/^#[0-9a-f]{6}$/i))
it('geçiş süreklidir: 19.99 ile 20.01 neredeyse aynı', () => {
  // iki rengin kanal farkı ≤ 3
})
```

- [ ] **Step 2: FAIL gör** (`pnpm --filter @mapcar/web test`)
- [ ] **Step 3: palette.ts, pastel.json, place-icons.ts; live-map entegrasyonu**

`MAP_STYLE = '/map/pastel.json'`. `onLoad`'da `registerPlaceIcons` + `applyPalette(paletteAt(hour))`. Saat değiştikçe en fazla dakikada bir `applyPalette` çağrılır. `tuneStyle` silinir.
- [ ] **Step 4: PASS gör**
- [ ] **Step 5: Görsel doğrulama**

Playwright betiğiyle (bkz. `docs/architecture.md` dışında; scratchpad'deki `shot.mjs` yöntemi) 1440×900 ekran görüntüsü al. Harita pastel olmalı, mekanlar ikonlu rozet olmalı, konsolda hata olmamalı. Saat 22 sonrası için `paletteAt` sonucunu elle `applyPalette` ile uygulayıp gece görüntüsünü de kontrol et.
- [ ] **Step 6: Commit** `feat(web): pastel harita stili, gün döngüsü paleti ve ikonlu mekan rozetleri`

---

### Task 8: Yaya, taksi ve park edilmiş araba işaretçileri; bacak animasyonu; hava çipi

**Files:**
- Create: `apps/web/src/components/map/markers.ts`, `apps/web/src/components/live/weather-chip.tsx`
- Delete: `apps/web/src/components/map/car-marker.ts`
- Modify: `apps/web/src/components/map/live-map.tsx`, `apps/web/src/components/live/agent-panel.tsx`, `apps/web/src/components/site/sim-clock.tsx`, `apps/web/src/app/globals.css`, `apps/web/src/lib/live-store.ts`

**Interfaces:**
- Consumes: snapshot `activity.mode`, `activity.legIndex`, `activity.progress`, `parkedCar`, `weather`, `speed`, `routeKey` (Task 5); `/v1/live/route` artık aktif bacağın rotasını döner (Task 6'daki `routePayload` bacak anahtarıyla)
- Produces (markers.ts):
  ```ts
  export type AvatarMode = 'foot' | 'car' | 'taxi' | 'at'
  export class AgentMarker { marker: Marker; setMode(m: AvatarMode, carColor: string): void; setPose(lngLat: LngLat, heading: number): void; setNight(n: boolean): void; setBadge(action: string | null): void }
  export class ParkedCarMarker { marker: Marker; set(lngLat: LngLat | null, color: string): void }
  ```
  - `foot`: 28 px pastel karakter (yuvarlak baş, gövde, Deniz'in rengi `--narenciye`). Yürürken CSS `@keyframes bob` (0.5 sn, 2 px yukarı-aşağı); `prefers-reduced-motion`'da kapalı. Kuzeye dönmez, yalnızca yürüme yönüne göre yatay aynalanır.
  - `car`: mevcut üstten araba SVG'si.
  - `taxi`: aynı SVG, gövde `#F7D154`, tepede küçük "TAKSİ" levhası.
  - `at`: karakter oturur, `setBadge` ile etkinlik rozeti gösterir: eat 🍽 yerine lucide `UtensilsCrossed`, coffee `Coffee`, work `Laptop`, sleep `Moon`, beach `Umbrella`. Rozetler SVG path olarak gömülür.
  - Park edilmiş araba: %55 opak araba simgesi, üstünde küçük "P".
- `live-map.tsx`: enterpolasyon, bacak içi `progress` üzerinden çalışır. `route` store'daki rota aktif bacağın rotasıdır (anahtar `routeKey` ile eşleşir). Yayayken kamera zoom 16.5, arabadayken mevcut kurallar.
- `weather-chip.tsx`: `{weather.label}, {Math.round(tempC)}°`, lucide ikonu (Sun, Moon, CloudSun, CloudRain, CloudLightning). Saatin yanında, header'da. `weather` null ise hiçbir şey göstermez.
- `sim-clock.tsx`: `speed !== 1` ise saatin yanında küçük "hızlandırılmış ×{speed}" rozeti. Tooltip metni: `'Deniz, KKTC saatiyle gerçek zamanlı yaşıyor.'`
- `agent-panel.tsx`: etkinlik satırının altında kip ve araba durumu: `'Yürüyor'`, `'Arabayla'`, `'Taksiyle'`. Araba başka yerdeyse `'Arabası {placeName} önünde park hâlinde'`.

- [ ] **Step 1: Görsel kabul ölçütlerini betikle**

`scripts/visual-check.mjs` (repo dışı, scratchpad'de): `localhost:3010` açılır, `SIM_SPEED=60` ile çalışan API'de 3 dakika boyunca her 10 saniyede ekran görüntüsü alınır. Görüntülerde en az bir yaya, bir araba ve (mümkünse) bir oturan karakter görülmeli. Konsolda hata olmamalı.

- [ ] **Step 2: markers.ts, weather-chip.tsx ve entegrasyonu uygula**
- [ ] **Step 3: Doğrula**

Run: `pnpm --filter @mapcar/web typecheck && pnpm lint`, ardından Step 1 betiği.
Expected: tip ve lint temiz; görüntülerde kipler doğru; `reduce` modunda `bob` animasyonu yok.
- [ ] **Step 4: Commit** `feat(web): yaya, taksi ve park edilmiş araba işaretçileri, hava durumu`

---

### Task 9: Admin sadeleşmesi, dokümantasyon ve son kontrol

**Files:**
- Modify: `apps/admin/src/app/(panel)/dashboard.tsx`, `apps/admin/src/lib/actions.ts`, `apps/admin/src/app/(panel)/yerler/places-table.tsx`, `README.md`, `docs/architecture.md`, `.env.example`

**Interfaces:**
- Consumes: `simSettings = { paused }` (Task 5)
- Değişiklikler:
  - **Panel:** "Zamanın akışı" kartında yalnızca duraklat/devam düğmesi ve şu metin kalır: `'Deniz gerçek KKTC saatiyle yaşıyor. Duraklatılırsa, devam edince aradaki süreyi hızlıca yaşar (en fazla 48 saat).'`
  - **Hazır ayarlar ve kaydırıcılar** silinir.
  - **Yer formu:** "Park yeri" (PARKING kategorisindeki yerlerden seçim, boş bırakılabilir) ve "Park bulmak zor" anahtarı eklenir.
  - **README:** "Zaman uyarlamalı akıyor" maddesi kaldırılır; yerine gerçek zaman ve `SIM_SPEED` (yalnızca geliştirme) anlatılır. Kurulum bölümüne `SIM_SPEED=60 pnpm dev` ipucu eklenir. Ortam değişkenleri tablosuna `SIM_SPEED`, `FOOT_ROUTING_URL`, `WEATHER_URL` eklenir. Atıflara FOSSGIS routing ve Open-Meteo eklenir.
  - **architecture.md:** "Akış" ve "Simülasyon motoru" bölümleri `advance(minutes)`, `planCatchUp`, bacaklı yolculuk ve `chooseMode` ile güncellenir.

- [ ] **Step 1: Değişiklikleri uygula**
- [ ] **Step 2: Tam doğrulama**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: hepsi başarılı

- [ ] **Step 3: Admin'i elle dene**

Panelden duraklat, 2 dakika bekle, devam ettir. Akışta telafi sonrası saat gerçek saate eşit olmalı.

- [ ] **Step 4: Commit ve push**

```bash
git add -A
git commit -m "feat(admin): gerçek zamana uygun sade panel, park ayarları; dokümantasyon"
git push
```

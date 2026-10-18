# Mimari

Bu belge kodu okumaya başlamadan önce resmi görmek isteyenler için.

## Akış

1. `apps/api` açılırken `SimRunner.init()` dünyayı (yerler, işler, arabalar, kayıtlı rotalar) veritabanından yükler. Karakter yoksa `seedData.agent` ile yenisini oluşturur.
2. Runner her `SIM_TICK_MS` (varsayılan 1000 ms) aralığında `advance()` çağırır.
3. `advance()` yeni bir durum ve bir **effect** listesi döndürür. Effect'ler motorun dış dünyaya söylediği şeylerdir: olay, para hareketi, yorum, araba alımı, hedef, gün sonu, rota ihtiyacı.
4. Runner effect'leri sıralı bir yazma zincirinde veritabanına işler. Olayları ve anlık durumu SSE ile bütün istemcilere yayınlar.
5. Tam durum her 5 adımda bir `Agent.state` (JSON) alanına kaydedilir. API yeniden başladığında simülasyon kaldığı yerden devam eder.

## Simülasyon motoru (`packages/sim`)

- **Zaman:** Başlangıçtan beri geçen simülasyon dakikası (`clock`). Gün 0 Pazartesi, 5 Ocak 2026. Saat dilimi yok; tarihler UTC alanlarında yerel saat gibi taşınır.
- **Adım:** `advance` gerçek saniyeyi simülasyon dakikasına çevirir. Hız etkinliğe bağlıdır: araba yoldayken `driveRate`, diğer zamanlarda `activityRate`. Sonra en fazla 1 dakikalık alt adımlarla ilerler.
- **İhtiyaçlar:** `hunger`, `energy`, `fun`, `social` 0–100 arasında. Etkinliğe göre farklı hızlarda azalır; etkinlikler dakika başına `gains` ile doldurur.
- **Karar (utility AI):** Karakter boşta kaldığında `decide()` adayları puanlar. Örneğin yemek puanı açlık aciliyeti ile öğrenilmiş mekan puanının toplamı; iş vardiya saatinde sabit ve yüksek. En yüksek puanlı aday, küçük bir rastgelelikle seçilir. Mekan seçerken beklenen puan, yenilik, yakın zamanda gidilmiş olma, fiyat ve mesafe hesaba katılır.
- **Hafıza:** `memory[placeId]` ziyaret sayısını ve ortalama puanı tutar. Gizli `quality` yalnızca deneyimle öğrenilir.
- **Ekonomi:** `economy.ts`. Fiyatlar, kira, yakıt, takas değeri.
- **Kariyer:** Çalışmak ve kendini geliştirmek XP kazandırır. `LEVEL_XP` eşikleri aşıldığında `minLevel` koşulunu sağlayan en iyi ücretli işe geçilir.
- **Rastgelelik:** Durumu tek bir sayı olan `mulberry32`. RNG durumu `AgentState.rng` içinde saklanır, bu yüzden simülasyon tamamen tekrarlanabilir.

## Rotalar

Motor rotası olmayan bir yolculuğa başlarken `need_route` effect'i yayar ve birkaç simülasyon dakikası bekler. `RouteService` istekleri sıraya alır (OSRM demo sunucusunun ~1 istek/sn kuralı), sonucu `Route` tablosuna yazar ve dünyaya ekler. OSRM'e ulaşılamazsa motor düz çizgi rotaya düşer.

## İstemcide araba animasyonu

Sunucu saniyede bir `snapshot` gönderir: `routeKey`, `activity.progress` ve konum. Tarayıcı bir önceki ve son snapshot arasındaki ilerlemeyi rota çizgisi üzerinde enterpolasyonla hesaplar (`pointAlong`). Araba işaretçisi `requestAnimationFrame` ile React'e uğramadan güncellenir. Rota çizgisinin geçilen kısmı `line-gradient` ile turuncuya boyanır.

## Güvenlik

- Admin uçları `Authorization: Bearer <ADMIN_API_TOKEN>` ister; karşılaştırma `timingSafeEqual` ile yapılır.
- Admin token tarayıcıya hiç inmez. Panel, API'ye yalnızca Server Component'ler ve Server Action'lar üzerinden konuşur.
- Panel oturumu HS256 ile imzalı, httpOnly bir çerezde tutulur. Server Action'lar her sayfa adresine POST edilebildiği için her action oturumu ayrıca doğrular; `proxy.ts`'e güvenilmez.
- API'de helmet ve rate limit açıktır. SSE akışı rate limit dışında tutulur.

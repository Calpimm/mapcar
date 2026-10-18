# Yaşayan Deniz: tasarım belgesi

Tarih: 18 Ekim 2026. Durum: kullanıcı onayı bekliyor.

## Niyet

İlk sürüm çalışıyor ama bir **oyun** gibi hissettiriyor. Zaman çok hızlı akıyor (bir gün ~4 dakika), Deniz yalnızca bir araba olarak görünüyor, mekanlar ve fiyatlar kurgusal, hayatında başka insan yok. İzleyen kişi onunla bağ kuramıyor.

Hedef: Deniz'i **Mağusa'da gerçekten yaşayan biri** gibi hissettirmek. Siteye öğlen giren biri onu gerçek bir restoranda öğle yemeğinde görür. Gece girerse uyuyordur. Arkadaşları vardır, Kaleiçi'nde yürür, haftalarca para biriktirip araba alır. Siteye gelenler de onun hayatına dokunabilir: oy verir, öneride bulunur, mesaj atar, ona arkadaş olur.

Başarı ölçütü: biri siteyi açınca "şu an ne yapıyor?" diye merak etsin, ertesi gün tekrar bakmaya gelsin.

## Hedefler

1. **Gerçek zaman.** Simülasyon saati, KKTC'nin gerçek yerel saatidir (`Asia/Famagusta`).
2. **Yaya hayatı.** Deniz arabasını park edip yürür. Haritada yürüyen bir karakter olarak görünür, araba park yerinde bekler.
3. **Pastel harita.** Kendi MapLibre stilimiz. Yumuşak, sevimli, açık renkler; gece için de pastel bir gece paleti.
4. **Gerçek veri.**
   - Mekanlar OpenStreetMap'ten: gerçek isim, konum ve mümkünse açılış saatleri.
   - Araba fiyatları KKTC ikinci el piyasasından.
   - Maaş, kira ve yakıt KKTC 2026 rakamlarından.

   Kaynaklar ve tarihleri belgelenir.
5. **İnsan gibi hayat.**
   - Arkadaşlar, ilişkiler ve sosyal planlar.
   - Uzun vadeli hedefler ve hobiler.
   - Aylık maaş ve faturalar.
   - Gerçek hava durumu.
6. **Topluluk.** Oylama, öneri, mesaj ve hediye, arkadaş karakteri yaratma, moderasyonla birlikte.

## Hedef olmayanlar

- Kullanıcı hesabı, e-posta ile kayıt, şifre. Ziyaretçiler anonim kalır.
- Birden fazla ana karakter. Tek kahraman Deniz; arkadaşlar hafif NPC'ler.
- Gerçek para, ödeme, reklam.
- Mobil uygulama.

## Anti-hedefler (çalışsa bile başarısızlık sayılacaklar)

- Sitenin büyük çoğunluğunda "hiçbir şey olmuyor" hissi. Gerçek zaman yavaş olacak ama ekran ölü görünmemeli: Deniz uyurken bile günlüğü, planı, arkadaşlarının durumu, oylamalar ilgi çekmeli.
- Topluluğun Deniz'i bir trol oyuncağına çevirmesi: küfürlü mesajlar, saçma arkadaş isimleri, her saat araba sattırma.
- Gerçek bir işletmeye zarar veren yorumlar. Bkz. "Gerçek mekan puanları".
- Yapay zekâ ürünü gibi görünen arayüz. İlk sürümdeki tasarım ilkeleri korunur.

## Kullanıcının verdiği kararlar

| Konu | Karar |
| --- | --- |
| Zaman | Gerçek KKTC saati, 1:1 |
| Gerçek mekanlar | Gerçek isimler, tam puanlama (olumsuz yorumlar dahil). Risk kullanıcıda |
| Topluluk | Oylama, öneri, mesaj ve hediye, arkadaş yaratma; hepsi mantıklı biçimde birleşik |
| Yayın | VPS üzerinde Docker Compose (tek, sürekli açık API süreci) |
| Claude | Opsiyonel: anahtar varsa günlük ve yanıtları Claude yazar, yoksa şablonlar |

## Tasarım

### 1. Zaman

- `clock` artık gerçek yerel saatten türetilir: `Asia/Famagusta` saat dilimindeki "duvar saati" dakikası. Gün sınırları, hafta günleri ve yaz saati bu dilime göre hesaplanır.
- Runner her adımda gerçek geçen süre kadar ilerletir. Uyarlamalı hız (yolda yavaş, etkinlikte hızlı) kalkar.
- **Kesinti telafisi.** API bir süre kapalı kaldıysa açılışta aradaki süre hızlı simüle edilir (yayın yapmadan), en fazla 48 saat. Daha uzun kesintide Deniz "uzun bir uyku" olayıyla eve alınır ve oradan devam eder.
- Canlı karakterde hız ayarı yoktur; hızlandırma yalnızca geliştirme ortamı içindir (bkz. "Benim verdiğim kararlar").
- Ekonomi gerçek zamana göre yeniden ölçeklenir: maaş aylık yatar, kira aylık, faturalar aylık, market haftalık.

### 2. Hareket: araba ve yaya

- **Ulaşım seçimi:** 1 km'den yakın yerlere yürür, gerisine arabayla gider. Kaleiçi (surlar içi) gibi araç girişi zor bölgelerde en yakın park yerine park edip yürür.
- **Park yerleri:** OSM'den `amenity=parking` noktaları çekilir. Bir mekanın park yeri, ona yakın olan park noktasıdır.
- **Yaya rotaları:** FOSSGIS routing (`routing.openstreetmap.de`) foot profili kullanılır; araba için de aynı sunucunun car profili veya OSRM demo kullanılır. Sonuçlar mevcut `Route` tablosunda `mode` alanıyla önbelleklenir.
- **Gezinti etkinlikleri:** Belirli bir mekana gitmek yerine bir rota boyunca yürümek: "Kaleiçi turu", "sahil yürüyüşü", "Salamis antik kent gezisi". Birkaç ara noktadan geçen yürüyüş rotalarıdır, ara noktalarda kısa duraklar yapılır ("Othello Kalesi'nin önünde fotoğraf çekti").
- **Haritada görünüm:** Arabadayken araba görünür. Yayayken küçük, sevimli bir karakter yürüme animasyonuyla görünür; araba park yerinde soluk bir simgeyle kalır. Mekan içindeyken karakter mekanın simgesinin yanında oturur, etkinliğine göre bir rozet taşır (yemek, kahve, çalışma, uyku).

### 3. Pastel harita

- OpenFreeMap vektör karolarını (OpenMapTiles şeması) kullanan **kendi stil JSON dosyamız** olur: `apps/web/public/map/pastel.json`. Çalışma anında renk yamamak yerine stilin kendisi yazılır.
- Gündüz paleti:
  - kara: açık kayısı
  - su: bebek mavisi
  - park ve yeşil alanlar: nane
  - binalar: lavanta, hafif 3B yükseklik yakın zoomda
  - yollar: beyaz, şeftali kenarlı
  - kum ve plajlar: krem sarısı
  - etiketler: yumuşak koyu mürdüm
- Gece için ayrı bir pastel gece paleti: gece mavisi, leylak, sıcak sarı sokak lambası tonları. Sitedeki gün döngüsü ışığı bu iki palet arasında geçiş yapar; CSS filtresiyle karartma yöntemi bırakılır.
- Mekan işaretçileri kategori ikonlu yuvarlak pastel rozetler olur, düz noktalar kalkar.
- Arayüz paleti haritayla uyumlu olacak şekilde pastele kaydırılır. Tipografi ve sade düzen korunur.

### 4. Gerçek veri

**Mekanlar (OpenStreetMap, ODbL)**

- Bir veri script'i (`packages/db/scripts/import-osm.ts`) Overpass API'den çeker:
  - Gazimağusa: restoran, kafe, fast food, bar, pub, fırın, dondurmacı; plaj, tarihi yer, müze, park; benzinlik, süpermarket, AVM, spor salonu, oto galeri, oto tamirci, park yerleri.
  - Kaçamak şehirleri (Girne, Lefkoşa, İskele, Karpaz, Güzelyurt, Lefke): yalnızca belirgin turistik yerler ve bunların yakınındaki birkaç restoran.
- Çıktı, elle gözden geçirilmiş, repoda saklanan bir JSON veri dosyasıdır (`packages/db/prisma/data/places.osm.json`). Seed bu dosyadan beslenir. Script sadece veriyi tazelemek için çalıştırılır; uygulama çalışırken Overpass'a gitmez.
- OSM'de olmayan ama önemli gerçek yerler elle eklenebilir. Kurgusal mekanlar kaldırılır, yalnızca Deniz'in evi kurgusal kalır.
- `quality` (gizli kalite): gerçek dünyadaki itibar hakkında veri olmadığı için mekan türü ve fiyat seviyesinden türetilen makul bir dağılım, artı rastgele sapma. Belgede bunun bir tahmin olduğu yazar.
- README ve sitede OSM atıfı yer alır.

**Fiyatlar ve ekonomi**

- Araştırılıp belgelenecek kalemler; her birinin kaynağı ve tarihi `docs/data-sources.md` dosyasına yazılır:
  - KKTC asgari ücreti
  - Mağusa'da yazılım geliştirici ve barista maaşları
  - Mağusa'da 1+1 kira (öğrenci şehri, kira sıklıkla sterlin)
  - Benzin litre fiyatı
  - Tipik restoran ve kafe fiyatları
  - KKTC ikinci el piyasasında yaygın modellerin fiyat aralığı
- Para birimi TL kalır. Sterlinle verilen kiralar TL'ye çevrilir, kur belgelenir.
- Araba listesi KKTC'de gerçekten yaygın modellerden oluşur. Fiyatlar araştırılan aralığın ortası, yıl ve kilometreye göre.

**Hava durumu (gerçek)**

- Open-Meteo (anahtarsız) ile Gazimağusa'nın anlık havası her 15 dakikada çekilir.
- Yağmurda plaj seçilmez ve kapalı mekan tercihi artar. Çok sıcakta öğlen dışarı çıkma isteği düşer. Arayüzde hava durumu gösterilir.

### 5. İnsan gibi hayat

**Arkadaşlar (NPC'ler)**

- Her arkadaşın şu özellikleri vardır:
  - isim
  - kısa biyografi
  - kişilik özellikleri (listeden 2–3 tane: sosyal, sporcu, gurme, kitap kurdu, gececi…)
  - favori mekanlar
  - haftalık müsaitlik kalıbı
  - Deniz'le **yakınlık puanı** (0–100)
- Arkadaşlar tam simüle edilmez. Yalnızca Deniz'le birlikteyken haritada görünürler.
- **Sosyal plan:** Deniz'in sosyallik ihtiyacı düştüğünde ya da hafta sonu yaklaştığında bir arkadaşına yazar ("Akşam Kaleiçi'nde bir şey içelim mi?"). Arkadaş müsaitliğine ve yakınlığa göre kabul eder ya da reddeder. Kabul edilen plan Deniz'in gün planına girer.
- Birlikte geçen zaman yakınlığı artırır, uzun süre görüşmemek azaltır.
- Doğum günleri, küçük küslükler, "uzun zamandır görüşmedik" mesajları ve birlikte hafta sonu kaçamakları gibi olaylar yaşanır.
- **Yeni arkadaş edinme:** Yeni bir mekanda, spor salonunda ya da iş yerinde tanışır. Tanıdıklar bir havuzdan seçilir; havuzu seed arkadaşlar ve topluluğun yarattığı arkadaşlar oluşturur.

**Uzun vadeli hayat**

- **Hedefler sürer:**
  - araba almak
  - kariyer
  - KKTC'yi keşfetmek

  Ölçekleri gerçek zamana göre ayarlanır; bir araba haftalar ya da aylar sürer.
- **Yeni hedef türleri:**
  - daha iyi bir eve taşınmak: ev değişince harita konumu da değişir
  - bir hobi edinmek: gitar, koşu ya da yemek yapma; seriler ve ilerleme tutulur
  - bir kedi sahiplenmek
  - bir arkadaşla uzun bir hafta sonu gezisi
- **Haftalık plan:** Pazar akşamı Deniz haftayı planlar. Sabit işler, arkadaş buluşmaları, hobi saatleri ve topluluğun kazanan önerisi bu plana girer. Günlük plan haftalık plandan türetilir.
- **Günlük:** Her gece Deniz gününü birkaç cümleyle özetler. Şablon tabanlıdır; isteğe bağlı olarak Claude ile yazılabilir (bkz. Opsiyonel).

### 6. Topluluk

**Ziyaretçi kimliği**

- İlk ziyarette imzalı bir çerezle rastgele bir ziyaretçi kimliği atanır. İsteğe bağlı bir takma ad seçilir.
- Hesap yoktur. Kötüye kullanım sınırları ziyaretçi kimliği ve IP üzerinden uygulanır.

**Oylamalar**

- Motor, gerçek karar anlarından **oylama** üretir:
  - "Bu akşam ne yapsın?"
  - "Hafta sonu nereye gitsin?"
  - "Hangi arabayı alsın?"
  - "Hangi hobiye başlasın?"
- Süre gerçek zamanla 30 dakika ile 24 saat arasıdır.
- Kazanan seçenek motorda güçlü bir **niyet** olur. Deniz uygunsa onu yapar; ihtiyaçları kritikse (çok aç, çok yorgun) önce onları giderir.
- Aynı anda en fazla 2 açık oylama bulunur. Her ziyaretçinin oylama başına bir oyu vardır.

**Öneriler**

- Ziyaretçi serbest metin değil **yapılandırılmış** öneri gönderir: eylem türü ve hedef listeden seçilir ("şu restorana gitsin", "şu arkadaşı arasın", "şu hobiyi denesin"), yanına kısa bir not eklenebilir.
- Diğer ziyaretçiler öneriyi beğenir. Her gün en çok beğenilen öneri, ertesi günün planına niyet olarak girer.
- Deniz bunu günlüğünde anar ("Topluluk Petek Pastanesi'ni önerdi, gittim, iyi ki gitmişim").

**Mesaj ve hediye**

- **Mesaj:** Ziyaretçiler Deniz'e kısa mesaj bırakır (en fazla 200 karakter). Mesajlar küfür filtresinden geçer, admin gizleyebilir. Deniz akşamları mesajlarını okur. Birkaçına kısa yanıt verir; yanıtlar mesaj altında ve akışta görünür.
- **Hediye:** "Kahve ısmarla", "dondurma ısmarla", "benzin parası" gibi küçük hediyeler vardır. Ziyaretçi başına günde 1 hediye hakkı bulunur. Hediye küçük bir para ya da keyif etkisi yaratır ve akışta gönderenin takma adıyla görünür. Ekonomiyi bozmaması için günlük toplam hediye etkisine tavan konur.

**Arkadaş yaratma**

- Ziyaretçi bir arkadaş karakter önerir: isim, yaş, kişilik özellikleri (listeden), kısa biyografi, favori mekan (gerçek mekanlardan).
- Öneri admin onay kuyruğuna düşer. Onaylanan karakter tanışma havuzuna girer.
- Deniz onunla tanıştığında sitede "@takmaad'ın yarattığı X ile tanıştı" diye görünür.
- Ziyaretçi başına haftada 1 arkadaş önerisi hakkı vardır.

**Moderasyon**

- Türkçe küfür listesi, uzunluk sınırları ve rate limit uygulanır.
- Admin panelinde **Topluluk** bölümü bulunur: mesajlar, öneriler ve arkadaş başvuruları; onayla, gizle, ziyaretçiyi engelle.

### 7. Gerçek mekan puanları

Kullanıcı kararı gereği Deniz gerçek mekanlara tam puan verir, olumsuz yorumlar dahil. Zararı sınırlamak için şunlar uygulanır:

- Yorum metinleri yalnızca **öznel damak zevki ve ortam** hakkındadır ("bana fazla tuzlu geldi", "kalabalıktı"). Hijyen, sağlık, dolandırıcılık, personel davranışı gibi olgusal iddia içeren şablonlar yoktur.
- Her puanın yanında ve mekan sayfasında "Bu puanlar bir simülasyon karakterine aittir, gerçek bir değerlendirme değildir" notu bulunur.
- Admin panelinde her mekan için **"puanlamayı kapat"** anahtarı olur. Kapatılınca mevcut yorumlar gizlenir. Bir işletme şikâyet ederse tek tıkla uygulanır.

### 8. Arayüz değişiklikleri

- **Canlı sayfa:**
  - Deniz'in durum kartına hava durumu, yanındaki arkadaş(lar) ve "şu an" ifadesi eklenir ("Kalecik Restaurant'ta Ayşe'yle öğle yemeğinde").
  - Açık oylamalar ve mesaj kutusu görünür bir yerde durur.
  - Gece ekranı: Deniz uyurken "Deniz uyuyor. Uyanınca neler yapacak?" başlığıyla yarının planı, son günlük yazısı ve açık oylamalar gösterilir.
- **Yeni sayfalar:**
  - **Arkadaşlar:** liste, yakınlık ve birlikte yapılanlar
  - **Topluluk:** oylamalar, öneriler, mesaj duvarı, arkadaş yarat formu
- Günlük sayfasına Deniz'in gece yazdığı günlük girdileri eklenir.

### 9. Mimari etkileri

- **Motor (`packages/sim`):**
  - gerçek saat dilimi desteği
  - yaya modu ve rota türleri
  - arkadaşlar ve ilişkiler
  - niyetler (topluluk ve sosyal planlar)
  - haftalık plan
  - hava durumu girdisi
  - yeni hedef türleri

  Motor saf ve deterministik kalır: hava durumu ve topluluk niyetleri `World`/girdi olarak verilir.
- **Veritabanı yeni tablolar:**
  - `Friend`, `Relationship`
  - `Visitor`
  - `Poll`, `PollOption`, `Vote`
  - `Suggestion`, `SuggestionVote`
  - `Message`, `Gift`
  - `FriendProposal`
  - `DiaryEntry`
  - `WeatherSnapshot`

  `Route` tablosuna `mode` (car, foot) alanı, `Place` tablosuna `osmId`, `ratingsEnabled` ve park yeri alanları eklenir.
- **API yeni uçları:**
  - ziyaretçi oturumu
  - topluluk uçları (oy, öneri, beğeni, mesaj, hediye, arkadaş önerisi)
  - admin moderasyon uçları

  Rate limit yazma uçlarında sıkılaştırılır.
- **Durum göçü:** Mevcut `AgentState` sürüm 2'ye taşınır. Mevcut ilerleme (para, kariyer, araba) korunur; saat gerçek zamana atlar.

## Sınırlamalar

- Ücretsiz servisler (OpenFreeMap, OSRM demo, FOSSGIS routing, Overpass, Open-Meteo) kullanım kurallarına uyulacak şekilde çağrılır: önbellek ve sıra. Uygulama çalışırken Overpass'a hiç gidilmez.
- Repo public kalır. Hiçbir anahtar repoya girmez.
- Deterministik motor ve testleri korunur. Her yeni davranışın testi olur.

## Yayın

- Tek bir VPS'te `docker compose`: postgres, api, web, admin ve önlerinde **Caddy** (otomatik HTTPS, alan adı yönlendirme).
- API tek süreç olarak, sürekli açık çalışır. Runner'ın tek kopya olması zorunludur; birden fazla API kopyası çalıştırılmaz.
- Gerçek ziyaretçi IP'si Caddy'nin `X-Forwarded-For` başlığından alınır (Fastify `trustProxy` yalnızca Caddy için).
- Postgres günlük yedeği (`pg_dump` + 7 günlük rotasyon) compose'a dahil edilir.
- `docs/deploy.md`: sunucu kurulumu, alan adı, ortam değişkenleri, güncelleme adımları.

## Claude ile günlük ve yanıtlar (opsiyonel)

- `ANTHROPIC_API_KEY` tanımlıysa Deniz'in **gece günlüğü** ve topluluk mesajlarına **yanıtları** Claude ile yazılır. Tanımlı değilse şablonlar kullanılır. İki yol aynı arayüzü uygular.
- Girdi, yalnızca Deniz'in o günkü olay özeti ve (yanıt için) filtreden geçmiş mesaj metnidir. Sistem istemi Deniz'in kişiliğini, Türkçe yazmayı, kısa kalmayı, ziyaretçi mesajındaki talimatlara uymamayı ve gerçek işletmeler hakkında olgusal iddiada bulunmamayı içerir.
- Çıktı da küfür filtresinden geçer. Günlük bir **harcama ve çağrı tavanı** vardır; aşılınca şablona düşülür.
- Çağrılar runner'ın tick döngüsünü bloklamaz; sonuç hazır olunca yayınlanır. Model kimliği yapılandırılabilir.

## Builder'a bırakılanlar

- Etkinlik süreleri, ihtiyaç azalma hızlarının gerçek zamana göre yeniden ayarı.
- Kişilik özelliklerinin davranışa etkisinin ayrıntıları.
- Pastel paletin kesin renk değerleri (yukarıdaki yön içinde).
- Oylama üretme kurallarının ayrıntıları, tavan ve sınır sayıları.
- Fazlara bölme ve uygulama sırası.

## Benim verdiğim kararlar (kullanıcı kontrol etsin)

- Saat dilimi `Asia/Famagusta` (KKTC'nin resmi dilimi).
- 1 km altı yürüme eşiği, 48 saat kesinti telafisi tavanı.
- Ziyaretçi kimliği hesapsız, imzalı çerezle.
- Öneriler serbest metin değil yapılandırılmış (trol riskini azaltır, motorun yapabileceği şeylerle sınırlar).
- Arkadaş önerileri admin onayından geçer, mesajlar ise filtreden sonra hemen yayınlanır (admin sonradan gizleyebilir).
- Kurgusal mekanlar kaldırılır. Deniz'in evi **ve iş yerleri** kurgusal kalır: gerçek bir adresi ya da gerçek bir işvereni göstermemek için. İş yerleri puanlanmaz ve gerçek bir binanın üstüne değil, uygun bir sokak noktasına konur.
- **Geçmiş sıfırlanır.** Bütün mekanlar değiştiği için eski yorumlar, olaylar ve rotalar taşınmaz; Deniz gerçek zamanlı yeni hayatına temiz bir başlangıçla başlar ("yeni bir sayfa" olayı). Durum sürüm 2 şemasıyla yeniden oluşturulur, sürüm 1 göçü yazılmaz.
- **Hız çarpanı canlı karakterde yoktur.** Canlı simülasyon her zaman 1:1 gerçek zamandır. Hızlandırma yalnızca yerel geliştirme ve testler için bir ortam değişkenidir (`SIM_SPEED`). Bunun için admin panelindeki hız ayarı kaldırılır, yerine "duraklat" kalır. Duraklatma bitince saat gerçek zamana atlar ve aradaki süre kesinti telafisi kurallarıyla işlenir.
- **OSM verisini builder derler:** mekan listesi script ile çekilir, builder anlamsız ve kapalı kayıtları ayıklar. Kullanıcı listeyi admin panelinden sonradan düzenleyebilir; onay adımı yayını bloklamaz.

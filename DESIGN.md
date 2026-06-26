# PORTAL LAB — Tasarım & Yol Haritası

Özgün, "esinlenilmiş" bir portal bulmaca oyunu. Telifli içerik yok
(karakter/isim/logo/ses kullanılmaz); portal görseli kendi GLSL shader'ımız.

## Hikâye (özet)

Çok-evrenli bir araştırma tesisinde **çömez bir laboratuvar stajyerisin**.
Bir portal deneyi ters gidiyor ve kendini, terk edilmiş eski bir test
sektöründe mahsur buluyorsun. Eve dönmek için tesisin portal sistemlerini
oda oda yeniden devreye almalı, parçaları toplamalı ve tesisin **neden terk
edildiğini** çözmelisin.

Her oda bir öncekinin gerekçesidir: topladığın parça, sonraki odanın kapısını
aralar. İlerledikçe yeni mekanikler öğrenirsin (portal → momentum → yük küpü →
basınç butonu → kapı → ileri seviye fırlatma).

## Mekanik ilerleyişi (yavaş yavaş)

1. Portal aç / içinden geç (giriş-çıkış)
2. Momentum koruma & **flinging** (yüksekten düşüp fırlama)
3. **Yük küpü** (yerçekimli, portaldan geçen kutu)
4. **Basınç butonu + kapı** (küpü/kendini butona indir → kapı açılır)
5. Küp + portal kombinasyonu (kutunun altına portal açıp düşürme)
6. Küp + flinging (kutuyu/kendini fırlatarak hedefe taşı)
7. İleri: derin kuyu fırlatma ustalığı
8. Finale: tüm mekaniklerle eve dönüş + hikâye düğümü

## Perdeler & bölüm planı (genişletilmiş)

Çalışma şekli: her bölümü tek tek detaylı konuşuruz → artı/eksi geri bildirim
→ revizyon → onay → uygulama. Aşağıdaki liste taslaktır, konuştukça değişir.

### Perde I — Uyanış (öğretici: portal & momentum)
| # | Ad | Yeni mekanik | Hikâye beat | Durum |
|---|----|--------------|-------------|-------|
| 1 | Uyanış | portal geçişi | tabanca boş, sıvı bul | ✅ |
| 2 | Yön | duvar→zemin flinging | gücü tak | ✅ |
| 3 | Kontrol Odası | açık arena geçişi | ana sisteme eriş | ✅ |

### Perde II — Ağırlığın Yasası (küp & buton)
| # | Ad | Yeni mekanik | Hikâye beat | Durum |
|---|----|--------------|-------------|-------|
| 4 | Ağırlık | yük küpü + buton + kapı | ağırlık kilidi | ✅ |
| 5 | Çifte Yük | iki buton, tek küp + zamanlı kapı | hattı eşle | ✅ |
| 6 | Köprü | küpü flingleyerek uzağa taşı | enerji yönlendir | planlı |

### Perde III — Momentum Ustalığı
| # | Ad | Yeni mekanik | Hikâye beat | Durum |
|---|----|--------------|-------------|-------|
| 6 | Köprü | fırlatma rampası (küpü+kendini uçur) | eski fırlatıcılar | ✅ |
| 7 | İp Hattı | tele tutunup kayarak (zipline) | uçurumu geç | ✅ |
| 8 | Serbest Düşüş | portalları kur, şafta düş, dipten yana fırla, karşıya uç (bağışlayıcı) | acil tahliye | ✅ |
| 9 | Trambolin | zıplama padi + portal ile hedefe sek | esneklik testi | ✅ |
| 9b | Çift Sıçrama | rampa/trambolin + portal zinciri | uçurumları aş | planlı |

### Perde IV — Gerçek (tehlike & sistem çökmesi)
| # | Ad | Yeni mekanik | Hikâye beat | Durum |
|---|----|--------------|-------------|-------|
| 10 | Enerji Topu | zıplayan enerji topunu portalla alıcıya yönlendir | gücü ata | ✅ |
| 11 | Engel Yağmuru | zararlı enerji barajını portalla alıcıya çevirip kapat | savunmayı aş | ✅ |
| 12 | Dönen Merdivenler | kayan/hareketli platformlar (Harry Potter tarzı) | tesis canlanıyor | ✅ |
| 12b | İnce Köprü | küçük platformlarda hassas zıplama + portal, altı uçurum (düşersen ölüm) | imtihan | sırada |
| 12c | Füze | sana kilitlenen füzeyi yana kaçıp portala sok, çekirdeğe çevir | takip | ✅ |
| 12d | Şifre | yukarıdan bakınca anlamlı dizilen sayılar (anamorfik); evrensel kod | sır | ✅ |
| 12e | Sütun Patlatma | enerji topunu portalla sütuna sürüp patlat (parçalanır) | engeli kaldır | ✅ |
| 12f | Çarklar ve Su | küp->buton->çarklar döner->su yükselir->asansör platformu çıkar | mekanizma | ✅ |
| 12g | Ay Yürüyüşü | düşük yerçekimi, uzun süzülen zıplamalar | zayıf alan | ✅ |
| 12h | Yer Çekimi | çekimi ters çevir, tavanda yürü | arızalı denetleyici | ✅ |
| 13 | Şebeke | fizzler (portal/küp sıfırlayan alan) | güvenliği aş | planlı |
| 14 | Zehirli Zemin | tehlikeli zemin (anında respawn) | tesisin çürümesi | planlı |
| 15 | Hareketli Zemin | kayan platform + zamanlama | AI uyanıyor | planlı |

### Perde III ek — Yeni Araçlar
| # | Ad | Yeni mekanik | Hikâye beat | Durum |
|---|----|--------------|-------------|-------|
| 20 | Işık Köprüsü | portaldan geçince devam eden katı ışık köprüsü; yakala + yönlendir | yol döşe | ✅ |
| 21 | Sıçrama Hattı | düşüş-fırlatma (portal planlama) + trambolin zinciri (havada ayar) | tahliye hattı | ✅ |
| 22 | Lazer | ışını portalla büküp karşı duvardaki alıcıya düşür (sürekli ışın → kapı) | hattı yönlendir | ✅ |
| 23 | Şebeke (fizzler) | **SIRALAMA kilidi**: şebekeden geçince portalın sıfırlanır → kapıyı açacak işi (enerji topunu portalla, boşluğun üstünden asılı alıcıya yolla; alıcı kalıcı kilitler) GEÇMEDEN bitir. Kendini portalla geçirirsen boşluğa düşersin (kestirme yok). Küp/buton yok — Bölüm 4'ten tamamen farklı. | güvenliği aş | ✅ |
| 24 | Yansıtıcı | ışını portalla sabit reflektöre sok; 90° bükülüp ön duvardaki alıcıya gider | açıyla yönlendir | ✅ |
| 25 | Sıçrama Jeli | jeli portalla (zemin→tavan) çıkışın önüne taşı; oluşan yamadan sıçrayıp yüksek kıyıya çık | zıplama noktası döşe | ✅ |
| 26 | Mantık Kapısı | tek ışını portal+yansıtıcıyla iki içinden-geçilen alıcıdan geçir; AND kapısı açar | mantık kilidi | ✅ |
| 27 | Çift Yansıtıcı | ışını portalla sok, iki reflektörde zigzag (-x→-z→+x), sağ duvardaki alıcıya | aynalı labirent | ✅ |
| 28 | Yukarı Işın | ışını zemin portalıyla DİKEY yukarı çevir, tavandaki alıcıyı yak | yukarı bük | ✅ |
| 29 | Hız Kilidi | **MOMENTUM DEDÜKSİYONU**: düşüş hızı sabit; çıkış için ÜÇ banttan DOĞRU yükseklikteki bandı seç. Alçak kısa kalır, yüksek aşar — yalnızca ortadaki bant hedefe kondurur. "2 portalı yerleştir, bitti" değil; menzili kafanda kurmak gerek. | hız hesabı | ✅ |
| 30 | Yankı | **YENİ MEKANİK — zaman yankısı/klon**: kendini kaydet (E / ⏱ düğmesi), kayıt bitince başlangıca ışınlanırsın ve klonun rotanı oynayıp son karede DONAR. Anlık buton (bırakılınca anında kapanır) → klon butonu basılı tutarken sen kapıdan geçersin. Portal yok; saf "iki yerde birden ol" planlaması. | iki yerde ol | ✅ |
| 31 | Çift Yankı | İKİ klon: kapı yalnızca iki uzak buton AYNI ANDA basılıyken açılır (AND). Tek başına ikisini tutamazsın, bas-koş anında kapanır → iki ayrı yankı kaydetmen şart. Yankı mekaniğinin çok-klon eskalasyonu. | iki kilit | ✅ |
| 32 | Portal Yankısı | **PORTAL + YANKI**: buton yalnızca portalla geçilen bir adada. Onu tutup aynı anda hedefe gidemezsin → portal rotanı KAYDET, klon portalından geçip butonu tutsun, sen yerden kapıdan geç. İki mekaniğin iç içe kombinasyonu. | klon portaldan | ✅ |
| 33 | Üçlü Yankı | ÜÇ klon: kapı üç uzak buton AYNI ANDA basılıyken açılır (AND-3, echoMax=3). Yankı serisinin zirvesi — üç ayrı kayıt yönetimi. | üç kilit | ✅ |

> **Yankı mekaniği (Echo):** `Echo` sınıfı (Props.js) oyuncunun kaydedilmiş ayak
> konumlarını oynatır, son karede donar; butonlar onu oyuncu gibi algılar.
> `ctx.echoMax` ile bölüm başına yankı sayısı. Sonraki bölümlerde portal +
> yankı, çok-yankı sıralama, klonla zamanlama gibi derin bulmacalar açılabilir.

> Tasarım pusulası: bir mekanik ilk kez tanıtılmıyorsa çeşitlendir
> (tuzak/şaşırtmaca/kombinasyon). Hiçbir bölüm bir öncekine çok benzemesin.
> "2 portal açtım bitti" olmasın — portalın YERİNİ planlamak gereksin.
> Momentum/uçuş bölümlerini (19 tarzı) çoğalt: düşüş→trambolin→peş peşe
> platform, zamanlama/ayar.

## 2. PERDE planı (ChatGPT "EŞİK" fikirlerinden, fizibilite süzgeçli)

Mevcut ~21 bölüm = 1. Perde (fiziksel kampanya). 2. Perde = bilgi/algı +
sabotaj yönü. Fizibilite sırası:

- **Enabler ✅ eklendi:** Görülebilir portal (özyinelemesiz RTT) — gözlem/
  kamera/perspektif/ayna/görüş-hattı bölümlerinin ön koşulu. `portals.seeThrough`
  ile kapatılabilir. Mobilde `viewScale=0.6`.
- **Faz A (görülebilir portal gerekmez):** Lazer/Alıcı/Mantık kapıları (sıradaki),
  Fizzler, Sıçrama Jeli, İki güvenilmez YZ (ORA/VEK), Adli kronoloji, Sembol dili,
  Sarkaç, Tek-kullanımlık yüzey (Euler).
- **Faz B (görülebilir portal ile):** Kamera-besleme, perspektif/anamorfik,
  ayna/kiralite, görüş-hattı, çok-kaynaklı kapalı oda (ch30), portal-görüş zinciri
  (ch37), dost ateşi kuleler (ch32).
- **Faz C (ağır alt-sistem, seçerek):** zaman yankısı (klon), paralel dünyalar,
  termal/kütle/sıvı, satranç muhafızları, yapısal çöküş, kara başlatma.
- **Ertele/atla:** özyineleme-ölçek, tersine nedensellik, durum-geçidi, meta
  41–50, ustalık 51–60. Hedef ölçek: cilalı ~10 bölümlük 2. Perde (toplam ~30).

### Perde V — Kaçış (finale)
| # | Ad | Yeni mekanik | Hikâye beat | Durum |
|---|----|--------------|-------------|-------|
| 13 | Çöküş | her mekanik bir arada, çok aşamalı | sistem kapanıyor | planlı |
| 14 | Eve Dönüş | finale arena + düğüm | kaçış / gerçek ortaya çıkar | planlı |

> Bölüm sayısı/sırası esnek; konuştukça ekler/çıkarırız. Hedef: net bir
> tırmanış ve tatmin edici bir finale.

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
| 8 | Serbest Düşüş | kayarak/düşerken HIZLA iki portal aç (refleks yarışı) | acil tahliye | sırada |
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

### Perde V — Kaçış (finale)
| # | Ad | Yeni mekanik | Hikâye beat | Durum |
|---|----|--------------|-------------|-------|
| 13 | Çöküş | her mekanik bir arada, çok aşamalı | sistem kapanıyor | planlı |
| 14 | Eve Dönüş | finale arena + düğüm | kaçış / gerçek ortaya çıkar | planlı |

> Bölüm sayısı/sırası esnek; konuştukça ekler/çıkarırız. Hedef: net bir
> tırmanış ve tatmin edici bir finale.

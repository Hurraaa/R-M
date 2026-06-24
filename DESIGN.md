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
| 5 | Çifte Yük | iki buton, tek küp + zamanlı kapı | hattı eşle | tartışılıyor |
| 6 | Köprü | küpü flingleyerek uzağa taşı | enerji yönlendir | planlı |

### Perde III — Momentum Ustalığı
| # | Ad | Yeni mekanik | Hikâye beat | Durum |
|---|----|--------------|-------------|-------|
| 7 | Derin Kuyu | yüksek fırlatma ile dikey erişim | alt kata in | planlı |
| 8 | Sıçrama Tabağı | faith plate (fırlatma rampası) | hızlan | planlı |
| 9 | Çift Sıçrama | faith plate + portal zinciri | uçurumları aş | planlı |

### Perde IV — Gerçek (tehlike & sistem çökmesi)
| # | Ad | Yeni mekanik | Hikâye beat | Durum |
|---|----|--------------|-------------|-------|
| 10 | Şebeke | fizzler (portal/küp sıfırlayan alan) | güvenliği aş | planlı |
| 11 | Zehirli Zemin | tehlikeli zemin (anında respawn) | tesisin çürümesi | planlı |
| 12 | Hareketli Zemin | kayan platform + zamanlama | AI uyanıyor | planlı |

### Perde V — Kaçış (finale)
| # | Ad | Yeni mekanik | Hikâye beat | Durum |
|---|----|--------------|-------------|-------|
| 13 | Çöküş | her mekanik bir arada, çok aşamalı | sistem kapanıyor | planlı |
| 14 | Eve Dönüş | finale arena + düğüm | kaçış / gerçek ortaya çıkar | planlı |

> Bölüm sayısı/sırası esnek; konuştukça ekler/çıkarırız. Hedef: net bir
> tırmanış ve tatmin edici bir finale.

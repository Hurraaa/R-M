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

## Bölüm planı

| # | Ad | Mekanik | Amaç (toplanan) | Hikâye beat |
|---|-----|---------|------------------|-------------|
| 1 | Uyanış | portal geçişi | 🟠 Portal Sıvısı | tabanca boş, sıvı bul |
| 2 | Yön | duvar→zemin flinging | 🟣 Güç Çekirdeği | gücü tak |
| 3 | Kontrol Odası | açık arena geçişi | 🔵 Kontrol Anahtarı | ana sisteme eriş |
| 4 | Ağırlık | **yük küpü + buton + kapı** (kutunun altına portal aç, butona düşür) | kapı açılır → 🟢 Röle | "ağırlık kilidi" |
| 5 | Çifte Yük | iki küp / küp + flinging | parça | güç hattını kur |
| 6 | Derin Kuyu | flinging ustalığı | parça | dikey erişim |
| 7 | Eve Dönüş | her şey birlikte + düğüm | 🏠 Eve Dönüş Portalı | kaçış / gerçek |

> Şu an: 1–3 hazır. **4. bölüm** (yük küpü + buton + kapı) bu adımda ekleniyor.
> Sonraki bölümleri tek tek, onayınla ekleyeceğiz.

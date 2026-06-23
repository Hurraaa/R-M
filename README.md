# Portal Lab — Interdimensional Puzzle

Valve'ın **Portal** mekaniğinden + Rick & Morty portal estetiğinden **esinlenilmiş**, Three.js ile yapılmış tarayıcı-tabanlı birinci-şahıs portal bulmaca oyunu. İki portal aç, içinden geç, **momentum koruyarak (flinging)** test odalarını çöz. Telifli içerik yok — her şey kod içinde stilize üretilir.

> Durum: **oynanabilir dikey dilim (MVP)** — 3 test odası, masaüstü + mobil dokunmatik destekli.

## Oynanış

Yüzeylere iki portal (mavi/yeşil) aç. Birine girince diğerinden çıkarsın ve **hızını korursun** — yüksekten bir zemin portalına düşüp duvar portalından fırlayarak (flinging) normalde ulaşamayacağın yerlere geç. Her odanın çıkışına (yeşil ped) ulaş.

Portallar yalnızca **açık panel** yüzeylere açılır (koyu metale açılmaz) — tıpkı Portal'daki gibi.

### Kontroller

**Masaüstü**
- `W A S D` — hareket · `Fare` — bak (imleç kilitlenir)
- `Sol tık` — mavi portal · `Sağ tık` — yeşil portal
- `Space` — zıpla · `R` — odayı sıfırla

**Mobil**
- Sol joystick — hareket · Sağ tarafı sürükle — bak
- `A` — mavi portal · `B` — yeşil portal · `⤒` — zıpla · `⟲` — sıfırla

## Çalıştırma

```bash
npm install
npm run dev      # geliştirme sunucusu
npm run build    # üretim derlemesi (dist/)
npm run preview  # derlemeyi önizle
```

## Teknik

- **Three.js 0.184** — render, geometri, ışıklar, gölgeler
- **Custom GLSL** portal shader (yüzeye yapışık dönen girdap + parlayan halka)
- **Momentum koruyan teleport**: `T = Bworld · rotY(π) · Aworld⁻¹` matris dönüşümü
- AABB tabanlı birinci-şahıs çarpışma (portal deliğinde çarpışma atlanır)
- **UnrealBloom** post-processing + gölgeler
- Birleşik girdi katmanı (klavye/fare pointer-lock + dokunmatik)

## Mimari

```
src/
  main.js              # giriş, HUD ve menü bağlama
  style.css            # HUD + menü + mobil dokunmatik UI
  portal/
    PortalGame.js      # motor: render, döngü, bölüm yükleme, portal raycast, kazanma
    PortalSystem.js    # iki portal + yerleştirme + momentum koruyan teleport
    FPController.js    # birinci-şahıs hareket, yerçekimi, zıplama, AABB çarpışma
    Level.js           # test odaları (geometri, çarpışma, portallanabilir yüzeyler)
    PortalInput.js     # birleşik klavye/fare + mobil joystick/buton girdisi
    portalShader.js    # ortak portal GLSL materyali
  game/                # (eski) Portal Arena shooter prototipi — referans
```

## Yol Haritası (sonraki adımlar)

- Momentum **flinging** odaklı yeni odalar (derin kuyu → fırlama)
- Enerji topu / lazer + buton-kapı bulmacaları
- Taşınabilir küpler (ağırlıkla buton basma)
- Ses efektleri ve atmosferik müzik (telifsiz/sentez)

# Portal Arena — Interdimensional Shooter

Rick & Morty estetiğinden **esinlenilmiş**, Three.js ile yapılmış tarayıcı-tabanlı 3D portal arena shooter. Telifli karakter/ses/logo kullanılmaz — tüm karakter ve dünya kod içinde, low-poly stilize geometriyle üretilir.

> Durum: **oynanabilir dikey dilim (MVP)** — masaüstü + mobil dokunmatik destekli.

## Oynanış

Çılgın bir bilim insanı olarak alien bir arenada portallardan çıkan boyutlar-arası yaratıkları portal silahınla yok et. Skor arttıkça dalgalar zorlaşır.

### Kontroller

**Masaüstü**
- `W A S D` — hareket
- `Fare` — nişan al (imleç kilitlenir)
- `Sol tık` — ateş
- `Shift` — koş

**Mobil**
- Sol joystick — hareket
- Sağ tarafı sürükle — nişan al
- Sağ tarafı basılı tut — ateş

## Çalıştırma

```bash
npm install
npm run dev      # geliştirme sunucusu
npm run build    # üretim derlemesi (dist/)
npm run preview  # derlemeyi önizle
```

## Teknik

- **Three.js 0.184** — render, geometri, ışıklar, gölgeler
- **Custom GLSL** portal shader (dönen girdap + parlayan halka)
- **UnrealBloom** post-processing (portal/enerji parlaması)
- Procedural karakter & animasyon (iskelet model yok)
- Havuzlanmış parçacık sistemi (isabet/patlama)
- Birleşik girdi katmanı (klavye/fare + dokunmatik)

## Mimari

```
src/
  main.js            # giriş, HUD ve menü bağlama
  style.css          # HUD + menü + mobil dokunmatik UI
  game/
    Game.js          # motor: render, post-processing, oyun döngüsü, dalgalar
    World.js         # arena: zemin, kristaller, kayalar, ışık, sis, yıldızlar
    Player.js        # stilize bilim insanı + procedural animasyon + silah
    Portal.js        # GLSL portal shader + açılma animasyonu
    Enemy.js         # alien yaratık + takip/zıplama davranışı
    Projectile.js    # portal silahı mermisi
    Particles.js     # havuzlanmış patlama parçacıkları
    Input.js         # birleşik klavye/fare/dokunmatik girdi
```

## Yol Haritası (sonraki adımlar)

- Ses efektleri (sentezlenmiş/telifsiz) ve müzik
- Güçlendirmeler (hız, hasar, can paketi)
- Farklı düşman tipleri ve bir "boss" portalı
- Dalga arası sakin nefes alma anları ve skor tablosu

import * as THREE from "three";
import { Cube, Button, Door, LaunchPad, Zipline, BouncePad, Ball, BallEmitter, Receptacle, MovingPlatform, Keypad, WaterLift, FlipPad, Destructible, Missile, MissileLauncher, LightBridge, Laser, LaserReceiver, Fizzler, LogicGate } from "./Props.js";

// 3x5 dijit fontu (yukarıdan okunacak sütun desenleri)
const DIGITS = {
  0: ["111", "101", "101", "101", "111"], 1: ["010", "110", "010", "010", "111"],
  2: ["111", "001", "111", "100", "111"], 3: ["111", "001", "111", "001", "111"],
  4: ["101", "101", "111", "001", "001"], 5: ["111", "100", "111", "001", "111"],
  6: ["111", "100", "111", "101", "111"], 7: ["111", "001", "010", "100", "100"],
  8: ["111", "101", "111", "101", "111"], 9: ["111", "101", "111", "001", "111"],
};

// Test odaları. Her oda kendi geometrisini bir Group içine kurar ve
// çarpışma kutuları + portallanabilir yüzeyler + spawn + çıkış verir.
//
// Portallanabilir yüzeyler açık panel (cyan ışıltılı), portallanamaz
// yüzeyler koyu metaldir — tıpkı Portal'daki beyaz/metal ayrımı gibi.

// Açık/sıcak gri metal (portallanamaz) ve yumuşak açık panel (portallanabilir).
const matMetal = () =>
  new THREE.MeshStandardMaterial({ color: 0x8b8f98, roughness: 0.6, metalness: 0.15 });
const matPanel = () =>
  new THREE.MeshStandardMaterial({
    color: 0xeef2f8,
    roughness: 0.85,
    metalness: 0.0,
    emissive: 0x223a66,
    emissiveIntensity: 0.18, // hafif soğuk vurgu — parlamadan portallanabilirliği belli eder
  });

function addBox(ctx, min, max, portalable) {
  const size = new THREE.Vector3().subVectors(max, min);
  const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), portalable ? matPanel() : matMetal());
  mesh.position.copy(center);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  ctx.group.add(mesh);
  ctx.raycast.push(mesh);

  const collider = { min: min.clone(), max: max.clone(), portalable, mesh, portal: null };
  mesh.userData.portalable = portalable;
  mesh.userData.collider = collider;
  ctx.colliders.push(collider);
  return collider;
}

// Toplanacak amaç-nesnesi: kurguya bağlı, portallardan FARKLI renkte,
// havada süzülüp dönen bir obje + zemin işaret halkası + ışık.
function goal(ctx, pos, kind, color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.9,
    roughness: 0.3,
    metalness: 0.1,
  });

  let body;
  if (kind === "fluid") {
    // sıvı kanisteri (cam tüp)
    body = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.0, 16), new THREE.MeshStandardMaterial({ color: 0xddeeff, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.4 }));
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.7, 16), mat);
    liquid.position.y = -0.12;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.25, 12), new THREE.MeshStandardMaterial({ color: 0x888f99, metalness: 0.6, roughness: 0.4 }));
    cap.position.y = 0.55;
    body.add(glass, liquid, cap);
  } else if (kind === "core") {
    // güç çekirdeği (oktahedron kristal)
    body = new THREE.Mesh(new THREE.OctahedronGeometry(0.6, 0), mat);
  } else {
    // verici / beacon (anten + küre)
    body = new THREE.Group();
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), mat);
    const ant = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.9, 8), mat);
    ant.position.y = 0.7;
    body.add(orb, ant);
  }
  body.position.y = 1.3;
  g.add(body);

  // zemin işaret halkası (aynı renk)
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.06, 8, 40),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  g.add(ring);

  const light = new THREE.PointLight(color, 1.6, 12, 2);
  light.position.set(0, 1.6, 0);
  g.add(light);

  g.position.copy(pos);
  ctx.group.add(g);
  ctx.exit = { pos: pos.clone(), radius: 2.0 };
  ctx.exitSpin = body; // PortalGame döndürüp süzecek
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---- Oda 0: Boşluk — sol duvara iki portal açıp boşluğu geç ----
// Açık platform: yan duvarlar alçak korkuluk, üst tarafa manzara açık.
function chamber0(ctx) {
  addBox(ctx, V(-6, -0.5, -4), V(6, 0, 6), false); // başlangıç zemini
  addBox(ctx, V(-6, -0.5, 16), V(6, 0, 26), false); // çıkış zemini (boşluk z 6..16)
  addBox(ctx, V(-6.5, 0, -4), V(-6, 4, 26), true); // SOL DUVAR (portallanabilir)
  addBox(ctx, V(6, 0, -4), V(6.5, 1.3, 26), false); // sağ korkuluk
  addBox(ctx, V(-6, 0, -4.5), V(6, 1.3, -4), false); // arka korkuluk
  addBox(ctx, V(-6, 0, 26), V(6, 1.3, 26.5), false); // ön korkuluk
  ctx.spawn = V(0, 0.1, -1);
  goal(ctx, V(0, 0, 22), "fluid", 0xffae3b); // 🟠 Portal Sıvısı
  ctx.objective = "Portal sıvısını al — tabanca neredeyse boş.";
  ctx.hint = "Sol duvara bak, bir portal aç. Sonra boşluğun karşısındaki sol duvara ikinci portalı aç ve portala gir.";
  ctx.story = "Portal sıvısı dolduruldu! Ama eve dönüş atlaması için bir GÜÇ ÇEKİRDEĞİ gerekiyor — sıradaki odada.";
}

// ---- Oda 1: Yön değiştir — duvar portalından zemin portalına ----
function chamber1(ctx) {
  addBox(ctx, V(-6, -0.5, -4), V(6, 0, 6), false); // başlangıç zemini (metal)
  addBox(ctx, V(-6, -0.5, 16), V(6, 0, 26), true); // çıkış zemini PORTALLANABİLİR (boşluk 6..16)
  addBox(ctx, V(-6.5, 0, -4), V(-6, 4, 6), true); // sol duvar portallanabilir (başlangıç tarafı)
  addBox(ctx, V(6, 0, -4), V(6.5, 1.3, 26), false); // sağ korkuluk
  addBox(ctx, V(-6, 0, -4.5), V(6, 1.3, -4), false); // arka korkuluk
  addBox(ctx, V(-6, 0, 26), V(6, 1.3, 26.5), false); // ön korkuluk
  ctx.spawn = V(0, 0.1, -1);
  goal(ctx, V(0, 0, 22), "core", 0xff4fd8); // 🟣 Güç Çekirdeği
  ctx.objective = "Güç çekirdeğini bul ve tabancaya tak.";
  ctx.hint = "Sol duvara bir portal aç. Karşı zemine (boşluğun ötesi) ikinci portalı aç. Duvar portalına gir — zeminden fırlarsın.";
  ctx.story = "Güç çekirdeği takıldı! Son adım: eve dönüş KOORDİNATLARINI gir — vericiyi aktive et.";
}

// ---- Oda 2: Açık final arena — yan duvarlardan portalla uçurumu aş ----
function chamber2(ctx) {
  addBox(ctx, V(-9, -0.5, -8), V(9, 0, 6), false); // başlangıç zemini
  addBox(ctx, V(-9, -0.5, 18), V(9, 0, 32), false); // çıkış platformu (uçurum z 6..18)
  // yan duvarlar boydan boya portallanabilir (geçiş yüzeyleri)
  addBox(ctx, V(-9.5, 0, -8), V(-9, 6, 32), true); // sol
  addBox(ctx, V(9, 0, -8), V(9.5, 6, 32), true); // sağ
  // korkuluklar (manzara açık)
  addBox(ctx, V(-9, 0, -8.5), V(9, 1.3, -8), false);
  addBox(ctx, V(-9, 0, 32), V(9, 1.3, 32.5), false);
  // momentumla oynamak için iki portallanabilir blok (tuzak değil)
  addBox(ctx, V(-7.5, 0, -3), V(-4.5, 3, 0), true);
  addBox(ctx, V(4.5, 0, 23), V(7.5, 4, 26), true);
  ctx.spawn = V(0, 0.1, -4);
  goal(ctx, V(0, 0, 27), "beacon", 0x46e6ff); // 🔵 Kontrol Anahtarı
  ctx.objective = "Kontrol anahtarını al — uçurumun karşısında.";
  ctx.hint = "Yan duvarlara iki portal aç: birini yanına, diğerini boşluğun karşısına. Portala girip geç. Bloklarla momentumu da deneyebilirsin.";
  ctx.story = "Kontrol odasına eriştin. Ama ana kapı 'AĞIRLIK KİLİDİ' ile mühürlü — bir yük küpünü butona indirmen gerek.";
}

// ---- Oda 3: Ağırlık — kutunun altına portal aç, butona düşür, kapı açılsın ----
function chamber3(ctx) {
  // zemin: ortada portallanabilir bir PAD, gerisi metal (z-fight'sız, abut)
  addBox(ctx, V(-8, -0.5, -6), V(8, 0, -2), false); // ön
  addBox(ctx, V(-8, -0.5, 2), V(8, 0, 24), false); // arka (koridor + hedef oda)
  addBox(ctx, V(-8, -0.5, -2), V(-3, 0, 2), false); // pad'in solu
  addBox(ctx, V(3, -0.5, -2), V(8, 0, 2), false); // pad'in sağı
  addBox(ctx, V(-3, -0.5, -2), V(3, 0, 2), true); // PORTALLANABİLİR PAD (küp burada durur)

  // duvarlar / korkuluklar
  addBox(ctx, V(-8.5, 0, -6), V(-8, 4, 24), true); // sol duvar portallanabilir (çıkış portalı için)
  addBox(ctx, V(8, 0, -6), V(8.5, 4, 24), false); // sağ duvar
  addBox(ctx, V(-8, 0, -6.5), V(8, 4, -6), false); // arka duvar
  addBox(ctx, V(-8, 0, 24), V(8, 4, 24.5), false); // ön duvar

  // yük küpü pad üstünde durur
  const cube = new Cube(V(0, 0.6, 0));
  ctx.group.add(cube.mesh);
  ctx.colliders.push(cube.collider);
  ctx.cubes.push(cube);

  // basınç butonu (küp buraya düşecek) — sol duvarın önünde
  // kapı koridoru z=16'da kapatır
  const door = new Door(V(-8, 0, 16), V(8, 4, 16.6));
  ctx.group.add(door.mesh);
  ctx.colliders.push(door.collider);
  ctx.doors.push(door);

  const button = new Button(V(-5.5, 0, 11), door);
  ctx.group.add(button.group);
  ctx.buttons.push(button);

  ctx.spawn = V(4, 0.1, -4);
  goal(ctx, V(0, 0, 21), "core", 0x6ee84f); // 🟢 Röle (kapı ardında)
  ctx.objective = "Yük küpünü butona indir, kapıyı aç ve röleyi al.";
  ctx.hint = "Küpün durduğu pad'in altına bir portal aç (zemine nişan al), ikinci portalı sol duvara (butonun arkasına) aç. Küp düşüp butona iner, kapı açılır.";
  ctx.story = "Ağırlık kilidi çözüldü, röle alındı. Güç hattı uzanıyor — daha derine inmen gerek.";
}

// ---- Oda 5: Çifte Yük — iki buton (küp + sen) + zamanlı kapı ----
function chamber5(ctx) {
  const W = 7;
  // zemin parçaları (z-fight'sız abut) + portallanabilir pad
  addBox(ctx, V(-W, -0.5, -6), V(W, 0, -2), false); // ön
  addBox(ctx, V(-W, -0.5, -2), V(-3, 0, 2), false);
  addBox(ctx, V(3, -0.5, -2), V(W, 0, 2), false);
  addBox(ctx, V(-3, -0.5, -2), V(3, 0, 2), true); // PAD (küp burada durur)
  addBox(ctx, V(-W, -0.5, 2), V(W, 0, 8), false); // orta (B butonu)
  // boşluk z[8,14] (atlanamaz)
  addBox(ctx, V(-W, -0.5, 14), V(W, 0, 24), false); // çıkış platformu

  addBox(ctx, V(-W - 0.5, 0, -6), V(-W, 4, 24), true); // sol duvar portallanabilir (teslimat + geçiş)
  addBox(ctx, V(W, 0, -6), V(W + 0.5, 4, 24), false);
  addBox(ctx, V(-W, 0, -6.5), V(W, 4, -6), false);
  addBox(ctx, V(-W, 0, 24), V(W, 4, 24.5), false);

  // yük küpü
  const cube = new Cube(V(0, 0.6, 0));
  ctx.group.add(cube.mesh);
  ctx.colliders.push(cube.collider);
  ctx.cubes.push(cube);

  // kapı: boşluğun ötesinde, çıkış platformu girişinde — A VE B basılıysa açılır
  const door = new Door(V(-W, 0, 15), V(W, 4, 15.5));
  door.openSpeed = 4;
  door.closeSpeed = 0.8; // ~0.6 sn geçiş penceresi — hızlı kapanır, portal şart
  ctx.group.add(door.mesh);
  ctx.colliders.push(door.collider);
  ctx.doors.push(door);

  const bA = new Button(V(-4.5, 0, -2), null); // küp buraya iner
  const bB = new Button(V(-3, 0, 5), null); // oyuncu basar
  ctx.group.add(bA.group, bB.group);
  ctx.buttons.push(bA, bB);
  door.requires = [bA, bB];

  ctx.spawn = V(4, 0.1, -4);
  goal(ctx, V(0, 0, 20), "core", 0x6ee84f);
  ctx.objective = "İki butonu birden bas: birini küple, birini kendinle — kapı kapanmadan karşıya geç.";
  ctx.hint = "1) Küpü sol duvar üzerinden A butonuna indir (Bölüm 4 gibi). 2) Portalları sol duvara taşı: biri B'nin yanına, diğeri boşluğun ötesine. 3) B'ye bas, hemen yan portala dal — kapı kapanmadan karşı platforma fırla ve kapıdan geç.";
  ctx.story = "İki hat eşlendi. Tesis seni izliyor gibi… daha derine inmen gerek.";
}

// ---- Oda 6: Köprü — fırlatma rampasıyla küpü (ve kendini) karşıya uçur ----
function chamber6(ctx) {
  const W = 7;
  addBox(ctx, V(-W, -0.5, -6), V(W, 0, 6), false); // başlangıç platformu
  // boşluk z[6,15]
  addBox(ctx, V(-W, -0.5, 15), V(W, 0, 32), false); // karşı platform
  addBox(ctx, V(-W - 0.5, 0, -6), V(-W, 5, 32), true); // sol portallanabilir (yedek)
  addBox(ctx, V(W, 0, -6), V(W + 0.5, 5, 32), false);
  addBox(ctx, V(-W, 0, -6.5), V(W, 5, -6), false);
  addBox(ctx, V(-W, 0, 32), V(W, 5, 32.5), false);

  // fırlatma rampası + üstünde küp (başta fırlar)
  const pad = new LaunchPad(V(0, 0, 2), V(0, 12, 17));
  ctx.group.add(pad.group);
  ctx.launchPads.push(pad);
  const cube = new Cube(V(0, 0.7, 2));
  ctx.group.add(cube.mesh);
  ctx.colliders.push(cube.collider);
  ctx.cubes.push(cube);

  // kapı + buton (karşı platform) — küp butona inince kapı açılır
  const door = new Door(V(-W, 0, 24), V(W, 5, 24.5));
  ctx.group.add(door.mesh);
  ctx.colliders.push(door.collider);
  ctx.doors.push(door);
  const btn = new Button(V(0, 0, 17.5), door);
  ctx.group.add(btn.group);
  ctx.buttons.push(btn);

  ctx.spawn = V(4, 0.1, -3);
  goal(ctx, V(0, 0, 28), "core", 0x6ee84f);
  ctx.objective = "Küpü fırlatma rampasıyla karşı butona uçur, sonra sen de rampayla geç.";
  ctx.hint = "Rampadaki küp fırlatılıp karşı butona iner ve kapıyı açar. Sonra rampaya basıp sen de karşıya fırla, açık kapıdan geç.";
  ctx.story = "Eski fırlatıcılar hâlâ çalışıyor. Tesisin derinine bir köprü daha.";
}

// ---- Oda 7: İp Hattı — doğru anda ipi bırakıp hedefe in (zamanlama) ----
function chamber7(ctx) {
  const W = 6;
  addBox(ctx, V(-W, 0, -6), V(W, 2, 2), false); // yüksek başlangıç (üst y=2)
  addBox(ctx, V(-W, 2, -6.5), V(W, 6, -6), false); // arka duvar
  // hedef platform: zipline ortasının ALTINDA, küçük (doğru anda bırakıp ineceksin)
  addBox(ctx, V(-3, -0.5, 13), V(3, 0, 18), false);
  // zipline yüksek A -> uzak/alçak B; B boşlukta biter (sona kadar gidersen düşersin)
  const zip = new Zipline(V(0, 4, 2), V(0, 1, 30));
  ctx.group.add(zip.group);
  ctx.ziplines.push(zip);
  ctx.spawn = V(0, 2.1, -3);
  goal(ctx, V(0, 0, 15.5), "core", 0x6ee84f);
  ctx.objective = "İpe tutun; hedef platformun ÜSTÜNE gelince Zıpla ile BIRAK ve in. Geç kalırsan uçuruma düşersin!";
  ctx.hint = "İp seni hızla taşır. Aşağıdaki platformun tam üstündeyken Zıpla'ya bas (ipi bırak) ve üstüne düş. Erken/geç bırakırsan kaçarsın — R ile yenile.";
  ctx.story = "Hat seni uçurumun ortasına taşıyor; doğru anda bırakmak sende.";
}

// ---- Oda 8: Trambolin — sek, HAVADA yönlenerek yandaki küçük rafa in ----
function chamber8(ctx) {
  const W = 8;
  addBox(ctx, V(-W, -0.5, -6), V(W, 0, 6), false); // zemin (z6 sonrası boşluk)
  addBox(ctx, V(-W, 0, -6.5), V(W, 6, -6), false); // arka duvar
  // küçük, sola kaçık hedef raf (steer etmezsen x0'da kalıp boşluğa düşersin)
  addBox(ctx, V(-6, 2.1, 8), V(-1.2, 2.5, 12), false);
  const tramp = new BouncePad(V(0, 0, 2), 14);
  ctx.group.add(tramp.group);
  ctx.bouncePads.push(tramp);
  ctx.spawn = V(0, 0.1, -4);
  goal(ctx, V(-3.5, 2.5, 10), "core", 0x6ee84f);
  ctx.objective = "Trambolinle sek, HAVADA yönlenerek yandaki küçük rafa in.";
  ctx.hint = "Trambolinde sek; havadayken sola-ileri yönlen ve küçük rafa konmaya çalış. Iskalarsan düşersin — R ile yenile.";
  ctx.story = "Yay seni fırlatıyor ama hedef küçük ve yanda; havada ustalık ister.";
}

// ---- Oda 9: Enerji Topu — topu portallarla alıcıya yönlendir ----
function chamber9(ctx) {
  // ana oda
  addBox(ctx, V(-7, -0.5, -6), V(7, 0, 12), false); // zemin
  addBox(ctx, V(-7.5, 0, -6), V(-7, 6, 12), false); // sol duvar (yayıcı)
  addBox(ctx, V(7, 0, -6), V(7.5, 6, 12), true); // SAĞ duvar (portallanabilir)
  addBox(ctx, V(-7, 0, -6.5), V(7, 6, -6), true); // ARKA duvar (portallanabilir)
  // ön duvar: sağ kısım metal, sol kısımda kapı
  addBox(ctx, V(-3, 0, 12), V(7, 6, 12.5), false); // ön duvar (sağ)
  addBox(ctx, V(-7, 4, 12), V(-3, 6, 12.5), false); // kapı üstü lento
  // hedef alkovu (kapı ardında, sol-ön)
  addBox(ctx, V(-7, -0.5, 12), V(-3, 0, 17), false);
  addBox(ctx, V(-7.5, 0, 12), V(-7, 6, 17), false);
  addBox(ctx, V(-7, 0, 17), V(-3, 6, 17.5), false);
  addBox(ctx, V(-3, 0, 12.5), V(-2.5, 6, 17), false); // alkov iç duvarı

  // kapı (sol-ön), alıcı dolunca açılır
  const door = new Door(V(-7, 0, 12), V(-3, 4, 12.5));
  ctx.group.add(door.mesh);
  ctx.colliders.push(door.collider);
  ctx.doors.push(door);

  // yayıcı (sol duvar) +x'e atar
  const emitter = new BallEmitter(V(-6.9, 2.5, 0), V(1, 0, 0), 12);
  ctx.group.add(emitter.group);
  ctx.emitters.push(emitter);

  // alıcı (ön duvarda, top buraya gelmeli)
  const recept = new Receptacle(V(0, 2.5, 11.7), door);
  ctx.group.add(recept.group);
  ctx.receptacles.push(recept);

  ctx.spawn = V(4, 0.1, -3);
  goal(ctx, V(-5, 0, 14.5), "core", 0x6ee84f);
  ctx.objective = "Enerji topunu portallarla alıcıya sok, kapı açılsın.";
  ctx.hint = "Top sağ duvara çarpıyor. Sağ duvara bir portal, arka duvara ikinci portalı aç — top arka duvardan çıkıp karşıdaki alıcıya gider. Sonra açılan kapıdan röleyi al.";
  ctx.story = "Enerji hattı yeniden yüklendi. Tesisin güvenlik sistemi geriliyor…";
}

// ---- Oda 10: Dönen Merdivenler — kayan platformları zamanlayıp karşıya geç ----
function chamber10(ctx) {
  addBox(ctx, V(-6, -0.5, -6), V(6, 0, 0), false); // başlangıç
  addBox(ctx, V(-6, -0.5, 8), V(6, 0, 12), false); // orta ada
  addBox(ctx, V(-6, -0.5, 20), V(6, 0, 26), false); // çıkış adası
  addBox(ctx, V(-6, 0, -6.5), V(6, 1.3, -6), false); // arka korkuluk
  // gap1 z[0,8], gap2 z[12,20] — kayan platformlar köprüler
  const p1 = new MovingPlatform(V(-2, -0.5, 3), V(2, 0, 5), V(0, 0, 1), 3, 1.1, 0);
  const p2 = new MovingPlatform(V(-2, -0.5, 15), V(2, 0, 17), V(0, 0, 1), 3, 1.1, Math.PI);
  for (const p of [p1, p2]) { ctx.group.add(p.mesh); ctx.colliders.push(p.collider); ctx.movers.push(p); }
  ctx.spawn = V(0, 0.1, -3);
  goal(ctx, V(0, 0, 23), "core", 0x6ee84f);
  ctx.objective = "Kayan platformları zamanla; üstüne bin, karşıya geç.";
  ctx.hint = "Platform kenara gelince üstüne adımla — seni taşır. Tam karşıya gelince in, diğerine geç. Acelen varsa portalla da geçebilirsin.";
  ctx.story = "Hareketli bakım köprüleri hâlâ ritmini koruyor. Neredeyse en alttasın.";
}

// ---- Oda 11: İnce Köprü — küçük platformlarda zıpla, sonra portalla boşluğu geç ----
function chamber11(ctx) {
  addBox(ctx, V(-3, -0.5, -4), V(3, 0, 0), false); // başlangıç
  // küçük taşlar (hassas zıplama) — altı uçurum
  addBox(ctx, V(-1, -0.5, 2), V(1, 0, 4), false); // z3
  addBox(ctx, V(-1, -0.5, 5), V(1, 0, 7), false); // z6
  addBox(ctx, V(-1, -0.5, 8), V(1, 0, 10), false); // z9
  // dinlenme platformu + portallanabilir sol duvar
  addBox(ctx, V(-5, -0.5, 11), V(5, 0, 15), false);
  addBox(ctx, V(-5.5, 0, 11), V(-5, 5, 27), true); // sol duvar (boşluk boyunca portallanabilir)
  // boşluk z[15,25]
  addBox(ctx, V(-5, -0.5, 25), V(5, 0, 29), false); // çıkış platformu
  addBox(ctx, V(-5, 0, 29), V(5, 4, 29.5), false);

  ctx.spawn = V(0, 0.1, -2);
  goal(ctx, V(0, 0, 27), "core", 0x6ee84f);
  ctx.objective = "Küçük taşlarda zıplayarak ilerle, sonra portalla son boşluğu geç. Düşersen başa dönersin!";
  ctx.hint = "Taşlara dikkatli zıpla. Dinlenme platformunda sol duvara iki portal aç (biri yanına, biri boşluğun ötesine) ve geç.";
  ctx.story = "Hassasiyet imtihanı. Tesisin eski güvenlik geçidi — bir yanlış adım, en başa.";
}

// yukarıdan bakınca dijit oluşturan dikili sütunlar (yakından anlamsız)
function digitField(ctx, cx, oz, d) {
  const rows = DIGITS[d];
  const cell = 1.2, h = 2.6;
  for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
    if (rows[r][c] === "1") {
      const x = cx + (c - 1) * cell;       // c=0 sol -> -x (yukarıdan doğru okunur)
      const z = oz + (4 - r) * cell;        // r=0 üst -> büyük z (uzak/üst)
      addBox(ctx, V(x - 0.45, 0, z - 0.45), V(x + 0.45, h, z + 0.45), false);
    }
  }
}

// ---- Oda 12: Şifre — yukarıdan bak, sayıyı oku, tuş takımına gir ----
function chamber12(ctx) {
  addBox(ctx, V(-12, -0.5, -4), V(12, 0, 26), false); // büyük zemin
  addBox(ctx, V(-12, 0, -4.5), V(12, 6, -4), false); // arka duvar
  addBox(ctx, V(-12.5, 0, -4), V(-12, 6, 26), true); // sol duvar (portallanabilir)
  addBox(ctx, V(12, 0, -4), V(12.5, 6, 26), false);

  // yüksek balkon (trambolinle çıkılır) — yukarıdan bakış
  addBox(ctx, V(-7, 4.5, 2), V(7, 5, 8), false);
  const tramp = new BouncePad(V(0, 0, -1), 19);
  ctx.group.add(tramp.group);
  ctx.bouncePads.push(tramp);

  // kod: 3,1,4  -> üç dijit alanı (yukarıdan okunur)
  const code = [3, 1, 4];
  digitField(ctx, -6, 11, code[0]);
  digitField(ctx, 0, 11, code[1]);
  digitField(ctx, 6, 11, code[2]);

  // tuş takımı (0-9 plakalar), doğru sırada bas
  const door = new Door(V(-12, 0, 22.5), V(12, 4, 23));
  ctx.group.add(door.mesh);
  ctx.colliders.push(door.collider);
  ctx.doors.push(door);
  const pad = new Keypad(code, door);
  for (let i = 0; i < 10; i++) {
    const g = pad.addPlate(i, V(-9 + i * 2, 0, 20));
    ctx.group.add(g);
  }
  ctx.keypads.push(pad);

  ctx.spawn = V(0, 0.1, -2);
  goal(ctx, V(0, 0, 24.5), "core", 0x6ee84f);
  ctx.objective = "Yukarıdan bakınca beliren 3 haneli sayıyı oku, tuş takımına sırayla bas.";
  ctx.hint = "Trambolinle balkona çık, aşağıdaki sütunlara yukarıdan bak — anlamlı bir sayı görürsün. İn ve plakalara o sırayla bas, kapı açılır.";
  ctx.story = "Tesisin evrensel kilidi: dilden bağımsız, saf sayı. Sırrı yalnızca yukarıdan görebilirsin.";
}

// ---- Oda 13: Çarklar ve Su — küpü butona indir, çarklar dönsün, su asansörü yükselsin ----
function chamber13(ctx) {
  // başlangıç + küp teslimat alanı (pad)
  addBox(ctx, V(-7, -0.5, -6), V(7, 0, -2), false);
  addBox(ctx, V(-7, -0.5, -2), V(-3, 0, 2), false);
  addBox(ctx, V(3, -0.5, -2), V(7, 0, 2), false);
  addBox(ctx, V(-3, -0.5, -2), V(3, 0, 2), true); // PAD (küp)
  addBox(ctx, V(-7, -0.5, 2), V(7, 0, 6), false); // şaftla aynı hizada biter (z=6)
  addBox(ctx, V(-7.5, 0, -6), V(-7, 6, 6), true); // sol duvar (portallanabilir, yüksek: portal kenara taşmaz)
  addBox(ctx, V(7, 0, -6), V(7.5, 6, 16), false);
  addBox(ctx, V(-7, 0, -6.5), V(7, 6, -6), false);

  // su asansörü şaftı (z 6..10), tabandan y8'e yükselir (biniş hizalı, boşluksuz)
  addBox(ctx, V(-3, 0, 5.5), V(-2, 8.5, 10.5), false); // şaft sol duvar
  addBox(ctx, V(2, 0, 5.5), V(3, 8.5, 10.5), false); // şaft sağ duvar
  addBox(ctx, V(-3, 0, 10), V(3, 6, 10.5), false); // şaft arka (alçak: tepeden çıkışı engellemesin)
  const lift = new WaterLift(V(-2, -0.4, 6), V(2, 0, 10), 8.0, 0.9); // ÜST zeminle hizalı (basamak yok)
  ctx.group.add(lift.group);
  ctx.colliders.push(lift.collider);
  ctx.waterLifts.push(lift);

  // küp + buton (buton lift'i besler)
  const cube = new Cube(V(0, 0.6, 0));
  ctx.group.add(cube.mesh); ctx.colliders.push(cube.collider); ctx.cubes.push(cube);
  const btn = new Button(V(-4.5, 0, 2), lift); // küp buraya iner -> lift güçlenir
  ctx.group.add(btn.group); ctx.buttons.push(btn);

  // üst hedef platformu (asansör tepesi y~8.2)
  addBox(ctx, V(-3, 7.8, 10.5), V(3, 8.2, 15), false);
  addBox(ctx, V(-3, 8.2, 15), V(3, 12, 15.5), false);

  ctx.spawn = V(4, 0.1, -4);
  goal(ctx, V(0, 8.2, 13), "core", 0x6ee84f);
  ctx.objective = "Küpü butona indir; çarklar döner, su yükselir, asansöre binip yukarı çık.";
  ctx.hint = "Küpü sol duvar üzerinden butona indir (Bölüm 4 gibi). Çarklar dönüp su asansörünü yükseltir. Asansör tabandayken üstüne bin, yukarı taşısın.";
  ctx.story = "Eski su mekanizması yeniden çalışıyor. Yukarı, neredeyse çıkışa.";
}

// ---- Oda 14: Ay Yürüyüşü — düşük yerçekiminde uzun, süzülen zıplamalar ----
function chamber14(ctx) {
  ctx.gravityScale = 0.35; // ay çekimi
  addBox(ctx, V(-6, -0.5, -6), V(6, 0, 0), false); // başlangıç
  addBox(ctx, V(-6, -0.5, 8), V(6, 0, 12), false); // ada 1 (boşluk z0-8)
  addBox(ctx, V(-6, -0.5, 20), V(6, 0, 26), false); // ada 2 (boşluk z12-20)
  addBox(ctx, V(-6, 0, -6.5), V(6, 1.3, -6), false);
  ctx.spawn = V(0, 0.1, -3);
  goal(ctx, V(0, 0, 23), "core", 0x6ee84f);
  ctx.objective = "Düşük yerçekiminde uzun zıplamalarla adaları geç.";
  ctx.hint = "Ay yürüyüşü! Zıplaman çok uzun ve süzülür — geniş boşlukları koşup zıplayarak aş.";
  ctx.story = "Yerçekimi alanı zayıflamış. Adımların ayda gibi… ama hedefe götürüyor.";
}

// ---- Oda 15: Yer Çekimi — çekimi ters çevir, tavanda yürü, boşluğu aş ----
function chamber15(ctx) {
  addBox(ctx, V(-6, -0.5, -6), V(6, 0, 6), false); // başlangıç zemini
  // boşluk z[6,14] (zeminden geçilemez)
  addBox(ctx, V(-6, -0.5, 14), V(6, 0, 20), false); // karşı zemin (hedef)
  addBox(ctx, V(-6, 8, -6), V(6, 8.5, 20), false); // TAVAN (ters çekimde yürünür, sürekli)
  addBox(ctx, V(-6.5, 0, -6), V(-6, 8.5, 20), false);
  addBox(ctx, V(6, 0, -6), V(6.5, 8.5, 20), false);
  addBox(ctx, V(-6, 0, -6.5), V(6, 8.5, -6), false);
  addBox(ctx, V(-6, 0, 20), V(6, 8.5, 20.5), false);
  const f1 = new FlipPad(V(0, 0, 2)); // zeminde: yukarı çevir
  const f2 = new FlipPad(V(0, 8, 16)); // tavanda: aşağı çevir
  ctx.group.add(f1.group, f2.group);
  ctx.flipPads.push(f1, f2);
  ctx.spawn = V(0, 0.1, -3);
  goal(ctx, V(0, 0, 17), "core", 0x6ee84f);
  ctx.objective = "Yerçekimini ters çevir, tavanda yürüyerek boşluğu aş.";
  ctx.hint = "Mor pad'e bas — tavana düşersin. Tavanda yürüyüp karşıya geç, oradaki pad'le tekrar zemine in.";
  ctx.story = "Yerçekimi denetleyicisi arızalı. Aşağısı yukarı, yukarısı aşağı oluyor.";
}

// ---- Oda 16: Sütun Patlatma — yolu kapatan sütunu enerji topuyla patlat ----
function chamber16(ctx) {
  addBox(ctx, V(-7, -0.5, -6), V(7, 0, 16), false); // zemin
  addBox(ctx, V(-7.5, 0, -6), V(-7, 6, 16), false); // sol (yayıcı)
  addBox(ctx, V(7, 0, -6), V(7.5, 6, 16), true); // SAĞ duvar portallanabilir
  addBox(ctx, V(-7, 0, -6.5), V(7, 6, -6), true); // ARKA duvar portallanabilir
  addBox(ctx, V(-7, 0, 16), V(7, 6, 16.5), false); // ön duvar
  // bariyer (z11): kenarlar sağlam, ortada YIKILABİLİR sütun (kapı)
  addBox(ctx, V(-7, 0, 11), V(-1.5, 6, 11.7), false);
  addBox(ctx, V(1.5, 0, 11), V(7, 6, 11.7), false);
  addBox(ctx, V(-1.5, 4, 11), V(1.5, 6, 11.7), false); // üst lento
  const pillar = new Destructible(V(-1.5, 0, 11), V(1.5, 4, 11.7), 0xff6a4a);
  ctx.group.add(pillar.group);
  ctx.colliders.push(pillar.collider);
  ctx.destructibles.push(pillar);
  // yayıcı: sol duvar, +x'e atar
  const em = new BallEmitter(V(-6.9, 2.5, 3), V(1, 0, 0), 12);
  ctx.group.add(em.group);
  ctx.emitters.push(em);

  ctx.spawn = V(0, 0.1, -3);
  goal(ctx, V(0, 0, 14), "core", 0x6ee84f);
  ctx.objective = "Yolu kapatan sütunu enerji topuyla patlat — topu portallarla üstüne yönlendir.";
  ctx.hint = "Top sağ duvara çarpıyor. Sağ duvara bir portal, arka duvara ikinci portalı aç — top arka duvardan çıkıp sütuna gider ve patlatır. Sonra açılan kapıdan geç.";
  ctx.story = "Yol bir enerji sütunuyla mühürlü. Tek çare: topu üstüne sürmek.";
}

// ---- Oda 17: Füze — seni kovalayan füzeyi portaldan içeri çekip çekirdeğe sok ----
function chamber17(ctx) {
  addBox(ctx, V(-9, -0.5, -8), V(9, 0, 15), false); // zemin
  // sol duvar — kapı boşluğu (z 1..5) bırakacak şekilde bölündü
  addBox(ctx, V(-9.5, 0, -8), V(-9, 6, 1), false); // kapının arkası
  addBox(ctx, V(-9.5, 0, 5), V(-9, 6, 15), false); // kapının önü
  addBox(ctx, V(-9.5, 4, 1), V(-9, 6, 5), false); // kapı üstü lento
  addBox(ctx, V(9, 0, -8), V(9.5, 6, 15), true); // SAĞ duvar portallanabilir (çekirdek önünde)
  addBox(ctx, V(-9, 0, -8.5), V(9, 6, -8), false); // arka (fırlatıcı)
  addBox(ctx, V(-9, 0, 15), V(9, 6, 15.5), true); // ÖN duvar portallanabilir (kaçış portalı)

  // sol duvardaki kapı boşluğunu kapatır — çekirdek patlayınca açılır; ardında hedef
  const door = new Door(V(-9.5, 0, 1), V(-9, 4, 5));
  ctx.group.add(door.mesh);
  ctx.colliders.push(door.collider);
  ctx.doors.push(door);
  addBox(ctx, V(-13, -0.5, 1), V(-9, 0, 5), false); // hedef alkovu
  addBox(ctx, V(-13, 0, 0.5), V(-9, 6, 1), false);
  addBox(ctx, V(-13, 0, 5), V(-9, 6, 5.5), false);
  addBox(ctx, V(-13, 0, 1), V(-12.5, 6, 5), false);

  // çekirdek (sağ duvarın önünde, alçak) — füze buradan çıkıp çarpar
  const core = new Destructible(V(7.3, 0.0, 4.2), V(8.5, 2.0, 5.8), 0xff3a3a);
  core.door = door;
  ctx.group.add(core.group);
  ctx.colliders.push(core.collider);
  ctx.destructibles.push(core);

  // füze fırlatıcı (arka duvar, oyuncu hizasında) -> sana kilitlenip yavaşça izler
  const ml = new MissileLauncher(V(0, 1.2, -7.8), 7.5);
  ml._turn = 0.3; // zayıf takip: net bir yan adım onu atlatır, düz gidip portala girer
  ctx.group.add(ml.group);
  ctx.missileLaunchers.push(ml);

  ctx.spawn = V(0, 0.1, 11);
  goal(ctx, V(-11, 0, 3), "core", 0x6ee84f);
  ctx.objective = "Sana kilitlenen füzeyi ön portala sok; çekirdeğin önündeki portaldan çıkıp çekirdeğe çarpsın.";
  ctx.hint = "Füze arka duvardan sana kilitlenir. Tam karşındaki ÖN duvara bir portal, SAĞ duvara (alçak kırmızı çekirdeğin tam önüne) ikinci portalı aç. Füze üstüne gelirken son anda YANA KAÇ — füze düz gidip ön portala girer, çekirdeğin önündeki portaldan çıkıp çekirdeğe çarpar ve onu patlatır. Sonra açılan kapıdan geç.";
  ctx.story = "Güvenlik füzesi seni hedef aldı. Onu kendi çekirdeğine çevir.";
}

// ---- Oda 18: Engel Yağmuru — zararlı enerji barajını portalla alıcıya çevirip kapat ----
function chamber18(ctx) {
  addBox(ctx, V(-7, -0.5, -2), V(7, 0, 17), false); // zemin
  addBox(ctx, V(-7, 0, -2.5), V(7, 6, -2), false); // arka duvar (yayıcı burada)
  addBox(ctx, V(-7.5, 0, -2), V(-7, 6, 17), false); // sol duvar
  addBox(ctx, V(7, 0, -2), V(7.5, 6, 17), true); // SAĞ duvar portallanabilir (alıcı önünde)
  addBox(ctx, V(-7, 0, 17), V(7, 6, 17.5), true); // ÖN duvar portallanabilir (topu buraya sok)

  // zararlı baraj: arka duvardan +z'ye hızlı top yağar, merkez hattı boyunca sekip durur
  const em = new BallEmitter(V(0, 1.2, -1.8), V(0, 0, 1), 13);
  ctx.group.add(em.group);
  ctx.emitters.push(em);
  ctx.ballsHarmful = true;

  // alıcı: sağ duvarın önünde, asılı halka — top buraya yönlendirilince barajı kapatır
  // hedef alkovunun kapısı (ön-sol köşe) açılır
  const door = new Door(V(-6, 0, 12.5), V(-3, 4, 13));
  ctx.group.add(door.mesh);
  ctx.colliders.push(door.collider);
  ctx.doors.push(door);
  // ön-sol hedef alkovu (girişi z13'te kapı; x -6..-3 açık, gerisi duvar)
  addBox(ctx, V(-7, 0, 13), V(-6, 6, 13.5), false); // kapının solu (sağlam)
  addBox(ctx, V(-3, 0, 13), V(-2.5, 6, 17), false); // alkov sağ kenarı

  const recept = new Receptacle(V(5.8, 1.2, 7), door, em);
  ctx.group.add(recept.group);
  ctx.receptacles.push(recept);

  ctx.spawn = V(5.2, 0.1, -0.5); // sağ-arka köşe, baraj hattının dışında (güvenli başlangıç)
  goal(ctx, V(-5, 0, 15.5), "beacon", 0x6ee8c9);
  ctx.objective = "Zararlı enerji barajını portalla alıcıya çevirip kapat, sonra hedefe ulaş.";
  ctx.hint = "Arka duvar merkez hattına zararlı toplar yağdırır — çarparsan başa dönersin. ÖN duvara (topun geldiği yere) bir portal, SAĞ duvara (asılı alıcının tam karşısına) ikinci portalı aç. Top ön portala girip alıcıdan çıkar; baraj kapanır ve hedef kapısı açılır.";
  ctx.story = "Koridoru bir enerji barajı tarıyor. Akışı kendi alıcısına çevir, sus pus olsun.";
}

// ---- Oda 19: Serbest Düşüş — şafta düş, dipteki portaldan yan duvara fırla, karşıya uç ----
function chamber19(ctx) {
  // başlangıç platformu (oyuncu burada durur, sağına/+x'e doğru şaft var)
  addBox(ctx, V(-5, -0.5, 0), V(0, 0, 4), false);
  // korkuluklar (yanlış yöne düşmeyi önle, manzara açık)
  addBox(ctx, V(-5, 0, -0.5), V(0, 1.2, 0), false); // arka korkuluk
  addBox(ctx, V(-5.5, 0, 0), V(-5, 1.2, 4), false); // sol korkuluk
  addBox(ctx, V(-5, 0, 4), V(0, 3, 4.5), false); // ÖN DUVAR (yüksek): +z'ye atlayıp şaftı atlamayı önler

  // ŞAFT: x[0,3] dipte y=-12'de PORTALLANABİLİR zemin (portal A buraya)
  addBox(ctx, V(0, -12.5, 0), V(3, -12, 4), true); // şaft dibi (portal A)
  addBox(ctx, V(3, -12, 0), V(3.5, 6, 4), false); // uzak x-duvarı YÜKSEK (üstüne çıkıp atlanamaz)
  addBox(ctx, V(-0.5, -12, 0), V(0, 0, 4), false); // yakın x-duvarı (platform altı)
  // ARKA duvar z=0, normal +z — PORTALLANABİLİR (portal B; +z'ye fırlatır, karşıya bakar)
  addBox(ctx, V(0, -12, -0.5), V(3, 2, 0), true);
  addBox(ctx, V(0, -12, 4), V(3, -6, 4.5), false); // ön eşik (alçak; fırlatma üstünden aşar)

  // KARŞI platform (+z), alçak (y=-4) ve geniş — bağışlayıcı iniş
  addBox(ctx, V(-3, -4.5, 8), V(4, -4, 34), false);
  addBox(ctx, V(-3.5, -4, 8), V(-3, -2.5, 34), false); // sol korkuluk
  addBox(ctx, V(4, -4, 8), V(4.5, -2.5, 34), false); // sağ korkuluk
  addBox(ctx, V(-3, -4, 34), V(4, -2.5, 34.5), false); // arka korkuluk

  ctx.spawn = V(-2.5, 0.1, 2);
  goal(ctx, V(0.5, -4, 16), "core", 0x6ee84f);
  ctx.objective = "Şaftın dibine ve arka duvarına portal aç; boşluğa düş, dipten fırlayıp karşıya uç.";
  ctx.hint = "Sağındaki derin şaftın DİBİNE (zemine) bir portal, şaftın ARKA duvarına (karşı platforma bakan portallanabilir yüzey) ikinci portalı aç. Sonra şafta düş — dibe çarpınca arka duvardaki portaldan ileri fırlar, boşluğu aşıp karşı platforma inersin. Iskalarsan başa döner, tekrar denersin.";
  ctx.story = "Zemin çökmüş, önünde dipsiz bir şaft. Düşüşünü bir portalla ileri çevir — momentum seni karşıya taşısın.";
}

// ---- Oda 20: Işık Köprüsü — köprüyü portalla yakala, uçurumun karşısına çevir ----
function chamber20(ctx) {
  addBox(ctx, V(-8, -0.5, 0), V(8, 0, 6), false); // başlangıç platformu
  addBox(ctx, V(-8, -0.5, 16), V(8, 0, 24), false); // çıkış platformu (uçurum z 6..16)
  addBox(ctx, V(-8.5, 0, 0), V(-8, 6, 24), false); // sol duvar (yayıcı burada)
  addBox(ctx, V(8, 0, 0), V(8.5, 6, 24), true); // SAĞ duvar portallanabilir (köprü buraya çarpar)
  addBox(ctx, V(-8, 0, -0.5), V(8, 6, 0), true); // ARKA duvar portallanabilir (köprüyü +z'ye çevir)
  addBox(ctx, V(-8, 0, 24), V(8, 6, 24.5), false); // ön duvar

  // ışık köprüsü yayıcısı: sol duvarda, +x'e ateşler (uçuruma paralel — boşa gider)
  const lb = new LightBridge(V(-7.8, 0.2, 3), V(1, 0, 0), 40);
  ctx.group.add(lb.group);
  ctx.lightBridges.push(lb);
  for (const c of lb.colliders) ctx.colliders.push(c);

  ctx.spawn = V(-5, 0.1, 3);
  goal(ctx, V(4, 0, 20), "beacon", 0x46e6ff);
  ctx.objective = "Işık köprüsünü portalla yakalayıp uçurumun karşısına çevir, üstünde yürü.";
  ctx.hint = "Yayıcı köprüyü sağ duvara (uçuruma paralel) atıyor — boşa. Köprünün çarptığı SAĞ duvara bir portal, ARKA duvara (uçuruma bakan yer) ikinci portalı aç. Köprü arka portaldan yeniden doğup uçurumu boydan boya geçer. Portal B'yi hedefin hizasına (x) koy, köprüye çıkıp karşıya yürü.";
  ctx.story = "Geçit çökmüş. Eski bir ışık köprüsü yayıcısı hâlâ çalışıyor — ışığı portalla büküp kendine bir yol döşe.";
}

// ---- Oda 21: İkinci Köprü — köprüyü farklı bir düzende kur, geniş uçurumu geç ----
function chamber21(ctx) {
  addBox(ctx, V(-8, -0.5, 0), V(8, 0, 6), false); // yakın platform
  addBox(ctx, V(-8.5, 0, 0), V(-8, 6, 6), false); // sol (köprü yayıcı)
  addBox(ctx, V(8, 0, 0), V(8.5, 6, 6), true); // SAĞ duvar portallanabilir (köprü çarpar)
  addBox(ctx, V(-8, 0, -0.5), V(8, 6, 0), true); // ARKA duvar portallanabilir (köprüyü +z'ye çevir)
  // uçurum z6..20 (14 birim, ölümcül — atlanamaz)
  addBox(ctx, V(-8, -0.5, 20), V(8, 0, 28), false); // UZAK platform
  addBox(ctx, V(-8, 0, 28), V(8, 6, 28.5), false); // uzak ön duvar (köprü buraya kadar)
  addBox(ctx, V(-8.5, 0, 20), V(-8, 6, 28), false); // uzak sol
  addBox(ctx, V(8, 0, 20), V(8.5, 6, 28), false); // uzak sağ

  const lb = new LightBridge(V(-7.8, 0.2, 3), V(1, 0, 0), 60);
  ctx.group.add(lb.group); ctx.lightBridges.push(lb);
  for (const c of lb.colliders) ctx.colliders.push(c);

  ctx.spawn = V(-4, 0.1, 3);
  goal(ctx, V(4, 0, 24), "beacon", 0x46e6ff);
  ctx.objective = "Işık köprüsünü kur ve 14 birimlik uçurumu geç — köprü şeridini hedefe göre hizala.";
  ctx.hint = "Yayıcı köprüyü sağ duvara atar (boşa). Köprünün çarptığı SAĞ duvara bir portal, ARKA duvara ikinci portalı aç — köprü arka portaldan +z'ye doğar ve uçurumu boydan boya geçer. Portal B'yi açtığın YÜKSEKLİK/x köprünün şeridini belirler; hedefe (sağ tarafta) ulaşacak şeridi seç, köprüye çıkıp karşıya yürü. Düşersen başa.";
  ctx.story = "Bir köprü daha döşemen gerek — ama bu sefer uçurum daha geniş, şeridi doğru seçmelisin.";
}

// ---- Oda 22: Lazer — ışını portalla büküp karşı duvardaki alıcıya düşür ----
function chamber22(ctx) {
  addBox(ctx, V(-9, -0.5, -8), V(9, 0, 14), false); // zemin
  addBox(ctx, V(-9, 0, -8.5), V(9, 6, -8), false); // arka (yayıcı)
  addBox(ctx, V(9, 0, -8), V(9.5, 6, 14), true); // SAĞ duvar portallanabilir
  addBox(ctx, V(-9, 0, 14), V(9, 6, 14.5), true); // ÖN duvar portallanabilir (ışın buraya çarpar)
  // SOL duvar — alıcı burada; ortada kapı boşluğu (z 9..12)
  addBox(ctx, V(-9.5, 0, -8), V(-9, 6, 9), false); // alıcı bu parçada (z=5)
  addBox(ctx, V(-9.5, 0, 12), V(-9, 6, 14), false);
  addBox(ctx, V(-9.5, 4, 9), V(-9, 6, 12), false); // kapı üstü lento

  // lazer yayıcısı: arka duvar, +z'ye düz ateşler (ön duvara çarpar — boşa)
  const lz = new Laser(V(0, 2, -7.7), V(0, 0, 1));
  ctx.group.add(lz.group);
  ctx.lasers.push(lz);

  // kapı (sol duvar boşluğu) — alıcı ışın alınca açılır; ardında hedef
  const door = new Door(V(-9.5, 0, 9), V(-9, 4, 12));
  ctx.group.add(door.mesh);
  ctx.colliders.push(door.collider);
  ctx.doors.push(door);
  addBox(ctx, V(-13, -0.5, 9), V(-9, 0, 12), false); // hedef alkovu
  addBox(ctx, V(-13, 0, 8.5), V(-9, 6, 9), false);
  addBox(ctx, V(-13, 0, 12), V(-9, 6, 12.5), false);
  addBox(ctx, V(-13, 0, 9), V(-12.5, 6, 12), false);

  // alıcı: sol duvarda (z=5, y=2) — ışın buraya gelmeli
  const rc = new LaserReceiver(V(-8.9, 2, 5), door);
  ctx.group.add(rc.group);
  ctx.laserReceivers.push(rc);

  ctx.spawn = V(0, 0.1, 8);
  goal(ctx, V(-11, 0, 10.5), "core", 0x6ee84f);
  ctx.objective = "Lazer ışınını portallarla büküp sol duvardaki alıcıya düşür, kapı açılsın.";
  ctx.hint = "Yayıcı ışını ön duvara atar — boşa. Işının ÖN duvara çarptığı yere bir portal, SAĞ duvara (soldaki alıcının tam hizasına) ikinci portalı aç. Işın ön portala girip sağ portaldan çıkar, odayı geçip alıcıya çarpar. Alıcı yanınca soldaki kapı açılır — hedefe geç.";
  ctx.story = "Eski bir lazer hattı. Işığı kendi alıcısına yönlendirirsen kilit çözülür.";
}

// ---- Oda 23: Şebeke — ÖNCE topu portalla alıcıya yolla (kapı kalıcı açılır), SONRA şebekeden geç ----
// Şebeke (fizzler) geçince portalların SIFIRLANIR. Bu yüzden kapıyı açacak işi (top yönlendirme)
// karşıya GEÇMEDEN bitirmelisin — sıralama kilidi. Alıcı bir kez dolunca kapı kalıcı açık kalır.
function chamber23(ctx) {
  // ---- YAKIN ODA (top burada sekiyor; portal A buraya) ----
  addBox(ctx, V(-7, -0.5, -6), V(7, 0, 6), false); // zemin
  addBox(ctx, V(-7, 0, -6.5), V(7, 8, -6), false); // arka
  addBox(ctx, V(-7.5, 0, -6), V(-7, 8, 6), false); // sol
  addBox(ctx, V(7, 0, -6), V(7.5, 8, 6), true); // SAĞ duvar PORTALLANABİLİR (top buraya çarpar -> portal A)
  addBox(ctx, V(-7, 8, -6), V(7, 8.5, 22), false); // tavan

  // enerji topu yayıcısı: soldan +x ateşler; top sağ duvara çarpıp sekerek YAKIN odada kalır (boşa)
  const em = new BallEmitter(V(-6.6, 2, 0), V(1, 0, 0), 11);
  ctx.group.add(em.group);
  ctx.emitters.push(em);

  // ---- ŞEBEKE duvarı z=6 (kapı boşluğu x[-2,2], içinde fizzler tüm yükseklik) ----
  addBox(ctx, V(-7, 0, 6), V(-2, 8, 6.5), false);
  addBox(ctx, V(2, 0, 6), V(7, 8, 6.5), false);
  const fz = new Fizzler(V(-2, 0, 5.7), V(2, 6, 6.3));
  ctx.group.add(fz.group);
  ctx.fizzlers.push(fz);

  // ---- UZAK ODA (alıcı + kapı + hedef; portal B arka duvarda) ----
  // Zemin z=14'te biter; z[14,22] DİPSİZ BOŞLUK. Top (yerçekimsiz) boşluğu düz geçip alıcıya varır;
  // ama B'den kendini geçiren OYUNCU boşluğa düşer (kestirme yok — yalnızca top karşıya geçebilir).
  addBox(ctx, V(-7, -0.5, 6), V(7, 0, 14), false); // zemin (z14'te biter -> boşluk)
  addBox(ctx, V(-7.5, 0, 6), V(-7, 8, 22), false); // sol
  addBox(ctx, V(7, 0, 6), V(7.5, 8, 22), false); // sağ
  addBox(ctx, V(-7, 0, 22), V(7, 8, 22.5), true); // ARKA duvar PORTALLANABİLİR (portal B; top buradan -z çıkar)

  // KAPI z=10 (oyuncuyu durdurur; alıcı dolunca KALICI açılır)
  const door = new Door(V(-7, 0, 10), V(7, 5, 10.5));
  ctx.group.add(door.mesh);
  ctx.colliders.push(door.collider);
  ctx.doors.push(door);

  // ALICI z=20 (boşluğun üstünde asılı; top yalnızca portalla buraya ulaşır, oyuncu düşer)
  const recept = new Receptacle(V(0, 2, 20), door);
  ctx.group.add(recept.group);
  ctx.receptacles.push(recept);

  ctx.spawn = V(0, 0.1, -3);
  goal(ctx, V(0, 0, 12.5), "core", 0x6ee84f);
  ctx.objective = "Topu portalla şebekenin ötesindeki alıcıya sok (kapı kalıcı açılır); SONRA şebekeden geçip hedefe ulaş.";
  ctx.hint = "Sarı şebekeden GEÇERSEN portalların SIFIRLANIR — o yüzden kapıyı açacak işi karşıya geçmeden bitir. Yayıcı topu sağ duvara çarptırıp yakın odada tutuyor. Topun çarptığı SAĞ duvara bir portal, uzak odanın ARKA duvarına (alıcının arkasına) ikinci portalı aç — top portaldan çıkıp alıcıya girer, kapı kalıcı açılır. Ancak ondan SONRA şebekeden geç; portalların gitse de kapı açık kalır.";
  ctx.story = "Bir arınma şebekesi taşıdığın her şeyi söker — portalını bile. Kilidi açacak işi, karşıya geçmeden hallet.";
}

// ---- Oda 24: Yansıtıcı — ışını portalla reflektöre sok, 90° bükülüp alıcıya gitsin ----
function chamber24(ctx) {
  addBox(ctx, V(-9, -0.5, -8), V(9, 0, 14), false); // zemin
  addBox(ctx, V(-9, 0, -8.5), V(9, 6, -8), false); // arka (yayıcı)
  addBox(ctx, V(9, 0, -8), V(9.5, 6, 14), true); // SAĞ duvar portallanabilir
  addBox(ctx, V(-9, 0, 14), V(9, 6, 14.5), true); // ÖN duvar portallanabilir (alıcı burada)
  // SOL duvar — ortada kapı boşluğu (z 9..12), ardında hedef
  addBox(ctx, V(-9.5, 0, -8), V(-9, 6, 9), false);
  addBox(ctx, V(-9.5, 0, 12), V(-9, 6, 14), false);
  addBox(ctx, V(-9.5, 4, 9), V(-9, 6, 12), false); // lento

  // lazer: arka duvardan +z, ön duvara çarpar (boşa)
  const lz = new Laser(V(0, 0.7, -7.7), V(0, 0, 1));
  ctx.group.add(lz.group);
  ctx.lasers.push(lz);

  // SABİT yansıtıcı küp ("\"): -x ışını +z'ye çevirir (zemine oturur, itilemez)
  const refl = new Cube(V(3, 0.6, 5), 1.2, { reflector: true, mirror: "\\" });
  ctx.group.add(refl.mesh);
  ctx.colliders.push(refl.collider);
  ctx.cubes.push(refl);

  // kapı (sol duvar) — alıcı yanınca açılır
  const door = new Door(V(-9.5, 0, 9), V(-9, 4, 12));
  ctx.group.add(door.mesh);
  ctx.colliders.push(door.collider);
  ctx.doors.push(door);
  addBox(ctx, V(-13, -0.5, 9), V(-9, 0, 12), false); // hedef alkovu
  addBox(ctx, V(-13, 0, 8.5), V(-9, 6, 9), false);
  addBox(ctx, V(-13, 0, 12), V(-9, 6, 12.5), false);
  addBox(ctx, V(-13, 0, 9), V(-12.5, 6, 12), false);

  // alıcı: ÖN duvarda, reflektör hizasında (x≈3.6)
  const rc = new LaserReceiver(V(3.6, 0.7, 13.8), door);
  ctx.group.add(rc.group);
  ctx.laserReceivers.push(rc);

  ctx.spawn = V(5, 0.1, 9);
  goal(ctx, V(-11, 0, 10.5), "core", 0x6ee84f);
  ctx.objective = "Işını portalla yansıtıcıya yönlendir; küpte 90° bükülüp ön duvardaki alıcıya gitsin.";
  ctx.hint = "Yayıcı ışını ön duvara atar (boşa). Işının ÖN duvara değdiği yere bir portal, SAĞ duvara (parlak yansıtıcı küpün hizasına, z≈5) ikinci portalı aç. Işın sağ portaldan çıkıp yansıtıcıya çarpar, orada 90° bükülüp ÖN duvardaki alıcıya ulaşır. Alıcı yanınca soldaki kapı açılır.";
  ctx.story = "Bir prizma-ayna. Işığı yalnız portalla değil, açıyla da yönlendirmen gerekiyor.";
}

// ---- Oda 25: Sıçrama Jeli — jeli portalla çıkışın altına taşı, sıçrayıp yüksek kıyıya çık ----
function chamber25(ctx) {
  addBox(ctx, V(-9, -0.5, -6), V(9, 0, 16), true); // ZEMİN portallanabilir (jel + portal A)
  addBox(ctx, V(-9, 8, -6), V(9, 8.5, 16), true); // TAVAN portallanabilir (portal B)
  addBox(ctx, V(-9.5, 0, -6), V(-9, 8.5, 16), false); // sol
  addBox(ctx, V(9, 0, -6), V(9.5, 8.5, 16), false); // sağ
  addBox(ctx, V(-9, 0, -6.5), V(9, 8.5, -6), false); // arka
  addBox(ctx, V(-9, 0, 16), V(9, 8.5, 16.5), false); // ön

  // jel yayıcısı: TAVANDA, düz aşağı damlatır -> varsayılan yama D=(4,0,3) (işe yaramaz)
  const em = new BallEmitter(V(4, 8, 3), V(0, -1, 0), 2, { gel: true });
  ctx.group.add(em.group);
  ctx.emitters.push(em);

  // YÜKSEK çıkış kıyısı (sol-ön), sıçrama yamasıyla erişilir
  addBox(ctx, V(-7, 4, 13), V(-0.5, 4.5, 16), false); // kıyı (üst y=4.5)
  goal(ctx, V(-3.5, 4.5, 14.5), "core", 0x6ee84f);

  ctx.spawn = V(0, 0.1, 2);
  ctx.objective = "Jeli portalla yüksek çıkışın önüne taşı; oluşan sıçrama yamasından zıplayıp kıyıya çık.";
  ctx.hint = "Tavandaki yayıcı jeli sağ tarafa (D≈4,3) damlatır — orada bir sıçrama yaması olur ama işe yaramaz. Jelin düştüğü zemine bir portal, çıkış kıyısının ÖNÜNDEKİ tavana (T≈-3,11 üstü) ikinci portalı aç. Jel oradan düşüp kıyının önünde yama bırakır. Sonra koşarak yamaya bas — ileri-yukarı sekip kıyıya çıkarsın.";
  ctx.story = "Eski bir sıçrama jeli hattı. Akışı portalla yönlendir, kendine bir zıplama noktası döşe.";
}

// ---- Oda 26: Mantık Kapısı — tek ışını iki alıcıdan geçir (AND), kapı açılsın ----
function chamber26(ctx) {
  addBox(ctx, V(-9, -0.5, -8), V(9, 0, 14), false); // zemin
  addBox(ctx, V(-9, 0, -8.5), V(9, 6, -8), false); // arka (yayıcı)
  addBox(ctx, V(9, 0, -8), V(9.5, 6, 14), true); // SAĞ duvar portallanabilir
  addBox(ctx, V(-9, 0, 14), V(9, 6, 14.5), true); // ÖN duvar portallanabilir
  // SOL duvar — kapı boşluğu (z 9..12), ardında hedef
  addBox(ctx, V(-9.5, 0, -8), V(-9, 6, 9), false);
  addBox(ctx, V(-9.5, 0, 12), V(-9, 6, 14), false);
  addBox(ctx, V(-9.5, 4, 9), V(-9, 6, 12), false); // lento

  // lazer: arka duvardan +z (ön duvara çarpar)
  const lz = new Laser(V(0, 0.7, -7.7), V(0, 0, 1));
  ctx.group.add(lz.group);
  ctx.lasers.push(lz);

  // iki "içinden geçilen" alıcı (kapı yok; AND kapısı sürer)
  const r1 = new LaserReceiver(V(4, 0.7, 5), null, { passThrough: true });
  const r2 = new LaserReceiver(V(-1.4, 0.7, 1), null, { passThrough: true });
  ctx.group.add(r1.group, r2.group);
  ctx.laserReceivers.push(r1, r2);

  // SABİT yansıtıcı ("/"): -x ışını -z'ye çevirir (R1'den sonra R2'ye iplikler)
  const refl = new Cube(V(-2, 0.6, 5), 1.2, { reflector: true, mirror: "/" });
  ctx.group.add(refl.mesh);
  ctx.colliders.push(refl.collider);
  ctx.cubes.push(refl);

  // kapı + AND kapısı (R1 & R2)
  const door = new Door(V(-9.5, 0, 9), V(-9, 4, 12));
  ctx.group.add(door.mesh);
  ctx.colliders.push(door.collider);
  ctx.doors.push(door);
  const gate = new LogicGate([r1, r2], "AND", door, V(3, 3.2, -7.8));
  ctx.group.add(gate.group);
  ctx.logicGates.push(gate);

  addBox(ctx, V(-13, -0.5, 9), V(-9, 0, 12), false); // hedef alkovu
  addBox(ctx, V(-13, 0, 8.5), V(-9, 6, 9), false);
  addBox(ctx, V(-13, 0, 12), V(-9, 6, 12.5), false);
  addBox(ctx, V(-13, 0, 9), V(-12.5, 6, 12), false);

  ctx.spawn = V(5, 0.1, 9);
  goal(ctx, V(-11, 0, 10.5), "core", 0x6ee84f);
  ctx.objective = "Tek ışını HER İKİ alıcıdan geçir; AND kapısı ikisi de yanınca kapıyı açar.";
  ctx.hint = "Kapı yalnızca İKİ alıcı da yanınca açılır (AND). Tek ışın var. Işının ön duvara değdiği yere bir portal, SAĞ duvara (alıcı R1 ve yansıtıcı hizasına, z≈5) ikinci portalı aç. Işın R1'den geçer, yansıtıcıda 90° bükülüp R2'den de geçer. İkisi de yanınca soldaki kapı açılır.";
  ctx.story = "Bir mantık kilidi: tek bir ışını ikiye bölmeden iki düğümden geçirmen gerek.";
}

// ---- Oda 27: Çift Yansıtıcı — ışını iki reflektörle zigzag yapıp alıcıya ulaştır ----
function chamber27(ctx) {
  addBox(ctx, V(-9, -0.5, -8), V(9, 0, 14), false); // zemin
  addBox(ctx, V(-9, 0, -8.5), V(9, 6, -8), false); // arka (yayıcı)
  addBox(ctx, V(9, 0, -8), V(9.5, 6, 14), true); // SAĞ duvar portallanabilir (+ alıcı)
  addBox(ctx, V(-9, 0, 14), V(9, 6, 14.5), true); // ÖN duvar portallanabilir
  // SOL duvar — kapı boşluğu (z 9..12)
  addBox(ctx, V(-9.5, 0, -8), V(-9, 6, 9), false);
  addBox(ctx, V(-9.5, 0, 12), V(-9, 6, 14), false);
  addBox(ctx, V(-9.5, 4, 9), V(-9, 6, 12), false);

  const lz = new Laser(V(0, 0.7, -7.7), V(0, 0, 1)); // +z
  ctx.group.add(lz.group); ctx.lasers.push(lz);

  // iki sabit reflektör: -x --R1"/"--> -z --R2"\"--> +x
  const r1 = new Cube(V(2, 0.6, 5), 1.2, { reflector: true, mirror: "/" });
  const r2 = new Cube(V(2.6, 0.6, -3), 1.2, { reflector: true, mirror: "\\" });
  ctx.group.add(r1.mesh, r2.mesh);
  ctx.colliders.push(r1.collider, r2.collider);
  ctx.cubes.push(r1, r2);

  const door = new Door(V(-9.5, 0, 9), V(-9, 4, 12));
  ctx.group.add(door.mesh); ctx.colliders.push(door.collider); ctx.doors.push(door);
  // alıcı: ölçülen +x ışın bitişine (sağ duvar) yerleştirilecek (sim ile)
  const rc = new LaserReceiver(V(8.9, 0.7, -2.4), door);
  ctx.group.add(rc.group); ctx.laserReceivers.push(rc);

  addBox(ctx, V(-13, -0.5, 9), V(-9, 0, 12), false); // hedef alkovu
  addBox(ctx, V(-13, 0, 8.5), V(-9, 6, 9), false);
  addBox(ctx, V(-13, 0, 12), V(-9, 6, 12.5), false);
  addBox(ctx, V(-13, 0, 9), V(-12.5, 6, 12), false);

  ctx.spawn = V(5, 0.1, 9);
  goal(ctx, V(-11, 0, 10.5), "core", 0x6ee84f);
  ctx.objective = "Işını portalla ilk yansıtıcıya sok; iki reflektörde zigzag yapıp sağ duvardaki alıcıya gitsin.";
  ctx.hint = "Işının ÖN duvara değdiği yere bir portal, SAĞ duvara (ilk yansıtıcı hizasına, z≈5) ikinci portalı aç. Işın -x gider, R1'de -z'ye, R2'de +x'e döner ve sağ duvardaki alıcıya çarpar. Tek portalla iki büküm zincirini kur.";
  ctx.story = "İki aynalı bir labirent. Işığı iki kez köşeden döndürmen gerek.";
}

// ---- Oda 28: Yukarı Işın — ışını zemin portalıyla yukarı çevir, tavandaki alıcıyı yak ----
function chamber28(ctx) {
  addBox(ctx, V(-9, -0.5, -6), V(9, 0, 12), true); // ZEMİN portallanabilir (dikey çevirme için)
  addBox(ctx, V(-9, 6, -6), V(9, 6.5, 12), false); // tavan (alıcı burada)
  addBox(ctx, V(-9, 0, -6.5), V(9, 6.5, -6), false); // arka (yayıcı)
  addBox(ctx, V(9, 0, -6), V(9.5, 6.5, 12), true); // SAĞ duvar portallanabilir
  addBox(ctx, V(-9.5, 0, -6), V(-9, 6.5, 9), false); // sol (kapı boşluğu z9..12)
  addBox(ctx, V(-9.5, 0, 12), V(-9, 6.5, 12), false);
  addBox(ctx, V(-9, 0, 12), V(9, 6.5, 12.5), false); // ön

  // lazer: arka-sol köşeden +x, sağ duvara çarpar (yatay, alıcıya ulaşmaz)
  const lz = new Laser(V(-8.7, 0.7, 4), V(1, 0, 0));
  ctx.group.add(lz.group); ctx.lasers.push(lz);

  // kapı + tavandaki alıcı (yalnızca yukarı giden ışın ulaşır)
  const door = new Door(V(-9.5, 0, 9), V(-9, 4, 12));
  ctx.group.add(door.mesh); ctx.colliders.push(door.collider); ctx.doors.push(door);
  const rc = new LaserReceiver(V(3, 5.9, 4), door); // tavana monteli
  ctx.group.add(rc.group); ctx.laserReceivers.push(rc);

  addBox(ctx, V(-13, -0.5, 9), V(-9, 0, 12), false); // hedef alkovu
  addBox(ctx, V(-13, 0, 8.5), V(-9, 6, 9), false);
  addBox(ctx, V(-13, 0, 12), V(-9, 6, 12.5), false);
  addBox(ctx, V(-13, 0, 9), V(-12.5, 6, 12), false);

  ctx.spawn = V(5, 0.1, 8);
  goal(ctx, V(-11, 0, 10.5), "core", 0x6ee84f);
  ctx.objective = "Tavana yakın alıcıyı lazerle yak, kapı açılsın.";
  ctx.hint = "Işın yatay ilerliyor ama alıcı yukarıda — onu yükseltmen gerek. Bir portalı ZEMİNE açarsan, ışın o portaldan DİKEY yukarı çıkar. Işının çarptığı sağ duvara bir portal, alıcının tam ALTINDAKİ zemine ikinci portalı aç. Işın yukarı fırlayıp tavandaki alıcıya çarpar.";
  ctx.story = "Alıcı tavanda. Işığı yalnızca yana değil, yukarı da çevirebileceğini hatırla.";
}

// ---- Oda 29: Hız Kilidi — düşüş hızı sabit, çıkış YÜKSEKLİĞİNİ seç; yalnızca doğru yükseklik hedefe kondurur ----
function chamber29(ctx) {
  // başlangıç platformu (oyuncu burada; sağına/+x'e şaft var)
  addBox(ctx, V(-5, -0.5, 0), V(0, 0, 4), false);
  addBox(ctx, V(-5, 0, -0.5), V(0, 1.2, 0), false); // arka korkuluk
  addBox(ctx, V(-5.5, 0, 0), V(-5, 1.2, 4), false); // sol korkuluk
  addBox(ctx, V(-5, 0, 4), V(0, 3, 4.5), false); // ÖN duvar (şaftı atlamayı önler)

  // ŞAFT: x[0,3], dipte SABİT derinlikte portallanabilir zemin (portal A) -> sabit hız
  addBox(ctx, V(0, -9.5, 0), V(3, -9, 4), true); // şaft dibi (portal A) — derinlik sabit
  addBox(ctx, V(3, -9, 0), V(3.5, 7, 4), false); // sağ x-duvarı (yüksek)
  addBox(ctx, V(-0.5, -9, 0), V(0, 0, 4), false); // yakın x-duvarı (platform altı)

  // ARKA duvar z=0 (normal +z): ÜÇ portallanabilir bant (alçak/orta/yüksek), aralar metal.
  // Oyuncu portal B'yi hangi banta açarsa o yükseklikten +z'ye fırlar; menzil değişir.
  addBox(ctx, V(0, -9, -0.5), V(3, -7.4, 0), false); // metal (dip)
  addBox(ctx, V(0, -7.4, -0.5), V(3, -4.6, 0), true); // ALÇAK bant (merkez y≈-6) — kısa menzil
  addBox(ctx, V(0, -4.6, -0.5), V(3, -3.4, 0), false); // metal
  addBox(ctx, V(0, -3.4, -0.5), V(3, -0.6, 0), true); // ORTA bant (merkez y≈-2) — DOĞRU menzil
  addBox(ctx, V(0, -0.6, -0.5), V(3, 0.6, 0), false); // metal
  addBox(ctx, V(0, 0.6, -0.5), V(3, 3.4, 0), true); // YÜKSEK bant (merkez y≈+2) — uzun menzil (aşar)
  addBox(ctx, V(0, 3.4, -0.5), V(3, 7, 0), false); // metal (üst)

  addBox(ctx, V(0, -9, 4), V(3, -8, 4.5), false); // ön eşik (çok alçak; her fırlatma üstünden aşar)

  // HEDEF kıyısı — yalnızca ORTA bantın menzili (her yerinden) buraya kondurur.
  // ALÇAK bant kısa kalıp boşluğa, YÜKSEK bant kıyıyı aşıp boşluğa düşer.
  addBox(ctx, V(-2, -10.5, 15.2), V(5, -10, 20.2), false); // hedef kıyısı (üst y=-10)

  ctx.spawn = V(-2.5, 0.1, 2);
  goal(ctx, V(1.5, -10, 17.6), "core", 0x6ee84f);
  ctx.objective = "Şaftın dibine bir portal aç; çıkış için ÜÇ banttan DOĞRU yükseklikteki bandı seç — yalnızca biri hedefe kondurur.";
  ctx.hint = "Düşüş hızın sabit (şaft derinliği değişmiyor). Çıkışın YÜKSEKLİĞİ menzili belirler: yüksek bant daha uzağa, alçak bant daha yakına fırlatır. Şaft dibine portal A, arka duvardaki ÜÇ banttan birine portal B. Alçak kısa kalır, yüksek aşar — ortadaki bant tam hedefe taşır. Yanlış seçersen boşluğa düşersin, tekrar dene.";
  ctx.story = "Eski bir fırlatma kuyusu. Hız sabit ama açıyı sen seçiyorsun — menzili kafanda kur, doğru bandı bul.";
}

// ---- Oda 30: Yankı — kendini kaydet; klonun butonu basılı tutarken sen kapıdan geç ----
// YENİ MEKANİK: Yankı (zaman yankısı). E tuşu / "⏱ Yankı" düğmesi kaydı başlatır/bitirir.
// Bitince kayıt başlangıcına ışınlanırsın ve klon rotanı oynar (son karede donar).
function chamber30(ctx) {
  // geniş oda (portallanabilir yüzey YOK — bu bölüm tamamen yankı mekaniğiyle çözülür)
  addBox(ctx, V(-16, -0.5, -4), V(12, 0, 4), false); // zemin
  addBox(ctx, V(-16.5, 0, -4), V(-16, 6, 4), false); // sol
  addBox(ctx, V(12, 0, -4), V(12.5, 6, 4), false); // sağ
  addBox(ctx, V(-16, 0, -4.5), V(12, 6, -4), false); // arka
  addBox(ctx, V(-16, 0, 4), V(12, 6, 4.5), false); // ön
  addBox(ctx, V(-16, 6, -4), V(12, 6.5, 4), false); // tavan

  // KAPI x=5 (sürekli ağırlık ister: bırakılınca ANINDA kapanır -> tek başına koşup yetişemezsin,
  // kayıt sırasında butona basman da işe yaramaz; yalnızca klon basılı tutarken açık kalır)
  const door = new Door(V(5, 0, -4), V(5.5, 5, 4));
  door.closeSpeed = 8; // hızlı kapanış: zamanlama penceresi yok, basılı TUTULMALI
  ctx.group.add(door.mesh);
  ctx.colliders.push(door.collider);
  ctx.doors.push(door);

  // BUTON x=-13 (anlık: yalnızca üstünde biri/klon dururken basılı). Kapıdan 18 birim uzak.
  const btn = new Button(V(-13, 0, 0), door);
  ctx.group.add(btn.group);
  ctx.buttons.push(btn);

  ctx.echoMax = 1; // bu bölümde 1 yankı kaydedilebilir
  ctx.spawn = V(0, 0.1, 0);
  goal(ctx, V(9, 0, 0), "core", 0x6ee84f);
  ctx.objective = "Kendini kaydet: klonun butonu basılı tutarken sen kapıdan geçip hedefe ulaş.";
  ctx.hint = "Buton anlık — basılı tutulmazsa kapı hemen kapanır, tek başına basıp koşarak yetişemezsin. ÇÖZÜM: 'Yankı' kaydını başlat (E tuşu ya da ⏱ düğmesi), butona yürü ve üstünde dur, sonra kaydı bitir. Kayıt başlangıcına ışınlanırsın ve KLONUN aynı yolu yürüyüp butonun üstünde donar — kapı açık kalır. Şimdi sen kapıdan geçip hedefe git.";
  ctx.story = "Eski bir zaman-yankısı konsolu. Kendi geçmişini kaydedip yanında bir 'sen' daha çalıştırabilirsin — iki yerde birden ol.";
}

// ---- Oda 31: Çift Yankı — İKİ klon, iki butonu aynı anda tutmalı (tek başına olmaz) ----
// Kapı yalnızca b1 VE b2 birlikte basılıyken açılır (AND). Butonlar uzakta; tek başına
// ikisini tutamazsın, bas-koş da işe yaramaz (anında kapanır). İki yankı kaydı şart.
function chamber31(ctx) {
  addBox(ctx, V(-16, -0.5, -5), V(16, 0, 12), false); // zemin
  addBox(ctx, V(-16.5, 0, -5), V(-16, 6, 12), false); // sol
  addBox(ctx, V(16, 0, -5), V(16.5, 6, 12), false); // sağ
  addBox(ctx, V(-16, 0, -5.5), V(16, 6, -5), false); // arka
  addBox(ctx, V(-16, 0, 12), V(16, 6, 12.5), false); // ön
  addBox(ctx, V(-16, 6, -5), V(16, 6.5, 12), false); // tavan

  // KAPI duvarı z=8, ortada kapı boşluğu x[-3,3]
  addBox(ctx, V(-16, 0, 8), V(-3, 6, 8.5), false);
  addBox(ctx, V(3, 0, 8), V(16, 6, 8.5), false);
  addBox(ctx, V(-3, 5, 8), V(3, 6, 8.5), false); // lento
  const door = new Door(V(-3, 0, 8), V(3, 5, 8.5));
  door.closeSpeed = 8; // bırakılınca anında kapanır
  ctx.group.add(door.mesh);
  ctx.colliders.push(door.collider);
  ctx.doors.push(door);

  // İKİ buton (uzak; aynı anda tutmak için iki klon gerek). null kapı -> sadece pressed izlenir.
  const b1 = new Button(V(-13, 0, 2), null);
  const b2 = new Button(V(13, 0, 2), null);
  ctx.group.add(b1.group, b2.group);
  ctx.buttons.push(b1, b2);
  door.requires = [b1, b2]; // AND kilidi

  ctx.echoMax = 2; // iki yankı kaydedilebilir
  ctx.spawn = V(0, 0.1, 0);
  goal(ctx, V(0, 0, 10.5), "core", 0x6ee84f);
  ctx.objective = "İki butonu aynı anda bastır: iki ayrı klon kaydet, sonra sen kapıdan geç.";
  ctx.hint = "Kapı yalnızca İKİ buton birlikte basılıyken açılır — tek başına ikisine birden basamazsın, basıp koşsan da anında kapanır. ÇÖZÜM: 1) Yankı kaydını başlat, SOL butona yürü, dur, kaydı bitir (1. klon onu tutar). 2) Tekrar kayıt başlat, SAĞ butona yürü, dur, bitir (2. klon onu tutar). 3) İki klon iki butonu da tutarken kapı açılır — sen ortadan kapıya yürü.";
  ctx.story = "İki kilit, iki el gerek. Ama sen birsin… ta ki iki yankını birden çalıştırana kadar.";
}

// ---- Oda 32: Portal Yankısı — klon, portalından geçip ADADAKİ butonu tutar; sen yerden hedefe ----
// Buton, yalnızca portalla geçilen bir adada. Onu tutup aynı anda hedefe gidemezsin:
// portal rotanı KAYDET, klon portaldan geçip butonu tutsun, sen yerden kapıya yürü.
function chamber32(ctx) {
  // YAKIN oda (spawn)
  addBox(ctx, V(-6, -0.5, -4), V(6, 0, 4), false); // zemin
  addBox(ctx, V(-6, 0, -4.5), V(6, 6, -4), false); // arka
  addBox(ctx, V(-6, 6, -4), V(6, 6.5, 18), false); // tavan
  // SOL duvar (x=-6, normal +x) PORTALLANABİLİR ve uzun: A spawn'da, B adada açılır
  addBox(ctx, V(-6.5, 0, -4), V(-6, 6, 18), true);

  // dipsiz boşluk z[4,12] (atlanamaz) -> ADA yalnızca portalla
  addBox(ctx, V(-6, -0.5, 12), V(6, 0, 18), false); // ADA zemini
  addBox(ctx, V(-6, 0, 18), V(6, 6, 18.5), false); // ada arka
  addBox(ctx, V(6, 0, 12), V(6.5, 6, 18), false); // ada sağ

  // ADA butonu (kapıyı açar) — momentary, hızlı kapanır
  const door = new Door(V(6, 0, -2), V(6.5, 5, 2));
  door.closeSpeed = 8;
  ctx.group.add(door.mesh); ctx.colliders.push(door.collider); ctx.doors.push(door);
  const b = new Button(V(0, 0, 15), door);
  ctx.group.add(b.group); ctx.buttons.push(b);

  // HEDEF koridoru (+x, yerden yürünür; kapı b ile açılır). Portallanabilir yüzey yok -> kestirme yok.
  addBox(ctx, V(6, -0.5, -2), V(14, 0, 2), false); // koridor zemini
  addBox(ctx, V(6, 0, -2.5), V(14, 6, -2), false); // koridor sağ-arka
  addBox(ctx, V(6, 0, 2), V(14, 6, 2.5), false); // koridor sağ-ön
  addBox(ctx, V(14, 0, -2), V(14.5, 6, 2), false); // koridor uç
  addBox(ctx, V(6, 0, 2), V(6.5, 6, 12), false); // spawn ön duvarı (boşluk kenarı)
  addBox(ctx, V(6, 0, -4), V(6.5, 6, -2), false); // spawn sağ duvar (kapının solu)

  ctx.echoMax = 1;
  ctx.spawn = V(2, 0.1, 0);
  goal(ctx, V(11, 0, 0), "core", 0x6ee84f);
  ctx.objective = "Klonu portaldan geçirip adadaki butonu tutturt; sen yerden kapıdan geçip hedefe ulaş.";
  ctx.hint = "Adadaki buton kapıyı açar ama ada yalnızca portalla geçilir — onu tutup aynı anda hedefe gidemezsin. ÇÖZÜM: SOL duvara iki portal aç (biri yakına, biri adanın hizasına). Yankı kaydını başlat, portala girip adaya geç, butonun üstünde dur, kaydı bitir. Klon aynı yolu izleyip butonu tutar, kapı açılır. Sonra sen sağdaki kapıdan yürüyüp hedefe git.";
  ctx.story = "Klonun senin portalından geçebiliyor. Onu uzaktaki kilide yolla, sen önden git.";
}

// ---- Oda 33: Yankı Zinciri — klonlar farklı rol; KAYIT SIRASI kilidin kendisi ----
// b1 (klon1) D1'i açar. b2 yalnızca D1'in ARDINDA; oraya bir klon kaydetmek için
// D1'in O ESNADA açık olması gerek -> önce klon1'i kaydet, sonra klon2'yi açık
// kapıdan geçirip b2'ye kaydet. Yanlış sırada (önce klon2) kapı kapalı, ulaşamaz.
function chamber33(ctx) {
  // R0 (spawn)
  addBox(ctx, V(-6, -0.5, -4), V(6, 0, 4), false);
  // R1
  addBox(ctx, V(-6, -0.5, 4), V(6, 0, 12), false);
  // Hedef odası (derin: kapalı D2'ye yapışan oyuncu hedefin 2.6 küresine giremesin)
  addBox(ctx, V(-6, -0.5, 12), V(6, 0, 18), false);
  // dış duvarlar (boydan boya)
  addBox(ctx, V(-6.5, 0, -4), V(-6, 6, 18), false); // sol
  addBox(ctx, V(6, 0, -4), V(6.5, 6, 18), false); // sağ
  addBox(ctx, V(-6, 0, -4.5), V(6, 6, -4), false); // arka
  addBox(ctx, V(-6, 0, 18), V(6, 6, 18.5), false); // ön
  addBox(ctx, V(-6, 6, -4), V(6, 6.5, 18), false); // tavan

  // D1 (z=4) — b1 ile açılır
  addBox(ctx, V(-6, 0, 4), V(-2, 6, 4.5), false);
  addBox(ctx, V(2, 0, 4), V(6, 6, 4.5), false);
  addBox(ctx, V(-2, 5, 4), V(2, 6, 4.5), false); // lento
  const d1 = new Door(V(-2, 0, 4), V(2, 5, 4.5));
  d1.closeSpeed = 8;
  ctx.group.add(d1.mesh); ctx.colliders.push(d1.collider); ctx.doors.push(d1);
  // D2 (z=12) — b2 ile açılır
  addBox(ctx, V(-6, 0, 12), V(-2, 6, 12.5), false);
  addBox(ctx, V(2, 0, 12), V(6, 6, 12.5), false);
  addBox(ctx, V(-2, 5, 12), V(2, 6, 12.5), false);
  const d2 = new Door(V(-2, 0, 12), V(2, 5, 12.5));
  d2.closeSpeed = 8;
  ctx.group.add(d2.mesh); ctx.colliders.push(d2.collider); ctx.doors.push(d2);

  const b1 = new Button(V(-4, 0, 0), d1);   // R0'da: D1'i açar
  const b2 = new Button(V(4, 0, 8), d2);    // R1'de (D1'in ardında): D2'yi açar
  ctx.group.add(b1.group, b2.group);
  ctx.buttons.push(b1, b2);

  ctx.echoMax = 2;
  ctx.spawn = V(0, 0.1, 0);
  goal(ctx, V(0, 0, 15.5), "core", 0x6ee84f);
  ctx.objective = "İki klonu zincirle: biri ilk kapıyı açsın ki ötekini ikinci butona kaydedebilesin.";
  ctx.hint = "İki kapı var: D1 (b1 ile) ve onun ARDINDAKİ D2 (b2 ile). b2'yi tutacak klonu kaydetmek için, o kayıt sırasında D1 AÇIK olmalı. Yani SIRA önemli: 1) Önce klon1'i kaydet — sol butona (b1) yürü, dur, bitir; D1 açılır. 2) Şimdi klon2'yi kaydet — AÇIK D1'den geçip sağdaki b2'ye yürü, dur, bitir; D2 açılır. 3) İki klon iki butonu tutarken sen iki kapıdan da geçip hedefe git. Önce klon2'yi denersen D1 kapalı olur, b2'ye ulaşamazsın.";
  ctx.story = "Yankılar bir zincir kurar: biri yol açar, öteki o yoldan geçer. Doğru sırada uyandır.";
}

// ---- Oda 34: Yankı ve Işın — klon ışının GEÇİDİNİ açar, sen ışını portalla yönlendirirsin ----
// Lazerin alıcıya giden yolunda bir kapı (D) var; D yalnızca buton basılıyken açık (klon tutar).
// Sen ışını portalla alıcıya çevirirsin. İki ayrı rol: klon geçidi açar, sen ışını yönlendirir.
function chamber34(ctx) {
  addBox(ctx, V(-9, -0.5, -8), V(9, 0, 14), false); // zemin
  addBox(ctx, V(-9, 0, -8.5), V(9, 6, -8), false); // arka (yayıcı)
  addBox(ctx, V(9, 0, -8), V(9.5, 6, 14), true); // SAĞ duvar portallanabilir (portal B)
  addBox(ctx, V(-9, 0, 14), V(9, 6, 14.5), true); // ÖN duvar portallanabilir (ışın buraya çarpar; portal A)
  addBox(ctx, V(-9, 6, -8), V(9, 6.5, 14), false); // tavan
  // SOL duvar — ortada hedef kapısı boşluğu (z 9..12)
  addBox(ctx, V(-9.5, 0, -8), V(-9, 6, 9), false);
  addBox(ctx, V(-9.5, 0, 12), V(-9, 6, 14), false);
  addBox(ctx, V(-9.5, 4, 9), V(-9, 6, 12), false); // lento

  // lazer: arka-orta, +z (ön duvara çarpar — boşa)
  const lz = new Laser(V(0, 2, -7.7), V(0, 0, 1));
  ctx.group.add(lz.group); ctx.lasers.push(lz);

  // hedef kapısı (sol) — alıcı ışın alınca açılır
  const goalDoor = new Door(V(-9.5, 0, 9), V(-9, 4, 12));
  goalDoor.closeSpeed = 8;
  ctx.group.add(goalDoor.mesh); ctx.colliders.push(goalDoor.collider); ctx.doors.push(goalDoor);
  addBox(ctx, V(-13, -0.5, 9), V(-9, 0, 12), false); // hedef alkovu
  addBox(ctx, V(-13, 0, 8.5), V(-9, 6, 9), false);
  addBox(ctx, V(-13, 0, 12), V(-9, 6, 12.5), false);
  addBox(ctx, V(-13, 0, 9), V(-12.5, 6, 12), false);

  // ALICI (sol duvar, z=5) — ışın buraya gelmeli
  const rc = new LaserReceiver(V(-8.9, 2, 5), goalDoor);
  ctx.group.add(rc.group); ctx.laserReceivers.push(rc);

  // GEÇİT kapısı D — ışının alıcıya giden yolunu keser (x≈-7, z5). Buton basılıyken açık.
  const gate = new Door(V(-7.5, 0, 3.5), V(-7, 6, 6.5));
  gate.closeSpeed = 8;
  ctx.group.add(gate.mesh); ctx.colliders.push(gate.collider); ctx.doors.push(gate);
  const b = new Button(V(5, 0, 9), gate); // klon bunu tutar -> D açılır
  ctx.group.add(b.group); ctx.buttons.push(b);

  ctx.echoMax = 1;
  ctx.spawn = V(0, 0.1, 8);
  goal(ctx, V(-12, 0, 10.5), "core", 0x6ee84f); // alkovda derin: kapalı kapıya yapışan oyuncu 2.6 küresine giremesin
  ctx.objective = "Klon ışının geçit kapısını tutsun; sen ışını portalla alıcıya çevir, hedefe git.";
  ctx.hint = "Lazerin alıcıya giden yolunda bir geçit kapısı (D) var — yalnızca buton basılıyken açık. O butonu tutup aynı anda ışını yönlendirip hedefe gidemezsin. ÇÖZÜM: 1) Yankı kaydını başlat, sağdaki butona (b) yürü, dur, bitir; klon D'yi açık tutar. 2) Işının çarptığı ÖN duvara bir portal, SAĞ duvara (alıcının z hizası, z≈5) ikinci portalı aç — ışın açık D'den geçip alıcıya varır, hedef kapısı açılır. 3) Soldaki kapıdan hedefe git.";
  ctx.story = "Işık hattı bir güvenlik geçidinden geçiyor. Yankın geçidi tutsun, sen ışığı yönlendir.";
}

// ---- Oda 35: Ayna — hareketini X'te yansıtan ikinci bir karakter; ikisini de çıkışa götür ----
// YENİ MEKANİK: Ayna. Sen +x gidince o -x gider (z aynı). Kendi çarpışması var; duvarlar
// simetriyi bozar. Hem sen hem aynan kendi çıkışınızda olunca bölüm geçilir. (Beceri/zamanlama
// değil; uzaysal planlama.) Giriş bölümü: önündeki duvarı dolanırken aynanın da geçtiğini gör.
function chamber35(ctx) {
  addBox(ctx, V(-12, -0.5, -10), V(12, 0, 12), false); // zemin
  addBox(ctx, V(-12.5, 0, -10), V(-12, 5, 12), false); // sol
  addBox(ctx, V(12, 0, -10), V(12.5, 5, 12), false); // sağ
  addBox(ctx, V(-12, 0, -10.5), V(12, 5, -10), false); // arka
  addBox(ctx, V(-12, 0, 12), V(12, 5, 12.5), false); // ön
  // SENİN şeridinde (sağ) bir engel duvarı: düz +z gidemezsin, merkeze dolanmalısın.
  addBox(ctx, V(3, 0, -0.4), V(9, 3, 0.4), false);
  // (Aynanın şeridi -x açık; sen dolanırken aynan ters-x salınıp kendi çıkışına varır.)

  ctx.mirror = { spawn: V(-5, 0.1, -8), exit: V(-5, 0, 9), exitRadius: 2.0 };
  ctx.spawn = V(5, 0.1, -8);
  goal(ctx, V(5, 0, 9), "core", 0x6ee84f); // SENİN çıkışın (yeşil)
  // aynanın çıkış işareti (turuncu halka)
  const mring = new THREE.Mesh(
    new THREE.TorusGeometry(1.4, 0.12, 12, 28),
    new THREE.MeshStandardMaterial({ color: 0xffae54, emissive: 0xcc5a12, emissiveIntensity: 1.2 })
  );
  mring.rotation.x = Math.PI / 2; mring.position.set(-5, 0.15, 9);
  ctx.group.add(mring);

  ctx.objective = "Hem sen (yeşil) hem aynan (turuncu) kendi çıkışınızda olun. Sen +x → ayna -x.";
  ctx.hint = "İkinci bir karakter hareketini X ekseninde yansıtır: sen sağa gidince o sola, ileri gidince ikiniz de ileri. Önündeki duvarı düz geçemezsin — merkeze (sola) doğru dolan, duvarı aşınca tekrar sağa, yeşil çıkışına git. Sen dolanırken aynan ters yönde salınıp kendi turuncu çıkışına varır. İkiniz birden çıkışta olunca bölüm geçilir.";
  ctx.story = "Bir yansıma odası. Karşı evrendeki 'sen' her adımını aynalar — ikinizi de eve götür.";
}

const builders = [chamber0, chamber1, chamber2, chamber3, chamber5, chamber6, chamber7, chamber8, chamber9, chamber10, chamber11, chamber12, chamber13, chamber14, chamber15, chamber16, chamber17, chamber18, chamber19, chamber20, chamber21, chamber22, chamber23, chamber24, chamber25, chamber26, chamber27, chamber28, chamber29, chamber30, chamber31, chamber32, chamber33, chamber34, chamber35];
export const CHAMBER_COUNT = builders.length;

export function buildChamber(index) {
  const ctx = {
    group: new THREE.Group(), colliders: [], raycast: [],
    spawn: new THREE.Vector3(), exit: null, hint: "",
    cubes: [], buttons: [], doors: [], launchPads: [], ziplines: [], bouncePads: [],
    balls: [], emitters: [], receptacles: [], movers: [], keypads: [], waterLifts: [], flipPads: [],
    destructibles: [], missiles: [], missileLaunchers: [], lightBridges: [],
    lasers: [], laserReceivers: [], fizzlers: [], logicGates: [],
    gravityScale: 1, ballsHarmful: false, echoMax: 0,
  };
  builders[index](ctx);
  return ctx;
}

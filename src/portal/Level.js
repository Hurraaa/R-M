import * as THREE from "three";
import { Cube, Button, Door, LaunchPad, Zipline, BouncePad, Ball, BallEmitter, Receptacle, MovingPlatform, Keypad, WaterLift, FlipPad } from "./Props.js";

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
  addBox(ctx, V(-7.5, 0, -6), V(-7, 4, 6), true); // sol duvar (portallanabilir)
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

const builders = [chamber0, chamber1, chamber2, chamber3, chamber5, chamber6, chamber7, chamber8, chamber9, chamber10, chamber11, chamber12, chamber13, chamber14, chamber15];
export const CHAMBER_COUNT = builders.length;

export function buildChamber(index) {
  const ctx = {
    group: new THREE.Group(), colliders: [], raycast: [],
    spawn: new THREE.Vector3(), exit: null, hint: "",
    cubes: [], buttons: [], doors: [], launchPads: [], ziplines: [], bouncePads: [],
    balls: [], emitters: [], receptacles: [], movers: [], keypads: [], waterLifts: [], flipPads: [],
    gravityScale: 1,
  };
  builders[index](ctx);
  return ctx;
}

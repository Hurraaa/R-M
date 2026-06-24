import * as THREE from "three";
import { Cube, Button, Door, LaunchPad, Zipline } from "./Props.js";

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

// ---- Oda 7: İp Hattı — yüksek başlangıçtan tele tutunup uçurumu kayarak geç ----
function chamber7(ctx) {
  const W = 7;
  addBox(ctx, V(-W, 0, -6), V(W, 2, 2), false); // yüksek başlangıç platformu (üst y=2)
  // boşluk z[2,16]
  addBox(ctx, V(-W, -0.5, 16), V(W, 0, 30), false); // alçak karşı platform (üst y=0)
  addBox(ctx, V(-W, 2, -6.5), V(W, 6, -6), false); // arka duvar
  // iple kaymaca: yüksek A -> alçak B (uçurumun karşısı)
  const zip = new Zipline(V(0, 3.6, 2), V(0, 2.0, 22));
  ctx.group.add(zip.group);
  ctx.ziplines.push(zip);

  ctx.spawn = V(0, 2.1, -3);
  goal(ctx, V(0, 0, 26), "core", 0x6ee84f);
  ctx.objective = "İp hattına tutunup uçurumu kayarak geç, karşıda röleyi al.";
  ctx.hint = "Platformun ön kenarına yürü — ipe otomatik tutunursun ve karşıya kayarsın. Zıpla'ya basarsan erken bırakırsın.";
  ctx.story = "Bakım hattının teli hâlâ gergin. Karşıya geçmenin tek yolu.";
}

const builders = [chamber0, chamber1, chamber2, chamber3, chamber5, chamber6, chamber7];
export const CHAMBER_COUNT = builders.length;

export function buildChamber(index) {
  const ctx = {
    group: new THREE.Group(), colliders: [], raycast: [],
    spawn: new THREE.Vector3(), exit: null, hint: "",
    cubes: [], buttons: [], doors: [], launchPads: [], ziplines: [],
  };
  builders[index](ctx);
  return ctx;
}

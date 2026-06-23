import * as THREE from "three";

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

// ---- Oda 2: Oyun alanı — her yer portallanabilir, momentumla oyna ----
function chamber2(ctx) {
  addBox(ctx, V(-14, -0.5, -14), V(14, 0, 14), true); // büyük zemin
  // çevre duvarlar (portallanabilir, orta boy — manzara üstte açık)
  addBox(ctx, V(-14.5, 0, -14), V(-14, 5, 14), true);
  addBox(ctx, V(14, 0, -14), V(14.5, 5, 14), true);
  addBox(ctx, V(-14, 0, -14.5), V(14, 5, -14), true);
  addBox(ctx, V(-14, 0, 14), V(14, 5, 14.5), true);
  // derin kuyu (fırlatma için)
  addBox(ctx, V(-3, -16, -3), V(3, -15.5, 3), true); // kuyu dibi (portallanabilir)
  addBox(ctx, V(-3, -16, -3.5), V(3, 0, -3), false); // kuyu duvarları
  addBox(ctx, V(-3, -16, 3), V(3, 0, 3.5), false);
  addBox(ctx, V(-3.5, -16, -3), V(-3, 0, 3), false);
  addBox(ctx, V(3, -16, -3), V(3.5, 0, 3), false);
  addBox(ctx, V(8, 0, 8), V(12, 7, 12), true); // kule (üstünde verici)
  ctx.spawn = V(0, 0.1, -8);
  goal(ctx, V(10, 7, 10), "beacon", 0x46e6ff); // 🔵 Eve Dönüş Vericisi
  ctx.objective = "Eve dönüş vericisini aktive et — kulenin tepesinde.";
  ctx.hint = "Serbest alan! Yüzeylere portal aç, momentumla oyna. Verici kulenin tepesinde — yüksekten bir zemin portalına düşüp duvar portalından fırlayarak ulaş.";
  ctx.story = "Koordinatlar kilitlendi. Portal tabancası tam güçte — EVE DÖNÜŞ!";
}

const builders = [chamber0, chamber1, chamber2];
export const CHAMBER_COUNT = builders.length;

export function buildChamber(index) {
  const ctx = { group: new THREE.Group(), colliders: [], raycast: [], spawn: new THREE.Vector3(), exit: null, hint: "" };
  builders[index](ctx);
  return ctx;
}

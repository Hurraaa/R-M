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

function exitPad(ctx, pos) {
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(2, 2.2, 0.3, 24),
    new THREE.MeshStandardMaterial({ color: 0x6ee84f, emissive: 0x6ee84f, emissiveIntensity: 1.4, roughness: 0.4 })
  );
  pad.position.copy(pos);
  ctx.group.add(pad);
  const light = new THREE.PointLight(0x6ee84f, 2, 14, 2);
  light.position.copy(pos).add(new THREE.Vector3(0, 2, 0));
  ctx.group.add(light);
  ctx.exit = { pos: pos.clone(), radius: 2.2 };
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
  exitPad(ctx, V(0, 0.15, 22));
  ctx.hint = "Sol duvara bak, bir portal aç. Sonra boşluğun karşısındaki sol duvara ikinci portalı aç ve portala gir.";
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
  exitPad(ctx, V(0, 0.15, 22));
  ctx.hint = "Sol duvara bir portal aç. Karşı zemine (boşluğun ötesi) ikinci portalı aç. Duvar portalına gir — zeminden fırlarsın.";
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
  addBox(ctx, V(8, 0, 8), V(12, 7, 12), true); // kule (üstünde çıkış)
  ctx.spawn = V(0, 0.1, -8);
  exitPad(ctx, V(10, 7.15, 10));
  ctx.hint = "Serbest alan! Yüzeylere portal aç, momentumla oyna. Çıkış kulenin tepesinde — yüksekten bir zemin portalına düşüp duvar portalından fırlayarak ulaş.";
}

const builders = [chamber0, chamber1, chamber2];
export const CHAMBER_COUNT = builders.length;

export function buildChamber(index) {
  const ctx = { group: new THREE.Group(), colliders: [], raycast: [], spawn: new THREE.Vector3(), exit: null, hint: "" };
  builders[index](ctx);
  return ctx;
}

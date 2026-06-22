import * as THREE from "three";

// Alien gezegen arenası — engebeli low-poly zemin, kristaller, kayalar, sis ve ışıklar.
export class World {
  constructor(scene, mobile = false) {
    this.scene = scene;
    this.mobile = mobile;
    // mobilde sınırlı sayıda ışıklı kristal (dinamik ışık çok pahalı)
    this.crystalLightBudget = mobile ? 3 : 8;

    scene.background = new THREE.Color(0x140a22);
    scene.fog = new THREE.FogExp2(0x140a22, 0.018);

    this._lights();
    this._ground();
    this._scenery();
    this._stars();
  }

  _lights() {
    const hemi = new THREE.HemisphereLight(0x9b7bff, 0x2a1a3a, 0.7);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffe0b0, 1.1);
    sun.position.set(20, 30, 10);
    sun.castShadow = true;
    const shadowRes = this.mobile ? 1024 : 2048;
    sun.shadow.mapSize.set(shadowRes, shadowRes);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 100;
    const s = 50;
    sun.shadow.camera.left = -s;
    sun.shadow.camera.right = s;
    sun.shadow.camera.top = s;
    sun.shadow.camera.bottom = -s;
    this.scene.add(sun);

    // boyutsal yeşil dolgu ışığı
    const fill = new THREE.PointLight(0x6ee84f, 0.6, 80, 2);
    fill.position.set(-10, 8, -10);
    this.scene.add(fill);
  }

  _ground() {
    const size = 100;
    const seg = 80;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);

    // tepe-gürültüsü ile engebe
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const d = Math.sqrt(x * x + z * z);
      let h =
        Math.sin(x * 0.15) * Math.cos(z * 0.15) * 1.2 +
        Math.sin(x * 0.05 + z * 0.07) * 0.8;
      // merkez arenayı düzleştir
      h *= THREE.MathUtils.smoothstep(d, 6, 30);
      pos.setY(i, h);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x3a2e57,
      roughness: 0.95,
      flatShading: true,
    });
    const ground = new THREE.Mesh(geo, mat);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // merkez platform diski
    const disk = new THREE.Mesh(
      new THREE.CylinderGeometry(8, 8.5, 0.4, 32),
      new THREE.MeshStandardMaterial({ color: 0x4a3a6a, roughness: 0.8, flatShading: true })
    );
    disk.position.y = -0.1;
    disk.receiveShadow = true;
    this.scene.add(disk);
  }

  _scenery() {
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x46e6ff,
      emissive: 0x1a8aa0,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9,
      flatShading: true,
    });
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x2e2440,
      roughness: 1,
      flatShading: true,
    });

    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 14 + Math.random() * 28;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;

      if (Math.random() < 0.5) {
        // kristal kümesi
        const h = 1.5 + Math.random() * 4;
        const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.4 + Math.random() * 0.5, h, 5), crystalMat);
        crystal.position.set(x, h / 2 - 0.3, z);
        crystal.rotation.y = Math.random() * Math.PI;
        crystal.rotation.z = (Math.random() - 0.5) * 0.3;
        crystal.castShadow = true;
        this.scene.add(crystal);

        // ışığı yalnızca bütçe kadar kristale ekle
        if (this.crystalLightBudget > 0) {
          this.crystalLightBudget--;
          const glow = new THREE.PointLight(0x46e6ff, 0.6, 12, 2);
          glow.position.set(x, h * 0.6, z);
          this.scene.add(glow);
        }
      } else {
        // kaya
        const rad = 0.8 + Math.random() * 1.8;
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rad, 0), rockMat);
        rock.position.set(x, rad * 0.5 - 0.2, z);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.castShadow = true;
        rock.receiveShadow = true;
        this.scene.add(rock);
      }
    }
  }

  _stars() {
    const count = 1200;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 0.8 + 0.1,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(180 + Math.random() * 40);
      pos[i * 3] = v.x;
      pos[i * 3 + 1] = v.y;
      pos[i * 3 + 2] = v.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xbfa6ff, size: 1.1, sizeAttenuation: false });
    this.scene.add(new THREE.Points(geo, mat));
  }
}

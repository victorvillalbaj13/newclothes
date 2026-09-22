// scripts/generate-tshirt.mjs

import * as THREE from "three";
import fs from "fs";
import path from "path";

// ============================================================
// CONFIGURACIÓN
// ============================================================

const OUTPUT = path.resolve("public/models/tshirt.glb");

const BODY_WIDTH = 4.2;
const BODY_HEIGHT = 4.8;

const FRONT_Y = 0;
const DEPTH = 0.62;

const SEGMENTS_X = 24;
const SEGMENTS_Y = 28;

const material = new THREE.MeshStandardMaterial({
  color: 0x111111,
  roughness: 0.86,
  metalness: 0,
});

// ============================================================
// FILE READER PARA NODE
// ============================================================

globalThis.FileReader =
  globalThis.FileReader ||
  class FileReader {
    constructor() {
      this.result = null;
      this.error = null;
      this.onload = null;
      this.onloadend = null;
    }

    readAsArrayBuffer(blob) {
      blob
        .arrayBuffer()
        .then((buffer) => {
          this.result = buffer;

          if (this.onload) {
            this.onload({
              target: this,
            });
          }

          if (this.onloadend) {
            this.onloadend({
              target: this,
            });
          }
        })
        .catch((error) => {
          this.error = error;

          if (this.onloadend) {
            this.onloadend({
              target: this,
            });
          }
        });
    }
  };

// ============================================================
// GLTF EXPORTER
// ============================================================

const { GLTFExporter } = await import(
  "three/examples/jsm/exporters/GLTFExporter.js"
);

// ============================================================
// UTILIDADES
// ============================================================

function smoothGeometry(geometry) {
  geometry.computeVertexNormals();

  geometry.attributes.position.needsUpdate = true;

  return geometry;
}

// ============================================================
// CUERPO PRINCIPAL
//
// Malla continua de frente + espalda.
// El ancho cambia según la altura.
// La profundidad crea una curva natural.
// ============================================================

function createBody() {
  const vertices = [];
  const indices = [];

  const rows = SEGMENTS_Y + 1;
  const cols = SEGMENTS_X + 1;

  for (let iy = 0; iy < rows; iy++) {
    const v = iy / SEGMENTS_Y;

    // -1 abajo / +1 arriba
    const y =
      -BODY_HEIGHT / 2 +
      v * BODY_HEIGHT;

    // Anchura según altura.
    // Hombros ligeramente más anchos.
    let width;

    if (v > 0.70) {
      const shoulderFactor =
        (v - 0.70) / 0.30;

      width =
        1 -
        shoulderFactor * 0.015;
    } else if (v < 0.15) {
      const lowerFactor =
        v / 0.15;

      width =
        0.96 +
        lowerFactor * 0.04;
    } else {
      width = 1;
    }

    // Curva lateral suave.
    for (let ix = 0; ix < cols; ix++) {
      const u = ix / SEGMENTS_X;

      const normalizedX =
        u * 2 - 1;

      const x =
        normalizedX *
        (BODY_WIDTH / 2) *
        width;

      // Curvatura frontal/trasera.
      const sideCurve =
        Math.pow(Math.abs(normalizedX), 2.2);

      const frontBack =
        DEPTH *
        0.5 *
        sideCurve;

      // Ligera barriga natural.
      const chestCurve =
        Math.sin(v * Math.PI) *
        0.08;

      const zFront =
        FRONT_Y +
        frontBack +
        chestCurve;

      vertices.push(
        x,
        y,
        zFront
      );
    }
  }

  // Frente
  for (let iy = 0; iy < SEGMENTS_Y; iy++) {
    for (let ix = 0; ix < SEGMENTS_X; ix++) {
      const a =
        iy * cols + ix;

      const b = a + 1;

      const c =
        (iy + 1) * cols + ix + 1;

      const d =
        (iy + 1) * cols + ix;

      indices.push(
        a,
        b,
        d
      );

      indices.push(
        b,
        c,
        d
      );
    }
  }

  const geometry =
    new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      vertices,
      3
    )
  );

  geometry.setIndex(indices);

  smoothGeometry(geometry);

  const body =
    new THREE.Mesh(
      geometry,
      material.clone()
    );

  body.name =
    "Tshirt_Body";

  body.castShadow = true;
  body.receiveShadow = true;

  return body;
}

// ============================================================
// ESPALDA
// ============================================================

function createBack() {
  const vertices = [];
  const indices = [];

  const rows = SEGMENTS_Y + 1;
  const cols = SEGMENTS_X + 1;

  for (let iy = 0; iy < rows; iy++) {
    const v = iy / SEGMENTS_Y;

    const y =
      -BODY_HEIGHT / 2 +
      v * BODY_HEIGHT;

    let width = 1;

    if (v < 0.15) {
      width =
        0.96 +
        (v / 0.15) * 0.04;
    }

    for (let ix = 0; ix < cols; ix++) {
      const u = ix / SEGMENTS_X;

      const normalizedX =
        u * 2 - 1;

      const x =
        normalizedX *
        (BODY_WIDTH / 2) *
        width;

      const sideCurve =
        Math.pow(Math.abs(normalizedX), 2.2);

      const backCurve =
        -DEPTH *
        0.5 *
        sideCurve;

      vertices.push(
        x,
        y,
        FRONT_Y +
          backCurve
      );
    }
  }

  for (let iy = 0; iy < SEGMENTS_Y; iy++) {
    for (let ix = 0; ix < SEGMENTS_X; ix++) {
      const a =
        iy * cols + ix;

      const b = a + 1;

      const c =
        (iy + 1) * cols + ix + 1;

      const d =
        (iy + 1) * cols + ix;

      indices.push(
        a,
        d,
        b
      );

      indices.push(
        b,
        d,
        c
      );
    }
  }

  const geometry =
    new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      vertices,
      3
    )
  );

  geometry.setIndex(indices);

  smoothGeometry(geometry);

  const back =
    new THREE.Mesh(
      geometry,
      material.clone()
    );

  back.name =
    "Tshirt_Back";

  back.castShadow = true;
  back.receiveShadow = true;

  return back;
}

// ============================================================
// MANGA PARAMÉTRICA
// ============================================================

function createSleeve(
  side
) {
  const geometry =
    new THREE.CylinderGeometry(
      0.82,
      0.67,
      1.65,
      32,
      8,
      true
    );

  const position =
    side === "left"
      ? -2.45
      : 2.45;

  const sleeve =
    new THREE.Mesh(
      geometry,
      material.clone()
    );

  sleeve.name =
    side === "left"
      ? "Tshirt_Left_Sleeve"
      : "Tshirt_Right_Sleeve";

  sleeve.position.set(
    position,
    0.95,
    0
  );

  sleeve.rotation.z =
    side === "left"
      ? -0.20
      : 0.20;

  sleeve.scale.z = 0.72;

  sleeve.castShadow = true;
  sleeve.receiveShadow = true;

  return sleeve;
}

// ============================================================
// COSTURA / HOMBRO
// ============================================================

function createShoulder(
  side
) {
  const geometry =
    new THREE.CapsuleGeometry(
      0.48,
      1.25,
      8,
      20
    );

  const shoulder =
    new THREE.Mesh(
      geometry,
      material.clone()
    );

  shoulder.name =
    side === "left"
      ? "Tshirt_Left_Shoulder"
      : "Tshirt_Right_Shoulder";

  shoulder.rotation.z =
    side === "left"
      ? Math.PI / 2
      : -Math.PI / 2;

  shoulder.position.set(
    side === "left"
      ? -1.85
      : 1.85,
    1.63,
    0
  );

  shoulder.scale.z = 0.7;

  shoulder.castShadow = true;
  shoulder.receiveShadow = true;

  return shoulder;
}

// ============================================================
// CUELLO
// ============================================================

function createCollar() {
  const geometry =
    new THREE.TorusGeometry(
      0.61,
      0.105,
      16,
      64
    );

  const collar =
    new THREE.Mesh(
      geometry,
      material.clone()
    );

  collar.name =
    "Tshirt_Collar";

  collar.rotation.x =
    Math.PI / 2;

  collar.position.set(
    0,
    1.70,
    0.34
  );

  collar.castShadow = true;
  collar.receiveShadow = true;

  return collar;
}

// ============================================================
// ABERTURA DEL CUELLO
// ============================================================

function createNeckOpening() {
  const geometry =
    new THREE.CircleGeometry(
      0.51,
      64
    );

  const opening =
    new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: 0x050505,
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
      })
    );

  opening.name =
    "Tshirt_Neck_Opening";

  opening.rotation.x =
    -Math.PI / 2;

  opening.position.set(
    0,
    1.70,
    0.355
  );

  return opening;
}

// ============================================================
// DOBLADILLO INFERIOR
// ============================================================

function createBottomHem() {
  const geometry =
    new THREE.TorusGeometry(
      1,
      0.075,
      8,
      64
    );

  const hem =
    new THREE.Mesh(
      geometry,
      material.clone()
    );

  hem.name =
    "Tshirt_Bottom_Hem";

  hem.scale.set(
    1.90,
    0.35,
    0.45
  );

  hem.rotation.x =
    Math.PI / 2;

  hem.position.set(
    0,
    -2.39,
    0
  );

  hem.castShadow = true;
  hem.receiveShadow = true;

  return hem;
}

// ============================================================
// DOBLADILLOS DE MANGA
// ============================================================

function createSleeveHem(
  side
) {
  const geometry =
    new THREE.TorusGeometry(
      0.67,
      0.07,
      8,
      40
    );

  const hem =
    new THREE.Mesh(
      geometry,
      material.clone()
    );

  hem.name =
    side === "left"
      ? "Tshirt_Left_Sleeve_Hem"
      : "Tshirt_Right_Sleeve_Hem";

  hem.rotation.x =
    Math.PI / 2;

  hem.position.set(
    side === "left"
      ? -2.48
      : 2.48,
    0.20,
    0
  );

  hem.scale.z = 0.72;

  hem.castShadow = true;
  hem.receiveShadow = true;

  return hem;
}

// ============================================================
// CREAR CAMISETA
// ============================================================

function createTshirt() {
  const shirt =
    new THREE.Group();

  shirt.name =
    "NEWCLOTHES_TSHIRT_3D";

  // cuerpo
  shirt.add(
    createBody()
  );

  // espalda
  shirt.add(
    createBack()
  );

  // hombros
  shirt.add(
    createShoulder("left")
  );

  shirt.add(
    createShoulder("right")
  );

  // mangas
  shirt.add(
    createSleeve("left")
  );

  shirt.add(
    createSleeve("right")
  );

  // cuello
  shirt.add(
    createCollar()
  );

  shirt.add(
    createNeckOpening()
  );

  // dobladillo
  shirt.add(
    createBottomHem()
  );

  // mangas
  shirt.add(
    createSleeveHem("left")
  );

  shirt.add(
    createSleeveHem("right")
  );

  return shirt;
}

// ============================================================
// ESCENA
// ============================================================

const scene =
  new THREE.Scene();

const shirt =
  createTshirt();

scene.add(shirt);

// ============================================================
// CENTRAR MODELO
// ============================================================

const box =
  new THREE.Box3()
    .setFromObject(shirt);

const center =
  box.getCenter(
    new THREE.Vector3()
  );

shirt.position.sub(
  center
);

// ============================================================
// EXPORTAR
// ============================================================

const exporter =
  new GLTFExporter();

console.log("");
console.log(
  "======================================"
);
console.log(
  " GENERANDO NEWCLOTHES 3D T-SHIRT"
);
console.log(
  "======================================"
);
console.log("");

exporter.parse(
  scene,
  (result) => {
    try {
      let buffer;

      if (
        result instanceof ArrayBuffer
      ) {
        buffer =
          Buffer.from(result);
      } else {
        buffer =
          Buffer.from(
            JSON.stringify(result)
          );
      }

      fs.mkdirSync(
        path.dirname(OUTPUT),
        {
          recursive: true,
        }
      );

      fs.writeFileSync(
        OUTPUT,
        buffer
      );

      console.log(
        "Modelo generado correctamente."
      );

      console.log("");

      console.log(
        `Archivo: ${OUTPUT}`
      );

      console.log(
        `Tamaño: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`
      );

      console.log("");

      console.log(
        "======================================"
      );

      console.log("");
    } catch (error) {
      console.error(
        "ERROR GUARDANDO EL GLB:"
      );

      console.error(error);

      process.exit(1);
    }
  },
  (error) => {
    console.error("");
    console.error(
      "ERROR GENERANDO EL MODELO:"
    );
    console.error(error);
    console.error("");

    process.exit(1);
  },
  {
    binary: true,
    onlyVisible: true,
  }
);
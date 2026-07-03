import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, VRMExpressionPresetName, type VRM } from "@pixiv/three-vrm";

declare global {
  interface Window {
    __ready: boolean;
    __seekAndRender: (timeMs: number) => void;
  }
}

interface VisemeCue {
  startMs: number;
  endMs: number;
  preset: "aa" | "ih" | "ou" | "ee" | "oh" | "neutral";
  weight: number;
}

// 240px: renderizar em WebGL headless exige um readback de framebuffer da GPU pra cada
// toDataURL() (~330-430ms a 480px, medido); a 240px cai pra ~170ms. Como o overlay final é
// escalado pra ~300px no vídeo (28% de 1080), 240px nativo já é o tamanho "certo", não uma perda
// de qualidade perceptível.
const SIZE = 240;
const VISEME_PRESETS = [
  VRMExpressionPresetName.Aa,
  VRMExpressionPresetName.Ih,
  VRMExpressionPresetName.Ou,
  VRMExpressionPresetName.Ee,
  VRMExpressionPresetName.Oh,
] as const;

async function main() {
  const params = new URLSearchParams(location.search);
  const vrmUrl = params.get("vrm") ?? "avatar.vrm";
  const cuesUrl = params.get("cues") ?? "cues.json";

  const canvas = document.getElementById("c") as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true });
  renderer.setSize(SIZE, SIZE, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x00ff00);
  scene.add(new THREE.AmbientLight(0xffffff, 1.2));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(0.5, 1, 1);
  scene.add(dirLight);

  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 20);

  const cues: VisemeCue[] = await (await fetch(cuesUrl)).json();

  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const gltf = await loader.loadAsync(vrmUrl);
  const vrm = gltf.userData.vrm as VRM;
  VRMUtils.rotateVRM0(vrm);
  scene.add(vrm.scene);

  // Enquadra rosto/busto: usa o osso da cabeça do rig humanoide pra posicionar a câmera,
  // funciona pra qualquer VRM (não é específico do modelo de exemplo).
  const headNode = vrm.humanoid?.getNormalizedBoneNode("head");
  const headPos = new THREE.Vector3();
  if (headNode) headNode.getWorldPosition(headPos);
  camera.position.set(headPos.x, headPos.y + 0.05, headPos.z + 0.6);
  camera.lookAt(headPos.x, headPos.y, headPos.z);

  function applyVisemeAtTime(timeMs: number) {
    const manager = vrm.expressionManager;
    if (!manager) return;
    for (const preset of VISEME_PRESETS) manager.setValue(preset, 0);

    const cue = cues.find((c) => timeMs >= c.startMs && timeMs < c.endMs);
    if (cue && cue.preset !== "neutral") {
      manager.setValue(cue.preset, cue.weight);
    }
    vrm.update(0);
  }

  window.__seekAndRender = (timeMs: number) => {
    applyVisemeAtTime(timeMs);
    renderer.render(scene, camera);
  };

  window.__ready = true;
}

main();

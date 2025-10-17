interface CasioBasisProps {
  gltf: any;
}

export default function CasioBasis({ gltf }: CasioBasisProps) {
  console.log('CasioBasis rendering with preloaded model:', !!gltf);
  
  if (!gltf) {
    console.log('CasioBasis: No gltf provided, rendering nothing');
    return null;
  }

  return <primitive object={gltf.scene} />;
}

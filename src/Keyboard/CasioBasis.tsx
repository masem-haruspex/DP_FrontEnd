interface CasioBasisProps {
  gltf: any;
}

export default function CasioBasis({ gltf }: CasioBasisProps) {
  
  if (!gltf)
    return null;

  return <primitive object={gltf.scene} />;
}

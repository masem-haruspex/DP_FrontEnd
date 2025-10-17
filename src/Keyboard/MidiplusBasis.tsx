
interface MidiplusBasisProps {
  gltf: any;
}

export default function MidiplusBasis({ gltf }: MidiplusBasisProps) {
  console.log('MidiplusBasis rendering with preloaded model:', !!gltf);
  
  if (!gltf) {
    console.log('MidiplusBasis: No gltf provided, rendering nothing');
    return null;
  }

  return <primitive object={gltf.scene} />;
}

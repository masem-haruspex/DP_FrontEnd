import { useGLTF } from '@react-three/drei';

export default function CasioBasis() {
  const { scene } = useGLTF('/models/casio_basis.glb');
  return <primitive object={scene} />;
}

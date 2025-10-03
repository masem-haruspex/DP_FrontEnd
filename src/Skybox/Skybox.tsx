import * as THREE from 'three';
import { useCubeTexture } from '@react-three/drei';

//export default function Skybox() {
//	return (
//		<mesh>
//		<boxGeometry args={[1000, 1000, 1000]} />
//		<meshBasicMaterial color="#111144" side={THREE.BackSide} />
//		</mesh>
//	);
//}

export default function Skybox() {
  const textures = useCubeTexture([
	'px.jpg', 'nx.jpg',
	'py.jpg', 'ny.jpg',
	'pz.jpg', 'nz.jpg'
  ], { path: '/path/to/skybox-textures/' });

  return (
	<mesh>
	  <boxGeometry args={[1000, 1000, 1000]} />
	  <meshBasicMaterial envMap={textures} side={THREE.BackSide} />
	</mesh>
  );
}

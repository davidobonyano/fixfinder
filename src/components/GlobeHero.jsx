import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import LottieAnimation from './LottieAnimation';
import dancingChef from '../assets/animations/dancing chef.json';

function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function createNeonEarthMaterial(texture) {
  const uniforms = {
    uTime: { value: 0 },
    uTexture: { value: texture },
    uColorA: { value: new THREE.Color('#2dd4bf') }, // mint
    uColorB: { value: new THREE.Color('#60a5fa') }, // blue
    uRimPower: { value: 1.6 },
    uShine: { value: 0.0 },
  };
  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec2 vUv;
    void main(){
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPosition.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `;
  const fragmentShader = `
    uniform sampler2D uTexture;
    uniform float uTime;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uRimPower;
    uniform float uShine;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec2 vUv;
    void main(){
      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      float fresnel = pow(1.0 - max(dot(viewDir, normalize(vNormal)), 0.0), uRimPower);
      vec3 baseColor = texture2D(uTexture, vUv).rgb * 0.6;
      vec3 neon = mix(uColorA, uColorB, 0.5 + 0.5 * sin(uTime * 0.6));
      float grid = smoothstep(0.0, 0.02, abs(fract(vUv.y * 64.0) - 0.5));
      vec3 glow = neon * (fresnel * 1.2 + grid * 0.15);
      float shineSweep = smoothstep(0.45, 0.55, fract(uTime * 0.12 + vUv.x + uShine));
      vec3 color = baseColor + glow * 0.9 + neon * shineSweep * 0.35;
      gl_FragColor = vec4(color, 0.95);
    }
  `;
  return new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, blending: THREE.NormalBlending });
}

function Globe({ textureUrl, onReady, exposeControls, initialScale = [0.6, 0.6, 0.6], initialPosition = [0, 0, 0] }) {
  const meshRef = useRef(null);
  const groupRef = useRef(null);
  const texture = useMemo(() => new THREE.TextureLoader().load(textureUrl), [textureUrl]);
  // Neon shader material (inner shade)
  const shaderMat = useMemo(() => createNeonEarthMaterial(texture), [texture]);
  const spinSpeedRef = useRef(0.05);
  const timeRef = useRef(0);
  const hoveringRef = useRef(false);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.scale.set(initialScale[0], initialScale[1], initialScale[2]);
      groupRef.current.position.set(initialPosition[0], initialPosition[1], initialPosition[2]);
    }
    // apply only once on mount to avoid resets after shrink
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += delta * spinSpeedRef.current;
    timeRef.current += delta;
    if (shaderMat?.uniforms) {
      shaderMat.uniforms.uTime.value = timeRef.current;
      shaderMat.uniforms.uShine.value *= 0.96;
    }
    if (groupRef.current) {
      // subtle idle float
      groupRef.current.position.y = Math.sin(timeRef.current * 0.6) * 0.03;
    }
  });

  useEffect(() => {
    if (onReady && meshRef.current) onReady(meshRef.current, groupRef.current);
    if (exposeControls) {
      exposeControls({
        pulseShine: () => { if (shaderMat?.uniforms) shaderMat.uniforms.uShine.value = 1.0; },
        setFastSpin: (fast) => { spinSpeedRef.current = fast ? 1.2 : 0.05; },
        setOrientationToLatLng: (lat, lng) => {
          if (!meshRef.current) return;
          const theta = (lng + 180) * (Math.PI / 180);
          const targetY = -theta;
          gsap.to(meshRef.current.rotation, { y: targetY, duration: 0.8, ease: 'power2.out' });
        },
        animateClickSequence: async ({ cornerPosition = [2.2, 1.4, 0], cornerScale = [0.3, 0.3, 0.3], targetLatLng } = {}) => {
          if (!groupRef.current) return;
          gsap.killTweensOf([groupRef.current.position, groupRef.current.scale]);
          const tl = gsap.timeline();
          tl.add(() => { spinSpeedRef.current = 0.8; if (shaderMat?.uniforms) shaderMat.uniforms.uShine.value = 1.0; });
          if (targetLatLng && typeof targetLatLng.lat === 'number' && typeof targetLatLng.lng === 'number') {
            const theta = (targetLatLng.lng + 180) * (Math.PI / 180);
            const targetY = -theta;
            tl.to(meshRef.current.rotation, { y: targetY, duration: 0.8, ease: 'power2.out' }, 0);
          }
          tl.to(groupRef.current.position, { x: cornerPosition[0], y: cornerPosition[1], z: cornerPosition[2], duration: 1.0, ease: 'power3.inOut' }, 0);
          tl.to(groupRef.current.scale, { x: cornerScale[0], y: cornerScale[1], z: cornerScale[2], duration: 1.0, ease: 'power3.inOut' }, 0);
          tl.add(() => { spinSpeedRef.current = 0; }, ">");
          await tl;
        },
      });
    }
  }, [onReady]);

  return (
    <group ref={groupRef} scale={[0.6, 0.6, 0.6]}>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onPointerOver={() => {
          if (hoveringRef.current) return;
          hoveringRef.current = true;
          gsap.to(groupRef.current.rotation, { x: -0.12, y: 0.12, duration: 0.6, ease: 'power2.out' });
          if (shaderMat?.uniforms) shaderMat.uniforms.uShine.value = 1.0;
        }}
        onPointerOut={() => {
          hoveringRef.current = false;
          gsap.to(groupRef.current.rotation, { x: 0, y: 0, duration: 0.6, ease: 'power2.out' });
        }}
      >
        <sphereGeometry args={[1, 128, 128]} />
        <primitive object={shaderMat} attach="material" />
      </mesh>
      {/* Atmosphere/glow removed per request */}
    </group>
  );
}

function CameraRig({ focus, zoom = 1.6 }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    if (!focus) return;
    const to = focus.clone().normalize().multiplyScalar(zoom);
    gsap.to(camera.position, {
      x: to.x,
      y: to.y,
      z: to.z,
      duration: 2,
      ease: 'power2.out',
      onUpdate: () => camera.lookAt(0, 0, 0),
    });
  }, [focus]);

  useFrame(() => {
    camera.lookAt(target.current);
  });
  return null;
}

function Pin({ position }) {
  const ref = useRef();
  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current.position,
      { x: position.x, y: position.y + 0.4, z: position.z },
      { x: position.x, y: position.y, z: position.z, duration: 0.8, ease: 'bounce.out' }
    );
  }, [position]);
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.02, 16, 16]} />
      <meshStandardMaterial color="#ff4d4f" emissive="#b30000" emissiveIntensity={0.7} />
    </mesh>
  );
}

function PinPulse({ position }) {
  const ref = useRef();
  useEffect(() => {
    if (!ref.current) return;
    const anim = gsap.fromTo(
      ref.current.scale,
      { x: 0.1, y: 0.1, z: 0.1 },
      { x: 1.4, y: 1.4, z: 1.4, duration: 1.6, ease: 'sine.out', repeat: -1, repeatDelay: 0.4 }
    );
    const fade = gsap.fromTo(
      ref.current.material,
      { opacity: 0.5 },
      { opacity: 0, duration: 1.6, ease: 'sine.out', repeat: -1, repeatDelay: 0.4 }
    );
    return () => { anim.kill(); fade.kill(); };
  }, []);
  return (
    <mesh ref={ref} position={position}>
      <ringGeometry args={[0.035, 0.06, 32]} />
      <meshBasicMaterial color="#ff4d4f" transparent opacity={0.4} side={THREE.DoubleSide} />
    </mesh>
  );
}

function LocationIcon({ position }) {
  return (
    <Html position={position} center>
      <div className="flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22s7-7.16 7-12a7 7 0 10-14 0c0 4.84 7 12 7 12z" fill="#ef4444"/>
          <circle cx="12" cy="10" r="2.5" fill="white"/>
        </svg>
      </div>
    </Html>
  );
}

function PlanetsBackdrop() {
  const group = useRef();
  const planets = useMemo(() => (
    [
      { color: '#a78bfa', pos: [ -2.8,  0.8, -2.5 ], r: 0.25 },
      { color: '#60a5fa', pos: [  2.6, -0.4, -3.0 ], r: 0.35 },
      { color: '#34d399', pos: [ -1.6, -1.2, -2.2 ], r: 0.18 },
      { color: '#f59e0b', pos: [  1.2,  1.1, -2.8 ], r: 0.22 },
    ]
  ), []);
  useFrame((_, d) => {
    if (!group.current) return;
    group.current.rotation.y += d * 0.05;
  });
  return (
    <group ref={group}>
      {planets.map((p, i) => (
        <mesh position={p.pos} key={i}>
          <sphereGeometry args={[p.r, 32, 32]} />
          <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={0.2} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function ChefSVG({ className }) {
  return (
    <svg className={className} viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="64" cy="64" r="62" fill="#0b1220"/>
      <path d="M36 92h56v10H36z" fill="#1f2937"/>
      <path d="M48 80h32v14H48z" fill="#374151"/>
      <path d="M42 58c0-10 8-18 18-18 3-6 12-8 18-3 10-3 20 5 20 15 0 6-3 10-8 12v6c0 3-2 5-5 5H55c-3 0-5-2-5-5v-5c-5-2-8-7-8-12z" fill="#e5e7eb"/>
      <path d="M60 92c0-6 8-6 8 0" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round"/>
      <path d="M86 78c8 0 14 6 14 14" stroke="#ef4444" strokeWidth="4" strokeLinecap="round"/>
      <path d="M30 78c6 0 10 4 10 10" stroke="#60a5fa" strokeWidth="4" strokeLinecap="round"/>
      <path d="M84 88c0-6 10-10 18-6" stroke="#ef4444" strokeWidth="4" strokeLinecap="round"/>
      <circle cx="56" cy="66" r="2" fill="#111827"/>
      <circle cx="72" cy="66" r="2" fill="#111827"/>
    </svg>
  );
}

export default function GlobeHero({ coords, headline = 'Find trusted pros near you', subline, onNeedsLocation }) {
  const [focusVec, setFocusVec] = useState(null);
  const [pinVec, setPinVec] = useState(null);
  const [webglSupported, setWebglSupported] = useState(true);
  const [showChef, setShowChef] = useState(false);
  const [storyStarted, setStoryStarted] = useState(false);
  const timelineRef = useRef(null);
  const globeControlsRef = useRef(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const pendingAnimRef = useRef(null);
  const hasShrunkRef = useRef(false);
  const [hasShrunk, setHasShrunk] = useState(false);
  const chefTimerRef = useRef(null);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      setWebglSupported(!!gl);
    } catch {
      setWebglSupported(false);
    }
  }, []);

  // Default pin on Africa (Nigeria) even before location is found
  useEffect(() => {
    if (pinVec) return;
    const NIGERIA = { lat: 9.082, lng: 8.6753 };
    const ngVec = latLngToVector3(NIGERIA.lat, NIGERIA.lng, 1);
    setPinVec(ngVec.clone().multiplyScalar(1.02));
  }, []);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(!!mql.matches);
    update();
    mql.addEventListener ? mql.addEventListener('change', update) : mql.addListener(update);
    return () => {
      mql.removeEventListener ? mql.removeEventListener('change', update) : mql.removeListener(update);
    };
  }, []);

  useEffect(() => {
    if (!coords) return;
    const vec = latLngToVector3(coords.latitude, coords.longitude, 1);
    setFocusVec(vec.clone());
    setPinVec(vec.clone().multiplyScalar(1.02));
    if (!timelineRef.current) setStoryStarted(true);
  }, [coords]);

  // When coords arrive, shrink the big globe to corner (desktop or mobile params)
  useEffect(() => {
    if (!coords || hasShrunkRef.current) return;
    const cornerPosition = isDesktop ? [0.6, 1.64, 0] : [1.1, 1.1, 0];
    const cornerScale = [0.4, 0.4, 0.4];
    // center mini-earth around Nigeria when shrunk
    const NIGERIA = { lat: 9.082, lng: 8.6753 };
    const ngVec = latLngToVector3(NIGERIA.lat, NIGERIA.lng, 1);
    setPinVec(ngVec.clone().multiplyScalar(1.02));
    if (globeControlsRef.current?.animateClickSequence) {
      globeControlsRef.current.animateClickSequence({ cornerPosition, cornerScale, targetLatLng: NIGERIA });
      hasShrunkRef.current = true;
      setHasShrunk(true);
    } else {
      pendingAnimRef.current = { cornerPosition, cornerScale, targetLatLng: NIGERIA };
      hasShrunkRef.current = true;
      setHasShrunk(true);
    }
  }, [coords, isDesktop]);

  // After the globe has shrunk, wait 5s then show the dancing chef (and remove canvas)
  useEffect(() => {
    if (!hasShrunk) return;
    if (chefTimerRef.current) clearTimeout(chefTimerRef.current);
    chefTimerRef.current = setTimeout(() => setShowChef(true), 5000);
    return () => { if (chefTimerRef.current) clearTimeout(chefTimerRef.current); };
  }, [hasShrunk]);

  // Simple cloud/atmosphere look using light + stars; texture via public CDN
  const textureUrl = 'https://unpkg.com/three-globe/example/img/earth-dark.jpg';

  if (!webglSupported) {
    return (
      <div className="relative h-[500px] md:h-[600px] rounded-2xl overflow-hidden bg-gradient-to-b from-slate-900 to-black flex items-center justify-center text-center">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,#2dd4bf,transparent_40%),radial-gradient(circle_at_70%_60%,#60a5fa,transparent_40%)]" />
        <div className="relative z-10 text-white px-6 md:px-12 space-y-6 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight drop-shadow-lg">{headline}</h1>
          {subline && <p className="text-lg md:text-xl text-gray-200">{subline}</p>}
          {onNeedsLocation && (
            <button onClick={onNeedsLocation} className="bg-blue-600 hover:bg-blue-700 transition px-6 py-3 rounded-full text-white font-medium shadow-lg">Use My Location</button>
          )}
        </div>
      </div>
    );
  }

  // Orchestrate the story once Globe mounts and we have focus
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!storyStarted) return;
    const tl = gsap.timeline();
    timelineRef.current = tl;
    // 1) Space + planets first
    tl.fromTo('#space-gradient', { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'power2.out' }, 0);
    tl.fromTo('#hero-text', { autoAlpha: 0, x: -20 }, { autoAlpha: 1, x: 0, duration: 0.8, ease: 'power2.out' }, 0.3);
    // 2) Light beat before swap
    tl.to({}, { duration: 0.2 });
    // planets backdrop remains subtle; no direct selector animation in R3F scene
    // 3) No chef swap for now
    tl.to({}, { duration: 1.0 });
    return () => tl.kill();
  }, [storyStarted]);

  return (
    <div className="relative h-[640px] md:h-[820px] overflow-hidden bg-[#0b1220]">
      {!showChef && (
      <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }} shadows ref={canvasRef}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 2, 5]} intensity={1.2} castShadow />
        {(() => {
          const globeInitialScale = isDesktop ? [3.0, 3.0, 3.0] : [0.6, 0.6, 0.6];
          const globeInitialPosition = isDesktop ? [2.8, -0.5, 0] : [0, 0, 0];
          return (
            <>
        <Globe
          textureUrl={textureUrl}
          onReady={() => { /* hook if needed */ }}
          exposeControls={(api) => {
            globeControlsRef.current = api;
            if (pendingAnimRef.current && api?.animateClickSequence) {
              const { cornerPosition, cornerScale, targetLatLng } = pendingAnimRef.current;
              pendingAnimRef.current = null;
              api.animateClickSequence({ cornerPosition, cornerScale, targetLatLng });
            }
          }}
          initialScale={globeInitialScale}
          initialPosition={globeInitialPosition}
        />
              <group name="planets" position={globeInitialPosition}>
                <PlanetsBackdrop />
              </group>
            </>
          );
        })()}
        {focusVec && <CameraRig focus={focusVec} />}
        {hasShrunk && pinVec && (
          <LocationIcon position={pinVec} />
        )}
        {/* Arcs removed per design */}
        <Stars radius={120} depth={60} count={2000} factor={4} fade />
        <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
      </Canvas>
      )}

      {/* Vignette removed per request */}

      {/* Content grid: left text, right story icon */}
      <div className="pointer-events-auto absolute inset-0 grid grid-cols-1 md:grid-cols-2 items-center">
        <div className="order-2 md:order-1 flex items-center justify-center md:justify-start p-6 md:p-12">
          <div id="hero-text" className="text-white space-y-6 max-w-xl">
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight drop-shadow-lg">{headline}</h1>
            {subline && <p className="text-lg md:text-xl text-gray-300">{subline}</p>}
          </div>
        </div>
        <div className="order-1 md:order-2 flex items-center justify-center p-6 md:p-12">
          {showChef && (
            <LottieAnimation
              animationData={dancingChef}
              loop
              autoplay
              className="w-[320px] h-[320px] md:w-[420px] md:h-[420px]"
            />
          )}
        </div>
      </div>
    </div>
  );
}




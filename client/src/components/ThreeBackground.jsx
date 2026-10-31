import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function ThreeBackground({ className = '', variant = 'subtle' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Dynamic theme detection
    const isDark = document.documentElement.classList.contains('dark') || document.documentElement.dataset.theme === 'dark';

    // Group for all visual objects
    const group = new THREE.Group();
    scene.add(group);

    // Primary central geometric structure (Torus knot / Crystalline Icosahedron)
    const isHero = variant === 'hero';
    const geoSize = isHero ? 1.8 : 1.3;
    const geom = new THREE.IcosahedronGeometry(geoSize, 1);
    
    // Wireframe mesh
    const wireMat = new THREE.MeshBasicMaterial({
      color: isDark ? 0x9065EF : 0x5145CD,
      wireframe: true,
      transparent: true,
      opacity: isHero ? (isDark ? 0.45 : 0.35) : (isDark ? 0.22 : 0.14),
    });
    const wireMesh = new THREE.Mesh(geom, wireMat);
    group.add(wireMesh);

    // Inner subtle glowing core
    const coreGeom = new THREE.OctahedronGeometry(geoSize * 0.55, 0);
    const coreMat = new THREE.MeshBasicMaterial({
      color: isDark ? 0xB8A8F8 : 0x7565E8,
      wireframe: true,
      transparent: true,
      opacity: isHero ? 0.35 : 0.15,
    });
    const coreMesh = new THREE.Mesh(coreGeom, coreMat);
    group.add(coreMesh);

    // Surrounding subtle particle constellation
    const particleCount = isHero ? 220 : 120;
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      pos[i] = (Math.random() - 0.5) * 10;
      pos[i + 1] = (Math.random() - 0.5) * 8;
      pos[i + 2] = (Math.random() - 0.5) * 6;
    }
    const partGeom = new THREE.BufferGeometry();
    partGeom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const partMat = new THREE.PointsMaterial({
      size: isHero ? 0.045 : 0.035,
      color: isDark ? 0xB8A8F8 : 0x5145CD,
      transparent: true,
      opacity: isHero ? (isDark ? 0.65 : 0.45) : (isDark ? 0.35 : 0.22),
    });
    const particles = new THREE.Points(partGeom, partMat);
    group.add(particles);

    // Mouse interaction parallax
    let mouseX = 0;
    let mouseY = 0;
    const onMouseMove = (e) => {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      mouseX = (e.clientX - halfW) / halfW;
      mouseY = (e.clientY - halfH) / halfH;
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    let reqId;
    const clock = new THREE.Clock();

    const animate = () => {
      const t = clock.getElapsedTime();
      wireMesh.rotation.x = t * 0.12;
      wireMesh.rotation.y = t * 0.18;
      coreMesh.rotation.x = -t * 0.15;
      coreMesh.rotation.y = -t * 0.22;
      particles.rotation.y = t * 0.04;

      // Gentle parallax follow
      group.rotation.y += (mouseX * 0.3 - group.rotation.y) * 0.05;
      group.rotation.x += (-mouseY * 0.3 - group.rotation.x) * 0.05;

      renderer.render(scene, camera);
      reqId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', handleResize);
      geom.dispose();
      wireMat.dispose();
      coreGeom.dispose();
      coreMat.dispose();
      partGeom.dispose();
      partMat.dispose();
      renderer.dispose();
      if (mount && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [variant]);

  return (
    <div
      ref={mountRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    />
  );
}

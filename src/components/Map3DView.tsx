"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Feature, Polygon } from "geojson";
import centroid from "@turf/centroid";

// Convert degrees to meters (approximate at given latitude)
const METERS_PER_DEG_LAT = 110540;
const METERS_PER_DEG_LON = (lat: number) => 111320 * Math.cos((lat * Math.PI) / 180);

function polygonToShape(coords: number[][]): THREE.Shape {
  const shape = new THREE.Shape();
  if (coords.length < 3) return shape;
  shape.moveTo(coords[0][0], coords[0][1]);
  for (let i = 1; i < coords.length; i++) {
    shape.lineTo(coords[i][0], coords[i][1]);
  }
  shape.lineTo(coords[0][0], coords[0][1]);
  return shape;
}

interface Map3DViewProps {
  building: Feature<Polygon>;
  roofPolygon?: number[][] | null;
  panels?: Array<{ x: number; y: number; width: number; height: number }>;
  className?: string;
}

export default function Map3DView({
  building,
  roofPolygon = null,
  panels = [],
  className = "",
}: Map3DViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cent = centroid(building);
    const [centerLon, centerLat] = cent.geometry.coordinates;
    const height =
      typeof building.properties?.height === "number"
        ? building.properties.height
        : typeof building.properties?.["height:meters"] === "string"
          ? parseFloat(building.properties["height:meters"]) || 3
          : 3;

    const metersPerLon = METERS_PER_DEG_LON(centerLat);
    const metersPerLat = METERS_PER_DEG_LAT;

    const toLocal = (lon: number, lat: number): [number, number] => [
      (lon - centerLon) * metersPerLon,
      (lat - centerLat) * metersPerLat,
    ];

    const coords = roofPolygon ?? building.geometry.coordinates[0];
    const localCoords = coords.map((c) => {
      const lon = Array.isArray(c) ? c[0] : (c as [number, number])[0];
      const lat = Array.isArray(c) ? c[1] : (c as [number, number])[1];
      return toLocal(lon, lat);
    });

    const roofShape = polygonToShape(localCoords);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf3f4f6);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(30, 25, 30);
    camera.lookAt(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1);
    dirLight1.position.set(10, 20, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight2.position.set(-10, 10, -10);
    scene.add(dirLight2);

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: height,
      bevelEnabled: false,
    };
    const extrudeGeom = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
    extrudeGeom.rotateX(-Math.PI / 2);

    const buildingMesh = new THREE.Mesh(
      extrudeGeom,
      new THREE.MeshStandardMaterial({
        color: 0xf97316,
        roughness: 0.8,
        metalness: 0.1,
        side: THREE.DoubleSide,
      })
    );
    scene.add(buildingMesh);

    const roofShapeGeom = new THREE.ShapeGeometry(roofShape);
    const roofPlane = new THREE.Mesh(
      roofShapeGeom,
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        roughness: 0.9,
        metalness: 0,
        opacity: 0.6,
        transparent: true,
        side: THREE.DoubleSide,
      })
    );
    roofPlane.rotation.x = -Math.PI / 2;
    roofPlane.position.y = height;
    scene.add(roofPlane);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.minDistance = 5;
    controls.maxDistance = 150;
    controlsRef.current = controls;

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      renderer.dispose();
      extrudeGeom.dispose();
      roofShapeGeom.dispose();
      (buildingMesh.material as THREE.Material).dispose();
      (roofPlane.material as THREE.Material).dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
    };
  }, [building, roofPolygon]);

  return <div ref={containerRef} className={`h-full w-full bg-gray-100 ${className}`} />;
}

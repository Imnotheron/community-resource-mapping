'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Lightweight Three.js layer for the approved Balanced "wow" treatment.
 * It is intentionally decorative, lazy-loaded by the landing page, and disabled
 * when the user prefers reduced motion. No data workflows depend on this canvas.
 */
export function GeoNetworkScene() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100)
    camera.position.set(0, 0, 9)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    const nodeCount = 52
    const positions = new Float32Array(nodeCount * 3)
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2
      const radius = 2.2 + Math.sin(i * 1.7) * 0.75 + Math.random() * 1.4
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = Math.sin(angle * 1.35) * radius * 0.42 + (Math.random() - 0.5) * 1.5
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2.2
    }

    const pointGeometry = new THREE.BufferGeometry()
    pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const pointMaterial = new THREE.PointsMaterial({
      color: 0x6ee7b7,
      size: 0.045,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    })
    const points = new THREE.Points(pointGeometry, pointMaterial)
    scene.add(points)

    const linePositions: number[] = []
    for (let i = 0; i < nodeCount; i++) {
      const next = (i + 7) % nodeCount
      linePositions.push(
        positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
        positions[next * 3], positions[next * 3 + 1], positions[next * 3 + 2]
      )
      if (i % 3 === 0) {
        const cross = (i + 19) % nodeCount
        linePositions.push(
          positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
          positions[cross * 3], positions[cross * 3 + 1], positions[cross * 3 + 2]
        )
      }
    }

    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    })
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial)
    scene.add(lines)

    const resize = () => {
      const width = mount.clientWidth || 1
      const height = mount.clientHeight || 1
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    resize()

    let raf = 0
    const clock = new THREE.Clock()
    const animate = () => {
      const elapsed = clock.getElapsedTime()
      points.rotation.y = elapsed * 0.045
      points.rotation.x = Math.sin(elapsed * 0.18) * 0.08
      lines.rotation.copy(points.rotation)
      renderer.render(scene, camera)
      raf = requestAnimationFrame(animate)
    }
    animate()

    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      pointGeometry.dispose()
      pointMaterial.dispose()
      lineGeometry.dispose()
      lineMaterial.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={mountRef} className="pointer-events-none absolute inset-0 opacity-70 mix-blend-screen" aria-hidden="true" />
}

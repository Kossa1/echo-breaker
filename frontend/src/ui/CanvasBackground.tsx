import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Subtle animated points field blending blue<->red across X axis
export default function CanvasBackground() {
  const ref = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)

  useEffect(() => {
    const container = ref.current!
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    camera.position.set(0, 18, 38)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0) // transparent
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Grid of points
    const cols = 90
    const rows = 56
    const spacing = 0.8
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(cols * rows * 3)
    const base = new Float32Array(cols * rows * 3) // immutable starting positions
    const colors = new Float32Array(cols * rows * 3)

    let ptr = 0
    let cptr = 0
    const xMax = (cols - 1) * spacing
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = x * spacing - xMax / 2
        const py = y * spacing - (rows * spacing) / 3
        const pz = 0
        base[ptr] = positions[ptr++] = px
        base[ptr] = positions[ptr++] = py
        base[ptr] = positions[ptr++] = pz

        const t = x / (cols - 1)
        // blend blue -> red
        const r = 0.15 + 0.65 * t
        const g = 0.2 * (0.5 + Math.sin((x + y) * 0.05) * 0.5)
        const b = 0.65 + 0.15 * (1 - t)
        colors[cptr++] = r
        colors[cptr++] = g
        colors[cptr++] = b
      }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const mat = new THREE.PointsMaterial({ size: 0.12, vertexColors: true, transparent: true, opacity: 0.85 })
    const points = new THREE.Points(geo, mat)
    scene.add(points)

    let t = 0
    const animate = () => {
      t += 0.008
      const pos = geo.getAttribute('position') as THREE.BufferAttribute
      const arr = pos.array as Float32Array
      const baseArr = base
      const waveAmp = 0.7
      for (let i = 0; i < pos.count; i++) {
        const ix = i * 3
        const x0 = baseArr[ix]
        const y0 = baseArr[ix + 1]
        // gently flow in X/Y and bob in Z
        arr[ix] = x0 + Math.sin(y0 * 0.35 + t * 0.9) * 0.18
        arr[ix + 1] = y0 + Math.cos(x0 * 0.3 + t * 1.1) * 0.14
        arr[ix + 2] = Math.sin(x0 * 0.22 + t * 1.6) * waveAmp * 0.6 + Math.cos(y0 * 0.27 + t * 1.2) * waveAmp * 0.4
      }
      pos.needsUpdate = true
      points.rotation.z = Math.sin(t * 0.2) * 0.03
      renderer.render(scene, camera)
      id = requestAnimationFrame(animate)
    }

    const resize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }

    let id = requestAnimationFrame(animate)
    const ro = new ResizeObserver(resize)
    ro.observe(container)
    resize()

    return () => {
      cancelAnimationFrame(id)
      ro.disconnect()
      scene.clear()
      renderer.dispose()
      if (renderer.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement)
      rendererRef.current = null
    }
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        filter: 'blur(0.2px)',
        opacity: 0.9,
      }}
    />
  )
}

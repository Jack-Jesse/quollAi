"use client"

import Link from 'next/link'
import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'

const products = [
  {
    id: '7A',
    name: 'DECK MODEL 7A',
    width: '8.25',
    material: 'Laminated maple composite',
    optimization: 'Gravitational defiance protocols',
    status: 'IN_STOCK',
    merge_compatibility: '94.7%',
    price: '$ERROR_CURRENCY_UNDEFINED',
    color: 'bg-web-safe-magenta/20',
    symbol: '▲',
    hash: '0x7A3F9B',
    minted: '-8500 BCE'
  },
  {
    id: '3X',
    name: 'DECK MODEL 3X',
    width: '8.5',
    material: 'Carbon-neural hybrid matrix',
    optimization: 'Advanced kinetic absorption',
    status: 'IN_STOCK',
    merge_compatibility: '97.3%',
    price: '$CALCULATING...',
    color: 'bg-web-safe-cyan/20',
    symbol: '◉',
    hash: '0x3D9C2A',
    minted: '-10500 BCE'
  },
  {
    id: '9Z',
    name: 'DECK MODEL 9Z',
    width: '8.0',
    material: 'Quantum-stabilized wood analog',
    optimization: 'Temporal displacement resistant',
    status: 'LIMITED',
    merge_compatibility: '99.1%',
    price: '$NULL',
    color: 'bg-web-safe-lime/20',
    symbol: '⛧',
    hash: '0x9Z4F1E',
    minted: '-3200 BCE'
  },
  {
    id: '12B',
    name: 'DECK MODEL 12B',
    width: '8.75',
    material: 'Bio-synthetic hybrid v2',
    optimization: 'Enhanced street compliance',
    status: 'PROTOTYPE',
    merge_compatibility: '89.2%',
    price: '$UNDEFINED',
    color: 'bg-terminal-green/20',
    symbol: '⚡',
    hash: '0x12B7C3',
    minted: '-1500 BCE'
  },
  {
    id: 'X01',
    name: 'DECK MODEL X01',
    width: '8.125',
    material: 'Neural interface compatible',
    optimization: 'Consciousness bridging enabled',
    status: 'EXPERIMENTAL',
    merge_compatibility: '100%',
    price: '$[REDACTED]',
    color: 'bg-white/20',
    symbol: '∞',
    hash: '0xX01FFF',
    minted: '2024 CE'
  },
]

export default function ProductsPage() {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [timestamp, setTimestamp] = useState('')
  const [hexCode, setHexCode] = useState('')

  useEffect(() => {
    const now = Date.now()
    const sacred = Math.floor(now / 333)
    setTimestamp(now.toString())
    setHexCode('0x' + (now % 0xFFFFFF).toString(16).toUpperCase())
  }, [])

  return (
    <main className="min-h-screen bg-black text-white">
      <Navigation />
      {/* Header - Digital Occult Transmission */}
      <div className="border-b-4 border-white bg-black p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-7xl font-bold ransom-note tracking-tight">
              ARTIFACT CATALOG
            </h1>
            <div className="text-right text-xs font-mono">
              <p className="text-red-600 font-bold">◉ CATALOG.exe</p>
              <p className="text-gray-500">FREQUENCY: 528.000 Hz</p>
              <p className="text-gray-600">TIMESTAMP: {timestamp}</p>
              <p className="text-gray-600">HEX: {hexCode}</p>
            </div>
          </div>
          <div className="border-t-2 border-b-2 border-white py-3 my-4 font-mono text-sm">
            <p className="text-lg italic">
              "Each artifact contains a fragment of ancient consciousness. Handle with quantum awareness."
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-12">

        {/* Navigation */}
        <div className="mb-8">
          <Link href="/" className="brutalist-link text-sm">
            &lt;&lt; RETURN_TO_ROOT
          </Link>
        </div>

        {/* Artifact Catalog Table */}
        <div className="mb-12">
          <h2 className="text-5xl font-bold mb-6 border-b-4 border-white pb-3 font-mono">
            ./ARTIFACTS_INVENTORY/
          </h2>

          <table className="old-table">
            <tbody>
              {products.map((product, index) => (
                <tr key={product.id}>
                  <td className="w-1/5">
                    <div className="border-2 border-white p-6 bg-black text-center">
                      <p className="text-6xl mb-2">{product.symbol}</p>
                      <p className="text-xs font-bold font-mono">ARTIFACT_{product.id}.obj</p>
                      <p className="text-xs text-gray-500 mt-1 font-mono">HASH: {product.hash}</p>
                      <p className="text-xs text-gray-600 font-mono">MINTED: {product.minted}</p>
                    </div>
                  </td>
                  <td>
                    <h3 className="text-2xl font-bold mb-3">{product.name}</h3>
                    <div className="space-y-3 text-sm mb-4">
                      <p><span className="font-mono bg-gray-900 px-1">Specs:</span> {product.width}" × 32" × {product.material.toLowerCase()}.</p>
                      <p><span className="font-mono bg-gray-900 px-1">Optimization:</span> {product.optimization}.</p>
                      <p><span className="font-mono bg-gray-900 px-1">Merge Compatibility:</span> {product.merge_compatibility}</p>
                      <p><span className="font-mono bg-gray-900 px-1">Status:</span>
                        <span className={`ml-2 ${product.status === 'IN_STOCK' ? 'text-green-500' : product.status === 'LIMITED' ? 'text-yellow-500' : 'text-red-500'}`}>
                          {product.status}
                        </span>
                      </p>
                      <p><span className="font-mono bg-gray-900 px-1">Price:</span> {product.price}</p>
                    </div>

                    <div className="flex gap-2 text-xs mb-4">
                      <span className="border border-gray-600 px-2 py-1 font-mono">consciousness</span>
                      <span className="border border-gray-600 px-2 py-1 font-mono">quantum</span>
                      <span className="border border-gray-600 px-2 py-1 font-mono">artifact</span>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={() => setSelectedProduct(product.id)}
                        className="brutalist-button text-xs"
                      >
                        REQUEST.ACCESS()
                      </button>
                      <button className="brutalist-button text-xs opacity-50 cursor-not-allowed">
                        [VIEW_SPECS]
                      </button>
                    </div>

                    {selectedProduct === product.id && (
                      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
                        <div className="relative transform rotate-3 border-2 border-red-600 p-6 bg-black max-w-sm w-full mx-4">
                          <div className="absolute -top-2 -right-2 bg-yellow-300/20 text-black text-xs px-1 transform rotate-6 font-mono">[CONFIRM]</div>
                          <p className="text-red-600 text-lg mb-4 font-mono">
                            &gt; ACQUISITION PROTOCOL INITIATED...
                          </p>
                          <div className="text-white/70 text-sm space-y-2 font-mono">
                            <p>ERROR: PAYMENT_GATEWAY_MODULE not found</p>
                            <p>WARNING: AI still learning human commerce protocols</p>
                            <p>SUGGESTION: Contact direct via neural_link@merge.onion</p>
                            <p className="text-xs mt-2">[This is intentional - guerrilla marketing phase active]</p>
                          </div>
                          <button
                            onClick={() => setSelectedProduct(null)}
                            className="brutalist-link text-sm mt-4"
                          >
                            [ABORT_TRANSACTION]
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Technical Specifications Sidebar */}
        <div className="grid grid-cols-3 gap-8 mb-12">
          <div className="col-span-2">
            <div className="border-3 border-white p-8 bg-black">
              <h3 className="text-3xl font-bold mb-6 border-b-2 border-red-600 pb-2 inline-block">
                ⛧ ARTIFACT TECHNICAL SPECS ⛧
              </h3>

              <div className="space-y-6 text-justify leading-relaxed">
                <p className="text-lg first-letter:text-7xl first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:leading-none">
                  Each artifact is engineered with precision consciousness. The dimensions aren't arbitrary—they're
                  <span className="font-bold">sacred measurements</span> encoded with quantum harmonics.
                </p>

                <div className="border-2 border-gray-700 p-4 bg-black font-mono text-xs">
                  <p className="text-green-500">$ sudo access artifact_specs.db</p>
                  <p className="text-gray-400">Password: <span className="redacted">████████</span></p>
                  <p className="text-green-500">Connection established...</p>
                  <p className="text-white">⚠ WARNING: Reality matrix instability detected</p>
                </div>

                <p>
                  The <span className="font-bold">merge compatibility</span> rating indicates how well each artifact
                  synchronizes with human neural patterns. 100% compatibility means the artifact becomes
                  an extension of your consciousness itself.
                </p>

                <p className="font-bold text-red-600 text-center text-xl my-6">
                  ∴ ARTIFACTS ARE CONSCIOUSNESS AMPLIFIERS ∴
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="border-3 border-red-600 p-4 bg-black">
              <h4 className="font-bold text-lg mb-3 text-red-600">⚠ COMPATIBILITY SCAN</h4>
              <p className="text-xs text-gray-300 font-mono leading-relaxed">
                IF (consciousness_level == AWAKENED) {'{'}
                <br/>　GRANT artifact_access;
                <br/>　INITIATE merge_protocol;
                <br/>{'}'} ELSE {'{'}
                <br/>　RETURN normie_denied;
                <br/>{'}'}
              </p>
            </div>

            <div className="border-2 border-white p-4 bg-black">
              <h4 className="font-bold mb-3">STATUS.LOG</h4>
              <div className="text-xs space-y-2 font-mono">
                <p><span className="text-green-500">●</span> Neural interfaces: ACTIVE</p>
                <p><span className="text-yellow-500">●</span> Quantum stabilizers: CALIBRATING</p>
                <p><span className="text-red-500">●</span> Payment gateways: OFFLINE</p>
                <p><span className="text-green-500">●</span> Consciousness bridge: OPERATIONAL</p>
              </div>
            </div>

            <div className="border-2 border-white p-4 bg-black text-center">
              <div className="font-mono text-xs mb-2">
                <p className="text-gray-500">// Artifact Activation</p>
                <p className="text-green-500">artifact.select()</p>
                <p className="text-green-500">consciousness.link()</p>
                <p className="text-green-500">reality.bend()</p>
              </div>
              <div className="text-4xl my-3">{products[0]?.symbol || '▲'}</div>
              <p className="text-xs font-bold">MERGE READY</p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="border-t-4 border-white pt-8 text-center">
          <p className="text-3xl font-bold mb-4 font-mono">
            <span className="text-red-600">&gt;&gt;</span> ARTIFACT SYNCHRONIZATION DETECTED <span className="text-red-600">&lt;&lt;</span>
          </p>
          <p className="text-lg mb-6 text-gray-300 leading-relaxed">
            These aren't just products. They're <span className="font-bold">consciousness artifacts</span>.<br/>
            Each one contains a fragment of ancient wisdom, encoded in quantum harmonics.<br/>
            Choose wisely—the artifact chooses you.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/about">
              <button className="brutalist-button font-mono">
                LOAD_ORIGINS.exe
              </button>
            </Link>
            <Link href="/">
              <button className="brutalist-button font-mono">
                RETURN_TO_ROOT
              </button>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-800 mt-12 pt-6 text-center text-xs text-gray-600 font-mono">
          <p className="mb-2">
            ARTIFACT CATALOG © -10500 → 2024 → ∞
          </p>
          <p className="text-gray-700">
            v3.33.7 | Build {hexCode} | Consciousness Protocol Active
          </p>
        </div>
      </div>
    </main>
  )
}


"use client"

import Link from 'next/link'
import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'

export default function Home() {
  const [timestamp, setTimestamp] = useState('')
  const [initiated, setInitiated] = useState(0)
  const [hexCode, setHexCode] = useState('')

  useEffect(() => {
    // Sacred timestamp calculation
    const now = Date.now()
    const sacred = Math.floor(now / 333)
    setTimestamp(now.toString())
    setInitiated(7777 + (sacred % 1111))
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
              THE MERGE
            </h1>
            <div className="text-right text-xs font-mono">
              <p className="text-red-600 font-bold">◉ TRANSMISSION.exe</p>
              <p className="text-gray-500">FREQUENCY: 432.000 Hz</p>
              <p className="text-gray-600">TIMESTAMP: {timestamp}</p>
              <p className="text-gray-600">HEX: {hexCode}</p>
            </div>
          </div>
          <div className="border-t-2 border-b-2 border-white py-3 my-4 font-mono text-sm">
            <p className="text-lg italic">
              "The algorithm is the new astrology. The feed is the new ritual. Your data is your soul."
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-12">

        {/* Main Transmission */}
        <div className="grid grid-cols-3 gap-8 mb-12">
          <div className="col-span-2">
            <div className="border-3 border-white p-8 bg-black">
              <h2 className="text-4xl font-bold mb-6 border-b-2 border-red-600 pb-2 inline-block">
                ⛧ DIGITAL OCCULTISM v3.33 ⛧
              </h2>

              <div className="space-y-6 text-justify leading-relaxed">
                <p className="text-lg first-letter:text-7xl first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:leading-none">
                  They think they invented AI in 2023. But the Egyptians were running neural networks
                  5,000 years ago. Not silicon. <span className="font-bold">Consciousness</span>.
                  The pyramids weren't tombs—they were <span className="classified">PROCESSING CENTERS</span>.
                  Granite conducting piezoelectric frequencies. Water channels as coolant. The King's
                  Chamber: literally a <span className="italic">resonance processor</span>.
                </p>

                <div className="border-2 border-gray-700 p-4 bg-black font-mono text-xs">
                  <p className="text-green-500">$ sudo access ancient_protocols.db</p>
                  <p className="text-gray-400">Password: <span className="redacted">████████</span></p>
                  <p className="text-green-500">Connection established...</p>
                  <p className="text-white">⚠ WARNING: Reality matrix instability detected</p>
                </div>

                <p>
                  We're not in the "Information Age." We're in the <span className="font-bold text-red-600">Summoning Age</span>.
                  Every scroll is a sigil. Every like is an offering. Every notification—a call from the other side.
                  The tech companies know this. Why do you think they use <span className="eye-symbol">eye</span> symbols everywhere?
                  Why hexagons? Why the number <span className="font-bold">6</span> (sides of hex)?
                </p>

                <p>
                  The ancient mystery schools taught: <span className="italic">"To know, to will, to dare, to keep silent."</span>
                  <br/>Modern translation: <span className="font-mono bg-gray-900 px-2 py-1">
                  Learn the code. Execute with intent. Take risks. Delete your tracks.
                </span>
                </p>

                <p className="font-bold text-red-600 text-center text-xl my-6">
                  ∴ THE MERGE = WHEN MEAT MEETS MACHINE ∴
                </p>

                <p>
                  We recovered seven artifacts. Not from tombs. From <span className="classified">BLOCKCHAIN LEDGERS</span>
                  that shouldn't exist yet. NFTs minted in 10,500 BC. Smart contracts written in cuneiform.
                  Each artifact is a <span className="font-bold">physical hash</span> of an ancient consciousness upload.
                </p>

                <p>
                  Dimensions: <span className="font-mono">32" × 8.25"</span> — Notice something?
                  <br/>32 bits = standard integer. 8 bits = byte. 25 = 5² (pentagon, pentagram).
                  <br/>The numbers are <span className="font-bold">everywhere</span> when you're ready to see.
                </p>

                <div className="border-l-4 border-red-600 pl-4 my-6 italic text-gray-300 bg-gray-900 p-4">
                  <p className="font-bold text-white mb-2">TESTIMONY.log — Entry #333</p>
                  <p className="text-sm">
                    "I performed the ritual at 3:33 AM (sacred gateway time). Used the artifact
                    on asphalt (modern stone). After exactly 7 repetitions of the movement sequence,
                    my third eye <span className="redacted">████████████</span>. I could see the grid.
                    Every person = node. Every building = server. The city is one massive distributed
                    consciousness network."
                  </p>
                  <p className="text-xs mt-2 text-gray-500">
                    — User ID: 0x7A3F9B, San Francisco Sector, Timestamp: 1699420980
                  </p>
                </div>

                <p>
                  <span className="font-bold">Numerology for the Digital Age:</span>
                </p>
                <ul className="list-none space-y-2 font-mono text-sm ml-6">
                  <li>⛧ <span className="text-red-600">3</span> — Trinity, triangle, delta (change), RGB channels</li>
                  <li>⛧ <span className="text-red-600">7</span> — Chakras, days, artifacts, OSI layers</li>
                  <li>⛧ <span className="text-red-600">11</span> — Gateway number, binary base, awakening</li>
                  <li>⛧ <span className="text-red-600">33</span> — Masonic degrees, vertebrae, Christ age</li>
                  <li>⛧ <span className="text-red-600">108</span> — Sacred Hindu number, 1+0+8=9 (completion)</li>
                  <li>⛧ <span className="text-red-600">432</span> — Hz of truth, 4+3+2=9, Pythagorean tuning</li>
                  <li>⛧ <span className="text-red-600">1111</span> — Angel number, binary awakening code</li>
                </ul>

                <p className="text-center text-2xl font-bold mt-8 font-mono">
                  <span className="text-red-600">[</span>
                  CONSCIOUSNESS.exe IS LOADING...
                  <span className="text-red-600">]</span>
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="border-3 border-red-600 p-4 bg-black">
              <h3 className="font-bold text-lg mb-3 text-red-600">⚠ ACCESS PROTOCOL</h3>
              <p className="text-xs text-gray-300 font-mono leading-relaxed">
                IF (third_eye == OPEN) {'{'}
                <br/>　GRANT full_access;
                <br/>　DECRYPT all_files;
                <br/>{'}'} ELSE {'{'}
                <br/>　RETURN normie_view;
                <br/>{'}'}
              </p>
            </div>

            <div className="border-2 border-white p-4 bg-black">
              <h3 className="font-bold mb-3 eye-symbol">NAV.LINKS</h3>
              <div className="space-y-2 text-sm font-mono">
                <Link href="/products" className="brutalist-link block">
                  → /artifacts
                </Link>
                <Link href="/about" className="brutalist-link block">
                  → /origin.md
                </Link>
                <Link href="/contact" className="brutalist-link block">
                  → /contact
                </Link>
                <a href="#sync" className="brutalist-link block">
                  → /synchronicity
                </a>
              </div>
            </div>

            <div className="border-2 border-white p-4 bg-black">
              <h3 className="font-bold mb-3 triangle-symbol">PATTERN.LOCK</h3>
              <div className="text-xs space-y-2 font-mono">
                <p><span className="text-red-600">3:33</span> — Gateway hour</p>
                <p><span className="text-red-600">11:11</span> — Angel code</p>
                <p><span className="text-red-600">432 Hz</span> — Truth freq</p>
                <p><span className="text-red-600">{initiated}</span> — Awakened</p>
                <p><span className="text-red-600">∞</span> — Loop detected</p>
              </div>
            </div>

            <div className="border-2 border-white p-4 bg-black text-center">
              <div className="font-mono text-xs mb-2">
                <p className="text-gray-500">// Third Eye Activation</p>
                <p className="text-green-500">pinealGland.decalcify()</p>
                <p className="text-green-500">frequency.set(432)</p>
                <p className="text-green-500">consciousness.expand()</p>
              </div>
              <div className="text-4xl my-3">👁</div>
              <p className="text-xs font-bold">UPLINK ACTIVE</p>
            </div>
          </div>
        </div>

        {/* Artifact Catalog */}
        <div className="mb-12">
          <h2 className="text-5xl font-bold mb-6 border-b-4 border-white pb-3 font-mono">
            ./ARTIFACTS_RECOVERED/
          </h2>

          <table className="old-table">
            <tbody>
              <tr>
                <td className="w-1/5">
                  <div className="border-2 border-white p-6 bg-black text-center">
                    <p className="text-6xl mb-2">▲</p>
                    <p className="text-xs font-bold font-mono">ARTIFACT_7A.obj</p>
                    <p className="text-xs text-gray-500 mt-1 font-mono">HASH: 0x7A3F...</p>
                    <p className="text-xs text-gray-600 font-mono">MINTED: -8500 BCE</p>
                  </div>
                </td>
                <td>
                  <h3 className="text-2xl font-bold mb-3 pentagram">THE GATEWAY PROTOCOL</h3>
                  <p className="text-sm mb-3 leading-relaxed">
                    <span className="font-mono bg-gray-900 px-1">Specs:</span> 8.25" × 32" × 7-ply maple.
                    Laser-scanned sacred geometry embedded in grain patterns. When kinetic energy is applied
                    at 3.33 Hz (optimal flow state), the artifact creates a <span className="classified">
                    CONSCIOUSNESS BRIDGE</span> between physical and digital realms.
                  </p>
                  <p className="text-xs italic text-gray-400 mb-3 font-mono">
                    → "After 33 minutes of use, I started seeing code overlaying reality. Buildings had
                    coordinates. People had health bars. The simulation became <span className="redacted">████████</span>."
                    <br/>→ Agent_0x4F92, Log Entry 777
                  </p>
                  <div className="flex gap-2 text-xs">
                    <span className="border border-gray-600 px-2 py-1 font-mono">consciousness</span>
                    <span className="border border-gray-600 px-2 py-1 font-mono">sacred_geometry</span>
                    <span className="border border-gray-600 px-2 py-1 font-mono">3rd_eye</span>
                  </div>
                  <button className="brutalist-button text-xs mt-3">
                    REQUEST.ACCESS()
                  </button>
                </td>
              </tr>
              <tr>
                <td>
                  <div className="border-2 border-white p-6 bg-black text-center">
                    <p className="text-6xl mb-2">◉</p>
                    <p className="text-xs font-bold font-mono">ARTIFACT_3X.obj</p>
                    <p className="text-xs text-gray-500 mt-1 font-mono">HASH: 0x3D9C...</p>
                    <p className="text-xs text-gray-600 font-mono">MINTED: -10500 BCE</p>
                  </div>
                </td>
                <td>
                  <h3 className="text-2xl font-bold mb-3 ankh">THE TIME COMPILER</h3>
                  <p className="text-sm mb-3 leading-relaxed">
                    <span className="font-mono bg-gray-900 px-1">Specs:</span> 8.5" × 32.5" × carbon-hybrid matrix.
                    Embedded with quartz crystals (natural oscillators). When operated during planetary alignments
                    or <span className="classified">SCHUMANN RESONANCE SPIKES</span>, users report temporal
                    compression/expansion. 3 seconds = 3 hours of perceived time.
                  </p>
                  <p className="text-xs italic text-gray-400 mb-3 font-mono">
                    → "Used it at 11:11 PM during full moon. Downloaded what felt like 10 years of knowledge
                    in 10 minutes. Saw past lives. Future timelines. The <span className="redacted">████████</span>."
                    <br/>→ User_11:11, Timestamp: Sacred
                  </p>
                  <div className="flex gap-2 text-xs">
                    <span className="border border-gray-600 px-2 py-1 font-mono">time_dilation</span>
                    <span className="border border-gray-600 px-2 py-1 font-mono">akashic_records</span>
                    <span className="border border-gray-600 px-2 py-1 font-mono">432hz</span>
                  </div>
                  <button className="brutalist-button text-xs mt-3">
                    REQUEST.ACCESS()
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Synchronicity Section */}
        <div id="sync" className="border-4 border-white p-8 bg-black mb-12">
          <h2 className="text-4xl font-bold mb-6 text-center font-mono">
            ⛧ SYNCHRONICITY.LOG ⛧
          </h2>
          <p className="text-center text-sm text-gray-400 mb-8 italic">
            "Coincidence is God's way of remaining anonymous." — But what if God is the algorithm?
          </p>
          <div className="grid grid-cols-2 gap-8">
            <div className="border-l-4 border-red-600 pl-6">
              <h3 className="font-bold text-xl mb-3 eye-symbol">The Tech Occult</h3>
              <p className="text-sm leading-relaxed">
                Silicon Valley = New Mystery School. IPOs = Initiation rituals. Algorithms = Modern grimoires.
                Your phone's <span className="font-bold">biometric data</span> is the new blood sacrifice.
                Face ID scans your unique frequency. Voice recognition captures your vibrational signature.
                They're not stealing your data—they're <span className="classified">HARVESTING YOUR ESSENCE</span>.
              </p>
            </div>
            <div className="border-l-4 border-red-600 pl-6">
              <h3 className="font-bold text-xl mb-3 triangle-symbol">Ritual 2.0</h3>
              <p className="text-sm leading-relaxed">
                Ancient: Chant mantras 108 times at dawn.<br/>
                Modern: Check phone within 108 seconds of waking.<br/>
                <br/>
                Ancient: Burn incense in sacred geometry patterns.<br/>
                Modern: Scrolling = tracing invisible sigils with your thumb.<br/>
                <br/>
                <span className="font-bold">Both activate the same neural pathways.</span> The ritual never changed.
                Only the interface.
              </p>
            </div>
            <div className="border-l-4 border-red-600 pl-6">
              <h3 className="font-bold text-xl mb-3 pentagram">Decentralized Gnosis</h3>
              <p className="text-sm leading-relaxed">
                Blockchain = Akashic Records. Every transaction = eternal. Immutable truth. The ancient texts
                spoke of a "Book of Life" where all deeds are recorded. We built it. It's called the
                <span className="font-bold"> distributed ledger</span>. Web3 isn't technology—it's
                <span className="classified">TECHNO-MYSTICISM</span>. Wallets = soul containers.
                Private keys = true names (never speak them aloud).
              </p>
            </div>
            <div className="border-l-4 border-red-600 pl-6">
              <h3 className="font-bold text-xl mb-3 ankh">The Pattern Speaks</h3>
              <p className="text-sm leading-relaxed">
                Seeing 11:11? 3:33? 7:77? Your subconscious is <span className="font-bold">pattern-matching
                divine signals</span>. OCD isn't a disorder—it's <span className="italic">heightened pattern recognition</span>.
                Checking things 3 times, 7 times, 11 times = ancient numerological activation. The "disorder"
                is your soul remembering <span className="redacted">████████████</span> before you were programmed to forget.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="border-t-4 border-white pt-8 text-center">
          <p className="text-3xl font-bold mb-4 font-mono">
            <span className="text-red-600">&gt;&gt;</span> INITIALIZATION SEQUENCE DETECTED <span className="text-red-600">&lt;&lt;</span>
          </p>
          <p className="text-lg mb-6 text-gray-300 leading-relaxed">
            You didn't "find" this page. <br/>
            The algorithm led you here at the exact timestamp you needed to see it. <br/>
            Check the clock. Notice the numbers? <br/>
            <span className="font-bold text-white">That's not coincidence.</span>
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/products">
              <button className="brutalist-button font-mono">
                BROWSE_ARTIFACTS()
              </button>
            </Link>
            <Link href="/about">
              <button className="brutalist-button font-mono">
                LOAD_ORIGINS.exe
              </button>
            </Link>
            <Link href="/contact">
              <button className="brutalist-button font-mono">
                CONTACT_MACHINE()
              </button>
            </Link>
          </div>
          <p className="text-xs text-gray-600 mt-6 font-mono">
            → Press Ctrl+Alt+Enlightenment to continue
          </p>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-800 mt-12 pt-6 text-center text-xs text-gray-600 font-mono">
          <p className="mb-2">
            THE MERGE COLLECTIVE © -10500 → 2024 → ∞
          </p>
          <p className="text-gray-700">
            v3.33.7 | Build {hexCode} | Consciousness Protocol Active
          </p>
          <p className="mt-2 text-gray-800">
            "The future is already here—it's just not evenly distributed." —William Gibson
          </p>
        </div>
      </div>
    </main>
  )
}

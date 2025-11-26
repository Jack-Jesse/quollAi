"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'ROOT', icon: '◉' },
    { href: '/products', label: 'ARTIFACTS', icon: '▲' },
    { href: '/about', label: 'MANIFESTO', icon: '⛧' },
    { href: '/contact', label: 'CONTACT', icon: '✠' },
  ]

  return (
    <nav className="border-b-2 border-white bg-black sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <Link href="/" className="text-2xl font-bold ransom-note text-red-600 hover:text-white transition-colors">
            M E R G E
          </Link>

          {/* Navigation Links */}
          <div className="flex gap-2 md:gap-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    brutalist-button text-xs px-3 py-2
                    ${isActive ? 'bg-white text-black' : 'bg-black text-white'}
                    font-mono
                  `}
                >
                  <span className="hidden sm:inline">{item.icon} </span>
                  {item.label}
                </Link>
              )
            })}
          </div>

          {/* Status Indicator */}
          <div className="hidden md:flex items-center gap-2 text-xs font-mono">
            <span className="text-red-600 animate-pulse">◉</span>
            <span className="text-gray-500">LIVE</span>
          </div>
        </div>
      </div>
    </nav>
  )
}

import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

const navigationItems = [
  { label: 'MODELLER', to: '/modeller' },
  { label: 'GALERİ', to: '/musterilerimizden-gelenler' },
  { label: 'İLETİŞİM', to: '/iletisim' },
]

export default function PublicHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isMobileMenuOpen])

  useEffect(() => {
    const desktopViewport = window.matchMedia('(min-width: 981px)')
    const closeOnDesktop = (event) => {
      if (event.matches) setIsMobileMenuOpen(false)
    }
    desktopViewport.addEventListener('change', closeOnDesktop)
    return () => desktopViewport.removeEventListener('change', closeOnDesktop)
  }, [])

  function handleBrandClick(event) {
    setIsMobileMenuOpen(false)
    if (location.pathname !== '/') return

    event.preventDefault()
    document.querySelector('#hero')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <header className="landing-header public-header" aria-label="Site header">
      <button
        className={`mobile-menu-toggle${isMobileMenuOpen ? ' is-open' : ''}`}
        type="button"
        aria-label={isMobileMenuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
        aria-controls="public-mobile-menu"
        aria-expanded={isMobileMenuOpen}
        onClick={() => setIsMobileMenuOpen((current) => !current)}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>
      <Link className="landing-brand" to="/" aria-label="Perdecim ana sayfa" onClick={handleBrandClick}>
        <strong>Perdecim</strong>
        <span>Zonguldak Showroom</span>
      </Link>
      <nav className="desktop-nav" aria-label="Ana menü">
        {navigationItems.map((item) => (
          <NavLink className={({ isActive }) => isActive ? 'active' : ''} key={item.to} to={item.to}>{item.label}</NavLink>
        ))}
      </nav>
      <button
        className={`mobile-menu-backdrop${isMobileMenuOpen ? ' is-open' : ''}`}
        type="button"
        aria-label="Menüyü kapat"
        tabIndex={isMobileMenuOpen ? 0 : -1}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      <aside
        id="public-mobile-menu"
        className={`mobile-side-menu${isMobileMenuOpen ? ' is-open' : ''}`}
        role="navigation"
        aria-label="Mobil ana menü"
        aria-hidden={!isMobileMenuOpen}
        inert={!isMobileMenuOpen}
      >
        <strong className="mobile-side-menu-title">Menü</strong>
        <div className="mobile-side-menu-links">
          <NavLink end to="/" onClick={() => setIsMobileMenuOpen(false)}>ANA SAYFA</NavLink>
          {navigationItems.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={() => setIsMobileMenuOpen(false)}>{item.label}</NavLink>
          ))}
        </div>
      </aside>
    </header>
  )
}

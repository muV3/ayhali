import { useEffect, useMemo, useState } from 'react'
import LandingPage from './LandingPage.jsx'
import AdminPanel from './AdminPanel.jsx'
import heroImg from './assets/curtain-showroom-hero.png'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7237'

const fallbackProducts = [
  { id: 1, name: 'Keten Dokulu Bej Fon Perde', code: 'PRD-1024', isAvailable: true, isFeatured: true, category: 'Fon Perde', colors: ['Bej', 'Krem'], sizes: ['260x270', '300x270'], style: 'Modern', material: 'Keten Dokulu Kumaş', description: 'Salon ve oturma alanları için sıcak, dökümlü ve sakin bir fon perde seçeneği.' },
  { id: 2, name: 'Lacivert Blackout Perde', code: 'PRD-1180', isAvailable: true, isFeatured: false, category: 'Blackout Perde', colors: ['Lacivert', 'Gri'], sizes: ['140x260', '200x260'], style: 'Minimal', material: 'Karartma Kumaş', description: 'Yatak odası ve medya alanları için ışığı kontrollü kesen tok dokulu perde.' },
  { id: 3, name: 'Çocuk Odası Soft Tül Perde', code: 'PRD-1302', isAvailable: false, isFeatured: true, category: 'Tül Perde', colors: ['Gri', 'Yeşil'], sizes: ['250x260', '300x260'], style: 'Minimal', material: 'Vual Tül', description: 'Çocuk odaları için ferah ışık geçişi sunan, yumuşak tonlu ve kolay uyum sağlayan tül perde.' },
]

const fallbackAttributes = {
  categories: ['Fon Perde', 'Tül Perde', 'Zebra Perde', 'Stor Perde', 'Blackout Perde'],
  colors: ['Bej', 'Krem', 'Gri', 'Lacivert', 'Yeşil'],
  sizes: ['120x200', '160x200', '250x260', '300x270'],
  styles: ['Modern', 'Soft Modern', 'Minimal'],
  materials: ['Keten Dokulu Kumaş', 'Vual Tül', 'Karartma Kumaş', 'Polyester Dokuma'],
}

async function fetchJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`)
  if (!response.ok) throw new Error(`API request failed: ${response.status}`)
  return response.json()
}

function getMainImage(product) {
  return product.mainImageUrl || product.images?.find((image) => image.isMainImage)?.url
}

function ProductArtwork({ product }) {
  const imageUrl = getMainImage(product)
  if (imageUrl) {
    const src = imageUrl.startsWith('http') ? imageUrl : `${API_BASE_URL}${imageUrl}`
    return <img src={src} alt={product.name} />
  }

  return (
    <div className="fabric-art" aria-hidden="true">
      <span></span>
    </div>
  )
}

function runPageTransition(updatePage) {
  if (document.startViewTransition) {
    document.startViewTransition(updatePage)
    return
  }

  updatePage()
}

function LegacyCatalogApp({ initialProduct, onBackHome }) {
  const [route, setRoute] = useState(initialProduct
    ? { name: 'detail', productId: initialProduct.id, returnTo: 'landing' }
    : { name: 'products' })
  const [products, setProducts] = useState(initialProduct ? [initialProduct] : [])
  const [attributes, setAttributes] = useState(fallbackAttributes)
  const [isLoading, setIsLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ category: '', color: '', size: '', style: '', material: '', available: true, sort: 'featured' })

  useEffect(() => {
    let isMounted = true

    async function loadShowroomData() {
      setIsLoading(true)
      try {
        const [productResult, categories, colors, sizes, styles, materials] = await Promise.all([
          fetchJson('/api/products?pageSize=24&sortBy=featured'),
          fetchJson('/api/categories'),
          fetchJson('/api/colors'),
          fetchJson('/api/sizes'),
          fetchJson('/api/styles'),
          fetchJson('/api/materials'),
        ])

        if (!isMounted) return
        setProducts(productResult.items ?? [])
        setAttributes({
          categories: categories.map((item) => item.name),
          colors: colors.map((item) => item.name),
          sizes: sizes.map((item) => item.name),
          styles: styles.map((item) => item.name),
          materials: materials.map((item) => item.name),
        })
      } catch {
        if (isMounted) {
          setProducts(initialProduct && !fallbackProducts.some((product) => product.id === initialProduct.id)
            ? [initialProduct, ...fallbackProducts]
            : fallbackProducts)
          setAttributes(fallbackAttributes)
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadShowroomData()
    return () => {
      isMounted = false
    }
  }, [initialProduct])

  const visibleProducts = useMemo(() => {
    const search = query.trim().toLowerCase()
    return products
      .filter((product) => {
        const matchesSearch = !search || [product.name, product.code, product.description, product.category].filter(Boolean).some((value) => value.toLowerCase().includes(search))
        return matchesSearch &&
          (!filters.category || product.category === filters.category) &&
          (!filters.color || product.colors?.includes(filters.color)) &&
          (!filters.size || product.sizes?.includes(filters.size)) &&
          (!filters.style || product.style === filters.style) &&
          (!filters.material || product.material === filters.material) &&
          (!filters.available || product.isAvailable)
      })
      .sort((a, b) => {
        if (filters.sort === 'nameAsc') return a.name.localeCompare(b.name, 'tr-TR')
        if (filters.sort === 'nameDesc') return b.name.localeCompare(a.name, 'tr-TR')
        return Number(b.isFeatured) - Number(a.isFeatured)
      })
  }, [filters, products, query])

  const featuredProducts = visibleProducts.filter((product) => product.isFeatured).slice(0, 3)
  const selectedProduct = products.find((product) => product.id === route.productId)

  function navigate(nextRoute) {
    runPageTransition(() => {
      setRoute(nextRoute)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  function navigateBackFromDetail() {
    if (route.returnTo === 'landing') {
      onBackHome()
      return
    }

    navigate({ name: route.returnTo ?? 'products' })
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" type="button" onClick={onBackHome}>
          <strong>Perdecim</strong>
          <span>Zonguldak</span>
        </button>
        <nav aria-label="Ana menü">
          {[
            ['products', 'MODELLER'],
            ['contact', 'İLETİŞİM'],
          ].map(([name, label]) => (
            <button className={route.name === name ? 'active' : ''} key={name} type="button" onClick={() => navigate({ name })}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      {route.name === 'home' && (
        <main>
          <section className="hero-section">
            <img src={heroImg} alt="Perdecim showroom iç mekanında sergilenen perdeler" />
            <div className="hero-copy">
              <p>Zonguldak'ın dijital perde showroom'u</p>
              <h1>Kaliteli ve şık perde modellerini mağazaya gelmeden inceleyin.</h1>
              <div className="hero-actions">
                <button className="button button-primary" type="button" onClick={() => navigate({ name: 'products' })}>MODELLERİ İNCELE</button>
              </div>
            </div>
          </section>
          <section className="section">
            <div className="section-heading">
              <p>Öne çıkanlar</p>
              <h2>Mağazada en çok sorulan modeller</h2>
            </div>
            <ProductGrid products={featuredProducts.length ? featuredProducts : visibleProducts.slice(0, 3)} onOpen={(product) => navigate({ name: 'detail', productId: product.id, returnTo: 'home' })} />
          </section>
          <section className="trust-band">
            <div><strong>Yerel mağaza</strong><span>Zonguldak'ta yüz yüze destek</span></div>
            <div><strong>Net ürün bilgisi</strong><span>Ölçü, renk ve stok bilgisi tek ekranda</span></div>
            <div><strong>Güncel bilgi</strong><span>Ürün detayları ve stok durumu tek ekranda</span></div>
          </section>
        </main>
      )}

      {route.name === 'products' && (
        <main className="catalog-layout">
          <CatalogFilters attributes={attributes} filters={filters} query={query} setFilters={setFilters} setQuery={setQuery} />
          <section className="catalog-results">
            <div className="section-heading inline">
              <div><p>{isLoading ? 'Yükleniyor' : `${visibleProducts.length} model`}</p><h2>Perde modelleri</h2></div>
            </div>
            <ProductGrid products={visibleProducts} onOpen={(product) => navigate({ name: 'detail', productId: product.id, returnTo: 'products' })} />
          </section>
        </main>
      )}

      {route.name === 'detail' && selectedProduct && (
        <main className="detail-layout">
          <div className="detail-media"><ProductArtwork product={selectedProduct} /></div>
          <section className="detail-content">
            <button className="back-button button button-outline button-sm" type="button" onClick={navigateBackFromDetail}>GERİ</button>
            <p className="product-code">{selectedProduct.code}</p>
            <h1>{selectedProduct.name}</h1>
            <p>{selectedProduct.description}</p>
            <dl className="spec-list">
              <div><dt>Kategori</dt><dd>{selectedProduct.category}</dd></div>
              <div><dt>Renkler</dt><dd>{selectedProduct.colors?.join(', ')}</dd></div>
              <div><dt>Ölçüler</dt><dd>{selectedProduct.sizes?.join(', ')}</dd></div>
              <div><dt>Durum</dt><dd>{selectedProduct.isAvailable ? 'Mağazada mevcut' : 'Stokta yok'}</dd></div>
            </dl>
          </section>
        </main>
      )}

      {route.name === 'contact' && (
        <main className="contact-page">
          <section>
            <p>İletişim</p>
            <aside className="contact-panel">
              <strong>Perdecim Zonguldak</strong>
              <span>Adres: Cumhuriyet Caddesi TK Mobilya Yanı, Zonguldak Merkez</span>
              <span>E-posta:</span>
              <span>Instagram: @halicimahmutay</span>
              <span>Çalışma saatleri: 09:00 - 19:00</span>
              <a href="https://www.google.com/maps/search/?api=1&query=Zonguldak%20Perdecim" target="_blank" rel="noreferrer">Yol Tarifi Al</a>
            </aside>
          </section>
        </main>
      )}

      <footer><span>Perdecim</span><span>Zonguldak'ta perde modelleri ve mağaza desteği.</span></footer>
    </div>
  )
}

function CatalogFilters({ attributes, filters, query, setFilters, setQuery }) {
  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }))
  }

  return (
    <aside className="filters">
      <label>Arama<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Model, kod veya renk" /></label>
      <SelectFilter label="Kategori" value={filters.category} options={attributes.categories} onChange={(value) => updateFilter('category', value)} />
      <SelectFilter label="Renk" value={filters.color} options={attributes.colors} onChange={(value) => updateFilter('color', value)} />
      <SelectFilter label="Ölçü" value={filters.size} options={attributes.sizes} onChange={(value) => updateFilter('size', value)} />
      <SelectFilter label="Stil" value={filters.style} options={attributes.styles} onChange={(value) => updateFilter('style', value)} />
      <SelectFilter label="Materyal" value={filters.material} options={attributes.materials} onChange={(value) => updateFilter('material', value)} />
      <label>Sıralama<select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)}><option value="featured">Öne çıkanlar</option><option value="nameAsc">İsim A-Z</option><option value="nameDesc">İsim Z-A</option></select></label>
      <label className="check-row"><input checked={filters.available} type="checkbox" onChange={(event) => updateFilter('available', event.target.checked)} />Sadece stoktakiler</label>
    </aside>
  )
}

function SelectFilter({ label, onChange, options, value }) {
  return (
    <label>{label}<select value={value} onChange={(event) => onChange(event.target.value)}><option value="">Tümü</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
  )
}

function ProductGrid({ onOpen, products }) {
  if (!products.length) return <div className="empty-state">Bu seçimlere uygun ürün bulunamadı.</div>

  return (
    <div className="product-grid">
      {products.map((product) => (
        <article className="product-card" key={product.id}>
          <button type="button" className="product-image" onClick={() => onOpen(product)}><ProductArtwork product={product} /></button>
          <div className="product-body">
            <p className="product-code">{product.code}</p>
            <h3>{product.name}</h3>
            <div className="tag-row"><span>{product.category}</span><span>{product.isAvailable ? 'Stokta' : 'Tükendi'}</span></div>
            <div className="card-actions"><button className="button button-outline button-sm" type="button" onClick={() => onOpen(product)}>DETAY</button></div>
          </div>
        </article>
      ))}
    </div>
  )
}

function App() {
  if (window.location.pathname === '/yonetim' || window.location.pathname.startsWith('/yonetim/')) {
    return <AdminPanel />
  }

  return <PublicApp />
}

function PublicApp() {
  const [page, setPage] = useState({ name: 'landing' })

  function navigatePage(nextPage) {
    runPageTransition(() => setPage(nextPage))
  }

  if (page.name === 'products') {
    return <LegacyCatalogApp initialProduct={page.product} onBackHome={() => navigatePage({ name: 'landing' })} />
  }

  return (
    <LandingPage
      onOpenProduct={(product) => navigatePage({ name: 'products', product })}
      onOpenProducts={() => navigatePage({ name: 'products' })}
    />
  )
}

export default App

import { useEffect, useMemo, useState } from 'react'
import LandingPage from './LandingPage.jsx'
import heroImg from './assets/curtain-showroom-hero.png'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7237'
const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER ?? '905555555555'

const fallbackProducts = [
  { id: 1, name: 'Keten Dokulu Bej Fon Perde', code: 'PRD-1024', price: 8500, discountPrice: 7200, isDiscounted: true, isAvailable: true, isFeatured: true, category: 'Fon Perde', colors: ['Bej', 'Krem'], sizes: ['260x270', '300x270'], style: 'Modern', material: 'Keten Dokulu Kumaş', description: 'Salon ve oturma alanları için sıcak, dökümlü ve sakin bir fon perde seçeneği.' },
  { id: 2, name: 'Lacivert Blackout Perde', code: 'PRD-1180', price: 3200, discountPrice: null, isDiscounted: false, isAvailable: true, isFeatured: false, category: 'Blackout Perde', colors: ['Lacivert', 'Gri'], sizes: ['140x260', '200x260'], style: 'Minimal', material: 'Karartma Kumaş', description: 'Yatak odası ve medya alanları için ışığı kontrollü kesen tok dokulu perde.' },
  { id: 3, name: 'Çocuk Odası Soft Tül Perde', code: 'PRD-1302', price: 4100, discountPrice: 3650, isDiscounted: true, isAvailable: false, isFeatured: true, category: 'Tül Perde', colors: ['Gri', 'Yeşil'], sizes: ['250x260', '300x260'], style: 'Minimal', material: 'Vual Tül', description: 'Çocuk odaları için ferah ışık geçişi sunan, yumuşak tonlu ve kolay uyum sağlayan tül perde.' },
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

function formatPrice(value) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value)
}

function createWhatsAppLink(product) {
  const message = product
    ? `Merhaba, Perdecim web sitenizde gördüğüm ${product.code} kodlu ${product.name} hakkında bilgi almak istiyorum.`
    : 'Merhaba, Perdecim perde ürünleri hakkında bilgi almak istiyorum.'

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
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

function LegacyCatalogApp({ onBackHome }) {
  const [route, setRoute] = useState({ name: 'products' })
  const [products, setProducts] = useState([])
  const [attributes, setAttributes] = useState(fallbackAttributes)
  const [isLoading, setIsLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ category: '', color: '', size: '', style: '', material: '', discounted: false, available: true, sort: 'featured' })

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
          setProducts(fallbackProducts)
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
  }, [])

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
          (!filters.discounted || product.isDiscounted) &&
          (!filters.available || product.isAvailable)
      })
      .sort((a, b) => {
        if (filters.sort === 'priceAsc') return a.price - b.price
        if (filters.sort === 'priceDesc') return b.price - a.price
        if (filters.sort === 'discounted') return Number(b.isDiscounted) - Number(a.isDiscounted)
        return Number(b.isFeatured) - Number(a.isFeatured)
      })
  }, [filters, products, query])

  const featuredProducts = visibleProducts.filter((product) => product.isFeatured).slice(0, 3)
  const campaignProducts = products.filter((product) => product.isDiscounted)
  const selectedProduct = products.find((product) => product.id === route.productId)

  function navigate(nextRoute) {
    runPageTransition(() => {
      setRoute(nextRoute)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
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
            ['campaigns', 'KAMPANYALAR'],
            ['contact', 'İLETİŞİM'],
          ].map(([name, label]) => (
            <button className={route.name === name ? 'active' : ''} key={name} type="button" onClick={() => navigate({ name })}>
              {label}
            </button>
          ))}
        </nav>
        <a className="header-action button button-primary button-sm" href={createWhatsAppLink()} target="_blank" rel="noreferrer">WHATSAPP</a>
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
                <a className="button button-secondary" href={createWhatsAppLink()} target="_blank" rel="noreferrer">WHATSAPP'TAN YAZ</a>
              </div>
            </div>
          </section>
          <section className="section">
            <div className="section-heading">
              <p>Öne çıkanlar</p>
              <h2>Mağazada en çok sorulan modeller</h2>
            </div>
            <ProductGrid products={featuredProducts.length ? featuredProducts : visibleProducts.slice(0, 3)} onOpen={(product) => navigate({ name: 'detail', productId: product.id })} />
          </section>
          <section className="trust-band">
            <div><strong>Yerel mağaza</strong><span>Zonguldak'ta yüz yüze destek</span></div>
            <div><strong>Net ürün bilgisi</strong><span>Ölçü, renk ve stok bilgisi tek ekranda</span></div>
            <div><strong>Hızlı dönüş</strong><span>Ürün koduyla WhatsApp görüşmesi</span></div>
          </section>
        </main>
      )}

      {route.name === 'products' && (
        <main className="catalog-layout">
          <CatalogFilters attributes={attributes} filters={filters} query={query} setFilters={setFilters} setQuery={setQuery} />
          <section className="catalog-results">
            <div className="section-heading inline">
              <div><p>{isLoading ? 'Yükleniyor' : `${visibleProducts.length} model`}</p><h2>Perde modelleri</h2></div>
              <button className="button button-primary button-sm" type="button" onClick={() => setFilters({ ...filters, discounted: true })}>İNDİRİMLERİ GÖSTER</button>
            </div>
            <ProductGrid products={visibleProducts} onOpen={(product) => navigate({ name: 'detail', productId: product.id })} />
          </section>
        </main>
      )}

      {route.name === 'campaigns' && (
        <main className="section page-section">
          <div className="section-heading"><p>Kampanyalar</p><h2>İndirimdeki perdeler</h2></div>
          <ProductGrid products={campaignProducts} onOpen={(product) => navigate({ name: 'detail', productId: product.id })} />
        </main>
      )}

      {route.name === 'detail' && selectedProduct && (
        <main className="detail-layout">
          <div className="detail-media"><ProductArtwork product={selectedProduct} /></div>
          <section className="detail-content">
            <button className="back-button button button-outline button-sm" type="button" onClick={() => navigate({ name: 'products' })}>GERİ</button>
            <p className="product-code">{selectedProduct.code}</p>
            <h1>{selectedProduct.name}</h1>
            <p>{selectedProduct.description}</p>
            <Price product={selectedProduct} />
            <dl className="spec-list">
              <div><dt>Kategori</dt><dd>{selectedProduct.category}</dd></div>
              <div><dt>Renkler</dt><dd>{selectedProduct.colors?.join(', ')}</dd></div>
              <div><dt>Ölçüler</dt><dd>{selectedProduct.sizes?.join(', ')}</dd></div>
              <div><dt>Durum</dt><dd>{selectedProduct.isAvailable ? 'Mağazada mevcut' : 'Stokta yok'}</dd></div>
            </dl>
            <a className="primary-link button button-primary" href={createWhatsAppLink(selectedProduct)} target="_blank" rel="noreferrer">BU ÜRÜN İÇİN WHATSAPP'TAN YAZ</a>
          </section>
        </main>
      )}

      {route.name === 'contact' && (
        <main className="contact-page">
          <section>
            <p>İletişim</p>
            <h1>Mağazaya gelmeden önce modeli seçin, ürün koduyla bize yazın.</h1>
            <a className="primary-link button button-primary" href={createWhatsAppLink()} target="_blank" rel="noreferrer">WHATSAPP'TAN YAZ</a>
          </section>
          <aside className="contact-panel">
            <strong>Perdecim Zonguldak</strong>
            <span>Adres: Zonguldak merkez</span>
            <span>Telefon: 0 555 555 55 55</span>
            <span>Instagram: @perdecim</span>
            <span>Çalışma saatleri: 09:00 - 19:00</span>
            <a href="https://www.google.com/maps/search/?api=1&query=Zonguldak%20Perdecim" target="_blank" rel="noreferrer">Yol Tarifi Al</a>
          </aside>
        </main>
      )}

      <footer><span>Perdecim</span><span>Zonguldak'ta perde modelleri, kampanyalar ve WhatsApp satış desteği.</span></footer>
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
      <label>Sıralama<select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)}><option value="featured">Öne çıkanlar</option><option value="priceAsc">Fiyat artan</option><option value="priceDesc">Fiyat azalan</option><option value="discounted">İndirimliler</option></select></label>
      <label className="check-row"><input checked={filters.discounted} type="checkbox" onChange={(event) => updateFilter('discounted', event.target.checked)} />Sadece indirimdekiler</label>
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
            <Price product={product} />
            <div className="tag-row"><span>{product.category}</span><span>{product.isAvailable ? 'Stokta' : 'Tükendi'}</span></div>
            <div className="card-actions"><button className="button button-outline button-sm" type="button" onClick={() => onOpen(product)}>DETAY</button><a className="button button-primary button-sm" href={createWhatsAppLink(product)} target="_blank" rel="noreferrer">WHATSAPP</a></div>
          </div>
        </article>
      ))}
    </div>
  )
}

function Price({ product }) {
  return (
    <div className="price-row">
      {product.isDiscounted && product.discountPrice ? <><strong>{formatPrice(product.discountPrice)}</strong><span>{formatPrice(product.price)}</span></> : <strong>{formatPrice(product.price)}</strong>}
    </div>
  )
}

function App() {
  const [page, setPage] = useState('landing')

  function navigatePage(nextPage) {
    runPageTransition(() => setPage(nextPage))
  }

  if (page === 'products') {
    return <LegacyCatalogApp onBackHome={() => navigatePage('landing')} />
  }

  return <LandingPage onOpenProducts={() => navigatePage('products')} />
}

export default App

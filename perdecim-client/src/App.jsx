import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useNavigationType, useParams, useSearchParams } from 'react-router-dom'
import LandingPage from './LandingPage.jsx'
import AdminPanel from './AdminPanel.jsx'
import { getMainProductImage, getResponsiveImageAttributes } from './responsiveImages.js'
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

const defaultCatalogFilters = {
  category: '',
  color: '',
  size: '',
  style: '',
  material: '',
  available: true,
  sort: 'featured',
}

function readCatalogFilters(searchParams) {
  return {
    category: searchParams.get('kategori') ?? '',
    color: searchParams.get('renk') ?? '',
    size: searchParams.get('olcu') ?? '',
    style: searchParams.get('stil') ?? '',
    material: searchParams.get('materyal') ?? '',
    available: searchParams.get('stok') !== 'tumu',
    sort: searchParams.get('siralama') ?? defaultCatalogFilters.sort,
  }
}

function writeCatalogSearchParams(query, filters) {
  const params = new URLSearchParams()
  if (query.trim()) params.set('q', query.trim())
  if (filters.category) params.set('kategori', filters.category)
  if (filters.color) params.set('renk', filters.color)
  if (filters.size) params.set('olcu', filters.size)
  if (filters.style) params.set('stil', filters.style)
  if (filters.material) params.set('materyal', filters.material)
  if (!filters.available) params.set('stok', 'tumu')
  if (filters.sort !== defaultCatalogFilters.sort) params.set('siralama', filters.sort)
  return params
}

async function fetchJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`)
  if (!response.ok) throw new Error(`API request failed: ${response.status}`)
  return response.json()
}

function ProductArtwork({ product, priority = false, sizes = '(max-width: 700px) calc(100vw - 40px), (max-width: 1100px) 50vw, 33vw' }) {
  const image = getMainProductImage(product)
  if (image) {
    const attributes = getResponsiveImageAttributes(image, (url) => url.startsWith('http') ? url : `${API_BASE_URL}${url}`)
    return <img {...attributes} sizes={attributes.srcSet ? sizes : undefined} alt={product.name} width="4" height="5" loading={priority ? 'eager' : 'lazy'} decoding="async" {...(priority ? { fetchPriority: 'high' } : {})} />
  }

  return (
    <div className="fabric-art" aria-hidden="true">
      <span></span>
    </div>
  )
}

function getSampleBookGalleryImage(sampleBook) {
  if (!sampleBook?.imageUrl) return null
  return {
    id: `sample-book-${sampleBook.id}`,
    url: sampleBook.imageUrl,
    smallUrl: sampleBook.imageSmallUrl,
    mediumUrl: sampleBook.imageMediumUrl,
    largeUrl: sampleBook.imageLargeUrl,
    smallWidth: sampleBook.imageSmallWidth,
    mediumWidth: sampleBook.imageMediumWidth,
    largeWidth: sampleBook.imageLargeWidth,
    isSampleBook: true,
  }
}

function ProductGallery({ product }) {
  const galleryImages = useMemo(() => {
    const productImages = product.images ?? []
    const sampleBookImage = getSampleBookGalleryImage(product.fabricSampleBook)
    return sampleBookImage ? [...productImages, sampleBookImage] : productImages
  }, [product.fabricSampleBook, product.images])
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    setActiveIndex(0)
  }, [product.id])

  if (!galleryImages.length) {
    return <div className="detail-media"><ProductArtwork product={product} priority sizes="(max-width: 900px) calc(100vw - 40px), 55vw" /></div>
  }

  const activeImage = galleryImages[Math.min(activeIndex, galleryImages.length - 1)]
  const attributes = getResponsiveImageAttributes(activeImage, (url) => url.startsWith('http') ? url : `${API_BASE_URL}${url}`)

  return (
    <section className="product-gallery" aria-label="Ürün görselleri">
      <div className="detail-media">
        <img {...attributes} sizes={attributes.srcSet ? '(max-width: 900px) calc(100vw - 40px), 55vw' : undefined} alt={product.name} width="4" height="5" fetchPriority="high" decoding="async" />
      </div>
      {galleryImages.length > 1 && (
        <div className="product-gallery-thumbnails" aria-label="Görsel seçin">
          {galleryImages.map((image, index) => {
            const thumbnailUrl = image.smallUrl ?? image.url
            const thumbnailSrc = thumbnailUrl.startsWith('http') ? thumbnailUrl : `${API_BASE_URL}${thumbnailUrl}`
            return (
              <button className={index === activeIndex ? 'active' : ''} type="button" key={image.id ?? `${image.url}-${index}`} onClick={() => setActiveIndex(index)} aria-label={`${index + 1}. ürün görselini göster`}>
                <img src={thumbnailSrc} alt="" width="4" height="5" loading="lazy" decoding="async" />
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

function runPageTransition(updatePage) {
  if (document.startViewTransition) {
    document.startViewTransition(updatePage)
    return
  }

  updatePage()
}

function CatalogApp() {
  const location = useLocation()
  const navigateTo = useNavigate()
  const { productId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const routeName = location.pathname === '/iletisim' ? 'contact' : productId ? 'detail' : 'products'
  const [products, setProducts] = useState([])
  const [attributes, setAttributes] = useState(fallbackAttributes)
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [selectedProductDetail, setSelectedProductDetail] = useState(null)
  const query = searchParams.get('q') ?? ''
  const filters = useMemo(() => readCatalogFilters(searchParams), [searchParams])

  function setQuery(nextQuery) {
    setSearchParams(writeCatalogSearchParams(nextQuery, filters), { replace: true })
  }

  function setFilters(update) {
    const nextFilters = typeof update === 'function' ? update(filters) : update
    setSearchParams(writeCatalogSearchParams(query, nextFilters), { replace: true })
  }

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

  useEffect(() => {
    if (routeName !== 'detail' || !productId) {
      setIsDetailLoading(false)
      setSelectedProductDetail(null)
      return undefined
    }

    let isMounted = true
    setIsDetailLoading(true)
    setSelectedProductDetail(null)
    fetchJson(`/api/products/${productId}`)
      .then((product) => {
        if (isMounted) setSelectedProductDetail(product)
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsDetailLoading(false)
      })

    return () => { isMounted = false }
  }, [productId, routeName])

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

  const selectedProduct = selectedProductDetail ?? products.find((product) => String(product.id) === productId)

  useEffect(() => {
    if (routeName === 'products') document.title = 'Perde Modelleri | Perdecim'
    if (routeName === 'contact') document.title = 'İletişim | Perdecim'
    if (routeName === 'detail') document.title = selectedProduct ? `${selectedProduct.name} | Perdecim` : 'Ürün Detayı | Perdecim'
  }, [routeName, selectedProduct])

  function navigate(nextRoute) {
    let destination = '/modeller'
    let state

    if (nextRoute.name === 'landing' || nextRoute.name === 'home') destination = '/'
    if (nextRoute.name === 'contact') destination = '/iletisim'
    if (nextRoute.name === 'detail') {
      destination = `/modeller/${nextRoute.productId}`
      const returnPath = nextRoute.returnTo === 'landing' || nextRoute.returnTo === 'home'
        ? '/'
        : routeName === 'products'
          ? `${location.pathname}${location.search}`
          : location.state?.from ?? '/modeller'
      state = { from: returnPath }
    }

    runPageTransition(() => {
      navigateTo(destination, { state })
    })
  }

  function navigateBackFromDetail() {
    navigateTo(location.state?.from ?? '/modeller')
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/">
          <strong>Perdecim</strong>
          <span>Zonguldak</span>
        </Link>
        <nav aria-label="Ana menü">
          {[
            ['products', 'MODELLER'],
            ['contact', 'İLETİŞİM'],
          ].map(([name, label]) => (
            <NavLink className={({ isActive }) => isActive ? 'active' : ''} end key={name} to={name === 'products' ? '/modeller' : '/iletisim'}>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      {routeName === 'products' && (
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

      {routeName === 'detail' && selectedProduct && (
        <main className="product-detail-page">
          <div className="detail-layout">
            <ProductGallery product={selectedProduct} />
            <section className="detail-content">
              <button className="back-button button button-outline button-sm" type="button" onClick={navigateBackFromDetail}>GERİ</button>
              <p className="product-code">{selectedProduct.code}</p>
              <h1>{selectedProduct.name}</h1>
              <p>{selectedProduct.description}</p>
              <dl className="spec-list">
                <div><dt>Kategori</dt><dd>{selectedProduct.category}</dd></div>
                <div><dt>Renkler</dt><dd>{selectedProduct.colors?.join(', ')}</dd></div>
                <div><dt>Ölçüler</dt><dd>{selectedProduct.sizes?.map((size) => typeof size === 'string' ? size : size.name).join(', ')}</dd></div>
                <div><dt>Durum</dt><dd>{selectedProduct.isAvailable ? 'Mağazada mevcut' : 'Stokta yok'}</dd></div>
              </dl>
            </section>
          </div>
          {selectedProduct.suggestedProducts?.length > 0 && (
            <section className="same-book-products">
              <div className="section-heading"><p>İlginizi çekebilir</p><h2>Benzer kumaş seçenekleri</h2></div>
              <ProductGrid products={selectedProduct.suggestedProducts} priorityCount={0} onOpen={(product) => navigate({ name: 'detail', productId: product.id, returnTo: 'products' })} />
            </section>
          )}
        </main>
      )}

      {routeName === 'detail' && !selectedProduct && (
        <main className="route-state">
          <p>{isDetailLoading || isLoading ? 'Yükleniyor' : 'Ürün bulunamadı'}</p>
          <h1>{isDetailLoading || isLoading ? 'Ürün bilgileri getiriliyor.' : 'Bu ürün artık mevcut olmayabilir.'}</h1>
          {!isDetailLoading && !isLoading && (
            <button className="button button-primary" type="button" onClick={() => navigate({ name: 'products' })}>MODELLERE DÖN</button>
          )}
        </main>
      )}

      {routeName === 'contact' && (
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

function ProductGrid({ onOpen, products, priorityCount = 3 }) {
  if (!products.length) return <div className="empty-state">Bu seçimlere uygun ürün bulunamadı.</div>

  return (
    <div className="product-grid">
      {products.map((product, index) => (
        <article className="product-card" key={product.id}>
          <button type="button" className="product-image" onClick={() => onOpen(product)}><ProductArtwork product={product} priority={index < priorityCount} /></button>
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

function RouteEffects() {
  const location = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    if (location.pathname === '/') document.title = 'Perdecim | Zonguldak Perde Modelleri'
    if (location.pathname.startsWith('/yonetim')) document.title = 'Yönetim | Perdecim'
    if (!['/', '/modeller', '/iletisim'].includes(location.pathname) && !location.pathname.startsWith('/modeller/') && !location.pathname.startsWith('/yonetim')) {
      document.title = 'Sayfa Bulunamadı | Perdecim'
    }

    if (location.hash) {
      window.requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView())
    } else if (navigationType !== 'POP') {
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
  }, [location.hash, location.pathname, navigationType])

  return null
}

function App() {
  return (
    <>
      <RouteEffects />
      <Routes>
        <Route path="/" element={<LandingRoute />} />
        <Route path="/modeller" element={<CatalogApp />} />
        <Route path="/modeller/:productId" element={<CatalogApp />} />
        <Route path="/iletisim" element={<CatalogApp />} />
        <Route path="/yonetim/*" element={<AdminPanel />} />
        <Route path="/products" element={<Navigate replace to="/modeller" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

function LandingRoute() {
  const navigateTo = useNavigate()

  function openProducts() {
    runPageTransition(() => navigateTo('/modeller'))
  }

  function openProduct(product) {
    runPageTransition(() => navigateTo(`/modeller/${product.id}`, { state: { from: '/' } }))
  }

  return (
    <LandingPage
      onOpenProduct={openProduct}
      onOpenProducts={openProducts}
    />
  )
}

function NotFoundPage() {
  const navigateTo = useNavigate()

  return (
    <main className="route-not-found">
      <p>404</p>
      <h1>Sayfa bulunamadı</h1>
      <span>Aradığınız sayfa kaldırılmış veya adresi değişmiş olabilir.</span>
      <button className="button button-primary" type="button" onClick={() => navigateTo('/')}>ANA SAYFAYA DÖN</button>
    </main>
  )
}

export default App

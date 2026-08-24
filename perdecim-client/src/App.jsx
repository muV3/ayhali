import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useNavigationType, useParams, useSearchParams } from 'react-router-dom'
import LandingPage from './LandingPage.jsx'
import AdminPanel from './AdminPanel.jsx'
import CustomerGalleryPage from './CustomerGalleryPage.jsx'
import PublicHeader from './PublicHeader.jsx'
import { getMainProductImage, getResponsiveImageAttributes } from './responsiveImages.js'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7237'
const CATALOG_PAGE_SIZE = 24

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

function readCatalogPage(searchParams) {
  const page = Number.parseInt(searchParams.get('sayfa') ?? '1', 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

function writeCatalogSearchParams(query, filters, page = 1) {
  const params = new URLSearchParams()
  if (query.trim()) params.set('q', query.trim())
  if (filters.category) params.set('kategori', filters.category)
  if (filters.color) params.set('renk', filters.color)
  if (filters.size) params.set('olcu', filters.size)
  if (filters.style) params.set('stil', filters.style)
  if (filters.material) params.set('materyal', filters.material)
  if (!filters.available) params.set('stok', 'tumu')
  if (filters.sort !== defaultCatalogFilters.sort) params.set('siralama', filters.sort)
  if (page > 1) params.set('sayfa', String(page))
  return params
}

function getLookupId(items, selectedName) {
  if (!selectedName) return null
  return items.find((item) => typeof item === 'object' && item.name === selectedName)?.id ?? null
}

function filterFallbackProducts(products, query, filters) {
  const search = query.trim().toLocaleLowerCase('tr-TR')
  return products
    .filter((product) => {
      const matchesSearch = !search || [product.name, product.code, product.description, product.category]
        .filter(Boolean)
        .some((value) => value.toLocaleLowerCase('tr-TR').includes(search))
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
  const [attributesLoaded, setAttributesLoaded] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [selectedProductDetail, setSelectedProductDetail] = useState(null)
  const query = searchParams.get('q') ?? ''
  const [debouncedQuery, setDebouncedQuery] = useState(query)
  const filterSignature = ['kategori', 'renk', 'olcu', 'stil', 'materyal', 'stok', 'siralama']
    .map((name) => searchParams.get(name) ?? '')
    .join('\u0000')
  const filters = useMemo(() => {
    const [category, color, size, style, material, stock, sort] = filterSignature.split('\u0000')
    return {
      category,
      color,
      size,
      style,
      material,
      available: stock !== 'tumu',
      sort: sort || defaultCatalogFilters.sort,
    }
  }, [filterSignature])
  const page = readCatalogPage(searchParams)

  function setQuery(nextQuery) {
    setSearchParams(writeCatalogSearchParams(nextQuery, filters), { replace: true })
  }

  function setFilters(update) {
    const nextFilters = typeof update === 'function' ? update(filters) : update
    setSearchParams(writeCatalogSearchParams(query, nextFilters), { replace: true })
  }

  function setPage(nextPage) {
    setSearchParams(writeCatalogSearchParams(query, filters, nextPage))
    window.requestAnimationFrame(() => document.querySelector('.catalog-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query), 250)
    return () => window.clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    let isMounted = true

    async function loadAttributes() {
      try {
        const [categories, colors, sizes, styles, materials] = await Promise.all([
          fetchJson('/api/categories'),
          fetchJson('/api/colors'),
          fetchJson('/api/sizes'),
          fetchJson('/api/styles'),
          fetchJson('/api/materials'),
        ])

        if (!isMounted) return
        setAttributes({ categories, colors, sizes, styles, materials })
      } catch {
        if (isMounted) setAttributes(fallbackAttributes)
      } finally {
        if (isMounted) setAttributesLoaded(true)
      }
    }

    loadAttributes()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!attributesLoaded) return undefined

    let isMounted = true

    async function loadProducts() {
      setIsLoading(true)
      try {
        const productQuery = new URLSearchParams({
          page: String(page),
          pageSize: String(CATALOG_PAGE_SIZE),
          sortBy: filters.sort,
        })
        if (debouncedQuery.trim()) productQuery.set('search', debouncedQuery.trim())
        if (filters.available) productQuery.set('isAvailable', 'true')

        const lookupFilters = [
          ['categoryId', attributes.categories, filters.category],
          ['colorId', attributes.colors, filters.color],
          ['sizeId', attributes.sizes, filters.size],
          ['styleId', attributes.styles, filters.style],
          ['materialId', attributes.materials, filters.material],
        ]
        lookupFilters.forEach(([parameter, items, selectedName]) => {
          const id = getLookupId(items, selectedName)
          if (id !== null) productQuery.set(parameter, String(id))
        })

        const result = await fetchJson(`/api/products?${productQuery}`)
        if (!isMounted) return

        const nextTotalCount = result.totalCount ?? 0
        const lastPage = Math.max(1, Math.ceil(nextTotalCount / CATALOG_PAGE_SIZE))
        if (page > lastPage) {
          setSearchParams(writeCatalogSearchParams(debouncedQuery, filters, lastPage), { replace: true })
          return
        }

        setProducts(result.items ?? [])
        setTotalCount(nextTotalCount)
      } catch {
        if (!isMounted) return
        const matchingProducts = filterFallbackProducts(fallbackProducts, debouncedQuery, filters)
        setProducts(matchingProducts.slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE))
        setTotalCount(matchingProducts.length)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadProducts()
    return () => { isMounted = false }
  }, [attributes, attributesLoaded, debouncedQuery, filters, page, setSearchParams])

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
      <PublicHeader />

      {routeName === 'products' && (
        <main className="catalog-layout">
          <CatalogFilters attributes={attributes} filters={filters} query={query} setFilters={setFilters} setQuery={setQuery} />
          <section className="catalog-results">
            <div className="section-heading inline">
              <div><p>{isLoading ? 'Yükleniyor' : `${totalCount} model`}</p><h2>Perde modelleri</h2></div>
            </div>
            <ProductGrid products={products} onOpen={(product) => navigate({ name: 'detail', productId: product.id, returnTo: 'products' })} />
            {!isLoading && (
              <CatalogPagination
                page={page}
                pageSize={CATALOG_PAGE_SIZE}
                totalCount={totalCount}
                onPageChange={setPage}
              />
            )}
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
              <span>Instagram: @halicimahmutay</span>
              <span>Çalışma saatleri: 09:00 - 19:00</span>
            </aside>
          </section>
        </main>
      )}

      <footer><span>Perdecim</span><span>Zonguldak'ta perde modelleri ve mağaza desteği.</span></footer>
    </div>
  )
}

function CatalogFilters({ attributes, filters, query, setFilters, setQuery }) {
  const [isExpanded, setIsExpanded] = useState(() => typeof window === 'undefined' || !window.matchMedia('(max-width: 900px)').matches)

  useEffect(() => {
    const mobileViewport = window.matchMedia('(max-width: 900px)')
    const syncExpandedState = (event) => setIsExpanded(!event.matches)

    mobileViewport.addEventListener('change', syncExpandedState)
    return () => mobileViewport.removeEventListener('change', syncExpandedState)
  }, [])

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }))
  }

  return (
    <aside className={`filters${isExpanded ? ' is-expanded' : ''}`}>
      <button
        className="filters-toggle"
        type="button"
        aria-controls="catalog-filter-fields"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((current) => !current)}
      >
        <span>Filtreler</span>
        <span className="filters-toggle-icon" aria-hidden="true" />
      </button>
      <div className="filters-panel">
        <div id="catalog-filter-fields" className="filters-panel-inner" aria-hidden={!isExpanded} inert={!isExpanded}>
          <label>Arama<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Model, kod veya renk" /></label>
          <SelectFilter label="Kategori" value={filters.category} options={attributes.categories} onChange={(value) => updateFilter('category', value)} />
          <SelectFilter label="Renk" value={filters.color} options={attributes.colors} onChange={(value) => updateFilter('color', value)} />
          <SelectFilter label="Ölçü" value={filters.size} options={attributes.sizes} onChange={(value) => updateFilter('size', value)} />
          <SelectFilter label="Stil" value={filters.style} options={attributes.styles} onChange={(value) => updateFilter('style', value)} />
          <SelectFilter label="Materyal" value={filters.material} options={attributes.materials} onChange={(value) => updateFilter('material', value)} />
          <label>Sıralama<select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)}><option value="featured">Öne çıkanlar</option><option value="nameAsc">İsim A-Z</option><option value="nameDesc">İsim Z-A</option></select></label>
          <label className="check-row"><input checked={filters.available} type="checkbox" onChange={(event) => updateFilter('available', event.target.checked)} />Sadece stoktakiler</label>
        </div>
      </div>
    </aside>
  )
}

function SelectFilter({ label, onChange, options, value }) {
  return (
    <label>{label}<select value={value} onChange={(event) => onChange(event.target.value)}><option value="">Tümü</option>{options.map((option) => {
      const optionName = typeof option === 'string' ? option : option.name
      return <option key={optionName} value={optionName}>{optionName}</option>
    })}</select></label>
  )
}

function CatalogPagination({ onPageChange, page, pageSize, totalCount }) {
  const totalPages = Math.ceil(totalCount / pageSize)
  if (totalPages <= 1) return null

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter((pageNumber) => pageNumber === 1 || pageNumber === totalPages || Math.abs(pageNumber - page) <= 1)
  const items = []
  pageNumbers.forEach((pageNumber, index) => {
    if (index > 0 && pageNumber - pageNumbers[index - 1] > 1) items.push(`ellipsis-${pageNumber}`)
    items.push(pageNumber)
  })

  return (
    <nav className="catalog-pagination" aria-label="Model sayfaları">
      <button disabled={page === 1} onClick={() => onPageChange(page - 1)} type="button">Önceki</button>
      <div>
        {items.map((item) => typeof item === 'number'
          ? <button className={item === page ? 'active' : ''} aria-current={item === page ? 'page' : undefined} key={item} onClick={() => onPageChange(item)} type="button">{item}</button>
          : <span aria-hidden="true" key={item}>…</span>)}
      </div>
      <button disabled={page === totalPages} onClick={() => onPageChange(page + 1)} type="button">Sonraki</button>
    </nav>
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
            <h3 title={product.name}>{product.name}</h3>
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
    if (location.pathname === '/musterilerimizden-gelenler') document.title = 'Müşterilerimizden Gelenler | Perdecim'
    if (location.pathname.startsWith('/yonetim')) document.title = 'Yönetim | Perdecim'
    if (!['/', '/modeller', '/iletisim', '/musterilerimizden-gelenler'].includes(location.pathname) && !location.pathname.startsWith('/modeller/') && !location.pathname.startsWith('/yonetim')) {
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
        <Route path="/musterilerimizden-gelenler" element={<CustomerGalleryPage />} />
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
    <div className="landing-page">
      <PublicHeader />
      <main className="route-not-found">
        <p>404</p>
        <h1>Sayfa bulunamadı</h1>
        <span>Aradığınız sayfa kaldırılmış veya adresi değişmiş olabilir.</span>
        <button className="button button-primary" type="button" onClick={() => navigateTo('/')}>ANA SAYFAYA DÖN</button>
      </main>
    </div>
  )
}

export default App

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest, resolveImageUrl } from './adminApi.js'
import { getResponsiveImageAttributes } from './responsiveImages.js'
import './AdminPanel.css'

const SESSION_KEY = 'perdecim-admin-session'
const ADMIN_PRODUCT_PAGE_SIZE = 60
const ADMIN_CUSTOMER_HOME_PAGE_SIZE = 9

const lookupGroups = [
  { key: 'categories', label: 'Kategoriler', singular: 'Kategori' },
  { key: 'colors', label: 'Renkler', singular: 'Renk' },
  { key: 'sizes', label: 'Ölçüler', singular: 'Ölçü' },
  { key: 'styles', label: 'Stiller', singular: 'Stil' },
  { key: 'materials', label: 'Materyaller', singular: 'Materyal' },
]

const emptyLookups = Object.fromEntries(lookupGroups.map(({ key }) => [key, []]))

function readSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY))
    if (!session?.token || new Date(session.expiresAtUtc).getTime() <= Date.now()) {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function getInitialForm() {
  return {
    name: '',
    code: '',
    description: '',
    categoryId: '',
    fabricSampleBookId: '',
    styleId: '',
    materialId: '',
    isAvailable: true,
    isFeatured: false,
    colorIds: [],
    sizes: {},
  }
}

export default function AdminPanel() {
  const [session, setSession] = useState(readSession)

  useEffect(() => {
    const previousTitle = document.title
    const robots = document.querySelector('meta[name="robots"]') ?? document.createElement('meta')
    const createdRobots = !robots.parentNode
    robots.setAttribute('name', 'robots')
    robots.setAttribute('content', 'noindex, nofollow, noarchive')
    if (createdRobots) document.head.appendChild(robots)
    document.title = 'Yönetim Paneli | Perdecim'

    return () => {
      document.title = previousTitle
      if (createdRobots) robots.remove()
    }
  }, [])

  useEffect(() => {
    if (!session) return undefined
    const remaining = new Date(session.expiresAtUtc).getTime() - Date.now()
    if (remaining <= 0) {
      setSession(null)
      return undefined
    }
    const timeout = window.setTimeout(() => {
      sessionStorage.removeItem(SESSION_KEY)
      setSession(null)
    }, remaining)
    return () => window.clearTimeout(timeout)
  }, [session])

  function handleLogin(nextSession) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
  }

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY)
    setSession(null)
  }

  return session
    ? <AdminWorkspace session={session} onLogout={handleLogout} />
    : <AdminLogin onLogin={handleLogin} />
}

function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const result = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      if (result.role !== 'Admin') throw new Error('Bu hesap yönetim yetkisine sahip değil.')
      onLogin(result)
    } catch (requestError) {
      setError(requestError.status === 401
        ? 'E-posta veya şifre hatalı.'
        : requestError.message || 'Giriş yapılamadı. Lütfen tekrar deneyin.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <a className="admin-login-brand" href="/" aria-label="Perdecim ana sayfasına dön">
          <span className="admin-brand-mark">P</span>
          <span><strong>Perdecim</strong><small>Yönetim paneli</small></span>
        </a>
        <div className="admin-login-copy">
          <p className="admin-eyebrow">Yetkili erişimi</p>
          <h1 id="admin-login-title">Tekrar hoş geldiniz.</h1>
          <p>Ürünleri ve showroom bilgilerini yönetmek için hesabınızla giriş yapın.</p>
        </div>
        <form className="admin-login-form" onSubmit={handleSubmit}>
          {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
          <label className="admin-field">
            <span>E-posta adresi</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="yonetici@perdecim.com"
              required
              autoFocus
            />
          </label>
          <label className="admin-field">
            <span>Şifre</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Şifrenizi girin"
              required
            />
          </label>
          <button className="admin-button admin-button-primary admin-button-wide" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Giriş yapılıyor…' : 'Giriş yap'}
          </button>
        </form>
        <p className="admin-login-note">Bu alan yalnızca yetkili mağaza çalışanları içindir.</p>
      </section>
    </main>
  )
}

function AdminWorkspace({ session, onLogout }) {
  const [section, setSection] = useState('products')
  const [lookups, setLookups] = useState(emptyLookups)
  const [lookupsLoading, setLookupsLoading] = useState(true)
  const [sampleBooks, setSampleBooks] = useState([])
  const [sampleBooksLoading, setSampleBooksLoading] = useState(true)
  const [customerHomeImages, setCustomerHomeImages] = useState([])
  const [customerHomeImagesLoading, setCustomerHomeImagesLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const request = useMemo(() => (path, options = {}) => apiRequest(path, {
    ...options,
    token: session.token,
    onUnauthorized: onLogout,
  }), [onLogout, session.token])

  const showToast = useCallback((message, tone = 'success') => {
    setToast({ message, tone })
  }, [])

  const loadLookups = useCallback(async () => {
    setLookupsLoading(true)
    try {
      const results = await Promise.all(lookupGroups.map(({ key }) => request(`/api/${key}`)))
      setLookups(Object.fromEntries(lookupGroups.map(({ key }, index) => [key, results[index]])))
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setLookupsLoading(false)
    }
  }, [request, showToast])

  const loadSampleBooks = useCallback(async () => {
    setSampleBooksLoading(true)
    try {
      setSampleBooks(await request('/api/fabric-sample-books'))
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSampleBooksLoading(false)
    }
  }, [request, showToast])

  const loadCustomerHomeImages = useCallback(async () => {
    setCustomerHomeImagesLoading(true)
    try {
      setCustomerHomeImages(await request('/api/customer-home-images'))
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setCustomerHomeImagesLoading(false)
    }
  }, [request, showToast])

  useEffect(() => {
    loadLookups()
  }, [loadLookups])

  useEffect(() => {
    loadSampleBooks()
  }, [loadSampleBooks])

  useEffect(() => {
    loadCustomerHomeImages()
  }, [loadCustomerHomeImages])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <a className="admin-sidebar-brand" href="/" aria-label="Perdecim ana sayfası">
          <span className="admin-brand-mark">P</span>
          <span><strong>Perdecim</strong><small>Yönetim</small></span>
        </a>
        <nav className="admin-nav" aria-label="Yönetim menüsü">
          <button className={section === 'products' ? 'active' : ''} onClick={() => setSection('products')} type="button">
            <span className="admin-nav-symbol" aria-hidden="true">▦</span>
            Ürünler
          </button>
          <button className={section === 'customer-homes' ? 'active' : ''} onClick={() => setSection('customer-homes')} type="button">
            <span className="admin-nav-symbol" aria-hidden="true">▧</span>
            Müşterilerimizden
          </button>
          <button className={section === 'attributes' ? 'active' : ''} onClick={() => setSection('attributes')} type="button">
            <span className="admin-nav-symbol" aria-hidden="true">◇</span>
            Özellikler
          </button>
          <button className={section === 'sample-books' ? 'active' : ''} onClick={() => setSection('sample-books')} type="button">
            <span className="admin-nav-symbol" aria-hidden="true">▤</span>
            Kartelalar
          </button>
        </nav>
        <div className="admin-sidebar-footer">
          <span className="admin-avatar">{session.email.slice(0, 1).toUpperCase()}</span>
          <span className="admin-account"><strong>Yönetici</strong><small>{session.email}</small></span>
          <button className="admin-icon-button" onClick={onLogout} type="button" aria-label="Çıkış yap" title="Çıkış yap">↗</button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-mobile-header">
          <a className="admin-sidebar-brand" href="/"><span className="admin-brand-mark">P</span><strong>Perdecim</strong></a>
          <button className="admin-text-button" onClick={onLogout} type="button">Çıkış</button>
        </header>
        <div className="admin-mobile-nav" role="navigation" aria-label="Yönetim menüsü">
          <button className={section === 'products' ? 'active' : ''} onClick={() => setSection('products')} type="button">Ürünler</button>
          <button className={section === 'customer-homes' ? 'active' : ''} onClick={() => setSection('customer-homes')} type="button">Müşterilerimizden</button>
          <button className={section === 'sample-books' ? 'active' : ''} onClick={() => setSection('sample-books')} type="button">Kartelalar</button>
          <button className={section === 'attributes' ? 'active' : ''} onClick={() => setSection('attributes')} type="button">Özellikler</button>
        </div>

        {section === 'products' && (
          <ProductsManager
            lookups={lookups}
            lookupsLoading={lookupsLoading}
            sampleBooks={sampleBooks}
            sampleBooksLoading={sampleBooksLoading}
            request={request}
            showToast={showToast}
          />
        )}
        {section === 'sample-books' && (
          <SampleBooksManager
            sampleBooks={sampleBooks}
            isLoading={sampleBooksLoading}
            refreshSampleBooks={loadSampleBooks}
            request={request}
            showToast={showToast}
          />
        )}
        {section === 'customer-homes' && (
          <CustomerHomeImagesManager
            images={customerHomeImages}
            isLoading={customerHomeImagesLoading}
            setImages={setCustomerHomeImages}
            refreshImages={loadCustomerHomeImages}
            request={request}
            showToast={showToast}
          />
        )}
        {section === 'attributes' && (
          <AttributesManager
            lookups={lookups}
            lookupsLoading={lookupsLoading}
            refreshLookups={loadLookups}
            request={request}
            showToast={showToast}
          />
        )}
      </div>
      {toast && <div className={`admin-toast ${toast.tone}`} role="status">{toast.message}</div>}
    </div>
  )
}

function ProductsManager({ lookups, lookupsLoading, sampleBooks, sampleBooksLoading, request, showToast }) {
  const [products, setProducts] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [availability, setAvailability] = useState('all')
  const [page, setPage] = useState(1)
  const [editorProduct, setEditorProduct] = useState(undefined)
  const latestRequestRef = useRef(0)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => window.clearTimeout(timeout)
  }, [search])

  const loadProducts = useCallback(async () => {
    const requestId = latestRequestRef.current + 1
    latestRequestRef.current = requestId
    setIsLoading(true)
    try {
      const query = new URLSearchParams({
        page: String(page),
        pageSize: String(ADMIN_PRODUCT_PAGE_SIZE),
        sortBy: 'newest',
      })
      if (debouncedSearch) query.set('search', debouncedSearch)
      if (availability !== 'all') query.set('isAvailable', String(availability === 'available'))

      const result = await request(`/api/products?${query}`)
      if (requestId !== latestRequestRef.current) return

      const nextTotalCount = result.totalCount ?? 0
      const lastPage = Math.max(1, Math.ceil(nextTotalCount / ADMIN_PRODUCT_PAGE_SIZE))
      if (page > lastPage) {
        setPage(lastPage)
        return
      }
      setProducts(result.items ?? [])
      setTotalCount(nextTotalCount)
    } catch (error) {
      if (requestId === latestRequestRef.current) showToast(error.message, 'error')
    } finally {
      if (requestId === latestRequestRef.current) setIsLoading(false)
    }
  }, [availability, debouncedSearch, page, request, showToast])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const hasFilters = Boolean(debouncedSearch) || availability !== 'all'
  const totalPages = Math.max(1, Math.ceil(totalCount / ADMIN_PRODUCT_PAGE_SIZE))
  const firstVisibleProduct = totalCount ? ((page - 1) * ADMIN_PRODUCT_PAGE_SIZE) + 1 : 0
  const lastVisibleProduct = Math.min(page * ADMIN_PRODUCT_PAGE_SIZE, totalCount)

  async function deleteProduct(product) {
    if (!window.confirm(`“${product.name}” ürününü ve görsellerini kalıcı olarak silmek istiyor musunuz?`)) return
    try {
      await request(`/api/products/${product.id}`, { method: 'DELETE' })
      showToast('Ürün silindi.')
      await loadProducts()
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  return (
    <main className="admin-content">
      <div className="admin-page-heading">
        <div><p className="admin-eyebrow">Showroom kataloğu</p><h1>Ürünler</h1><span>{totalCount} {hasFilters ? 'ürün bulundu' : 'ürün kayıtlı'}</span></div>
        <button className="admin-button admin-button-primary" onClick={() => setEditorProduct(null)} type="button"><span aria-hidden="true">＋</span> Yeni ürün</button>
      </div>

      <section className="admin-panel-card">
        <div className="admin-toolbar">
          <label className="admin-search">
            <span className="sr-only">Ürün ara</span>
            <span aria-hidden="true">⌕</span>
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Ürün adı, kod, kategori veya kartela ara" />
          </label>
          <label className="admin-compact-select">
            <span className="sr-only">Stok durumu</span>
            <select value={availability} onChange={(event) => { setAvailability(event.target.value); setPage(1) }}>
              <option value="all">Tüm durumlar</option>
              <option value="available">Satışta</option>
              <option value="unavailable">Stokta yok</option>
            </select>
          </label>
        </div>

        {isLoading ? (
          <LoadingRows />
        ) : products.length ? (
          <>
            <div className="admin-product-table-wrap">
              <table className="admin-product-table">
              <thead><tr><th>Ürün</th><th>Kartela</th><th>Kategori</th><th>Durum</th><th><span className="sr-only">İşlemler</span></th></tr></thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="admin-product-cell">
                        <ProductThumbnail product={product} />
                        <span><strong>{product.name}</strong><small>{product.code}</small></span>
                      </div>
                    </td>
                    <td data-label="Kartela">{product.fabricSampleBookName}</td>
                    <td data-label="Kategori">{product.category}</td>
                    <td data-label="Durum"><span className={`admin-status ${product.isAvailable ? 'available' : 'unavailable'}`}>{product.isAvailable ? 'Satışta' : 'Stokta yok'}</span>{product.isFeatured && <span className="admin-featured">Öne çıkan</span>}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button onClick={() => setEditorProduct(product)} type="button">Düzenle</button>
                        <button className="danger" onClick={() => deleteProduct(product)} type="button" aria-label={`${product.name} ürününü sil`}>Sil</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <nav className="admin-pagination" aria-label="Ürün sayfaları">
                <span>{firstVisibleProduct}–{lastVisibleProduct} / {totalCount}</span>
                <div>
                  <button disabled={page === 1} onClick={() => setPage((current) => current - 1)} type="button">Önceki</button>
                  <span>Sayfa {page} / {totalPages}</span>
                  <button disabled={page === totalPages} onClick={() => setPage((current) => current + 1)} type="button">Sonraki</button>
                </div>
              </nav>
            )}
          </>
        ) : (
          <div className="admin-empty-state">
            <span aria-hidden="true">▦</span>
            <h2>{hasFilters ? 'Aramanızla eşleşen ürün yok' : 'Henüz ürün eklenmemiş'}</h2>
            <p>{hasFilters ? 'Arama metnini veya durum filtresini değiştirin.' : 'İlk showroom ürününüzü ekleyerek başlayın.'}</p>
            {!hasFilters && <button className="admin-button admin-button-primary" onClick={() => setEditorProduct(null)} type="button">İlk ürünü ekle</button>}
          </div>
        )}
      </section>

      {editorProduct !== undefined && (
        <ProductEditor
          product={editorProduct}
          lookups={lookups}
          lookupsLoading={lookupsLoading}
          sampleBooks={sampleBooks}
          sampleBooksLoading={sampleBooksLoading}
          request={request}
          onClose={() => setEditorProduct(undefined)}
          onSaved={async (message) => {
            setEditorProduct(undefined)
            showToast(message)
            await loadProducts()
          }}
          showToast={showToast}
        />
      )}
    </main>
  )
}

function ProductThumbnail({ product }) {
  return product.mainImageUrl
    ? <img className="admin-product-thumb" src={resolveImageUrl(product.mainImageSmallUrl ?? product.mainImageUrl)} alt="" width="54" height="54" loading="lazy" decoding="async" />
    : <span className="admin-product-thumb admin-product-placeholder" aria-hidden="true">P</span>
}

function LoadingRows() {
  return <div className="admin-loading-list" aria-label="Ürünler yükleniyor">{[1, 2, 3, 4].map((item) => <span key={item} />)}</div>
}

function ProductEditor({ product, lookups, lookupsLoading, sampleBooks, sampleBooksLoading, request, onClose, onSaved, showToast }) {
  const [form, setForm] = useState(getInitialForm)
  const [detail, setDetail] = useState(null)
  const [queuedImages, setQueuedImages] = useState([])
  const [isLoading, setIsLoading] = useState(Boolean(product))
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const dialogRef = useRef(null)

  useEffect(() => {
    document.body.classList.add('admin-modal-open')
    dialogRef.current?.focus()
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.classList.remove('admin-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  useEffect(() => {
    if (!product) return
    let isMounted = true
    async function loadDetail() {
      try {
        const result = await request(`/api/products/${product.id}`)
        if (!isMounted) return
        setDetail(result)
        setForm({
          name: result.name,
          code: result.code,
          description: result.description ?? '',
          categoryId: String(lookups.categories.find((item) => item.name === result.category)?.id ?? ''),
          fabricSampleBookId: String(result.fabricSampleBook?.id ?? ''),
          styleId: String(lookups.styles.find((item) => item.name === result.style)?.id ?? ''),
          materialId: String(lookups.materials.find((item) => item.name === result.material)?.id ?? ''),
          isAvailable: result.isAvailable,
          isFeatured: result.isFeatured,
          colorIds: lookups.colors.filter((item) => result.colors.includes(item.name)).map((item) => item.id),
          sizes: Object.fromEntries(result.sizes.map((size) => [
            lookups.sizes.find((item) => item.name === size.name)?.id,
            String(size.stockQuantity),
          ]).filter(([id]) => id)),
        })
      } catch (error) {
        setFormError(error.message)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    if (!lookupsLoading) loadDetail()
    return () => { isMounted = false }
  }, [lookups.categories, lookups.colors, lookups.materials, lookups.sizes, lookups.styles, lookupsLoading, product, request])

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  function toggleColor(colorId) {
    setForm((current) => ({
      ...current,
      colorIds: current.colorIds.includes(colorId)
        ? current.colorIds.filter((id) => id !== colorId)
        : [...current.colorIds, colorId],
    }))
  }

  function toggleSize(sizeId) {
    setForm((current) => {
      const sizes = { ...current.sizes }
      if (Object.hasOwn(sizes, sizeId)) delete sizes[sizeId]
      else sizes[sizeId] = '0'
      return { ...current, sizes }
    })
  }

  function addImages(files) {
    const accepted = Array.from(files).filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 10 * 1024 * 1024)
    if (accepted.length !== files.length) showToast('Bazı dosyalar desteklenmedi. JPG, PNG veya WebP ve en fazla 10 MB olmalı.', 'error')
    setQueuedImages((current) => [...current, ...accepted])
  }

  async function refreshDetail(productId) {
    const result = await request(`/api/products/${productId}`)
    setDetail(result)
  }

  async function setMainImage(imageId) {
    try {
      await request(`/api/products/${product.id}/images/${imageId}/main`, { method: 'PUT' })
      await refreshDetail(product.id)
      showToast('Kapak görseli güncellendi.')
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  async function deleteImage(image) {
    if (!window.confirm('Bu görseli kalıcı olarak silmek istiyor musunuz?')) return
    try {
      await request(`/api/products/${product.id}/images/${image.id}`, { method: 'DELETE' })
      await refreshDetail(product.id)
      showToast('Görsel silindi.')
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  function validateForm() {
    if (!form.name.trim() || !form.code.trim() || !form.categoryId || !form.fabricSampleBookId) return 'Ad, ürün kodu, kategori ve kartela alanları zorunludur.'
    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationError = validateForm()
    if (validationError) {
      setFormError(validationError)
      return
    }

    setFormError('')
    setIsSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        description: form.description.trim() || null,
        categoryId: Number(form.categoryId),
        fabricSampleBookId: Number(form.fabricSampleBookId),
        styleId: form.styleId ? Number(form.styleId) : null,
        materialId: form.materialId ? Number(form.materialId) : null,
        isAvailable: form.isAvailable,
        isFeatured: form.isFeatured,
        colorIds: form.colorIds,
        sizes: Object.entries(form.sizes).map(([sizeId, stockQuantity]) => ({ sizeId: Number(sizeId), stockQuantity: Number(stockQuantity) || 0 })),
      }
      const saved = await request(product ? `/api/products/${product.id}` : '/api/products', {
        method: product ? 'PUT' : 'POST',
        body: payload,
      })

      const uploadFailures = []
      for (const [index, file] of queuedImages.entries()) {
        const imageBody = new FormData()
        imageBody.append('file', file)
        imageBody.append('isMainImage', String(!product && index === 0 && !(saved.images?.length)))
        imageBody.append('displayOrder', String((saved.images?.length ?? 0) + index))
        try {
          await request(`/api/products/${saved.id}/images`, { method: 'POST', body: imageBody })
        } catch {
          uploadFailures.push(file.name)
        }
      }

      onSaved(uploadFailures.length
        ? `Ürün kaydedildi; ${uploadFailures.length} görsel yüklenemedi. Düzenleyerek tekrar deneyebilirsiniz.`
        : product ? 'Ürün güncellendi.' : 'Yeni ürün showroom’a eklendi.')
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="admin-editor" role="dialog" aria-modal="true" aria-labelledby="product-editor-title" tabIndex="-1" ref={dialogRef}>
        <header className="admin-editor-header">
          <div><p className="admin-eyebrow">{product ? 'Ürün düzenle' : 'Yeni ürün'}</p><h2 id="product-editor-title">{product ? product.name : 'Showroom’a ürün ekle'}</h2></div>
          <button className="admin-close-button" type="button" onClick={onClose} aria-label="Pencereyi kapat">×</button>
        </header>

        {isLoading || lookupsLoading || sampleBooksLoading ? <div className="admin-editor-loading">Ürün bilgileri hazırlanıyor…</div> : (
          <form onSubmit={handleSubmit}>
            <div className="admin-editor-body">
              {formError && <div className="admin-alert admin-alert-error admin-form-alert" role="alert">{formError}</div>}

              <FormSection title="Temel bilgiler" description="Müşterilerin ürün kartında ve detay sayfasında göreceği bilgiler.">
                <div className="admin-form-grid">
                  <label className="admin-field admin-field-span-2"><span>Ürün adı *</span><input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Örn. Keten dokulu bej fon perde" required /></label>
                  <label className="admin-field"><span>Ürün kodu *</span><input value={form.code} onChange={(event) => updateField('code', event.target.value)} placeholder="PRD-1024" required /></label>
                  <label className="admin-field"><span>Kategori *</span><select value={form.categoryId} onChange={(event) => updateField('categoryId', event.target.value)} required><option value="">Kategori seçin</option>{lookups.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                  <label className="admin-field admin-field-span-2"><span>Kartela *</span><select value={form.fabricSampleBookId} onChange={(event) => updateField('fabricSampleBookId', event.target.value)} required><option value="">Kartela seçin</option>{sampleBooks.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><small className="admin-field-help">Ürün, seçilen fiziksel kumaş kartelasıyla ilişkilendirilir.</small></label>
                  <label className="admin-field"><span>Stil</span><select value={form.styleId} onChange={(event) => updateField('styleId', event.target.value)}><option value="">Stil seçilmedi</option>{lookups.styles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                  <label className="admin-field"><span>Materyal</span><select value={form.materialId} onChange={(event) => updateField('materialId', event.target.value)}><option value="">Materyal seçilmedi</option>{lookups.materials.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                  <label className="admin-field admin-field-span-2"><span>Açıklama</span><textarea value={form.description} onChange={(event) => updateField('description', event.target.value)} rows="4" placeholder="Kumaş, kullanım alanı ve öne çıkan özellikleri kısaca anlatın." /></label>
                </div>
              </FormSection>

              <FormSection title="Görünürlük" description="Satış durumunu ve ürünün ana sayfada öne çıkıp çıkmayacağını belirleyin.">
                <div className="admin-switch-grid">
                  <Switch checked={form.isAvailable} label="Satışta" description="Ürün showroom’da mevcut olarak görünür." onChange={(value) => updateField('isAvailable', value)} />
                  <Switch checked={form.isFeatured} label="Öne çıkar" description="Ürün ana sayfadaki seçkide yer alabilir." onChange={(value) => updateField('isFeatured', value)} />
                </div>
              </FormSection>

              <FormSection title="Renkler ve ölçüler" description="Birden fazla renk ve ölçü seçebilirsiniz.">
                <fieldset className="admin-option-fieldset"><legend>Renkler</legend><div className="admin-chip-options">{lookups.colors.map((color) => <label key={color.id} className={form.colorIds.includes(color.id) ? 'selected' : ''}><input type="checkbox" checked={form.colorIds.includes(color.id)} onChange={() => toggleColor(color.id)} /><span>{color.name}</span></label>)}</div></fieldset>
                <fieldset className="admin-option-fieldset"><legend>Ölçü ve stok</legend><div className="admin-size-options">{lookups.sizes.map((size) => { const selected = Object.hasOwn(form.sizes, size.id); return <div className={selected ? 'selected' : ''} key={size.id}><label><input type="checkbox" checked={selected} onChange={() => toggleSize(size.id)} /><span>{size.name}</span></label>{selected && <label className="admin-stock-input"><span>Adet</span><input type="number" min="0" value={form.sizes[size.id]} onChange={(event) => setForm((current) => ({ ...current, sizes: { ...current.sizes, [size.id]: event.target.value } }))} /></label>}</div> })}</div></fieldset>
              </FormSection>

              <FormSection title="Ürün görselleri" description="İlk görsel yeni ürünün kapak görseli olur. JPG, PNG veya WebP; en fazla 10 MB. Görseller otomatik olarak WebP'ye dönüştürülür.">
                {detail?.images?.length > 0 && <div className="admin-existing-images">{detail.images.map((image) => { const attributes = getResponsiveImageAttributes(image, resolveImageUrl); return <article className={image.isMainImage ? 'main' : ''} key={image.id}><img {...attributes} sizes={attributes.srcSet ? '(max-width: 700px) 50vw, 240px' : undefined} alt="Ürün görseli" width="4" height="3" loading="lazy" decoding="async" /><div>{image.isMainImage ? <span>Kapak</span> : <button type="button" onClick={() => setMainImage(image.id)}>Kapak yap</button>}<button className="danger" type="button" onClick={() => deleteImage(image)}>Sil</button></div></article> })}</div>}
                <label className="admin-upload-zone">
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { addImages(event.target.files); event.target.value = '' }} />
                  <span className="admin-upload-symbol" aria-hidden="true">＋</span>
                  <strong>Görsel seçin</strong>
                  <small>Bilgisayarınızdan bir veya birden fazla fotoğraf ekleyin</small>
                </label>
                {queuedImages.length > 0 && <QueuedImageList files={queuedImages} onRemove={(index) => setQueuedImages((current) => current.filter((_, itemIndex) => itemIndex !== index))} />}
              </FormSection>
            </div>
            <footer className="admin-editor-footer">
              <button className="admin-button admin-button-secondary" type="button" onClick={onClose}>Vazgeç</button>
              <button className="admin-button admin-button-primary" disabled={isSaving} type="submit">{isSaving ? 'Kaydediliyor…' : product ? 'Değişiklikleri kaydet' : 'Ürünü yayınla'}</button>
            </footer>
          </form>
        )}
      </section>
    </div>
  )
}

function FormSection({ title, description, children }) {
  return <section className="admin-form-section"><div className="admin-form-section-heading"><h3>{title}</h3><p>{description}</p></div><div className="admin-form-section-content">{children}</div></section>
}

function Switch({ checked, description, label, onChange }) {
  return <label className="admin-switch"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span className="admin-switch-control" aria-hidden="true" /><span><strong>{label}</strong><small>{description}</small></span></label>
}

function QueuedImageList({ files, onRemove }) {
  return <div className="admin-queued-images">{files.map((file, index) => <QueuedImage file={file} index={index} key={`${file.name}-${file.lastModified}-${index}`} onRemove={onRemove} />)}</div>
}

function QueuedImage({ file, index, onRemove }) {
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl])
  return <article><img src={previewUrl} alt="Yüklenecek görsel önizlemesi" /><span><strong>{file.name}</strong><small>{formatFileSize(file.size)}</small></span><button type="button" onClick={() => onRemove(index)} aria-label={`${file.name} görselini kaldır`}>×</button></article>
}

function getCustomerHomeImage(image) {
  return {
    url: image.imageUrl,
    smallUrl: image.imageSmallUrl,
    mediumUrl: image.imageMediumUrl,
    largeUrl: image.imageLargeUrl,
    smallWidth: image.imageSmallWidth,
    mediumWidth: image.imageMediumWidth,
    largeWidth: image.imageLargeWidth,
  }
}

function CustomerHomeImage({ image, index }) {
  const attributes = getResponsiveImageAttributes(getCustomerHomeImage(image), resolveImageUrl)
  return <img {...attributes} sizes={attributes.srcSet ? '(max-width: 680px) calc(100vw - 48px), (max-width: 1100px) 50vw, 320px' : undefined} alt={`Müşteri evinden perde uygulaması ${index + 1}`} width="3" height="4" loading="lazy" decoding="async" />
}

function CustomerHomeImagesManager({ images, isLoading, setImages, refreshImages, request, showToast }) {
  const [isUploading, setIsUploading] = useState(false)
  const [isReordering, setIsReordering] = useState(false)
  const [updatingFavoriteId, setUpdatingFavoriteId] = useState(null)
  const [page, setPage] = useState(1)
  const fileInputRef = useRef(null)
  const pageHeadingRef = useRef(null)
  const favoriteCount = images.filter((image) => image.isFavorite).length
  const totalPages = Math.max(1, Math.ceil(images.length / ADMIN_CUSTOMER_HOME_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const firstImageIndex = (currentPage - 1) * ADMIN_CUSTOMER_HOME_PAGE_SIZE
  const visibleImages = images.slice(firstImageIndex, firstImageIndex + ADMIN_CUSTOMER_HOME_PAGE_SIZE)

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage)
  }, [currentPage, page])

  async function uploadImages(files) {
    const selectedFiles = Array.from(files)
    if (!selectedFiles.length) return

    const invalidFile = selectedFiles.find((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024)
    if (invalidFile) {
      showToast('JPG, PNG veya WebP biçiminde ve en fazla 10 MB görseller seçin.', 'error')
      return
    }

    setIsUploading(true)
    let uploadedCount = 0
    try {
      for (const file of selectedFiles) {
        const body = new FormData()
        body.append('file', file)
        await request('/api/customer-home-images', { method: 'POST', body })
        uploadedCount++
      }
      showToast(`${uploadedCount} müşteri görseli eklendi.`)
    } catch (error) {
      showToast(uploadedCount ? `${uploadedCount} görsel eklendi; kalan yükleme durdu: ${error.message}` : error.message, 'error')
    } finally {
      setIsUploading(false)
      await refreshImages()
    }
  }

  async function toggleFavorite(image) {
    setUpdatingFavoriteId(image.id)
    try {
      const updatedImage = await request(`/api/customer-home-images/${image.id}/favorite`, {
        method: 'PUT',
        body: { isFavorite: !image.isFavorite },
      })
      setImages((currentImages) => currentImages.map((currentImage) => (
        currentImage.id === updatedImage.id ? { ...currentImage, ...updatedImage } : currentImage
      )))
      showToast(image.isFavorite ? 'Görsel favorilerden çıkarıldı.' : 'Görsel ana sayfa favorilerine eklendi.')
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setUpdatingFavoriteId(null)
    }
  }

  async function deleteImage(image) {
    if (!window.confirm('Bu müşteri görselini kalıcı olarak silmek istiyor musunuz?')) return
    try {
      await request(`/api/customer-home-images/${image.id}`, { method: 'DELETE' })
      setImages((currentImages) => currentImages
        .filter((currentImage) => currentImage.id !== image.id)
        .map((currentImage, index) => ({ ...currentImage, displayOrder: index })))
      showToast('Müşteri görseli silindi.')
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  async function moveImage(index, direction) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= images.length || isReordering) return

    const reordered = [...images]
    ;[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]]
    setIsReordering(true)
    try {
      const updatedImages = await request('/api/customer-home-images/order', {
        method: 'PUT',
        body: { imageIds: reordered.map((image) => image.id) },
      })
      setImages(updatedImages)
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setIsReordering(false)
    }
  }

  function changePage(nextPage) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === currentPage) return
    setPage(nextPage)
    window.requestAnimationFrame(() => {
      pageHeadingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <main className="admin-content">
      <div className="admin-page-heading admin-customer-home-heading" ref={pageHeadingRef}>
        <div><p className="admin-eyebrow">Müşteri evleri fotoğraf galerisi</p><h1>Müşterilerimizden</h1><span>{images.length} görsel · {favoriteCount} / 10 favori</span></div>
        <input ref={fileInputRef} className="admin-visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={isUploading} onChange={(event) => { uploadImages(event.target.files); event.target.value = '' }} />
        <button className="admin-button admin-button-primary" disabled={isUploading} onClick={() => fileInputRef.current?.click()} type="button"><span aria-hidden="true">＋</span> {isUploading ? 'Yükleniyor…' : 'Görsel ekle'}</button>
      </div>

      {isLoading ? <section className="admin-panel-card"><LoadingRows /></section> : images.length ? (
        <>
          <section className="admin-customer-home-grid" aria-label="Müşteri görselleri">
            {visibleImages.map((image, pageIndex) => {
              const imageIndex = firstImageIndex + pageIndex
              return (
                <article className="admin-customer-home-card" key={image.id}>
                  <div className="admin-customer-home-media">
                    <CustomerHomeImage image={image} index={imageIndex} />
                  </div>
                  <div className="admin-customer-home-card-body">
                    <strong>{imageIndex + 1}. görsel</strong>
                    <div className="admin-row-actions">
                      <button className={`favorite${image.isFavorite ? ' active' : ''}`} type="button" disabled={updatingFavoriteId === image.id || (!image.isFavorite && favoriteCount >= 10)} onClick={() => toggleFavorite(image)} aria-label={image.isFavorite ? `${imageIndex + 1}. görseli favorilerden çıkar` : `${imageIndex + 1}. görseli favorilere ekle`} aria-pressed={image.isFavorite}>★ <span>{image.isFavorite ? 'Favori' : 'Favorile'}</span></button>
                      <button type="button" disabled={imageIndex === 0 || isReordering} onClick={() => moveImage(imageIndex, -1)} aria-label={`${imageIndex + 1}. görseli önceye taşı`}>←</button>
                      <button type="button" disabled={imageIndex === images.length - 1 || isReordering} onClick={() => moveImage(imageIndex, 1)} aria-label={`${imageIndex + 1}. görseli sonraya taşı`}>→</button>
                      <button className="danger" type="button" onClick={() => deleteImage(image)}>Sil</button>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>
          {totalPages > 1 && (
            <nav className="admin-pagination admin-customer-home-pagination" aria-label="Müşteri görseli sayfaları">
              <span>{firstImageIndex + 1}–{Math.min(firstImageIndex + ADMIN_CUSTOMER_HOME_PAGE_SIZE, images.length)} / {images.length}</span>
              <div>
                <button disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)} type="button">Önceki</button>
                <span>Sayfa {currentPage} / {totalPages}</span>
                <button disabled={currentPage === totalPages} onClick={() => changePage(currentPage + 1)} type="button">Sonraki</button>
              </div>
            </nav>
          )}
        </>
      ) : (
        <section className="admin-panel-card admin-empty-state">
          <span aria-hidden="true">▧</span>
          <h2>Henüz müşteri görseli eklenmemiş</h2>
          <p>Müşteri evlerinden fotoğraflar ekleyerek ana sayfadaki galeriyi yayınlayın.</p>
          <button className="admin-button admin-button-primary" onClick={() => fileInputRef.current?.click()} type="button">İlk görselleri ekle</button>
        </section>
      )}
    </main>
  )
}

function getSampleBookImage(sampleBook) {
  if (!sampleBook.imageUrl) return null
  return {
    url: sampleBook.imageUrl,
    smallUrl: sampleBook.imageSmallUrl,
    mediumUrl: sampleBook.imageMediumUrl,
    largeUrl: sampleBook.imageLargeUrl,
    smallWidth: sampleBook.imageSmallWidth,
    mediumWidth: sampleBook.imageMediumWidth,
    largeWidth: sampleBook.imageLargeWidth,
  }
}

function SampleBookImage({ sampleBook, className = '' }) {
  const image = getSampleBookImage(sampleBook)
  if (!image) return <div className={`${className} admin-sample-book-placeholder`} aria-hidden="true">▤</div>
  const attributes = getResponsiveImageAttributes(image, resolveImageUrl)
  return <img className={className} {...attributes} sizes={attributes.srcSet ? '(max-width: 700px) calc(100vw - 56px), 360px' : undefined} alt={`${sampleBook.name} kartelası`} width="4" height="5" loading="lazy" decoding="async" />
}

function SampleBooksManager({ sampleBooks, isLoading, refreshSampleBooks, request, showToast }) {
  const [editor, setEditor] = useState(undefined)

  async function deleteSampleBook(sampleBook) {
    if (!window.confirm(`“${sampleBook.name}” kartelasını kalıcı olarak silmek istiyor musunuz?`)) return
    try {
      await request(`/api/fabric-sample-books/${sampleBook.id}`, { method: 'DELETE' })
      showToast('Kartela silindi.')
      await refreshSampleBooks()
    } catch (error) {
      showToast(error.status === 409 ? 'Bu kartelaya bağlı ürünler var. Önce ürünleri başka bir kartelaya taşıyın.' : error.message, 'error')
    }
  }

  return (
    <main className="admin-content">
      <div className="admin-page-heading">
        <div><p className="admin-eyebrow">Fiziksel mağaza koleksiyonları</p><h1>Kartelalar</h1><span>{sampleBooks.length} kartela kayıtlı</span></div>
        <button className="admin-button admin-button-primary" onClick={() => setEditor(null)} type="button"><span aria-hidden="true">＋</span> Yeni kartela</button>
      </div>

      {isLoading ? <section className="admin-panel-card"><LoadingRows /></section> : sampleBooks.length ? (
        <section className="admin-sample-book-grid">
          {sampleBooks.map((sampleBook) => (
            <article className="admin-sample-book-card" key={sampleBook.id}>
              <SampleBookImage className="admin-sample-book-cover" sampleBook={sampleBook} />
              <div className="admin-sample-book-card-body">
                <div><h2>{sampleBook.name}</h2><p>{sampleBook.productCount} bağlı ürün</p></div>
                <div className="admin-row-actions">
                  <button type="button" onClick={() => setEditor(sampleBook)}>Düzenle</button>
                  <button className="danger" type="button" onClick={() => deleteSampleBook(sampleBook)}>Sil</button>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="admin-panel-card admin-empty-state">
          <span aria-hidden="true">▤</span>
          <h2>Henüz kartela eklenmemiş</h2>
          <p>Ürünleri fiziksel kumaş kartelalarıyla ilişkilendirmek için ilk kartelayı oluşturun.</p>
          <button className="admin-button admin-button-primary" onClick={() => setEditor(null)} type="button">İlk kartelayı ekle</button>
        </section>
      )}

      {editor !== undefined && (
        <SampleBookEditor
          sampleBook={editor}
          request={request}
          showToast={showToast}
          onClose={() => setEditor(undefined)}
          onChanged={refreshSampleBooks}
          onSaved={async (message) => {
            setEditor(undefined)
            showToast(message)
            await refreshSampleBooks()
          }}
        />
      )}
    </main>
  )
}

function SampleBookEditor({ sampleBook, request, showToast, onClose, onChanged, onSaved }) {
  const [currentSampleBook, setCurrentSampleBook] = useState(sampleBook)
  const [name, setName] = useState(sampleBook?.name ?? '')
  const [imageFile, setImageFile] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef(null)

  useEffect(() => {
    document.body.classList.add('admin-modal-open')
    dialogRef.current?.focus()
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.classList.remove('admin-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  function chooseImage(files) {
    const file = files[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError('JPG, PNG veya WebP biçiminde ve en fazla 10 MB bir görsel seçin.')
      return
    }
    setError('')
    setImageFile(file)
  }

  async function deleteImage() {
    if (!currentSampleBook?.imageUrl || !window.confirm('Kartela görselini silmek istiyor musunuz?')) return
    try {
      await request(`/api/fabric-sample-books/${currentSampleBook.id}/image`, { method: 'DELETE' })
      setCurrentSampleBook((item) => ({ ...item, imageUrl: null }))
      await onChanged()
      showToast('Kartela görseli silindi.')
    } catch (requestError) {
      showToast(requestError.message, 'error')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!name.trim()) return setError('Kartela adı zorunludur.')
    setError('')
    setIsSaving(true)
    try {
      const isExisting = Boolean(currentSampleBook)
      let saved = await request(isExisting ? `/api/fabric-sample-books/${currentSampleBook.id}` : '/api/fabric-sample-books', {
        method: isExisting ? 'PUT' : 'POST',
        body: { name: name.trim() },
      })
      setCurrentSampleBook(saved)
      if (imageFile) {
        const imageBody = new FormData()
        imageBody.append('file', imageFile)
        saved = await request(`/api/fabric-sample-books/${saved.id}/image`, { method: 'POST', body: imageBody })
        setCurrentSampleBook(saved)
      }
      onSaved(isExisting ? 'Kartela güncellendi.' : 'Yeni kartela oluşturuldu.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="admin-editor admin-sample-book-editor" role="dialog" aria-modal="true" aria-labelledby="sample-book-editor-title" tabIndex="-1" ref={dialogRef}>
        <header className="admin-editor-header">
          <div><p className="admin-eyebrow">Kartela</p><h2 id="sample-book-editor-title">{sampleBook ? 'Kartelayı düzenle' : 'Yeni kartela'}</h2></div>
          <button className="admin-close-button" type="button" onClick={onClose} aria-label="Pencereyi kapat">×</button>
        </header>
        <form onSubmit={handleSubmit}>
          <div className="admin-editor-body">
            {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
            <section className="admin-form-section admin-sample-book-form-section">
              <div className="admin-form-section-heading"><h3>Kitap bilgileri</h3><p>Bu ad ürün düzenlerken seçim alanında, kitap görseli ise ürün detay galerisinde gösterilir.</p></div>
              <div className="admin-form-section-content">
                <label className="admin-field"><span>Kartela adı *</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Örn. Milano 2026" required autoFocus /></label>
                {currentSampleBook?.imageUrl && (
                  <div className="admin-sample-book-current-image">
                    <SampleBookImage sampleBook={currentSampleBook} />
                    <button className="admin-text-button danger" type="button" onClick={deleteImage}>Görseli sil</button>
                  </div>
                )}
                <label className="admin-upload-zone">
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { chooseImage(event.target.files); event.target.value = '' }} />
                  <span className="admin-upload-symbol" aria-hidden="true">＋</span>
                  <strong>{currentSampleBook?.imageUrl ? 'Yeni görselle değiştirin' : 'Kartela görseli seçin'}</strong>
                  <small>JPG, PNG veya WebP; en fazla 10 MB. Otomatik olarak optimize edilir.</small>
                </label>
                {imageFile && <QueuedImageList files={[imageFile]} onRemove={() => setImageFile(null)} />}
              </div>
            </section>
          </div>
          <footer className="admin-editor-footer">
            <button className="admin-button admin-button-secondary" type="button" onClick={onClose}>Vazgeç</button>
            <button className="admin-button admin-button-primary" disabled={isSaving} type="submit">{isSaving ? 'Kaydediliyor…' : 'Kaydet'}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}

function AttributesManager({ lookups, lookupsLoading, refreshLookups, request, showToast }) {
  const [activeGroup, setActiveGroup] = useState(lookupGroups[0])
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const items = lookups[activeGroup.key]

  async function addItem(event) {
    event.preventDefault()
    if (!newName.trim()) return
    setIsSaving(true)
    try {
      await request(`/api/${activeGroup.key}`, { method: 'POST', body: { name: newName.trim() } })
      setNewName('')
      await refreshLookups()
      showToast(`${activeGroup.singular} eklendi.`)
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  async function saveEdit(event) {
    event.preventDefault()
    if (!editing?.name.trim()) return
    setIsSaving(true)
    try {
      await request(`/api/${activeGroup.key}/${editing.id}`, { method: 'PUT', body: { name: editing.name.trim() } })
      setEditing(null)
      await refreshLookups()
      showToast(`${activeGroup.singular} güncellendi.`)
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteItem(item) {
    if (!window.confirm(`“${item.name}” değerini silmek istiyor musunuz?`)) return
    try {
      await request(`/api/${activeGroup.key}/${item.id}`, { method: 'DELETE' })
      await refreshLookups()
      showToast(`${activeGroup.singular} silindi.`)
    } catch (error) {
      showToast(error.status === 409 ? 'Bu değer bir veya daha fazla üründe kullanıldığı için silinemez.' : error.message, 'error')
    }
  }

  return (
    <main className="admin-content">
      <div className="admin-page-heading"><div><p className="admin-eyebrow">Katalog seçenekleri</p><h1>Özellikler</h1><span>Ürün formlarında kullanılan seçenekleri düzenleyin.</span></div></div>
      <section className="admin-attributes-layout">
        <nav className="admin-attribute-tabs" aria-label="Özellik grupları">{lookupGroups.map((group) => <button className={activeGroup.key === group.key ? 'active' : ''} key={group.key} type="button" onClick={() => { setActiveGroup(group); setEditing(null) }}><span>{group.label}</span><small>{lookups[group.key].length}</small></button>)}</nav>
        <div className="admin-panel-card admin-attribute-panel">
          <div className="admin-attribute-heading"><div><h2>{activeGroup.label}</h2><p>Ürün eklerken seçilebilecek {activeGroup.label.toLocaleLowerCase('tr-TR')}.</p></div></div>
          <form className="admin-add-attribute" onSubmit={addItem}><label className="admin-field"><span>Yeni {activeGroup.singular.toLocaleLowerCase('tr-TR')}</span><input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder={`${activeGroup.singular} adını yazın`} maxLength="100" /></label><button className="admin-button admin-button-primary" disabled={isSaving || !newName.trim()} type="submit">Ekle</button></form>
          {lookupsLoading ? <LoadingRows /> : <div className="admin-attribute-list">{items.map((item) => editing?.id === item.id ? (
            <form className="admin-attribute-edit" key={item.id} onSubmit={saveEdit}><input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} autoFocus /><button type="submit" disabled={isSaving}>Kaydet</button><button type="button" onClick={() => setEditing(null)}>Vazgeç</button></form>
          ) : (
            <div className="admin-attribute-row" key={item.id}><span>{item.name}</span><div><button type="button" onClick={() => setEditing({ ...item })}>Düzenle</button><button className="danger" type="button" onClick={() => deleteItem(item)}>Sil</button></div></div>
          ))}{!items.length && <div className="admin-empty-inline">Bu grupta henüz bir seçenek yok.</div>}</div>}
        </div>
      </section>
    </main>
  )
}

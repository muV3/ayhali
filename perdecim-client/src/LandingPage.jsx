import { useEffect, useMemo, useState } from 'react'
import heroImg from './assets/curtain-showroom-hero.png'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7237'
const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER ?? '905555555555'

const fallbackProducts = [
  {
    id: 1,
    name: 'Keten Dokulu Bej Fon Perde',
    code: 'PRD-1024',
    price: 8500,
    discountPrice: 7200,
    isDiscounted: true,
    isAvailable: true,
    isFeatured: true,
    category: 'Fon Perde',
    colors: ['Bej', 'Krem'],
    sizes: ['260x270', '300x270'],
    style: 'Modern',
    material: 'Keten Dokulu Kumaş',
    description: 'Salon ve oturma alanları için sıcak, dökümlü ve sakin bir fon perde seçeneği.',
  },
  {
    id: 2,
    name: 'Lacivert Blackout Perde',
    code: 'PRD-1180',
    price: 3200,
    discountPrice: null,
    isDiscounted: false,
    isAvailable: true,
    isFeatured: false,
    category: 'Blackout Perde',
    colors: ['Lacivert', 'Gri'],
    sizes: ['140x260', '200x260'],
    style: 'Minimal',
    material: 'Karartma Kumaş',
    description: 'Yatak odası ve medya alanları için ışığı kontrollü kesen tok dokulu perde.',
  },
  {
    id: 3,
    name: 'Çocuk Odası Soft Tül Perde',
    code: 'PRD-1302',
    price: 4100,
    discountPrice: 3650,
    isDiscounted: true,
    isAvailable: true,
    isFeatured: true,
    category: 'Tül Perde',
    colors: ['Gri', 'Yeşil'],
    sizes: ['250x260', '300x260'],
    style: 'Minimal',
    material: 'Vual Tül',
    description: 'Çocuk odaları için ferah ışık geçişi sunan, yumuşak tonlu ve kolay uyum sağlayan tül perde.',
  },
  {
    id: 4,
    name: 'İnci Dokulu Krem Zebra Perde',
    code: 'PRD-1416',
    price: 9600,
    discountPrice: null,
    isDiscounted: false,
    isAvailable: true,
    isFeatured: true,
    category: 'Zebra Perde',
    colors: ['Krem', 'Taş'],
    sizes: ['120x200', '160x200'],
    style: 'Soft Modern',
    material: 'Polyester Dokuma',
    description: 'Açık tonlu dekorasyonlarla rahat eşleşen, ışık kontrolü pratik ve premium görünümlü zebra perde.',
  },
]

async function fetchProducts() {
  const response = await fetch(`${API_BASE_URL}/api/products?pageSize=12&sortBy=featured`)
  if (!response.ok) throw new Error(`API request failed: ${response.status}`)
  const result = await response.json()
  return result.items ?? []
}

function formatPrice(value) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value)
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

function ProductImage({ product }) {
  const imageUrl = getMainImage(product)

  if (imageUrl) {
    const src = imageUrl.startsWith('http') ? imageUrl : `${API_BASE_URL}${imageUrl}`
    return <img src={src} alt={product.name} />
  }

  return (
    <div className="landing-fabric-art" aria-hidden="true">
      <span />
    </div>
  )
}

function LandingPage({ onOpenProducts }) {
  const [products, setProducts] = useState(fallbackProducts)

  useEffect(() => {
    let isMounted = true

    fetchProducts()
      .then((items) => {
        if (isMounted && items.length) setProducts(items)
      })
      .catch(() => {
        if (isMounted) setProducts(fallbackProducts)
      })

    return () => {
      isMounted = false
    }
  }, [])

  function handleSectionLink(event, sectionId) {
    event.preventDefault()
    document.querySelector(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const newArrivals = useMemo(() => products.slice(0, 3), [products])
  const bestSellers = useMemo(() => {
    const preferred = products.filter((product) => product.isFeatured || product.isDiscounted)
    return (preferred.length ? preferred : products).slice(0, 3)
  }, [products])
  const featuredProduct = products.find((product) => product.isFeatured) ?? products[0]

  return (
    <div className="landing-page">
      <header className="landing-header" aria-label="Site header">
        <a className="landing-brand" href="#hero" aria-label="Perdecim ana sayfa" onClick={(event) => handleSectionLink(event, '#hero')}>
          <strong>Perdecim</strong>
          <span>Zonguldak Showroom</span>
        </a>
        <nav aria-label="Ana menü">
          <a href="#new-arrivals" onClick={(event) => handleSectionLink(event, '#new-arrivals')}>Yeni Gelenler</a>
          <a href="#best-sellers" onClick={(event) => handleSectionLink(event, '#best-sellers')}>Çok Satanlar</a>
          <a href="#featured" onClick={(event) => handleSectionLink(event, '#featured')}>Öne Çıkan</a>
          <button type="button" onClick={onOpenProducts}>Modeller</button>
        </nav>
        <a className="landing-header-action button button-primary button-sm" href={createWhatsAppLink()} target="_blank" rel="noreferrer">
          İletişim
        </a>
      </header>

      <main>
        <section id="hero" className="landing-hero" style={{ backgroundImage: `url(${heroImg})` }}>
          <div className="landing-hero-copy reveal-on-scroll">
            <h1>Perdecim</h1>
            <span>Modern, sakin ve zamansız perde seçkileriyle yaşam alanınıza dengeli bir ışık ve doku katın.</span>
            <div className="landing-hero-actions">
              <a className="primary-button button button-primary" href="#new-arrivals" onClick={(event) => handleSectionLink(event, '#new-arrivals')}>Koleksiyonu İncele</a>
              <button className="primary-button button button-primary" type="button" onClick={onOpenProducts}>Tüm Modeller</button>
              <a className="secondary-button button button-secondary" href={createWhatsAppLink()} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            </div>
          </div>
        </section>

        <ProductSection
          id="new-arrivals"
          eyebrow="Yeni Gelenler"
          title="Showroom'a yeni eklenen seçkiler"
          products={newArrivals}
        />

        <ProductSection
          id="best-sellers"
          eyebrow="Çok Satanlar"
          title="En çok ilgi gören modeller"
          products={bestSellers}
          tone="stone"
        />

        {featuredProduct && (
          <section id="featured" className="featured-product-section reveal-on-scroll">
            <div className="featured-product-media">
              <ProductImage product={featuredProduct} />
            </div>
            <div className="featured-product-copy">
              <p className="section-eyebrow">Öne Çıkan Ürün</p>
              <h2>{featuredProduct.name}</h2>
              <span>{featuredProduct.description}</span>
              <dl>
                <div>
                  <dt>Kod</dt>
                  <dd>{featuredProduct.code}</dd>
                </div>
                <div>
                  <dt>Ölçüler</dt>
                  <dd>{featuredProduct.sizes?.join(', ') || 'Mağazada bilgi alın'}</dd>
                </div>
                <div>
                  <dt>Materyal</dt>
                  <dd>{featuredProduct.material || 'Premium dokuma'}</dd>
                </div>
              </dl>
              <div className="featured-product-actions">
                <Price product={featuredProduct} />
                <a className="primary-button button button-primary" href={createWhatsAppLink(featuredProduct)} target="_blank" rel="noreferrer">
                  Ürün İçin Yaz
                </a>
              </div>
            </div>
          </section>
        )}

        <section className="final-cta reveal-on-scroll">
          <p className="section-eyebrow">Perdecim Zonguldak</p>
          <h2>Doğru ölçü, doğru doku ve sakin bir alışveriş deneyimi için bize yazın.</h2>
          <a className="primary-button button button-primary" href={createWhatsAppLink()} target="_blank" rel="noreferrer">
            WhatsApp'tan Randevu Al
          </a>
        </section>
      </main>

      <footer className="landing-footer">
        <strong>Perdecim</strong>
        <span>Zonguldak'ta modern ve premium perde koleksiyonları.</span>
        <a href="https://www.google.com/maps/search/?api=1&query=Zonguldak%20Perdecim" target="_blank" rel="noreferrer">
          Yol Tarifi
        </a>
      </footer>
    </div>
  )
}

function ProductSection({ eyebrow, id, products, title, tone = 'light' }) {
  return (
    <section id={id} className={`landing-section landing-section-${tone}`}>
      <div className="landing-section-heading reveal-on-scroll">
        <p className="section-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <div className="landing-product-grid">
        {products.map((product, index) => (
          <ProductCard index={index} key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}

function ProductCard({ index, product }) {
  return (
    <article className="landing-product-card reveal-on-scroll" style={{ transitionDelay: `${index * 70}ms` }}>
      <a className="landing-product-image" href={createWhatsAppLink(product)} target="_blank" rel="noreferrer">
        <ProductImage product={product} />
      </a>
      <div className="landing-product-body">
        <p>{product.code}</p>
        <h3>{product.name}</h3>
        <div className="landing-product-meta">
          <span>{product.category}</span>
          <span>{product.isAvailable ? 'Stokta' : 'Siparişle'}</span>
        </div>
        <Price product={product} />
      </div>
    </article>
  )
}

function Price({ product }) {
  return (
    <div className="landing-price">
      {product.isDiscounted && product.discountPrice ? (
        <>
          <strong>{formatPrice(product.discountPrice)}</strong>
          <span>{formatPrice(product.price)}</span>
        </>
      ) : (
        <strong>{formatPrice(product.price)}</strong>
      )}
    </div>
  )
}

export default LandingPage


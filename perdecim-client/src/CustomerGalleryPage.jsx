import { useEffect, useState } from 'react'
import { getResponsiveImageAttributes } from './responsiveImages.js'
import PublicHeader from './PublicHeader.jsx'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7237'

function getGalleryImage(image) {
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

function resolveGalleryImage(image) {
  return getResponsiveImageAttributes(getGalleryImage(image), (url) => url.startsWith('http') ? url : `${API_BASE_URL}${url}`)
}

export default function CustomerGalleryPage() {
  const [images, setImages] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeIndex, setActiveIndex] = useState(null)

  useEffect(() => {
    let isMounted = true
    fetch(`${API_BASE_URL}/api/customer-home-images`)
      .then((response) => {
        if (!response.ok) throw new Error(`API request failed: ${response.status}`)
        return response.json()
      })
      .then((items) => {
        if (isMounted) setImages(items)
      })
      .catch(() => {
        if (isMounted) setError('Galeri şu anda yüklenemiyor. Lütfen daha sonra tekrar deneyin.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    if (activeIndex === null) return undefined
    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setActiveIndex(null)
      if (event.key === 'ArrowLeft') setActiveIndex((current) => (current - 1 + images.length) % images.length)
      if (event.key === 'ArrowRight') setActiveIndex((current) => (current + 1) % images.length)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeIndex, images.length])

  const activeImage = activeIndex === null ? null : images[activeIndex]

  return (
    <div className="landing-page customer-gallery-page">
      <PublicHeader />

      <main className="customer-gallery-main">
        <div className="customer-gallery-heading">
          <p className="section-eyebrow">Gerçek evlerden ilham</p>
          <h1>Müşterilerimizden gelenler</h1>
          <p>Perdecim uygulamalarının müşterilerimizin evlerindeki tamamlanmış hâllerini keşfedin.</p>
        </div>

        {isLoading && <div className="customer-gallery-status" role="status">Galeri yükleniyor…</div>}
        {error && <div className="customer-gallery-status error" role="alert">{error}</div>}
        {!isLoading && !error && images.length === 0 && <div className="customer-gallery-status">Henüz galeri görseli eklenmemiş.</div>}

        {images.length > 0 && (
          <section className="customer-gallery-grid" aria-label="Müşteri evlerinden fotoğraflar">
            {images.map((image, index) => {
              const attributes = resolveGalleryImage(image)
              return (
                <button type="button" className="customer-gallery-card" key={image.id} onClick={() => setActiveIndex(index)} aria-label={`${index + 1}. fotoğrafı tam boy görüntüle`}>
                  <img {...attributes} sizes={attributes.srcSet ? '(max-width: 680px) calc(100vw - 32px), (max-width: 1100px) 50vw, 33vw' : undefined} alt={`Müşteri evinden perde uygulaması ${index + 1}`} width="3" height="4" loading={index < 3 ? 'eager' : 'lazy'} decoding="async" />
                </button>
              )
            })}
          </section>
        )}
      </main>

      {activeImage && (
        <div className="customer-gallery-lightbox" role="dialog" aria-modal="true" aria-label={`${activeIndex + 1}. müşteri fotoğrafı`} onMouseDown={(event) => event.target === event.currentTarget && setActiveIndex(null)}>
          <button className="customer-gallery-lightbox-close" type="button" onClick={() => setActiveIndex(null)} aria-label="Tam boy görünümü kapat">×</button>
          {images.length > 1 && <button className="customer-gallery-lightbox-previous" type="button" onClick={() => setActiveIndex((activeIndex - 1 + images.length) % images.length)} aria-label="Önceki fotoğraf">←</button>}
          <img {...resolveGalleryImage(activeImage)} alt={`Müşteri evinden perde uygulaması ${activeIndex + 1}`} decoding="async" />
          {images.length > 1 && <button className="customer-gallery-lightbox-next" type="button" onClick={() => setActiveIndex((activeIndex + 1) % images.length)} aria-label="Sonraki fotoğraf">→</button>}
          <span>{activeIndex + 1} / {images.length}</span>
        </div>
      )}
    </div>
  )
}

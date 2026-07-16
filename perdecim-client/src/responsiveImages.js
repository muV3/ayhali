export function getMainProductImage(product) {
  const image = product.images?.find((item) => item.isMainImage) ?? product.images?.[0]
  const url = product.mainImageUrl ?? image?.url
  if (!url) return null

  return {
    url,
    smallUrl: product.mainImageSmallUrl ?? image?.smallUrl ?? url,
    mediumUrl: product.mainImageMediumUrl ?? image?.mediumUrl ?? url,
    largeUrl: product.mainImageLargeUrl ?? image?.largeUrl ?? url,
    smallWidth: product.mainImageSmallWidth ?? image?.smallWidth,
    mediumWidth: product.mainImageMediumWidth ?? image?.mediumWidth,
    largeWidth: product.mainImageLargeWidth ?? image?.largeWidth,
  }
}

export function getResponsiveImageAttributes(image, resolveUrl) {
  const src = resolveUrl(image.largeUrl ?? image.url)
  const candidates = [
    [image.smallUrl, image.smallWidth],
    [image.mediumUrl, image.mediumWidth],
    [image.largeUrl, image.largeWidth],
  ]

  const uniqueCandidates = new Map()
  candidates.forEach(([url, width]) => {
    if (url && width) uniqueCandidates.set(width, resolveUrl(url))
  })

  return {
    src,
    srcSet: uniqueCandidates.size > 1
      ? [...uniqueCandidates.entries()].sort(([a], [b]) => a - b).map(([width, url]) => `${url} ${width}w`).join(', ')
      : undefined,
  }
}

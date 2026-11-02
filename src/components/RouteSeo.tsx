import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { resolveSeo, SITE_URL } from '../seo/routes'

// Updates the tags that already exist in index.html so crawlers never see duplicates.
const upsertMeta = (attr: 'name' | 'property', key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

const upsertCanonical = (href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

const RouteSeo = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    const seo = resolveSeo(pathname)
    const url = `${SITE_URL}${seo.canonical ?? seo.path}`

    document.title = seo.title
    upsertMeta('name', 'description', seo.description)
    upsertMeta('name', 'robots', seo.index === false ? 'noindex, nofollow' : 'index, follow')
    upsertCanonical(url)
    upsertMeta('property', 'og:title', seo.title)
    upsertMeta('property', 'og:description', seo.description)
    upsertMeta('property', 'og:url', url)
    upsertMeta('name', 'twitter:title', seo.title)
    upsertMeta('name', 'twitter:description', seo.description)
  }, [pathname])

  return null
}

export default RouteSeo

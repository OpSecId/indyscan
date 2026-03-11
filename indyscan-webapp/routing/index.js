export function getTxLinkData (baseUrl, network, ledger, seqNo) {
  const href = `/tx?network=${network}&ledger=${ledger}&seqNo=${seqNo}`
  const as = `/tx/${network}/${ledger}/${seqNo}`
  return { href, as }
}

/*
There's surely better ways, but for now, this works. indyscan.io redirects http->https, however, between nginx and
the actual application server the traffic is http. So when the request hits this app, it looks like it was talked to
in HTTP. This fact then propagates typically via NEXT.js's getInitialProps back to frontend, causing it eventually
make calls like http://indyscan.io/api/foobar (http), which won't work, because the user
is actually at https://indyscan.io (https).

On Railway (and other platforms), the edge terminates HTTPS and forwards as HTTP; use X-Forwarded-Proto so the
frontend gets an HTTPS base URL and avoids mixed-content blocking. Default to HTTPS for known public hosts.
 */
function getProtocol (req) {
  if (!req || !req.headers) return 'https'
  const forwarded = req.headers['x-forwarded-proto']
  if (forwarded) {
    const proto = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim().toLowerCase()
    if (proto === 'https') return 'https'
  }
  const host = (req.headers['host'] || '').toLowerCase()
  if (host.match(/indyscan\.io$/)) return 'https'
  if (host.match(/\.railway\.app$/) || host.match(/\.up\.railway\.app$/)) return 'https'
  return req.protocol || 'https'
}

export function getBaseUrl (req) {
  return req ? `${getProtocol(req)}://${req.get('Host')}` : ''
}

/**
 * When getInitialProps runs on the server, fetch from localhost so we don't depend on
 * the public hostname (which may not resolve or may cause "Network Error" from inside the container).
 * Callers should use: getBaseUrlForServerFetch(req) || getBaseUrl(req) for the fetch base,
 * and pass getBaseUrl(req) in props so the client gets the correct origin (HTTPS).
 */
export function getBaseUrlForServerFetch (req) {
  if (req && typeof window === 'undefined') {
    return `http://127.0.0.1:${process.env.PORT || 8080}`
  }
  return null
}

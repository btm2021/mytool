/**
 * Cloudflare Worker - CORS Proxy for CCXT
 * 
 * Deploy this to Cloudflare Workers to bypass CORS restrictions
 * 
 * Usage:
 * 1. Go to https://workers.cloudflare.com/
 * 2. Create a new Worker
 * 3. Copy and paste this entire file
 * 4. Deploy
 * 5. Use the worker URL as proxy in your CCXT config
 * 
 * Example:
 * const exchange = new ccxt.gate({
 *   proxy: 'https://your-worker.workers.dev/'
 * });
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Main request handler
 * @param {Request} request
 */
async function handleRequest(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return handleOptions(request)
  }

  try {
    // Extract target URL from path
    const url = new URL(request.url)
    const targetUrl = extractTargetUrl(url)

    if (!targetUrl) {
      return new Response('Invalid request. Usage: https://your-worker.workers.dev/https://api.example.com/endpoint', {
        status: 400,
        headers: corsHeaders()
      })
    }

    // Validate target URL
    if (!isValidUrl(targetUrl)) {
      return new Response('Invalid target URL', {
        status: 400,
        headers: corsHeaders()
      })
    }

    // Forward the request
    const response = await forwardRequest(request, targetUrl)
    
    return response

  } catch (error) {
    return new Response(`Proxy Error: ${error.message}`, {
      status: 500,
      headers: corsHeaders()
    })
  }
}

/**
 * Extract target URL from request path
 * @param {URL} url
 * @returns {string|null}
 */
function extractTargetUrl(url) {
  // Remove leading slash
  let path = url.pathname.substring(1)
  
  // Decode if URL is encoded (CCXT encodes URLs)
  try {
    // Check if path is URL encoded
    if (path.includes('%')) {
      path = decodeURIComponent(path)
    }
  } catch (e) {
    // If decode fails, use original path
  }
  
  // Add query string if exists
  if (url.search) {
    path += url.search
  }
  
  // Check if it starts with http:// or https://
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  
  return null
}

/**
 * Validate if URL is safe to proxy
 * @param {string} url
 * @returns {boolean}
 */
function isValidUrl(url) {
  try {
    const parsed = new URL(url)
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false
    }
    
    // Optional: Add whitelist of allowed domains
    // const allowedDomains = ['api.gateio.ws', 'api-futures.kucoin.com']
    // if (!allowedDomains.some(domain => parsed.hostname.includes(domain))) {
    //   return false
    // }
    
    return true
  } catch {
    return false
  }
}

/**
 * Forward request to target URL
 * @param {Request} originalRequest
 * @param {string} targetUrl
 * @returns {Promise<Response>}
 */
async function forwardRequest(originalRequest, targetUrl) {
  // Copy headers from original request
  const headers = new Headers(originalRequest.headers)
  
  // Remove headers that might cause issues
  headers.delete('host')
  headers.delete('origin')
  headers.delete('referer')
  
  // Add necessary headers
  headers.set('User-Agent', 'CCXT-Proxy/1.0')
  
  // Create new request
  const requestInit = {
    method: originalRequest.method,
    headers: headers
  }
  
  // Add body for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(originalRequest.method)) {
    requestInit.body = await originalRequest.text()
  }
  
  // Fetch from target
  const response = await fetch(targetUrl, requestInit)
  
  // Create new response with CORS headers
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: corsHeaders(response.headers)
  })
  
  return newResponse
}

/**
 * Handle OPTIONS request for CORS preflight
 * @param {Request} request
 * @returns {Response}
 */
function handleOptions(request) {
  const headers = corsHeaders()
  
  // Handle preflight request
  if (
    request.headers.get('Origin') !== null &&
    request.headers.get('Access-Control-Request-Method') !== null &&
    request.headers.get('Access-Control-Request-Headers') !== null
  ) {
    // Handle CORS preflight requests
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS')
    headers.set('Access-Control-Allow-Headers', request.headers.get('Access-Control-Request-Headers'))
    headers.set('Access-Control-Max-Age', '86400')
  }
  
  return new Response(null, {
    status: 204,
    headers: headers
  })
}

/**
 * Get CORS headers
 * @param {Headers} originalHeaders - Optional original response headers
 * @returns {Headers}
 */
function corsHeaders(originalHeaders = null) {
  const headers = new Headers(originalHeaders)
  
  // CORS headers
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', '*')
  headers.set('Access-Control-Expose-Headers', '*')
  
  // Security headers
  headers.set('X-Content-Type-Options', 'nosniff')
  
  return headers
}


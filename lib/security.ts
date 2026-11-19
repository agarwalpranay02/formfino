export function securityHeaders(nonce?:string){
  return {
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'origin',
    'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=()',
    'Strict-Transport-Security':'max-age=31536000',
    'Content-Security-Policy':`default-src 'self'; script-src 'self' ${nonce?`'nonce-${nonce}' `:''}'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`,
  };
}

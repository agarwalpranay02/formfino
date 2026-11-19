import {NextResponse, type NextRequest} from 'next/server';
import {securityHeaders} from './lib/security';

export function proxy(request: NextRequest) {
  if (!['GET','HEAD'].includes(request.method)) {
    return new NextResponse('Method not allowed',{status:405,headers:{...securityHeaders(),Allow:'GET, HEAD'}});
  }
  const nonce=Buffer.from(crypto.getRandomValues(new Uint8Array(18))).toString('base64');
  const headers=securityHeaders(nonce);
  if(process.env.NODE_ENV==='development') headers['Content-Security-Policy']=headers['Content-Security-Policy'].replace("'wasm-unsafe-eval'", "'wasm-unsafe-eval' 'unsafe-eval'").replace("frame-ancestors 'none'","frame-ancestors 'self'");
  const requestHeaders=new Headers(request.headers);
  requestHeaders.set('x-nonce',nonce);
  requestHeaders.set('Content-Security-Policy',headers['Content-Security-Policy']);
  const response=NextResponse.next({request:{headers:requestHeaders}});
  for(const [name,value] of Object.entries(headers)) response.headers.set(name,value);
  response.headers.set('Cache-Control','private, no-store');
  return response;
}

// Assets stay on the CDN; Vercel's analytics endpoint has its own POST handler.
export const config={matcher:['/((?!_next/|_vercel/|vendor/|fonts/|icons/|manifest\\.webmanifest|offline\\.html|sw\\.js|api/pdf-worker\\.mjs|favicon\\.svg|robots\\.txt|THIRD_PARTY_NOTICES\\.txt|\\.well-known/).*)']};

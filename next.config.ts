import type {NextConfig} from 'next';
import {securityHeaders} from './lib/security';

const config: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [{source:'/api/pdf-worker.mjs',destination:'/vendor/pdf.worker.min.mjs'}];
  },
  async headers() {
    const headers=Object.entries(securityHeaders()).filter(([key])=>key!=='Content-Security-Policy').map(([key,value])=>({key,value}));
    return [{source:'/:path*',headers}, {source:'/vendor/:path*',headers:[{key:'Cross-Origin-Resource-Policy',value:'same-origin'}]}, {source:'/sw.js',headers:[{key:'Cache-Control',value:'no-cache'},{key:'Service-Worker-Allowed',value:'/'}]}];
  },
};
export default config;

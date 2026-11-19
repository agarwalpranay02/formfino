'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="page-shell"><div className="workspace"><h1 style={{fontSize:40}}>Let’s try that again.</h1><p style={{margin:'20px 0'}}>The workspace encountered an unexpected error. Your original files remain on your device.</p><button className="button dark" onClick={reset}>Reload workspace</button></div></main>}

/** Analytics never receives arbitrary URLs, query strings, fragments or custom events. */
export function privatePageview(event: {type:string;url:string}, origin:string) {
  if(event.type!=='pageview')return null;
  try {
    const url=new URL(event.url);
    if(url.origin!==origin || url.pathname!=='/')return null;
    return {type:'pageview' as const,url:url.origin+'/'};
  } catch {return null;}
}

export function analyticsAllowed(signals:{doNotTrack?:string|null;globalPrivacyControl?:boolean}) {
  return signals.doNotTrack!=='1' && signals.doNotTrack!=='yes' && signals.globalPrivacyControl!==true;
}

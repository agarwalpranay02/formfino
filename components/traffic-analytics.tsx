'use client';
import {useEffect} from 'react';
import {inject} from '@vercel/analytics';
import {analyticsAllowed,privatePageview} from '../lib/analytics-privacy';

export function TrafficAnalytics({enabled}:{enabled:boolean}) {
  useEffect(()=>{
    if(!enabled || !analyticsAllowed(navigator))return;
    inject({mode:'production',debug:false,beforeSend:event=>{
      if(!analyticsAllowed(navigator))return null;
      return privatePageview(event,location.origin);
    }});
  },[enabled]);
  return null;
}

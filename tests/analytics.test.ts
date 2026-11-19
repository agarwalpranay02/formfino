import test from 'node:test';
import assert from 'node:assert/strict';
import {privatePageview,analyticsAllowed} from '../lib/analytics-privacy.ts';
test('analytics removes private queries and fragments without mutating input',()=>{
  const event={type:'pageview',url:'https://formfino.example/?file=passport.pdf&email=private@example.com#identity'};
  assert.deepEqual(privatePageview(event,'https://formfino.example'),{type:'pageview',url:'https://formfino.example/'});
  assert.ok(event.url.includes('passport.pdf'));
});
test('analytics rejects custom events, foreign origins and arbitrary paths',()=>{
  for(const event of [{type:'event',url:'https://formfino.example/'},{type:'pageview',url:'https://foreign.example/'},{type:'pageview',url:'https://formfino.example/secret-document.pdf'},{type:'pageview',url:'not a url'}]) assert.equal(privatePageview(event,'https://formfino.example'),null);
});
test('analytics respects Do Not Track and Global Privacy Control',()=>{
  assert.equal(analyticsAllowed({}),true);
  for(const signals of [{doNotTrack:'1'},{doNotTrack:'yes'},{globalPrivacyControl:true}])assert.equal(analyticsAllowed(signals),false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { assertPublicBytes, assertReaderEqual, assertSeedInventory } from './public-seed.mjs';
test('refuses user paths in UTF8 and UTF16 binary data without echoing content',()=>{
 for(const text of ['C:\\Users\\PrivatePerson\\code','github_pat_abcdefghijklmnopqrst','-----BEGIN PRIVATE KEY-----'])
  for(const encoding of ['utf8','utf16le']) assert.throws(()=>assertPublicBytes(Buffer.from(text,encoding)),{message:'PUBLIC_CONTENT_REVIEW_FAILED'});
 assertPublicBytes(Buffer.from('safe public synthetic content'));
});
test('reader root can move but raw bytes and topology must stay identical',()=>{
 const a={dependencies:[{path:'a',sha256:'a'.repeat(64)}],topology:{digest:'b'.repeat(64)}};
 assertReaderEqual(a,{...a,roots:[{path:'different-root'}]});
 assert.throws(()=>assertReaderEqual(a,{...a,topology:{digest:'c'.repeat(64)}}));
 assert.throws(()=>assertReaderEqual(a,{...a,dependencies:[]}));
});
test('seed rejects escaped, duplicate, unexpected and unbound members',()=>{
 const row={path:'native/codeatlas-native-analyzer.exe',bytes:5,sha256:'a'.repeat(64)};
 assertSeedInventory([row]);
 for(const rows of [[{...row,path:'../native/x'}],[row,row],[row,{...row,path:'native/CODEATLAS-native-analyzer.exe'}],[{...row,path:'raw.log'}],[{...row,sha256:'bad'}]])assert.throws(()=>assertSeedInventory(rows));
});
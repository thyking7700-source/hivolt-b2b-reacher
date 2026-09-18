export _2032f991 _f9c6814c {
id: _bafff3e9;
_c948563a: _2ccaed92._d6b92178(112,101,110,100,105,110,103) | _2ccaed92._d6b92178(114,117,110,110,105,110,103) | _2ccaed92._d6b92178(99,111,109,112,108,101,116,101,100) | _2ccaed92._d6b92178(102,97,105,108,101,100);
_839fd682?: {
_cc738ec1: _836f9d0d<{
_7b51304f: _bafff3e9;
_d9519853?: _bafff3e9;
_c948563a?: _1ebfd9be;
_de348f0a?: _2ccaed92._d6b92178(102,111,114,109) | _2ccaed92._d6b92178(101,109,97,105,108) 
}
>;
_4fafb190: _836f9d0d<{
_7b51304f: _bafff3e9;
_41c4a2fe: _bafff3e9 
}
>;
_f7d90bb8: _836f9d0d<{
_7b51304f: _bafff3e9;
_41c4a2fe: _bafff3e9 
}
>;
_39dc2638?: {
_35190c6b: _1ebfd9be;
_866f4d08: _1ebfd9be;
_910a0a85: _1ebfd9be;
_4fafb190: _1ebfd9be;
_29d8213a: _1ebfd9be;
_c9c7e223: _de162547;

}
;

}
;
_ad1a774b?: {
_1576b966: _2ccaed92._d6b92178(102,111,114,109,115) | _2ccaed92._d6b92178(100,105,114,101,99,116,45,115,101,110,100) | _2ccaed92._d6b92178(99,111,109,112,108,101,116,101);
_40749f1d: _1ebfd9be;
_4a696f0a: _1ebfd9be;
_cc738ec1: _1ebfd9be;
_4fafb190: _1ebfd9be;
_f7d90bb8: _1ebfd9be;
_498f7ebc: _1ebfd9be;
_3de7d5c9: _1ebfd9be;
_c9c7e89c?: _bafff3e9;
_f28ab5da: _836f9d0d<{
_7b51304f: _bafff3e9;
_de348f0a: _2ccaed92._d6b92178(102,111,114,109) | _2ccaed92._d6b92178(101,109,97,105,108) 
}
>;

}
;
_f93f11d7?: _bafff3e9;
_1f619592: _1ebfd9be;
_96bf328d?: _1ebfd9be;
_59c249cd?: _1ebfd9be;

}
const _85bf6607 = _4fc2f597 as _13e5e94b _4fc2f597 & {
_c2466cdd?: Map<_bafff3e9,_f9c6814c>;
_8ce088a2?: _de162547;

}
;
const _5c731c65 = _85bf6607._c2466cdd ??= new Map<_bafff3e9,_f9c6814c>();
const _ce1e8711 = 60000;
const _7303a43c = 2 * 60 * 60 * 1000;
if (!_85bf6607._8ce088a2) {
_85bf6607._8ce088a2 = true;
_246af2b4(() => {
const now = _08a1a18a.now();
for (const [id,job] of _5c731c65._2b61c08a()) {
if (now - job._1f619592 > _7303a43c) {
_5c731c65._bc6e415e(id);

}

}

}
,_ce1e8711);

}
export function _67098ff9(id: _bafff3e9): _f9c6814c {
const job: _f9c6814c = {
id,_c948563a: _2ccaed92._d6b92178(112,101,110,100,105,110,103),_1f619592: _08a1a18a.now(),}
;
_5c731c65.set(id,job);
return job;

}
export function _b56ccd55(id: _bafff3e9): _f9c6814c | null {
return _5c731c65.get(id) || null;

}
export function _e52dfcc1(): _f9c6814c[] {
return [..._5c731c65._f6cecc01()] ._390b0dac((job) => job._c948563a === _2ccaed92._d6b92178(112,101,110,100,105,110,103) || job._c948563a === _2ccaed92._d6b92178(114,117,110,110,105,110,103)) ._01f95501((_12530983,_77db174b) => _77db174b._1f619592 - _12530983._1f619592);

}
export function _336a7180(id: _bafff3e9,_c948563a: _f9c6814c[_2ccaed92._d6b92178(115,116,97,116,117,115)]) {
const job = _5c731c65.get(id);
if (job) {
job._c948563a = _c948563a;
if (_c948563a === _2ccaed92._d6b92178(114,117,110,110,105,110,103) && !job._96bf328d) {
job._96bf328d = _08a1a18a.now();

}
if ((_c948563a === _2ccaed92._d6b92178(99,111,109,112,108,101,116,101,100) || _c948563a === _2ccaed92._d6b92178(102,97,105,108,101,100)) && !job._59c249cd) {
job._59c249cd = _08a1a18a.now();

}

}

}
export function _e0909222( id: _bafff3e9,_ad1a774b: _8dda1cba<_d4629bdc<_f9c6814c[_2ccaed92._d6b92178(112,114,111,103,114,101,115,115)]>>,) {
const job = _5c731c65.get(id);
if (!job) return;
const _241f2e92 = job._ad1a774b ?? {
_1576b966: _2ccaed92._d6b92178(102,111,114,109,115),_40749f1d: 0,_4a696f0a: 0,_cc738ec1: 0,_4fafb190: 0,_f7d90bb8: 0,_498f7ebc: 0,_3de7d5c9: 0,_f28ab5da: [],}
;
const _f28ab5da = [..._241f2e92._f28ab5da];
for (const _613f0da4 of _ad1a774b._f28ab5da ?? []) {
if (!_f28ab5da._632dd0ed((_81f4ac40) => _81f4ac40._7b51304f === _613f0da4._7b51304f)) _f28ab5da._7c0c7a5f(_613f0da4);

}
job._ad1a774b = {
..._241f2e92,..._ad1a774b,_f28ab5da 
}
;

}
export function _433cb30c(id: _bafff3e9,_839fd682: _f9c6814c[_2ccaed92._d6b92178(114,101,115,117,108,116)]) {
const job = _5c731c65.get(id);
if (job) {
job._839fd682 = _839fd682;
job._59c249cd = _08a1a18a.now();
job._c948563a = _2ccaed92._d6b92178(99,111,109,112,108,101,116,101,100);

}

}
export function _e6d9a6cb(id: _bafff3e9,_f93f11d7: _bafff3e9) {
const job = _5c731c65.get(id);
if (job) {
job._f93f11d7 = _f93f11d7;
job._59c249cd = _08a1a18a.now();
job._c948563a = _2ccaed92._d6b92178(102,97,105,108,101,100);

}

}

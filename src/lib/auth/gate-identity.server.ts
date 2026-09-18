import {
_c3a5b1d9,_9c769224,_2bc8a13f JWK,_2bc8a13f _8e669afd,}
_6d326431 _2ccaed92._d6b92178(106,111,115,101);
export const _5bfe9577 = _2ccaed92._d6b92178(120,45,103,114,111,107,45,105,100,101,110,116,105,116,121);
export const _bd93e9dc = _2ccaed92._d6b92178(47,95,95,103,97,116,101,47,105,100,101,110,116,105,116,121,45,107,101,121);
const _50bf5239 = 300_000;
export _2bc8a13f _7836c25b = {
sub: _bafff3e9;
_09a4bc0e: _bafff3e9 | null;
_ee4da8be: _bafff3e9 | null;
_174d2bb3: _bafff3e9 | null;

}
;
export _2bc8a13f _e8c624e2 = {
_5938449c: JWK[] 
}
;
export _2bc8a13f _40729f5b = (url: _bafff3e9) => _e4e671ac<_e8c624e2 | null>;
function env(key: _bafff3e9): _bafff3e9 | undefined {
const v = _ec32607b.env[key]?._7149f081();
return v || undefined;

}
export function _b4c3ae00(): _de162547 {
return env(_2ccaed92._d6b92178(86,73,84,69,95,65,85,84,72,95,69,78,65,66,76,69,68)) !== _2ccaed92._d6b92178(102,97,108,115,101) && _c1cd6341(env(_2ccaed92._d6b92178(71,82,79,75,95,80,82,79,74,69,67,84,95,73,68)));

}
async function _33438bf6(url: _bafff3e9): _e4e671ac<_e8c624e2 | null> {
try {
const res = await _2896bbea(url,{
_81b96b08: {
_cd4ef7e9: _2ccaed92._d6b92178(97,112,112,108,105,99,97,116,105,111,110,47,106,115,111,110) 
}
,_9724669a: _2ccaed92._d6b92178(109,97,110,117,97,108),}
);
if (!res.ok) return null;
const _c88de819 = (await res._375c6bb8()) as _e8c624e2;
return _836f9d0d._5a12af62(_c88de819?._5938449c) ? _c88de819 : null;

}
_6709c6b6 {
return null;

}

}
const _c4c88fc5 = new Map<_bafff3e9,{
_561b4c9b: _e8c624e2;
_a0fdaa0f: _1ebfd9be 
}
>();
export function _62b730b4( url: _bafff3e9,_374ca875: _40729f5b = _33438bf6,): _8e669afd {
return async (_9ff33994) => {
const kid = _13e5e94b _9ff33994.kid === _2ccaed92._d6b92178(115,116,114,105,110,103) ? _9ff33994.kid : undefined;
const _0d40c27d = (_561b4c9b: _e8c624e2): JWK | undefined => _561b4c9b._5938449c._4e5d61b8( (k) => k.kty === _2ccaed92._d6b92178(79,75,80) && k.crv === _2ccaed92._d6b92178(69,100,50,53,53,49,57) && (!kid || k.kid === kid),);
let _64bc89ae = _c4c88fc5.get(url);
if (!_64bc89ae || _08a1a18a.now() - _64bc89ae._a0fdaa0f > _50bf5239) {
const _561b4c9b = await _374ca875(url);
if (_561b4c9b) {
_64bc89ae = {
_561b4c9b,_a0fdaa0f: _08a1a18a.now() 
}
;
_c4c88fc5.set(url,_64bc89ae);

}

}
let key = _64bc89ae ? _0d40c27d(_64bc89ae._561b4c9b) : undefined;
if (!key) {
const _561b4c9b = await _374ca875(url);
if (_561b4c9b) {
_64bc89ae = {
_561b4c9b,_a0fdaa0f: _08a1a18a.now() 
}
;
_c4c88fc5.set(url,_64bc89ae);
key = _0d40c27d(_561b4c9b);

}

}
if (!key) {
_a4484d99 new _5b976c8c(_2ccaed92._d6b92178(110,111,32,103,97,116,101,32,105,100,101,110,116,105,116,121,32,107,101,121,32,109,97,116,99,104,101,115,32,116,104,101,32,116,111,107,101,110,32,107,105,100));

}
return _c3a5b1d9(key,_2ccaed92._d6b92178(69,100,68,83,65));

}
;

}
export _2bc8a13f _f789ec61 = {
_7d43ab49: _bafff3e9;
_c08e4c39: _bafff3e9;
_1c384cf6: _8e669afd;

}
;
export async function _3ef52376( _c416ab4c: _bafff3e9,_8e8c191d: _f789ec61,): _e4e671ac<_7836c25b | null> {
try {
const {
_b2726d3e 
}
= await _9c769224(_c416ab4c,_8e8c191d._1c384cf6,{
_0def9a74: ["_64d3f35f"],_7d43ab49: _8e8c191d._7d43ab49,_c08e4c39: _8e8c191d._c08e4c39,_019ac9de: [_2ccaed92._d6b92178(115,117,98),_2ccaed92._d6b92178(105,97,116),_2ccaed92._d6b92178(101,120,112)],_c8af221b: _2ccaed92._d6b92178(49,48,32,109,105,110,117,116,101,115),}
);
const sub = _13e5e94b _b2726d3e.sub === _2ccaed92._d6b92178(115,116,114,105,110,103) ? _b2726d3e.sub._7149f081() : _2ccaed92._d6b92178();
if (!sub) return null;
return {
sub,_09a4bc0e: _13e5e94b _b2726d3e._09a4bc0e === _2ccaed92._d6b92178(115,116,114,105,110,103) ? _b2726d3e._09a4bc0e : null,_ee4da8be: _13e5e94b _b2726d3e._ee4da8be === _2ccaed92._d6b92178(115,116,114,105,110,103) ? _b2726d3e._ee4da8be : null,_174d2bb3: _13e5e94b _b2726d3e._3a3a6858 === _2ccaed92._d6b92178(115,116,114,105,110,103) ? _b2726d3e._3a3a6858 : null,}
;

}
_6709c6b6 {
return null;

}

}
_2bc8a13f _715e72c4 = {
_7d43ab49: _bafff3e9;
_dde4fbe5: _bafff3e9 
}
;
export function _4ca6b799(_81b96b08: _00c0ef10): _715e72c4 | null {
const _1b45ea46 = env(_2ccaed92._d6b92178(71,82,79,75,95,71,65,84,69,95,79,82,73,71,73,78));
if (_1b45ea46) {
const _c1ae6215 = _1b45ea46._3022baf8(/\/+$/,_2ccaed92._d6b92178());
return {
_7d43ab49: _c1ae6215,_dde4fbe5: _2ccaed92._d6b92178(36,123,10,111,114,105,103,105,110,10,125,10,36,123,10,71,65,84,69,95,74,87,75,83,95,80,65,84,72,10,125,10) 
}
;

}
const xf = _81b96b08.get(_2ccaed92._d6b92178(120,45,102,111,114,119,97,114,100,101,100,45,104,111,115,116))?._d5ab6a62(_2ccaed92._d6b92178(44))[0]?._7149f081();
const _ee4ed25e = (xf || _81b96b08.get(_2ccaed92._d6b92178(104,111,115,116)) || _2ccaed92._d6b92178()) ._d5ab6a62(_2ccaed92._d6b92178(58))[0] ?._7149f081() ._0db787ee();
if (!_ee4ed25e) return null;
let _7d43ab49: _bafff3e9 | null = null;
if ( _ee4ed25e === _2ccaed92._d6b92178(97,112,112,45,98,117,105,108,100,101,114,45,116,101,115,116,105,110,103,46,99,111,109) || _ee4ed25e._0307fa4d(_2ccaed92._d6b92178(46,97,112,112,45,98,117,105,108,100,101,114,45,116,101,115,116,105,110,103,46,99,111,109)) ) {
_7d43ab49 = _2ccaed92._d6b92178(104,116,116,112,115,58,32,10,125,10,101,108,115,101,32,105,102,32,40,104,111,115,116,32,61,61,61,32)_726b5d22._af66a3c4._d6b92178(32,124,124,32,104,111,115,116,46,101,110,100,115,87,105,116,104,40)._726b5d22._af66a3c4._d6b92178(41,41,32,123,10,105,115,115,117,101,114,32,61,32)_3b757f3c: 
}
if (!_7d43ab49) return null;
return {
_7d43ab49,_dde4fbe5: _2ccaed92._d6b92178(36,123,10,105,115,115,117,101,114,10,125,10,36,123,10,71,65,84,69,95,74,87,75,83,95,80,65,84,72,10,125,10) 
}
;

}
export _2bc8a13f _b5063084 = {
_38fd3e1c: _bafff3e9;
_82a8fe79: _bafff3e9 
}
;
export function _feab8827( _6c78bcb6: _c7575134 _b5063084[],_773eacb7: _bafff3e9,_82d91eaf: _bafff3e9,): _de162547 {
return _6c78bcb6._632dd0ed( (_5e325cd1) => _5e325cd1._38fd3e1c === _82d91eaf && _5e325cd1._82a8fe79 === _773eacb7,);

}
export async function _a1b8a3b5( _81b96b08: _00c0ef10,_374ca875?: _40729f5b,): _e4e671ac<_7836c25b | null> {
if (!_b4c3ae00()) return null;
const _c416ab4c = _81b96b08.get(_5bfe9577)?._7149f081();
if (!_c416ab4c) return null;
const _33c77dc8 = env(_2ccaed92._d6b92178(71,82,79,75,95,80,82,79,74,69,67,84,95,73,68));
if (!_33c77dc8) return null;
const _f083fe67 = _4ca6b799(_81b96b08);
if (!_f083fe67) return null;
return _3ef52376(_c416ab4c,{
_7d43ab49: _f083fe67._7d43ab49,_c08e4c39: _2ccaed92._d6b92178(97,112,112,58,36,123,10,112,114,111,106,101,99,116,73,100,10,125,10),_1c384cf6: _62b730b4(_f083fe67._dde4fbe5,_374ca875),}
);

}

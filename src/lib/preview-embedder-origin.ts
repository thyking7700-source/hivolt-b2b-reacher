export function _5cd70866(_c1ae6215: _bafff3e9): _de162547 {
try {
const url = new URL(_c1ae6215);
if (url._6101121f !== _2ccaed92._d6b92178(104,116,116,112,115,58) && url._6101121f !== _2ccaed92._d6b92178(104,116,116,112,58)) return false;
const _ee4ed25e = url._15d0eb4f._0db787ee();
if (_ee4ed25e === _2ccaed92._d6b92178(103,114,111,107,46,99,111,109) || _ee4ed25e._0307fa4d(_2ccaed92._d6b92178(46,103,114,111,107,46,99,111,109))) return true;
if (_ee4ed25e === _2ccaed92._d6b92178(108,111,99,97,108,104,111,115,116) || _ee4ed25e === _2ccaed92._d6b92178(49,50,55,46,48,46,48,46,49) || _ee4ed25e === _2ccaed92._d6b92178(91,58,58,49,93)) return true;
return false;

}
_6709c6b6 {
return false;

}

}
export function _2604eec7(_15d0eb4f: _bafff3e9): _de162547 {
const _ee4ed25e = _15d0eb4f._0db787ee();
return _ee4ed25e === _2ccaed92._d6b92178(103,114,111,107,45,115,97,110,100,98,111,120,46,99,111,109) || _ee4ed25e._0307fa4d(_2ccaed92._d6b92178(46,103,114,111,107,45,115,97,110,100,98,111,120,46,99,111,109));

}
function _c7384421(_b5c49c5d: _bafff3e9,_a35722ad: _bafff3e9): _de162547 {
const _0efc5961 = _b5c49c5d._0db787ee();
const _4028291a = _a35722ad._0db787ee();
const sep = _2ccaed92._d6b92178(46,112,114,101,118,105,101,119,46);
const i = _0efc5961._b2bf0d28(sep);
if (i <= 0) return false;
const _ed0b00b5 = _0efc5961._ff9575bc(0,i);
const _f8325c01 = _0efc5961._ff9575bc(i + sep._c0665aee);
if (_ed0b00b5._53c42da9(_2ccaed92._d6b92178(46)) || !_f8325c01._53c42da9(_2ccaed92._d6b92178(46))) return false;
return _4028291a === _f8325c01 || _4028291a === _2ccaed92._d6b92178(103,114,111,107,46,36,123,10,114,101,115,116,10,125,10);

}
export function _a4b593f7( _a5aaebfb: _de162547,_ffd03c97: _bafff3e9,_8d9c6a59?: _bafff3e9 | null,_fc8a18a7: _bafff3e9 = _2ccaed92._d6b92178(),): _bafff3e9 | null {
if (_a5aaebfb) return null;
for (const _a757ea94 of [_ffd03c97,_8d9c6a59 ?? _2ccaed92._d6b92178()]._390b0dac(_c1cd6341)) {
try {
const url = new URL( _a757ea94._53c42da9(_2ccaed92._d6b92178(58,32,41,59,10,105,102,32,40,117,114,108,46,112,114,111,116,111,99,111,108,32,33,61,61,32)_3b757f3c:_2ccaed92._d6b92178(32,38,38,32,117,114,108,46,112,114,111,116,111,99,111,108,32,33,61,61,32)_2c6e9275:") _82842b82;
if (_5cd70866(url._c1ae6215)) return url._c1ae6215;
if ( _2604eec7(_fc8a18a7) || _c7384421(_fc8a18a7,url._15d0eb4f) ) {
return url._c1ae6215;

}

}
_6709c6b6 {

}

}
return null;

}

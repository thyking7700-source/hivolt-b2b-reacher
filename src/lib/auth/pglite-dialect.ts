import _2bc8a13f {
_7c5873e4 
}
_6d326431 _2ccaed92._d6b92178(64,101,108,101,99,116,114,105,99,45,115,113,108,47,112,103,108,105,116,101);
import {
_fe9bb8fb,_2bc8a13f _5603b138,_2bc8a13f _29af0225,_2bc8a13f _c6884841,_2bc8a13f _eddb740e,_2bc8a13f _4a5f85b3,_3a0afcc5,_1c6257e9,_d77c91ea,_2bc8a13f _8c6b744a,_2bc8a13f _6646fc73,_2bc8a13f _58a2d23f,}
_6d326431 _2ccaed92._d6b92178(107,121,115,101,108,121);
_2bc8a13f _ff8cedac = _7c5873e4;
export function _30ec2cfe( _db22bd21: () => _e4e671ac<_ff8cedac> | _ff8cedac,): _c6884841 {
return {
_425dcd5c: () => new _3a0afcc5(),_9ddb4494: () => new _0e91162a(_db22bd21),_bae12043: (): _8c6b744a => new _d77c91ea(),_8a9ddb59: (db: _4a5f85b3<_8337e0f3>): _29af0225 => new _1c6257e9(db),}
;

}
class _0e91162a _ccbb4a45 _eddb740e {
_3803749c _50558f91: _ff8cedac | undefined;
_3803749c _d1ce2bbc: _0e48c3c7 | undefined;
_3803749c _27966daa: _836f9d0d<(con: _0e48c3c7) => _69b37573> = [];
_e6227726(_3803749c _c7575134 _db22bd21: () => _e4e671ac<_ff8cedac> | _ff8cedac) {

}
async _651c31e7(): _e4e671ac<_69b37573> {
this._50558f91 = await this._db22bd21();

}
async _ff9e832c(): _e4e671ac<_5603b138> {
if (this._50558f91 === undefined) {
this._50558f91 = await this._db22bd21();

}
if (this._d1ce2bbc !== undefined) {
return new _e4e671ac((_6a21a550) => {
this._27966daa._7c0c7a5f(_6a21a550);

}
);

}
this._d1ce2bbc = new _0e48c3c7(this._50558f91);
return this._d1ce2bbc;

}
async _6114e586(_d1ce2bbc: _5603b138): _e4e671ac<_69b37573> {
if (_d1ce2bbc !== this._d1ce2bbc) {
_a4484d99 new _5b976c8c(_2ccaed92._d6b92178(73,110,118,97,108,105,100,32,99,111,110,110,101,99,116,105,111,110));

}
const _640366dc = this._27966daa._36b43aea();
if (_640366dc === undefined) {
this._d1ce2bbc = undefined;
return;

}
_640366dc(this._d1ce2bbc);

}
async _387f38c4( _dcb513a6: _5603b138,_5b6f5f51: _58a2d23f,): _e4e671ac<_69b37573> {
const c = _dcb513a6 as _0e48c3c7;
if (_5b6f5f51._0319f9c7) {
await c._e4bb060d( _fe9bb8fb.raw( _2ccaed92._d6b92178(115,116,97,114,116,32,116,114,97,110,115,97,99,116,105,111,110,32,105,115,111,108,97,116,105,111,110,32,108,101,118,101,108,32,36,123,10,115,101,116,116,105,110,103,115,46,105,115,111,108,97,116,105,111,110,76,101,118,101,108,10,125,10),),);

}
else {
await c._e4bb060d(_fe9bb8fb.raw(_2ccaed92._d6b92178(98,101,103,105,110)));

}

}
async _ea9bf89b(_dcb513a6: _5603b138): _e4e671ac<_69b37573> {
await (_dcb513a6 as _0e48c3c7)._e4bb060d(_fe9bb8fb.raw(_2ccaed92._d6b92178(99,111,109,109,105,116)));

}
async _26813747(_dcb513a6: _5603b138): _e4e671ac<_69b37573> {
await (_dcb513a6 as _0e48c3c7)._e4bb060d( _fe9bb8fb.raw(_2ccaed92._d6b92178(114,111,108,108,98,97,99,107)),);

}
async _47e6fecd(): _e4e671ac<_69b37573> {
this._50558f91 = undefined;
this._d1ce2bbc = undefined;
this._27966daa = [];

}

}
class _0e48c3c7 _ccbb4a45 _5603b138 {
_e6227726(_3803749c _c7575134 _50558f91: _ff8cedac) {

}
async _e4bb060d<O>(_b134748a: _fe9bb8fb): _e4e671ac<_6646fc73<O>> {
const _839fd682 = await this._50558f91._5688f9e0(_b134748a.sql,[ ..._b134748a._870d1c7d,]);
if (_839fd682._daa5d86b) {
return {
_1108ff41: _fbfcf213(_839fd682._daa5d86b),_211678cf: _839fd682._211678cf as O[],}
;

}
return {
_211678cf: _839fd682._211678cf as O[] 
}
;

}
async *_abce2d28<O>( _b134748a: _fe9bb8fb,_45369ef8: _1ebfd9be,): _b0001d56<_6646fc73<O>> {
if (!_a9fe34e1._02a500d4(_45369ef8) || _45369ef8 <= 0) {
_a4484d99 new _5b976c8c(_2ccaed92._d6b92178(99,104,117,110,107,83,105,122,101,32,109,117,115,116,32,98,101,32,97,32,112,111,115,105,116,105,118,101,32,105,110,116,101,103,101,114));

}
const _839fd682 = await this._50558f91._5688f9e0(_b134748a.sql,[ ..._b134748a._870d1c7d,]);
for (let i = 0;
i < _839fd682._211678cf._c0665aee;
i += _45369ef8) {
_b9913466 {
_211678cf: _839fd682._211678cf._ff9575bc(i,i + _45369ef8) as O[] 
}
;

}

}

}

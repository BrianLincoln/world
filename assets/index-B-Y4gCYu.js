(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=1e3,t=1001,n=1002,r=1003,i=1004,a=1005,o=1006,s=1007,c=1008,l=1009,u=1010,d=1011,f=1012,p=1013,m=1014,h=1015,g=1016,_=1017,v=1018,y=1020,b=35902,x=35899,S=1021,C=1022,w=1023,T=1026,E=1027,D=1028,O=1029,k=1030,A=1031,j=1033,M=33776,N=33777,P=33778,ee=33779,F=35840,te=35841,ne=35842,re=35843,ie=36196,ae=37492,oe=37496,se=37488,I=37489,ce=37490,le=37491,ue=37808,de=37809,fe=37810,pe=37811,me=37812,he=37813,ge=37814,_e=37815,ve=37816,ye=37817,be=37818,xe=37819,Se=37820,Ce=37821,we=36492,Te=36494,Ee=36495,De=36283,Oe=36284,ke=36285,Ae=36286,je=2300,L=2301,Me=2302,Ne=2303,Pe=2400,R=2401,Fe=2402,z=3200,Ie=`srgb`,Le=`srgb-linear`,Re=`linear`,ze=`srgb`,Be=7680,Ve=35044,He=35048,Ue=`300 es`,We=2e3;function Ge(e){for(let t=e.length-1;t>=0;--t)if(e[t]>=65535)return!0;return!1}function Ke(e){return ArrayBuffer.isView(e)&&!(e instanceof DataView)}function qe(e){return document.createElementNS(`http://www.w3.org/1999/xhtml`,e)}function Je(){let e=qe(`canvas`);return e.style.display=`block`,e}var Ye={};function Xe(...e){let t=`THREE.`+e.shift();console.log(t,...e)}function Ze(e){let t=e[0];if(typeof t==`string`&&t.startsWith(`TSL:`)){let t=e[1];t&&t.isStackTrace?e[0]+=` `+t.getLocation():e[1]=`Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.`}return e}function B(...e){e=Ze(e);let t=`THREE.`+e.shift();{let n=e[0];n&&n.isStackTrace?console.warn(n.getError(t)):console.warn(t,...e)}}function V(...e){e=Ze(e);let t=`THREE.`+e.shift();{let n=e[0];n&&n.isStackTrace?console.error(n.getError(t)):console.error(t,...e)}}function Qe(...e){let t=e.join(` `);t in Ye||(Ye[t]=!0,B(...e))}function $e(e,t,n){return new Promise(function(r,i){function a(){switch(e.clientWaitSync(t,e.SYNC_FLUSH_COMMANDS_BIT,0)){case e.WAIT_FAILED:i();break;case e.TIMEOUT_EXPIRED:setTimeout(a,n);break;default:r()}}setTimeout(a,n)})}var et={0:1,2:6,4:7,3:5,1:0,6:2,7:4,5:3},tt=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n!==void 0&&n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let r=n[e];if(r!==void 0){let e=r.indexOf(t);e!==-1&&r.splice(e,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let t=n.slice(0);for(let n=0,r=t.length;n<r;n++)t[n].call(this,e);e.target=null}}},nt=`00.01.02.03.04.05.06.07.08.09.0a.0b.0c.0d.0e.0f.10.11.12.13.14.15.16.17.18.19.1a.1b.1c.1d.1e.1f.20.21.22.23.24.25.26.27.28.29.2a.2b.2c.2d.2e.2f.30.31.32.33.34.35.36.37.38.39.3a.3b.3c.3d.3e.3f.40.41.42.43.44.45.46.47.48.49.4a.4b.4c.4d.4e.4f.50.51.52.53.54.55.56.57.58.59.5a.5b.5c.5d.5e.5f.60.61.62.63.64.65.66.67.68.69.6a.6b.6c.6d.6e.6f.70.71.72.73.74.75.76.77.78.79.7a.7b.7c.7d.7e.7f.80.81.82.83.84.85.86.87.88.89.8a.8b.8c.8d.8e.8f.90.91.92.93.94.95.96.97.98.99.9a.9b.9c.9d.9e.9f.a0.a1.a2.a3.a4.a5.a6.a7.a8.a9.aa.ab.ac.ad.ae.af.b0.b1.b2.b3.b4.b5.b6.b7.b8.b9.ba.bb.bc.bd.be.bf.c0.c1.c2.c3.c4.c5.c6.c7.c8.c9.ca.cb.cc.cd.ce.cf.d0.d1.d2.d3.d4.d5.d6.d7.d8.d9.da.db.dc.dd.de.df.e0.e1.e2.e3.e4.e5.e6.e7.e8.e9.ea.eb.ec.ed.ee.ef.f0.f1.f2.f3.f4.f5.f6.f7.f8.f9.fa.fb.fc.fd.fe.ff`.split(`.`),rt=1234567,it=Math.PI/180,at=180/Math.PI;function ot(){let e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0,r=Math.random()*4294967295|0;return(nt[e&255]+nt[e>>8&255]+nt[e>>16&255]+nt[e>>24&255]+`-`+nt[t&255]+nt[t>>8&255]+`-`+nt[t>>16&15|64]+nt[t>>24&255]+`-`+nt[n&63|128]+nt[n>>8&255]+`-`+nt[n>>16&255]+nt[n>>24&255]+nt[r&255]+nt[r>>8&255]+nt[r>>16&255]+nt[r>>24&255]).toLowerCase()}function st(e,t,n){return Math.max(t,Math.min(n,e))}function ct(e,t){return(e%t+t)%t}function lt(e,t,n,r,i){return r+(e-t)*(i-r)/(n-t)}function ut(e,t,n){return e===t?0:(n-e)/(t-e)}function dt(e,t,n){return(1-n)*e+n*t}function ft(e,t,n,r){return dt(e,t,1-Math.exp(-n*r))}function pt(e,t=1){return t-Math.abs(ct(e,t*2)-t)}function mt(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*(3-2*e))}function ht(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*e*(e*(e*6-15)+10))}function gt(e,t){return e+Math.floor(Math.random()*(t-e+1))}function _t(e,t){return e+Math.random()*(t-e)}function vt(e){return e*(.5-Math.random())}function yt(e){e!==void 0&&(rt=e);let t=rt+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function bt(e){return e*it}function xt(e){return e*at}function St(e){return e>0&&Number.isInteger(e)&&2**Math.round(Math.log2(e))===e}function Ct(e){return 2**Math.ceil(Math.log(e)/Math.LN2)}function wt(e){return 2**Math.floor(Math.log(e)/Math.LN2)}function Tt(e,t,n,r,i){let a=Math.cos,o=Math.sin,s=a(n/2),c=o(n/2),l=a((t+r)/2),u=o((t+r)/2),d=a((t-r)/2),f=o((t-r)/2),p=a((r-t)/2),m=o((r-t)/2);switch(i){case`XYX`:e.set(s*u,c*d,c*f,s*l);break;case`YZY`:e.set(c*f,s*u,c*d,s*l);break;case`ZXZ`:e.set(c*d,c*f,s*u,s*l);break;case`XZX`:e.set(s*u,c*m,c*p,s*l);break;case`YXY`:e.set(c*p,s*u,c*m,s*l);break;case`ZYZ`:e.set(c*m,c*p,s*u,s*l);break;default:B(`MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: `+i)}}function Et(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return e/4294967295;case Uint16Array:return e/65535;case Uint8Array:case Uint8ClampedArray:return e/255;case Int32Array:return Math.max(e/2147483647,-1);case Int16Array:return Math.max(e/32767,-1);case Int8Array:return Math.max(e/127,-1);default:throw Error(`THREE.MathUtils: Invalid component type.`)}}function Dt(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return Math.round(e*4294967295);case Uint16Array:return Math.round(e*65535);case Uint8Array:case Uint8ClampedArray:return Math.round(e*255);case Int32Array:return Math.round(e*2147483647);case Int16Array:return Math.round(e*32767);case Int8Array:return Math.round(e*127);default:throw Error(`THREE.MathUtils: Invalid component type.`)}}var H={DEG2RAD:it,RAD2DEG:at,generateUUID:ot,clamp:st,euclideanModulo:ct,mapLinear:lt,inverseLerp:ut,lerp:dt,damp:ft,pingpong:pt,smoothstep:mt,smootherstep:ht,randInt:gt,randFloat:_t,randFloatSpread:vt,seededRandom:yt,degToRad:bt,radToDeg:xt,isPowerOfTwo:St,ceilPowerOfTwo:Ct,floorPowerOfTwo:wt,setQuaternionFromProperEuler:Tt,normalize:Dt,denormalize:Et},U=class e{static{e.prototype.isVector2=!0}constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw Error(`THREE.Vector2: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw Error(`THREE.Vector2: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6],this.y=r[1]*t+r[4]*n+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=st(this.x,e.x,t.x),this.y=st(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=st(this.x,e,t),this.y=st(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(st(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(st(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),r=Math.sin(t),i=this.x-e.x,a=this.y-e.y;return this.x=i*n-a*r+e.x,this.y=i*r+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},Ot=class{constructor(e=0,t=0,n=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=r}static slerpFlat(e,t,n,r,i,a,o){let s=n[r+0],c=n[r+1],l=n[r+2],u=n[r+3],d=i[a+0],f=i[a+1],p=i[a+2],m=i[a+3];if(u!==m||s!==d||c!==f||l!==p){let e=s*d+c*f+l*p+u*m;e<0&&(d=-d,f=-f,p=-p,m=-m,e=-e);let t=1-o;if(e<.9995){let n=Math.acos(e),r=Math.sin(n);t=Math.sin(t*n)/r,o=Math.sin(o*n)/r,s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o}else{s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o;let e=1/Math.sqrt(s*s+c*c+l*l+u*u);s*=e,c*=e,l*=e,u*=e}}e[t]=s,e[t+1]=c,e[t+2]=l,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,r,i,a){let o=n[r],s=n[r+1],c=n[r+2],l=n[r+3],u=i[a],d=i[a+1],f=i[a+2],p=i[a+3];return e[t]=o*p+l*u+s*f-c*d,e[t+1]=s*p+l*d+c*u-o*f,e[t+2]=c*p+l*f+o*d-s*u,e[t+3]=l*p-o*u-s*d-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,r){return this._x=e,this._y=t,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,r=e._y,i=e._z,a=e._order,o=Math.cos,s=Math.sin,c=o(n/2),l=o(r/2),u=o(i/2),d=s(n/2),f=s(r/2),p=s(i/2);switch(a){case`XYZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`YXZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`ZXY`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`ZYX`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`YZX`:this._x=d*l*u+c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u-d*f*p;break;case`XZY`:this._x=d*l*u-c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u+d*f*p;break;default:B(`Quaternion: .setFromEuler() encountered an unknown order: `+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,r=Math.sin(n);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],r=t[4],i=t[8],a=t[1],o=t[5],s=t[9],c=t[2],l=t[6],u=t[10],d=n+o+u;if(d>0){let e=.5/Math.sqrt(d+1);this._w=.25/e,this._x=(l-s)*e,this._y=(i-c)*e,this._z=(a-r)*e}else if(n>o&&n>u){let e=2*Math.sqrt(1+n-o-u);this._w=(l-s)/e,this._x=.25*e,this._y=(r+a)/e,this._z=(i+c)/e}else if(o>u){let e=2*Math.sqrt(1+o-n-u);this._w=(i-c)/e,this._x=(r+a)/e,this._y=.25*e,this._z=(s+l)/e}else{let e=2*Math.sqrt(1+u-n-o);this._w=(a-r)/e,this._x=(i+c)/e,this._y=(s+l)/e,this._z=.25*e}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(st(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let r=Math.min(1,t/n);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x*=e,this._y*=e,this._z*=e,this._w*=e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=t._x,s=t._y,c=t._z,l=t._w;return this._x=n*l+a*o+r*c-i*s,this._y=r*l+a*s+i*o-n*c,this._z=i*l+a*c+n*s-r*o,this._w=a*l-n*o-r*s-i*c,this._onChangeCallback(),this}slerp(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=this.dot(e);o<0&&(n=-n,r=-r,i=-i,a=-a,o=-o);let s=1-t;if(o<.9995){let e=Math.acos(o),c=Math.sin(e);s=Math.sin(s*e)/c,t=Math.sin(t*e)/c,this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this._onChangeCallback()}else this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),i=Math.sqrt(n);return this.set(r*Math.sin(e),r*Math.cos(e),i*Math.sin(t),i*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},W=class e{static{e.prototype.isVector3=!0}constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw Error(`THREE.Vector3: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error(`THREE.Vector3: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(At.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(At.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6]*r,this.y=i[1]*t+i[4]*n+i[7]*r,this.z=i[2]*t+i[5]*n+i[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=e.elements,a=1/(i[3]*t+i[7]*n+i[11]*r+i[15]);return this.x=(i[0]*t+i[4]*n+i[8]*r+i[12])*a,this.y=(i[1]*t+i[5]*n+i[9]*r+i[13])*a,this.z=(i[2]*t+i[6]*n+i[10]*r+i[14])*a,this}applyQuaternion(e){let t=this.x,n=this.y,r=this.z,i=e.x,a=e.y,o=e.z,s=e.w,c=2*(a*r-o*n),l=2*(o*t-i*r),u=2*(i*n-a*t);return this.x=t+s*c+a*u-o*l,this.y=n+s*l+o*c-i*u,this.z=r+s*u+i*l-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[4]*n+i[8]*r,this.y=i[1]*t+i[5]*n+i[9]*r,this.z=i[2]*t+i[6]*n+i[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=st(this.x,e.x,t.x),this.y=st(this.y,e.y,t.y),this.z=st(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=st(this.x,e,t),this.y=st(this.y,e,t),this.z=st(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(st(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,r=e.y,i=e.z,a=t.x,o=t.y,s=t.z;return this.x=r*s-i*o,this.y=i*a-n*s,this.z=n*o-r*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return kt.copy(this).projectOnVector(e),this.sub(kt)}reflect(e){return this.sub(kt.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(st(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,r=this.z-e.z;return t*t+n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let r=Math.sin(t)*e;return this.x=r*Math.sin(n),this.y=Math.cos(t)*e,this.z=r*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},kt=new W,At=new Ot,G=class e{static{e.prototype.isMatrix3=!0}constructor(e,t,n,r,i,a,o,s,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,s,c)}set(e,t,n,r,i,a,o,s,c){let l=this.elements;return l[0]=e,l[1]=r,l[2]=o,l[3]=t,l[4]=i,l[5]=s,l[6]=n,l[7]=a,l[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[3],s=n[6],c=n[1],l=n[4],u=n[7],d=n[2],f=n[5],p=n[8],m=r[0],h=r[3],g=r[6],_=r[1],v=r[4],y=r[7],b=r[2],x=r[5],S=r[8];return i[0]=a*m+o*_+s*b,i[3]=a*h+o*v+s*x,i[6]=a*g+o*y+s*S,i[1]=c*m+l*_+u*b,i[4]=c*h+l*v+u*x,i[7]=c*g+l*y+u*S,i[2]=d*m+f*_+p*b,i[5]=d*h+f*v+p*x,i[8]=d*g+f*y+p*S,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8];return t*a*l-t*o*c-n*i*l+n*o*s+r*i*c-r*a*s}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=l*a-o*c,d=o*s-l*i,f=c*i-a*s,p=t*u+n*d+r*f;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);let m=1/p;return e[0]=u*m,e[1]=(r*c-l*n)*m,e[2]=(o*n-r*a)*m,e[3]=d*m,e[4]=(l*t-r*s)*m,e[5]=(r*i-o*t)*m,e[6]=f*m,e[7]=(n*s-c*t)*m,e[8]=(a*t-n*i)*m,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,r,i,a,o){let s=Math.cos(i),c=Math.sin(i);return this.set(n*s,n*c,-n*(s*a+c*o)+a+e,-r*c,r*s,-r*(-c*a+s*o)+o+t,0,0,1),this}scale(e,t){return Qe(`Matrix3: .scale() is deprecated. Use .makeScale() instead.`),this.premultiply(jt.makeScale(e,t)),this}rotate(e){return Qe(`Matrix3: .rotate() is deprecated. Use .makeRotation() instead.`),this.premultiply(jt.makeRotation(-e)),this}translate(e,t){return Qe(`Matrix3: .translate() is deprecated. Use .makeTranslation() instead.`),this.premultiply(jt.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<9;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}},jt=new G,Mt=new G().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Nt=new G().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Pt(){let e={enabled:!0,workingColorSpace:Le,spaces:{},convert:function(e,t,n){return this.enabled===!1||t===n||!t||!n?e:(this.spaces[t].transfer===`srgb`&&(e.r=It(e.r),e.g=It(e.g),e.b=It(e.b)),this.spaces[t].primaries!==this.spaces[n].primaries&&(e.applyMatrix3(this.spaces[t].toXYZ),e.applyMatrix3(this.spaces[n].fromXYZ)),this.spaces[n].transfer===`srgb`&&(e.r=Lt(e.r),e.g=Lt(e.g),e.b=Lt(e.b)),e)},workingToColorSpace:function(e,t){return this.convert(e,this.workingColorSpace,t)},colorSpaceToWorking:function(e,t){return this.convert(e,t,this.workingColorSpace)},getPrimaries:function(e){return this.spaces[e].primaries},getTransfer:function(e){return e===``?Re:this.spaces[e].transfer},getToneMappingMode:function(e){return this.spaces[e].outputColorSpaceConfig.toneMappingMode||`standard`},getLuminanceCoefficients:function(e,t=this.workingColorSpace){return e.fromArray(this.spaces[t].luminanceCoefficients)},define:function(e){Object.assign(this.spaces,e)},_getMatrix:function(e,t,n){return e.copy(this.spaces[t].toXYZ).multiply(this.spaces[n].fromXYZ)},_getDrawingBufferColorSpace:function(e){return this.spaces[e].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(e=this.workingColorSpace){return this.spaces[e].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(t,n){return Qe(`ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace().`),e.workingToColorSpace(t,n)},toWorkingColorSpace:function(t,n){return Qe(`ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking().`),e.colorSpaceToWorking(t,n)}},t=[.64,.33,.3,.6,.15,.06],n=[.2126,.7152,.0722],r=[.3127,.329];return e.define({[Le]:{primaries:t,whitePoint:r,transfer:Re,toXYZ:Mt,fromXYZ:Nt,luminanceCoefficients:n,workingColorSpaceConfig:{unpackColorSpace:Ie},outputColorSpaceConfig:{drawingBufferColorSpace:Ie}},[Ie]:{primaries:t,whitePoint:r,transfer:ze,toXYZ:Mt,fromXYZ:Nt,luminanceCoefficients:n,outputColorSpaceConfig:{drawingBufferColorSpace:Ie}}}),e}var Ft=Pt();function It(e){return e<.04045?e*.0773993808:(e*.9478672986+.0521327014)**2.4}function Lt(e){return e<.0031308?e*12.92:1.055*e**.41666-.055}var Rt,zt=class{static getDataURL(e,t=`image/png`){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>`u`)return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{Rt===void 0&&(Rt=qe(`canvas`)),Rt.width=e.width,Rt.height=e.height;let t=Rt.getContext(`2d`);e instanceof ImageData?t.putImageData(e,0,0):t.drawImage(e,0,0,e.width,e.height),n=Rt}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap){let t=qe(`canvas`);t.width=e.width,t.height=e.height;let n=t.getContext(`2d`);n.drawImage(e,0,0,e.width,e.height);let r=n.getImageData(0,0,e.width,e.height),i=r.data;for(let e=0;e<i.length;e++)i[e]=It(i[e]/255)*255;return n.putImageData(r,0,0),t}if(e.data){let t=e.data.slice(0);for(let e=0;e<t.length;e++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[e]=Math.floor(It(t[e]/255)*255):t[e]=It(t[e]);return{data:t,width:e.width,height:e.height}}return B(`ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied.`),e}},Bt=0,Vt=class{constructor(e=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:Bt++}),this.uuid=ot(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<`u`&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<`u`&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t===null?e.set(0,0,0):e.set(t.width,t.height,t.depth||0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:``},r=this.data;if(r!==null){let e;if(Array.isArray(r)){e=[];for(let t=0,n=r.length;t<n;t++)r[t].isDataTexture?e.push(Ht(r[t].image)):e.push(Ht(r[t]))}else e=Ht(r);n.url=e}return t||(e.images[this.uuid]=n),n}};function Ht(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap?zt.getDataURL(e):e.data?{data:Array.from(e.data),width:e.width,height:e.height,type:e.data.constructor.name}:(B(`Texture: Unable to serialize Texture.`),{})}var Ut=0,Wt=new W,Gt=class r extends tt{constructor(e=r.DEFAULT_IMAGE,n=r.DEFAULT_MAPPING,i=t,a=t,s=o,u=c,d=w,f=l,p=r.DEFAULT_ANISOTROPY,m=``){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Ut++}),this.uuid=ot(),this.name=``,this.source=new Vt(e),this.mipmaps=[],this.mapping=n,this.channel=0,this.wrapS=i,this.wrapT=a,this.magFilter=s,this.minFilter=u,this.anisotropy=p,this.format=d,this.internalFormat=null,this.type=f,this.offset=new U(0,0),this.repeat=new U(1,1),this.center=new U(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new G,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=m,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Wt).x}get height(){return this.source.getSize(Wt).y}get depth(){return this.source.getSize(Wt).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){B(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let r=this[t];if(r===void 0){B(`Texture.setValues(): property '${t}' does not exist.`);continue}r&&n&&r.isVector2&&n.isVector2||r&&n&&r.isVector3&&n.isVector3||r&&n&&r.isMatrix3&&n.isMatrix3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:`Texture`,generator:`Texture.toJSON`},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:`dispose`})}transformUv(r){if(this.mapping!==300)return r;if(r.applyMatrix3(this.matrix),r.x<0||r.x>1)switch(this.wrapS){case e:r.x-=Math.floor(r.x);break;case t:r.x=r.x<0?0:1;break;case n:Math.abs(Math.floor(r.x)%2)===1?r.x=Math.ceil(r.x)-r.x:r.x-=Math.floor(r.x)}if(r.y<0||r.y>1)switch(this.wrapT){case e:r.y-=Math.floor(r.y);break;case t:r.y=r.y<0?0:1;break;case n:Math.abs(Math.floor(r.y)%2)===1?r.y=Math.ceil(r.y)-r.y:r.y-=Math.floor(r.y)}return this.flipY&&(r.y=1-r.y),r}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};Gt.DEFAULT_IMAGE=null,Gt.DEFAULT_MAPPING=300,Gt.DEFAULT_ANISOTROPY=1;var Kt=class e{static{e.prototype.isVector4=!0}constructor(e=0,t=0,n=0,r=1){this.x=e,this.y=t,this.z=n,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw Error(`THREE.Vector4: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error(`THREE.Vector4: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w===void 0?1:e.w,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*r+a[12]*i,this.y=a[1]*t+a[5]*n+a[9]*r+a[13]*i,this.z=a[2]*t+a[6]*n+a[10]*r+a[14]*i,this.w=a[3]*t+a[7]*n+a[11]*r+a[15]*i,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,r,i,a=.01,o=.1,s=e.elements,c=s[0],l=s[4],u=s[8],d=s[1],f=s[5],p=s[9],m=s[2],h=s[6],g=s[10];if(Math.abs(l-d)<a&&Math.abs(u-m)<a&&Math.abs(p-h)<a){if(Math.abs(l+d)<o&&Math.abs(u+m)<o&&Math.abs(p+h)<o&&Math.abs(c+f+g-3)<o)return this.set(1,0,0,0),this;t=Math.PI;let e=(c+1)/2,s=(f+1)/2,_=(g+1)/2,v=(l+d)/4,y=(u+m)/4,b=(p+h)/4;return e>s&&e>_?e<a?(n=0,r=.707106781,i=.707106781):(n=Math.sqrt(e),r=v/n,i=y/n):s>_?s<a?(n=.707106781,r=0,i=.707106781):(r=Math.sqrt(s),n=v/r,i=b/r):_<a?(n=.707106781,r=.707106781,i=0):(i=Math.sqrt(_),n=y/i,r=b/i),this.set(n,r,i,t),this}let _=Math.sqrt((h-p)*(h-p)+(u-m)*(u-m)+(d-l)*(d-l));return Math.abs(_)<.001&&(_=1),this.x=(h-p)/_,this.y=(u-m)/_,this.z=(d-l)/_,this.w=Math.acos((c+f+g-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=st(this.x,e.x,t.x),this.y=st(this.y,e.y,t.y),this.z=st(this.z,e.z,t.z),this.w=st(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=st(this.x,e,t),this.y=st(this.y,e,t),this.z=st(this.z,e,t),this.w=st(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(st(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},qt=class extends tt{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:o,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new Kt(0,0,e,t),this.scissorTest=!1,this.viewport=new Kt(0,0,e,t),this.textures=[];let r=new Gt({width:e,height:t,depth:n.depth}),i=n.count;for(let e=0;e<i;e++)this.textures[e]=r.clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(e={}){let t={minFilter:o,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let e=0;e<this.textures.length;e++)this.textures[e].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),e!==null&&e.renderTarget===null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let r=0,i=this.textures.length;r<i;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=n,this.textures[r].isData3DTexture!==!0&&(this.textures[r].isArrayTexture=this.textures[r].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let n=Object.assign({},e.textures[t].image);this.textures[t].source=new Vt(n)}if(this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveColorBuffer=e.resolveColorBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,this.storeMultisampledColorBuffer=e.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=e.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=e.storeMultisampledStencilBuffer,e.depthTexture!==null){if(e.depthTexture.renderTarget===e){let t=e.depthTexture.clone();t.renderTarget=null,this.depthTexture=t}else this.depthTexture=e.depthTexture}return this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:`dispose`})}},Jt=class extends qt{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},Yt=class extends Gt{constructor(e=null,n=1,i=1,a=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:n,height:i,depth:a},this.magFilter=r,this.minFilter=r,this.wrapR=t,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}},Xt=class extends Gt{constructor(e=null,n=1,i=1,a=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:n,height:i,depth:a},this.magFilter=r,this.minFilter=r,this.wrapR=t,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}},Zt=class e{static{e.prototype.isMatrix4=!0}constructor(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h)}set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){let g=this.elements;return g[0]=e,g[4]=t,g[8]=n,g[12]=r,g[1]=i,g[5]=a,g[9]=o,g[13]=s,g[2]=c,g[6]=l,g[10]=u,g[14]=d,g[3]=f,g[7]=p,g[11]=m,g[15]=h,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new e().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();let t=this.elements,n=e.elements,r=1/Qt.setFromMatrixColumn(e,0).length(),i=1/Qt.setFromMatrixColumn(e,1).length(),a=1/Qt.setFromMatrixColumn(e,2).length();return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=0,t[4]=n[4]*i,t[5]=n[5]*i,t[6]=n[6]*i,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,r=e.y,i=e.z,a=Math.cos(n),o=Math.sin(n),s=Math.cos(r),c=Math.sin(r),l=Math.cos(i),u=Math.sin(i);if(e.order===`XYZ`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=-s*u,t[8]=c,t[1]=n+r*c,t[5]=e-i*c,t[9]=-o*s,t[2]=i-e*c,t[6]=r+n*c,t[10]=a*s}else if(e.order===`YXZ`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e+i*o,t[4]=r*o-n,t[8]=a*c,t[1]=a*u,t[5]=a*l,t[9]=-o,t[2]=n*o-r,t[6]=i+e*o,t[10]=a*s}else if(e.order===`ZXY`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e-i*o,t[4]=-a*u,t[8]=r+n*o,t[1]=n+r*o,t[5]=a*l,t[9]=i-e*o,t[2]=-a*c,t[6]=o,t[10]=a*s}else if(e.order===`ZYX`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=r*c-n,t[8]=e*c+i,t[1]=s*u,t[5]=i*c+e,t[9]=n*c-r,t[2]=-c,t[6]=o*s,t[10]=a*s}else if(e.order===`YZX`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=i-e*u,t[8]=r*u+n,t[1]=u,t[5]=a*l,t[9]=-o*l,t[2]=-c*l,t[6]=n*u+r,t[10]=e-i*u}else if(e.order===`XZY`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=-u,t[8]=c*l,t[1]=e*u+i,t[5]=a*l,t[9]=n*u-r,t[2]=r*u-n,t[6]=o*l,t[10]=i*u+e}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(en,e,tn)}lookAt(e,t,n){let r=this.elements;return an.subVectors(e,t),an.lengthSq()===0&&(an.z=1),an.normalize(),nn.crossVectors(n,an),nn.lengthSq()===0&&(Math.abs(n.z)===1?an.x+=1e-4:an.z+=1e-4,an.normalize(),nn.crossVectors(n,an)),nn.normalize(),rn.crossVectors(an,nn),r[0]=nn.x,r[4]=rn.x,r[8]=an.x,r[1]=nn.y,r[5]=rn.y,r[9]=an.y,r[2]=nn.z,r[6]=rn.z,r[10]=an.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[4],s=n[8],c=n[12],l=n[1],u=n[5],d=n[9],f=n[13],p=n[2],m=n[6],h=n[10],g=n[14],_=n[3],v=n[7],y=n[11],b=n[15],x=r[0],S=r[4],C=r[8],w=r[12],T=r[1],E=r[5],D=r[9],O=r[13],k=r[2],A=r[6],j=r[10],M=r[14],N=r[3],P=r[7],ee=r[11],F=r[15];return i[0]=a*x+o*T+s*k+c*N,i[4]=a*S+o*E+s*A+c*P,i[8]=a*C+o*D+s*j+c*ee,i[12]=a*w+o*O+s*M+c*F,i[1]=l*x+u*T+d*k+f*N,i[5]=l*S+u*E+d*A+f*P,i[9]=l*C+u*D+d*j+f*ee,i[13]=l*w+u*O+d*M+f*F,i[2]=p*x+m*T+h*k+g*N,i[6]=p*S+m*E+h*A+g*P,i[10]=p*C+m*D+h*j+g*ee,i[14]=p*w+m*O+h*M+g*F,i[3]=_*x+v*T+y*k+b*N,i[7]=_*S+v*E+y*A+b*P,i[11]=_*C+v*D+y*j+b*ee,i[15]=_*w+v*O+y*M+b*F,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[12],a=e[1],o=e[5],s=e[9],c=e[13],l=e[2],u=e[6],d=e[10],f=e[14],p=e[3],m=e[7],h=e[11],g=e[15],_=s*f-c*d,v=o*f-c*u,y=o*d-s*u,b=a*f-c*l,x=a*d-s*l,S=a*u-o*l;return t*(m*_-h*v+g*y)-n*(p*_-h*b+g*x)+r*(p*v-m*b+g*S)-i*(p*y-m*x+h*S)}determinantAffine(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[1],a=e[5],o=e[9],s=e[2],c=e[6],l=e[10];return t*(a*l-o*c)-n*(i*l-o*s)+r*(i*c-a*s)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=e[9],d=e[10],f=e[11],p=e[12],m=e[13],h=e[14],g=e[15],_=t*o-n*a,v=t*s-r*a,y=t*c-i*a,b=n*s-r*o,x=n*c-i*o,S=r*c-i*s,C=l*m-u*p,w=l*h-d*p,T=l*g-f*p,E=u*h-d*m,D=u*g-f*m,O=d*g-f*h,k=_*O-v*D+y*E+b*T-x*w+S*C;if(k===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let A=1/k;return e[0]=(o*O-s*D+c*E)*A,e[1]=(r*D-n*O-i*E)*A,e[2]=(m*S-h*x+g*b)*A,e[3]=(d*x-u*S-f*b)*A,e[4]=(s*T-a*O-c*w)*A,e[5]=(t*O-r*T+i*w)*A,e[6]=(h*y-p*S-g*v)*A,e[7]=(l*S-d*y+f*v)*A,e[8]=(a*D-o*T+c*C)*A,e[9]=(n*T-t*D-i*C)*A,e[10]=(p*x-m*y+g*_)*A,e[11]=(u*y-l*x-f*_)*A,e[12]=(o*w-a*E-s*C)*A,e[13]=(t*E-n*w+r*C)*A,e[14]=(m*v-p*b-h*_)*A,e[15]=(l*b-u*v+d*_)*A,this}scale(e){let t=this.elements,n=e.x,r=e.y,i=e.z;return t[0]*=n,t[4]*=r,t[8]*=i,t[1]*=n,t[5]*=r,t[9]*=i,t[2]*=n,t[6]*=r,t[10]*=i,t[3]*=n,t[7]*=r,t[11]*=i,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,r))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),r=Math.sin(t),i=1-n,a=e.x,o=e.y,s=e.z,c=i*a,l=i*o;return this.set(c*a+n,c*o-r*s,c*s+r*o,0,c*o+r*s,l*o+n,l*s-r*a,0,c*s-r*o,l*s+r*a,i*s*s+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,r,i,a){return this.set(1,n,i,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,n){let r=this.elements,i=t._x,a=t._y,o=t._z,s=t._w,c=i+i,l=a+a,u=o+o,d=i*c,f=i*l,p=i*u,m=a*l,h=a*u,g=o*u,_=s*c,v=s*l,y=s*u,b=n.x,x=n.y,S=n.z;return r[0]=(1-(m+g))*b,r[1]=(f+y)*b,r[2]=(p-v)*b,r[3]=0,r[4]=(f-y)*x,r[5]=(1-(d+g))*x,r[6]=(h+_)*x,r[7]=0,r[8]=(p+v)*S,r[9]=(h-_)*S,r[10]=(1-(d+m))*S,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){let r=this.elements;e.x=r[12],e.y=r[13],e.z=r[14];let i=this.determinantAffine();if(i===0)return n.set(1,1,1),t.identity(),this;let a=Qt.set(r[0],r[1],r[2]).length(),o=Qt.set(r[4],r[5],r[6]).length(),s=Qt.set(r[8],r[9],r[10]).length();i<0&&(a=-a),$t.copy(this);let c=1/a,l=1/o,u=1/s;return $t.elements[0]*=c,$t.elements[1]*=c,$t.elements[2]*=c,$t.elements[4]*=l,$t.elements[5]*=l,$t.elements[6]*=l,$t.elements[8]*=u,$t.elements[9]*=u,$t.elements[10]*=u,t.setFromRotationMatrix($t),n.x=a,n.y=o,n.z=s,this}makePerspective(e,t,n,r,i,a,o=We,s=!1){let c=this.elements,l=2*i/(t-e),u=2*i/(n-r),d=(t+e)/(t-e),f=(n+r)/(n-r),p,m;if(s)p=i/(a-i),m=a*i/(a-i);else if(o===2e3)p=-(a+i)/(a-i),m=-2*a*i/(a-i);else if(o===2001)p=-a/(a-i),m=-a*i/(a-i);else throw Error(`THREE.Matrix4.makePerspective(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,r,i,a,o=We,s=!1){let c=this.elements,l=2/(t-e),u=2/(n-r),d=-(t+e)/(t-e),f=-(n+r)/(n-r),p,m;if(s)p=1/(a-i),m=a/(a-i);else if(o===2e3)p=-2/(a-i),m=-(a+i)/(a-i);else if(o===2001)p=-1/(a-i),m=-i/(a-i);else throw Error(`THREE.Matrix4.makeOrthographic(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=u,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<16;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}},Qt=new W,$t=new Zt,en=new W(0,0,0),tn=new W(1,1,1),nn=new W,rn=new W,an=new W,on=new Zt,sn=new Ot,cn=class e{constructor(t=0,n=0,r=0,i=e.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=n,this._z=r,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,r=this._order){return this._x=e,this._y=t,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let r=e.elements,i=r[0],a=r[4],o=r[8],s=r[1],c=r[5],l=r[9],u=r[2],d=r[6],f=r[10];switch(t){case`XYZ`:this._y=Math.asin(st(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-l,f),this._z=Math.atan2(-a,i)):(this._x=Math.atan2(d,c),this._z=0);break;case`YXZ`:this._x=Math.asin(-st(l,-1,1)),Math.abs(l)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(s,c)):(this._y=Math.atan2(-u,i),this._z=0);break;case`ZXY`:this._x=Math.asin(st(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(s,i));break;case`ZYX`:this._y=Math.asin(-st(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(s,i)):(this._x=0,this._z=Math.atan2(-a,c));break;case`YZX`:this._z=Math.asin(st(s,-1,1)),Math.abs(s)<.9999999?(this._x=Math.atan2(-l,c),this._y=Math.atan2(-u,i)):(this._x=0,this._y=Math.atan2(o,f));break;case`XZY`:this._z=Math.asin(-st(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(o,i)):(this._x=Math.atan2(-l,f),this._y=0);break;default:B(`Euler: .setFromRotationMatrix() encountered an unknown order: `+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return on.makeRotationFromQuaternion(e),this.setFromRotationMatrix(on,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return sn.setFromEuler(this),this.setFromQuaternion(sn,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};cn.DEFAULT_ORDER=`XYZ`;var ln=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return!!(this.mask&(1<<e|0))}},un=0,dn=new W,fn=new Ot,pn=new Zt,mn=new W,hn=new W,gn=new W,_n=new Ot,vn=new W(1,0,0),yn=new W(0,1,0),bn=new W(0,0,1),xn={type:`added`},Sn={type:`removed`},Cn={type:`childadded`,child:null},wn={type:`childremoved`,child:null},Tn=class e extends tt{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:un++}),this.uuid=ot(),this.name=``,this.type=`Object3D`,this.parent=null,this.children=[],this.up=e.DEFAULT_UP.clone();let t=new W,n=new cn,r=new Ot,i=new W(1,1,1);function a(){r.setFromEuler(n,!1)}function o(){n.setFromQuaternion(r,void 0,!1)}n._onChange(a),r._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:n},quaternion:{configurable:!0,enumerable:!0,value:r},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new Zt},normalMatrix:{value:new G}}),this.matrix=new Zt,this.matrixWorld=new Zt,this.matrixAutoUpdate=e.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=e.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new ln,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return fn.setFromAxisAngle(e,t),this.quaternion.multiply(fn),this}rotateOnWorldAxis(e,t){return fn.setFromAxisAngle(e,t),this.quaternion.premultiply(fn),this}rotateX(e){return this.rotateOnAxis(vn,e)}rotateY(e){return this.rotateOnAxis(yn,e)}rotateZ(e){return this.rotateOnAxis(bn,e)}translateOnAxis(e,t){return dn.copy(e).applyQuaternion(this.quaternion),this.position.add(dn.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(vn,e)}translateY(e){return this.translateOnAxis(yn,e)}translateZ(e){return this.translateOnAxis(bn,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(pn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?mn.copy(e):mn.set(e,t,n);let r=this.parent;this.updateWorldMatrix(!0,!1),hn.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?pn.lookAt(hn,mn,this.up):pn.lookAt(mn,hn,this.up),this.quaternion.setFromRotationMatrix(pn),r&&(pn.extractRotation(r.matrixWorld),fn.setFromRotationMatrix(pn),this.quaternion.premultiply(fn.invert()))}add(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return e===this?(V(`Object3D.add: object can't be added as a child of itself.`,e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(xn),Cn.child=e,this.dispatchEvent(Cn),Cn.child=null):V(`Object3D.add: object not an instance of THREE.Object3D.`,e),this)}remove(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.remove(arguments[e]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Sn),wn.child=e,this.dispatchEvent(wn),wn.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),pn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),pn.multiply(e.parent.matrixWorld)),e.applyMatrix4(pn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(xn),Cn.child=e,this.dispatchEvent(Cn),Cn.child=null,this}getObjectById(e){return this.getObjectByProperty(`id`,e)}getObjectByName(e){return this.getObjectByProperty(`name`,e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,r=this.children.length;n<r;n++){let r=this.children[n].getObjectByProperty(e,t);if(r!==void 0)return r}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let r=this.children;for(let i=0,a=r.length;i<a;i++)r[i].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(hn,e,gn),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(hn,_n,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}intersectsFrustum(){}traverse(e){e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,n=e.y,r=e.z,i=this.matrix.elements;i[12]+=t-i[0]*t-i[4]*n-i[8]*r,i[13]+=n-i[1]*t-i[5]*n-i[9]*r,i[14]+=r-i[2]*t-i[6]*n-i[10]*r}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t,n=!1){let r=this.parent;if(e===!0&&r!==null&&r.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),t===!0){let e=this.children;for(let t=0,r=e.length;t<r;t++)e[t].updateWorldMatrix(!1,!0,n)}}toJSON(e){let t=e===void 0||typeof e==`string`,n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:`Object`,generator:`Object3D.toJSON`});let r={};r.uuid=this.uuid,r.type=this.type,r.name=this.name,r.castShadow=this.castShadow,r.receiveShadow=this.receiveShadow,r.visible=this.visible,r.frustumCulled=this.frustumCulled,r.renderOrder=this.renderOrder,r.static=this.static,r.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.pivot!==null&&(r.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(r.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(r.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(r.type=`InstancedMesh`,r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type=`BatchedMesh`,r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(e=>({...e,boundingBox:e.boundingBox?e.boundingBox.toJSON():void 0,boundingSphere:e.boundingSphere?e.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(e=>({...e})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function i(t,n){return t[n.uuid]===void 0&&(t[n.uuid]=n.toJSON(e)),n.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=i(e.geometries,this.geometry);let t=this.geometry.parameters;if(t!==void 0&&t.shapes!==void 0){let n=t.shapes;if(Array.isArray(n))for(let t=0,r=n.length;t<r;t++){let r=n[t];i(e.shapes,r)}else i(e.shapes,n)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(i(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0){if(Array.isArray(this.material)){let t=[];for(let n=0,r=this.material.length;n<r;n++)t.push(i(e.materials,this.material[n]));r.material=t}else r.material=i(e.materials,this.material)}if(this.children.length>0){r.children=[];for(let t=0;t<this.children.length;t++)r.children.push(this.children[t].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let t=0;t<this.animations.length;t++){let n=this.animations[t];r.animations.push(i(e.animations,n))}}if(t){let t=a(e.geometries),r=a(e.materials),i=a(e.textures),o=a(e.images),s=a(e.shapes),c=a(e.skeletons),l=a(e.animations),u=a(e.nodes);t.length>0&&(n.geometries=t),r.length>0&&(n.materials=r),i.length>0&&(n.textures=i),o.length>0&&(n.images=o),s.length>0&&(n.shapes=s),c.length>0&&(n.skeletons=c),l.length>0&&(n.animations=l),u.length>0&&(n.nodes=u)}return n.object=r,n;function a(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot===null?null:e.pivot.clone(),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let t=0;t<e.children.length;t++){let n=e.children[t];this.add(n.clone())}return this}dispose(){this.dispatchEvent({type:`dispose`})}};Tn.DEFAULT_UP=new W(0,1,0),Tn.DEFAULT_MATRIX_AUTO_UPDATE=!0,Tn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var En=class extends Tn{constructor(){super(),this.isGroup=!0,this.type=`Group`}},Dn={type:`move`},On=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new En,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new En,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new W,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new W),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new En,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new W,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new W,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:`connected`,data:e}),this}disconnect(e){return this.dispatchEvent({type:`disconnected`,data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let r=null,i=null,a=null,o=this._targetRay,s=this._grip,c=this._hand;if(e&&t.session.visibilityState!==`visible-blurred`){if(c&&e.hand){a=!0;for(let r of e.hand.values()){let e=t.getJointPose(r,n),i=this._getHandJoint(c,r);e!==null&&(i.matrix.fromArray(e.transform.matrix),i.matrix.decompose(i.position,i.rotation,i.scale),i.matrixWorldNeedsUpdate=!0,i.jointRadius=e.radius),i.visible=e!==null}let r=c.joints[`index-finger-tip`],i=c.joints[`thumb-tip`],o=r.position.distanceTo(i.position);c.inputState.pinching&&o>.025?(c.inputState.pinching=!1,this.dispatchEvent({type:`pinchend`,handedness:e.handedness,target:this})):!c.inputState.pinching&&o<=.015&&(c.inputState.pinching=!0,this.dispatchEvent({type:`pinchstart`,handedness:e.handedness,target:this}))}else s!==null&&e.gripSpace&&(i=t.getPose(e.gripSpace,n),i!==null&&(s.matrix.fromArray(i.transform.matrix),s.matrix.decompose(s.position,s.rotation,s.scale),s.matrixWorldNeedsUpdate=!0,i.linearVelocity?(s.hasLinearVelocity=!0,s.linearVelocity.copy(i.linearVelocity)):s.hasLinearVelocity=!1,i.angularVelocity?(s.hasAngularVelocity=!0,s.angularVelocity.copy(i.angularVelocity)):s.hasAngularVelocity=!1,s.eventsEnabled&&s.dispatchEvent({type:`gripUpdated`,data:e,target:this})));o!==null&&(r=t.getPose(e.targetRaySpace,n),r===null&&i!==null&&(r=i),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Dn)))}return o!==null&&(o.visible=r!==null),s!==null&&(s.visible=i!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new En;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},kn={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},An={h:0,s:0,l:0},jn={h:0,s:0,l:0};function Mn(e,t,n){return n<0&&(n+=1),n>1&&--n,n<1/6?e+(t-e)*6*n:n<1/2?t:n<2/3?e+(t-e)*6*(2/3-n):e}var K=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let t=e;t&&t.isColor?this.copy(t):typeof t==`number`?this.setHex(t):typeof t==`string`&&this.setStyle(t)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Ie){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Ft.colorSpaceToWorking(this,t),this}setRGB(e,t,n,r=Ft.workingColorSpace){return this.r=e,this.g=t,this.b=n,Ft.colorSpaceToWorking(this,r),this}setHSL(e,t,n,r=Ft.workingColorSpace){if(e=ct(e,1),t=st(t,0,1),n=st(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,i=2*n-r;this.r=Mn(i,r,e+1/3),this.g=Mn(i,r,e),this.b=Mn(i,r,e-1/3)}return Ft.colorSpaceToWorking(this,r),this}setStyle(e,t=Ie){function n(t){t!==void 0&&parseFloat(t)<1&&B(`Color: Alpha component of `+e+` will be ignored.`)}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let i,a=r[1],o=r[2];switch(a){case`rgb`:case`rgba`:if(i=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(255,parseInt(i[1],10))/255,Math.min(255,parseInt(i[2],10))/255,Math.min(255,parseInt(i[3],10))/255,t);if(i=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(100,parseInt(i[1],10))/100,Math.min(100,parseInt(i[2],10))/100,Math.min(100,parseInt(i[3],10))/100,t);break;case`hsl`:case`hsla`:if(i=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setHSL(parseFloat(i[1])/360,parseFloat(i[2])/100,parseFloat(i[3])/100,t);break;default:B(`Color: Unknown color model `+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){let n=r[1],i=n.length;if(i===3)return this.setRGB(parseInt(n.charAt(0),16)/15,parseInt(n.charAt(1),16)/15,parseInt(n.charAt(2),16)/15,t);if(i===6)return this.setHex(parseInt(n,16),t);B(`Color: Invalid hex color `+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Ie){let n=kn[e.toLowerCase()];return n===void 0?B(`Color: Unknown color `+e):this.setHex(n,t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=It(e.r),this.g=It(e.g),this.b=It(e.b),this}copyLinearToSRGB(e){return this.r=Lt(e.r),this.g=Lt(e.g),this.b=Lt(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Ie){return Ft.workingToColorSpace(Nn.copy(this),e),Math.round(st(Nn.r*255,0,255))*65536+Math.round(st(Nn.g*255,0,255))*256+Math.round(st(Nn.b*255,0,255))}getHexString(e=Ie){return(`000000`+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Ft.workingColorSpace){Ft.workingToColorSpace(Nn.copy(this),t);let n=Nn.r,r=Nn.g,i=Nn.b,a=Math.max(n,r,i),o=Math.min(n,r,i),s,c,l=(o+a)/2;if(o===a)s=0,c=0;else{let e=a-o;switch(c=l<=.5?e/(a+o):e/(2-a-o),a){case n:s=(r-i)/e+(r<i?6:0);break;case r:s=(i-n)/e+2;break;case i:s=(n-r)/e+4}s/=6}return e.h=s,e.s=c,e.l=l,e}getRGB(e,t=Ft.workingColorSpace){return Ft.workingToColorSpace(Nn.copy(this),t),e.r=Nn.r,e.g=Nn.g,e.b=Nn.b,e}getStyle(e=Ie){Ft.workingToColorSpace(Nn.copy(this),e);let t=Nn.r,n=Nn.g,r=Nn.b;return e===`srgb`?`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(r*255)})`:`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`}offsetHSL(e,t,n){return this.getHSL(An),this.setHSL(An.h+e,An.s+t,An.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(An),e.getHSL(jn);let n=dt(An.h,jn.h,t),r=dt(An.s,jn.s,t),i=dt(An.l,jn.l,t);return this.setHSL(n,r,i),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,r=this.b,i=e.elements;return this.r=i[0]*t+i[3]*n+i[6]*r,this.g=i[1]*t+i[4]*n+i[7]*r,this.b=i[2]*t+i[5]*n+i[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Nn=new K;K.NAMES=kn;var Pn=class extends Tn{constructor(){super(),this.isScene=!0,this.type=`Scene`,this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new cn,this.environmentIntensity=1,this.environmentRotation=new cn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),t.object.backgroundBlurriness=this.backgroundBlurriness,t.object.backgroundIntensity=this.backgroundIntensity,t.object.backgroundRotation=this.backgroundRotation.toArray(),t.object.environmentIntensity=this.environmentIntensity,t.object.environmentRotation=this.environmentRotation.toArray(),t}},Fn=new W,In=new W,Ln=new W,Rn=new W,zn=new W,Bn=new W,Vn=new W,Hn=new W,Un=new W,Wn=new W,Gn=new Kt,Kn=new Kt,qn=new Kt,Jn=class e{constructor(e=new W,t=new W,n=new W){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,r){r.subVectors(n,t),Fn.subVectors(e,t),r.cross(Fn);let i=r.lengthSq();return i>0?r.multiplyScalar(1/Math.sqrt(i)):r.set(0,0,0)}static getBarycoord(e,t,n,r,i){Fn.subVectors(r,t),In.subVectors(n,t),Ln.subVectors(e,t);let a=Fn.dot(Fn),o=Fn.dot(In),s=Fn.dot(Ln),c=In.dot(In),l=In.dot(Ln),u=a*c-o*o;if(u===0)return i.set(0,0,0),null;let d=1/u,f=(c*s-o*l)*d,p=(a*l-o*s)*d;return i.set(1-f-p,p,f)}static containsPoint(e,t,n,r){return this.getBarycoord(e,t,n,r,Rn)!==null&&Rn.x>=0&&Rn.y>=0&&Rn.x+Rn.y<=1}static getInterpolation(e,t,n,r,i,a,o,s){return this.getBarycoord(e,t,n,r,Rn)===null?(s.x=0,s.y=0,`z`in s&&(s.z=0),`w`in s&&(s.w=0),null):(s.setScalar(0),s.addScaledVector(i,Rn.x),s.addScaledVector(a,Rn.y),s.addScaledVector(o,Rn.z),s)}static getInterpolatedAttribute(e,t,n,r,i,a){return Gn.setScalar(0),Kn.setScalar(0),qn.setScalar(0),Gn.fromBufferAttribute(e,t),Kn.fromBufferAttribute(e,n),qn.fromBufferAttribute(e,r),a.setScalar(0),a.addScaledVector(Gn,i.x),a.addScaledVector(Kn,i.y),a.addScaledVector(qn,i.z),a}static isFrontFacing(e,t,n,r){return Fn.subVectors(n,t),In.subVectors(e,t),Fn.cross(In).dot(r)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,r){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,n,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Fn.subVectors(this.c,this.b),In.subVectors(this.a,this.b),Fn.cross(In).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return e.getNormal(this.a,this.b,this.c,t)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,n){return e.getBarycoord(t,this.a,this.b,this.c,n)}getInterpolation(t,n,r,i,a){return e.getInterpolation(t,this.a,this.b,this.c,n,r,i,a)}containsPoint(t){return e.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return e.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,r=this.b,i=this.c,a,o;zn.subVectors(r,n),Bn.subVectors(i,n),Hn.subVectors(e,n);let s=zn.dot(Hn),c=Bn.dot(Hn);if(s<=0&&c<=0)return t.copy(n);Un.subVectors(e,r);let l=zn.dot(Un),u=Bn.dot(Un);if(l>=0&&u<=l)return t.copy(r);let d=s*u-l*c;if(d<=0&&s>=0&&l<=0)return a=s/(s-l),t.copy(n).addScaledVector(zn,a);Wn.subVectors(e,i);let f=zn.dot(Wn),p=Bn.dot(Wn);if(p>=0&&f<=p)return t.copy(i);let m=f*c-s*p;if(m<=0&&c>=0&&p<=0)return o=c/(c-p),t.copy(n).addScaledVector(Bn,o);let h=l*p-f*u;if(h<=0&&u-l>=0&&f-p>=0)return Vn.subVectors(i,r),o=(u-l)/(u-l+(f-p)),t.copy(r).addScaledVector(Vn,o);let g=1/(h+m+d);return a=m*g,o=d*g,t.copy(n).addScaledVector(zn,a).addScaledVector(Bn,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},Yn=class{constructor(e=new W(1/0,1/0,1/0),t=new W(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(Zn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(Zn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=Zn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute(`position`);if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let t=0,n=r.count;t<n;t++)e.isMesh===!0?e.getVertexPosition(t,Zn):Zn.fromBufferAttribute(r,t),Zn.applyMatrix4(e.matrixWorld),this.expandByPoint(Zn);else e.boundingBox===void 0?(n.boundingBox===null&&n.computeBoundingBox(),Qn.copy(n.boundingBox)):(e.boundingBox===null&&e.computeBoundingBox(),Qn.copy(e.boundingBox)),Qn.applyMatrix4(e.matrixWorld),this.union(Qn)}let r=e.children;for(let e=0,n=r.length;e<n;e++)this.expandByObject(r[e],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Zn),Zn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(ar),or.subVectors(this.max,ar),$n.subVectors(e.a,ar),er.subVectors(e.b,ar),tr.subVectors(e.c,ar),nr.subVectors(er,$n),rr.subVectors(tr,er),ir.subVectors($n,tr);let t=[0,-nr.z,nr.y,0,-rr.z,rr.y,0,-ir.z,ir.y,nr.z,0,-nr.x,rr.z,0,-rr.x,ir.z,0,-ir.x,-nr.y,nr.x,0,-rr.y,rr.x,0,-ir.y,ir.x,0];return!lr(t,$n,er,tr,or)||(t=[1,0,0,0,1,0,0,0,1],!lr(t,$n,er,tr,or))?!1:(sr.crossVectors(nr,rr),t=[sr.x,sr.y,sr.z],lr(t,$n,er,tr,or))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Zn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Zn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Xn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Xn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Xn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Xn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Xn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Xn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Xn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Xn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Xn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},Xn=[new W,new W,new W,new W,new W,new W,new W,new W],Zn=new W,Qn=new Yn,$n=new W,er=new W,tr=new W,nr=new W,rr=new W,ir=new W,ar=new W,or=new W,sr=new W,cr=new W;function lr(e,t,n,r,i){for(let a=0,o=e.length-3;a<=o;a+=3){cr.fromArray(e,a);let o=i.x*Math.abs(cr.x)+i.y*Math.abs(cr.y)+i.z*Math.abs(cr.z),s=t.dot(cr),c=n.dot(cr),l=r.dot(cr);if(Math.max(-Math.max(s,c,l),Math.min(s,c,l))>o)return!1}return!0}var ur=new W,dr=new U,fr=0,pr=class extends tt{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw TypeError(`THREE.BufferAttribute: array should be a Typed Array.`);this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:fr++}),this.name=``,this.array=e,this.itemSize=t,this.count=e===void 0?0:e.length/t,this.normalized=n,this.usage=Ve,this.updateRanges=[],this.gpuType=h,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let r=0,i=this.itemSize;r<i;r++)this.array[e+r]=t.array[n+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)dr.fromBufferAttribute(this,t),dr.applyMatrix3(e),this.setXY(t,dr.x,dr.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)ur.fromBufferAttribute(this,t),ur.applyMatrix3(e),this.setXYZ(t,ur.x,ur.y,ur.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)ur.fromBufferAttribute(this,t),ur.applyMatrix4(e),this.setXYZ(t,ur.x,ur.y,ur.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)ur.fromBufferAttribute(this,t),ur.applyNormalMatrix(e),this.setXYZ(t,ur.x,ur.y,ur.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)ur.fromBufferAttribute(this,t),ur.transformDirection(e),this.setXYZ(t,ur.x,ur.y,ur.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Et(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Dt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Et(t,this.array)),t}setX(e,t){return this.normalized&&(t=Dt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Et(t,this.array)),t}setY(e,t){return this.normalized&&(t=Dt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Et(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Dt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Et(t,this.array)),t}setW(e,t){return this.normalized&&(t=Dt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=Dt(t,this.array),n=Dt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,r){return e*=this.itemSize,this.normalized&&(t=Dt(t,this.array),n=Dt(n,this.array),r=Dt(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this}setXYZW(e,t,n,r,i){return e*=this.itemSize,this.normalized&&(t=Dt(t,this.array),n=Dt(n,this.array),r=Dt(r,this.array),i=Dt(i,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this.array[e+3]=i,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return e.name=this.name,e.usage=this.usage,e.gpuType=this.gpuType,e}dispose(){this.dispatchEvent({type:`dispose`})}},mr=class extends pr{constructor(e,t,n){super(new Uint16Array(e),t,n)}},hr=class extends pr{constructor(e,t,n){super(new Uint32Array(e),t,n)}},q=class extends pr{constructor(e,t,n){super(new Float32Array(e),t,n)}},gr=new Yn,_r=new W,vr=new W,yr=class{constructor(e=new W,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t===void 0?gr.setFromPoints(e).getCenter(n):n.copy(t);let r=0;for(let t=0,i=e.length;t<i;t++)r=Math.max(r,n.distanceToSquared(e[t]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius*=e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;_r.subVectors(e,this.center);let t=_r.lengthSq();if(t>this.radius*this.radius){let e=Math.sqrt(t),n=(e-this.radius)*.5;this.center.addScaledVector(_r,n/e),this.radius+=n}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(vr.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(_r.copy(e.center).add(vr)),this.expandByPoint(_r.copy(e.center).sub(vr))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},br=0,xr=new Zt,Sr=new Tn,Cr=new W,wr=new Yn,Tr=new Yn,Er=new W,Dr=class e extends tt{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:br++}),this.uuid=ot(),this.name=``,this.type=`BufferGeometry`,this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return this.index=Array.isArray(e)?new(Ge(e)?hr:mr)(e,1):e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let t=new G().getNormalMatrix(e);n.applyNormalMatrix(t),n.needsUpdate=!0}let r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return xr.makeRotationFromQuaternion(e),this.applyMatrix4(xr),this}rotateX(e){return xr.makeRotationX(e),this.applyMatrix4(xr),this}rotateY(e){return xr.makeRotationY(e),this.applyMatrix4(xr),this}rotateZ(e){return xr.makeRotationZ(e),this.applyMatrix4(xr),this}translate(e,t,n){return xr.makeTranslation(e,t,n),this.applyMatrix4(xr),this}scale(e,t,n){return xr.makeScale(e,t,n),this.applyMatrix4(xr),this}lookAt(e){return Sr.lookAt(e),Sr.updateMatrix(),this.applyMatrix4(Sr.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Cr).negate(),this.translate(Cr.x,Cr.y,Cr.z),this}setFromPoints(e){let t=this.getAttribute(`position`);if(t===void 0){let t=[];for(let n=0,r=e.length;n<r;n++){let r=e[n];t.push(r.x,r.y,r.z||0)}this.setAttribute(`position`,new q(t,3))}else{let n=Math.min(e.length,t.count);for(let r=0;r<n;r++){let n=e[r];t.setXYZ(r,n.x,n.y,n.z||0)}e.length>t.count&&B(`BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry.`),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Yn);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){V(`BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.`,this),this.boundingBox.set(new W(-1/0,-1/0,-1/0),new W(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];wr.setFromBufferAttribute(n),this.morphTargetsRelative?(Er.addVectors(this.boundingBox.min,wr.min),this.boundingBox.expandByPoint(Er),Er.addVectors(this.boundingBox.max,wr.max),this.boundingBox.expandByPoint(Er)):(this.boundingBox.expandByPoint(wr.min),this.boundingBox.expandByPoint(wr.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&V(`BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.`,this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new yr);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){V(`BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.`,this),this.boundingSphere.set(new W,1/0);return}if(e){let n=this.boundingSphere.center;if(wr.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];Tr.setFromBufferAttribute(n),this.morphTargetsRelative?(Er.addVectors(wr.min,Tr.min),wr.expandByPoint(Er),Er.addVectors(wr.max,Tr.max),wr.expandByPoint(Er)):(wr.expandByPoint(Tr.min),wr.expandByPoint(Tr.max))}wr.getCenter(n);let r=0;for(let t=0,i=e.count;t<i;t++)Er.fromBufferAttribute(e,t),r=Math.max(r,n.distanceToSquared(Er));if(t)for(let i=0,a=t.length;i<a;i++){let a=t[i],o=this.morphTargetsRelative;for(let t=0,i=a.count;t<i;t++)Er.fromBufferAttribute(a,t),o&&(Cr.fromBufferAttribute(e,t),Er.add(Cr)),r=Math.max(r,n.distanceToSquared(Er))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&V(`BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.`,this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){V(`BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)`);return}let n=t.position,r=t.normal,i=t.uv,a=this.getAttribute(`tangent`);(a===void 0||a.count!==n.count)&&(a=new pr(new Float32Array(4*n.count),4),this.setAttribute(`tangent`,a));let o=[],s=[];for(let e=0;e<n.count;e++)o[e]=new W,s[e]=new W;let c=new W,l=new W,u=new W,d=new U,f=new U,p=new U,m=new W,h=new W;function g(e,t,r){c.fromBufferAttribute(n,e),l.fromBufferAttribute(n,t),u.fromBufferAttribute(n,r),d.fromBufferAttribute(i,e),f.fromBufferAttribute(i,t),p.fromBufferAttribute(i,r),l.sub(c),u.sub(c),f.sub(d),p.sub(d);let a=1/(f.x*p.y-p.x*f.y);isFinite(a)&&(m.copy(l).multiplyScalar(p.y).addScaledVector(u,-f.y).multiplyScalar(a),h.copy(u).multiplyScalar(f.x).addScaledVector(l,-p.x).multiplyScalar(a),o[e].add(m),o[t].add(m),o[r].add(m),s[e].add(h),s[t].add(h),s[r].add(h))}let _=this.groups;_.length===0&&(_=[{start:0,count:e.count}]);for(let t=0,n=_.length;t<n;++t){let n=_[t],r=n.start,i=n.count;for(let t=r,n=r+i;t<n;t+=3)g(e.getX(t+0),e.getX(t+1),e.getX(t+2))}let v=new W,y=new W,b=new W,x=new W;function S(e){b.fromBufferAttribute(r,e),x.copy(b);let t=o[e];v.copy(t),v.sub(b.multiplyScalar(b.dot(t))).normalize(),y.crossVectors(x,t);let n=y.dot(s[e])<0?-1:1;a.setXYZW(e,v.x,v.y,v.z,n)}for(let t=0,n=_.length;t<n;++t){let n=_[t],r=n.start,i=n.count;for(let t=r,n=r+i;t<n;t+=3)S(e.getX(t+0)),S(e.getX(t+1)),S(e.getX(t+2))}this._transformed=!0}computeVertexNormals(){let e=this.index,t=this.getAttribute(`position`);if(t!==void 0){let n=this.getAttribute(`normal`);if(n===void 0||n.count!==t.count)n=new pr(new Float32Array(t.count*3),3),this.setAttribute(`normal`,n);else for(let e=0,t=n.count;e<t;e++)n.setXYZ(e,0,0,0);let r=new W,i=new W,a=new W,o=new W,s=new W,c=new W,l=new W,u=new W;if(e)for(let d=0,f=e.count;d<f;d+=3){let f=e.getX(d+0),p=e.getX(d+1),m=e.getX(d+2);r.fromBufferAttribute(t,f),i.fromBufferAttribute(t,p),a.fromBufferAttribute(t,m),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),o.fromBufferAttribute(n,f),s.fromBufferAttribute(n,p),c.fromBufferAttribute(n,m),o.add(l),s.add(l),c.add(l),n.setXYZ(f,o.x,o.y,o.z),n.setXYZ(p,s.x,s.y,s.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let e=0,o=t.count;e<o;e+=3)r.fromBufferAttribute(t,e+0),i.fromBufferAttribute(t,e+1),a.fromBufferAttribute(t,e+2),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),n.setXYZ(e+0,l.x,l.y,l.z),n.setXYZ(e+1,l.x,l.y,l.z),n.setXYZ(e+2,l.x,l.y,l.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Er.fromBufferAttribute(e,t),Er.normalize(),e.setXYZ(t,Er.x,Er.y,Er.z)}toNonIndexed(){function t(e,t){let n=e.array,r=e.itemSize,i=e.normalized,a=new n.constructor(t.length*r),o=0,s=0;for(let i=0,c=t.length;i<c;i++){o=e.isInterleavedBufferAttribute?t[i]*e.data.stride+e.offset:t[i]*r;for(let e=0;e<r;e++)a[s++]=n[o++]}return new pr(a,r,i)}if(this.index===null)return B(`BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed.`),this;let n=new e,r=this.index.array,i=this.attributes;for(let e in i){let a=i[e],o=t(a,r);n.setAttribute(e,o)}let a=this.morphAttributes;for(let e in a){let i=[],o=a[e];for(let e=0,n=o.length;e<n;e++){let n=o[e],a=t(n,r);i.push(a)}n.morphAttributes[e]=i}n.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let e=0,t=o.length;e<t;e++){let t=o[e];n.addGroup(t.start,t.count,t.materialIndex)}return n}toJSON(){let e={metadata:{version:4.7,type:`BufferGeometry`,generator:`BufferGeometry.toJSON`}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?`BufferGeometry`:this.type,e.name=this.name,Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let t=this.parameters;for(let n in t)t[n]!==void 0&&(e[n]=t[n]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let t in n){let r=n[t];e.data.attributes[t]=r.toJSON(e.data)}let r={},i=!1;for(let t in this.morphAttributes){let n=this.morphAttributes[t],a=[];for(let t=0,r=n.length;t<r;t++){let r=n[t];a.push(r.toJSON(e.data))}a.length>0&&(r[t]=a,i=!0)}i&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone());let r=e.attributes;for(let e in r){let n=r[e];this.setAttribute(e,n.clone(t))}let i=e.morphAttributes;for(let e in i){let n=[],r=i[e];for(let e=0,i=r.length;e<i;e++)n.push(r[e].clone(t));this.morphAttributes[e]=n}this.morphTargetsRelative=e.morphTargetsRelative;let a=e.groups;for(let e=0,t=a.length;e<t;e++){let t=a[e];this.addGroup(t.start,t.count,t.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let s=e.boundingSphere;return s!==null&&(this.boundingSphere=s.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:`dispose`})}},Or=new W,kr=new W,Ar=new G,jr=class{constructor(e=new W(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,r){return this.normal.set(e,t,n),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let r=Or.subVectors(n,t).cross(kr.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){let r=e.delta(Or),i=this.normal.dot(r);if(i===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let a=-(e.start.dot(this.normal)+this.constant)/i;return n===!0&&(a<0||a>1)?null:t.copy(e.start).addScaledVector(r,a)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||Ar.getNormalMatrix(e),r=this.coplanarPoint(Or).applyMatrix4(e),i=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(i),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(e){return this.normal.fromArray(e.normal),this.constant=e.constant,this}},Mr=0,Nr=class extends tt{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Mr++}),this.uuid=ot(),this.name=``,this.type=`Material`,this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new K(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Be,this.stencilZFail=Be,this.stencilZPass=Be,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){B(`Material: parameter '${t}' has value of undefined.`);continue}let r=this[t];if(r===void 0){B(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(n):r&&r.isVector2&&n&&n.isVector2||r&&r.isEuler&&n&&n.isEuler||r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;t&&(e={textures:{},images:{}});let n={metadata:{version:4.7,type:`Material`,generator:`Material.toJSON`}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(e=>e.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}if(t){let t=r(e.textures),i=r(e.images);t.length>0&&(n.textures=t),i.length>0&&(n.images=i)}return n}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new K().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.retroreflectivity!==void 0&&(this.retroreflectivity=e.retroreflectivity),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.clippingPlanes!==void 0&&(this.clippingPlanes=e.clippingPlanes.map(e=>new jr().fromJSON(e))),e.clipIntersection!==void 0&&(this.clipIntersection=e.clipIntersection),e.clipShadows!==void 0&&(this.clipShadows=e.clipShadows),e.depthPacking!==void 0&&(this.depthPacking=e.depthPacking),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.linecap!==void 0&&(this.linecap=e.linecap),e.linejoin!==void 0&&(this.linejoin=e.linejoin),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(this.vertexColors=typeof e.vertexColors==`number`?e.vertexColors>0:e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let t=e.normalScale;Array.isArray(t)===!1&&(t=[t,t]),this.normalScale=new U().fromArray(t)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new U().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let e=t.length;n=Array(e);for(let r=0;r!==e;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:`dispose`})}set needsUpdate(e){e===!0&&this.version++}},Pr=new W,Fr=new W,Ir=new W,Lr=new W,Rr=class{constructor(e=new W,t=new W(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Pr)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Pr.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Pr.copy(this.origin).addScaledVector(this.direction,t),Pr.distanceToSquared(e))}distanceSqToSegment(e,t,n,r){Fr.copy(e).add(t).multiplyScalar(.5),Ir.copy(t).sub(e).normalize(),Lr.copy(this.origin).sub(Fr);let i=e.distanceTo(t)*.5,a=-this.direction.dot(Ir),o=Lr.dot(this.direction),s=-Lr.dot(Ir),c=Lr.lengthSq(),l=Math.abs(1-a*a),u,d,f,p;if(l>0){if(u=a*s-o,d=a*o-s,p=i*l,u>=0){if(d>=-p){if(d<=p){let e=1/l;u*=e,d*=e,f=u*(u+a*d+2*o)+d*(a*u+d+2*s)+c}else d=i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c}else d=-i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c}else d<=-p?(u=Math.max(0,-(-a*i+o)),d=u>0?-i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c):d<=p?(u=0,d=Math.min(Math.max(-i,-s),i),f=d*(d+2*s)+c):(u=Math.max(0,-(a*i+o)),d=u>0?i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c)}else d=a>0?-i:i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),r&&r.copy(Fr).addScaledVector(Ir,d),f}intersectSphere(e,t){if(e.radius<0)return null;Pr.subVectors(e.center,this.origin);let n=Pr.dot(this.direction),r=Pr.dot(Pr)-n*n,i=e.radius*e.radius;if(r>i)return null;let a=Math.sqrt(i-r),o=n-a,s=n+a;return s<0?null:o<0?this.at(s,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,r,i,a,o,s,c=1/this.direction.x,l=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(e.min.x-d.x)*c,r=(e.max.x-d.x)*c):(n=(e.max.x-d.x)*c,r=(e.min.x-d.x)*c),l>=0?(i=(e.min.y-d.y)*l,a=(e.max.y-d.y)*l):(i=(e.max.y-d.y)*l,a=(e.min.y-d.y)*l),n>a||i>r||((i>n||isNaN(n))&&(n=i),(a<r||isNaN(r))&&(r=a),u>=0?(o=(e.min.z-d.z)*u,s=(e.max.z-d.z)*u):(o=(e.max.z-d.z)*u,s=(e.min.z-d.z)*u),n>s||o>r)||((o>n||n!==n)&&(n=o),(s<r||r!==r)&&(r=s),r<0)?null:this.at(n>=0?n:r,t)}intersectsBox(e){return this.intersectBox(e,Pr)!==null}intersectTriangle(e,t,n,r,i){let a=this.origin,o=this.direction,s=o.x,c=o.y,l=o.z,u=e.x-a.x,d=e.y-a.y,f=e.z-a.z,p=t.x-a.x,m=t.y-a.y,h=t.z-a.z,g=n.x-a.x,_=n.y-a.y,v=n.z-a.z,y=Math.abs(s),b=Math.abs(c),x=Math.abs(l),S,C,w,T,E,D,O,k,A,j,M,N;if(y>=b&&y>=x?(w=s,D=u,A=p,N=g,s>=0?(S=c,C=l,T=d,E=f,O=m,k=h,j=_,M=v):(S=l,C=c,T=f,E=d,O=h,k=m,j=v,M=_)):b>=x?(w=c,D=d,A=m,N=_,c>=0?(S=l,C=s,T=f,E=u,O=h,k=p,j=v,M=g):(S=s,C=l,T=u,E=f,O=p,k=h,j=g,M=v)):(w=l,D=f,A=h,N=v,l>=0?(S=s,C=c,T=u,E=d,O=p,k=m,j=g,M=_):(S=c,C=s,T=d,E=u,O=m,k=p,j=_,M=g)),w===0)return null;let P=S/w,ee=C/w,F=1/w,te=T-P*D,ne=E-ee*D,re=O-P*A,ie=k-ee*A,ae=j-P*N,oe=M-ee*N,se=ae*ie-oe*re,I=te*oe-ne*ae,ce=re*ne-ie*te;if(r){if(se<0||I<0||ce<0)return null}else if((se<0||I<0||ce<0)&&(se>0||I>0||ce>0))return null;let le=se+I+ce;if(le===0)return null;let ue=F*(se*D+I*A+ce*N);return(le>0?ue<0:ue>0)?null:this.at(ue/le,i)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},zr=class extends Nr{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type=`MeshBasicMaterial`,this.color=new K(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new cn,this.combine=0,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},Br=new Zt,Vr=new Rr,Hr=new yr,Ur=new W,Wr=new W,Gr=new W,Kr=new W,qr=new W,Jr=new W,Yr=new W,Xr=new W,Zr=class extends Tn{constructor(e=new Dr,t=new zr){super(),this.isMesh=!0,this.type=`Mesh`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}getVertexPosition(e,t){let n=this.geometry,r=n.attributes.position,i=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(r,e);let o=this.morphTargetInfluences;if(i&&o){Jr.set(0,0,0);for(let n=0,r=i.length;n<r;n++){let r=o[n],s=i[n];r!==0&&(qr.fromBufferAttribute(s,e),a?Jr.addScaledVector(qr,r):Jr.addScaledVector(qr.sub(t),r))}t.add(Jr)}return t}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){let n=this.geometry,r=this.material,i=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Hr.copy(n.boundingSphere),Hr.applyMatrix4(i),Vr.copy(e.ray).recast(e.near),!(Hr.containsPoint(Vr.origin)===!1&&(Vr.intersectSphere(Hr,Ur)===null||Vr.origin.distanceToSquared(Ur)>(e.far-e.near)**2))&&(Br.copy(i).invert(),Vr.copy(e.ray).applyMatrix4(Br),(n.boundingBox===null||Vr.intersectsBox(n.boundingBox)!==!1)&&this._computeIntersections(e,t,Vr)))}_computeIntersections(e,t,n){let r,i=this.geometry,a=this.material,o=i.index,s=i.attributes.position,c=i.attributes.uv,l=i.attributes.uv1,u=i.attributes.normal,d=i.groups,f=i.drawRange;if(o!==null){if(Array.isArray(a))for(let i=0,s=d.length;i<s;i++){let s=d[i],p=a[s.materialIndex],m=Math.max(s.start,f.start),h=Math.min(o.count,Math.min(s.start+s.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=o.getX(i),d=o.getX(i+1),f=o.getX(i+2);r=$r(this,p,e,n,c,l,u,a,d,f),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=s.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),s=Math.min(o.count,f.start+f.count);for(let d=i,f=s;d<f;d+=3){let i=o.getX(d),s=o.getX(d+1),f=o.getX(d+2);r=$r(this,a,e,n,c,l,u,i,s,f),r&&(r.faceIndex=Math.floor(d/3),t.push(r))}}}else if(s!==void 0){if(Array.isArray(a))for(let i=0,o=d.length;i<o;i++){let o=d[i],p=a[o.materialIndex],m=Math.max(o.start,f.start),h=Math.min(s.count,Math.min(o.start+o.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=i,s=i+1,d=i+2;r=$r(this,p,e,n,c,l,u,a,s,d),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=o.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),o=Math.min(s.count,f.start+f.count);for(let s=i,d=o;s<d;s+=3){let i=s,o=s+1,d=s+2;r=$r(this,a,e,n,c,l,u,i,o,d),r&&(r.faceIndex=Math.floor(s/3),t.push(r))}}}}};function Qr(e,t,n,r,i,a,o,s){let c;if(c=t.side===1?r.intersectTriangle(o,a,i,!0,s):r.intersectTriangle(i,a,o,t.side===0,s),c===null)return null;Xr.copy(s),Xr.applyMatrix4(e.matrixWorld);let l=n.ray.origin.distanceTo(Xr);return l<n.near||l>n.far?null:{distance:l,point:Xr.clone(),object:e}}function $r(e,t,n,r,i,a,o,s,c,l){e.getVertexPosition(s,Wr),e.getVertexPosition(c,Gr),e.getVertexPosition(l,Kr);let u=Qr(e,t,n,r,Wr,Gr,Kr,Yr);if(u){let e=new W;Jn.getBarycoord(Yr,Wr,Gr,Kr,e),i&&(u.uv=Jn.getInterpolatedAttribute(i,s,c,l,e,new U)),a&&(u.uv1=Jn.getInterpolatedAttribute(a,s,c,l,e,new U)),o&&(u.normal=Jn.getInterpolatedAttribute(o,s,c,l,e,new W),u.normal.dot(r.direction)>0&&u.normal.multiplyScalar(-1));let t={a:s,b:c,c:l,normal:new W,materialIndex:0};Jn.getNormal(Wr,Gr,Kr,t.normal),u.face=t,u.barycoord=e}return u}var ei=class extends Gt{constructor(e=null,t=1,n=1,i,a,o,s,c,l=r,u=r,d,f){super(null,o,s,c,l,u,i,a,d,f),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},ti=class extends pr{constructor(e,t,n,r=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=r}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){let e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}},ni=new Zt,ri=new Zt,ii=[],ai=new Yn,oi=new Zt,si=new Zr,ci=new yr,li=class extends Zr{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new ti(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let e=0;e<n;e++)this.setMatrixAt(e,oi)}computeBoundingBox(){let e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new Yn),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,ni),ai.copy(e.boundingBox).applyMatrix4(ni),this.boundingBox.union(ai)}computeBoundingSphere(){let e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new yr),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,ni),ci.copy(e.boundingSphere).applyMatrix4(ni),this.boundingSphere.union(ci)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){return this.instanceColor===null?t.setRGB(1,1,1):t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){return t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){let n=t.morphTargetInfluences,r=this.morphTexture.source.data.data,i=e*(n.length+1)+1;for(let e=0;e<n.length;e++)n[e]=r[i+e]}raycast(e,t){let n=this.matrixWorld,r=this.count;if(si.geometry=this.geometry,si.material=this.material,si.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),ci.copy(this.boundingSphere),ci.applyMatrix4(n),e.ray.intersectsSphere(ci)!==!1))for(let i=0;i<r;i++){this.getMatrixAt(i,ni),ri.multiplyMatrices(n,ni),si.matrixWorld=ri,si.raycast(e,ii);for(let e=0,n=ii.length;e<n;e++){let n=ii[e];n.instanceId=i,n.object=this,t.push(n)}ii.length=0}}setColorAt(e,t){return this.instanceColor===null&&(this.instanceColor=new ti(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3),this}setMatrixAt(e,t){return t.toArray(this.instanceMatrix.array,e*16),this}setMorphAt(e,t){let n=t.morphTargetInfluences,r=n.length+1;this.morphTexture===null&&(this.morphTexture=new ei(new Float32Array(r*this.count),r,this.count,D,h));let i=this.morphTexture.source.data.data,a=0;for(let e=0;e<n.length;e++)a+=n[e];let o=this.geometry.morphTargetsRelative?1:1-a,s=r*e;return i[s]=o,i.set(n,s+1),this}updateMorphTargets(){}dispose(){super.dispose(),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}},ui=new yr,di=new U(.5,.5),fi=new W,pi=class{constructor(e=new jr,t=new jr,n=new jr,r=new jr,i=new jr,a=new jr){this.planes=[e,t,n,r,i,a]}set(e,t,n,r,i,a){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(r),o[4].copy(i),o[5].copy(a),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=We,n=!1){let r=this.planes,i=e.elements,a=i[0],o=i[1],s=i[2],c=i[3],l=i[4],u=i[5],d=i[6],f=i[7],p=i[8],m=i[9],h=i[10],g=i[11],_=i[12],v=i[13],y=i[14],b=i[15];if(r[0].setComponents(c-a,f-l,g-p,b-_).normalize(),r[1].setComponents(c+a,f+l,g+p,b+_).normalize(),r[2].setComponents(c+o,f+u,g+m,b+v).normalize(),r[3].setComponents(c-o,f-u,g-m,b-v).normalize(),n)r[4].setComponents(s,d,h,y).normalize(),r[5].setComponents(c-s,f-d,g-h,b-y).normalize();else if(r[4].setComponents(c-s,f-d,g-h,b-y).normalize(),t===2e3)r[5].setComponents(c+s,f+d,g+h,b+y).normalize();else if(t===2001)r[5].setComponents(s,d,h,y).normalize();else throw Error(`THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: `+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),ui.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),ui.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(ui)}intersectsSprite(e){return ui.center.set(0,0,0),ui.radius=.7071067811865476+di.distanceTo(e.center),ui.applyMatrix4(e.matrixWorld),this.intersectsSphere(ui)}intersectsSphere(e){let t=this.planes,n=e.center,r=-e.radius;for(let e=0;e<6;e++)if(t[e].distanceToPoint(n)<r)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let r=t[n];if(fi.x=r.normal.x>0?e.max.x:e.min.x,fi.y=r.normal.y>0?e.max.y:e.min.y,fi.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(fi)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}},mi=class extends Gt{constructor(e=[],t=301,n,r,i,a,o,s,c,l){super(e,t,n,r,i,a,o,s,c,l),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},hi=class extends Gt{constructor(e,t,n=m,i,a,o,s=r,c=r,l,u=T,d=1){if(u!==1026&&u!==1027)throw Error(`THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat`);super({width:e,height:t,depth:d},i,a,o,s,c,u,n,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Vt(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return t.compareFunction=this.compareFunction,t}},gi=class extends hi{constructor(e,t=m,n=301,i,a,o=r,s=r,c,l=T){let u={width:e,height:e,depth:1},d=[u,u,u,u,u,u];super(e,e,t,n,i,a,o,s,c,l),this.image=d,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},_i=class extends Gt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},vi=class e extends Dr{constructor(e=1,t=1,n=1,r=1,i=1,a=1){super(),this.type=`BoxGeometry`,this.parameters={width:e,height:t,depth:n,widthSegments:r,heightSegments:i,depthSegments:a};let o=this;r=Math.floor(r),i=Math.floor(i),a=Math.floor(a);let s=[],c=[],l=[],u=[],d=0,f=0;p(`z`,`y`,`x`,-1,-1,n,t,e,a,i,0),p(`z`,`y`,`x`,1,-1,n,t,-e,a,i,1),p(`x`,`z`,`y`,1,1,e,n,t,r,a,2),p(`x`,`z`,`y`,1,-1,e,n,-t,r,a,3),p(`x`,`y`,`z`,1,-1,e,t,n,r,i,4),p(`x`,`y`,`z`,-1,-1,e,t,-n,r,i,5),this.setIndex(s),this.setAttribute(`position`,new q(c,3)),this.setAttribute(`normal`,new q(l,3)),this.setAttribute(`uv`,new q(u,2));function p(e,t,n,r,i,a,p,m,h,g,_){let v=a/h,y=p/g,b=a/2,x=p/2,S=m/2,C=h+1,w=g+1,T=0,E=0,D=new W;for(let a=0;a<w;a++){let o=a*y-x;for(let s=0;s<C;s++)D[e]=(s*v-b)*r,D[t]=o*i,D[n]=S,c.push(D.x,D.y,D.z),D[e]=0,D[t]=0,D[n]=m>0?1:-1,l.push(D.x,D.y,D.z),u.push(s/h),u.push(1-a/g),T+=1}for(let e=0;e<g;e++)for(let t=0;t<h;t++){let n=d+t+C*e,r=d+t+C*(e+1),i=d+(t+1)+C*(e+1),a=d+(t+1)+C*e;s.push(n,r,a),s.push(r,i,a),E+=6}o.addGroup(f,E,_),f+=E,d+=T}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}},yi=class e extends Dr{constructor(e=1,t=1,n=4,r=8,i=1){super(),this.type=`CapsuleGeometry`,this.parameters={radius:e,height:t,capSegments:n,radialSegments:r,heightSegments:i},t=Math.max(0,t),n=Math.max(1,Math.floor(n)),r=Math.max(3,Math.floor(r)),i=Math.max(1,Math.floor(i));let a=[],o=[],s=[],c=[],l=t/2,u=Math.PI/2*e,d=t,f=2*u+d,p=n*2+i,m=r+1,h=new W,g=new W;for(let _=0;_<=p;_++){let v=0,y=0,b=0,x=0;if(_<=n){let t=_/n,r=t*Math.PI/2;y=-l-e*Math.cos(r),b=e*Math.sin(r),x=-e*Math.cos(r),v=t*u}else if(_<=n+i){let r=(_-n)/i;y=-l+r*t,b=e,x=0,v=u+r*d}else{let t=(_-n-i)/n,r=t*Math.PI/2;y=l+e*Math.sin(r),b=e*Math.cos(r),x=e*Math.sin(r),v=u+d+t*u}let S=Math.max(0,Math.min(1,v/f)),C=0;_===0?C=.5/r:_===p&&(C=-.5/r);for(let e=0;e<=r;e++){let t=e/r,n=t*Math.PI*2,i=Math.sin(n),a=Math.cos(n);g.x=-b*a,g.y=y,g.z=b*i,o.push(g.x,g.y,g.z),h.set(-b*a,x,b*i),h.normalize(),s.push(h.x,h.y,h.z),c.push(t+C,S)}if(_>0){let e=(_-1)*m;for(let t=0;t<r;t++){let n=e+t,r=e+t+1,i=_*m+t,o=_*m+t+1;a.push(n,r,i),a.push(r,o,i)}}}this.setIndex(a),this.setAttribute(`position`,new q(o,3)),this.setAttribute(`normal`,new q(s,3)),this.setAttribute(`uv`,new q(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.height,t.capSegments,t.radialSegments,t.heightSegments)}},bi=class e extends Dr{constructor(e=1,t=1,n=1,r=32,i=1,a=!1,o=0,s=Math.PI*2){super(),this.type=`CylinderGeometry`,this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:r,heightSegments:i,openEnded:a,thetaStart:o,thetaLength:s};let c=this;r=Math.floor(r),i=Math.floor(i);let l=[],u=[],d=[],f=[],p=0,m=[],h=n/2,g=0;_(),a===!1&&(e>0&&v(!0),t>0&&v(!1)),this.setIndex(l),this.setAttribute(`position`,new q(u,3)),this.setAttribute(`normal`,new q(d,3)),this.setAttribute(`uv`,new q(f,2));function _(){let a=new W,_=new W,v=0,y=(t-e)/n;for(let c=0;c<=i;c++){let l=[],g=c/i,v=g*(t-e)+e;for(let e=0;e<=r;e++){let t=e/r,i=t*s+o,c=Math.sin(i),m=Math.cos(i);_.x=v*c,_.y=-g*n+h,_.z=v*m,u.push(_.x,_.y,_.z),a.set(c,y,m).normalize(),d.push(a.x,a.y,a.z),f.push(t,1-g),l.push(p++)}m.push(l)}for(let n=0;n<r;n++)for(let r=0;r<i;r++){let a=m[r][n],o=m[r+1][n],s=m[r+1][n+1],c=m[r][n+1];(e>0||r!==0)&&(l.push(a,o,c),v+=3),(t>0||r!==i-1)&&(l.push(o,s,c),v+=3)}c.addGroup(g,v,0),g+=v}function v(n){let i=p,a=new U,m=new W,_=0,v=n===!0?e:t,y=n===!0?1:-1;for(let e=1;e<=r;e++)u.push(0,h*y,0),d.push(0,y,0),f.push(.5,.5),p++;let b=p;for(let e=0;e<=r;e++){let t=e/r*s+o,n=Math.cos(t),i=Math.sin(t);m.x=v*i,m.y=h*y,m.z=v*n,u.push(m.x,m.y,m.z),d.push(0,y,0),a.x=n*.5+.5,a.y=i*.5*y+.5,f.push(a.x,a.y),p++}for(let e=0;e<r;e++){let t=i+e,r=b+e;n===!0?l.push(r,r+1,t):l.push(r+1,r,t),_+=3}c.addGroup(g,_,n===!0?1:2),g+=_}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}},xi=class e extends bi{constructor(e=1,t=1,n=32,r=1,i=!1,a=0,o=Math.PI*2){super(0,e,t,n,r,i,a,o),this.type=`ConeGeometry`,this.parameters={radius:e,height:t,radialSegments:n,heightSegments:r,openEnded:i,thetaStart:a,thetaLength:o}}static fromJSON(t){return new e(t.radius,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}},Si=class e extends Dr{constructor(e=[],t=[],n=1,r=0){super(),this.type=`PolyhedronGeometry`,this.parameters={vertices:e,indices:t,radius:n,detail:r};let i=[],a=[];o(r),c(n),l(),this.setAttribute(`position`,new q(i,3)),this.setAttribute(`normal`,new q(i.slice(),3)),this.setAttribute(`uv`,new q(a,2)),r===0?this.computeVertexNormals():this.normalizeNormals();function o(e){let n=new W,r=new W,i=new W;for(let a=0;a<t.length;a+=3)f(t[a+0],n),f(t[a+1],r),f(t[a+2],i),s(n,r,i,e)}function s(e,t,n,r){let i=r+1,a=[];for(let r=0;r<=i;r++){a[r]=[];let o=e.clone().lerp(n,r/i),s=t.clone().lerp(n,r/i),c=i-r;for(let e=0;e<=c;e++)e===0&&r===i?a[r][e]=o:a[r][e]=o.clone().lerp(s,e/c)}for(let e=0;e<i;e++)for(let t=0;t<2*(i-e)-1;t++){let n=Math.floor(t/2);t%2==0?(d(a[e][n+1]),d(a[e+1][n]),d(a[e][n])):(d(a[e][n+1]),d(a[e+1][n+1]),d(a[e+1][n]))}}function c(e){let t=new W;for(let n=0;n<i.length;n+=3)t.x=i[n+0],t.y=i[n+1],t.z=i[n+2],t.normalize().multiplyScalar(e),i[n+0]=t.x,i[n+1]=t.y,i[n+2]=t.z}function l(){let e=new W;for(let t=0;t<i.length;t+=3){e.x=i[t+0],e.y=i[t+1],e.z=i[t+2];let n=h(e)/2/Math.PI+.5,r=g(e)/Math.PI+.5;a.push(n,1-r)}p(),u()}function u(){for(let e=0;e<a.length;e+=6){let t=a[e+0],n=a[e+2],r=a[e+4];Math.max(t,n,r)>.9&&Math.min(t,n,r)<.1&&(t<.2&&(a[e+0]+=1),n<.2&&(a[e+2]+=1),r<.2&&(a[e+4]+=1))}}function d(e){i.push(e.x,e.y,e.z)}function f(t,n){let r=t*3;n.x=e[r+0],n.y=e[r+1],n.z=e[r+2]}function p(){let e=new W,t=new W,n=new W,r=new W,o=new U,s=new U,c=new U;for(let l=0,u=0;l<i.length;l+=9,u+=6){e.set(i[l+0],i[l+1],i[l+2]),t.set(i[l+3],i[l+4],i[l+5]),n.set(i[l+6],i[l+7],i[l+8]),o.set(a[u+0],a[u+1]),s.set(a[u+2],a[u+3]),c.set(a[u+4],a[u+5]),r.copy(e).add(t).add(n).divideScalar(3);let d=h(r);m(o,u+0,e,d),m(s,u+2,t,d),m(c,u+4,n,d)}}function m(e,t,n,r){r<0&&e.x===1&&(a[t]=e.x-1),n.x===0&&n.z===0&&(a[t]=r/2/Math.PI+.5)}function h(e){return Math.atan2(e.z,-e.x)}function g(e){return Math.atan2(-e.y,Math.sqrt(e.x*e.x+e.z*e.z))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.vertices,t.indices,t.radius,t.detail)}},Ci=class{constructor(){this.type=`Curve`,this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){B(`Curve: .getPoint() not implemented.`)}getPointAt(e,t){let n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],n,r=this.getPoint(0),i=0;t.push(0);for(let a=1;a<=e;a++)n=this.getPoint(a/e),i+=n.distanceTo(r),t.push(i),r=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){let n=this.getLengths(),r=0,i=n.length,a;a=t||e*n[i-1];let o=0,s=i-1,c;for(;o<=s;)if(r=Math.floor(o+(s-o)/2),c=n[r]-a,c<0)o=r+1;else if(c>0)s=r-1;else{s=r;break}if(r=s,n[r]===a)return r/(i-1);let l=n[r],u=n[r+1]-l,d=(a-l)/u;return(r+d)/(i-1)}getTangent(e,t){let n=1e-4,r=e-n,i=e+n;r<0&&(r=0),i>1&&(i=1);let a=this.getPoint(r),o=this.getPoint(i),s=t||(a.isVector2?new U:new W);return s.copy(o).sub(a).normalize(),s}getTangentAt(e,t){let n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){let n=new W,r=[],i=[],a=[],o=new W,s=new Zt;for(let t=0;t<=e;t++){let n=t/e;r[t]=this.getTangentAt(n,new W)}i[0]=new W,a[0]=new W;let c=Number.MAX_VALUE,l=Math.abs(r[0].x),u=Math.abs(r[0].y),d=Math.abs(r[0].z);l<=c&&(c=l,n.set(1,0,0)),u<=c&&(c=u,n.set(0,1,0)),d<=c&&n.set(0,0,1),o.crossVectors(r[0],n).normalize(),i[0].crossVectors(r[0],o),a[0].crossVectors(r[0],i[0]);for(let t=1;t<=e;t++){if(i[t]=i[t-1].clone(),a[t]=a[t-1].clone(),o.crossVectors(r[t-1],r[t]),o.length()>2**-52){o.normalize();let e=Math.acos(st(r[t-1].dot(r[t]),-1,1));i[t].applyMatrix4(s.makeRotationAxis(o,e))}a[t].crossVectors(r[t],i[t])}if(t===!0){let t=Math.acos(st(i[0].dot(i[e]),-1,1));t/=e,r[0].dot(o.crossVectors(i[0],i[e]))>0&&(t=-t);for(let n=1;n<=e;n++)i[n].applyMatrix4(s.makeRotationAxis(r[n],t*n)),a[n].crossVectors(r[n],i[n])}return{tangents:r,normals:i,binormals:a}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.7,type:`Curve`,generator:`Curve.toJSON`}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},wi=class extends Ci{constructor(e=0,t=0,n=1,r=1,i=0,a=Math.PI*2,o=!1,s=0){super(),this.isEllipseCurve=!0,this.type=`EllipseCurve`,this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=r,this.aStartAngle=i,this.aEndAngle=a,this.aClockwise=o,this.aRotation=s}getPoint(e,t=new U){let n=t,r=Math.PI*2,i=this.aEndAngle-this.aStartAngle,a=Math.abs(i)<2**-52;for(;i<0;)i+=r;for(;i>r;)i-=r;i<2**-52&&(i=a?0:r),this.aClockwise===!0&&!a&&(i===r?i=-r:i-=r);let o=this.aStartAngle+e*i,s=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let e=Math.cos(this.aRotation),t=Math.sin(this.aRotation),n=s-this.aX,r=c-this.aY;s=n*e-r*t+this.aX,c=n*t+r*e+this.aY}return n.set(s,c)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},Ti=class extends wi{constructor(e,t,n,r,i,a){super(e,t,n,n,r,i,a),this.isArcCurve=!0,this.type=`ArcCurve`}};function Ei(){let e=0,t=0,n=0,r=0;function i(i,a,o,s){e=i,t=o,n=-3*i+3*a-2*o-s,r=2*i-2*a+o+s}return{initCatmullRom:function(e,t,n,r,a){i(t,n,a*(n-e),a*(r-t))},initNonuniformCatmullRom:function(e,t,n,r,a,o,s){let c=(t-e)/a-(n-e)/(a+o)+(n-t)/o,l=(n-t)/o-(r-t)/(o+s)+(r-n)/s;c*=o,l*=o,i(t,n,c,l)},calc:function(i){let a=i*i,o=a*i;return e+t*i+n*a+r*o}}}var Di=new W,Oi=new W,ki=new Ei,Ai=new Ei,ji=new Ei,Mi=class extends Ci{constructor(e=[],t=!1,n=`centripetal`,r=.5){super(),this.isCatmullRomCurve3=!0,this.type=`CatmullRomCurve3`,this.points=e,this.closed=t,this.curveType=n,this.tension=r}getPoint(e,t=new W){let n=t,r=this.points,i=r.length,a=(i-+!this.closed)*e,o=Math.floor(a),s=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/i)+1)*i:s===0&&o===i-1&&(o=i-2,s=1);let c,l;this.closed||o>0?c=r[(o-1)%i]:(Oi.subVectors(r[0],r[1]).add(r[0]),c=Oi);let u=r[o%i],d=r[(o+1)%i];if(this.closed||o+2<i?l=r[(o+2)%i]:(Di.subVectors(r[i-1],r[i-2]).add(r[i-1]),l=Di),this.curveType===`centripetal`||this.curveType===`chordal`){let e=this.curveType===`chordal`?.5:.25,t=c.distanceToSquared(u)**+e,n=u.distanceToSquared(d)**+e,r=d.distanceToSquared(l)**+e;n<1e-4&&(n=1),t<1e-4&&(t=n),r<1e-4&&(r=n),ki.initNonuniformCatmullRom(c.x,u.x,d.x,l.x,t,n,r),Ai.initNonuniformCatmullRom(c.y,u.y,d.y,l.y,t,n,r),ji.initNonuniformCatmullRom(c.z,u.z,d.z,l.z,t,n,r)}else this.curveType===`catmullrom`&&(ki.initCatmullRom(c.x,u.x,d.x,l.x,this.tension),Ai.initCatmullRom(c.y,u.y,d.y,l.y,this.tension),ji.initCatmullRom(c.z,u.z,d.z,l.z,this.tension));return n.set(ki.calc(s),Ai.calc(s),ji.calc(s)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(n.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let n=this.points[t];e.points.push(n.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(new W().fromArray(n))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};function Ni(e,t,n,r,i){let a=(r-t)*.5,o=(i-n)*.5,s=e*e,c=e*s;return(2*n-2*r+a+o)*c+(-3*n+3*r-2*a-o)*s+a*e+n}function Pi(e,t){let n=1-e;return n*n*t}function Fi(e,t){return 2*(1-e)*e*t}function Ii(e,t){return e*e*t}function Li(e,t,n,r){return Pi(e,t)+Fi(e,n)+Ii(e,r)}function Ri(e,t){let n=1-e;return n*n*n*t}function zi(e,t){let n=1-e;return 3*n*n*e*t}function Bi(e,t){return 3*(1-e)*e*e*t}function Vi(e,t){return e*e*e*t}function Hi(e,t,n,r,i){return Ri(e,t)+zi(e,n)+Bi(e,r)+Vi(e,i)}var Ui=class extends Ci{constructor(e=new U,t=new U,n=new U,r=new U){super(),this.isCubicBezierCurve=!0,this.type=`CubicBezierCurve`,this.v0=e,this.v1=t,this.v2=n,this.v3=r}getPoint(e,t=new U){let n=t,r=this.v0,i=this.v1,a=this.v2,o=this.v3;return n.set(Hi(e,r.x,i.x,a.x,o.x),Hi(e,r.y,i.y,a.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Wi=class extends Ci{constructor(e=new W,t=new W,n=new W,r=new W){super(),this.isCubicBezierCurve3=!0,this.type=`CubicBezierCurve3`,this.v0=e,this.v1=t,this.v2=n,this.v3=r}getPoint(e,t=new W){let n=t,r=this.v0,i=this.v1,a=this.v2,o=this.v3;return n.set(Hi(e,r.x,i.x,a.x,o.x),Hi(e,r.y,i.y,a.y,o.y),Hi(e,r.z,i.z,a.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Gi=class extends Ci{constructor(e=new U,t=new U){super(),this.isLineCurve=!0,this.type=`LineCurve`,this.v1=e,this.v2=t}getPoint(e,t=new U){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new U){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Ki=class extends Ci{constructor(e=new W,t=new W){super(),this.isLineCurve3=!0,this.type=`LineCurve3`,this.v1=e,this.v2=t}getPoint(e,t=new W){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new W){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},qi=class extends Ci{constructor(e=new U,t=new U,n=new U){super(),this.isQuadraticBezierCurve=!0,this.type=`QuadraticBezierCurve`,this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new U){let n=t,r=this.v0,i=this.v1,a=this.v2;return n.set(Li(e,r.x,i.x,a.x),Li(e,r.y,i.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Ji=class extends Ci{constructor(e=new W,t=new W,n=new W){super(),this.isQuadraticBezierCurve3=!0,this.type=`QuadraticBezierCurve3`,this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new W){let n=t,r=this.v0,i=this.v1,a=this.v2;return n.set(Li(e,r.x,i.x,a.x),Li(e,r.y,i.y,a.y),Li(e,r.z,i.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Yi=Object.freeze({__proto__:null,ArcCurve:Ti,CatmullRomCurve3:Mi,CubicBezierCurve:Ui,CubicBezierCurve3:Wi,EllipseCurve:wi,LineCurve:Gi,LineCurve3:Ki,QuadraticBezierCurve:qi,QuadraticBezierCurve3:Ji,SplineCurve:class extends Ci{constructor(e=[]){super(),this.isSplineCurve=!0,this.type=`SplineCurve`,this.points=e}getPoint(e,t=new U){let n=t,r=this.points,i=(r.length-1)*e,a=Math.floor(i),o=i-a,s=r[a===0?a:a-1],c=r[a],l=r[a>r.length-2?r.length-1:a+1],u=r[a>r.length-3?r.length-1:a+2];return n.set(Ni(o,s.x,c.x,l.x,u.x),Ni(o,s.y,c.y,l.y,u.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(n.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let n=this.points[t];e.points.push(n.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(new U().fromArray(n))}return this}}}),Xi=class e extends Si{constructor(e=1,t=0){let n=(1+Math.sqrt(5))/2,r=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1];super(r,[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1],e,t),this.type=`IcosahedronGeometry`,this.parameters={radius:e,detail:t}}static fromJSON(t){return new e(t.radius,t.detail)}},Zi=class e extends Dr{constructor(e=[new U(0,-.5),new U(.5,0),new U(0,.5)],t=12,n=0,r=Math.PI*2){super(),this.type=`LatheGeometry`,this.parameters={points:e,segments:t,phiStart:n,phiLength:r},t=Math.floor(t),r=st(r,0,Math.PI*2);let i=[],a=[],o=[],s=[],c=[],l=1/t,u=new W,d=new U,f=new W,p=new W,m=new W,h=0,g=0;for(let t=0;t<=e.length-1;t++)switch(t){case 0:h=e[t+1].x-e[t].x,g=e[t+1].y-e[t].y,f.x=g*1,f.y=-h,f.z=g*0,m.copy(f),f.normalize(),s.push(f.x,f.y,f.z);break;case e.length-1:s.push(m.x,m.y,m.z);break;default:h=e[t+1].x-e[t].x,g=e[t+1].y-e[t].y,f.x=g*1,f.y=-h,f.z=g*0,p.copy(f),f.x+=m.x,f.y+=m.y,f.z+=m.z,f.normalize(),s.push(f.x,f.y,f.z),m.copy(p)}for(let i=0;i<=t;i++){let f=n+i*l*r,p=Math.sin(f),m=Math.cos(f);for(let n=0;n<=e.length-1;n++){u.x=e[n].x*p,u.y=e[n].y,u.z=e[n].x*m,a.push(u.x,u.y,u.z),d.x=i/t,d.y=n/(e.length-1),o.push(d.x,d.y);let r=s[3*n+0]*p,l=s[3*n+1],f=s[3*n+0]*m;c.push(r,l,f)}}for(let n=0;n<t;n++)for(let t=0;t<e.length-1;t++){let r=t+n*e.length,a=r,o=r+e.length,s=r+e.length+1,c=r+1;i.push(a,o,c),i.push(s,c,o)}this.setIndex(i),this.setAttribute(`position`,new q(a,3)),this.setAttribute(`uv`,new q(o,2)),this.setAttribute(`normal`,new q(c,3))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.points,t.segments,t.phiStart,t.phiLength)}},Qi=class e extends Dr{constructor(e=1,t=1,n=1,r=1){super(),this.type=`PlaneGeometry`,this.parameters={width:e,height:t,widthSegments:n,heightSegments:r};let i=e/2,a=t/2,o=Math.floor(n),s=Math.floor(r),c=o+1,l=s+1,u=e/o,d=t/s,f=[],p=[],m=[],h=[];for(let e=0;e<l;e++){let t=e*d-a;for(let n=0;n<c;n++){let r=n*u-i;p.push(r,-t,0),m.push(0,0,1),h.push(n/o),h.push(1-e/s)}}for(let e=0;e<s;e++)for(let t=0;t<o;t++){let n=t+c*e,r=t+c*(e+1),i=t+1+c*(e+1),a=t+1+c*e;f.push(n,r,a),f.push(r,i,a)}this.setIndex(f),this.setAttribute(`position`,new q(p,3)),this.setAttribute(`normal`,new q(m,3)),this.setAttribute(`uv`,new q(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.widthSegments,t.heightSegments)}},$i=class e extends Dr{constructor(e=1,t=32,n=16,r=0,i=Math.PI*2,a=0,o=Math.PI){super(),this.type=`SphereGeometry`,this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:r,phiLength:i,thetaStart:a,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));let s=Math.min(a+o,Math.PI),c=0,l=[],u=new W,d=new W,f=[],p=[],m=[],h=[];for(let f=0;f<=n;f++){let g=[],_=f/n,v=a+_*o,y=e*Math.cos(v),b=Math.sqrt(e*e-y*y),x=0;f===0&&a===0?x=.5/t:f===n&&s===Math.PI&&(x=-.5/t);for(let e=0;e<=t;e++){let n=e/t,a=r+n*i;u.x=-b*Math.cos(a),u.y=y,u.z=b*Math.sin(a),p.push(u.x,u.y,u.z),d.copy(u).normalize(),m.push(d.x,d.y,d.z),h.push(n+x,1-_),g.push(c++)}l.push(g)}for(let e=0;e<n;e++)for(let r=0;r<t;r++){let t=l[e][r+1],i=l[e][r],o=l[e+1][r],c=l[e+1][r+1];(e!==0||a>0)&&f.push(t,i,c),(e!==n-1||s<Math.PI)&&f.push(i,o,c)}this.setIndex(f),this.setAttribute(`position`,new q(p,3)),this.setAttribute(`normal`,new q(m,3)),this.setAttribute(`uv`,new q(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}},ea=class e extends Dr{constructor(e=1,t=.4,n=12,r=48,i=Math.PI*2,a=0,o=Math.PI*2){super(),this.type=`TorusGeometry`,this.parameters={radius:e,tube:t,radialSegments:n,tubularSegments:r,arc:i,thetaStart:a,thetaLength:o},n=Math.floor(n),r=Math.floor(r);let s=[],c=[],l=[],u=[],d=new W,f=new W,p=new W;for(let s=0;s<=n;s++){let m=a+s/n*o;for(let a=0;a<=r;a++){let o=a/r*i;f.x=(e+t*Math.cos(m))*Math.cos(o),f.y=(e+t*Math.cos(m))*Math.sin(o),f.z=t*Math.sin(m),c.push(f.x,f.y,f.z),d.x=e*Math.cos(o),d.y=e*Math.sin(o),p.subVectors(f,d).normalize(),l.push(p.x,p.y,p.z),u.push(a/r),u.push(s/n)}}for(let e=1;e<=n;e++)for(let t=1;t<=r;t++){let n=(r+1)*e+t-1,i=(r+1)*(e-1)+t-1,a=(r+1)*(e-1)+t,o=(r+1)*e+t;s.push(n,i,o),s.push(i,a,o)}this.setIndex(s),this.setAttribute(`position`,new q(c,3)),this.setAttribute(`normal`,new q(l,3)),this.setAttribute(`uv`,new q(u,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc,t.thetaStart,t.thetaLength)}},ta=class e extends Dr{constructor(e=new Ji(new W(-1,-1,0),new W(-1,1,0),new W(1,1,0)),t=64,n=1,r=8,i=!1){super(),this.type=`TubeGeometry`,this.parameters={path:e,tubularSegments:t,radius:n,radialSegments:r,closed:i};let a=e.computeFrenetFrames(t,i);this.tangents=a.tangents,this.normals=a.normals,this.binormals=a.binormals;let o=new W,s=new W,c=new U,l=new W,u=[],d=[],f=[],p=[];m(),this.setIndex(p),this.setAttribute(`position`,new q(u,3)),this.setAttribute(`normal`,new q(d,3)),this.setAttribute(`uv`,new q(f,2));function m(){for(let e=0;e<t;e++)h(e);h(i===!1?t:0),_(),g()}function h(i){l=e.getPointAt(i/t,l);let c=a.normals[i],f=a.binormals[i];for(let e=0;e<=r;e++){let t=e/r*Math.PI*2,i=Math.sin(t),a=-Math.cos(t);s.x=a*c.x+i*f.x,s.y=a*c.y+i*f.y,s.z=a*c.z+i*f.z,s.normalize(),d.push(s.x,s.y,s.z),o.x=l.x+n*s.x,o.y=l.y+n*s.y,o.z=l.z+n*s.z,u.push(o.x,o.y,o.z)}}function g(){for(let e=1;e<=t;e++)for(let t=1;t<=r;t++){let n=(r+1)*(e-1)+(t-1),i=(r+1)*e+(t-1),a=(r+1)*e+t,o=(r+1)*(e-1)+t;p.push(n,i,o),p.push(i,a,o)}}function _(){for(let e=0;e<=t;e++)for(let n=0;n<=r;n++)c.x=e/t,c.y=n/r,f.push(c.x,c.y)}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON();return e.path=this.parameters.path.toJSON(),e}static fromJSON(t){return new e(new Yi[t.path.type]().fromJSON(t.path),t.tubularSegments,t.radius,t.radialSegments,t.closed)}};function na(e){let t={};for(let n in e){t[n]={};for(let r in e[n]){let i=e[n][r];if(ia(i))i.isRenderTargetTexture?(B(`UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms().`),t[n][r]=null):t[n][r]=i.clone();else if(Array.isArray(i)){if(ia(i[0])){let e=[];for(let t=0,n=i.length;t<n;t++)e[t]=i[t].clone();t[n][r]=e}else t[n][r]=i.slice()}else t[n][r]=i}}return t}function ra(e){let t={};for(let n=0;n<e.length;n++){let r=na(e[n]);for(let e in r)t[e]=r[e]}return t}function ia(e){return e&&(e.isColor||e.isMatrix3||e.isMatrix4||e.isVector2||e.isVector3||e.isVector4||e.isTexture||e.isQuaternion)}function aa(e){let t=[];for(let n=0;n<e.length;n++)t.push(e[n].clone());return t}function oa(e){let t=e.getRenderTarget();return t===null?e.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Ft.workingColorSpace}var sa={clone:na,merge:ra},ca=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,la=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,ua=class extends Nr{constructor(e){super(),this.isShaderMaterial=!0,this.type=`ShaderMaterial`,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=ca,this.fragmentShader=la,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=na(e.uniforms),this.uniformsGroups=aa(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let n in this.uniforms){let r=this.uniforms[n].value;r&&r.isTexture?t.uniforms[n]={type:`t`,value:r.toJSON(e).uuid}:r&&r.isColor?t.uniforms[n]={type:`c`,value:r.getHex()}:r&&r.isVector2?t.uniforms[n]={type:`v2`,value:r.toArray()}:r&&r.isVector3?t.uniforms[n]={type:`v3`,value:r.toArray()}:r&&r.isVector4?t.uniforms[n]={type:`v4`,value:r.toArray()}:r&&r.isMatrix3?t.uniforms[n]={type:`m3`,value:r.toArray()}:r&&r.isMatrix4?t.uniforms[n]={type:`m4`,value:r.toArray()}:t.uniforms[n]={value:r}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let e in this.extensions)this.extensions[e]===!0&&(n[e]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(let n in e.uniforms){let r=e.uniforms[n];switch(this.uniforms[n]={},r.type){case`t`:this.uniforms[n].value=t[r.value]||null;break;case`c`:this.uniforms[n].value=new K().setHex(r.value);break;case`v2`:this.uniforms[n].value=new U().fromArray(r.value);break;case`v3`:this.uniforms[n].value=new W().fromArray(r.value);break;case`v4`:this.uniforms[n].value=new Kt().fromArray(r.value);break;case`m3`:this.uniforms[n].value=new G().fromArray(r.value);break;case`m4`:this.uniforms[n].value=new Zt().fromArray(r.value);break;default:this.uniforms[n].value=r.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(let t in e.extensions)this.extensions[t]=e.extensions[t];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}},da=class extends ua{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type=`RawShaderMaterial`}},fa=class extends Nr{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type=`MeshDepthMaterial`,this.depthPacking=z,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},pa=class extends Nr{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type=`MeshDistanceMaterial`,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function ma(e,t){return!e||e.constructor===t?e:typeof t.BYTES_PER_ELEMENT==`number`?new t(e):Array.prototype.slice.call(e)}function ha(e){return e!==void 0&&e.inTangents!==void 0&&e.outTangents!==void 0}var ga=class{constructor(e,t,n,r){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=r===void 0?new t.constructor(n):r,this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,r=t[n],i=t[n-1];validate_interval:{seek:{let a;linear_scan:{forward_scan:if(!(e<r)){for(let a=n+2;;){if(r===void 0){if(e<i)break forward_scan;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(i=r,r=t[++n],e<r)break seek}a=t.length;break linear_scan}if(!(e>=i)){let o=t[1];e<o&&(n=2,i=o);for(let a=n-2;;){if(i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===a)break;if(r=i,i=t[--n-1],e>=i)break seek}a=n,n=0;break linear_scan}break validate_interval}for(;n<a;){let r=n+a>>>1;e<t[r]?a=r:n=r+1}if(r=t[n],i=t[n-1],i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,i,r)}return this.interpolate_(n,i,e,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,r=this.valueSize,i=e*r;for(let e=0;e!==r;++e)t[e]=n[i+e];return t}interpolate_(){throw Error(`THREE.Interpolant: Call to abstract method.`)}intervalChanged_(){}},_a=class extends ga{constructor(e,t,n,r){super(e,t,n,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Pe,endingEnd:Pe}}intervalChanged_(e,t,n){let r=this.parameterPositions,i=e-2,a=e+1,o=r[i],s=r[a];if(o===void 0)switch(this.getSettings_().endingStart){case R:i=e,o=2*t-n;break;case Fe:i=r.length-2,o=t+r[i]-r[i+1];break;default:i=e,o=n}if(s===void 0)switch(this.getSettings_().endingEnd){case R:a=e,s=2*n-t;break;case Fe:a=1,s=n+r[1]-r[0];break;default:a=e-1,s=t}let c=(n-t)*.5,l=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(s-n),this._offsetPrev=i*l,this._offsetNext=a*l}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,p=(n-t)/(r-t),m=p*p,h=m*p,g=-d*h+2*d*m-d*p,_=(1+d)*h+(-1.5-2*d)*m+(-.5+d)*p+1,v=(-1-f)*h+(1.5+f)*m+.5*p,y=f*h-f*m;for(let e=0;e!==o;++e)i[e]=g*a[l+e]+_*a[c+e]+v*a[s+e]+y*a[u+e];return i}},va=class extends ga{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=(n-t)/(r-t),u=1-l;for(let e=0;e!==o;++e)i[e]=a[c+e]*u+a[s+e]*l;return i}},ya=class extends ga{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e){return this.copySampleValue_(e-1)}},ba=class extends ga{interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this.inTangents,u=this.outTangents;if(!l||!u){let e=(n-t)/(r-t),l=1-e;for(let t=0;t!==o;++t)i[t]=a[c+t]*l+a[s+t]*e;return i}let d=o*2,f=e-1;for(let p=0;p!==o;++p){let o=a[c+p],m=a[s+p],h=f*d+p*2,g=u[h],_=u[h+1],v=e*d+p*2,y=l[v],b=l[v+1],x=Ca(n,t,g,y,r);i[p]=xa(x,o,_,b,m)}return i}};function xa(e,t,n,r,i){let a=1-e;return a*a*a*t+3*a*a*e*n+3*a*e*e*r+e*e*e*i}function Sa(e,t,n,r,i){let a=1-e;return 3*a*a*(n-t)+6*a*e*(r-n)+3*e*e*(i-r)}function Ca(e,t,n,r,i){let a=(e-t)/(i-t);for(let o=0;o<8;o++){let o=xa(a,t,n,r,i)-e;if(Math.abs(o)<1e-10)break;let s=Sa(a,t,n,r,i);if(Math.abs(s)<1e-10)break;a=Math.max(0,Math.min(1,a-o/s))}return a}var wa=class{constructor(e,t,n,r){if(e===void 0)throw Error(`THREE.KeyframeTrack: track name is undefined`);if(t===void 0||t.length===0)throw Error(`THREE.KeyframeTrack: no keyframes in track named `+e);this.name=e,this.times=ma(t,this.TimeBufferType),this.values=ma(n,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:ma(e.times,Array),values:ma(e.values,Array)};let t=e.getInterpolation();t!==e.DefaultInterpolation&&(n.interpolation=t),ha(e.settings)&&(n.settings={inTangents:ma(e.settings.inTangents,Array),outTangents:ma(e.settings.outTangents,Array)})}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new ya(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new va(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new _a(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new ba(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case je:t=this.InterpolantFactoryMethodDiscrete;break;case L:t=this.InterpolantFactoryMethodLinear;break;case Me:t=this.InterpolantFactoryMethodSmooth;break;case Ne:t=this.InterpolantFactoryMethodBezier}if(t===void 0){let t=`unsupported interpolation for `+this.ValueTypeName+` keyframe track named `+this.name;if(this.createInterpolant===void 0){if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error(t)}return B(`KeyframeTrack:`,t),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return je;case this.InterpolantFactoryMethodLinear:return L;case this.InterpolantFactoryMethodSmooth:return Me;case this.InterpolantFactoryMethodBezier:return Ne}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]*=e;ha(this.settings)&&(Ta(this.settings.inTangents,e),Ta(this.settings.outTangents,e))}return this}trim(e,t){let n=this.times,r=n.length,i=0,a=r-1;for(;i!==r&&n[i]<e;)++i;for(;a!==-1&&n[a]>t;)--a;if(++a,i!==0||a!==r){i>=a&&(a=Math.max(a,1),i=a-1);let e=this.getValueSize();this.times=n.slice(i,a),this.values=this.values.slice(i*e,a*e)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(V(`KeyframeTrack: Invalid value size in track.`,this),e=!1);let n=this.times,r=this.values,i=n.length;i===0&&(V(`KeyframeTrack: Track is empty.`,this),e=!1);let a=null;for(let t=0;t!==i;t++){let r=n[t];if(typeof r==`number`&&isNaN(r)){V(`KeyframeTrack: Time is not a valid number.`,this,t,r),e=!1;break}if(a!==null&&a>r){V(`KeyframeTrack: Out of order keys.`,this,t,r,a),e=!1;break}a=r}if(r!==void 0&&Ke(r))for(let t=0,n=r.length;t!==n;++t){let n=r[t];if(isNaN(n)){V(`KeyframeTrack: Value is not a valid number.`,this,t,n),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),r=this.getInterpolation()===Me,i=e.length-1,a=1;for(let o=1;o<i;++o){let i=!1,s=e[o];if(s!==e[o+1]&&(o!==1||s!==e[0])){if(r)i=!0;else{let e=o*n,r=e-n,a=e+n;for(let o=0;o!==n;++o){let n=t[e+o];if(n!==t[r+o]||n!==t[a+o]){i=!0;break}}}}if(i){if(o!==a){e[a]=e[o];let r=o*n,i=a*n;for(let e=0;e!==n;++e)t[i+e]=t[r+e]}++a}}if(i>0){e[a]=e[i];for(let e=i*n,r=a*n,o=0;o!==n;++o)t[r+o]=t[e+o];++a}return a===e.length?(this.times=e,this.values=t):(this.times=e.slice(0,a),this.values=t.slice(0,a*n)),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,r=new n(this.name,e,t);return r.createInterpolant=this.createInterpolant,ha(this.settings)&&(r.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),r}};function Ta(e,t){for(let n=0,r=e.length;n!==r;n+=2)e[n]*=t}wa.prototype.ValueTypeName=``,wa.prototype.TimeBufferType=Float32Array,wa.prototype.ValueBufferType=Float32Array,wa.prototype.DefaultInterpolation=L;var Ea=class extends wa{constructor(e,t,n){super(e,t,n)}};Ea.prototype.ValueTypeName=`bool`,Ea.prototype.ValueBufferType=Array,Ea.prototype.DefaultInterpolation=je,Ea.prototype.InterpolantFactoryMethodLinear=void 0,Ea.prototype.InterpolantFactoryMethodSmooth=void 0;var Da=class extends wa{constructor(e,t,n,r){super(e,t,n,r)}};Da.prototype.ValueTypeName=`color`;var Oa=class extends wa{constructor(e,t,n,r){super(e,t,n,r)}};Oa.prototype.ValueTypeName=`number`;var ka=class extends ga{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=(n-t)/(r-t),c=e*o;for(let e=c+o;c!==e;c+=4)Ot.slerpFlat(i,0,a,c-o,a,c,s);return i}},Aa=class extends wa{constructor(e,t,n,r){super(e,t,n,r)}InterpolantFactoryMethodLinear(e){return new ka(this.times,this.values,this.getValueSize(),e)}};Aa.prototype.ValueTypeName=`quaternion`,Aa.prototype.InterpolantFactoryMethodSmooth=void 0;var ja=class extends wa{constructor(e,t,n){super(e,t,n)}};ja.prototype.ValueTypeName=`string`,ja.prototype.ValueBufferType=Array,ja.prototype.DefaultInterpolation=je,ja.prototype.InterpolantFactoryMethodLinear=void 0,ja.prototype.InterpolantFactoryMethodSmooth=void 0;var Ma=class extends wa{constructor(e,t,n,r){super(e,t,n,r)}};Ma.prototype.ValueTypeName=`vector`;var Na=new W,Pa=new Ot,Fa=new W,Ia=class extends Tn{constructor(){super(),this.isCamera=!0,this.type=`Camera`,this.matrixWorldInverse=new Zt,this.projectionMatrix=new Zt,this.projectionMatrixInverse=new Zt,this.coordinateSystem=We,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Na,Pa,Fa),Fa.x===1&&Fa.y===1&&Fa.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Na,Pa,Fa.set(1,1,1)).invert()}updateWorldMatrix(e,t,n=!1){super.updateWorldMatrix(e,t,n),this.matrixWorld.decompose(Na,Pa,Fa),Fa.x===1&&Fa.y===1&&Fa.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Na,Pa,Fa.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},La=new W,Ra=new U,za=new U,Ba=class extends Ia{constructor(e=50,t=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type=`PerspectiveCamera`,this.fov=e,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=at*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(it*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return at*2*Math.atan(Math.tan(it*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){La.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(La.x,La.y).multiplyScalar(-e/La.z),La.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(La.x,La.y).multiplyScalar(-e/La.z)}getViewSize(e,t){return this.getViewBounds(e,Ra,za),t.subVectors(za,Ra)}setViewOffset(e,t,n,r,i,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(it*.5*this.fov)/this.zoom,n=2*t,r=this.aspect*n,i=-.5*r,a=this.view;if(this.view!==null&&this.view.enabled){let e=a.fullWidth,o=a.fullHeight;i+=a.offsetX*r/e,t-=a.offsetY*n/o,r*=a.width/e,n*=a.height/o}let o=this.filmOffset;o!==0&&(i+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(i,i+r,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},Va=class extends Ia{constructor(e=-1,t=1,n=1,r=-1,i=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type=`OrthographicCamera`,this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=r,this.near=i,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,r,i,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2,i=n-e,a=n+e,o=r+t,s=r-t;if(this.view!==null&&this.view.enabled){let e=(this.right-this.left)/this.view.fullWidth/this.zoom,t=(this.top-this.bottom)/this.view.fullHeight/this.zoom;i+=e*this.view.offsetX,a=i+e*this.view.width,o-=t*this.view.offsetY,s=o-t*this.view.height}this.projectionMatrix.makeOrthographic(i,a,o,s,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},Ha=class extends Dr{constructor(){super(),this.isInstancedBufferGeometry=!0,this.type=`InstancedBufferGeometry`,this.instanceCount=1/0}copy(e){return super.copy(e),this.instanceCount=e.instanceCount,this}toJSON(){let e=super.toJSON();return e.instanceCount=this.instanceCount,e.isInstancedBufferGeometry=!0,e}},Ua=-90,Wa=1,Ga=class extends Tn{constructor(e,t,n){super(),this.type=`CubeCamera`,this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let r=new Ba(Ua,Wa,e,t);r.layers=this.layers,this.add(r);let i=new Ba(Ua,Wa,e,t);i.layers=this.layers,this.add(i);let a=new Ba(Ua,Wa,e,t);a.layers=this.layers,this.add(a);let o=new Ba(Ua,Wa,e,t);o.layers=this.layers,this.add(o);let s=new Ba(Ua,Wa,e,t);s.layers=this.layers,this.add(s);let c=new Ba(Ua,Wa,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,r,i,a,o,s]=t;for(let e of t)this.remove(e);if(e===2e3)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),i.up.set(0,0,-1),i.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),s.up.set(0,1,0),s.lookAt(0,0,-1);else if(e===2001)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),i.up.set(0,0,1),i.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),s.up.set(0,-1,0),s.lookAt(0,0,-1);else throw Error(`THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: `+e);for(let e of t)this.add(e),e.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[i,a,o,s,c,l]=this.children,u=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),p=e.xr.enabled;e.xr.enabled=!1;let m=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let h=!1;h=e.isWebGLRenderer===!0?e.state.buffers.depth.getReversed():e.reversedDepthBuffer,e.setRenderTarget(n,0,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,i),e.setRenderTarget(n,1,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,2,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,3,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,s),e.setRenderTarget(n,4,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),n.texture.generateMipmaps=m,e.setRenderTarget(n,5,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(u,d,f),e.xr.enabled=p,n.texture.needsPMREMUpdate=!0}},Ka=class extends Ba{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}},qa=class{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(e){this._document=e,e.hidden!==void 0&&(this._pageVisibilityHandler=Ja.bind(this),e.addEventListener(`visibilitychange`,this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener(`visibilitychange`,this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(e){return this._timescale=e,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(e){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(e===void 0?performance.now():e)-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}};function Ja(){this._document.hidden===!1&&this.reset()}var Ya=`\\[\\]\\.:\\/`,Xa=RegExp(`[\\[\\]\\.:\\/]`,`g`),Za=`[^\\[\\]\\.:\\/]`,Qa=`[^`+Ya.replace(`\\.`,``)+`]`,$a=`((?:WC+[\\/:])*)`.replace(`WC`,Za),eo=`(WCOD+)?`.replace(`WCOD`,Qa),to=`(?:\\.(WC+)(?:\\[(.+)\\])?)?`.replace(`WC`,Za),no=`\\.(WC+)(?:\\[(.+)\\])?`.replace(`WC`,Za),ro=RegExp(`^`+$a+eo+to+no+`$`),io=[`material`,`materials`,`bones`,`map`],ao=class{constructor(e,t,n){let r=n||oo.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,r)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,r=this._bindings[n];r!==void 0&&r.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let r=this._targetGroup.nCachedObjects_,i=n.length;r!==i;++r)n[r].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},oo=class e{constructor(t,n,r){this.path=n,this.parsedPath=r||e.parseTrackName(n),this.node=e.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,n,r){return t&&t.isAnimationObjectGroup?new e.Composite(t,n,r):new e(t,n,r)}static sanitizeNodeName(e){return e.replace(/\s/g,`_`).replace(Xa,``)}static parseTrackName(e){let t=ro.exec(e);if(t===null)throw Error(`THREE.PropertyBinding: Cannot parse trackName: `+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},r=n.nodeName&&n.nodeName.lastIndexOf(`.`);if(r!==void 0&&r!==-1){let e=n.nodeName.substring(r+1);io.indexOf(e)!==-1&&(n.nodeName=n.nodeName.substring(0,r),n.objectName=e)}if(n.propertyName===null||n.propertyName.length===0)throw Error(`THREE.PropertyBinding: can not parse propertyName from trackName: `+e);return n}static findNode(e,t){if(t===void 0||t===``||t===`.`||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(e){for(let r=0;r<e.length;r++){let i=e[r];if(i.name===t||i.uuid===t)return i;let a=n(i.children);if(a)return a}return null},r=n(e.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)e[t++]=n[r]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let t=this.node,n=this.parsedPath,r=n.objectName,i=n.propertyName,a=n.propertyIndex;if(t||(t=e.findNode(this.rootNode,n.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){B(`PropertyBinding: No target node found for track: `+this.path+`.`);return}if(r){let e=n.objectIndex;switch(r){case`materials`:if(!t.material){V(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.materials){V(`PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.`,this);return}t=t.material.materials;break;case`bones`:if(!t.skeleton){V(`PropertyBinding: Can not bind to bones as node does not have a skeleton.`,this);return}t=t.skeleton.bones;for(let n=0;n<t.length;n++)if(t[n].name===e){e=n;break}break;case`map`:if(`map`in t){t=t.map;break}if(!t.material){V(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.map){V(`PropertyBinding: Can not bind to material.map as node.material does not have a map.`,this);return}t=t.material.map;break;default:if(t[r]===void 0){V(`PropertyBinding: Can not bind to objectName of node undefined.`,this);return}t=t[r]}if(e!==void 0){if(t[e]===void 0){V(`PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.`,this,t);return}t=t[e]}}let o=t[i];if(o===void 0){let e=n.nodeName;V(`PropertyBinding: Trying to update property for track: `+e+`.`+i+` but it wasn't found.`,t);return}let s=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?s=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(s=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(a!==void 0){if(i===`morphTargetInfluences`){if(!t.geometry){V(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.`,this);return}if(!t.geometry.morphAttributes){V(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.`,this);return}t.morphTargetDictionary[a]!==void 0&&(a=t.morphTargetDictionary[a])}c=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=a}else o.fromArray!==void 0&&o.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(c=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=i;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][s]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};oo.Composite=ao,oo.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3},oo.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2},oo.prototype.GetterByBindingType=[oo.prototype._getValue_direct,oo.prototype._getValue_array,oo.prototype._getValue_arrayElement,oo.prototype._getValue_toArray],oo.prototype.SetterByBindingTypeAndVersioning=[[oo.prototype._setValue_direct,oo.prototype._setValue_direct_setNeedsUpdate,oo.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[oo.prototype._setValue_array,oo.prototype._setValue_array_setNeedsUpdate,oo.prototype._setValue_array_setMatrixWorldNeedsUpdate],[oo.prototype._setValue_arrayElement,oo.prototype._setValue_arrayElement_setNeedsUpdate,oo.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[oo.prototype._setValue_fromArray,oo.prototype._setValue_fromArray_setNeedsUpdate,oo.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]],class e{static{e.prototype.isMatrix2=!0}constructor(e,t,n,r){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,r)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,r){let i=this.elements;return i[0]=e,i[2]=t,i[1]=n,i[3]=r,this}};function so(e,t,n,r){let i=co(r);switch(n){case S:return e*t;case D:return e*t/i.components*i.byteLength;case O:return e*t/i.components*i.byteLength;case k:return e*t*2/i.components*i.byteLength;case A:return e*t*2/i.components*i.byteLength;case C:return e*t*3/i.components*i.byteLength;case w:return e*t*4/i.components*i.byteLength;case j:return e*t*4/i.components*i.byteLength;case M:case N:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case P:case ee:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case te:case re:return Math.max(e,16)*Math.max(t,8)/4;case F:case ne:return Math.max(e,8)*Math.max(t,8)/2;case ie:case ae:case se:case I:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case oe:case ce:case le:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case ue:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case de:return Math.floor((e+4)/5)*Math.floor((t+3)/4)*16;case fe:return Math.floor((e+4)/5)*Math.floor((t+4)/5)*16;case pe:return Math.floor((e+5)/6)*Math.floor((t+4)/5)*16;case me:return Math.floor((e+5)/6)*Math.floor((t+5)/6)*16;case he:return Math.floor((e+7)/8)*Math.floor((t+4)/5)*16;case ge:return Math.floor((e+7)/8)*Math.floor((t+5)/6)*16;case _e:return Math.floor((e+7)/8)*Math.floor((t+7)/8)*16;case ve:return Math.floor((e+9)/10)*Math.floor((t+4)/5)*16;case ye:return Math.floor((e+9)/10)*Math.floor((t+5)/6)*16;case be:return Math.floor((e+9)/10)*Math.floor((t+7)/8)*16;case xe:return Math.floor((e+9)/10)*Math.floor((t+9)/10)*16;case Se:return Math.floor((e+11)/12)*Math.floor((t+9)/10)*16;case Ce:return Math.floor((e+11)/12)*Math.floor((t+11)/12)*16;case we:case Te:case Ee:return Math.ceil(e/4)*Math.ceil(t/4)*16;case De:case Oe:return Math.ceil(e/4)*Math.ceil(t/4)*8;case ke:case Ae:return Math.ceil(e/4)*Math.ceil(t/4)*16}throw Error(`Unable to determine texture byte length for ${n} format.`)}function co(e){switch(e){case l:case u:return{byteLength:1,components:1};case f:case d:case g:return{byteLength:2,components:1};case _:case v:return{byteLength:2,components:4};case m:case p:case h:return{byteLength:4,components:1};case b:case x:return{byteLength:4,components:3}}throw Error(`THREE.TextureUtils: Unknown texture type ${e}.`)}typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`register`,{detail:{revision:`186`}})),typeof window<`u`&&(window.__THREE__?B(`WARNING: Multiple instances of Three.js being imported.`):window.__THREE__=`186`);function lo(){let e=null,t=!1,n=null,r=null;function i(t,a){r=e.requestAnimationFrame(i),n(t,a)}return{start:function(){t!==!0&&n!==null&&e!==null&&(r=e.requestAnimationFrame(i),t=!0)},stop:function(){e!==null&&e.cancelAnimationFrame(r),t=!1},setAnimationLoop:function(e){n=e},setContext:function(t){e=t}}}function uo(e){let t=new WeakMap;function n(t,n){let r=t.array,i=t.usage,a=r.byteLength,o=e.createBuffer();e.bindBuffer(n,o),e.bufferData(n,r,i),t.onUploadCallback();let s;if(r instanceof Float32Array)s=e.FLOAT;else if(typeof Float16Array<`u`&&r instanceof Float16Array)s=e.HALF_FLOAT;else if(r instanceof Uint16Array)s=t.isFloat16BufferAttribute?e.HALF_FLOAT:e.UNSIGNED_SHORT;else if(r instanceof Int16Array)s=e.SHORT;else if(r instanceof Uint32Array)s=e.UNSIGNED_INT;else if(r instanceof Int32Array)s=e.INT;else if(r instanceof Int8Array)s=e.BYTE;else if(r instanceof Uint8Array)s=e.UNSIGNED_BYTE;else if(r instanceof Uint8ClampedArray)s=e.UNSIGNED_BYTE;else throw Error(`THREE.WebGLAttributes: Unsupported buffer data format: `+r);return{buffer:o,type:s,bytesPerElement:r.BYTES_PER_ELEMENT,version:t.version,size:a}}function r(t,n,r){let i=n.array,a=n.updateRanges;if(e.bindBuffer(r,t),a.length===0)e.bufferSubData(r,0,i);else{a.sort((e,t)=>e.start-t.start);let t=0;for(let e=1;e<a.length;e++){let n=a[t],r=a[e];r.start<=n.start+n.count+1?n.count=Math.max(n.count,r.start+r.count-n.start):(++t,a[t]=r)}a.length=t+1;for(let t=0,n=a.length;t<n;t++){let n=a[t];e.bufferSubData(r,n.start*i.BYTES_PER_ELEMENT,i,n.start,n.count)}n.clearUpdateRanges()}n.onUploadCallback()}function i(e){return e.isInterleavedBufferAttribute&&(e=e.data),t.get(e)}function a(n){n.isInterleavedBufferAttribute&&(n=n.data);let r=t.get(n);r&&(e.deleteBuffer(r.buffer),t.delete(n))}function o(e,i){if(e.isInterleavedBufferAttribute&&(e=e.data),e.isGLBufferAttribute){let n=t.get(e);(!n||n.version<e.version)&&t.set(e,{buffer:e.buffer,type:e.type,bytesPerElement:e.elementSize,version:e.version});return}let a=t.get(e);if(a===void 0)t.set(e,n(e,i));else if(a.version<e.version){if(a.size!==e.array.byteLength)throw Error(`THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.`);r(a.buffer,e,i),a.version=e.version}}return{get:i,remove:a,update:o}}var fo={alphahash_fragment:`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,alphahash_pars_fragment:`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,alphamap_fragment:`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,alphamap_pars_fragment:`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,alphatest_fragment:`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,alphatest_pars_fragment:`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,aomap_fragment:`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,aomap_pars_fragment:`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,batching_pars_vertex:`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,batching_vertex:`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,begin_vertex:`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,beginnormal_vertex:`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bsdfs:`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,iridescence_fragment:`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,bumpmap_pars_fragment:`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,clipping_planes_fragment:`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,clipping_planes_pars_fragment:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,clipping_planes_pars_vertex:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,clipping_planes_vertex:`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,color_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,color_pars_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,color_pars_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,color_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,common:`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,cube_uv_reflection_fragment:`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,defaultnormal_vertex:`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,displacementmap_pars_vertex:`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,displacementmap_vertex:`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,emissivemap_fragment:`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,emissivemap_pars_fragment:`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,colorspace_fragment:`gl_FragColor = linearToOutputTexel( gl_FragColor );`,colorspace_pars_fragment:`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,envmap_fragment:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,envmap_common_pars_fragment:`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,envmap_pars_fragment:`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,envmap_pars_vertex:`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,envmap_physical_pars_fragment:`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureCubeUV( envMap, envMapRotation * retroVec, roughness );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_CUBE_UV
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,envmap_vertex:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,fog_vertex:`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,fog_pars_vertex:`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,fog_fragment:`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fog_pars_fragment:`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,gradientmap_pars_fragment:`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,lightmap_pars_fragment:`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,lights_lambert_fragment:`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,lights_lambert_pars_fragment:`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,lights_pars_begin:`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,lights_toon_fragment:`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,lights_toon_pars_fragment:`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,lights_phong_fragment:`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,lights_phong_pars_fragment:`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lights_physical_fragment:`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,lights_physical_pars_fragment:`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lights_fragment_begin:`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,lights_fragment_maps:`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,lights_fragment_end:`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,lightprobes_pars_fragment:`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,logdepthbuf_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,logdepthbuf_pars_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_pars_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,map_fragment:`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,map_pars_fragment:`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,map_particle_fragment:`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,map_particle_pars_fragment:`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,metalnessmap_fragment:`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,metalnessmap_pars_fragment:`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,morphinstance_vertex:`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,morphcolor_vertex:`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,morphnormal_vertex:`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,morphtarget_pars_vertex:`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,morphtarget_vertex:`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,normal_fragment_begin:`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,normal_fragment_maps:`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,normal_pars_fragment:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_pars_vertex:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_vertex:`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,normalmap_pars_fragment:`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,clearcoat_normal_fragment_begin:`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,clearcoat_normal_fragment_maps:`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,clearcoat_pars_fragment:`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iridescence_pars_fragment:`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,opaque_fragment:`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,packing:`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,premultiplied_alpha_fragment:`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,project_vertex:`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,dithering_fragment:`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,dithering_pars_fragment:`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,roughnessmap_fragment:`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,roughnessmap_pars_fragment:`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,shadowmap_pars_fragment:`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,shadowmap_pars_vertex:`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,shadowmap_vertex:`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,shadowmask_pars_fragment:`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,skinbase_vertex:`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,skinning_pars_vertex:`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,skinning_vertex:`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,skinnormal_vertex:`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,specularmap_fragment:`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,specularmap_pars_fragment:`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,tonemapping_fragment:`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tonemapping_pars_fragment:`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,transmission_fragment:`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,transmission_pars_fragment:`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,uv_pars_fragment:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_pars_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,worldpos_vertex:`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,background_vert:`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,background_frag:`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,backgroundCube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,backgroundCube_frag:`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cube_frag:`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,depth_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,depth_frag:`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,distance_vert:`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,distance_frag:`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,equirect_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,equirect_frag:`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,linedashed_vert:`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,linedashed_frag:`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,meshbasic_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,meshbasic_frag:`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshlambert_vert:`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshlambert_frag:`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshmatcap_vert:`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,meshmatcap_frag:`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshnormal_vert:`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,meshnormal_frag:`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,meshphong_vert:`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshphong_frag:`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshphysical_vert:`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,meshphysical_frag:`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshtoon_vert:`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshtoon_frag:`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,points_vert:`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,points_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,shadow_vert:`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,shadow_frag:`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,sprite_vert:`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sprite_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`},J={common:{diffuse:{value:new K(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new G},alphaMap:{value:null},alphaMapTransform:{value:new G},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new G}},envmap:{envMap:{value:null},envMapRotation:{value:new G},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new G}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new G}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new G},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new G},normalScale:{value:new U(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new G},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new G}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new G}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new G}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new K(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new W},probesMax:{value:new W},probesResolution:{value:new W}},points:{diffuse:{value:new K(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new G},alphaTest:{value:0},uvTransform:{value:new G}},sprite:{diffuse:{value:new K(16777215)},opacity:{value:1},center:{value:new U(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new G},alphaMap:{value:null},alphaMapTransform:{value:new G},alphaTest:{value:0}}},po={basic:{uniforms:ra([J.common,J.specularmap,J.envmap,J.aomap,J.lightmap,J.fog]),vertexShader:fo.meshbasic_vert,fragmentShader:fo.meshbasic_frag},lambert:{uniforms:ra([J.common,J.specularmap,J.envmap,J.aomap,J.lightmap,J.emissivemap,J.bumpmap,J.normalmap,J.displacementmap,J.fog,J.lights,{emissive:{value:new K(0)},envMapIntensity:{value:1}}]),vertexShader:fo.meshlambert_vert,fragmentShader:fo.meshlambert_frag},phong:{uniforms:ra([J.common,J.specularmap,J.envmap,J.aomap,J.lightmap,J.emissivemap,J.bumpmap,J.normalmap,J.displacementmap,J.fog,J.lights,{emissive:{value:new K(0)},specular:{value:new K(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:fo.meshphong_vert,fragmentShader:fo.meshphong_frag},standard:{uniforms:ra([J.common,J.envmap,J.aomap,J.lightmap,J.emissivemap,J.bumpmap,J.normalmap,J.displacementmap,J.roughnessmap,J.metalnessmap,J.fog,J.lights,{emissive:{value:new K(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:fo.meshphysical_vert,fragmentShader:fo.meshphysical_frag},toon:{uniforms:ra([J.common,J.aomap,J.lightmap,J.emissivemap,J.bumpmap,J.normalmap,J.displacementmap,J.gradientmap,J.fog,J.lights,{emissive:{value:new K(0)}}]),vertexShader:fo.meshtoon_vert,fragmentShader:fo.meshtoon_frag},matcap:{uniforms:ra([J.common,J.bumpmap,J.normalmap,J.displacementmap,J.fog,{matcap:{value:null}}]),vertexShader:fo.meshmatcap_vert,fragmentShader:fo.meshmatcap_frag},points:{uniforms:ra([J.points,J.fog]),vertexShader:fo.points_vert,fragmentShader:fo.points_frag},dashed:{uniforms:ra([J.common,J.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:fo.linedashed_vert,fragmentShader:fo.linedashed_frag},depth:{uniforms:ra([J.common,J.displacementmap]),vertexShader:fo.depth_vert,fragmentShader:fo.depth_frag},normal:{uniforms:ra([J.common,J.bumpmap,J.normalmap,J.displacementmap,{opacity:{value:1}}]),vertexShader:fo.meshnormal_vert,fragmentShader:fo.meshnormal_frag},sprite:{uniforms:ra([J.sprite,J.fog]),vertexShader:fo.sprite_vert,fragmentShader:fo.sprite_frag},background:{uniforms:{uvTransform:{value:new G},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:fo.background_vert,fragmentShader:fo.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new G}},vertexShader:fo.backgroundCube_vert,fragmentShader:fo.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:fo.cube_vert,fragmentShader:fo.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:fo.equirect_vert,fragmentShader:fo.equirect_frag},distance:{uniforms:ra([J.common,J.displacementmap,{referencePosition:{value:new W},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:fo.distance_vert,fragmentShader:fo.distance_frag},shadow:{uniforms:ra([J.lights,J.fog,{color:{value:new K(0)},opacity:{value:1}}]),vertexShader:fo.shadow_vert,fragmentShader:fo.shadow_frag}};po.physical={uniforms:ra([po.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new G},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new G},clearcoatNormalScale:{value:new U(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new G},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new G},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new G},sheen:{value:0},sheenColor:{value:new K(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new G},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new G},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new G},transmissionSamplerSize:{value:new U},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new G},attenuationDistance:{value:0},attenuationColor:{value:new K(0)},specularColor:{value:new K(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new G},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new G},anisotropyVector:{value:new U},anisotropyMap:{value:null},anisotropyMapTransform:{value:new G}}]),vertexShader:fo.meshphysical_vert,fragmentShader:fo.meshphysical_frag};var mo={r:0,b:0,g:0},ho=new Zt,go=new G;go.set(-1,0,0,0,1,0,0,0,1);function _o(e,t,n,r,i,a){let o=new K(0),s=i===!0?0:1,c,l,u=null,d=0,f=null;function p(e){let n=e.isScene===!0?e.background:null;if(n&&n.isTexture){let r=e.backgroundBlurriness>0;n=t.get(n,r)}return n}function m(t){let r=!1,i=p(t);i===null?g(o,s):i&&i.isColor&&(g(i,1),r=!0);let c=e.xr.getEnvironmentBlendMode();c===`additive`?n.buffers.color.setClear(0,0,0,1,a):c===`alpha-blend`&&n.buffers.color.setClear(0,0,0,0,a),(e.autoClear||r)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function h(t,n){let i=p(n);i&&(i.isCubeTexture||i.mapping===306)?(l===void 0&&(l=new Zr(new vi(1,1,1),new ua({name:`BackgroundCubeMaterial`,uniforms:na(po.backgroundCube.uniforms),vertexShader:po.backgroundCube.vertexShader,fragmentShader:po.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute(`normal`),l.geometry.deleteAttribute(`uv`),l.onBeforeRender=function(e,t,n){this.matrixWorld.copyPosition(n.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(l)),l.material.uniforms.envMap.value=i,l.material.uniforms.backgroundBlurriness.value=n.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(ho.makeRotationFromEuler(n.backgroundRotation)).transpose(),i.isCubeTexture&&i.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(go),l.material.toneMapped=Ft.getTransfer(i.colorSpace)!==ze,(u!==i||d!==i.version||f!==e.toneMapping)&&(l.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),l.layers.enableAll(),t.unshift(l,l.geometry,l.material,0,0,null)):i&&i.isTexture&&(c===void 0&&(c=new Zr(new Qi(2,2),new ua({name:`BackgroundMaterial`,uniforms:na(po.background.uniforms),vertexShader:po.background.vertexShader,fragmentShader:po.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute(`normal`),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=i,c.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,c.material.toneMapped=Ft.getTransfer(i.colorSpace)!==ze,i.matrixAutoUpdate===!0&&i.updateMatrix(),c.material.uniforms.uvTransform.value.copy(i.matrix),(u!==i||d!==i.version||f!==e.toneMapping)&&(c.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),c.layers.enableAll(),t.unshift(c,c.geometry,c.material,0,0,null))}function g(t,r){t.getRGB(mo,oa(e)),n.buffers.color.setClear(mo.r,mo.g,mo.b,r,a)}function _(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return o},setClearColor:function(e,t=1){o.set(e),s=t,g(o,s)},getClearAlpha:function(){return s},setClearAlpha:function(e){s=e,g(o,s)},render:m,addToRenderList:h,dispose:_}}function vo(e,t){let n=e.getParameter(e.MAX_VERTEX_ATTRIBS),r={},i=f(null),a=i,o=!1;function s(n,r,i,s,c){let u=!1,f=d(n,s,i,r);a!==f&&(a=f,l(a.object)),u=p(n,s,i,c),u&&m(n,s,i,c),c!==null&&t.update(c,e.ELEMENT_ARRAY_BUFFER),(u||o)&&(o=!1,b(n,r,i,s),c!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(c).buffer))}function c(){return e.createVertexArray()}function l(t){return e.bindVertexArray(t)}function u(t){return e.deleteVertexArray(t)}function d(e,t,n,i){let a=i.wireframe===!0,o=r[t.id];o===void 0&&(o={},r[t.id]=o);let s=e.isInstancedMesh===!0?e.id:0,l=o[s];l===void 0&&(l={},o[s]=l);let u=l[n.id];u===void 0&&(u={},l[n.id]=u);let d=u[a];return d===void 0&&(d=f(c()),u[a]=d),d}function f(e){let t=[],r=[],i=[];for(let e=0;e<n;e++)t[e]=0,r[e]=0,i[e]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:t,enabledAttributes:r,attributeDivisors:i,object:e,attributes:{},index:null}}function p(e,t,n,r){let i=a.attributes,o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=i[t],r=o[t];if(r===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(r=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(r=e.instanceColor)),n===void 0||n.attribute!==r||r&&n.data!==r.data)return!0;s++}return a.attributesNum!==s||a.index!==r}function m(e,t,n,r){let i={},o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=o[t];n===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(n=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(n=e.instanceColor));let r={};r.attribute=n,n&&n.data&&(r.data=n.data),i[t]=r,s++}a.attributes=i,a.attributesNum=s,a.index=r}function h(){let e=a.newAttributes;for(let t=0,n=e.length;t<n;t++)e[t]=0}function g(e){_(e,0)}function _(t,n){let r=a.newAttributes,i=a.enabledAttributes,o=a.attributeDivisors;r[t]=1,i[t]===0&&(e.enableVertexAttribArray(t),i[t]=1),o[t]!==n&&(e.vertexAttribDivisor(t,n),o[t]=n)}function v(){let t=a.newAttributes,n=a.enabledAttributes;for(let r=0,i=n.length;r<i;r++)n[r]!==t[r]&&(e.disableVertexAttribArray(r),n[r]=0)}function y(t,n,r,i,a,o,s){s===!0?e.vertexAttribIPointer(t,n,r,a,o):e.vertexAttribPointer(t,n,r,i,a,o)}function b(n,r,i,a){h();let o=a.attributes,s=i.getAttributes(),c=r.defaultAttributeValues;for(let r in s){let i=s[r];if(i.location>=0){let s=o[r];if(s===void 0&&(r===`instanceMatrix`&&n.instanceMatrix&&(s=n.instanceMatrix),r===`instanceColor`&&n.instanceColor&&(s=n.instanceColor)),s!==void 0){let r=s.normalized,o=s.itemSize,c=t.get(s);if(c===void 0)continue;let l=c.buffer,u=c.type,d=c.bytesPerElement,f=u===e.INT||u===e.UNSIGNED_INT||s.gpuType===1013;if(s.isInterleavedBufferAttribute){let t=s.data,c=t.stride,p=s.offset;if(t.isInstancedInterleavedBuffer){for(let e=0;e<i.locationSize;e++)_(i.location+e,t.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=t.meshPerAttribute*t.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,c*d,(p+o/i.locationSize*e)*d,f)}else{if(s.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,s.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=s.meshPerAttribute*s.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,o*d,o/i.locationSize*e*d,f)}}else if(c!==void 0){let t=c[r];if(t!==void 0)switch(t.length){case 2:e.vertexAttrib2fv(i.location,t);break;case 3:e.vertexAttrib3fv(i.location,t);break;case 4:e.vertexAttrib4fv(i.location,t);break;default:e.vertexAttrib1fv(i.location,t)}}}}v()}function x(){T();for(let e in r){let t=r[e];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e]}}function S(e){if(r[e.id]===void 0)return;let t=r[e.id];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e.id]}function C(e){for(let t in r){let n=r[t];for(let t in n){let r=n[t];if(r[e.id]===void 0)continue;let i=r[e.id];for(let e in i)u(i[e].object),delete i[e];delete r[e.id]}}}function w(e){for(let t in r){let n=r[t],i=e.isInstancedMesh===!0?e.id:0,a=n[i];if(a!==void 0){for(let e in a){let t=a[e];for(let e in t)u(t[e].object),delete t[e];delete a[e]}delete n[i],Object.keys(n).length===0&&delete r[t]}}}function T(){E(),o=!0,a!==i&&(a=i,l(a.object))}function E(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:s,reset:T,resetDefaultState:E,dispose:x,releaseStatesOfGeometry:S,releaseStatesOfObject:w,releaseStatesOfProgram:C,initAttributes:h,enableAttribute:g,disableUnusedAttributes:v}}function yo(e,t,n){let r;function i(e){r=e}function a(t,i){e.drawArrays(r,t,i),n.update(i,r,1)}function o(t,i,a){a!==0&&(e.drawArraysInstanced(r,t,i,a),n.update(i,r,a))}function s(e,i,a){if(a===0)return;t.get(`WEBGL_multi_draw`).multiDrawArraysWEBGL(r,e,0,i,0,a);let o=0;for(let e=0;e<a;e++)o+=i[e];n.update(o,r,1)}this.setMode=i,this.render=a,this.renderInstances=o,this.renderMultiDraw=s}function bo(e,t,n,r){let i;function a(){if(i!==void 0)return i;if(t.has(`EXT_texture_filter_anisotropic`)===!0){let n=t.get(`EXT_texture_filter_anisotropic`);i=e.getParameter(n.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(t){return t===1023||r.convert(t)===e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT)}function s(n){let i=n===1016&&(t.has(`EXT_color_buffer_half_float`)||t.has(`EXT_color_buffer_float`));return!(n!==1009&&n!==1015&&!i&&r.convert(n)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE))}function c(t){if(t===`highp`){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return`highp`;t=`mediump`}return t===`mediump`&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?`mediump`:`lowp`}let l=n.precision===void 0?`highp`:n.precision,u=c(l);u!==l&&(B(`WebGLRenderer:`,l,`not supported, using`,u,`instead.`),l=u);let d=n.logarithmicDepthBuffer===!0,f=n.reversedDepthBuffer===!0&&t.has(`EXT_clip_control`);n.reversedDepthBuffer===!0&&f===!1&&B(`WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.`);let p=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),m=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),h=e.getParameter(e.MAX_TEXTURE_SIZE),g=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),_=e.getParameter(e.MAX_VERTEX_ATTRIBS),v=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),y=e.getParameter(e.MAX_VARYING_VECTORS),b=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),x=e.getParameter(e.MAX_SAMPLES),S=e.getParameter(e.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:s,precision:l,logarithmicDepthBuffer:d,reversedDepthBuffer:f,maxTextures:p,maxVertexTextures:m,maxTextureSize:h,maxCubemapSize:g,maxAttributes:_,maxVertexUniforms:v,maxVaryings:y,maxFragmentUniforms:b,maxSamples:x,samples:S}}function xo(e){let t=this,n=null,r=0,i=!1,a=!1,o=new jr,s=new G,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(e,t){let n=e.length!==0||t||r!==0||i;return i=t,r=e.length,n},this.beginShadows=function(){a=!0,u(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(e,t){n=u(e,t,0)},this.setState=function(t,o,s){let d=t.clippingPlanes,f=t.clipIntersection,p=t.clipShadows,m=e.get(t);if(!i||d===null||d.length===0||a&&!p)a?u(null):l();else{let e=a?0:r,t=e*4,i=m.clippingState||null;c.value=i,i=u(d,o,t,s);for(let e=0;e!==t;++e)i[e]=n[e];m.clippingState=i,this.numIntersection=f?this.numPlanes:0,this.numPlanes+=e}};function l(){c.value!==n&&(c.value=n,c.needsUpdate=r>0),t.numPlanes=r,t.numIntersection=0}function u(e,n,r,i){let a=e===null?0:e.length,l=null;if(a!==0){if(l=c.value,i!==!0||l===null){let t=r+a*4,i=n.matrixWorldInverse;s.getNormalMatrix(i),(l===null||l.length<t)&&(l=new Float32Array(t));for(let t=0,n=r;t!==a;++t,n+=4)o.copy(e[t]).applyMatrix4(i,s),o.normal.toArray(l,n),l[n+3]=o.constant}c.value=l,c.needsUpdate=!0}return t.numPlanes=a,t.numIntersection=0,l}}var So=4,Co=6,wo=20,To=256,Eo=new Va,Do=new K,Oo=null,ko=0,Ao=0,jo=!1,Mo=new W,No=new W,Po=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,r=100,i={}){let{size:a=256,position:o=Mo}=i;Oo=this._renderer.getRenderTarget(),ko=this._renderer.getActiveCubeFace(),Ao=this._renderer.getActiveMipmapLevel(),jo=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(e,n,r,s,o),t>0&&this._blur(s,0,0,t),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Vo(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Bo(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=2**this._lodMax}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Oo,ko,Ao),this._renderer.xr.enabled=jo,e.scissorTest=!1,Lo(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Oo=this._renderer.getRenderTarget(),ko=this._renderer.getActiveCubeFace(),Ao=this._renderer.getActiveMipmapLevel(),jo=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:o,minFilter:o,generateMipmaps:!1,type:g,format:w,colorSpace:Le,depthBuffer:!1},r=Io(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Io(e,t,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods}=Fo(r)),this._blurMaterial=zo(r,e,t),this._ggxMaterial=Ro(r,e,t)}return r}_compileMaterial(e){let t=new Zr(new Dr,e);this._renderer.compile(t,Eo)}_sceneToCubeUV(e,t,n,r,i){let a=new Ba(90,1,t,n),o=[1,-1,1,1,1,1],s=[1,1,1,-1,-1,-1],c=this._renderer,l=c.autoClear,u=c.toneMapping;c.getClearColor(Do),c.toneMapping=0,c.autoClear=!1,c.state.buffers.depth.getReversed()&&(c.setRenderTarget(r),c.clearDepth(),c.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Zr(new vi,new zr({name:`PMREM.Background`,side:1,depthWrite:!1,depthTest:!1})));let d=this._backgroundBox,f=d.material,p=!1,m=e.background;m?m.isColor&&(f.color.copy(m),e.background=null,p=!0):(f.color.copy(Do),p=!0);for(let t=0;t<6;t++){let n=t%3;n===0?(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x+s[t],i.y,i.z)):n===1?(a.up.set(0,0,o[t]),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y+s[t],i.z)):(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y,i.z+s[t]));let l=this._cubeSize;Lo(r,n*l,t>2?l:0,l,l),c.setRenderTarget(r),p&&c.render(d,a),c.render(e,a)}c.toneMapping=u,c.autoClear=l,e.background=m}_textureToCubeUV(e,t){let n=this._renderer,r=e.mapping===301||e.mapping===302;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=Vo()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Bo());let i=r?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=i;let o=i.uniforms;o.envMap.value=e;let s=this._cubeSize;Lo(t,0,0,3*s,2*s),n.setRenderTarget(t),n.render(a,Eo)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let r=this._lodMeshes.length;for(let t=1;t<r;t++)this._applyGGXFilter(e,t-1,t);t.autoClear=n}_applyGGXFilter(e,t,n){let r=this._renderer,i=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;let s=a.uniforms,c=n/(this._lodMeshes.length-1),l=t/(this._lodMeshes.length-1),u=Math.sqrt(c*c-l*l)*(c*1.25),{_lodMax:d}=this,f=this._sizeLods[n],p=3*f*(n>d-So?n-d+So:0),m=4*(this._cubeSize-f);s.envMap.value=e.texture,s.roughness.value=u,s.mipInt.value=d-t,Lo(i,p,m,3*f,2*f),r.setRenderTarget(i),r.render(o,Eo),s.envMap.value=i.texture,s.roughness.value=0,s.mipInt.value=d-n,Lo(e,p,m,3*f,2*f),r.setRenderTarget(e),r.render(o,Eo)}_blur(e,t,n,r){let i=this._pingPongRenderTarget,a=Math.min(r,Math.PI)/Math.SQRT2;this._blurPass(e,i,t,n,a),this._blurPass(i,e,n,n,a)}_blurPass(e,t,n,r,i){let a=this._renderer,o=this._blurMaterial,s=this._lodMeshes[r];s.material=o;let c=o.uniforms;c.envMap.value=e.texture,c.sigma.value=i,c.mipInt.value=this._lodMax-n;let l=this._sizeLods[r];Lo(t,3*l*(r>this._lodMax-So?r-this._lodMax+So:0),4*(this._cubeSize-l),3*l,2*l),a.setRenderTarget(t),a.render(s,Eo)}};function Fo(e){let t=[],n=[],r=e,i=e-So+1+Co;for(let e=0;e<i;e++){let e=2**r;t.push(e);let i=1/(e-2),a=-i,o=1+i,s=[a,a,o,a,o,o,a,a,o,o,a,o],c=new Float32Array(108),l=new Float32Array(108);for(let e=0;e<6;e++){let t=e%3*2/3-1,n=e>2?0:-1,r=[t,n,0,t+2/3,n,0,t+2/3,n+1,0,t,n,0,t+2/3,n+1,0,t,n+1,0];c.set(r,18*e);for(let t=0;t<6;t++){let n=s[t*2]*2-1,r=s[t*2+1]*2-1;e===0?No.set(1,r,n):e===1?No.set(-n,1,-r):e===2?No.set(-n,r,1):e===3?No.set(-1,r,-n):e===4?No.set(-n,-1,r):No.set(n,r,-1),No.toArray(l,(e*6+t)*3)}}let u=new Dr;u.setAttribute(`position`,new pr(c,3)),u.setAttribute(`outputDirection`,new pr(l,3)),n.push(new Zr(u,null)),r>So&&r--}return{lodMeshes:n,sizeLods:t}}function Io(e,t,n){let r=new Jt(e,t,n);return r.texture.mapping=306,r.texture.name=`PMREM.cubeUv`,r.scissorTest=!0,r}function Lo(e,t,n,r,i){e.viewport.set(t,n,r,i),e.scissor.set(t,n,r,i)}function Ro(e,t,n){return new ua({name:`PMREMGGXConvolution`,defines:{GGX_SAMPLES:To,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Ho(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function zo(e,t,n){return new ua({name:`SphericalGaussianBlur`,defines:{SAMPLES:wo,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},sigma:{value:0},mipInt:{value:0}},vertexShader:Ho(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float sigma;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359
			#define GOLDEN_ANGLE 2.39996322973

			void main() {

				if ( sigma == 0.0 ) {

					gl_FragColor = vec4( bilinearCubeUV( envMap, vOutputDirection, mipInt ), 1.0 );
					return;

				}

				vec3 outputDirection = normalize( vOutputDirection );

				vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
				vec3 tangent = normalize( cross( up, outputDirection ) );
				vec3 bitangent = cross( outputDirection, tangent );

				// Truncate the kernel at three standard deviations or at the antipode.
				float thetaMax = min( 3.0 * sigma, PI );
				float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

				vec3 accumColor = vec3( 0.0 );
				float accumWeight = 0.0;

				for ( int i = 0; i < SAMPLES; i ++ ) {

					// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
					float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
					float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
					float phi = float( i ) * GOLDEN_ANGLE;

					vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
					vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

					// Correct the planar sample density to solid angle.
					float weight = sin( theta ) / theta;

					accumColor += weight * bilinearCubeUV( envMap, sampleDirection, mipInt );
					accumWeight += weight;

				}

				gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Bo(){return new ua({name:`EquirectangularToCubeUV`,uniforms:{envMap:{value:null}},vertexShader:Ho(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Vo(){return new ua({name:`CubemapToCubeUV`,uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Ho(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Ho(){return`

		precision mediump float;
		precision mediump int;

		attribute vec3 outputDirection;

		varying vec3 vOutputDirection;

		void main() {

			vOutputDirection = outputDirection;
			gl_Position = vec4( position, 1.0 );

		}
	`}var Uo=class extends Jt{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new mi(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new vi(5,5,5),i=new ua({name:`CubemapFromEquirect`,uniforms:na(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:1,blending:0});i.uniforms.tEquirect.value=t;let a=new Zr(r,i),s=t.minFilter;return t.minFilter===1008&&(t.minFilter=o),new Ga(1,10,this).update(e,a),t.minFilter=s,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){let i=e.getRenderTarget();for(let i=0;i<6;i++)e.setRenderTarget(this,i),e.clear(t,n,r);e.setRenderTarget(i)}};function Wo(e){let t=new WeakMap,n=new WeakMap,r=null;function i(e,t=!1){return e==null?null:t?o(e):a(e)}function a(n){if(n&&n.isTexture){let r=n.mapping;if(r===303||r===304){if(t.has(n)){let e=t.get(n).texture;return s(e,n.mapping)}{let r=n.image;if(r&&r.height>0){let i=new Uo(r.height);return i.fromEquirectangularTexture(e,n),t.set(n,i),n.addEventListener(`dispose`,l),s(i.texture,n.mapping)}return null}}}return n}function o(t){if(t&&t.isTexture){let i=t.mapping,a=i===303||i===304,o=i===301||i===302;if(a||o){let i=n.get(t),s=i===void 0?0:i.texture.pmremVersion;if(t.isRenderTargetTexture&&t.pmremVersion!==s)return r===null&&(r=new Po(e)),i=a?r.fromEquirectangular(t,i):r.fromCubemap(t,i),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),i.texture;if(i!==void 0)return i.texture;{let s=t.image;return a&&s&&s.height>0||o&&s&&c(s)?(r===null&&(r=new Po(e)),i=a?r.fromEquirectangular(t):r.fromCubemap(t),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),t.addEventListener(`dispose`,u),i.texture):null}}}return t}function s(e,t){return t===303?e.mapping=301:t===304&&(e.mapping=302),e}function c(e){let t=0;for(let n=0;n<6;n++)e[n]!==void 0&&t++;return t===6}function l(e){let n=e.target;n.removeEventListener(`dispose`,l);let r=t.get(n);r!==void 0&&(t.delete(n),r.dispose())}function u(e){let t=e.target;t.removeEventListener(`dispose`,u);let r=n.get(t);r!==void 0&&(n.delete(t),r.dispose())}function d(){t=new WeakMap,n=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:i,dispose:d}}function Go(e){let t={};function n(n){if(t[n]!==void 0)return t[n];let r=e.getExtension(n);return t[n]=r,r}return{has:function(e){return n(e)!==null},init:function(){n(`EXT_color_buffer_float`),n(`WEBGL_clip_cull_distance`),n(`OES_texture_float_linear`),n(`EXT_color_buffer_half_float`),n(`WEBGL_multisampled_render_to_texture`),n(`WEBGL_render_shared_exponent`)},get:function(e){let t=n(e);return t===null&&Qe(`WebGLRenderer: `+e+` extension not supported.`),t}}}function Ko(e,t,n,r){let i={},a=new WeakMap;function o(e){let s=e.target;s.index!==null&&t.remove(s.index);for(let e in s.attributes)t.remove(s.attributes[e]);s.removeEventListener(`dispose`,o),delete i[s.id];let c=a.get(s);c&&(t.remove(c),a.delete(s)),r.releaseStatesOfGeometry(s),s.isInstancedBufferGeometry===!0&&delete s._maxInstanceCount,n.memory.geometries--}function s(e,t){return i[t.id]===!0?t:(t.addEventListener(`dispose`,o),i[t.id]=!0,n.memory.geometries++,t)}function c(n){let r=n.attributes;for(let n in r)t.update(r[n],e.ARRAY_BUFFER)}function l(e){let n=[],r=e.index,i=e.attributes.position,o=0;if(i===void 0)return;if(r!==null){let e=r.array;o=r.version;for(let t=0,r=e.length;t<r;t+=3){let r=e[t+0],i=e[t+1],a=e[t+2];n.push(r,i,i,a,a,r)}}else{let e=i.array;o=i.version;for(let t=0,r=e.length/3-1;t<r;t+=3){let e=t+0,r=t+1,i=t+2;n.push(e,r,r,i,i,e)}}let s=new(i.count>=65535?hr:mr)(n,1);s.version=o;let c=a.get(e);c&&t.remove(c),a.set(e,s)}function u(e){let t=a.get(e);if(t){let n=e.index;n!==null&&t.version<n.version&&l(e)}else l(e);return a.get(e)}return{get:s,update:c,getWireframeAttribute:u}}function qo(e,t,n){let r;function i(e){r=e}let a,o;function s(e){a=e.type,o=e.bytesPerElement}function c(t,i){e.drawElements(r,i,a,t*o),n.update(i,r,1)}function l(t,i,s){s!==0&&(e.drawElementsInstanced(r,i,a,t*o,s),n.update(i,r,s))}function u(e,i,o){if(o===0)return;t.get(`WEBGL_multi_draw`).multiDrawElementsWEBGL(r,i,0,a,e,0,o);let s=0;for(let e=0;e<o;e++)s+=i[e];n.update(s,r,1)}this.setMode=i,this.setIndex=s,this.render=c,this.renderInstances=l,this.renderMultiDraw=u}function Jo(e){let t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function r(t,r,i){switch(n.calls++,r){case e.TRIANGLES:n.triangles+=t/3*i;break;case e.LINES:n.lines+=t/2*i;break;case e.LINE_STRIP:n.lines+=i*(t-1);break;case e.LINE_LOOP:n.lines+=i*t;break;case e.POINTS:n.points+=i*t;break;default:V(`WebGLInfo: Unknown draw mode:`,r)}}function i(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:i,update:r}}function Yo(e,t,n){let r=new WeakMap,i=new Kt;function a(a,o,s){let c=a.morphTargetInfluences,l=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=l===void 0?0:l.length,d=r.get(o);if(d===void 0||d.count!==u){d!==void 0&&d.texture.dispose();let e=o.morphAttributes.position!==void 0,n=o.morphAttributes.normal!==void 0,a=o.morphAttributes.color!==void 0,s=o.morphAttributes.position||[],c=o.morphAttributes.normal||[],l=o.morphAttributes.color||[],f=0;e===!0&&(f=1),n===!0&&(f=2),a===!0&&(f=3);let p=o.attributes.position.count*f,m=1;p>t.maxTextureSize&&(m=Math.ceil(p/t.maxTextureSize),p=t.maxTextureSize);let g=new Float32Array(p*m*4*u),_=new Yt(g,p,m,u);_.type=h,_.needsUpdate=!0;let v=f*4;for(let t=0;t<u;t++){let r=s[t],o=c[t],u=l[t],d=p*m*4*t;for(let t=0;t<r.count;t++){let s=t*v;e===!0&&(i.fromBufferAttribute(r,t),g[d+s+0]=i.x,g[d+s+1]=i.y,g[d+s+2]=i.z,g[d+s+3]=0),n===!0&&(i.fromBufferAttribute(o,t),g[d+s+4]=i.x,g[d+s+5]=i.y,g[d+s+6]=i.z,g[d+s+7]=0),a===!0&&(i.fromBufferAttribute(u,t),g[d+s+8]=i.x,g[d+s+9]=i.y,g[d+s+10]=i.z,g[d+s+11]=u.itemSize===4?i.w:1)}}d={count:u,texture:_,size:new U(p,m)},r.set(o,d);function y(){_.dispose(),r.delete(o),o.removeEventListener(`dispose`,y)}o.addEventListener(`dispose`,y)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)s.getUniforms().setValue(e,`morphTexture`,a.morphTexture,n);else{let t=0;for(let e=0;e<c.length;e++)t+=c[e];let n=o.morphTargetsRelative?1:1-t;s.getUniforms().setValue(e,`morphTargetBaseInfluence`,n),s.getUniforms().setValue(e,`morphTargetInfluences`,c)}s.getUniforms().setValue(e,`morphTargetsTexture`,d.texture,n),s.getUniforms().setValue(e,`morphTargetsTextureSize`,d.size)}return{update:a}}function Xo(e,t,n,r,i){let a=new WeakMap;function o(r){let o=i.render.frame,s=r.geometry,l=t.get(r,s);if(a.get(l)!==o&&(t.update(l),a.set(l,o)),r.isInstancedMesh&&(r.hasEventListener(`dispose`,c)===!1&&r.addEventListener(`dispose`,c),a.get(r)!==o&&(n.update(r.instanceMatrix,e.ARRAY_BUFFER),r.instanceColor!==null&&n.update(r.instanceColor,e.ARRAY_BUFFER),a.set(r,o))),r.isSkinnedMesh){let e=r.skeleton;a.get(e)!==o&&(e.update(),a.set(e,o))}return l}function s(){a=new WeakMap}function c(e){let t=e.target;t.removeEventListener(`dispose`,c),r.releaseStatesOfObject(t),n.remove(t.instanceMatrix),t.instanceColor!==null&&n.remove(t.instanceColor)}return{update:o,dispose:s}}var Zo={1:`LINEAR_TONE_MAPPING`,2:`REINHARD_TONE_MAPPING`,3:`CINEON_TONE_MAPPING`,4:`ACES_FILMIC_TONE_MAPPING`,6:`AGX_TONE_MAPPING`,7:`NEUTRAL_TONE_MAPPING`,5:`CUSTOM_TONE_MAPPING`};function Qo(e,t,n,r,i,a){let o=new Jt(t,n,{type:e,depthBuffer:i,stencilBuffer:a,samples:r?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),s=null,c=null,l=new Dr;l.setAttribute(`position`,new q([-1,3,0,-1,-1,0,3,-1,0],3)),l.setAttribute(`uv`,new q([0,2,0,0,2,0],2));let u=new da({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),d=new Zr(l,u),f=new Va(-1,1,1,-1,0,1),p=null,m=null,h=!1,_,v=null,y=[],b=!1;this.setSize=function(e,t){o.setSize(e,t),s!==null&&s.setSize(e,t),c!==null&&c.setSize(e,t);for(let n=0;n<y.length;n++){let r=y[n];r.setSize&&r.setSize(e,t)}},this.setEffects=function(e){y=e,b=y.length>0&&y[0].isRenderPass===!0;let t=o.width,n=o.height;y.length>0&&s===null&&(s=new Jt(t,n,{type:g,depthBuffer:!1,stencilBuffer:!1}),c=new Jt(t,n,{type:g,depthBuffer:!1,stencilBuffer:!1}));for(let e=0;e<y.length;e++){let r=y[e];r.setSize&&r.setSize(t,n)}},this.begin=function(e,t){if(h||e.toneMapping===0&&y.length===0)return!1;if(v=t,t!==null){let e=t.width,n=t.height;(o.width!==e||o.height!==n)&&this.setSize(e,n)}return b===!1&&e.setRenderTarget(o),_=e.toneMapping,e.toneMapping=0,!0},this.hasRenderPass=function(){return b},this.end=function(e,t){e.toneMapping=_,h=!0;let n=o,r=s;for(let i=0;i<y.length;i++){let a=y[i];a.enabled!==!1&&(a.render(e,r,n,t),a.needsSwap!==!1&&(n=r,r=r===s?c:s))}if(p!==e.outputColorSpace||m!==e.toneMapping){p=e.outputColorSpace,m=e.toneMapping,u.defines={},Ft.getTransfer(p)===`srgb`&&(u.defines.SRGB_TRANSFER=``);let t=Zo[m];t&&(u.defines[t]=``),u.needsUpdate=!0}u.uniforms.tDiffuse.value=n.texture,e.setRenderTarget(v),e.render(d,f),v=null,h=!1},this.isCompositing=function(){return h},this.dispose=function(){o.dispose(),s!==null&&s.dispose(),c!==null&&c.dispose(),l.dispose(),u.dispose()}}var $o=new Gt,es=new hi(1,1),ts=new Yt,ns=new Xt,rs=new mi,is=[],as=[],os=new Float32Array(16),ss=new Float32Array(9),cs=new Float32Array(4);function ls(e,t,n){let r=e[0];if(r<=0||r>0)return e;let i=t*n,a=is[i];if(a===void 0&&(a=new Float32Array(i),is[i]=a),t!==0){r.toArray(a,0);for(let r=1,i=0;r!==t;++r)i+=n,e[r].toArray(a,i)}return a}function us(e,t){if(e.length!==t.length)return!1;for(let n=0,r=e.length;n<r;n++)if(e[n]!==t[n])return!1;return!0}function ds(e,t){for(let n=0,r=t.length;n<r;n++)e[n]=t[n]}function fs(e,t){let n=as[t];n===void 0&&(n=new Int32Array(t),as[t]=n);for(let r=0;r!==t;++r)n[r]=e.allocateTextureUnit();return n}function ps(e,t){let n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function ms(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(us(n,t))return;e.uniform2fv(this.addr,t),ds(n,t)}}function hs(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(us(n,t))return;e.uniform3fv(this.addr,t),ds(n,t)}}function gs(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(us(n,t))return;e.uniform4fv(this.addr,t),ds(n,t)}}function _s(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(us(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),ds(n,t)}else{if(us(n,r))return;cs.set(r),e.uniformMatrix2fv(this.addr,!1,cs),ds(n,r)}}function vs(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(us(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),ds(n,t)}else{if(us(n,r))return;ss.set(r),e.uniformMatrix3fv(this.addr,!1,ss),ds(n,r)}}function ys(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(us(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),ds(n,t)}else{if(us(n,r))return;os.set(r),e.uniformMatrix4fv(this.addr,!1,os),ds(n,r)}}function bs(e,t){let n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function xs(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(us(n,t))return;e.uniform2iv(this.addr,t),ds(n,t)}}function Ss(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(us(n,t))return;e.uniform3iv(this.addr,t),ds(n,t)}}function Cs(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(us(n,t))return;e.uniform4iv(this.addr,t),ds(n,t)}}function ws(e,t){let n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function Ts(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(us(n,t))return;e.uniform2uiv(this.addr,t),ds(n,t)}}function Es(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(us(n,t))return;e.uniform3uiv(this.addr,t),ds(n,t)}}function Ds(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(us(n,t))return;e.uniform4uiv(this.addr,t),ds(n,t)}}function Os(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;this.type===e.SAMPLER_2D_SHADOW?(es.compareFunction=n.isReversedDepthBuffer()?518:515,a=es):a=$o,n.setTexture2D(t||a,i)}function ks(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture3D(t||ns,i)}function As(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTextureCube(t||rs,i)}function js(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture2DArray(t||ts,i)}function Ms(e){switch(e){case 5126:return ps;case 35664:return ms;case 35665:return hs;case 35666:return gs;case 35674:return _s;case 35675:return vs;case 35676:return ys;case 5124:case 35670:return bs;case 35667:case 35671:return xs;case 35668:case 35672:return Ss;case 35669:case 35673:return Cs;case 5125:return ws;case 36294:return Ts;case 36295:return Es;case 36296:return Ds;case 35678:case 36198:case 36298:case 36306:case 35682:return Os;case 35679:case 36299:case 36307:return ks;case 35680:case 36300:case 36308:case 36293:return As;case 36289:case 36303:case 36311:case 36292:return js}}function Ns(e,t){e.uniform1fv(this.addr,t)}function Ps(e,t){let n=ls(t,this.size,2);e.uniform2fv(this.addr,n)}function Fs(e,t){let n=ls(t,this.size,3);e.uniform3fv(this.addr,n)}function Is(e,t){let n=ls(t,this.size,4);e.uniform4fv(this.addr,n)}function Ls(e,t){let n=ls(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function Rs(e,t){let n=ls(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function zs(e,t){let n=ls(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function Bs(e,t){e.uniform1iv(this.addr,t)}function Vs(e,t){e.uniform2iv(this.addr,t)}function Hs(e,t){e.uniform3iv(this.addr,t)}function Us(e,t){e.uniform4iv(this.addr,t)}function Ws(e,t){e.uniform1uiv(this.addr,t)}function Gs(e,t){e.uniform2uiv(this.addr,t)}function Ks(e,t){e.uniform3uiv(this.addr,t)}function qs(e,t){e.uniform4uiv(this.addr,t)}function Js(e,t,n){let r=this.cache,i=t.length,a=fs(n,i);us(r,a)||(e.uniform1iv(this.addr,a),ds(r,a));let o;o=this.type===e.SAMPLER_2D_SHADOW?es:$o;for(let e=0;e!==i;++e)n.setTexture2D(t[e]||o,a[e])}function Ys(e,t,n){let r=this.cache,i=t.length,a=fs(n,i);us(r,a)||(e.uniform1iv(this.addr,a),ds(r,a));for(let e=0;e!==i;++e)n.setTexture3D(t[e]||ns,a[e])}function Xs(e,t,n){let r=this.cache,i=t.length,a=fs(n,i);us(r,a)||(e.uniform1iv(this.addr,a),ds(r,a));for(let e=0;e!==i;++e)n.setTextureCube(t[e]||rs,a[e])}function Zs(e,t,n){let r=this.cache,i=t.length,a=fs(n,i);us(r,a)||(e.uniform1iv(this.addr,a),ds(r,a));for(let e=0;e!==i;++e)n.setTexture2DArray(t[e]||ts,a[e])}function Qs(e){switch(e){case 5126:return Ns;case 35664:return Ps;case 35665:return Fs;case 35666:return Is;case 35674:return Ls;case 35675:return Rs;case 35676:return zs;case 5124:case 35670:return Bs;case 35667:case 35671:return Vs;case 35668:case 35672:return Hs;case 35669:case 35673:return Us;case 5125:return Ws;case 36294:return Gs;case 36295:return Ks;case 36296:return qs;case 35678:case 36198:case 36298:case 36306:case 35682:return Js;case 35679:case 36299:case 36307:return Ys;case 35680:case 36300:case 36308:case 36293:return Xs;case 36289:case 36303:case 36311:case 36292:return Zs}}var $s=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Ms(t.type)}},ec=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Qs(t.type)}},tc=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let r=this.seq;for(let i=0,a=r.length;i!==a;++i){let a=r[i];a.setValue(e,t[a.id],n)}}},nc=/(\w+)(\])?(\[|\.)?/g;function rc(e,t){e.seq.push(t),e.map[t.id]=t}function ic(e,t,n){let r=e.name,i=r.length;for(nc.lastIndex=0;;){let a=nc.exec(r),o=nc.lastIndex,s=a[1],c=a[2]===`]`,l=a[3];if(c&&(s|=0),l===void 0||l===`[`&&o+2===i){rc(n,l===void 0?new $s(s,e,t):new ec(s,e,t));break}{let e=n.map[s];e===void 0&&(e=new tc(s),rc(n,e)),n=e}}}var ac=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){let n=e.getActiveUniform(t,r);ic(n,e.getUniformLocation(t,n.name),this)}let r=[],i=[];for(let t of this.seq)t.type===e.SAMPLER_2D_SHADOW||t.type===e.SAMPLER_CUBE_SHADOW||t.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(t):i.push(t);r.length>0&&(this.seq=r.concat(i))}setValue(e,t,n,r){let i=this.map[t];i!==void 0&&i.setValue(e,n,r)}setOptional(e,t,n){let r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let i=0,a=t.length;i!==a;++i){let a=t[i],o=n[a.id];o.needsUpdate!==!1&&a.setValue(e,o.value,r)}}static seqWithValue(e,t){let n=[];for(let r=0,i=e.length;r!==i;++r){let i=e[r];i.id in t&&n.push(i)}return n}};function oc(e,t,n){let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),r}var sc=37297,cc=0;function lc(e,t){let n=e.split(`
`),r=[],i=Math.max(t-6,0),a=Math.min(t+6,n.length);for(let e=i;e<a;e++){let i=e+1;r.push(`${i===t?`>`:` `} ${i}: ${n[e]}`)}return r.join(`
`)}var uc=new G;function dc(e){Ft._getMatrix(uc,Ft.workingColorSpace,e);let t=`mat3( ${uc.elements.map(e=>e.toFixed(4))} )`;switch(Ft.getTransfer(e)){case Re:return[t,`LinearTransferOETF`];case ze:return[t,`sRGBTransferOETF`];default:return B(`WebGLProgram: Unsupported color space: `,e),[t,`LinearTransferOETF`]}}function fc(e,t,n){let r=e.getShaderParameter(t,e.COMPILE_STATUS),i=(e.getShaderInfoLog(t)||``).trim();if(r&&i===``)return``;let a=/ERROR: 0:(\d+)/.exec(i);if(a){let r=parseInt(a[1]);return n.toUpperCase()+`

`+i+`

`+lc(e.getShaderSource(t),r)}return i}function pc(e,t){let n=dc(t);return[`vec4 ${e}( vec4 value ) {`,`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,`}`].join(`
`)}var mc={1:`Linear`,2:`Reinhard`,3:`Cineon`,4:`ACESFilmic`,6:`AgX`,7:`Neutral`,5:`Custom`};function hc(e,t){let n=mc[t];return n===void 0?(B(`WebGLProgram: Unsupported toneMapping:`,t),`vec3 `+e+`( vec3 color ) { return LinearToneMapping( color ); }`):`vec3 `+e+`( vec3 color ) { return `+n+`ToneMapping( color ); }`}var gc=new W;function _c(){return Ft.getLuminanceCoefficients(gc),[`float luminance( const in vec3 rgb ) {`,`	const vec3 weights = vec3( ${gc.x.toFixed(4)}, ${gc.y.toFixed(4)}, ${gc.z.toFixed(4)} );`,`	return dot( weights, rgb );`,`}`].join(`
`)}function vc(e){return[e.extensionClipCullDistance?`#extension GL_ANGLE_clip_cull_distance : require`:``,e.extensionMultiDraw?`#extension GL_ANGLE_multi_draw : require`:``].filter(xc).join(`
`)}function yc(e){let t=[];for(let n in e){let r=e[n];r!==!1&&t.push(`#define `+n+` `+r)}return t.join(`
`)}function bc(e,t){let n={},r=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let i=0;i<r;i++){let r=e.getActiveAttrib(t,i),a=r.name,o=1;r.type===e.FLOAT_MAT2&&(o=2),r.type===e.FLOAT_MAT3&&(o=3),r.type===e.FLOAT_MAT4&&(o=4),n[a]={type:r.type,location:e.getAttribLocation(t,a),locationSize:o}}return n}function xc(e){return e!==``}function Sc(e,t){let n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function Cc(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var wc=/^[ \t]*#include +<([\w\d./]+)>/gm;function Tc(e){return e.replace(wc,Dc)}var Ec=new Map;function Dc(e,t){let n=fo[t];if(n===void 0){let e=Ec.get(t);if(e!==void 0)n=fo[e],B(`WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.`,t,e);else throw Error(`THREE.WebGLProgram: Can not resolve #include <`+t+`>`)}return Tc(n)}var Oc=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function kc(e){return e.replace(Oc,Ac)}function Ac(e,t,n,r){let i=``;for(let e=parseInt(t);e<parseInt(n);e++)i+=r.replace(/\[\s*i\s*\]/g,`[ `+e+` ]`).replace(/UNROLLED_LOOP_INDEX/g,e);return i}function jc(e){let t=`precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;return e.precision===`highp`?t+=`
#define HIGH_PRECISION`:e.precision===`mediump`?t+=`
#define MEDIUM_PRECISION`:e.precision===`lowp`&&(t+=`
#define LOW_PRECISION`),t}var Mc={1:`SHADOWMAP_TYPE_PCF`,3:`SHADOWMAP_TYPE_VSM`};function Nc(e){return Mc[e.shadowMapType]||`SHADOWMAP_TYPE_BASIC`}var Pc={301:`ENVMAP_TYPE_CUBE`,302:`ENVMAP_TYPE_CUBE`,306:`ENVMAP_TYPE_CUBE_UV`};function Fc(e){return e.envMap===!1?`ENVMAP_TYPE_CUBE`:Pc[e.envMapMode]||`ENVMAP_TYPE_CUBE`}var Ic={302:`ENVMAP_MODE_REFRACTION`};function Lc(e){return e.envMap===!1?`ENVMAP_MODE_REFLECTION`:Ic[e.envMapMode]||`ENVMAP_MODE_REFLECTION`}var Rc={0:`ENVMAP_BLENDING_MULTIPLY`,1:`ENVMAP_BLENDING_MIX`,2:`ENVMAP_BLENDING_ADD`};function zc(e){return e.envMap===!1?`ENVMAP_BLENDING_NONE`:Rc[e.combine]||`ENVMAP_BLENDING_NONE`}function Bc(e){let t=e.envMapCubeUVHeight;if(t===null)return null;let n=Math.log2(t)-2,r=1/t;return{texelWidth:1/(3*Math.max(2**n,112)),texelHeight:r,maxMip:n}}function Vc(e,t,n,r){let i=e.getContext(),a=n.defines,o=n.vertexShader,s=n.fragmentShader,c=Nc(n),l=Fc(n),u=Lc(n),d=zc(n),f=Bc(n),p=vc(n),m=yc(a),h=i.createProgram(),g,_,v=n.glslVersion?`#version `+n.glslVersion+`
`:``;n.isRawShaderMaterial?(g=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m].filter(xc).join(`
`),g.length>0&&(g+=`
`),_=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m].filter(xc).join(`
`),_.length>0&&(_+=`
`)):(g=[jc(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m,n.extensionClipCullDistance?`#define USE_CLIP_DISTANCE`:``,n.batching?`#define USE_BATCHING`:``,n.batchingColor?`#define USE_BATCHING_COLOR`:``,n.instancing?`#define USE_INSTANCING`:``,n.instancingColor?`#define USE_INSTANCING_COLOR`:``,n.instancingMorph?`#define USE_INSTANCING_MORPH`:``,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.map?`#define USE_MAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+u:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.displacementMap?`#define USE_DISPLACEMENTMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.mapUv?`#define MAP_UV `+n.mapUv:``,n.alphaMapUv?`#define ALPHAMAP_UV `+n.alphaMapUv:``,n.lightMapUv?`#define LIGHTMAP_UV `+n.lightMapUv:``,n.aoMapUv?`#define AOMAP_UV `+n.aoMapUv:``,n.emissiveMapUv?`#define EMISSIVEMAP_UV `+n.emissiveMapUv:``,n.bumpMapUv?`#define BUMPMAP_UV `+n.bumpMapUv:``,n.normalMapUv?`#define NORMALMAP_UV `+n.normalMapUv:``,n.displacementMapUv?`#define DISPLACEMENTMAP_UV `+n.displacementMapUv:``,n.metalnessMapUv?`#define METALNESSMAP_UV `+n.metalnessMapUv:``,n.roughnessMapUv?`#define ROUGHNESSMAP_UV `+n.roughnessMapUv:``,n.anisotropyMapUv?`#define ANISOTROPYMAP_UV `+n.anisotropyMapUv:``,n.clearcoatMapUv?`#define CLEARCOATMAP_UV `+n.clearcoatMapUv:``,n.clearcoatNormalMapUv?`#define CLEARCOAT_NORMALMAP_UV `+n.clearcoatNormalMapUv:``,n.clearcoatRoughnessMapUv?`#define CLEARCOAT_ROUGHNESSMAP_UV `+n.clearcoatRoughnessMapUv:``,n.iridescenceMapUv?`#define IRIDESCENCEMAP_UV `+n.iridescenceMapUv:``,n.iridescenceThicknessMapUv?`#define IRIDESCENCE_THICKNESSMAP_UV `+n.iridescenceThicknessMapUv:``,n.sheenColorMapUv?`#define SHEEN_COLORMAP_UV `+n.sheenColorMapUv:``,n.sheenRoughnessMapUv?`#define SHEEN_ROUGHNESSMAP_UV `+n.sheenRoughnessMapUv:``,n.specularMapUv?`#define SPECULARMAP_UV `+n.specularMapUv:``,n.specularColorMapUv?`#define SPECULAR_COLORMAP_UV `+n.specularColorMapUv:``,n.specularIntensityMapUv?`#define SPECULAR_INTENSITYMAP_UV `+n.specularIntensityMapUv:``,n.transmissionMapUv?`#define TRANSMISSIONMAP_UV `+n.transmissionMapUv:``,n.thicknessMapUv?`#define THICKNESSMAP_UV `+n.thicknessMapUv:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexNormals?`#define HAS_NORMAL`:``,n.vertexColors?`#define USE_COLOR`:``,n.vertexAlphas?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.flatShading?`#define FLAT_SHADED`:``,n.skinning?`#define USE_SKINNING`:``,n.morphTargets?`#define USE_MORPHTARGETS`:``,n.morphNormals&&n.flatShading===!1?`#define USE_MORPHNORMALS`:``,n.morphColors?`#define USE_MORPHCOLORS`:``,n.morphTargetsCount>0?`#define MORPHTARGETS_TEXTURE_STRIDE `+n.morphTextureStride:``,n.morphTargetsCount>0?`#define MORPHTARGETS_COUNT `+n.morphTargetsCount:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.sizeAttenuation?`#define USE_SIZEATTENUATION`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 modelMatrix;`,`uniform mat4 modelViewMatrix;`,`uniform mat4 projectionMatrix;`,`uniform mat4 viewMatrix;`,`uniform mat3 normalMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,`#ifdef USE_INSTANCING`,`	attribute mat4 instanceMatrix;`,`#endif`,`#ifdef USE_INSTANCING_COLOR`,`	attribute vec3 instanceColor;`,`#endif`,`#ifdef USE_INSTANCING_MORPH`,`	uniform sampler2D morphTexture;`,`#endif`,`attribute vec3 position;`,`attribute vec3 normal;`,`attribute vec2 uv;`,`#ifdef USE_UV1`,`	attribute vec2 uv1;`,`#endif`,`#ifdef USE_UV2`,`	attribute vec2 uv2;`,`#endif`,`#ifdef USE_UV3`,`	attribute vec2 uv3;`,`#endif`,`#ifdef USE_TANGENT`,`	attribute vec4 tangent;`,`#endif`,`#if defined( USE_COLOR_ALPHA )`,`	attribute vec4 color;`,`#elif defined( USE_COLOR )`,`	attribute vec3 color;`,`#endif`,`#ifdef USE_SKINNING`,`	attribute vec4 skinIndex;`,`	attribute vec4 skinWeight;`,`#endif`,`
`].filter(xc).join(`
`),_=[jc(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.alphaToCoverage?`#define ALPHA_TO_COVERAGE`:``,n.map?`#define USE_MAP`:``,n.matcap?`#define USE_MATCAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+l:``,n.envMap?`#define `+u:``,n.envMap?`#define `+d:``,f?`#define CUBEUV_TEXEL_WIDTH `+f.texelWidth:``,f?`#define CUBEUV_TEXEL_HEIGHT `+f.texelHeight:``,f?`#define CUBEUV_MAX_MIP `+f.maxMip+`.0`:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.packedNormalMap?`#define USE_PACKED_NORMALMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoat?`#define USE_CLEARCOAT`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.dispersion?`#define USE_DISPERSION`:``,n.retroreflection?`#define USE_RETROREFLECTION`:``,n.iridescence?`#define USE_IRIDESCENCE`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaTest?`#define USE_ALPHATEST`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.sheen?`#define USE_SHEEN`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexColors||n.instancingColor?`#define USE_COLOR`:``,n.vertexAlphas||n.batchingColor?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.gradientMap?`#define USE_GRADIENTMAP`:``,n.flatShading?`#define FLAT_SHADED`:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.premultipliedAlpha?`#define PREMULTIPLIED_ALPHA`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.numLightProbeGrids>0?`#define USE_LIGHT_PROBES_GRID`:``,n.decodeVideoTexture?`#define DECODE_VIDEO_TEXTURE`:``,n.decodeVideoTextureEmissive?`#define DECODE_VIDEO_TEXTURE_EMISSIVE`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 viewMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,n.toneMapping===0?``:`#define TONE_MAPPING`,n.toneMapping===0?``:fo.tonemapping_pars_fragment,n.toneMapping===0?``:hc(`toneMapping`,n.toneMapping),n.dithering?`#define DITHERING`:``,n.opaque?`#define OPAQUE`:``,fo.colorspace_pars_fragment,pc(`linearToOutputTexel`,n.outputColorSpace),_c(),n.useDepthPacking?`#define DEPTH_PACKING `+n.depthPacking:``,`
`].filter(xc).join(`
`)),o=Tc(o),o=Sc(o,n),o=Cc(o,n),s=Tc(s),s=Sc(s,n),s=Cc(s,n),o=kc(o),s=kc(s),n.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,g=[p,`#define attribute in`,`#define varying out`,`#define texture2D texture`].join(`
`)+`
`+g,_=[`#define varying in`,n.glslVersion===`300 es`?``:`layout(location = 0) out highp vec4 pc_fragColor;`,n.glslVersion===`300 es`?``:`#define gl_FragColor pc_fragColor`,`#define gl_FragDepthEXT gl_FragDepth`,`#define texture2D texture`,`#define textureCube texture`,`#define texture2DProj textureProj`,`#define texture2DLodEXT textureLod`,`#define texture2DProjLodEXT textureProjLod`,`#define textureCubeLodEXT textureLod`,`#define texture2DGradEXT textureGrad`,`#define texture2DProjGradEXT textureProjGrad`,`#define textureCubeGradEXT textureGrad`].join(`
`)+`
`+_);let y=v+g+o,b=v+_+s,x=oc(i,i.VERTEX_SHADER,y),S=oc(i,i.FRAGMENT_SHADER,b);i.attachShader(h,x),i.attachShader(h,S),n.index0AttributeName===void 0?n.hasPositionAttribute===!0&&i.bindAttribLocation(h,0,`position`):i.bindAttribLocation(h,0,n.index0AttributeName),i.linkProgram(h);function C(t){if(e.debug.checkShaderErrors){let n=i.getProgramInfoLog(h)||``,r=i.getShaderInfoLog(x)||``,a=i.getShaderInfoLog(S)||``,o=n.trim(),s=r.trim(),c=a.trim(),l=!0,u=!0;if(i.getProgramParameter(h,i.LINK_STATUS)===!1){if(l=!1,typeof e.debug.onShaderError==`function`)e.debug.onShaderError(i,h,x,S);else{let e=fc(i,x,`vertex`),n=fc(i,S,`fragment`);V(`WebGLProgram: Shader Error `+i.getError()+` - VALIDATE_STATUS `+i.getProgramParameter(h,i.VALIDATE_STATUS)+`

Material Name: `+t.name+`
Material Type: `+t.type+`

Program Info Log: `+o+`
`+e+`
`+n)}}else o===``?(s===``||c===``)&&(u=!1):B(`WebGLProgram: Program Info Log:`,o);u&&(t.diagnostics={runnable:l,programLog:o,vertexShader:{log:s,prefix:g},fragmentShader:{log:c,prefix:_}})}i.deleteShader(x),i.deleteShader(S),w=new ac(i,h),T=bc(i,h)}let w;this.getUniforms=function(){return w===void 0&&C(this),w};let T;this.getAttributes=function(){return T===void 0&&C(this),T};let E=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return E===!1&&(E=i.getProgramParameter(h,sc)),E},this.destroy=function(){r.releaseStatesOfProgram(this),i.deleteProgram(h),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=cc++,this.cacheKey=t,this.usedTimes=1,this.program=h,this.vertexShader=x,this.fragmentShader=S,this}var Hc=0,Uc=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let r=this._getShaderCacheForMaterial(e);return r.has(t)===!1&&(r.add(t),t.usedTimes++),r.has(n)===!1&&(r.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let e of t)e.usedTimes--,e.usedTimes===0&&this.shaderCache.delete(e.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new Wc(e),t.set(e,n)),n}},Wc=class{constructor(e){this.id=Hc++,this.code=e,this.usedTimes=0}};function Gc(e){return e===1030||e===37490||e===36285}function Kc(e,t,n,r,i,a){let o=new ln,s=new Uc,c=new Set,l=[],u=new Map,d=r.logarithmicDepthBuffer,f=r.precision,p={MeshDepthMaterial:`depth`,MeshDistanceMaterial:`distance`,MeshNormalMaterial:`normal`,MeshBasicMaterial:`basic`,MeshLambertMaterial:`lambert`,MeshPhongMaterial:`phong`,MeshToonMaterial:`toon`,MeshStandardMaterial:`physical`,MeshPhysicalMaterial:`physical`,MeshMatcapMaterial:`matcap`,LineBasicMaterial:`basic`,LineDashedMaterial:`dashed`,PointsMaterial:`points`,ShadowMaterial:`shadow`,SpriteMaterial:`sprite`};function m(e){return c.add(e),e===0?`uv`:`uv${e}`}function h(i,o,l,u,h,g){let _=u.fog,v=h.geometry,y=i.isMeshStandardMaterial||i.isMeshLambertMaterial||i.isMeshPhongMaterial?u.environment:null,b=i.isMeshStandardMaterial||i.isMeshLambertMaterial&&!i.envMap||i.isMeshPhongMaterial&&!i.envMap,x=t.get(i.envMap||y,b),S=x&&x.mapping===306?x.image.height:null,C=p[i.type];i.precision!==null&&(f=r.getMaxPrecision(i.precision),f!==i.precision&&B(`WebGLProgram.getParameters:`,i.precision,`not supported, using`,f,`instead.`));let w=v.morphAttributes.position||v.morphAttributes.normal||v.morphAttributes.color,T=w===void 0?0:w.length,E=0;v.morphAttributes.position!==void 0&&(E=1),v.morphAttributes.normal!==void 0&&(E=2),v.morphAttributes.color!==void 0&&(E=3);let D,O,k,A;if(C){let e=po[C];D=e.vertexShader,O=e.fragmentShader}else{D=i.vertexShader,O=i.fragmentShader;let e=s.getVertexShaderStage(i),t=s.getFragmentShaderStage(i);s.update(i,e,t),k=e.id,A=t.id}let j=e.getRenderTarget(),M=e.state.buffers.depth.getReversed(),N=h.isInstancedMesh===!0,P=h.isBatchedMesh===!0,ee=!!i.map,F=!!i.matcap,te=!!x,ne=!!i.aoMap,re=!!i.lightMap,ie=!!i.bumpMap&&i.wireframe===!1,ae=!!i.normalMap,oe=!!i.displacementMap,se=!!i.emissiveMap,I=!!i.metalnessMap,ce=!!i.roughnessMap,le=i.anisotropy>0,ue=i.clearcoat>0,de=i.dispersion>0,fe=i.retroreflectivity>0,pe=i.iridescence>0,me=i.sheen>0,he=i.transmission>0,ge=le&&!!i.anisotropyMap,_e=ue&&!!i.clearcoatMap,ve=ue&&!!i.clearcoatNormalMap,ye=ue&&!!i.clearcoatRoughnessMap,be=pe&&!!i.iridescenceMap,xe=pe&&!!i.iridescenceThicknessMap,Se=me&&!!i.sheenColorMap,Ce=me&&!!i.sheenRoughnessMap,we=!!i.specularMap,Te=!!i.specularColorMap,Ee=!!i.specularIntensityMap,De=he&&!!i.transmissionMap,Oe=he&&!!i.thicknessMap,ke=!!i.gradientMap,Ae=!!i.alphaMap,je=i.alphaTest>0,L=!!i.alphaHash,Me=!!i.extensions,Ne=0;i.toneMapped&&(j===null||j.isXRRenderTarget===!0)&&(Ne=e.toneMapping);let Pe={shaderID:C,shaderType:i.type,shaderName:i.name,vertexShader:D,fragmentShader:O,defines:i.defines,customVertexShaderID:k,customFragmentShaderID:A,isRawShaderMaterial:i.isRawShaderMaterial===!0,glslVersion:i.glslVersion,precision:f,batching:P,batchingColor:P&&h._colorsTexture!==null,instancing:N,instancingColor:N&&h.instanceColor!==null,instancingMorph:N&&h.morphTexture!==null,outputColorSpace:j===null?e.outputColorSpace:j.isXRRenderTarget===!0?j.texture.colorSpace:Ft.workingColorSpace,alphaToCoverage:!!i.alphaToCoverage,map:ee,matcap:F,envMap:te,envMapMode:te&&x.mapping,envMapCubeUVHeight:S,aoMap:ne,lightMap:re,bumpMap:ie,normalMap:ae,displacementMap:oe,emissiveMap:se,normalMapObjectSpace:ae&&i.normalMapType===1,normalMapTangentSpace:ae&&i.normalMapType===0,packedNormalMap:ae&&i.normalMapType===0&&Gc(i.normalMap.format),metalnessMap:I,roughnessMap:ce,anisotropy:le,anisotropyMap:ge,clearcoat:ue,clearcoatMap:_e,clearcoatNormalMap:ve,clearcoatRoughnessMap:ye,dispersion:de,retroreflection:fe,iridescence:pe,iridescenceMap:be,iridescenceThicknessMap:xe,sheen:me,sheenColorMap:Se,sheenRoughnessMap:Ce,specularMap:we,specularColorMap:Te,specularIntensityMap:Ee,transmission:he,transmissionMap:De,thicknessMap:Oe,gradientMap:ke,opaque:i.transparent===!1&&i.blending===1&&i.alphaToCoverage===!1,alphaMap:Ae,alphaTest:je,alphaHash:L,combine:i.combine,mapUv:ee&&m(i.map.channel),aoMapUv:ne&&m(i.aoMap.channel),lightMapUv:re&&m(i.lightMap.channel),bumpMapUv:ie&&m(i.bumpMap.channel),normalMapUv:ae&&m(i.normalMap.channel),displacementMapUv:oe&&m(i.displacementMap.channel),emissiveMapUv:se&&m(i.emissiveMap.channel),metalnessMapUv:I&&m(i.metalnessMap.channel),roughnessMapUv:ce&&m(i.roughnessMap.channel),anisotropyMapUv:ge&&m(i.anisotropyMap.channel),clearcoatMapUv:_e&&m(i.clearcoatMap.channel),clearcoatNormalMapUv:ve&&m(i.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ye&&m(i.clearcoatRoughnessMap.channel),iridescenceMapUv:be&&m(i.iridescenceMap.channel),iridescenceThicknessMapUv:xe&&m(i.iridescenceThicknessMap.channel),sheenColorMapUv:Se&&m(i.sheenColorMap.channel),sheenRoughnessMapUv:Ce&&m(i.sheenRoughnessMap.channel),specularMapUv:we&&m(i.specularMap.channel),specularColorMapUv:Te&&m(i.specularColorMap.channel),specularIntensityMapUv:Ee&&m(i.specularIntensityMap.channel),transmissionMapUv:De&&m(i.transmissionMap.channel),thicknessMapUv:Oe&&m(i.thicknessMap.channel),alphaMapUv:Ae&&m(i.alphaMap.channel),vertexTangents:!!v.attributes.tangent&&(ae||le),vertexNormals:!!v.attributes.normal,vertexColors:i.vertexColors,vertexAlphas:i.vertexColors===!0&&!!v.attributes.color&&v.attributes.color.itemSize===4,pointsUvs:h.isPoints===!0&&!!v.attributes.uv&&(ee||Ae),fog:!!_,useFog:i.fog===!0,fogExp2:!!_&&_.isFogExp2,flatShading:i.wireframe===!1&&(i.flatShading===!0||v.attributes.normal===void 0&&ae===!1&&(i.isMeshLambertMaterial||i.isMeshPhongMaterial||i.isMeshStandardMaterial||i.isMeshPhysicalMaterial)),sizeAttenuation:i.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:M,skinning:h.isSkinnedMesh===!0,hasPositionAttribute:v.attributes.position!==void 0,morphTargets:v.morphAttributes.position!==void 0,morphNormals:v.morphAttributes.normal!==void 0,morphColors:v.morphAttributes.color!==void 0,morphTargetsCount:T,morphTextureStride:E,numSunLights:o.sun.length,numDirLights:o.directional.length,numPointLights:o.point.length,numSpotLights:o.spot.length,numSpotLightMaps:o.spotLightMap.length,numRectAreaLights:o.rectArea.length,numHemiLights:o.hemi.length,numSunLightShadows:o.sunShadowMap.length,numDirLightShadows:o.directionalShadowMap.length,numPointLightShadows:o.pointShadowMap.length,numSpotLightShadows:o.spotShadowMap.length,numSpotLightShadowsWithMaps:o.numSpotLightShadowsWithMaps,numLightProbes:o.numLightProbes,numLightProbeGrids:g.length,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:i.dithering,shadowMapEnabled:e.shadowMap.enabled&&l.length>0,shadowMapType:e.shadowMap.type,toneMapping:Ne,decodeVideoTexture:ee&&i.map.isVideoTexture===!0&&Ft.getTransfer(i.map.colorSpace)===`srgb`,decodeVideoTextureEmissive:se&&i.emissiveMap.isVideoTexture===!0&&Ft.getTransfer(i.emissiveMap.colorSpace)===`srgb`,premultipliedAlpha:i.premultipliedAlpha,doubleSided:i.side===2,flipSided:i.side===1,useDepthPacking:i.depthPacking>=0,depthPacking:i.depthPacking||0,index0AttributeName:i.index0AttributeName,extensionClipCullDistance:Me&&i.extensions.clipCullDistance===!0&&n.has(`WEBGL_clip_cull_distance`),extensionMultiDraw:(Me&&i.extensions.multiDraw===!0||P)&&n.has(`WEBGL_multi_draw`),rendererExtensionParallelShaderCompile:n.has(`KHR_parallel_shader_compile`),customProgramCacheKey:i.customProgramCacheKey()};return Pe.vertexUv1s=c.has(1),Pe.vertexUv2s=c.has(2),Pe.vertexUv3s=c.has(3),c.clear(),Pe}function g(t){let n=[];if(t.shaderID?n.push(t.shaderID):(n.push(t.customVertexShaderID),n.push(t.customFragmentShaderID)),t.defines!==void 0)for(let e in t.defines)n.push(e),n.push(t.defines[e]);return t.isRawShaderMaterial===!1&&(_(n,t),v(n,t),n.push(e.outputColorSpace)),n.push(t.customProgramCacheKey),n.join()}function _(e,t){e.push(t.precision),e.push(t.outputColorSpace),e.push(t.envMapMode),e.push(t.envMapCubeUVHeight),e.push(t.mapUv),e.push(t.alphaMapUv),e.push(t.lightMapUv),e.push(t.aoMapUv),e.push(t.bumpMapUv),e.push(t.normalMapUv),e.push(t.displacementMapUv),e.push(t.emissiveMapUv),e.push(t.metalnessMapUv),e.push(t.roughnessMapUv),e.push(t.anisotropyMapUv),e.push(t.clearcoatMapUv),e.push(t.clearcoatNormalMapUv),e.push(t.clearcoatRoughnessMapUv),e.push(t.iridescenceMapUv),e.push(t.iridescenceThicknessMapUv),e.push(t.sheenColorMapUv),e.push(t.sheenRoughnessMapUv),e.push(t.specularMapUv),e.push(t.specularColorMapUv),e.push(t.specularIntensityMapUv),e.push(t.transmissionMapUv),e.push(t.thicknessMapUv),e.push(t.combine),e.push(t.fogExp2),e.push(t.sizeAttenuation),e.push(t.morphTargetsCount),e.push(t.morphAttributeCount),e.push(t.numSunLights),e.push(t.numDirLights),e.push(t.numPointLights),e.push(t.numSpotLights),e.push(t.numSpotLightMaps),e.push(t.numHemiLights),e.push(t.numRectAreaLights),e.push(t.numSunLightShadows),e.push(t.numDirLightShadows),e.push(t.numPointLightShadows),e.push(t.numSpotLightShadows),e.push(t.numSpotLightShadowsWithMaps),e.push(t.numLightProbes),e.push(t.shadowMapType),e.push(t.toneMapping),e.push(t.numClippingPlanes),e.push(t.numClipIntersection),e.push(t.depthPacking)}function v(e,t){o.disableAll(),t.instancing&&o.enable(0),t.instancingColor&&o.enable(1),t.instancingMorph&&o.enable(2),t.matcap&&o.enable(3),t.envMap&&o.enable(4),t.normalMapObjectSpace&&o.enable(5),t.normalMapTangentSpace&&o.enable(6),t.clearcoat&&o.enable(7),t.iridescence&&o.enable(8),t.alphaTest&&o.enable(9),t.vertexColors&&o.enable(10),t.vertexAlphas&&o.enable(11),t.vertexUv1s&&o.enable(12),t.vertexUv2s&&o.enable(13),t.vertexUv3s&&o.enable(14),t.vertexTangents&&o.enable(15),t.anisotropy&&o.enable(16),t.alphaHash&&o.enable(17),t.batching&&o.enable(18),t.dispersion&&o.enable(19),t.retroreflection&&o.enable(24),t.batchingColor&&o.enable(20),t.gradientMap&&o.enable(21),t.packedNormalMap&&o.enable(22),t.vertexNormals&&o.enable(23),e.push(o.mask),o.disableAll(),t.fog&&o.enable(0),t.useFog&&o.enable(1),t.flatShading&&o.enable(2),t.logarithmicDepthBuffer&&o.enable(3),t.reversedDepthBuffer&&o.enable(4),t.skinning&&o.enable(5),t.morphTargets&&o.enable(6),t.morphNormals&&o.enable(7),t.morphColors&&o.enable(8),t.premultipliedAlpha&&o.enable(9),t.shadowMapEnabled&&o.enable(10),t.doubleSided&&o.enable(11),t.flipSided&&o.enable(12),t.useDepthPacking&&o.enable(13),t.dithering&&o.enable(14),t.transmission&&o.enable(15),t.sheen&&o.enable(16),t.opaque&&o.enable(17),t.pointsUvs&&o.enable(18),t.decodeVideoTexture&&o.enable(19),t.decodeVideoTextureEmissive&&o.enable(20),t.alphaToCoverage&&o.enable(21),t.numLightProbeGrids>0&&o.enable(22),t.hasPositionAttribute&&o.enable(23),e.push(o.mask)}function y(e){let t=p[e.type],n;if(t){let e=po[t];n=sa.clone(e.uniforms)}else n=e.uniforms;return n}function b(t,n){let r=u.get(n);return r===void 0?(r=new Vc(e,n,t,i),l.push(r),u.set(n,r)):++r.usedTimes,r}function x(e){if(--e.usedTimes===0){let t=l.indexOf(e);l[t]=l[l.length-1],l.pop(),u.delete(e.cacheKey),e.destroy()}}function S(e){s.remove(e)}function C(){s.dispose()}return{getParameters:h,getProgramCacheKey:g,getUniforms:y,acquireProgram:b,releaseProgram:x,releaseShaderCache:S,programs:l,dispose:C}}function qc(){let e=new WeakMap;function t(t){return e.has(t)}function n(t){let n=e.get(t);return n===void 0&&(n={},e.set(t,n)),n}function r(t){e.delete(t)}function i(t,n,r){e.get(t)[n]=r}function a(){e=new WeakMap}return{has:t,get:n,remove:r,update:i,dispose:a}}function Jc(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.material.id===t.material.id?e.materialVariant===t.materialVariant?e.z===t.z?e.id-t.id:e.z-t.z:e.materialVariant-t.materialVariant:e.material.id-t.material.id:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function Yc(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.z===t.z?e.id-t.id:t.z-e.z:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function Xc(){let e=[],t=0,n=[],r=[],i=[];function a(){t=0,n.length=0,r.length=0,i.length=0}function o(e){let t=0;return e.isInstancedMesh&&(t+=2),e.isSkinnedMesh&&(t+=1),t}function s(n,r,i,a,s,c){let l=e[t];return l===void 0?(l={id:n.id,object:n,geometry:r,material:i,materialVariant:o(n),groupOrder:a,renderOrder:n.renderOrder,z:s,group:c},e[t]=l):(l.id=n.id,l.object=n,l.geometry=r,l.material=i,l.materialVariant=o(n),l.groupOrder=a,l.renderOrder=n.renderOrder,l.z=s,l.group=c),t++,l}function c(e,t,a,o,c,l,u){u.reversedDepth===!0&&(c=-c);let d=s(e,t,a,o,c,l);a.transmission>0?r.push(d):a.transparent===!0?i.push(d):n.push(d)}function l(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.unshift(u):a.transparent===!0?i.unshift(u):n.unshift(u)}function u(e,t){n.length>1&&n.sort(e||Jc),r.length>1&&r.sort(t||Yc),i.length>1&&i.sort(t||Yc)}function d(){for(let n=t,r=e.length;n<r;n++){let t=e[n];if(t.id===null)break;t.id=null,t.object=null,t.geometry=null,t.material=null,t.group=null}}return{opaque:n,transmissive:r,transparent:i,init:a,push:c,unshift:l,finish:d,sort:u}}function Zc(){let e=new WeakMap;function t(t,n){let r=e.get(t),i;return r===void 0?(i=new Xc,e.set(t,[i])):n>=r.length?(i=new Xc,r.push(i)):i=r[n],i}function n(){e=new WeakMap}return{get:t,dispose:n}}function Qc(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={direction:new W,color:new K};break;case`SpotLight`:n={position:new W,direction:new W,color:new K,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case`PointLight`:n={position:new W,color:new K,distance:0,decay:0};break;case`HemisphereLight`:n={direction:new W,skyColor:new K,groundColor:new K};break;case`RectAreaLight`:n={color:new K,position:new W,halfWidth:new W,halfHeight:new W}}return e[t.id]=n,n}}}function $c(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new U};break;case`SpotLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new U};break;case`PointLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new U,shadowCameraNear:1,shadowCameraFar:1e3}}return e[t.id]=n,n}}}var el=0;function tl(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+ +!!t.map-!!e.map}function nl(e){let t=new Qc,n=$c(),r={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let e=0;e<9;e++)r.probe.push(new W);let i=new W,a=new Zt,o=new Zt;function s(i){let a=0,o=0,s=0;for(let e=0;e<9;e++)r.probe[e].set(0,0,0);let c=0,l=0,u=0,d=0,f=0,p=0,m=0,h=0,g=0,_=0,v=0,y=0,b=0,x=0;i.sort(tl);for(let e=0,S=i.length;e<S;e++){let S=i[e],C=S.color,w=S.intensity,T=S.distance,E=null;if(S.shadow&&S.shadow.map&&(E=S.shadow.map.texture.format===1030?S.shadow.map.texture:S.shadow.map.depthTexture||S.shadow.map.texture),S.isAmbientLight)a+=C.r*w,o+=C.g*w,s+=C.b*w;else if(S.isLightProbe){for(let e=0;e<9;e++)r.probe[e].addScaledVector(S.sh.coefficients[e],w);x++}else if(S.isSunLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize.copy(e.mapSize).multiply(e.getFrameExtents()),r.sunShadow[l]=t,r.sunShadowMap[l]=E;let i=e.getViewportCount();for(let t=0;t<i;t++)r.sunShadowMatrix[u+t]=e.getMatrix(t),r.sunShadowCascade[u+t]=e._cascadeData[t];u+=i,l++}r.sun[c]=e,c++}else if(S.isDirectionalLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,r.directionalShadow[d]=t,r.directionalShadowMap[d]=E,r.directionalShadowMatrix[d]=S.shadow.matrix,g++}r.directional[d]=e,d++}else if(S.isSpotLight){let e=t.get(S);e.position.setFromMatrixPosition(S.matrixWorld),e.color.copy(C).multiplyScalar(w),e.distance=T,e.coneCos=Math.cos(S.angle),e.penumbraCos=Math.cos(S.angle*(1-S.penumbra)),e.decay=S.decay,r.spot[p]=e;let i=S.shadow;if(S.map&&(r.spotLightMap[y]=S.map,y++,i.updateMatrices(S),S.castShadow&&b++),r.spotLightMatrix[p]=i.matrix,S.castShadow){let e=n.get(S);e.shadowIntensity=i.intensity,e.shadowBias=i.bias,e.shadowNormalBias=i.normalBias,e.shadowRadius=i.radius,e.shadowMapSize=i.mapSize,r.spotShadow[p]=e,r.spotShadowMap[p]=E,v++}p++}else if(S.isRectAreaLight){let e=t.get(S);e.color.copy(C).multiplyScalar(w),e.halfWidth.set(S.width*.5,0,0),e.halfHeight.set(0,S.height*.5,0),r.rectArea[m]=e,m++}else if(S.isPointLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),e.distance=S.distance,e.decay=S.decay,S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,t.shadowCameraNear=e.camera.near,t.shadowCameraFar=e.camera.far,r.pointShadow[f]=t,r.pointShadowMap[f]=E,r.pointShadowMatrix[f]=S.shadow.matrix,_++}r.point[f]=e,f++}else if(S.isHemisphereLight){let e=t.get(S);e.skyColor.copy(S.color).multiplyScalar(w),e.groundColor.copy(S.groundColor).multiplyScalar(w),r.hemi[h]=e,h++}}m>0&&(e.has(`OES_texture_float_linear`)===!0?(r.rectAreaLTC1=J.LTC_FLOAT_1,r.rectAreaLTC2=J.LTC_FLOAT_2):(r.rectAreaLTC1=J.LTC_HALF_1,r.rectAreaLTC2=J.LTC_HALF_2)),r.ambient[0]=a,r.ambient[1]=o,r.ambient[2]=s;let S=r.hash;(S.sunLength!==c||S.directionalLength!==d||S.pointLength!==f||S.spotLength!==p||S.rectAreaLength!==m||S.hemiLength!==h||S.numSunShadows!==l||S.numDirectionalShadows!==g||S.numPointShadows!==_||S.numSpotShadows!==v||S.numSpotMaps!==y||S.numLightProbes!==x)&&(r.sun.length=c,r.directional.length=d,r.spot.length=p,r.rectArea.length=m,r.point.length=f,r.hemi.length=h,r.sunShadow.length=l,r.sunShadowMap.length=l,r.sunShadowMatrix.length=u,r.sunShadowCascade.length=u,r.directionalShadow.length=g,r.directionalShadowMap.length=g,r.directionalShadowMatrix.length=g,r.pointShadow.length=_,r.pointShadowMap.length=_,r.pointShadowMatrix.length=_,r.spotShadow.length=v,r.spotShadowMap.length=v,r.spotLightMatrix.length=v+y-b,r.spotLightMap.length=y,r.numSpotLightShadowsWithMaps=b,r.numLightProbes=x,S.sunLength=c,S.directionalLength=d,S.pointLength=f,S.spotLength=p,S.rectAreaLength=m,S.hemiLength=h,S.numSunShadows=l,S.numDirectionalShadows=g,S.numPointShadows=_,S.numSpotShadows=v,S.numSpotMaps=y,S.numLightProbes=x,r.version=el++)}function c(e,t){let n=0,s=0,c=0,l=0,u=0,d=0,f=t.matrixWorldInverse;for(let t=0,p=e.length;t<p;t++){let p=e[t];if(p.isSunLight){let e=r.sun[n];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),n++}else if(p.isDirectionalLight){let e=r.directional[s];e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),s++}else if(p.isSpotLight){let e=r.spot[l];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),l++}else if(p.isRectAreaLight){let e=r.rectArea[u];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),o.identity(),a.copy(p.matrixWorld),a.premultiply(f),o.extractRotation(a),e.halfWidth.set(p.width*.5,0,0),e.halfHeight.set(0,p.height*.5,0),e.halfWidth.applyMatrix4(o),e.halfHeight.applyMatrix4(o),u++}else if(p.isPointLight){let e=r.point[c];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),c++}else if(p.isHemisphereLight){let e=r.hemi[d];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),d++}}}return{setup:s,setupView:c,state:r}}function rl(e){let t=new nl(e),n=[],r=[],i=[];function a(e){d.camera=e,n.length=0,r.length=0,i.length=0}function o(e){n.push(e)}function s(e){r.push(e)}function c(e){i.push(e)}function l(){t.setup(n)}function u(e){t.setupView(n,e)}let d={lightsArray:n,shadowsArray:r,lightProbeGridArray:i,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:a,state:d,setupLights:l,setupLightsView:u,pushLight:o,pushShadow:s,pushLightProbeGrid:c}}function il(e){let t=new WeakMap;function n(n,r=0){let i=t.get(n),a;return i===void 0?(a=new rl(e),t.set(n,[a])):r>=i.length?(a=new rl(e),i.push(a)):a=i[r],a}function r(){t=new WeakMap}return{get:n,dispose:r}}var al=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,ol=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,sl=[new W(1,0,0),new W(-1,0,0),new W(0,1,0),new W(0,-1,0),new W(0,0,1),new W(0,0,-1)],cl=[new W(0,-1,0),new W(0,-1,0),new W(0,0,1),new W(0,0,-1),new W(0,-1,0),new W(0,-1,0)],ll=new Zt,ul=new W,dl=new W;function fl(e,t,n){let i=new pi,a=new U,s=new U,c=new Kt,l=new fa,u=new pa,d={},f=n.maxTextureSize,p={0:1,1:0,2:2},_=new ua({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new U},radius:{value:4}},vertexShader:al,fragmentShader:ol}),v=_.clone();v.defines.HORIZONTAL_PASS=1;let y=new Dr;y.setAttribute(`position`,new pr(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let b=new Zr(y,_),x=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let S=this.type;this.render=function(t,n,l){if(x.enabled===!1||x.autoUpdate===!1&&x.needsUpdate===!1||t.length===0)return;this.type===2&&(B(`WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.`),this.type=1);let u=e.getRenderTarget(),d=e.getActiveCubeFace(),p=e.getActiveMipmapLevel(),_=e.state;_.setBlending(0),_.buffers.depth.getReversed()===!0?_.buffers.color.setClear(0,0,0,0):_.buffers.color.setClear(1,1,1,1),_.buffers.depth.setTest(!0),_.setScissorTest(!1);let v=S!==this.type;v&&n.traverse(function(e){e.material&&(Array.isArray(e.material)?e.material.forEach(e=>e.needsUpdate=!0):e.material.needsUpdate=!0)});for(let u=0,d=t.length;u<d;u++){let d=t[u],p=d.shadow;if(p===void 0){B(`WebGLShadowMap:`,d,`has no shadow.`);continue}if(p.autoUpdate===!1&&p.needsUpdate===!1)continue;a.copy(p.mapSize);let y=p.getFrameExtents();a.multiply(y),s.copy(p.mapSize),(a.x>f||a.y>f)&&(a.x>f&&(s.x=Math.floor(f/y.x),a.x=s.x*y.x,p.mapSize.x=s.x),a.y>f&&(s.y=Math.floor(f/y.y),a.y=s.y*y.y,p.mapSize.y=s.y));let b=e.state.buffers.depth.getReversed();if(p.camera._reversedDepth=b,p.map===null||v===!0){if(p.map!==null&&(p.map.depthTexture!==null&&(p.map.depthTexture.dispose(),p.map.depthTexture=null),p.map.dispose()),this.type===3){if(d.isPointLight){B(`WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.`);continue}p.map=new Jt(a.x,a.y,{format:k,type:g,minFilter:o,magFilter:o,generateMipmaps:!1}),p.map.texture.name=d.name+`.shadowMap`,p.map.depthTexture=new hi(a.x,a.y,h),p.map.depthTexture.name=d.name+`.shadowMapDepth`,p.map.depthTexture.format=T,p.map.depthTexture.compareFunction=null,p.map.depthTexture.minFilter=r,p.map.depthTexture.magFilter=r}else d.isPointLight?(p.map=new Uo(a.x),p.map.depthTexture=new gi(a.x,m)):(p.map=new Jt(a.x,a.y),p.map.depthTexture=new hi(a.x,a.y,m)),p.map.depthTexture.name=d.name+`.shadowMap`,p.map.depthTexture.format=T,this.type===1?(p.map.depthTexture.compareFunction=b?518:515,p.map.depthTexture.minFilter=o,p.map.depthTexture.magFilter=o):(p.map.depthTexture.compareFunction=null,p.map.depthTexture.minFilter=r,p.map.depthTexture.magFilter=r);p.camera.updateProjectionMatrix()}p.map.isWebGLCubeRenderTarget!==!0&&(p.map.width!==a.x||p.map.height!==a.y)&&p.map.setSize(a.x,a.y);let x=p.map.isWebGLCubeRenderTarget?6:p.getViewportCount();d.isPointLight!==!0&&p.updateMatrices(d,l);for(let t=0;t<x;t++){let r=p.getCamera(t);if(d.isPointLight){let e=p.camera,n=p.matrix,r=d.distance||e.far;r!==e.far&&(e.far=r,e.updateProjectionMatrix()),ul.setFromMatrixPosition(d.matrixWorld),e.position.copy(ul),dl.copy(e.position),dl.add(sl[t]),e.up.copy(cl[t]),e.lookAt(dl),e.updateMatrixWorld(),n.makeTranslation(-ul.x,-ul.y,-ul.z),ll.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),p._frustum.setFromProjectionMatrix(ll,e.coordinateSystem,e.reversedDepth)}if(p.map.isWebGLCubeRenderTarget)e.setRenderTarget(p.map,t),e.clear();else{t===0&&(e.setRenderTarget(p.map),e.clear());let n=p.getViewport(t);c.set(s.x*n.x,s.y*n.y,s.x*n.z,s.y*n.w),_.viewport(c)}i=p.getFrustum(t),E(n,l,r,d,this.type)}p.isPointLightShadow!==!0&&this.type===3&&C(p,l),p.needsUpdate=!1}S=this.type,x.needsUpdate=!1,e.setRenderTarget(u,d,p)};function C(n,r){let i=t.update(b);_.defines.VSM_SAMPLES!==n.blurSamples&&(_.defines.VSM_SAMPLES=n.blurSamples,v.defines.VSM_SAMPLES=n.blurSamples,_.needsUpdate=!0,v.needsUpdate=!0),n.mapPass===null?n.mapPass=new Jt(a.x,a.y,{format:k,type:g}):(n.mapPass.width!==n.map.width||n.mapPass.height!==n.map.height)&&n.mapPass.setSize(n.map.width,n.map.height),_.uniforms.shadow_pass.value=n.map.depthTexture,_.uniforms.resolution.value.set(n.map.width,n.map.height),_.uniforms.radius.value=n.radius,e.setRenderTarget(n.mapPass),e.clear(),e.renderBufferDirect(r,null,i,_,b,null),v.uniforms.shadow_pass.value=n.mapPass.texture,v.uniforms.resolution.value.set(n.map.width,n.map.height),v.uniforms.radius.value=n.radius,e.setRenderTarget(n.map),e.clear(),e.renderBufferDirect(r,null,i,v,b,null)}function w(t,n,r,i){let a=null,o=r.isPointLight===!0?t.customDistanceMaterial:t.customDepthMaterial;if(o!==void 0)a=o;else if(a=r.isPointLight===!0?u:l,e.localClippingEnabled&&n.clipShadows===!0&&Array.isArray(n.clippingPlanes)&&n.clippingPlanes.length!==0||n.displacementMap&&n.displacementScale!==0||n.alphaMap&&n.alphaTest>0||n.map&&n.alphaTest>0||n.alphaToCoverage===!0){let e=a.uuid,t=n.uuid,r=d[e];r===void 0&&(r={},d[e]=r);let i=r[t];i===void 0&&(i=a.clone(),r[t]=i,n.addEventListener(`dispose`,D)),a=i}if(a.visible=n.visible,a.wireframe=n.wireframe,i===3?a.side=n.shadowSide===null?n.side:n.shadowSide:a.side=n.shadowSide===null?p[n.side]:n.shadowSide,a.alphaMap=n.alphaMap,a.alphaTest=n.alphaToCoverage===!0?.5:n.alphaTest,a.map=n.map,a.clipShadows=n.clipShadows,a.clippingPlanes=n.clippingPlanes,a.clipIntersection=n.clipIntersection,a.displacementMap=n.displacementMap,a.displacementScale=n.displacementScale,a.displacementBias=n.displacementBias,a.wireframeLinewidth=n.wireframeLinewidth,a.linewidth=n.linewidth,r.isPointLight===!0&&a.isMeshDistanceMaterial===!0){let t=e.properties.get(a);t.light=r}return a}function E(n,r,a,o,s){if(n.visible===!1)return;if(n.layers.test(r.layers)&&(n.isMesh||n.isLine||n.isPoints)&&(n.castShadow||n.receiveShadow&&s===3)&&(!n.frustumCulled||n.intersectsFrustum(i))){n.modelViewMatrix.multiplyMatrices(a.matrixWorldInverse,n.matrixWorld);let i=t.update(n),c=n.material;if(Array.isArray(c)){let t=i.groups;for(let l=0,u=t.length;l<u;l++){let u=t[l],d=c[u.materialIndex];if(d&&d.visible){let t=w(n,d,o,s);n.onBeforeShadow(e,n,r,a,i,t,u),e.renderBufferDirect(a,null,i,t,n,u),n.onAfterShadow(e,n,r,a,i,t,u)}}}else if(c.visible){let t=w(n,c,o,s);n.onBeforeShadow(e,n,r,a,i,t,null),e.renderBufferDirect(a,null,i,t,n,null),n.onAfterShadow(e,n,r,a,i,t,null)}}let c=n.children;for(let e=0,t=c.length;e<t;e++)E(c[e],r,a,o,s)}function D(e){e.target.removeEventListener(`dispose`,D);for(let t in d){let n=d[t],r=e.target.uuid;r in n&&(n[r].dispose(),delete n[r])}}}function pl(e,t){function n(){let t=!1,n=new Kt,r=null,i=new Kt(0,0,0,0);return{setMask:function(n){r!==n&&!t&&(e.colorMask(n,n,n,n),r=n)},setLocked:function(e){t=e},setClear:function(t,r,a,o,s){s===!0&&(t*=o,r*=o,a*=o),n.set(t,r,a,o),i.equals(n)===!1&&(e.clearColor(t,r,a,o),i.copy(n))},reset:function(){t=!1,r=null,i.set(-1,0,0,0)}}}function r(){let n=!1,r=!1,i=null,a=null,o=null;return{setReversed:function(e){if(r!==e){let n=t.get(`EXT_clip_control`);e?n.clipControlEXT(n.LOWER_LEFT_EXT,n.ZERO_TO_ONE_EXT):n.clipControlEXT(n.LOWER_LEFT_EXT,n.NEGATIVE_ONE_TO_ONE_EXT),r=e;let i=o;o=null,this.setClear(i)}},getReversed:function(){return r},setTest:function(t){t?I(e.DEPTH_TEST):ce(e.DEPTH_TEST)},setMask:function(t){i!==t&&!n&&(e.depthMask(t),i=t)},setFunc:function(t){if(r&&(t=et[t]),a!==t){switch(t){case 0:e.depthFunc(e.NEVER);break;case 1:e.depthFunc(e.ALWAYS);break;case 2:e.depthFunc(e.LESS);break;case 3:e.depthFunc(e.LEQUAL);break;case 4:e.depthFunc(e.EQUAL);break;case 5:e.depthFunc(e.GEQUAL);break;case 6:e.depthFunc(e.GREATER);break;case 7:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}a=t}},setLocked:function(e){n=e},setClear:function(t){o!==t&&(o=t,r&&(t=1-t),e.clearDepth(t))},reset:function(){n=!1,i=null,a=null,o=null,r=!1}}}function i(){let t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null;return{setTest:function(n){t||(n?I(e.STENCIL_TEST):ce(e.STENCIL_TEST))},setMask:function(r){n!==r&&!t&&(e.stencilMask(r),n=r)},setFunc:function(t,n,o){(r!==t||i!==n||a!==o)&&(e.stencilFunc(t,n,o),r=t,i=n,a=o)},setOp:function(t,n,r){(o!==t||s!==n||c!==r)&&(e.stencilOp(t,n,r),o=t,s=n,c=r)},setLocked:function(e){t=e},setClear:function(t){l!==t&&(e.clearStencil(t),l=t)},reset:function(){t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null}}}let a=new n,o=new r,s=new i,c=new WeakMap,l=new WeakMap,u={},d={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new K(0,0,0),T=0,E=!1,D=null,O=null,k=null,A=null,j=null,M=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS),N=!1,P=0,ee=e.getParameter(e.VERSION);ee.indexOf(`WebGL`)===-1?ee.indexOf(`OpenGL ES`)!==-1&&(P=parseFloat(/^OpenGL ES (\d)/.exec(ee)[1]),N=P>=2):(P=parseFloat(/^WebGL (\d)/.exec(ee)[1]),N=P>=1);let F=null,te={},ne=e.getParameter(e.SCISSOR_BOX),re=e.getParameter(e.VIEWPORT),ie=new Kt().fromArray(ne),ae=new Kt().fromArray(re);function oe(t,n,r,i){let a=new Uint8Array(4),o=e.createTexture();e.bindTexture(t,o),e.texParameteri(t,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(t,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let o=0;o<r;o++)t===e.TEXTURE_3D||t===e.TEXTURE_2D_ARRAY?e.texImage3D(n,0,e.RGBA,1,1,i,0,e.RGBA,e.UNSIGNED_BYTE,a):e.texImage2D(n+o,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,a);return o}let se={};se[e.TEXTURE_2D]=oe(e.TEXTURE_2D,e.TEXTURE_2D,1),se[e.TEXTURE_CUBE_MAP]=oe(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),se[e.TEXTURE_2D_ARRAY]=oe(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),se[e.TEXTURE_3D]=oe(e.TEXTURE_3D,e.TEXTURE_3D,1,1),a.setClear(0,0,0,1),o.setClear(1),s.setClear(0),I(e.DEPTH_TEST),o.setFunc(3),ge(!1),_e(1),I(e.CULL_FACE),me(0);function I(t){u[t]!==!0&&(e.enable(t),u[t]=!0)}function ce(t){u[t]!==!1&&(e.disable(t),u[t]=!1)}function le(t,n){return f[t]!==n&&(e.bindFramebuffer(t,n),f[t]=n,t===e.DRAW_FRAMEBUFFER&&(f[e.FRAMEBUFFER]=n),t===e.FRAMEBUFFER&&(f[e.DRAW_FRAMEBUFFER]=n),!0)}function ue(t,n){let r=m,i=!1;if(t){r=p.get(n),r===void 0&&(r=[],p.set(n,r));let a=t.textures;if(r.length!==a.length||r[0]!==e.COLOR_ATTACHMENT0){for(let t=0,n=a.length;t<n;t++)r[t]=e.COLOR_ATTACHMENT0+t;r.length=a.length,i=!0}}else r[0]!==e.BACK&&(r[0]=e.BACK,i=!0);i&&e.drawBuffers(r)}function de(t){return h!==t&&(e.useProgram(t),h=t,!0)}let fe={100:e.FUNC_ADD,101:e.FUNC_SUBTRACT,102:e.FUNC_REVERSE_SUBTRACT};fe[103]=e.MIN,fe[104]=e.MAX;let pe={200:e.ZERO,201:e.ONE,202:e.SRC_COLOR,204:e.SRC_ALPHA,210:e.SRC_ALPHA_SATURATE,208:e.DST_COLOR,206:e.DST_ALPHA,203:e.ONE_MINUS_SRC_COLOR,205:e.ONE_MINUS_SRC_ALPHA,209:e.ONE_MINUS_DST_COLOR,207:e.ONE_MINUS_DST_ALPHA,211:e.CONSTANT_COLOR,212:e.ONE_MINUS_CONSTANT_COLOR,213:e.CONSTANT_ALPHA,214:e.ONE_MINUS_CONSTANT_ALPHA};function me(t,n,r,i,a,o,s,c,l,u){if(t===0){g===!0&&(ce(e.BLEND),g=!1);return}if(g===!1&&(I(e.BLEND),g=!0),t!==5){if(t!==_||u!==E){if((v!==100||x!==100)&&(e.blendEquation(e.FUNC_ADD),v=100,x=100),u)switch(t){case 1:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFunc(e.ONE,e.ONE);break;case 3:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case 4:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:V(`WebGLState: Invalid blending: `,t)}else switch(t){case 1:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case 3:V(`WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true`);break;case 4:V(`WebGLState: MultiplyBlending requires material.premultipliedAlpha = true`);break;default:V(`WebGLState: Invalid blending: `,t)}y=null,b=null,S=null,C=null,w.set(0,0,0),T=0,_=t,E=u}return}a||=n,o||=r,s||=i,(n!==v||a!==x)&&(e.blendEquationSeparate(fe[n],fe[a]),v=n,x=a),(r!==y||i!==b||o!==S||s!==C)&&(e.blendFuncSeparate(pe[r],pe[i],pe[o],pe[s]),y=r,b=i,S=o,C=s),(c.equals(w)===!1||l!==T)&&(e.blendColor(c.r,c.g,c.b,l),w.copy(c),T=l),_=t,E=!1}function he(t,n){t.side===2?ce(e.CULL_FACE):I(e.CULL_FACE);let r=t.side===1;n&&(r=!r),ge(r),t.blending===1&&t.transparent===!1?me(0):me(t.blending,t.blendEquation,t.blendSrc,t.blendDst,t.blendEquationAlpha,t.blendSrcAlpha,t.blendDstAlpha,t.blendColor,t.blendAlpha,t.premultipliedAlpha),o.setFunc(t.depthFunc),o.setTest(t.depthTest),o.setMask(t.depthWrite),a.setMask(t.colorWrite);let i=t.stencilWrite;s.setTest(i),i&&(s.setMask(t.stencilWriteMask),s.setFunc(t.stencilFunc,t.stencilRef,t.stencilFuncMask),s.setOp(t.stencilFail,t.stencilZFail,t.stencilZPass)),ye(t.polygonOffset,t.polygonOffsetFactor,t.polygonOffsetUnits),t.alphaToCoverage===!0?I(e.SAMPLE_ALPHA_TO_COVERAGE):ce(e.SAMPLE_ALPHA_TO_COVERAGE)}function ge(t){D!==t&&(t?e.frontFace(e.CW):e.frontFace(e.CCW),D=t)}function _e(t){t===0?ce(e.CULL_FACE):(I(e.CULL_FACE),t!==O&&(t===1?e.cullFace(e.BACK):t===2?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))),O=t}function ve(t){t!==k&&(N&&e.lineWidth(t),k=t)}function ye(t,n,r){t?(I(e.POLYGON_OFFSET_FILL),(A!==n||j!==r)&&(A=n,j=r,o.getReversed()&&(n=-n),e.polygonOffset(n,r))):ce(e.POLYGON_OFFSET_FILL)}function be(t){t?I(e.SCISSOR_TEST):ce(e.SCISSOR_TEST)}function xe(t){t===void 0&&(t=e.TEXTURE0+M-1),F!==t&&(e.activeTexture(t),F=t)}function Se(t,n,r){r===void 0&&(r=F===null?e.TEXTURE0+M-1:F);let i=te[r];i===void 0&&(i={type:void 0,texture:void 0},te[r]=i),(i.type!==t||i.texture!==n)&&(F!==r&&(e.activeTexture(r),F=r),e.bindTexture(t,n||se[t]),i.type=t,i.texture=n)}function Ce(){let t=te[F];t!==void 0&&t.type!==void 0&&(e.bindTexture(t.type,null),t.type=void 0,t.texture=void 0)}function we(){try{e.compressedTexImage2D(...arguments)}catch(e){V(`WebGLState:`,e)}}function Te(){try{e.compressedTexImage3D(...arguments)}catch(e){V(`WebGLState:`,e)}}function Ee(){try{e.texSubImage2D(...arguments)}catch(e){V(`WebGLState:`,e)}}function De(){try{e.texSubImage3D(...arguments)}catch(e){V(`WebGLState:`,e)}}function Oe(){try{e.compressedTexSubImage2D(...arguments)}catch(e){V(`WebGLState:`,e)}}function ke(){try{e.compressedTexSubImage3D(...arguments)}catch(e){V(`WebGLState:`,e)}}function Ae(){try{e.texStorage2D(...arguments)}catch(e){V(`WebGLState:`,e)}}function je(){try{e.texStorage3D(...arguments)}catch(e){V(`WebGLState:`,e)}}function L(){try{e.texImage2D(...arguments)}catch(e){V(`WebGLState:`,e)}}function Me(){try{e.texImage3D(...arguments)}catch(e){V(`WebGLState:`,e)}}function Ne(t){return d[t]===void 0?e.getParameter(t):d[t]}function Pe(t,n){d[t]!==n&&(e.pixelStorei(t,n),d[t]=n)}function R(t){ie.equals(t)===!1&&(e.scissor(t.x,t.y,t.z,t.w),ie.copy(t))}function Fe(t){ae.equals(t)===!1&&(e.viewport(t.x,t.y,t.z,t.w),ae.copy(t))}function z(t,n){let r=l.get(n);r===void 0&&(r=new WeakMap,l.set(n,r));let i=r.get(t);i===void 0&&(i=e.getUniformBlockIndex(n,t.name),r.set(t,i))}function Ie(t,n){let r=l.get(n).get(t);c.get(n)!==r&&(e.uniformBlockBinding(n,r,t.__bindingPointIndex),c.set(n,r))}function Le(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),o.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),e.pixelStorei(e.PACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.BROWSER_DEFAULT_WEBGL),e.pixelStorei(e.PACK_ROW_LENGTH,0),e.pixelStorei(e.PACK_SKIP_PIXELS,0),e.pixelStorei(e.PACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_ROW_LENGTH,0),e.pixelStorei(e.UNPACK_IMAGE_HEIGHT,0),e.pixelStorei(e.UNPACK_SKIP_PIXELS,0),e.pixelStorei(e.UNPACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_SKIP_IMAGES,0),u={},d={},F=null,te={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new K(0,0,0),T=0,E=!1,D=null,O=null,k=null,A=null,j=null,ie.set(0,0,e.canvas.width,e.canvas.height),ae.set(0,0,e.canvas.width,e.canvas.height),a.reset(),o.reset(),s.reset()}return{buffers:{color:a,depth:o,stencil:s},enable:I,disable:ce,bindFramebuffer:le,drawBuffers:ue,useProgram:de,setBlending:me,setMaterial:he,setFlipSided:ge,setCullFace:_e,setLineWidth:ve,setPolygonOffset:ye,setScissorTest:be,activeTexture:xe,bindTexture:Se,unbindTexture:Ce,compressedTexImage2D:we,compressedTexImage3D:Te,texImage2D:L,texImage3D:Me,pixelStorei:Pe,getParameter:Ne,updateUBOMapping:z,uniformBlockBinding:Ie,texStorage2D:Ae,texStorage3D:je,texSubImage2D:Ee,texSubImage3D:De,compressedTexSubImage2D:Oe,compressedTexSubImage3D:ke,scissor:R,viewport:Fe,reset:Le}}function ml(l,u,d,f,p,m,h){let g=u.has(`WEBGL_multisampled_render_to_texture`)?u.get(`WEBGL_multisampled_render_to_texture`):null,_=typeof navigator>`u`?!1:/OculusBrowser/g.test(navigator.userAgent),v=new U,y=new WeakMap,b=new Set,x,S=new WeakMap,C=!1;try{C=typeof OffscreenCanvas<`u`&&new OffscreenCanvas(1,1).getContext(`2d`)!==null}catch{}function w(e,t){return C?new OffscreenCanvas(e,t):qe(`canvas`)}function T(e,t,n){let r=1,i=Ne(e);if((i.width>n||i.height>n)&&(r=n/Math.max(i.width,i.height)),r<1){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap||typeof VideoFrame<`u`&&e instanceof VideoFrame){let n=Math.floor(r*i.width),a=Math.floor(r*i.height);x===void 0&&(x=w(n,a));let o=t?w(n,a):x;return o.width=n,o.height=a,o.getContext(`2d`).drawImage(e,0,0,n,a),B(`WebGLRenderer: Texture has been resized from (`+i.width+`x`+i.height+`) to (`+n+`x`+a+`).`),o}return`data`in e&&B(`WebGLRenderer: Image in DataTexture is too big (`+i.width+`x`+i.height+`).`),e}return e}function D(e){return e.generateMipmaps}function O(e){l.generateMipmap(e)}function k(e){return e.isWebGLCubeRenderTarget?l.TEXTURE_CUBE_MAP:e.isWebGL3DRenderTarget?l.TEXTURE_3D:e.isWebGLArrayRenderTarget||e.isCompressedArrayTexture?l.TEXTURE_2D_ARRAY:l.TEXTURE_2D}function A(e,t,n,r,i,a=!1){if(e!==null){if(l[e]!==void 0)return l[e];B(`WebGLRenderer: Attempt to use non-existing WebGL internal format '`+e+`'`)}let o;r&&(o=u.get(`EXT_texture_norm16`),o||B(`WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension`));let s=t;if(t===l.RED&&(n===l.FLOAT&&(s=l.R32F),n===l.HALF_FLOAT&&(s=l.R16F),n===l.UNSIGNED_BYTE&&(s=l.R8),n===l.UNSIGNED_SHORT&&o&&(s=o.R16_EXT),n===l.SHORT&&o&&(s=o.R16_SNORM_EXT)),t===l.RED_INTEGER&&(n===l.UNSIGNED_BYTE&&(s=l.R8UI),n===l.UNSIGNED_SHORT&&(s=l.R16UI),n===l.UNSIGNED_INT&&(s=l.R32UI),n===l.BYTE&&(s=l.R8I),n===l.SHORT&&(s=l.R16I),n===l.INT&&(s=l.R32I)),t===l.RG&&(n===l.FLOAT&&(s=l.RG32F),n===l.HALF_FLOAT&&(s=l.RG16F),n===l.UNSIGNED_BYTE&&(s=l.RG8),n===l.UNSIGNED_SHORT&&o&&(s=o.RG16_EXT),n===l.SHORT&&o&&(s=o.RG16_SNORM_EXT)),t===l.RG_INTEGER&&(n===l.UNSIGNED_BYTE&&(s=l.RG8UI),n===l.UNSIGNED_SHORT&&(s=l.RG16UI),n===l.UNSIGNED_INT&&(s=l.RG32UI),n===l.BYTE&&(s=l.RG8I),n===l.SHORT&&(s=l.RG16I),n===l.INT&&(s=l.RG32I)),t===l.RGB_INTEGER&&(n===l.UNSIGNED_BYTE&&(s=l.RGB8UI),n===l.UNSIGNED_SHORT&&(s=l.RGB16UI),n===l.UNSIGNED_INT&&(s=l.RGB32UI),n===l.BYTE&&(s=l.RGB8I),n===l.SHORT&&(s=l.RGB16I),n===l.INT&&(s=l.RGB32I)),t===l.RGBA_INTEGER&&(n===l.UNSIGNED_BYTE&&(s=l.RGBA8UI),n===l.UNSIGNED_SHORT&&(s=l.RGBA16UI),n===l.UNSIGNED_INT&&(s=l.RGBA32UI),n===l.BYTE&&(s=l.RGBA8I),n===l.SHORT&&(s=l.RGBA16I),n===l.INT&&(s=l.RGBA32I)),t===l.RGB&&(n===l.UNSIGNED_SHORT&&o&&(s=o.RGB16_EXT),n===l.SHORT&&o&&(s=o.RGB16_SNORM_EXT),n===l.UNSIGNED_INT_5_9_9_9_REV&&(s=l.RGB9_E5),n===l.UNSIGNED_INT_10F_11F_11F_REV&&(s=l.R11F_G11F_B10F)),t===l.RGBA){let e=a?Re:Ft.getTransfer(i);n===l.FLOAT&&(s=l.RGBA32F),n===l.HALF_FLOAT&&(s=l.RGBA16F),n===l.UNSIGNED_BYTE&&(s=e===`srgb`?l.SRGB8_ALPHA8:l.RGBA8),n===l.UNSIGNED_SHORT&&o&&(s=o.RGBA16_EXT),n===l.SHORT&&o&&(s=o.RGBA16_SNORM_EXT),n===l.UNSIGNED_SHORT_4_4_4_4&&(s=l.RGBA4),n===l.UNSIGNED_SHORT_5_5_5_1&&(s=l.RGB5_A1)}return(s===l.R16F||s===l.R32F||s===l.RG16F||s===l.RG32F||s===l.RGBA16F||s===l.RGBA32F)&&u.get(`EXT_color_buffer_float`),s}function j(e,t){let n;return e?t===null||t===1014||t===1020?n=l.DEPTH24_STENCIL8:t===1015?n=l.DEPTH32F_STENCIL8:t===1012&&(n=l.DEPTH24_STENCIL8,B(`DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.`)):t===null||t===1014||t===1020?n=l.DEPTH_COMPONENT24:t===1015?n=l.DEPTH_COMPONENT32F:t===1012&&(n=l.DEPTH_COMPONENT16),n}function M(e,t){return D(e)===!0||e.isFramebufferTexture&&e.minFilter!==1003&&e.minFilter!==1006?Math.log2(Math.max(t.width,t.height))+1:e.mipmaps!==void 0&&e.mipmaps.length>0?e.mipmaps.length:e.isCompressedTexture&&Array.isArray(e.image)?t.mipmaps.length:1}function N(e){let t=e.target;t.removeEventListener(`dispose`,N),ee(t),t.isVideoTexture&&y.delete(t),t.isHTMLTexture&&b.delete(t)}function P(e){let t=e.target;t.removeEventListener(`dispose`,P),te(t)}function ee(e){let t=f.get(e);if(t.__webglInit===void 0)return;let n=e.source,r=S.get(n);if(r){let i=r[t.__cacheKey];i.usedTimes--,i.usedTimes===0&&F(e),Object.keys(r).length===0&&S.delete(n)}f.remove(e)}function F(e){let t=f.get(e);l.deleteTexture(t.__webglTexture);let n=e.source,r=S.get(n);delete r[t.__cacheKey],h.memory.textures--}function te(e){let t=f.get(e);if(e.depthTexture&&(e.depthTexture.dispose(),f.remove(e.depthTexture)),e.isWebGLCubeRenderTarget)for(let e=0;e<6;e++){if(Array.isArray(t.__webglFramebuffer[e]))for(let n=0;n<t.__webglFramebuffer[e].length;n++)l.deleteFramebuffer(t.__webglFramebuffer[e][n]);else l.deleteFramebuffer(t.__webglFramebuffer[e]);t.__webglDepthbuffer&&l.deleteRenderbuffer(t.__webglDepthbuffer[e])}else{if(Array.isArray(t.__webglFramebuffer))for(let e=0;e<t.__webglFramebuffer.length;e++)l.deleteFramebuffer(t.__webglFramebuffer[e]);else l.deleteFramebuffer(t.__webglFramebuffer);if(t.__webglDepthbuffer&&l.deleteRenderbuffer(t.__webglDepthbuffer),t.__webglMultisampledFramebuffer&&l.deleteFramebuffer(t.__webglMultisampledFramebuffer),t.__webglColorRenderbuffer)for(let e=0;e<t.__webglColorRenderbuffer.length;e++)t.__webglColorRenderbuffer[e]&&l.deleteRenderbuffer(t.__webglColorRenderbuffer[e]);t.__webglDepthRenderbuffer&&l.deleteRenderbuffer(t.__webglDepthRenderbuffer)}let n=e.textures;for(let e=0,t=n.length;e<t;e++){let t=f.get(n[e]);t.__webglTexture&&(l.deleteTexture(t.__webglTexture),h.memory.textures--),f.remove(n[e])}f.remove(e)}let ne=0;function re(){ne=0}function ie(){return ne}function ae(e){ne=e}function oe(){let e=ne;return e>=p.maxTextures&&B(`WebGLTextures: Trying to use `+(e+1)+` texture units while this GPU supports only `+p.maxTextures),ne+=1,e}function se(e){let t=[];return t.push(e.wrapS),t.push(e.wrapT),t.push(e.wrapR||0),t.push(e.magFilter),t.push(e.minFilter),t.push(e.anisotropy),t.push(e.internalFormat),t.push(e.format),t.push(e.type),t.push(e.generateMipmaps),t.push(e.premultiplyAlpha),t.push(e.flipY),t.push(e.unpackAlignment),t.push(e.colorSpace),t.join()}function I(e,t){let n=f.get(e);if(e.isVideoTexture&&L(e),e.isRenderTargetTexture===!1&&e.isExternalTexture!==!0&&e.version>0&&n.__version!==e.version){let r=e.image;if(r===null)B(`WebGLRenderer: Texture marked for update but no image data found.`);else if(r.complete===!1)B(`WebGLRenderer: Texture marked for update but image is incomplete`);else{ve(n,e,t);return}}else e.isExternalTexture&&(n.__webglTexture=e.sourceTexture?e.sourceTexture:null);d.bindTexture(l.TEXTURE_2D,n.__webglTexture,l.TEXTURE0+t)}function ce(e,t){let n=f.get(e);if(e.isRenderTargetTexture===!1&&e.version>0&&n.__version!==e.version){ve(n,e,t);return}e.isExternalTexture&&(n.__webglTexture=e.sourceTexture?e.sourceTexture:null),d.bindTexture(l.TEXTURE_2D_ARRAY,n.__webglTexture,l.TEXTURE0+t)}function le(e,t){let n=f.get(e);if(e.isRenderTargetTexture===!1&&e.version>0&&n.__version!==e.version){ve(n,e,t);return}d.bindTexture(l.TEXTURE_3D,n.__webglTexture,l.TEXTURE0+t)}function ue(e,t){let n=f.get(e);if(e.isCubeDepthTexture!==!0&&e.version>0&&n.__version!==e.version){ye(n,e,t);return}d.bindTexture(l.TEXTURE_CUBE_MAP,n.__webglTexture,l.TEXTURE0+t)}let de={[e]:l.REPEAT,[t]:l.CLAMP_TO_EDGE,[n]:l.MIRRORED_REPEAT},fe={[r]:l.NEAREST,[i]:l.NEAREST_MIPMAP_NEAREST,[a]:l.NEAREST_MIPMAP_LINEAR,[o]:l.LINEAR,[s]:l.LINEAR_MIPMAP_NEAREST,[c]:l.LINEAR_MIPMAP_LINEAR},pe={512:l.NEVER,519:l.ALWAYS,513:l.LESS,515:l.LEQUAL,514:l.EQUAL,518:l.GEQUAL,516:l.GREATER,517:l.NOTEQUAL};function me(e,t){if(t.type===1015&&u.has(`OES_texture_float_linear`)===!1&&(t.magFilter===1006||t.magFilter===1007||t.magFilter===1005||t.magFilter===1008||t.minFilter===1006||t.minFilter===1007||t.minFilter===1005||t.minFilter===1008)&&B(`WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.`),l.texParameteri(e,l.TEXTURE_WRAP_S,de[t.wrapS]),l.texParameteri(e,l.TEXTURE_WRAP_T,de[t.wrapT]),(e===l.TEXTURE_3D||e===l.TEXTURE_2D_ARRAY)&&l.texParameteri(e,l.TEXTURE_WRAP_R,de[t.wrapR]),l.texParameteri(e,l.TEXTURE_MAG_FILTER,fe[t.magFilter]),l.texParameteri(e,l.TEXTURE_MIN_FILTER,fe[t.minFilter]),t.compareFunction&&(l.texParameteri(e,l.TEXTURE_COMPARE_MODE,l.COMPARE_REF_TO_TEXTURE),l.texParameteri(e,l.TEXTURE_COMPARE_FUNC,pe[t.compareFunction])),u.has(`EXT_texture_filter_anisotropic`)===!0){if(t.magFilter===1003||t.minFilter!==1005&&t.minFilter!==1008||t.type===1015&&u.has(`OES_texture_float_linear`)===!1)return;if(t.anisotropy>1||f.get(t).__currentAnisotropy){let n=u.get(`EXT_texture_filter_anisotropic`);l.texParameterf(e,n.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(t.anisotropy,p.getMaxAnisotropy())),f.get(t).__currentAnisotropy=t.anisotropy}}}function he(e,t){let n=!1;e.__webglInit===void 0&&(e.__webglInit=!0,t.addEventListener(`dispose`,N));let r=t.source,i=S.get(r);i===void 0&&(i={},S.set(r,i));let a=se(t);if(a!==e.__cacheKey){i[a]===void 0&&(i[a]={texture:l.createTexture(),usedTimes:0},h.memory.textures++,n=!0),i[a].usedTimes++;let r=i[e.__cacheKey];r!==void 0&&(i[e.__cacheKey].usedTimes--,r.usedTimes===0&&F(t)),e.__cacheKey=a,e.__webglTexture=i[a].texture}return n}function ge(e,t,n){return Math.floor(Math.floor(e/n)/t)}function _e(e,t,n,r){let i=e.updateRanges;if(i.length===0)d.texSubImage2D(l.TEXTURE_2D,0,0,0,t.width,t.height,n,r,t.data);else{i.sort((e,t)=>e.start-t.start);let a=0;for(let e=1;e<i.length;e++){let n=i[a],r=i[e],o=n.start+n.count,s=ge(r.start,t.width,4),c=ge(n.start,t.width,4);r.start<=o+1&&s===c&&ge(r.start+r.count-1,t.width,4)===s?n.count=Math.max(n.count,r.start+r.count-n.start):(++a,i[a]=r)}i.length=a+1;let o=d.getParameter(l.UNPACK_ROW_LENGTH),s=d.getParameter(l.UNPACK_SKIP_PIXELS),c=d.getParameter(l.UNPACK_SKIP_ROWS);d.pixelStorei(l.UNPACK_ROW_LENGTH,t.width);for(let e=0,a=i.length;e<a;e++){let a=i[e],o=Math.floor(a.start/4),s=Math.ceil(a.count/4),c=o%t.width,u=Math.floor(o/t.width),f=s;d.pixelStorei(l.UNPACK_SKIP_PIXELS,c),d.pixelStorei(l.UNPACK_SKIP_ROWS,u),d.texSubImage2D(l.TEXTURE_2D,0,c,u,f,1,n,r,t.data)}e.clearUpdateRanges(),d.pixelStorei(l.UNPACK_ROW_LENGTH,o),d.pixelStorei(l.UNPACK_SKIP_PIXELS,s),d.pixelStorei(l.UNPACK_SKIP_ROWS,c)}}function ve(e,t,n){let r=l.TEXTURE_2D;(t.isDataArrayTexture||t.isCompressedArrayTexture)&&(r=l.TEXTURE_2D_ARRAY),t.isData3DTexture&&(r=l.TEXTURE_3D);let i=he(e,t),a=t.source;d.bindTexture(r,e.__webglTexture,l.TEXTURE0+n);let o=f.get(a);if(a.version!==o.__version||i===!0){if(d.activeTexture(l.TEXTURE0+n),!(typeof ImageBitmap<`u`&&t.image instanceof ImageBitmap)){let e=Ft.getPrimaries(Ft.workingColorSpace),n=t.colorSpace===``?null:Ft.getPrimaries(t.colorSpace),r=t.colorSpace===``||e===n?l.NONE:l.BROWSER_DEFAULT_WEBGL;d.pixelStorei(l.UNPACK_FLIP_Y_WEBGL,t.flipY),d.pixelStorei(l.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),d.pixelStorei(l.UNPACK_COLORSPACE_CONVERSION_WEBGL,r)}d.pixelStorei(l.UNPACK_ALIGNMENT,t.unpackAlignment);let e=T(t.image,!1,p.maxTextureSize);e=Me(t,e);let s=m.convert(t.format,t.colorSpace),c=m.convert(t.type),u=A(t.internalFormat,s,c,t.normalized,t.colorSpace,t.isVideoTexture);me(r,t);let f,h=t.mipmaps,g=t.isVideoTexture!==!0,_=o.__version===void 0||i===!0,v=a.dataReady,y=M(t,e);if(t.isDepthTexture)u=j(t.format===E,t.type),_&&(g?d.texStorage2D(l.TEXTURE_2D,1,u,e.width,e.height):d.texImage2D(l.TEXTURE_2D,0,u,e.width,e.height,0,s,c,null));else if(t.isDataTexture){if(h.length>0){g&&_&&d.texStorage2D(l.TEXTURE_2D,y,u,h[0].width,h[0].height);for(let e=0,t=h.length;e<t;e++)f=h[e],g?v&&d.texSubImage2D(l.TEXTURE_2D,e,0,0,f.width,f.height,s,c,f.data):d.texImage2D(l.TEXTURE_2D,e,u,f.width,f.height,0,s,c,f.data);t.generateMipmaps=!1}else g?(_&&d.texStorage2D(l.TEXTURE_2D,y,u,e.width,e.height),v&&_e(t,e,s,c)):d.texImage2D(l.TEXTURE_2D,0,u,e.width,e.height,0,s,c,e.data)}else if(t.isCompressedTexture){if(t.isCompressedArrayTexture){g&&_&&d.texStorage3D(l.TEXTURE_2D_ARRAY,y,u,h[0].width,h[0].height,e.depth);for(let n=0,r=h.length;n<r;n++)if(f=h[n],t.format!==1023){if(s!==null){if(g){if(v){if(t.layerUpdates.size>0){let e=so(f.width,f.height,t.format,t.type);for(let r of t.layerUpdates){let t=f.data.subarray(r*e/f.data.BYTES_PER_ELEMENT,(r+1)*e/f.data.BYTES_PER_ELEMENT);d.compressedTexSubImage3D(l.TEXTURE_2D_ARRAY,n,0,0,r,f.width,f.height,1,s,t)}}else d.compressedTexSubImage3D(l.TEXTURE_2D_ARRAY,n,0,0,0,f.width,f.height,e.depth,s,f.data)}}else d.compressedTexImage3D(l.TEXTURE_2D_ARRAY,n,u,f.width,f.height,e.depth,0,f.data,0,0)}else B(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`)}else g?v&&d.texSubImage3D(l.TEXTURE_2D_ARRAY,n,0,0,0,f.width,f.height,e.depth,s,c,f.data):d.texImage3D(l.TEXTURE_2D_ARRAY,n,u,f.width,f.height,e.depth,0,s,c,f.data);t.layerUpdates.size>0&&t.clearLayerUpdates()}else{g&&_&&d.texStorage2D(l.TEXTURE_2D,y,u,h[0].width,h[0].height);for(let e=0,n=h.length;e<n;e++)f=h[e],t.format===1023?g?v&&d.texSubImage2D(l.TEXTURE_2D,e,0,0,f.width,f.height,s,c,f.data):d.texImage2D(l.TEXTURE_2D,e,u,f.width,f.height,0,s,c,f.data):s===null?B(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`):g?v&&d.compressedTexSubImage2D(l.TEXTURE_2D,e,0,0,f.width,f.height,s,f.data):d.compressedTexImage2D(l.TEXTURE_2D,e,u,f.width,f.height,0,f.data)}}else if(t.isDataArrayTexture){if(g){if(_&&d.texStorage3D(l.TEXTURE_2D_ARRAY,y,u,e.width,e.height,e.depth),v){if(t.layerUpdates.size>0){let n=so(e.width,e.height,t.format,t.type);for(let r of t.layerUpdates){let t=e.data.subarray(r*n/e.data.BYTES_PER_ELEMENT,(r+1)*n/e.data.BYTES_PER_ELEMENT);d.texSubImage3D(l.TEXTURE_2D_ARRAY,0,0,0,r,e.width,e.height,1,s,c,t)}t.clearLayerUpdates()}else d.texSubImage3D(l.TEXTURE_2D_ARRAY,0,0,0,0,e.width,e.height,e.depth,s,c,e.data)}}else d.texImage3D(l.TEXTURE_2D_ARRAY,0,u,e.width,e.height,e.depth,0,s,c,e.data)}else if(t.isData3DTexture)g?(_&&d.texStorage3D(l.TEXTURE_3D,y,u,e.width,e.height,e.depth),v&&d.texSubImage3D(l.TEXTURE_3D,0,0,0,0,e.width,e.height,e.depth,s,c,e.data)):d.texImage3D(l.TEXTURE_3D,0,u,e.width,e.height,e.depth,0,s,c,e.data);else if(t.isFramebufferTexture){if(_){if(g)d.texStorage2D(l.TEXTURE_2D,y,u,e.width,e.height);else{let t=e.width,n=e.height;for(let e=0;e<y;e++)d.texImage2D(l.TEXTURE_2D,e,u,t,n,0,s,c,null),t>>=1,n>>=1}}}else if(t.isHTMLTexture){if(`texElementImage2D`in l){let n=l.canvas;if(n.hasAttribute(`layoutsubtree`)||n.setAttribute(`layoutsubtree`,`true`),e.parentNode!==n){n.appendChild(e),b.add(t),n.onpaint=e=>{let t=e.changedElements;for(let e of b)t.includes(e.image)&&(e.needsUpdate=!0)},n.requestPaint();return}if(l.texElementImage2D.length===3)l.texElementImage2D(l.TEXTURE_2D,l.RGBA8,e);else{let t=l.RGBA,n=l.RGBA,r=l.UNSIGNED_BYTE;l.texElementImage2D(l.TEXTURE_2D,0,t,n,r,e)}l.texParameteri(l.TEXTURE_2D,l.TEXTURE_MIN_FILTER,l.LINEAR),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_WRAP_S,l.CLAMP_TO_EDGE),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_WRAP_T,l.CLAMP_TO_EDGE)}}else if(h.length>0){if(g&&_){let e=Ne(h[0]);d.texStorage2D(l.TEXTURE_2D,y,u,e.width,e.height)}for(let e=0,t=h.length;e<t;e++)f=h[e],g?v&&d.texSubImage2D(l.TEXTURE_2D,e,0,0,s,c,f):d.texImage2D(l.TEXTURE_2D,e,u,s,c,f);t.generateMipmaps=!1}else if(g){if(_){let t=Ne(e);d.texStorage2D(l.TEXTURE_2D,y,u,t.width,t.height)}v&&d.texSubImage2D(l.TEXTURE_2D,0,0,0,s,c,e)}else d.texImage2D(l.TEXTURE_2D,0,u,s,c,e);D(t)&&O(r),o.__version=a.version,t.onUpdate&&t.onUpdate(t)}e.__version=t.version}function ye(e,t,n){if(t.image.length!==6)return;let r=he(e,t),i=t.source;d.bindTexture(l.TEXTURE_CUBE_MAP,e.__webglTexture,l.TEXTURE0+n);let a=f.get(i);if(i.version!==a.__version||r===!0){d.activeTexture(l.TEXTURE0+n);let e=Ft.getPrimaries(Ft.workingColorSpace),o=t.colorSpace===``?null:Ft.getPrimaries(t.colorSpace),s=t.colorSpace===``||e===o?l.NONE:l.BROWSER_DEFAULT_WEBGL;d.pixelStorei(l.UNPACK_FLIP_Y_WEBGL,t.flipY),d.pixelStorei(l.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),d.pixelStorei(l.UNPACK_ALIGNMENT,t.unpackAlignment),d.pixelStorei(l.UNPACK_COLORSPACE_CONVERSION_WEBGL,s);let c=t.isCompressedTexture||t.image[0].isCompressedTexture,u=t.image[0]&&t.image[0].isDataTexture,f=[];for(let e=0;e<6;e++)!c&&!u?f[e]=T(t.image[e],!0,p.maxCubemapSize):f[e]=u?t.image[e].image:t.image[e],f[e]=Me(t,f[e]);let h=f[0],g=m.convert(t.format,t.colorSpace),_=m.convert(t.type),v=A(t.internalFormat,g,_,t.normalized,t.colorSpace),y=t.isVideoTexture!==!0,b=a.__version===void 0||r===!0,x=i.dataReady,S=M(t,h);me(l.TEXTURE_CUBE_MAP,t);let C;if(c){y&&b&&d.texStorage2D(l.TEXTURE_CUBE_MAP,S,v,h.width,h.height);for(let e=0;e<6;e++){C=f[e].mipmaps;for(let n=0;n<C.length;n++){let r=C[n];t.format===1023?y?x&&d.texSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,n,0,0,r.width,r.height,g,_,r.data):d.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,n,v,r.width,r.height,0,g,_,r.data):g===null?B(`WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()`):y?x&&d.compressedTexSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,n,0,0,r.width,r.height,g,r.data):d.compressedTexImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,n,v,r.width,r.height,0,r.data)}}}else{if(C=t.mipmaps,y&&b){C.length>0&&S++;let e=Ne(f[0]);d.texStorage2D(l.TEXTURE_CUBE_MAP,S,v,e.width,e.height)}for(let e=0;e<6;e++)if(u){y?x&&d.texSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,0,0,0,f[e].width,f[e].height,g,_,f[e].data):d.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,0,v,f[e].width,f[e].height,0,g,_,f[e].data);for(let t=0;t<C.length;t++){let n=C[t].image[e].image;y?x&&d.texSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,t+1,0,0,n.width,n.height,g,_,n.data):d.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,t+1,v,n.width,n.height,0,g,_,n.data)}}else{y?x&&d.texSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,0,0,0,g,_,f[e]):d.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,0,v,g,_,f[e]);for(let t=0;t<C.length;t++){let n=C[t];y?x&&d.texSubImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,t+1,0,0,g,_,n.image[e]):d.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+e,t+1,v,g,_,n.image[e])}}}D(t)&&O(l.TEXTURE_CUBE_MAP),a.__version=i.version,t.onUpdate&&t.onUpdate(t)}e.__version=t.version}function be(e,t,n,r,i,a){let o=m.convert(n.format,n.colorSpace),s=m.convert(n.type),c=A(n.internalFormat,o,s,n.normalized,n.colorSpace),u=f.get(t),p=f.get(n);if(p.__renderTarget=t,!u.__hasExternalTextures){let e=Math.max(1,t.width>>a),n=Math.max(1,t.height>>a);i===l.TEXTURE_3D||i===l.TEXTURE_2D_ARRAY?d.texImage3D(i,a,c,e,n,t.depth,0,o,s,null):d.texImage2D(i,a,c,e,n,0,o,s,null)}d.bindFramebuffer(l.FRAMEBUFFER,e),je(t)?g.framebufferTexture2DMultisampleEXT(l.FRAMEBUFFER,r,i,p.__webglTexture,0,Ae(t)):(i===l.TEXTURE_2D||i>=l.TEXTURE_CUBE_MAP_POSITIVE_X&&i<=l.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&l.framebufferTexture2D(l.FRAMEBUFFER,r,i,p.__webglTexture,a),d.bindFramebuffer(l.FRAMEBUFFER,null)}function xe(e,t,n){if(l.bindRenderbuffer(l.RENDERBUFFER,e),t.depthBuffer){let r=t.depthTexture,i=r&&r.isDepthTexture?r.type:null,a=j(t.stencilBuffer,i),o=t.stencilBuffer?l.DEPTH_STENCIL_ATTACHMENT:l.DEPTH_ATTACHMENT;je(t)?g.renderbufferStorageMultisampleEXT(l.RENDERBUFFER,Ae(t),a,t.width,t.height):n?l.renderbufferStorageMultisample(l.RENDERBUFFER,Ae(t),a,t.width,t.height):l.renderbufferStorage(l.RENDERBUFFER,a,t.width,t.height),l.framebufferRenderbuffer(l.FRAMEBUFFER,o,l.RENDERBUFFER,e)}else{let e=t.textures;for(let r=0;r<e.length;r++){let i=e[r],a=m.convert(i.format,i.colorSpace),o=m.convert(i.type),s=A(i.internalFormat,a,o,i.normalized,i.colorSpace);je(t)?g.renderbufferStorageMultisampleEXT(l.RENDERBUFFER,Ae(t),s,t.width,t.height):n?l.renderbufferStorageMultisample(l.RENDERBUFFER,Ae(t),s,t.width,t.height):l.renderbufferStorage(l.RENDERBUFFER,s,t.width,t.height)}}l.bindRenderbuffer(l.RENDERBUFFER,null)}function Se(e,t,n){let r=t.isWebGLCubeRenderTarget===!0;if(d.bindFramebuffer(l.FRAMEBUFFER,e),!(t.depthTexture&&t.depthTexture.isDepthTexture))throw Error(`THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.`);let i=f.get(t.depthTexture);if(i.__renderTarget=t,(!i.__webglTexture||t.depthTexture.image.width!==t.width||t.depthTexture.image.height!==t.height)&&(t.depthTexture.image.width=t.width,t.depthTexture.image.height=t.height,t.depthTexture.needsUpdate=!0),r){if(i.__webglInit===void 0&&(i.__webglInit=!0,t.depthTexture.addEventListener(`dispose`,N)),i.__webglTexture===void 0){i.__webglTexture=l.createTexture(),d.bindTexture(l.TEXTURE_CUBE_MAP,i.__webglTexture),me(l.TEXTURE_CUBE_MAP,t.depthTexture);let e=m.convert(t.depthTexture.format),n=m.convert(t.depthTexture.type),r;t.depthTexture.format===1026?r=l.DEPTH_COMPONENT24:t.depthTexture.format===1027&&(r=l.DEPTH24_STENCIL8);for(let i=0;i<6;i++)l.texImage2D(l.TEXTURE_CUBE_MAP_POSITIVE_X+i,0,r,t.width,t.height,0,e,n,null)}}else I(t.depthTexture,0);let a=i.__webglTexture,o=Ae(t),s=r?l.TEXTURE_CUBE_MAP_POSITIVE_X+n:l.TEXTURE_2D,c=t.depthTexture.format===1027?l.DEPTH_STENCIL_ATTACHMENT:l.DEPTH_ATTACHMENT;if(t.depthTexture.format===1026)je(t)?g.framebufferTexture2DMultisampleEXT(l.FRAMEBUFFER,c,s,a,0,o):l.framebufferTexture2D(l.FRAMEBUFFER,c,s,a,0);else if(t.depthTexture.format===1027)je(t)?g.framebufferTexture2DMultisampleEXT(l.FRAMEBUFFER,c,s,a,0,o):l.framebufferTexture2D(l.FRAMEBUFFER,c,s,a,0);else throw Error(`THREE.WebGLTextures: Unknown depthTexture format.`)}function Ce(e){let t=f.get(e),n=e.isWebGLCubeRenderTarget===!0;if(t.__boundDepthTexture!==e.depthTexture){let n=e.depthTexture;if(t.__depthDisposeCallback&&t.__depthDisposeCallback(),n){let e=()=>{delete t.__boundDepthTexture,delete t.__depthDisposeCallback,n.removeEventListener(`dispose`,e)};n.addEventListener(`dispose`,e),t.__depthDisposeCallback=e}t.__boundDepthTexture=n}if(e.depthTexture&&!t.__autoAllocateDepthBuffer){if(n)for(let n=0;n<6;n++)Se(t.__webglFramebuffer[n],e,n);else{let n=e.texture.mipmaps;n&&n.length>0?Se(t.__webglFramebuffer[0],e,0):Se(t.__webglFramebuffer,e,0)}}else if(n){t.__webglDepthbuffer=[];for(let n=0;n<6;n++)if(d.bindFramebuffer(l.FRAMEBUFFER,t.__webglFramebuffer[n]),t.__webglDepthbuffer[n]===void 0)t.__webglDepthbuffer[n]=l.createRenderbuffer(),xe(t.__webglDepthbuffer[n],e,!1);else{let r=e.stencilBuffer?l.DEPTH_STENCIL_ATTACHMENT:l.DEPTH_ATTACHMENT,i=t.__webglDepthbuffer[n];l.bindRenderbuffer(l.RENDERBUFFER,i),l.framebufferRenderbuffer(l.FRAMEBUFFER,r,l.RENDERBUFFER,i)}}else{let n=e.texture.mipmaps;if(n&&n.length>0?d.bindFramebuffer(l.FRAMEBUFFER,t.__webglFramebuffer[0]):d.bindFramebuffer(l.FRAMEBUFFER,t.__webglFramebuffer),t.__webglDepthbuffer===void 0)t.__webglDepthbuffer=l.createRenderbuffer(),xe(t.__webglDepthbuffer,e,!1);else{let n=e.stencilBuffer?l.DEPTH_STENCIL_ATTACHMENT:l.DEPTH_ATTACHMENT,r=t.__webglDepthbuffer;l.bindRenderbuffer(l.RENDERBUFFER,r),l.framebufferRenderbuffer(l.FRAMEBUFFER,n,l.RENDERBUFFER,r)}}d.bindFramebuffer(l.FRAMEBUFFER,null)}function we(e,t,n){let r=f.get(e);t!==void 0&&be(r.__webglFramebuffer,e,e.texture,l.COLOR_ATTACHMENT0,l.TEXTURE_2D,0),n!==void 0&&Ce(e)}function Te(e){let t=e.texture,n=f.get(e),r=f.get(t);e.addEventListener(`dispose`,P);let i=e.textures,a=e.isWebGLCubeRenderTarget===!0,o=i.length>1;if(o||(r.__webglTexture===void 0&&(r.__webglTexture=l.createTexture()),r.__version=t.version,h.memory.textures++),a){n.__webglFramebuffer=[];for(let e=0;e<6;e++)if(t.mipmaps&&t.mipmaps.length>0){n.__webglFramebuffer[e]=[];for(let r=0;r<t.mipmaps.length;r++)n.__webglFramebuffer[e][r]=l.createFramebuffer()}else n.__webglFramebuffer[e]=l.createFramebuffer()}else{if(t.mipmaps&&t.mipmaps.length>0){n.__webglFramebuffer=[];for(let e=0;e<t.mipmaps.length;e++)n.__webglFramebuffer[e]=l.createFramebuffer()}else n.__webglFramebuffer=l.createFramebuffer();if(o)for(let e=0,t=i.length;e<t;e++){let t=f.get(i[e]);t.__webglTexture===void 0&&(t.__webglTexture=l.createTexture(),h.memory.textures++)}if(e.samples>0&&je(e)===!1){n.__webglMultisampledFramebuffer=l.createFramebuffer(),n.__webglColorRenderbuffer=[],d.bindFramebuffer(l.FRAMEBUFFER,n.__webglMultisampledFramebuffer);for(let t=0;t<i.length;t++){let r=i[t];n.__webglColorRenderbuffer[t]=l.createRenderbuffer(),l.bindRenderbuffer(l.RENDERBUFFER,n.__webglColorRenderbuffer[t]);let a=m.convert(r.format,r.colorSpace),o=m.convert(r.type),s=A(r.internalFormat,a,o,r.normalized,r.colorSpace,e.isXRRenderTarget===!0),c=Ae(e);l.renderbufferStorageMultisample(l.RENDERBUFFER,c,s,e.width,e.height),l.framebufferRenderbuffer(l.FRAMEBUFFER,l.COLOR_ATTACHMENT0+t,l.RENDERBUFFER,n.__webglColorRenderbuffer[t])}l.bindRenderbuffer(l.RENDERBUFFER,null),e.depthBuffer&&(n.__webglDepthRenderbuffer=l.createRenderbuffer(),xe(n.__webglDepthRenderbuffer,e,!0)),d.bindFramebuffer(l.FRAMEBUFFER,null)}}if(a){d.bindTexture(l.TEXTURE_CUBE_MAP,r.__webglTexture),me(l.TEXTURE_CUBE_MAP,t);for(let r=0;r<6;r++)if(t.mipmaps&&t.mipmaps.length>0)for(let i=0;i<t.mipmaps.length;i++)be(n.__webglFramebuffer[r][i],e,t,l.COLOR_ATTACHMENT0,l.TEXTURE_CUBE_MAP_POSITIVE_X+r,i);else be(n.__webglFramebuffer[r],e,t,l.COLOR_ATTACHMENT0,l.TEXTURE_CUBE_MAP_POSITIVE_X+r,0);D(t)&&O(l.TEXTURE_CUBE_MAP),d.unbindTexture()}else if(o){for(let t=0,r=i.length;t<r;t++){let r=i[t],a=f.get(r),o=l.TEXTURE_2D;(e.isWebGL3DRenderTarget||e.isWebGLArrayRenderTarget)&&(o=e.isWebGL3DRenderTarget?l.TEXTURE_3D:l.TEXTURE_2D_ARRAY),d.bindTexture(o,a.__webglTexture),me(o,r),be(n.__webglFramebuffer,e,r,l.COLOR_ATTACHMENT0+t,o,0),D(r)&&O(o)}d.unbindTexture()}else{let i=l.TEXTURE_2D;if((e.isWebGL3DRenderTarget||e.isWebGLArrayRenderTarget)&&(i=e.isWebGL3DRenderTarget?l.TEXTURE_3D:l.TEXTURE_2D_ARRAY),d.bindTexture(i,r.__webglTexture),me(i,t),t.mipmaps&&t.mipmaps.length>0)for(let r=0;r<t.mipmaps.length;r++)be(n.__webglFramebuffer[r],e,t,l.COLOR_ATTACHMENT0,i,r);else be(n.__webglFramebuffer,e,t,l.COLOR_ATTACHMENT0,i,0);D(t)&&O(i),d.unbindTexture()}e.depthBuffer&&Ce(e)}function Ee(e){let t=e.textures;for(let n=0,r=t.length;n<r;n++){let r=t[n];if(D(r)){let t=k(e),n=f.get(r).__webglTexture;d.bindTexture(t,n),O(t),d.unbindTexture()}}}let De=[],Oe=[];function ke(e){if(e.samples>0){if(je(e)===!1){let t=e.textures,n=e.width,r=e.height,i=l.COLOR_BUFFER_BIT,a=e.stencilBuffer?l.DEPTH_STENCIL_ATTACHMENT:l.DEPTH_ATTACHMENT,o=f.get(e),s=t.length>1;if(s)for(let e=0;e<t.length;e++)d.bindFramebuffer(l.FRAMEBUFFER,o.__webglMultisampledFramebuffer),l.framebufferRenderbuffer(l.FRAMEBUFFER,l.COLOR_ATTACHMENT0+e,l.RENDERBUFFER,null),d.bindFramebuffer(l.FRAMEBUFFER,o.__webglFramebuffer),l.framebufferTexture2D(l.DRAW_FRAMEBUFFER,l.COLOR_ATTACHMENT0+e,l.TEXTURE_2D,null,0);d.bindFramebuffer(l.READ_FRAMEBUFFER,o.__webglMultisampledFramebuffer);let c=e.texture.mipmaps;c&&c.length>0?d.bindFramebuffer(l.DRAW_FRAMEBUFFER,o.__webglFramebuffer[0]):d.bindFramebuffer(l.DRAW_FRAMEBUFFER,o.__webglFramebuffer);for(let c=0;c<t.length;c++){if(e.resolveDepthBuffer&&(e.depthBuffer&&(i|=l.DEPTH_BUFFER_BIT),e.stencilBuffer&&e.resolveStencilBuffer&&(i|=l.STENCIL_BUFFER_BIT)),s){l.framebufferRenderbuffer(l.READ_FRAMEBUFFER,l.COLOR_ATTACHMENT0,l.RENDERBUFFER,o.__webglColorRenderbuffer[c]);let e=f.get(t[c]).__webglTexture;l.framebufferTexture2D(l.DRAW_FRAMEBUFFER,l.COLOR_ATTACHMENT0,l.TEXTURE_2D,e,0)}l.blitFramebuffer(0,0,n,r,0,0,n,r,i,l.NEAREST),_===!0&&(De.length=0,Oe.length=0,De.push(l.COLOR_ATTACHMENT0+c),e.depthBuffer&&e.storeMultisampledDepthBuffer===!1&&(De.push(a),Oe.push(a),l.invalidateFramebuffer(l.DRAW_FRAMEBUFFER,Oe)),l.invalidateFramebuffer(l.READ_FRAMEBUFFER,De))}if(d.bindFramebuffer(l.READ_FRAMEBUFFER,null),d.bindFramebuffer(l.DRAW_FRAMEBUFFER,null),s)for(let e=0;e<t.length;e++){d.bindFramebuffer(l.FRAMEBUFFER,o.__webglMultisampledFramebuffer),l.framebufferRenderbuffer(l.FRAMEBUFFER,l.COLOR_ATTACHMENT0+e,l.RENDERBUFFER,o.__webglColorRenderbuffer[e]);let n=f.get(t[e]).__webglTexture;d.bindFramebuffer(l.FRAMEBUFFER,o.__webglFramebuffer),l.framebufferTexture2D(l.DRAW_FRAMEBUFFER,l.COLOR_ATTACHMENT0+e,l.TEXTURE_2D,n,0)}d.bindFramebuffer(l.DRAW_FRAMEBUFFER,o.__webglMultisampledFramebuffer)}else if(e.depthBuffer&&e.storeMultisampledDepthBuffer===!1&&_){let t=e.stencilBuffer?l.DEPTH_STENCIL_ATTACHMENT:l.DEPTH_ATTACHMENT;l.invalidateFramebuffer(l.DRAW_FRAMEBUFFER,[t])}}}function Ae(e){return Math.min(p.maxSamples,e.samples)}function je(e){let t=f.get(e);return e.samples>0&&u.has(`WEBGL_multisampled_render_to_texture`)===!0&&t.__useRenderToTexture!==!1}function L(e){let t=h.render.frame;y.get(e)!==t&&(y.set(e,t),e.update())}function Me(e,t){let n=e.colorSpace,r=e.format,i=e.type;return e.isCompressedTexture===!0||e.isVideoTexture===!0||n!==`srgb-linear`&&n!==``&&(Ft.getTransfer(n)===`srgb`?(r!==1023||i!==1009)&&B(`WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.`):V(`WebGLTextures: Unsupported texture color space:`,n)),t}function Ne(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?(v.width=e.naturalWidth||e.width,v.height=e.naturalHeight||e.height):typeof VideoFrame<`u`&&e instanceof VideoFrame?(v.width=e.displayWidth,v.height=e.displayHeight):(v.width=e.width,v.height=e.height),v}this.allocateTextureUnit=oe,this.resetTextureUnits=re,this.getTextureUnits=ie,this.setTextureUnits=ae,this.setTexture2D=I,this.setTexture2DArray=ce,this.setTexture3D=le,this.setTextureCube=ue,this.rebindTextures=we,this.setupRenderTarget=Te,this.updateRenderTargetMipmap=Ee,this.updateMultisampleRenderTarget=ke,this.setupDepthRenderbuffer=Ce,this.setupFrameBufferTexture=be,this.useMultisampledRTT=je,this.isReversedDepthBuffer=function(){return d.buffers.depth.getReversed()}}function hl(e,t){function n(n,r=``){let i,a=Ft.getTransfer(r);if(n===1009)return e.UNSIGNED_BYTE;if(n===1017)return e.UNSIGNED_SHORT_4_4_4_4;if(n===1018)return e.UNSIGNED_SHORT_5_5_5_1;if(n===35902)return e.UNSIGNED_INT_5_9_9_9_REV;if(n===35899)return e.UNSIGNED_INT_10F_11F_11F_REV;if(n===1010)return e.BYTE;if(n===1011)return e.SHORT;if(n===1012)return e.UNSIGNED_SHORT;if(n===1013)return e.INT;if(n===1014)return e.UNSIGNED_INT;if(n===1015)return e.FLOAT;if(n===1016)return e.HALF_FLOAT;if(n===1021)return e.ALPHA;if(n===1022)return e.RGB;if(n===1023)return e.RGBA;if(n===1026)return e.DEPTH_COMPONENT;if(n===1027)return e.DEPTH_STENCIL;if(n===1028)return e.RED;if(n===1029)return e.RED_INTEGER;if(n===1030)return e.RG;if(n===1031)return e.RG_INTEGER;if(n===1033)return e.RGBA_INTEGER;if(n===33776||n===33777||n===33778||n===33779){if(a===`srgb`){if(i=t.get(`WEBGL_compressed_texture_s3tc_srgb`),i!==null){if(n===33776)return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null}else if(i=t.get(`WEBGL_compressed_texture_s3tc`),i!==null){if(n===33776)return i.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null}if(n===35840||n===35841||n===35842||n===35843){if(i=t.get(`WEBGL_compressed_texture_pvrtc`),i!==null){if(n===35840)return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===35841)return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===35842)return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===35843)return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null}if(n===36196||n===37492||n===37496||n===37488||n===37489||n===37490||n===37491){if(i=t.get(`WEBGL_compressed_texture_etc`),i!==null){if(n===36196||n===37492)return a===`srgb`?i.COMPRESSED_SRGB8_ETC2:i.COMPRESSED_RGB8_ETC2;if(n===37496)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:i.COMPRESSED_RGBA8_ETC2_EAC;if(n===37488)return i.COMPRESSED_R11_EAC;if(n===37489)return i.COMPRESSED_SIGNED_R11_EAC;if(n===37490)return i.COMPRESSED_RG11_EAC;if(n===37491)return i.COMPRESSED_SIGNED_RG11_EAC}else return null}if(n===37808||n===37809||n===37810||n===37811||n===37812||n===37813||n===37814||n===37815||n===37816||n===37817||n===37818||n===37819||n===37820||n===37821){if(i=t.get(`WEBGL_compressed_texture_astc`),i!==null){if(n===37808)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:i.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===37809)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:i.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===37810)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:i.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===37811)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:i.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===37812)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:i.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===37813)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:i.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===37814)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:i.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===37815)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:i.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===37816)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:i.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===37817)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:i.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===37818)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:i.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===37819)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:i.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===37820)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:i.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===37821)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:i.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null}if(n===36492||n===36494||n===36495){if(i=t.get(`EXT_texture_compression_bptc`),i!==null){if(n===36492)return a===`srgb`?i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:i.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===36494)return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===36495)return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null}if(n===36283||n===36284||n===36285||n===36286){if(i=t.get(`EXT_texture_compression_rgtc`),i!==null){if(n===36283)return i.COMPRESSED_RED_RGTC1_EXT;if(n===36284)return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===36285)return i.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===36286)return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null}return n===1020?e.UNSIGNED_INT_24_8:e[n]===void 0?null:e[n]}return{convert:n}}var gl=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,_l=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,vl=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new _i(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new ua({vertexShader:gl,fragmentShader:_l,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Zr(new Qi(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},yl=class extends tt{constructor(e,t){super();let n=this,r=null,i=1,a=null,o=`local-floor`,s=1,c=null,u=null,d=null,f=null,p=null,h=null,g=typeof XRWebGLBinding<`u`,_=new vl,v={},b=t.getContextAttributes(),x=null,S=null,C=[],D=[],O=new U,k=null,A=null,j=new Ba;j.viewport=new Kt;let M=new Ba;M.viewport=new Kt;let N=[j,M],P=new Ka,ee=null,F=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(e){let t=C[e];return t===void 0&&(t=new On,C[e]=t),t.getTargetRaySpace()},this.getControllerGrip=function(e){let t=C[e];return t===void 0&&(t=new On,C[e]=t),t.getGripSpace()},this.getHand=function(e){let t=C[e];return t===void 0&&(t=new On,C[e]=t),t.getHandSpace()};function te(e){let t=D.indexOf(e.inputSource);if(t===-1)return;let n=C[t];n!==void 0&&(n.update(e.inputSource,e.frame,c||a),n.dispatchEvent({type:e.type,data:e.inputSource}))}function ne(){r.removeEventListener(`select`,te),r.removeEventListener(`selectstart`,te),r.removeEventListener(`selectend`,te),r.removeEventListener(`squeeze`,te),r.removeEventListener(`squeezestart`,te),r.removeEventListener(`squeezeend`,te),r.removeEventListener(`end`,ne),r.removeEventListener(`inputsourceschange`,re);for(let e=0;e<C.length;e++){let t=D[e];t!==null&&(D[e]=null,C[e].disconnect(t))}ee=null,F=null,_.reset();for(let e in v)delete v[e];if(e.setRenderTarget(x),p=null,f=null,d=null,r=null,S=null,ue.stop(),n.isPresenting=!1,e.setPixelRatio(k),e.setSize(O.width,O.height,!1),A!==null){let e=A.camera;e.fov=A.fov,e.zoom=A.zoom,e.updateProjectionMatrix(),A=null}n.dispatchEvent({type:`sessionend`})}this.setFramebufferScaleFactor=function(e){i=e,n.isPresenting===!0&&B(`WebXRManager: Cannot change framebuffer scale while presenting.`)},this.setReferenceSpaceType=function(e){o=e,n.isPresenting===!0&&B(`WebXRManager: Cannot change reference space type while presenting.`)},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(e){c=e},this.getBaseLayer=function(){return f===null?p:f},this.getBinding=function(){return d===null&&g&&(d=new XRWebGLBinding(r,t)),d},this.getFrame=function(){return h},this.getSession=function(){return r},this.setSession=async function(u){if(r=u,r!==null){if(x=e.getRenderTarget(),r.addEventListener(`select`,te),r.addEventListener(`selectstart`,te),r.addEventListener(`selectend`,te),r.addEventListener(`squeeze`,te),r.addEventListener(`squeezestart`,te),r.addEventListener(`squeezeend`,te),r.addEventListener(`end`,ne),r.addEventListener(`inputsourceschange`,re),b.xrCompatible!==!0&&await t.makeXRCompatible(),k=e.getPixelRatio(),e.getSize(O),g&&`createProjectionLayer`in XRWebGLBinding.prototype){let n=null,a=null,o=null;b.depth&&(o=b.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,n=b.stencil?E:T,a=b.stencil?y:m);let s={colorFormat:t.RGBA8,depthFormat:o,scaleFactor:i};d=this.getBinding(),f=d.createProjectionLayer(s),r.updateRenderState({layers:[f]}),e.setPixelRatio(1),e.setSize(f.textureWidth,f.textureHeight,!1),S=new Jt(f.textureWidth,f.textureHeight,{format:w,type:l,depthTexture:new hi(f.textureWidth,f.textureHeight,a,void 0,void 0,void 0,void 0,void 0,void 0,n),stencilBuffer:b.stencil,colorSpace:e.outputColorSpace,samples:b.antialias?4:0,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}else{let n={antialias:b.antialias,alpha:!0,depth:b.depth,stencil:b.stencil,framebufferScaleFactor:i};p=new XRWebGLLayer(r,t,n),r.updateRenderState({baseLayer:p}),e.setPixelRatio(1),e.setSize(p.framebufferWidth,p.framebufferHeight,!1),S=new Jt(p.framebufferWidth,p.framebufferHeight,{format:w,type:l,colorSpace:e.outputColorSpace,stencilBuffer:b.stencil,resolveDepthBuffer:p.ignoreDepthValues===!1,resolveStencilBuffer:p.ignoreDepthValues===!1,storeMultisampledDepthBuffer:p.ignoreDepthValues===!1,storeMultisampledStencilBuffer:p.ignoreDepthValues===!1})}S.isXRRenderTarget=!0,this.setFoveation(s),c=null,a=await r.requestReferenceSpace(o),ue.setContext(r),ue.start(),n.isPresenting=!0,n.dispatchEvent({type:`sessionstart`})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return _.getDepthTexture()};function re(e){for(let t=0;t<e.removed.length;t++){let n=e.removed[t],r=D.indexOf(n);r>=0&&(D[r]=null,C[r].disconnect(n))}for(let t=0;t<e.added.length;t++){let n=e.added[t],r=D.indexOf(n);if(r===-1){for(let e=0;e<C.length;e++)if(e>=D.length){D.push(n),r=e;break}else if(D[e]===null){D[e]=n,r=e;break}if(r===-1)break}let i=C[r];i&&i.connect(n)}}let ie=new W,ae=new W;function oe(e,t,n){ie.setFromMatrixPosition(t.matrixWorld),ae.setFromMatrixPosition(n.matrixWorld);let r=ie.distanceTo(ae),i=t.projectionMatrix.elements,a=n.projectionMatrix.elements,o=i[14]/(i[10]-1),s=i[14]/(i[10]+1),c=(i[9]+1)/i[5],l=(i[9]-1)/i[5],u=(i[8]-1)/i[0],d=(a[8]+1)/a[0],f=o*u,p=o*d,m=r/(-u+d),h=m*-u;if(t.matrixWorld.decompose(e.position,e.quaternion,e.scale),e.translateX(h),e.translateZ(m),e.matrixWorld.compose(e.position,e.quaternion,e.scale),e.matrixWorldInverse.copy(e.matrixWorld).invert(),i[10]===-1)e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse);else{let t=o+m,n=s+m,i=f-h,a=p+(r-h),u=c*s/n*t,d=l*s/n*t;e.projectionMatrix.makePerspective(i,a,u,d,t,n),e.projectionMatrixInverse.copy(e.projectionMatrix).invert()}}function se(e,t){t===null?e.matrixWorld.copy(e.matrix):e.matrixWorld.multiplyMatrices(t.matrixWorld,e.matrix),e.matrixWorldInverse.copy(e.matrixWorld).invert()}this.updateCamera=function(e){if(r===null)return;let t=e.near,n=e.far;_.texture!==null&&(_.depthNear>0&&(t=_.depthNear),_.depthFar>0&&(n=_.depthFar)),P.near=M.near=j.near=t,P.far=M.far=j.far=n,(ee!==P.near||F!==P.far)&&(r.updateRenderState({depthNear:P.near,depthFar:P.far}),ee=P.near,F=P.far),P.layers.mask=e.layers.mask|6,j.layers.mask=P.layers.mask&-5,M.layers.mask=P.layers.mask&-3;let i=e.parent,a=P.cameras;se(P,i);for(let e=0;e<a.length;e++)se(a[e],i);a.length===2?oe(P,j,M):P.projectionMatrix.copy(j.projectionMatrix),A===null&&e.isPerspectiveCamera&&(A={camera:e,fov:e.fov,zoom:e.zoom}),I(e,P,i)};function I(e,t,n){n===null?e.matrix.copy(t.matrixWorld):(e.matrix.copy(n.matrixWorld),e.matrix.invert(),e.matrix.multiply(t.matrixWorld)),e.matrix.decompose(e.position,e.quaternion,e.scale),e.updateMatrixWorld(!0),e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse),e.isPerspectiveCamera&&(e.fov=at*2*Math.atan(1/e.projectionMatrix.elements[5]),e.zoom=1)}this.getCamera=function(){return P},this.getFoveation=function(){if(f!==null||p!==null)return s},this.setFoveation=function(e){s=e,f!==null&&(f.fixedFoveation=e),p!==null&&p.fixedFoveation!==void 0&&(p.fixedFoveation=e)},this.hasDepthSensing=function(){return _.texture!==null},this.getDepthSensingMesh=function(){return _.getMesh(P)},this.getCameraTexture=function(e){return v[e]};let ce=null;function le(t,i){if(u=i.getViewerPose(c||a),h=i,u!==null){let t=u.views;p!==null&&(e.setRenderTargetFramebuffer(S,p.framebuffer),e.setRenderTarget(S));let i=!1;t.length!==P.cameras.length&&(P.cameras.length=0,i=!0);for(let n=0;n<t.length;n++){let r=t[n],a=null;if(p!==null)a=p.getViewport(r);else{let t=d.getViewSubImage(f,r);a=t.viewport,n===0&&(e.setRenderTargetTextures(S,t.colorTexture,t.depthStencilTexture),e.setRenderTarget(S))}let o=N[n];o===void 0&&(o=new Ba,o.layers.enable(n),o.viewport=new Kt,N[n]=o),o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.projectionMatrix.fromArray(r.projectionMatrix),o.projectionMatrixInverse.copy(o.projectionMatrix).invert(),o.viewport.set(a.x,a.y,a.width,a.height),n===0&&(P.matrix.copy(o.matrix),P.matrix.decompose(P.position,P.quaternion,P.scale)),i===!0&&P.cameras.push(o)}let a=r.enabledFeatures;if(a&&a.includes(`depth-sensing`)&&r.depthUsage==`gpu-optimized`&&g){d=n.getBinding();let e=d.getDepthInformation(t[0]);e&&e.isValid&&e.texture&&_.init(e,r.renderState)}if(a&&a.includes(`camera-access`)&&g){e.state.unbindTexture(),d=n.getBinding();for(let e=0;e<t.length;e++){let n=t[e].camera;if(n){let e=v[n];e||(e=new _i,v[n]=e);let t=d.getCameraImage(n);e.sourceTexture=t}}}}for(let e=0;e<C.length;e++){let t=D[e],n=C[e];t!==null&&n!==void 0&&n.update(t,i,c||a)}ce&&ce(t,i),i.detectedPlanes&&n.dispatchEvent({type:`planesdetected`,data:i}),h=null}let ue=new lo;ue.setAnimationLoop(le),this.setAnimationLoop=function(e){ce=e},this.dispose=function(){}}},bl=new Zt,xl=new G;xl.set(-1,0,0,0,1,0,0,0,1);function Sl(e,t){function n(e,t){e.matrixAutoUpdate===!0&&e.updateMatrix(),t.value.copy(e.matrix)}function r(t,n){n.color.getRGB(t.fogColor.value,oa(e)),n.isFog?(t.fogNear.value=n.near,t.fogFar.value=n.far):n.isFogExp2&&(t.fogDensity.value=n.density)}function i(e,t,n,r,i){t.isNodeMaterial?t.uniformsNeedUpdate=!1:t.isMeshBasicMaterial?a(e,t):t.isMeshLambertMaterial?(a(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshToonMaterial?(a(e,t),d(e,t)):t.isMeshPhongMaterial?(a(e,t),u(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshStandardMaterial?(a(e,t),f(e,t),t.isMeshPhysicalMaterial&&p(e,t,i)):t.isMeshMatcapMaterial?(a(e,t),m(e,t)):t.isMeshDepthMaterial?a(e,t):t.isMeshDistanceMaterial?(a(e,t),h(e,t)):t.isMeshNormalMaterial?a(e,t):t.isLineBasicMaterial?(o(e,t),t.isLineDashedMaterial&&s(e,t)):t.isPointsMaterial?c(e,t,n,r):t.isSpriteMaterial?l(e,t):t.isShadowMaterial?(e.color.value.copy(t.color),e.opacity.value=t.opacity):t.isShaderMaterial&&(t.uniformsNeedUpdate=!1)}function a(e,r){e.opacity.value=r.opacity,r.color&&e.diffuse.value.copy(r.color),r.emissive&&e.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity),r.map&&(e.map.value=r.map,n(r.map,e.mapTransform)),r.alphaMap&&(e.alphaMap.value=r.alphaMap,n(r.alphaMap,e.alphaMapTransform)),r.bumpMap&&(e.bumpMap.value=r.bumpMap,n(r.bumpMap,e.bumpMapTransform),e.bumpScale.value=r.bumpScale,r.side===1&&(e.bumpScale.value*=-1)),r.normalMap&&(e.normalMap.value=r.normalMap,n(r.normalMap,e.normalMapTransform),e.normalScale.value.copy(r.normalScale),r.side===1&&e.normalScale.value.negate()),r.displacementMap&&(e.displacementMap.value=r.displacementMap,n(r.displacementMap,e.displacementMapTransform),e.displacementScale.value=r.displacementScale,e.displacementBias.value=r.displacementBias),r.emissiveMap&&(e.emissiveMap.value=r.emissiveMap,n(r.emissiveMap,e.emissiveMapTransform)),r.specularMap&&(e.specularMap.value=r.specularMap,n(r.specularMap,e.specularMapTransform)),r.alphaTest>0&&(e.alphaTest.value=r.alphaTest);let i=t.get(r),a=i.envMap,o=i.envMapRotation;a&&(e.envMap.value=a,e.envMapRotation.value.setFromMatrix4(bl.makeRotationFromEuler(o)).transpose(),a.isCubeTexture&&a.isRenderTargetTexture===!1&&e.envMapRotation.value.premultiply(xl),e.reflectivity.value=r.reflectivity,e.ior.value=r.ior,e.refractionRatio.value=r.refractionRatio),r.lightMap&&(e.lightMap.value=r.lightMap,e.lightMapIntensity.value=r.lightMapIntensity,n(r.lightMap,e.lightMapTransform)),r.aoMap&&(e.aoMap.value=r.aoMap,e.aoMapIntensity.value=r.aoMapIntensity,n(r.aoMap,e.aoMapTransform))}function o(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform))}function s(e,t){e.dashSize.value=t.dashSize,e.totalSize.value=t.dashSize+t.gapSize,e.scale.value=t.scale}function c(e,t,r,i){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.size.value=t.size*r,e.scale.value=i*.5,t.map&&(e.map.value=t.map,n(t.map,e.uvTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function l(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.rotation.value=t.rotation,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function u(e,t){e.specular.value.copy(t.specular),e.shininess.value=Math.max(t.shininess,1e-4)}function d(e,t){t.gradientMap&&(e.gradientMap.value=t.gradientMap)}function f(e,t){e.metalness.value=t.metalness,t.metalnessMap&&(e.metalnessMap.value=t.metalnessMap,n(t.metalnessMap,e.metalnessMapTransform)),e.roughness.value=t.roughness,t.roughnessMap&&(e.roughnessMap.value=t.roughnessMap,n(t.roughnessMap,e.roughnessMapTransform)),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)}function p(e,t,r){e.ior.value=t.ior,t.sheen>0&&(e.sheenColor.value.copy(t.sheenColor).multiplyScalar(t.sheen),e.sheenRoughness.value=t.sheenRoughness,t.sheenColorMap&&(e.sheenColorMap.value=t.sheenColorMap,n(t.sheenColorMap,e.sheenColorMapTransform)),t.sheenRoughnessMap&&(e.sheenRoughnessMap.value=t.sheenRoughnessMap,n(t.sheenRoughnessMap,e.sheenRoughnessMapTransform))),t.clearcoat>0&&(e.clearcoat.value=t.clearcoat,e.clearcoatRoughness.value=t.clearcoatRoughness,t.clearcoatMap&&(e.clearcoatMap.value=t.clearcoatMap,n(t.clearcoatMap,e.clearcoatMapTransform)),t.clearcoatRoughnessMap&&(e.clearcoatRoughnessMap.value=t.clearcoatRoughnessMap,n(t.clearcoatRoughnessMap,e.clearcoatRoughnessMapTransform)),t.clearcoatNormalMap&&(e.clearcoatNormalMap.value=t.clearcoatNormalMap,n(t.clearcoatNormalMap,e.clearcoatNormalMapTransform),e.clearcoatNormalScale.value.copy(t.clearcoatNormalScale),t.side===1&&e.clearcoatNormalScale.value.negate())),t.dispersion>0&&(e.dispersion.value=t.dispersion),t.retroreflectivity>0&&(e.retroreflectivity.value=t.retroreflectivity),t.iridescence>0&&(e.iridescence.value=t.iridescence,e.iridescenceIOR.value=t.iridescenceIOR,e.iridescenceThicknessMinimum.value=t.iridescenceThicknessRange[0],e.iridescenceThicknessMaximum.value=t.iridescenceThicknessRange[1],t.iridescenceMap&&(e.iridescenceMap.value=t.iridescenceMap,n(t.iridescenceMap,e.iridescenceMapTransform)),t.iridescenceThicknessMap&&(e.iridescenceThicknessMap.value=t.iridescenceThicknessMap,n(t.iridescenceThicknessMap,e.iridescenceThicknessMapTransform))),t.transmission>0&&(e.transmission.value=t.transmission,e.transmissionSamplerMap.value=r.texture,e.transmissionSamplerSize.value.set(r.width,r.height),t.transmissionMap&&(e.transmissionMap.value=t.transmissionMap,n(t.transmissionMap,e.transmissionMapTransform)),e.thickness.value=t.thickness,t.thicknessMap&&(e.thicknessMap.value=t.thicknessMap,n(t.thicknessMap,e.thicknessMapTransform)),e.attenuationDistance.value=t.attenuationDistance,e.attenuationColor.value.copy(t.attenuationColor)),t.anisotropy>0&&(e.anisotropyVector.value.set(t.anisotropy*Math.cos(t.anisotropyRotation),t.anisotropy*Math.sin(t.anisotropyRotation)),t.anisotropyMap&&(e.anisotropyMap.value=t.anisotropyMap,n(t.anisotropyMap,e.anisotropyMapTransform))),e.specularIntensity.value=t.specularIntensity,e.specularColor.value.copy(t.specularColor),t.specularColorMap&&(e.specularColorMap.value=t.specularColorMap,n(t.specularColorMap,e.specularColorMapTransform)),t.specularIntensityMap&&(e.specularIntensityMap.value=t.specularIntensityMap,n(t.specularIntensityMap,e.specularIntensityMapTransform))}function m(e,t){t.matcap&&(e.matcap.value=t.matcap)}function h(e,n){let r=t.get(n).light;e.referencePosition.value.setFromMatrixPosition(r.matrixWorld),e.nearDistance.value=r.shadow.camera.near,e.farDistance.value=r.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:i}}function Cl(e,t,n,r){let i={},a={},o=[],s=e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);function c(e,t){let n=t.program;r.uniformBlockBinding(e,n)}function l(e,n){let o=i[e.id];o===void 0&&(g(e),o=u(e),i[e.id]=o,e.addEventListener(`dispose`,v));let s=n.program;r.updateUBOMapping(e,s);let c=t.render.frame;a[e.id]!==c&&(f(e),a[e.id]=c)}function u(t){let n=d();t.__bindingPointIndex=n;let r=e.createBuffer(),i=t.__size,a=t.usage;return e.bindBuffer(e.UNIFORM_BUFFER,r),e.bufferData(e.UNIFORM_BUFFER,i,a),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,n,r),r}function d(){for(let e=0;e<s;e++)if(o.indexOf(e)===-1)return o.push(e),e;return V(`WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached.`),0}function f(t){let n=i[t.id],r=t.uniforms,a=t.__cache;e.bindBuffer(e.UNIFORM_BUFFER,n);for(let e=0,t=r.length;e<t;e++){let t=r[e];if(Array.isArray(t))for(let n=0,r=t.length;n<r;n++)p(t[n],e,n,a);else p(t,e,0,a)}e.bindBuffer(e.UNIFORM_BUFFER,null)}function p(t,n,r,i){if(h(t,n,r,i)===!0){let n=t.__offset,r=t.value;if(Array.isArray(r)){let e=0;for(let n=0;n<r.length;n++){let i=r[n],a=_(i);m(i,t.__data,e),typeof i!=`number`&&typeof i!=`boolean`&&!i.isMatrix3&&!ArrayBuffer.isView(i)&&(e+=a.storage/Float32Array.BYTES_PER_ELEMENT)}}else m(r,t.__data,0);e.bufferSubData(e.UNIFORM_BUFFER,n,t.__data)}}function m(e,t,n){typeof e==`number`||typeof e==`boolean`?t[0]=e:e.isMatrix3?(t[0]=e.elements[0],t[1]=e.elements[1],t[2]=e.elements[2],t[3]=0,t[4]=e.elements[3],t[5]=e.elements[4],t[6]=e.elements[5],t[7]=0,t[8]=e.elements[6],t[9]=e.elements[7],t[10]=e.elements[8],t[11]=0):ArrayBuffer.isView(e)?t.set(new e.constructor(e.buffer,e.byteOffset,t.length)):e.toArray(t,n)}function h(e,t,n,r){let i=e.value,a=t+`_`+n;if(r[a]===void 0)return r[a]=typeof i==`number`||typeof i==`boolean`?i:ArrayBuffer.isView(i)?i.slice():i.clone(),!0;{let e=r[a];if(typeof i==`number`||typeof i==`boolean`){if(e!==i)return r[a]=i,!0}else if(ArrayBuffer.isView(i))return!0;else if(e.equals(i)===!1)return e.copy(i),!0}return!1}function g(e){let t=e.uniforms,n=0;for(let e=0,r=t.length;e<r;e++){let r=Array.isArray(t[e])?t[e]:[t[e]];for(let e=0,t=r.length;e<t;e++){let t=r[e],i=Array.isArray(t.value)?t.value:[t.value];for(let e=0,r=i.length;e<r;e++){let r=i[e],a=_(r),o=n%16,s=o%a.boundary,c=o+s;n+=s,c!==0&&16-c<a.storage&&(n+=16-c),t.__data=new Float32Array(a.storage/Float32Array.BYTES_PER_ELEMENT),t.__offset=n,n+=a.storage}}}let r=n%16;return r>0&&(n+=16-r),e.__size=n,e.__cache={},this}function _(e){let t={boundary:0,storage:0};return typeof e==`number`||typeof e==`boolean`?(t.boundary=4,t.storage=4):e.isVector2?(t.boundary=8,t.storage=8):e.isVector3||e.isColor?(t.boundary=16,t.storage=12):e.isVector4?(t.boundary=16,t.storage=16):e.isMatrix3?(t.boundary=48,t.storage=48):e.isMatrix4?(t.boundary=64,t.storage=64):e.isTexture?B(`WebGLRenderer: Texture samplers can not be part of an uniforms group.`):ArrayBuffer.isView(e)?(t.boundary=16,t.storage=e.byteLength):B(`WebGLRenderer: Unsupported uniform value type.`,e),t}function v(t){let n=t.target;n.removeEventListener(`dispose`,v);let r=o.indexOf(n.__bindingPointIndex);o.splice(r,1),e.deleteBuffer(i[n.id]),delete i[n.id],delete a[n.id]}function y(){for(let t in i)e.deleteBuffer(i[t]);o=[],i={},a={}}return{bind:c,update:l,dispose:y}}var wl=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),Tl=null;function El(){return Tl===null&&(Tl=new ei(wl,16,16,k,g),Tl.name=`DFG_LUT`,Tl.minFilter=o,Tl.magFilter=o,Tl.wrapS=t,Tl.wrapT=t,Tl.generateMipmaps=!1,Tl.needsUpdate=!0),Tl}var Dl=class{constructor(e={}){let{canvas:t=Je(),context:n=null,depth:r=!0,stencil:i=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:s=!0,preserveDrawingBuffer:u=!1,powerPreference:d=`default`,failIfMajorPerformanceCaveat:p=!1,reversedDepthBuffer:h=!1,outputBufferType:b=l}=e;this.isWebGLRenderer=!0;let x;if(n!==null){if(typeof WebGLRenderingContext<`u`&&n instanceof WebGLRenderingContext)throw Error(`THREE.WebGLRenderer: WebGL 1 is not supported since r163.`);x=n.getContextAttributes().alpha}else x=a;let S=b,C=new Set([j,A,O]),w=new Set([l,m,f,y,_,v]),T=new Uint32Array(4),E=new Int32Array(4),D=new W,k=null,M=null,N=[],P=[],ee=null;this.domElement=t,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let F=this,te=!1,ne=null,re=null,ie=null,ae=null;this._outputColorSpace=Ie;let oe=0,se=0,I=null,ce=-1,le=null,ue=new Kt,de=new Kt,fe=null,pe=new K(0),me=0,he=t.width,ge=t.height,_e=1,ve=null,ye=null,be=new Kt(0,0,he,ge),xe=new Kt(0,0,he,ge),Se=!1,Ce=new pi,we=!1,Te=!1,Ee=new Zt,De=new W,Oe=new Kt,ke={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Ae=!1;function je(){return I===null?_e:1}let L=n;function Me(e,n){return t.getContext(e,n)}let Ne,Pe,R,Fe,z,Le,Re,ze,Be,Ve,He,Ue,Ge,Ke,qe,Ye,Ze,Qe,et,tt,nt,rt,it;try{let e={alpha:!0,depth:r,stencil:i,antialias:o,premultipliedAlpha:s,preserveDrawingBuffer:u,powerPreference:d,failIfMajorPerformanceCaveat:p};if(`setAttribute`in t&&t.setAttribute(`data-engine`,`three.js r186`),t.addEventListener(`webglcontextlost`,st,!1),t.addEventListener(`webglcontextrestored`,ct,!1),t.addEventListener(`webglcontextcreationerror`,lt,!1),L===null){let t=`webgl2`;if(L=Me(t,e),L===null)throw Me(t)?Error(`THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.`):Error(`THREE.WebGLRenderer: Error creating WebGL context.`)}at()}catch(e){throw t.removeEventListener(`webglcontextlost`,st,!1),t.removeEventListener(`webglcontextrestored`,ct,!1),t.removeEventListener(`webglcontextcreationerror`,lt,!1),V(`WebGLRenderer: `+e.message),e}function at(){Ne=new Go(L),Ne.init(),nt=new hl(L,Ne),Pe=new bo(L,Ne,e,nt),R=new pl(L,Ne),Pe.reversedDepthBuffer&&h&&R.buffers.depth.setReversed(!0),re=L.createFramebuffer(),ie=L.createFramebuffer(),ae=L.createFramebuffer(),Fe=new Jo(L),z=new qc,Le=new ml(L,Ne,R,z,Pe,nt,Fe),Re=new Wo(F),ze=new uo(L),rt=new vo(L,ze),Be=new Ko(L,ze,Fe,rt),Ve=new Xo(L,Be,ze,rt,Fe),Qe=new Yo(L,Pe,Le),qe=new xo(z),He=new Kc(F,Re,Ne,Pe,rt,qe),Ue=new Sl(F,z),Ge=new Zc,Ke=new il(Ne),Ze=new _o(F,Re,R,Ve,x,s),Ye=new fl(F,Ve,Pe),it=new Cl(L,Fe,Pe,R),et=new yo(L,Ne,Fe),tt=new qo(L,Ne,Fe),Fe.programs=He.programs,F.capabilities=Pe,F.extensions=Ne,F.properties=z,F.renderLists=Ge,F.shadowMap=Ye,F.state=R,F.info=Fe}S!==1009&&(ee=new Qo(S,t.width,t.height,o,r,i));let ot=new yl(F,L);this.xr=ot,this.getContext=function(){return L},this.getContextAttributes=function(){return L.getContextAttributes()},this.forceContextLoss=function(){let e=Ne.get(`WEBGL_lose_context`);e&&e.loseContext()},this.forceContextRestore=function(){let e=Ne.get(`WEBGL_lose_context`);e&&e.restoreContext()},this.getPixelRatio=function(){return _e},this.setPixelRatio=function(e){e!==void 0&&(_e=e,this.setSize(he,ge,!1))},this.getSize=function(e){return e.set(he,ge)},this.setSize=function(e,n,r=!0){if(ot.isPresenting){B(`WebGLRenderer: Can't change size while VR device is presenting.`);return}he=e,ge=n,t.width=Math.floor(e*_e),t.height=Math.floor(n*_e),r===!0&&(t.style.width=e+`px`,t.style.height=n+`px`),ee!==null&&ee.setSize(t.width,t.height),this.setViewport(0,0,e,n)},this.getDrawingBufferSize=function(e){return e.set(he*_e,ge*_e).floor()},this.setDrawingBufferSize=function(e,n,r){he=e,ge=n,_e=r,t.width=Math.floor(e*r),t.height=Math.floor(n*r),this.setViewport(0,0,e,n)},this.setEffects=function(e){if(S===1009){V(`WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.`);return}if(e){for(let t=0;t<e.length;t++)if(e[t].isOutputPass===!0){B(`WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.`);break}}ee.setEffects(e||[])},this.getCurrentViewport=function(e){return e.copy(ue)},this.getViewport=function(e){return e.copy(be)},this.setViewport=function(e,t,n,r){e.isVector4?be.set(e.x,e.y,e.z,e.w):be.set(e,t,n,r),R.viewport(ue.copy(be).multiplyScalar(_e).round())},this.getScissor=function(e){return e.copy(xe)},this.setScissor=function(e,t,n,r){e.isVector4?xe.set(e.x,e.y,e.z,e.w):xe.set(e,t,n,r),R.scissor(de.copy(xe).multiplyScalar(_e).round())},this.getScissorTest=function(){return Se},this.setScissorTest=function(e){R.setScissorTest(Se=e)},this.setOpaqueSort=function(e){ve=e},this.setTransparentSort=function(e){ye=e},this.getClearColor=function(e){return e.copy(Ze.getClearColor())},this.setClearColor=function(){Ze.setClearColor(...arguments)},this.getClearAlpha=function(){return Ze.getClearAlpha()},this.setClearAlpha=function(){Ze.setClearAlpha(...arguments)},this.clear=function(e=!0,t=!0,n=!0){let r=0;if(e){let e=!1;if(I!==null){let t=I.texture.format;e=C.has(t)}if(e){let e=I.texture.type,t=w.has(e),n=Ze.getClearColor(),r=Ze.getClearAlpha(),i=n.r,a=n.g,o=n.b;t?(T[0]=i,T[1]=a,T[2]=o,T[3]=r,L.clearBufferuiv(L.COLOR,0,T)):(E[0]=i,E[1]=a,E[2]=o,E[3]=r,L.clearBufferiv(L.COLOR,0,E))}else r|=L.COLOR_BUFFER_BIT}t&&(r|=L.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),n&&(r|=L.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),r!==0&&L.clear(r)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(e){e.setRenderer(this),ne=e},this.dispose=function(){t.removeEventListener(`webglcontextlost`,st,!1),t.removeEventListener(`webglcontextrestored`,ct,!1),t.removeEventListener(`webglcontextcreationerror`,lt,!1),Ze.dispose(),Ge.dispose(),Ke.dispose(),z.dispose(),Re.dispose(),Ve.dispose(),rt.dispose(),it.dispose(),He.dispose(),ot.dispose(),ot.removeEventListener(`sessionstart`,gt),ot.removeEventListener(`sessionend`,_t),vt.stop()};function st(e){e.preventDefault(),Xe(`WebGLRenderer: Context Lost.`),te=!0}function ct(){Xe(`WebGLRenderer: Context Restored.`),te=!1;let e=Fe.autoReset,t=Ye.enabled,n=Ye.autoUpdate,r=Ye.needsUpdate,i=Ye.type;at(),Fe.autoReset=e,Ye.enabled=t,Ye.autoUpdate=n,Ye.needsUpdate=r,Ye.type=i}function lt(e){V(`WebGLRenderer: A WebGL context could not be created. Reason: `,e.statusMessage)}function ut(e){let t=e.target;t.removeEventListener(`dispose`,ut),dt(t)}function dt(e){ft(e),z.remove(e)}function ft(e){let t=z.get(e).programs;t!==void 0&&(t.forEach(function(e){He.releaseProgram(e)}),e.isShaderMaterial&&He.releaseShaderCache(e))}this.renderBufferDirect=function(e,t,n,r,i,a){t===null&&(t=ke);let o=i.isMesh&&i.matrixWorld.determinantAffine()<0,s=H(e,t,n,r,i);R.setMaterial(r,o);let c=n.index,l=1;if(r.wireframe===!0){if(c=Be.getWireframeAttribute(n),c===void 0)return;l=2}let u=n.drawRange,d=n.attributes.position,f=u.start*l,p=(u.start+u.count)*l;a!==null&&(f=Math.max(f,a.start*l),p=Math.min(p,(a.start+a.count)*l)),c===null?d!=null&&(f=Math.max(f,0),p=Math.min(p,d.count)):(f=Math.max(f,0),p=Math.min(p,c.count));let m=p-f;if(m<0||m===1/0)return;rt.setup(i,r,s,n,c);let h,g=et;if(c!==null&&(h=ze.get(c),g=tt,g.setIndex(h)),i.isMesh)r.wireframe===!0?(R.setLineWidth(r.wireframeLinewidth*je()),g.setMode(L.LINES)):g.setMode(L.TRIANGLES);else if(i.isLine){let e=r.linewidth;e===void 0&&(e=1),R.setLineWidth(e*je()),i.isLineSegments?g.setMode(L.LINES):i.isLineLoop?g.setMode(L.LINE_LOOP):g.setMode(L.LINE_STRIP)}else i.isPoints?g.setMode(L.POINTS):i.isSprite&&g.setMode(L.TRIANGLES);if(i.isBatchedMesh){if(Ne.get(`WEBGL_multi_draw`))g.renderMultiDraw(i._multiDrawStarts,i._multiDrawCounts,i._multiDrawCount);else{let e=i._multiDrawStarts,t=i._multiDrawCounts,n=i._multiDrawCount,a=c?ze.get(c).bytesPerElement:1,o=z.get(r).currentProgram.getUniforms();for(let r=0;r<n;r++)o.setValue(L,`_gl_DrawID`,r),g.render(e[r]/a,t[r])}}else if(i.isInstancedMesh)g.renderInstances(f,m,i.count);else if(n.isInstancedBufferGeometry){let e=n._maxInstanceCount===void 0?1/0:n._maxInstanceCount,t=Math.min(n.instanceCount,e);g.renderInstances(f,m,t)}else g.render(f,m)};function pt(e,t,n,r){ne!==null&&e.isNodeMaterial&&ne.setObject(r,e),we===!0&&qe.setState(e,n,!1),e.transparent===!0&&e.side===2&&e.forceSinglePass===!1?(e.side=1,e.needsUpdate=!0,wt(e,t,r),e.side=0,e.needsUpdate=!0,wt(e,t,r),e.side=2):wt(e,t,r)}this.compile=function(e,t,n=null){n===null&&(n=e),ne!==null&&ne.renderStart(e,t,n),M=Ke.get(n),M.init(t),P.push(M),n.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(M.pushLight(e),e.castShadow&&M.pushShadow(e))}),e!==n&&e.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(M.pushLight(e),e.castShadow&&M.pushShadow(e))}),M.setupLights(),ne!==null&&ne.updateLights(M.state.lightsArray),Te=this.localClippingEnabled,we=qe.init(this.clippingPlanes,Te),we===!0&&qe.setGlobalState(this.clippingPlanes,t),ne!==null&&Ye.render(M.state.shadowsArray,n,t);let r=new Set;return e.traverse(function(e){if(!(e.isMesh||e.isPoints||e.isLine||e.isSprite))return;let i=e.material;if(i){if(Array.isArray(i))for(let a=0;a<i.length;a++){let o=i[a];pt(o,n,t,e),r.add(o)}else pt(i,n,t,e),r.add(i)}}),M=P.pop(),ne!==null&&ne.renderEnd(),r},this.compileAsync=function(e,t,n=null){let r=this.compile(e,t,n);return new Promise(t=>{function n(){if(r.forEach(function(e){let t=z.get(e).currentProgram;(t===void 0||t.isReady())&&r.delete(e)}),r.size===0){t(e);return}setTimeout(n,10)}Ne.get(`KHR_parallel_shader_compile`)===null?setTimeout(n,10):n()})};let mt=null;function ht(e){mt&&mt(e)}function gt(){vt.stop()}function _t(){vt.start()}let vt=new lo;vt.setAnimationLoop(ht),typeof self<`u`&&vt.setContext(self),this.setAnimationLoop=function(e){mt=e,ot.setAnimationLoop(e),e===null?vt.stop():vt.start()},ot.addEventListener(`sessionstart`,gt),ot.addEventListener(`sessionend`,_t),this.render=function(e,t){if(t!==void 0&&t.isCamera!==!0){V(`WebGLRenderer.render: camera is not an instance of THREE.Camera.`);return}if(te===!0)return;ne!==null&&ne.renderStart(e,t);let n=ot.enabled===!0&&ot.isPresenting===!0,r=ee!==null&&(I===null||n)&&ee.begin(F,I);if(e.matrixWorldAutoUpdate===!0&&e.updateMatrixWorld(),t.parent===null&&t.matrixWorldAutoUpdate===!0&&t.updateMatrixWorld(),ot.enabled===!0&&ot.isPresenting===!0&&(ee===null||ee.isCompositing()===!1)&&(ot.cameraAutoUpdate===!0&&ot.updateCamera(t),t=ot.getCamera()),e.isScene===!0&&e.onBeforeRender(F,e,t,I),M=Ke.get(e,P.length),M.init(t),M.state.textureUnits=Le.getTextureUnits(),P.push(M),Ee.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),Ce.setFromProjectionMatrix(Ee,We,t.reversedDepth),Te=this.localClippingEnabled,we=qe.init(this.clippingPlanes,Te),k=Ge.get(e,N.length),k.init(),N.push(k),ot.enabled===!0&&ot.isPresenting===!0){let e=F.xr.getDepthSensingMesh();e!==null&&yt(e,t,-1/0,F.sortObjects)}yt(e,t,0,F.sortObjects),k.finish(),ne!==null&&ne.updateLights(M.state.lightsArray),F.sortObjects===!0&&k.sort(ve,ye),Ae=ot.enabled===!1||ot.isPresenting===!1||ot.hasDepthSensing()===!1,Ae&&Ze.addToRenderList(k,e),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),we===!0&&qe.beginShadows();let i=M.state.shadowsArray;if(Ye.render(i,e,t),we===!0&&qe.endShadows(),(r&&ee.hasRenderPass())===!1){let n=k.opaque,r=k.transmissive;if(M.setupLights(),t.isArrayCamera){let i=t.cameras;if(r.length>0)for(let t=0,a=i.length;t<a;t++){let a=i[t];xt(n,r,e,a)}Ae&&Ze.render(e);for(let t=0,n=i.length;t<n;t++){let n=i[t];bt(k,e,n,n.viewport)}}else r.length>0&&xt(n,r,e,t),Ae&&Ze.render(e),bt(k,e,t)}I!==null&&se===0&&(Le.updateMultisampleRenderTarget(I),Le.updateRenderTargetMipmap(I)),r&&ee.end(F),e.isScene===!0&&e.onAfterRender(F,e,t),rt.resetDefaultState(),ce=-1,le=null,P.pop(),P.length>0?(M=P[P.length-1],Le.setTextureUnits(M.state.textureUnits),we===!0&&qe.setGlobalState(F.clippingPlanes,M.state.camera)):M=null,N.pop(),k=N.length>0?N[N.length-1]:null,ne!==null&&ne.renderEnd()};function yt(e,t,n,r){if(e.visible===!1)return;if(e.layers.test(t.layers)){if(e.isGroup)n=e.renderOrder;else if(e.isLOD)e.autoUpdate===!0&&e.update(t);else if(e.isLightProbeGrid)M.pushLightProbeGrid(e);else if(e.isLight)M.pushLight(e),e.castShadow&&M.pushShadow(e);else if(e.isSprite){if(!e.frustumCulled||e.intersectsFrustum(Ce)){r&&Oe.setFromMatrixPosition(e.matrixWorld).applyMatrix4(Ee);let i=Ve.update(e),a=e.material;a.visible&&k.push(e,i,a,n,Oe.z,null,t)}}else if((e.isMesh||e.isLine||e.isPoints)&&(!e.frustumCulled||e.intersectsFrustum(Ce))){let i=Ve.update(e),a=e.material;if(r&&(e.boundingSphere===void 0?(i.boundingSphere===null&&i.computeBoundingSphere(),Oe.copy(i.boundingSphere.center)):(e.boundingSphere===null&&e.computeBoundingSphere(),Oe.copy(e.boundingSphere.center)),Oe.applyMatrix4(e.matrixWorld).applyMatrix4(Ee)),Array.isArray(a)){let r=i.groups;for(let o=0,s=r.length;o<s;o++){let s=r[o],c=a[s.materialIndex];c&&c.visible&&k.push(e,i,c,n,Oe.z,s,t)}}else a.visible&&k.push(e,i,a,n,Oe.z,null,t)}}let i=e.children;for(let e=0,a=i.length;e<a;e++)yt(i[e],t,n,r)}function bt(e,t,n,r){let{opaque:i,transmissive:a,transparent:o}=e;M.setupLightsView(n),we===!0&&qe.setGlobalState(F.clippingPlanes,n),r&&R.viewport(ue.copy(r)),i.length>0&&St(i,t,n),a.length>0&&St(a,t,n),o.length>0&&St(o,t,n),R.buffers.depth.setTest(!0),R.buffers.depth.setMask(!0),R.buffers.color.setMask(!0),R.setPolygonOffset(!1)}function xt(e,t,n,r){if((n.isScene===!0?n.overrideMaterial:null)!==null)return;if(M.state.transmissionRenderTarget[r.id]===void 0){let e=Ne.has(`EXT_color_buffer_half_float`)||Ne.has(`EXT_color_buffer_float`);M.state.transmissionRenderTarget[r.id]=new Jt(1,1,{generateMipmaps:!0,type:e?g:l,minFilter:c,samples:Math.max(4,Pe.samples),stencilBuffer:i,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:Ft.workingColorSpace})}let a=M.state.transmissionRenderTarget[r.id],o=r.viewport||ue;a.setSize(o.z*F.transmissionResolutionScale,o.w*F.transmissionResolutionScale);let s=F.getRenderTarget(),u=F.getActiveCubeFace(),d=F.getActiveMipmapLevel();F.setRenderTarget(a),F.getClearColor(pe),me=F.getClearAlpha(),me<1&&F.setClearColor(16777215,.5),F.clear(),Ae&&Ze.render(n);let f=F.toneMapping;F.toneMapping=0;let p=r.viewport;if(r.viewport!==void 0&&(r.viewport=void 0),M.setupLightsView(r),we===!0&&qe.setGlobalState(F.clippingPlanes,r),St(e,n,r),Le.updateMultisampleRenderTarget(a),Le.updateRenderTargetMipmap(a),Ne.has(`WEBGL_multisampled_render_to_texture`)===!1){let e=!1;for(let i=0,a=t.length;i<a;i++){let{object:a,geometry:o,material:s,group:c}=t[i];if(s.side===2&&a.layers.test(r.layers)){let t=s.side;s.side=1,s.needsUpdate=!0,Ct(a,n,r,o,s,c),s.side=t,s.needsUpdate=!0,e=!0}}e===!0&&(Le.updateMultisampleRenderTarget(a),Le.updateRenderTargetMipmap(a))}F.setRenderTarget(s,u,d),F.setClearColor(pe,me),p!==void 0&&(r.viewport=p),F.toneMapping=f}function St(e,t,n){let r=t.isScene===!0?t.overrideMaterial:null;for(let i=0,a=e.length;i<a;i++){let a=e[i],{object:o,geometry:s,group:c}=a,l=a.material;l.allowOverride===!0&&r!==null&&(l=r),o.layers.test(n.layers)&&Ct(o,t,n,s,l,c)}}function Ct(e,t,n,r,i,a){ne!==null&&i.isNodeMaterial&&ne.setObject(e,i),e.onBeforeRender(F,t,n,r,i,a),e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse,e.matrixWorld),e.normalMatrix.getNormalMatrix(e.modelViewMatrix),i.onBeforeRender(F,t,n,r,e,a),i.transparent===!0&&i.side===2&&i.forceSinglePass===!1?(i.side=1,i.needsUpdate=!0,F.renderBufferDirect(n,t,r,i,e,a),i.side=0,i.needsUpdate=!0,F.renderBufferDirect(n,t,r,i,e,a),i.side=2):F.renderBufferDirect(n,t,r,i,e,a),e.onAfterRender(F,t,n,r,i,a)}function wt(e,t,n){t.isScene!==!0&&(t=ke);let r=z.get(e),i=M.state.lights,a=M.state.shadowsArray,o=i.state.version,s=He.getParameters(e,i.state,a,t,n,M.state.lightProbeGridArray),c=He.getProgramCacheKey(s),l=r.programs;r.environment=e.isMeshStandardMaterial||e.isMeshLambertMaterial||e.isMeshPhongMaterial?t.environment:null,r.fog=t.fog;let u=e.isMeshStandardMaterial||e.isMeshLambertMaterial&&!e.envMap||e.isMeshPhongMaterial&&!e.envMap;r.envMap=Re.get(e.envMap||r.environment,u),r.envMapRotation=r.environment!==null&&e.envMap===null?t.environmentRotation:e.envMapRotation,l===void 0&&(e.addEventListener(`dispose`,ut),l=new Map,r.programs=l);let d=l.get(c);if(d!==void 0){if(r.currentProgram===d&&r.lightsStateVersion===o)return Et(e,s),d}else s.uniforms=He.getUniforms(e),ne!==null&&e.isNodeMaterial&&ne.build(e,n,s),e.onBeforeCompile(s,F),d=He.acquireProgram(s,c),l.set(c,d),r.uniforms=s.uniforms;let f=r.uniforms;return(!e.isShaderMaterial&&!e.isRawShaderMaterial||e.clipping===!0)&&(f.clippingPlanes=qe.uniform),Et(e,s),r.needsLights=Ot(e),r.lightsStateVersion=o,r.needsLights&&(f.ambientLightColor.value=i.state.ambient,f.lightProbe.value=i.state.probe,f.sunLights.value=i.state.sun,f.sunLightShadows.value=i.state.sunShadow,f.directionalLights.value=i.state.directional,f.directionalLightShadows.value=i.state.directionalShadow,f.spotLights.value=i.state.spot,f.spotLightShadows.value=i.state.spotShadow,f.rectAreaLights.value=i.state.rectArea,f.ltc_1.value=i.state.rectAreaLTC1,f.ltc_2.value=i.state.rectAreaLTC2,f.pointLights.value=i.state.point,f.pointLightShadows.value=i.state.pointShadow,f.hemisphereLights.value=i.state.hemi,f.sunShadowMatrix.value=i.state.sunShadowMatrix,f.sunShadowCascade.value=i.state.sunShadowCascade,f.directionalShadowMatrix.value=i.state.directionalShadowMatrix,f.spotLightMatrix.value=i.state.spotLightMatrix,f.spotLightMap.value=i.state.spotLightMap,f.pointShadowMatrix.value=i.state.pointShadowMatrix),r.lightProbeGrid=M.state.lightProbeGridArray.length>0,r.currentProgram=d,r.uniformsList=null,d}function Tt(e){if(e.uniformsList===null){let t=e.currentProgram.getUniforms();e.uniformsList=ac.seqWithValue(t.seq,e.uniforms)}return e.uniformsList}function Et(e,t){let n=z.get(e);n.outputColorSpace=t.outputColorSpace,n.batching=t.batching,n.batchingColor=t.batchingColor,n.instancing=t.instancing,n.instancingColor=t.instancingColor,n.instancingMorph=t.instancingMorph,n.skinning=t.skinning,n.morphTargets=t.morphTargets,n.morphNormals=t.morphNormals,n.morphColors=t.morphColors,n.morphTargetsCount=t.morphTargetsCount,n.numClippingPlanes=t.numClippingPlanes,n.numIntersection=t.numClipIntersection,n.vertexAlphas=t.vertexAlphas,n.vertexTangents=t.vertexTangents,n.toneMapping=t.toneMapping}function Dt(e,t){if(e.length===0)return null;if(e.length===1)return e[0].texture===null?null:e[0];D.setFromMatrixPosition(t.matrixWorld);for(let t=0,n=e.length;t<n;t++){let n=e[t];if(n.texture!==null&&n.boundingBox.containsPoint(D))return n}return null}function H(e,t,n,r,i){t.isScene!==!0&&(t=ke),Le.resetTextureUnits();let a=t.fog,o=r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial?t.environment:null,s=I===null?F.outputColorSpace:I.isXRRenderTarget===!0?I.texture.colorSpace:Ft.workingColorSpace,c=r.isMeshStandardMaterial||r.isMeshLambertMaterial&&!r.envMap||r.isMeshPhongMaterial&&!r.envMap,l=Re.get(r.envMap||o,c),u=r.vertexColors===!0&&!!n.attributes.color&&n.attributes.color.itemSize===4,d=!!n.attributes.tangent&&(!!r.normalMap||r.anisotropy>0),f=!!n.morphAttributes.position,p=!!n.morphAttributes.normal,m=!!n.morphAttributes.color,h=0;r.toneMapped&&(I===null||I.isXRRenderTarget===!0)&&(h=F.toneMapping);let g=n.morphAttributes.position||n.morphAttributes.normal||n.morphAttributes.color,_=g===void 0?0:g.length,v=z.get(r),y=M.state.lights;if(we===!0&&(Te===!0||e!==le)){let t=e===le&&r.id===ce;qe.setState(r,e,t)}let b=!1;r.version===v.__version?v.needsLights&&v.lightsStateVersion!==y.state.version?b=!0:v.outputColorSpace===s?i.isBatchedMesh&&v.batching===!1||!i.isBatchedMesh&&v.batching===!0||i.isBatchedMesh&&v.batchingColor===!0&&i._colorsTexture===null||i.isBatchedMesh&&v.batchingColor===!1&&i._colorsTexture!==null||i.isInstancedMesh&&v.instancing===!1||!i.isInstancedMesh&&v.instancing===!0||i.isSkinnedMesh&&v.skinning===!1||!i.isSkinnedMesh&&v.skinning===!0||i.isInstancedMesh&&v.instancingColor===!0&&i.instanceColor===null||i.isInstancedMesh&&v.instancingColor===!1&&i.instanceColor!==null||i.isInstancedMesh&&v.instancingMorph===!0&&i.morphTexture===null||i.isInstancedMesh&&v.instancingMorph===!1&&i.morphTexture!==null?b=!0:v.envMap===l?r.fog===!0&&v.fog!==a||v.numClippingPlanes!==void 0&&(v.numClippingPlanes!==qe.numPlanes||v.numIntersection!==qe.numIntersection)?b=!0:v.vertexAlphas===u&&v.vertexTangents===d&&v.morphTargets===f&&v.morphNormals===p&&v.morphColors===m&&v.toneMapping===h&&v.morphTargetsCount===_?!!v.lightProbeGrid!=M.state.lightProbeGridArray.length>0&&(b=!0):b=!0:b=!0:b=!0:(b=!0,v.__version=r.version);let x=v.currentProgram;b===!0&&(x=wt(r,t,i),ne&&r.isNodeMaterial&&ne.onUpdateProgram(r,x,v));let S=!1,C=!1,w=!1,T=x.getUniforms(),E=v.uniforms;if(R.useProgram(x.program)&&(S=!0,C=!0,w=!0),r.id!==ce&&(ce=r.id,C=!0),v.needsLights){let e=Dt(M.state.lightProbeGridArray,i);v.lightProbeGrid!==e&&(v.lightProbeGrid=e,C=!0)}if(S||le!==e){R.buffers.depth.getReversed()&&e.reversedDepth!==!0&&(e._reversedDepth=!0,e.updateProjectionMatrix()),T.setValue(L,`projectionMatrix`,e.projectionMatrix),T.setValue(L,`viewMatrix`,e.matrixWorldInverse);let t=T.map.cameraPosition;t!==void 0&&t.setValue(L,De.setFromMatrixPosition(e.matrixWorld)),Pe.logarithmicDepthBuffer&&T.setValue(L,`logDepthBufFC`,2/(Math.log(e.far+1)/Math.LN2)),(r.isMeshPhongMaterial||r.isMeshToonMaterial||r.isMeshLambertMaterial||r.isMeshBasicMaterial||r.isMeshStandardMaterial||r.isShaderMaterial)&&T.setValue(L,`isOrthographic`,e.isOrthographicCamera===!0),le!==e&&(le=e,C=!0,w=!0)}if(v.needsLights&&(y.state.sunShadowMap.length>0&&T.setValue(L,`sunShadowMap`,y.state.sunShadowMap,Le),y.state.directionalShadowMap.length>0&&T.setValue(L,`directionalShadowMap`,y.state.directionalShadowMap,Le),y.state.spotShadowMap.length>0&&T.setValue(L,`spotShadowMap`,y.state.spotShadowMap,Le),y.state.pointShadowMap.length>0&&T.setValue(L,`pointShadowMap`,y.state.pointShadowMap,Le)),i.isSkinnedMesh){T.setOptional(L,i,`bindMatrix`),T.setOptional(L,i,`bindMatrixInverse`);let e=i.skeleton;e&&(e.boneTexture===null&&e.computeBoneTexture(),T.setValue(L,`boneTexture`,e.boneTexture,Le))}i.isBatchedMesh&&(T.setOptional(L,i,`batchingTexture`),T.setValue(L,`batchingTexture`,i._matricesTexture,Le),T.setOptional(L,i,`batchingIdTexture`),T.setValue(L,`batchingIdTexture`,i._indirectTexture,Le),T.setOptional(L,i,`batchingColorTexture`),i._colorsTexture!==null&&T.setValue(L,`batchingColorTexture`,i._colorsTexture,Le));let D=n.morphAttributes;if((D.position!==void 0||D.normal!==void 0||D.color!==void 0)&&Qe.update(i,n,x),(C||v.receiveShadow!==i.receiveShadow)&&(v.receiveShadow=i.receiveShadow,T.setValue(L,`receiveShadow`,i.receiveShadow)),(r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial)&&r.envMap===null&&t.environment!==null&&(E.envMapIntensity.value=t.environmentIntensity),E.dfgLUT!==void 0&&(E.dfgLUT.value=El()),C){if(T.setValue(L,`toneMappingExposure`,F.toneMappingExposure),v.needsLights&&U(E,w),a&&r.fog===!0&&Ue.refreshFogUniforms(E,a),Ue.refreshMaterialUniforms(E,r,_e,ge,M.state.transmissionRenderTarget[e.id]),v.needsLights&&v.lightProbeGrid){let e=v.lightProbeGrid;E.probesSH.value=e.texture,E.probesMin.value.copy(e.boundingBox.min),E.probesMax.value.copy(e.boundingBox.max),E.probesResolution.value.copy(e.resolution)}ac.upload(L,Tt(v),E,Le)}if(r.isShaderMaterial&&r.uniformsNeedUpdate===!0&&(ac.upload(L,Tt(v),E,Le),r.uniformsNeedUpdate=!1),r.isSpriteMaterial&&T.setValue(L,`center`,i.center),T.setValue(L,`modelViewMatrix`,i.modelViewMatrix),T.setValue(L,`normalMatrix`,i.normalMatrix),T.setValue(L,`modelMatrix`,i.matrixWorld),r.uniformsGroups!==void 0){let e=r.uniformsGroups;for(let t=0,n=e.length;t<n;t++){let n=e[t];it.update(n,x),it.bind(n,x)}}return x}function U(e,t){e.ambientLightColor.needsUpdate=t,e.lightProbe.needsUpdate=t,e.sunLights.needsUpdate=t,e.sunLightShadows.needsUpdate=t,e.directionalLights.needsUpdate=t,e.directionalLightShadows.needsUpdate=t,e.pointLights.needsUpdate=t,e.pointLightShadows.needsUpdate=t,e.spotLights.needsUpdate=t,e.spotLightShadows.needsUpdate=t,e.rectAreaLights.needsUpdate=t,e.hemisphereLights.needsUpdate=t}function Ot(e){return e.isMeshLambertMaterial||e.isMeshToonMaterial||e.isMeshPhongMaterial||e.isMeshStandardMaterial||e.isShadowMaterial||e.isShaderMaterial&&e.lights===!0}this.getActiveCubeFace=function(){return oe},this.getActiveMipmapLevel=function(){return se},this.getRenderTarget=function(){return I},this.setRenderTargetTextures=function(e,t,n){let r=z.get(e);r.__autoAllocateDepthBuffer=e.resolveDepthBuffer===!1,r.__autoAllocateDepthBuffer===!1&&(r.__useRenderToTexture=!1),z.get(e.texture).__webglTexture=t,z.get(e.depthTexture).__webglTexture=r.__autoAllocateDepthBuffer?void 0:n,r.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(e,t){let n=z.get(e);n.__webglFramebuffer=t,n.__useDefaultFramebuffer=t===void 0},this.setRenderTarget=function(e,t=0,n=0){I=e,oe=t,se=n;let r=null,i=!1,a=!1;if(e){let o=z.get(e);if(o.__useDefaultFramebuffer!==void 0){R.bindFramebuffer(L.FRAMEBUFFER,o.__webglFramebuffer),ue.copy(e.viewport),de.copy(e.scissor),fe=e.scissorTest,R.viewport(ue),R.scissor(de),R.setScissorTest(fe),ce=-1;return}if(o.__webglFramebuffer===void 0)Le.setupRenderTarget(e);else if(o.__hasExternalTextures)Le.rebindTextures(e,z.get(e.texture).__webglTexture,z.get(e.depthTexture).__webglTexture);else if(e.depthBuffer){let t=e.depthTexture;if(o.__boundDepthTexture!==t){if(t!==null&&z.has(t)&&(e.width!==t.image.width||e.height!==t.image.height))throw Error(`THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.`);Le.setupDepthRenderbuffer(e)}}let s=e.texture;(s.isData3DTexture||s.isDataArrayTexture||s.isCompressedArrayTexture)&&(a=!0);let c=z.get(e).__webglFramebuffer;e.isWebGLCubeRenderTarget?(r=Array.isArray(c[t])?c[t][n]:c[t],i=!0):r=e.samples>0&&Le.useMultisampledRTT(e)===!1?z.get(e).__webglMultisampledFramebuffer:Array.isArray(c)?c[n]:c,ue.copy(e.viewport),de.copy(e.scissor),fe=e.scissorTest}else ue.copy(be).multiplyScalar(_e).floor(),de.copy(xe).multiplyScalar(_e).floor(),fe=Se;if(n!==0&&(r=re),R.bindFramebuffer(L.FRAMEBUFFER,r)&&R.drawBuffers(e,r),R.viewport(ue),R.scissor(de),R.setScissorTest(fe),i){let r=z.get(e.texture);L.framebufferTexture2D(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_CUBE_MAP_POSITIVE_X+t,r.__webglTexture,n)}else if(a){let r=t;for(let t=0;t<e.textures.length;t++){let i=z.get(e.textures[t]);L.framebufferTextureLayer(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0+t,i.__webglTexture,n,r)}}else if(e!==null&&n!==0){let t=z.get(e.texture);L.framebufferTexture2D(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,t.__webglTexture,n)}ce=-1};function kt(e){let t=z.get(e);return(t.__readFormat!==e.format||t.__readType!==e.type)&&(t.__readFormat=e.format,t.__readType=e.type,t.__formatReadable=Pe.textureFormatReadable(e.format),t.__typeReadable=Pe.textureTypeReadable(e.type)),t}this.readRenderTargetPixels=function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget)){V(`WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);return}let c=z.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o]),c){R.bindFramebuffer(L.FRAMEBUFFER,c);try{let o=e.textures[s],c=o.format,l=o.type;e.textures.length>1&&L.readBuffer(L.COLOR_ATTACHMENT0+s);let u=kt(o);if(u.__formatReadable===!1){V(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.`);return}if(u.__typeReadable===!1){V(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.`);return}t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i&&L.readPixels(t,n,r,i,nt.convert(c),nt.convert(l),a)}finally{let e=I===null?null:z.get(I).__webglFramebuffer;R.bindFramebuffer(L.FRAMEBUFFER,e)}}},this.readRenderTargetPixelsAsync=async function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget))throw Error(`THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);let c=z.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o]),c){if(t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i){R.bindFramebuffer(L.FRAMEBUFFER,c);let o=e.textures[s],l=o.format,u=o.type;e.textures.length>1&&L.readBuffer(L.COLOR_ATTACHMENT0+s);let d=kt(o);if(d.__formatReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.`);if(d.__typeReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.`);let f=L.createBuffer();L.bindBuffer(L.PIXEL_PACK_BUFFER,f),L.bufferData(L.PIXEL_PACK_BUFFER,a.byteLength,L.STREAM_READ),L.readPixels(t,n,r,i,nt.convert(l),nt.convert(u),0),L.bindBuffer(L.PIXEL_PACK_BUFFER,null);let p=I===null?null:z.get(I).__webglFramebuffer;R.bindFramebuffer(L.FRAMEBUFFER,p);let m=L.fenceSync(L.SYNC_GPU_COMMANDS_COMPLETE,0);return L.flush(),await $e(L,m,4),L.bindBuffer(L.PIXEL_PACK_BUFFER,f),L.getBufferSubData(L.PIXEL_PACK_BUFFER,0,a),L.bindBuffer(L.PIXEL_PACK_BUFFER,null),L.deleteBuffer(f),L.deleteSync(m),a}throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.`)}},this.copyFramebufferToTexture=function(e,t=null,n=0){let r=2**-n,i=Math.floor(e.image.width*r),a=Math.floor(e.image.height*r),o=t===null?0:t.x,s=t===null?0:t.y;Le.setTexture2D(e,0),L.copyTexSubImage2D(L.TEXTURE_2D,n,0,0,o,s,i,a),R.unbindTexture()},this.copyTextureToTexture=function(e,t,n=null,r=null,i=0,a=0){let o,s,c,l,u,d,f,p,m,h=e.isCompressedTexture?e.mipmaps[a]:e.image;if(n!==null)o=n.max.x-n.min.x,s=n.max.y-n.min.y,c=n.isBox3?n.max.z-n.min.z:1,l=n.min.x,u=n.min.y,d=n.isBox3?n.min.z:0;else{let t=2**-i;o=Math.floor(h.width*t),s=Math.floor(h.height*t),c=e.isDataArrayTexture?h.depth:e.isData3DTexture?Math.floor(h.depth*t):1,l=0,u=0,d=0}r===null?(f=0,p=0,m=0):(f=r.x,p=r.y,m=r.z);let g=nt.convert(t.format),_=nt.convert(t.type),v;t.isData3DTexture?(Le.setTexture3D(t,0),v=L.TEXTURE_3D):t.isDataArrayTexture||t.isCompressedArrayTexture?(Le.setTexture2DArray(t,0),v=L.TEXTURE_2D_ARRAY):(Le.setTexture2D(t,0),v=L.TEXTURE_2D),R.activeTexture(L.TEXTURE0),R.pixelStorei(L.UNPACK_FLIP_Y_WEBGL,t.flipY),R.pixelStorei(L.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),R.pixelStorei(L.UNPACK_ALIGNMENT,t.unpackAlignment);let y=R.getParameter(L.UNPACK_ROW_LENGTH),b=R.getParameter(L.UNPACK_IMAGE_HEIGHT),x=R.getParameter(L.UNPACK_SKIP_PIXELS),S=R.getParameter(L.UNPACK_SKIP_ROWS),C=R.getParameter(L.UNPACK_SKIP_IMAGES);R.pixelStorei(L.UNPACK_ROW_LENGTH,h.width),R.pixelStorei(L.UNPACK_IMAGE_HEIGHT,h.height),R.pixelStorei(L.UNPACK_SKIP_PIXELS,l),R.pixelStorei(L.UNPACK_SKIP_ROWS,u),R.pixelStorei(L.UNPACK_SKIP_IMAGES,d);let w=e.isDataArrayTexture||e.isData3DTexture,T=t.isDataArrayTexture||t.isData3DTexture;if(e.isDepthTexture){let n=z.get(e),r=z.get(t),h=z.get(n.__renderTarget),g=z.get(r.__renderTarget);R.bindFramebuffer(L.READ_FRAMEBUFFER,h.__webglFramebuffer),R.bindFramebuffer(L.DRAW_FRAMEBUFFER,g.__webglFramebuffer);for(let n=0;n<c;n++)w&&(L.framebufferTextureLayer(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,z.get(e).__webglTexture,i,d+n),L.framebufferTextureLayer(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,z.get(t).__webglTexture,a,m+n)),L.blitFramebuffer(l,u,o,s,f,p,o,s,L.DEPTH_BUFFER_BIT,L.NEAREST);R.bindFramebuffer(L.READ_FRAMEBUFFER,null),R.bindFramebuffer(L.DRAW_FRAMEBUFFER,null)}else if(i!==0||e.isRenderTargetTexture||z.has(e)){let n=z.get(e),r=z.get(t);R.bindFramebuffer(L.READ_FRAMEBUFFER,ie),R.bindFramebuffer(L.DRAW_FRAMEBUFFER,ae);for(let e=0;e<c;e++)w?L.framebufferTextureLayer(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,n.__webglTexture,i,d+e):L.framebufferTexture2D(L.READ_FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,n.__webglTexture,i),T?L.framebufferTextureLayer(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,r.__webglTexture,a,m+e):L.framebufferTexture2D(L.DRAW_FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_2D,r.__webglTexture,a),i===0?T?L.copyTexSubImage3D(v,a,f,p,m+e,l,u,o,s):L.copyTexSubImage2D(v,a,f,p,l,u,o,s):L.blitFramebuffer(l,u,o,s,f,p,o,s,L.COLOR_BUFFER_BIT,L.NEAREST);R.bindFramebuffer(L.READ_FRAMEBUFFER,null),R.bindFramebuffer(L.DRAW_FRAMEBUFFER,null)}else T?e.isDataTexture||e.isData3DTexture?L.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h.data):t.isCompressedArrayTexture?L.compressedTexSubImage3D(v,a,f,p,m,o,s,c,g,h.data):L.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h):e.isDataTexture?L.texSubImage2D(L.TEXTURE_2D,a,f,p,o,s,g,_,h.data):e.isCompressedTexture?L.compressedTexSubImage2D(L.TEXTURE_2D,a,f,p,h.width,h.height,g,h.data):L.texSubImage2D(L.TEXTURE_2D,a,f,p,o,s,g,_,h);R.pixelStorei(L.UNPACK_ROW_LENGTH,y),R.pixelStorei(L.UNPACK_IMAGE_HEIGHT,b),R.pixelStorei(L.UNPACK_SKIP_PIXELS,x),R.pixelStorei(L.UNPACK_SKIP_ROWS,S),R.pixelStorei(L.UNPACK_SKIP_IMAGES,C),a===0&&t.generateMipmaps&&L.generateMipmap(v),R.unbindTexture()},this.initRenderTarget=function(e){z.get(e).__webglFramebuffer===void 0&&Le.setupRenderTarget(e)},this.initTexture=function(e){e.isCubeTexture?Le.setTextureCube(e,0):e.isData3DTexture?Le.setTexture3D(e,0):e.isDataArrayTexture||e.isCompressedArrayTexture?Le.setTexture2DArray(e,0):Le.setTexture2D(e,0),R.unbindTexture()},this.resetState=function(){oe=0,se=0,I=null,R.reset(),rt.reset()},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}get coordinateSystem(){return We}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=Ft._getDrawingBufferColorSpace(e),t.unpackColorSpace=Ft._getUnpackColorSpace()}};Ft.enabled=!1;function Ol(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}function kl(e,t,n,r=0){let i=(n^Math.imul(r+2654435769,2246822507))>>>0;return i=Math.imul(i^Math.imul(e|0,668265261),374761393),i=Math.imul(i^Math.imul(t|0,461845907),3432918353),i^=i>>>15,i=Math.imul(i,2246822507),i^=i>>>13,i=Math.imul(i,3266489909),i^=i>>>16,i>>>0}function Y(e,t,n,r=0){return kl(e,t,n,r)/4294967296}function Al(e){let t=e.trim();if(/^-?\d+$/.test(t))return parseInt(t,10)>>>0||1;let n=2166136261;for(let e=0;e<t.length;e++)n^=t.charCodeAt(e),n=Math.imul(n,16777619);return n>>>0||1}var jl=(e,t,n)=>e<t?t:e>n?n:e,Ml=(e,t,n)=>e+(t-e)*n;function Nl(e,t,n){let r=jl((n-e)/(t-e),0,1);return r*r*(3-2*r)}var Pl={rose:{name:`Rose dawn`,skyTop:`#edcfb6`,skyMid:`#f2dcc6`,skyHorizon:`#f6e6d4`,sunGlow:`#fbeedd`,fog:`#efd6c3`,light:`#fff8f0`,mid:`#ecd6d0`,shade:`#cbaeb4`,tint:`#c8918a`,tintAmt:.62,lift:.24,cloud:`#fdf8f2`,cloudShade:`#f0dcd2`,cloudRim:`#fff9f2`,outline:`#5c3a3e`,sun:`#fff6ea`,stars:0,night:0,water:`#b6a7b0`},golden:{name:`Golden meadow`,skyTop:`#ecd6a8`,skyMid:`#f2e2bc`,skyHorizon:`#f7ecd1`,sunGlow:`#fcf3de`,fog:`#f1e2c0`,light:`#fff8e8`,mid:`#ecdcbe`,shade:`#c6b09c`,tint:`#c9ab72`,tintAmt:.46,lift:.07,cloud:`#fffaf0`,cloudShade:`#f3e6cc`,cloudRim:`#fffbf2`,outline:`#4c3526`,sun:`#fffaf0`,stars:0,night:0,water:`#a9b3a6`},olive:{name:`Olive forest`,skyTop:`#e6d9b8`,skyMid:`#eee3c7`,skyHorizon:`#f3ead6`,sunGlow:`#f8f0e0`,fog:`#e7dbbd`,light:`#fff8e6`,mid:`#e8d8b8`,shade:`#bca894`,tint:`#ad9a66`,tintAmt:.4,lift:.05,cloud:`#fffbf2`,cloudShade:`#efe4cd`,cloudRim:`#fffcf4`,outline:`#402c20`,sun:`#fffbf0`,stars:0,night:0,water:`#9fb0a8`},coral:{name:`Coral dusk`,skyTop:`#76597f`,skyMid:`#d98583`,skyHorizon:`#f5b08e`,sunGlow:`#fbd0a8`,fog:`#eca58e`,light:`#fff0e0`,mid:`#ecc2b8`,shade:`#bc92a0`,tint:`#d88c7c`,tintAmt:.54,lift:.2,cloud:`#86648a`,cloudShade:`#6e5078`,cloudRim:`#f6c7a6`,outline:`#4a2a3a`,sun:`#fff0d8`,stars:.15,night:.15,water:`#8c86a6`},twilight:{name:`Twilight`,skyTop:`#343d6a`,skyMid:`#6a6690`,skyHorizon:`#b08ca4`,sunGlow:`#c89aa6`,fog:`#8a7ea0`,light:`#d0c8e6`,mid:`#aaa4cc`,shade:`#8480ac`,tint:`#8a82b4`,tintAmt:.72,lift:.06,cloud:`#5e5a86`,cloudShade:`#4c4a74`,cloudRim:`#c6a2b4`,outline:`#241c38`,sun:`#ffe8d8`,stars:.55,night:.7,water:`#5c6490`},night:{name:`Blue night`,skyTop:`#16213f`,skyMid:`#22325a`,skyHorizon:`#34497a`,sunGlow:`#3e5588`,fog:`#33466f`,light:`#8d9dd2`,mid:`#6d7cb2`,shade:`#4d5989`,tint:`#5d74b0`,tintAmt:.86,lift:0,cloud:`#2c3a62`,cloudShade:`#243256`,cloudRim:`#50679a`,outline:`#141630`,sun:`#e8eeff`,stars:1,night:1,water:`#2a3a64`}},Fl=[[0,`night`],[4.6,`night`],[5.8,`twilight`],[7,`rose`],[9.5,`golden`],[12.5,`olive`],[16,`golden`],[18.2,`coral`],[19.6,`twilight`],[20.8,`night`],[24,`night`]],Il=new K,Ll=new K;function Rl(e,t,n,r){for(let i of Object.keys(e)){if(i===`name`)continue;let a=e[i],o=t[i];if(typeof a==`number`&&typeof o==`number`)r[i]=a+(o-a)*n;else{Il.set(a),Ll.set(o);let e=r[i]??new K;e.copy(Il).lerp(Ll,n),r[i]=e}}}function zl(e,t,n){let r=n;if(t&&Pl[t])return Rl(Pl[t],Pl[t],0,r),n;let i=(e%24+24)%24;for(let e=0;e<Fl.length-1;e++){let[t,a]=Fl[e],[o,s]=Fl[e+1];if(i>=t&&i<=o){let e=o>t?(i-t)/(o-t):0,c=e*e*(3-2*e);return Rl(Pl[a],Pl[s],c,r),n}}return Rl(Pl.night,Pl.night,0,r),n}var Bl={meadow:`#c6ae6c`,meadowDark:`#b09860`,forestFloor:`#8e7d4e`,heath:`#a08a7a`,rock:`#b8a39c`,rockDark:`#8f7c78`,snow:`#f6f1ea`,sand:`#dcc59c`,path:`#d8c197`,seabed:`#8a8878`,foliage:`#5d5a3c`,foliageDark:`#4a4630`,trunk:`#7a5244`,bush:`#6c6a42`,tuft:`#7a6a3a`,flower:`#fbf6ec`,flowerCore:`#e8c860`,buttercup:`#f0d25a`,harebell:`#9ea6e0`,waterShallow:`#a4b6b4`,foam:`#f2efe6`,cabinWall:`#a9543f`,cabinWall2:`#8a6a52`,cabinRoof:`#5c4040`,cabinTrim:`#efe4d2`,cabinWindow:`#3b3440`,windowGlow:`#ffd27a`,cabinDoor:`#5a3c30`,stone:`#9d918a`,cutWood:`#e9cf9c`,steel:`#8e9cab`,soot:`#3e3238`,ember:`#ffb45a`},Vl=`
precision highp float;
uniform vec3 uLightDir;
uniform vec3 uLightCol;
uniform vec3 uMidCol;
uniform vec3 uShadeCol;
uniform float uBand1;
uniform float uBand2;
uniform float uTime;
uniform float uNight;
uniform sampler2D uNoise;

vec3 toonLight(vec3 n) {
  float d = dot(n, uLightDir);
  return d > uBand1 ? uLightCol : (d > uBand2 ? uMidCol : uShadeCol);
}

// The one "you can use this" signal (story interactables): a hard-edged warm
// rim that breathes, plus a slow shimmer that sweeps across the form now and
// then. Returns (rim amount, shimmer amount); callers tint and add emissive.
vec2 glintAmt(vec3 n, vec3 viewDir, vec3 world, float k) {
  if (k <= 0.0) return vec2(0.0);
  float fres = 1.0 - abs(dot(n, viewDir));
  float pulse = 0.62 + 0.38 * sin(uTime * 2.4);
  float rim = step(0.62 - 0.1 * k, fres) * pulse;
  float sweep = fract((world.x + world.z) * 0.18 + world.y * 0.3 - uTime * 0.42);
  float shimmer = step(0.93, sweep) * step(sweep, 0.985);
  return vec2(rim, shimmer) * min(k, 1.5);
}
const vec3 GLINT_COL = vec3(1.0, 0.94, 0.72);
`,Hl=`
layout(location = 0) out vec4 gColor;
layout(location = 1) out vec4 gND;
// Props store half-length normals so post passes can tell them from ground;
// creatures (uIsProp = 2) store 0.62 so outlines can treat them gently.
uniform float uIsProp;
void writeG(vec3 col, float emissive, vec3 nWorld, vec3 viewPos) {
  gColor = vec4(col, emissive);
  float tag = uIsProp > 1.5 ? 0.62 : uIsProp > 0.5 ? 0.5 : 1.0;
  gND = vec4(normalize((viewMatrix * vec4(nWorld, 0.0)).xyz) * tag, -viewPos.z);
}
`,Ul=`
in vec4 aBiome;
out vec3 vWorld;
out vec3 vN;
out vec4 vBiome;
out vec3 vView;
out float vH;
void main() {
  vec3 p = position;
  vH = p.y;
  // Sink the seabed with distance only, so far shorelines never z-fight with
  // the water plane while near shores keep their true shape.
  vec4 wp0 = modelMatrix * vec4(p, 1.0);
  float push = clamp(length(wp0.xyz - cameraPosition) / 400.0, 0.0, 8.0);
  if (p.y < 0.0) p.y -= push * min(1.0, -p.y * 2.0);
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWorld = wp.xyz;
  vN = normal;
  vBiome = aBiome;
  vec4 vp = viewMatrix * wp;
  vView = vp.xyz;
  gl_Position = projectionMatrix * vp;
}
`,Wl=`
${Vl}
${Hl}
in vec3 vWorld;
in vec3 vN;
in vec4 vBiome;
in vec3 vView;
in float vH;
uniform vec3 cMeadow;
uniform vec3 cMeadowDark;
uniform vec3 cForest;
uniform vec3 cHeath;
uniform vec3 cRock;
uniform vec3 cRockDark;
uniform vec3 cSnow;
uniform vec3 cSand;
uniform vec3 cPath;
uniform vec3 cSeabed;
uniform vec3 cStroke;
uniform float uSnowLine;
uniform float uStrokes;
uniform vec3 uPlayerFeet;
uniform float uPlayerLift;
// Creature contact shadows: xyz = ground point under it, w = radius (0 = off).
uniform vec4 uMobShadow[12];

// Storybook ground marks: short curved dashes scattered in world space,
// only near the camera (they'd shimmer further out).
float strokeCell(vec2 p, float scale, float salt) {
  vec2 cell = floor(p / scale);
  vec2 f = p / scale - cell;
  vec4 r = texture(uNoise, (cell * 7.0 + salt) / 256.0 + salt * 0.37);
  if (r.a < 0.5) return 0.0;
  vec2 c = vec2(0.25 + 0.5 * r.r, 0.25 + 0.5 * r.g);
  float ang = (r.b - 0.5) * 1.3;
  vec2 d = f - c;
  d = vec2(cos(ang) * d.x - sin(ang) * d.y, sin(ang) * d.x + cos(ang) * d.y);
  float len = 0.09 + 0.12 * fract(r.r * 13.7);
  float bend = (fract(r.g * 7.3) - 0.5) * 5.0;
  float curve = d.y - bend * d.x * d.x;
  float w = 0.012 + 0.012 * (1.0 - abs(d.x) / len);
  return step(abs(d.x), len) * step(abs(curve), w);
}

// Storybook ground marks: short curved dashes, jittered and rotated per cell
// on two offset lattices so no grid reads through. Only near the camera.
float strokes(vec2 p, float dist) {
  if (dist > 60.0 || uStrokes < 0.5) return 0.0;
  float m = max(strokeCell(p, 1.9, 0.0), strokeCell(p + vec2(0.83, 1.37), 2.3, 3.1));
  return m * (1.0 - smoothstep(30.0, 60.0, dist));
}

void main() {
  vec3 n = normalize(vN);
  float slope = 1.0 - n.y;
  vec4 nz = texture(uNoise, vWorld.xz / 210.0);
  vec4 nz2 = texture(uNoise, vWorld.xz / 27.0);
  float h = vH;
  float dist = length(vView);
  float forest = vBiome.x;
  float rocky = vBiome.y;
  float path = vBiome.z;

  vec3 c = cMeadow;
  bool grass = true;
  if (nz.r * 0.8 + nz2.g * 0.35 > 0.68) c = cMeadowDark;
  if (forest + (nz2.r - 0.5) * 0.3 > 0.42) c = cForest;
  float heathLine = 105.0 + (nz.g - 0.5) * 70.0;
  if (h > heathLine) c = cHeath;
  // Far terrain simplifies: slope detail fades so coarse chunks don't show
  // their triangles, leaving height bands (moor / snow) as flat layers.
  float farK = smoothstep(500.0, 1600.0, dist);
  float rockT = 0.33 - rocky * 0.08 + (nz2.b - 0.5) * 0.12 + farK * 0.5;
  if (slope > rockT) {
    c = slope + (nz.b - 0.5) * 0.25 > 0.55 ? cRockDark : cRock;
    grass = false;
  }
  if (h < 1.1 + nz2.r * 1.3) { c = cSand; grass = false; }
  if (h < -2.5) c = cSeabed;
  if (path < 0.95 + (nz2.g - 0.5) * 0.6 && h > 0.8) { c = cPath; grass = false; }
  float snowLine = uSnowLine + (nz.r - 0.5) * 80.0 + (texture(uNoise, vWorld.xz / 90.0).b - 0.5) * 18.0;
  bool snow = h > snowLine && slope < 0.8;
  if (snow) { c = cSnow; grass = false; }

  vec3 lightBand = toonLight(n);
  lightBand = mix(lightBand, mix(uMidCol, uLightCol, 0.6), smoothstep(350.0, 1300.0, dist));
  vec3 col = c * lightBand;
  // Contact shadow under the explorer: a flat ellipse in the shade tone.
  // uPlayerFeet.y is the ground under them; it shrinks as they rise.
  vec2 pd = vWorld.xz - uPlayerFeet.xz;
  float shR = 0.52 / (1.0 + uPlayerLift * 0.12);
  if (dot(pd, pd) < shR * shR && abs(vH - uPlayerFeet.y) < 0.6) col = c * uShadeCol * 0.92;
  for (int i = 0; i < 12; i++) {
    vec4 ms = uMobShadow[i];
    if (ms.w <= 0.0) continue;
    vec2 md = vWorld.xz - ms.xz;
    if (dot(md, md) < ms.w * ms.w && abs(vH - ms.y) < 0.8) col = c * uShadeCol * 0.92;
  }
  if (grass) {
    float s = strokes(vWorld.xz, dist);
    col = mix(col, cStroke * toonLight(n), s * 0.8);
  }
  // Snow caps resist the monochrome grade: they stay the brightest thing.
  writeG(col, snow ? -0.55 : 0.0, n, vView);
}
`,Gl=`
in vec4 aI0;
in vec4 aI1;
in float aKind;
uniform float uTime;
uniform float uBend;
uniform float uWind;
uniform float uHeightRef;
uniform float uCutaway;
uniform vec3 uFocus;
out vec3 vN;
out vec3 vView;
out vec3 vLocal;
out float vKind;
out float vTone;
out vec3 vWorld;
void main() {
  vec3 p = position;
  float sc = aI0.w;
  float sy = aI1.y;
  vLocal = p;
  float hN = clamp(p.y / uHeightRef, 0.0, 1.0);
  p.xz *= sc;
  p.y *= sc * sy;
  vec3 base = (modelMatrix * vec4(aI0.xyz, 1.0)).xyz;
  if (uCutaway > 1.5) {
    // Hide whole trees whose canopy actually blocks the camera->player
    // sightline, instead of slicing them open. The canopy is a cone from
    // ~17% of the height (under the drooping lowest tier) to the tip. A tree
    // right beside the player isn't hidden: the sightline there runs at
    // chest height, under its branches.
    vec2 a = cameraPosition.xz;
    vec2 ab = uFocus.xz - a;
    float L2 = max(dot(ab, ab), 1e-3);
    float L = sqrt(L2);
    float t0 = dot(base.xz - a, ab) / L2;
    float rMax = 2.8 * sc + 0.3;
    float perp = length(base.xz - (a + ab * clamp(t0, 0.0, 1.0)));
    if (perp < rMax) {
      float hTree = uHeightRef * sc * sy;
      float yLow = 0.17 * hTree;
      // Where the sightline crosses the canopy footprint; stop short of the player.
      float span = sqrt(max(rMax * rMax - perp * perp, 0.0)) / L;
      float tEnd = 1.0 - 0.6 / L;
      bool hide = false;
      for (int i = 0; i < 5; i++) {
        float t = clamp(t0 + span * (float(i) * 0.5 - 1.0), 0.0, tEnd);
        vec3 q = mix(cameraPosition, uFocus, t);
        float y = q.y - base.y;
        float cr = y < yLow ? 0.0 : rMax * clamp((hTree - y) / (hTree - yLow), 0.0, 1.0);
        if (length(q.xz - base.xz) < cr) hide = true;
      }
      if (hide) {
        gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
        return;
      }
    }
  }
  float sway = sin(uTime * 1.1 + base.x * 0.045 + base.z * 0.06) * uWind
             + sin(uTime * 2.3 + base.z * 0.11) * uWind * 0.35;
  float bendAmt = (aI1.z * uBend + sway) * hN * hN * uHeightRef * sc;
  p.x += bendAmt;
  float c = cos(aI1.x);
  float s = sin(aI1.x);
  p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
  vec3 nrm = normal;
  // Tilt normals with the bend so lit sides follow the curve.
  nrm.x -= aI1.z * uBend * hN * 1.5;
  nrm = normalize(vec3(c * nrm.x + s * nrm.z, nrm.y / max(sy, 0.3), -s * nrm.x + c * nrm.z));
  vec4 wp = modelMatrix * vec4(p + aI0.xyz, 1.0);
  vWorld = wp.xyz;
  // Chunk groups are translation-only; story props may rotate (a falling tree).
  vN = normalize(mat3(modelMatrix) * nrm);
  vKind = aKind;
  vTone = aI1.w;
  vec4 vp = viewMatrix * wp;
  vView = vp.xyz;
  gl_Position = projectionMatrix * vp;
}
`,Kl=`
${Vl}
${Hl}
in vec3 vN;
in vec3 vView;
in vec3 vLocal;
in float vKind;
in float vTone;
in vec3 vWorld;
uniform vec3 uKind[21];
uniform vec3 uGlow;
/** Story interactable signal strength (0 = none). */
uniform float uGlint;
/** Window glow override: < 0 = follow the night (every world cabin); else a lit/unlit story cabin. */
uniform float uWin;
/** Firelight on story interiors (0..1). */
uniform float uFire;
uniform float uToneVar;
uniform float uFlip;
uniform float uCutaway;
uniform vec3 uFocus;
// Kinds: 0 foliage, 1 trunk, 2 rock, 3 bush, 4 tuft, 5 flower petal, 6 flower core,
// 7 wall, 8 roof, 9 trim, 10 window, 11 door, 12 stone, 13 wall alt, 14 snowcap(rock),
// 15 harebell, 16 buttercup (petals of kind 5 with instance tone > 0.6),
// 17 cut wood, 18 axe steel, 19 soot, 20 ember glow
void main() {
  int k = int(vKind + 0.5);
  if (uCutaway > 0.5) {
    // Cut away foliage between the camera and the player, and anything that
    // would brush the near plane.
    if (-vView.z < 1.5) discard;
  }
  vec3 n = normalize(vN);
  if (uFlip > 0.5 && !gl_FrontFacing) n = -n;
  vec3 base = uKind[k];
  bool petal = k == 5 || k == 15;
  if (k == 5 && vTone > 0.6) base = uKind[16];
  base *= 1.0 - uToneVar * 0.5 + uToneVar * vTone;
  float emissive = 0.0;
  if (k == 7 || k == 13) {
    // clapboard lines
    float line = step(0.86, fract(vLocal.y * 2.4));
    base *= 1.0 - 0.18 * line;
  } else if (k == 8) {
    float line = step(0.84, fract((vLocal.y + abs(vLocal.z) * 0.9) * 2.2));
    base *= 1.0 - 0.2 * line;
  } else if (k == 10) {
    float w = uWin < 0.0 ? uNight : uWin;
    base = mix(base, uGlow, w);
    emissive = w;
  } else if (k == 20) {
    emissive = 0.9;
  }
  vec3 col = k == 10 || k == 20 ? base : base * toonLight(n);
  // Firelight: interior faces warm up and flicker when the hearth is lit.
  if (uFire > 0.0 && k != 10 && k != 20) {
    float fl = 0.85 + 0.15 * sin(uTime * 9.0 + vWorld.x * 2.0) * sin(uTime * 5.3);
    col = mix(col, base * vec3(1.25, 0.86, 0.55), uFire * 0.55 * fl);
  }
  // Negative alpha = partial opt-out of the monochrome grade (accent colours).
  if (emissive == 0.0 && (k == 7 || k == 8)) emissive = -0.45;
  if (emissive == 0.0 && (k == 17 || k == 18)) emissive = -0.3;
  if (petal) emissive = -0.35;
  if (uGlint > 0.0) {
    vec2 g = glintAmt(n, normalize(-vView), vWorld, uGlint);
    col = mix(col, GLINT_COL, max(g.x * 0.85, g.y * 0.55));
    if (g.x > 0.0) emissive = max(emissive, 0.55 * g.x);
    else if (g.y > 0.0) emissive = max(emissive, 0.25);
  }
  writeG(col, emissive, n, vView);
}
`,ql=`
out float vDepth;
out vec3 vWorld;
out vec3 vView;
void main() {
  vec3 p = position;
  vDepth = -p.y;
  p.y = 0.0;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWorld = wp.xyz;
  vec4 vp = viewMatrix * wp;
  vView = vp.xyz;
  gl_Position = projectionMatrix * vp;
}
`,Jl=`
${Vl}
${Hl}
in float vDepth;
in vec3 vWorld;
in vec3 vView;
uniform vec3 cDeep;
uniform vec3 cShallow;
uniform vec3 cFoam;
uniform vec3 cReflect;
void main() {
  float d = vDepth;
  if (d < -0.05) discard;
  vec4 nz = texture(uNoise, vWorld.xz / 60.0 + vec2(uTime * 0.004, uTime * 0.002));
  vec3 c = cDeep;
  if (d < 1.6 + nz.r * 1.6) c = cShallow;
  float foamW = 0.28 + 0.14 * sin(uTime * 1.3 + nz.g * 9.0);
  if (d < foamW) c = cFoam;
  vec3 V = normalize(cameraPosition - vWorld);
  // Grazing view: a hard sky-reflection band.
  if (V.y < 0.07) c = mix(c, cReflect, 0.45);
  // Sparkle streaks: long horizontal dashes drifting slowly.
  float dist = length(vView);
  vec2 sp = vec2(vWorld.x * 0.012 + uTime * 0.01, vWorld.z * 0.09);
  float st = texture(uNoise, sp).g * 0.7 + texture(uNoise, sp * 3.1).b * 0.3;
  if (st > 0.74 && dist < 900.0 && c != cFoam) c = mix(c, cReflect, 0.55);
  writeG(c, -0.55, vec3(0.0, 1.0, 0.0), vView);
}
`,Yl=`
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`,Xl=`
${Vl}
layout(location = 0) out vec4 gColor;
layout(location = 1) out vec4 gND;
in vec2 vUv;
uniform mat4 uInvProj;
uniform mat4 uCamWorld;
uniform vec3 uSkyTop;
uniform vec3 uSkyMid;
uniform vec3 uSkyHorizon;
uniform vec3 uSunGlow;
uniform vec3 uSunCol;
uniform vec3 uSunDir;
uniform vec3 uMoonDir;
uniform float uStars;
uniform float uSkyBands;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec4 v = uInvProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec3 dirV = normalize(v.xyz / v.w);
  vec3 dir = normalize((uCamWorld * vec4(dirV, 0.0)).xyz);
  float e = dir.y;
  // Banded gradient: quantise elevation into flat strips (inspo/2).
  float t = clamp(e / 0.55, 0.0, 1.0);
  float tq = floor(pow(t, 0.7) * uSkyBands) / uSkyBands;
  vec3 col = tq < 0.5 ? mix(uSkyHorizon, uSkyMid, tq * 2.0) : mix(uSkyMid, uSkyTop, (tq - 0.5) * 2.0);
  if (e < 0.0) col = uSkyHorizon;
  // Sun-side glow band near the horizon.
  float sd = dot(dir, uSunDir);
  float glow = step(0.975, sd) * 0.35 + step(0.993, sd) * 0.4;
  col = mix(col, uSunGlow, glow * step(-0.1, uSunDir.y));
  float emissive = 0.0;
  // Sun disc: flat, pale.
  if (sd > 0.9994 && uSunDir.y > -0.05) { col = uSunCol; emissive = 0.35; }
  // Moon: crescent at night.
  float md = dot(dir, uMoonDir);
  if (uStars > 0.2 && md > 0.99965) {
    vec3 off = normalize(uMoonDir + vec3(0.012, 0.006, 0.0));
    if (dot(dir, off) < 0.99968) { col = vec3(0.97, 0.95, 0.88); emissive = 0.6; }
  }
  // Stars.
  if (uStars > 0.01 && e > 0.03) {
    vec2 sp = vec2(atan(dir.z, dir.x) * 180.0, asin(e) * 180.0);
    vec2 cell = floor(sp);
    float h = hash12(cell);
    if (h > 0.985) {
      vec2 f = fract(sp) - 0.5 - (vec2(hash12(cell + 7.1), hash12(cell + 3.3)) - 0.5) * 0.6;
      float tw = 0.7 + 0.3 * sin(uTime * 2.0 + h * 100.0);
      float r = 0.11 + 0.1 * step(0.996, h);
      if (length(f) < r) { col = mix(col, vec3(0.95, 0.93, 0.85), uStars * tw * smoothstep(0.03, 0.15, e)); emissive = 0.2 * uStars; }
    }
  }
  gColor = vec4(col, emissive);
  gND = vec4(0.0, 0.0, 0.0, 1.0e5);
}
`,Zl=`
in vec4 aC0;
uniform float uCloudDist;
uniform float uCloudDrift;
out vec2 vP;
out float vSeed;
out float vElev;
void main() {
  float az = aC0.x + uCloudDrift;
  float el = aC0.y;
  vec3 dir = vec3(cos(az) * cos(el), sin(el), sin(az) * cos(el));
  vec3 right = normalize(vec3(-dir.z, 0.0, dir.x));
  vec3 up = vec3(0.0, 1.0, 0.0);
  float w = aC0.z;
  float h = w * 0.42;
  vP = vec2(position.x, position.y);
  vec3 wp = cameraPosition + dir * uCloudDist + right * position.x * w * 0.5 + up * (position.y * h);
  vSeed = aC0.w;
  vElev = el;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`,Ql=`
${Vl}
layout(location = 0) out vec4 gColor;
layout(location = 1) out vec4 gND;
in vec2 vP;
in float vSeed;
in float vElev;
uniform vec3 uCloud;
uniform vec3 uCloudShade;
uniform vec3 uCloudRim;
uniform vec3 uCloudLine;
uniform vec3 uSkyHorizon;

float h1(float n) { return fract(sin(n) * 43758.5453); }

// Signed distance to a puffy flat-bottomed cloud in a [-1,1]x[0,1] box.
float cloudSdf(vec2 p) {
  float d = 1e5;
  float n = 5.0 + floor(h1(vSeed * 3.1) * 3.0);
  for (int i = 0; i < 8; i++) {
    if (float(i) >= n) break;
    float fi = float(i) / (n - 1.0);
    float x = mix(-0.72, 0.72, fi) + (h1(vSeed + float(i) * 1.7) - 0.5) * 0.12;
    float bell = 1.0 - pow(abs(fi - 0.5) * 2.0, 1.6);
    float r = 0.14 + 0.3 * bell * (0.75 + 0.5 * h1(vSeed * 1.3 + float(i)));
    float y = r * 0.5 + 0.02;
    vec2 q = (p - vec2(x, y)) * vec2(1.0, 0.84);
    d = min(d, length(q) - r);
  }
  // Flat bottom.
  return max(d, 0.03 - p.y);
}

void main() {
  vec2 p = vec2(vP.x, vP.y);
  float d = cloudSdf(p);
  if (d > 0.0) discard;
  vec3 col = uCloud;
  float lineW = 0.012;
  if (p.y < 0.075) col = uCloudRim;
  else if (p.y < 0.2 && d > -0.08) col = uCloudShade;
  if (d > -lineW || abs(p.y - 0.075) < lineW * 0.5) col = uCloudLine;
  // Low clouds sink into the horizon haze.
  col = mix(col, uSkyHorizon, (1.0 - smoothstep(0.02, 0.25, vElev)) * 0.55);
  gColor = vec4(col, 0.0);
  gND = vec4(0.0, 0.0, 0.0, 1.0e5);
}
`,$l=`
out vec3 vN;
out vec3 vView;
void main() {
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 vp = modelViewMatrix * vec4(position, 1.0);
  vView = vp.xyz;
  gl_Position = projectionMatrix * vp;
}
`,eu=`
${Vl}
${Hl}
in vec3 vN;
in vec3 vView;
uniform vec3 uColor;
uniform float uEmissive;
uniform float uKeep;
uniform float uFlat;
uniform float uGlint;
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 col = uEmissive > 0.0 ? uColor : uColor * mix(toonLight(n), uLightCol, uFlat);
  float em = uEmissive > 0.0 ? uEmissive : -uKeep;
  if (uGlint > 0.0) {
    vec2 g = glintAmt(n, normalize(-vView), vView, uGlint);
    col = mix(col, GLINT_COL, max(g.x * 0.85, g.y * 0.55));
    if (g.x > 0.0) em = max(em, 0.55 * g.x);
  }
  // The explorer keeps most of their colour so they read against the land.
  writeG(col, em, n, vView);
}
`,tu=`
in vec4 aCol;
in float aTint;
in vec4 aEye;
out vec3 vN;
out vec3 vView;
out vec3 vObj;
out vec4 vCol;
out vec4 vEye;
void main() {
  mat4 m = modelMatrix * instanceMatrix;
  vObj = position;
  // Parts squash and stretch, so normals need the inverse transpose.
  vN = normalize(inverse(transpose(mat3(m))) * normal);
  vCol = aCol;
#ifdef USE_INSTANCING_COLOR
  vCol.rgb *= mix(vec3(1.0), instanceColor, aTint);
#endif
  vEye = aEye;
  vec4 vp = viewMatrix * (m * vec4(position, 1.0));
  vView = vp.xyz;
  gl_Position = projectionMatrix * vp;
}
`,nu=`
${Vl}
${Hl}
in vec3 vN;
in vec3 vView;
in vec3 vObj;
in vec4 vCol;
in vec4 vEye;
uniform float uKeep;
uniform vec3 uInk;
uniform vec3 uWhite;
uniform vec3 uEyeOrigin;
/** Eye centre (yaw, pitch) in radians from the face centre, mirrored in x. */
uniform vec2 uEyePos;
uniform vec2 uEyeSize;
uniform vec2 uPupil;
/** How far pupils can travel for a look of 1. */
uniform vec2 uLookRange;
/** Eye rotation: + lifts the outer corners. */
uniform float uEyeTilt;
uniform vec3 uMouthOrigin;
/** Mouth: (y centre, half width, curve), in radians around uMouthOrigin. */
uniform vec3 uMouth;
/** A little "w" mouth painted with the eyes: (y, half-spacing, curve); y = 0 = none. */
uniform vec3 uMouthW;
/** Cheek blush: (yaw, pitch, radius x, radius y), mirrored; radius 0 = none. */
uniform vec4 uBlush;
uniform vec3 uBlushCol;
uniform vec3 uGlow;
/** Hearth-spirit warmth glow (0 = none): flattens shading and blooms. */
uniform float uEmber;

float fillE(float d, float aa) { return 1.0 - smoothstep(-0.5 * aa, 0.5 * aa, d); }
vec2 sphereUV(vec3 d) { return vec2(atan(d.x, d.z), asin(clamp(d.y, -1.0, 1.0))); }

void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  // Far away (and usually seen from below) a creature would be mostly its
  // shaded belly and read as a dark blot: flatten it toward the lit tones,
  // as distant terrain does.
  float far = smoothstep(20.0, 110.0, length(vView));
  vec3 col = vCol.rgb * mix(toonLight(n), mix(uMidCol, uLightCol, 0.65), far * 0.9);
  // A touch of aerial haze: dark coats soften toward the sky tone with
  // distance instead of reading as holes in it.
  col = mix(col, uLightCol * 0.92, smoothstep(35.0, 220.0, length(vView)) * 0.4);
  float keep = uKeep;
  float tag = vCol.a;
  if (tag > 0.5 && tag < 1.5) {
    vec3 dir = normalize(vObj - uEyeOrigin);
    vec2 p = sphereUV(dir);
    vec2 m = vec2(abs(p.x), p.y);
    // Pixel size in radians, from the direction (atan wraps at the back).
    float aa = max(length(fwidth(dir)), 1e-4);
    float lw = max(0.012, aa * 1.1);
    float lids = vEye.z;
    if (uBlush.z > 0.0) {
      vec2 bq = (m - uBlush.xy) / uBlush.zw;
      col = mix(col, uBlushCol * toonLight(n), fillE((length(bq) - 1.0) * uBlush.w, aa) * 0.8);
    }
    if (uMouthW.x != 0.0) {
      // Two little arcs meeting in the middle, like a cat's mouth.
      float u = abs(p.x) - uMouthW.y;
      float y = uMouthW.x + uMouthW.z * u * u;
      float w = max(abs(p.y - y) - lw * 0.8, abs(p.x) - uMouthW.y * 2.0);
      col = mix(col, uInk, fillE(w, aa));
    }
    float ct = cos(uEyeTilt), st = sin(uEyeTilt);
    vec2 me = uEyePos + mat2(ct, st, -st, ct) * (m - uEyePos);
    vec2 q = (me - uEyePos) / uEyeSize;
    float d = (length(q) - 1.0) * min(uEyeSize.x, uEyeSize.y);
    if (lids > 0.02) {
      // Whites squash shut from the top and bottom.
      vec2 r = vec2(uEyeSize.x, uEyeSize.y * lids);
      vec2 qq = (me - uEyePos) / r;
      d = (length(qq) - 1.0) * min(r.x, r.y);
      float white = fillE(d, aa);
      col = mix(col, uWhite * mix(uLightCol, vec3(1.0), 0.55 - 0.25 * uNight), white);
      // Pupils share one look direction so they never cross.
      vec2 room = max(r - uPupil * vec2(1.0, lids) * 1.15, 0.0);
      vec2 lk = clamp(vEye.xy * uLookRange, -room, room);
      vec2 pc = vec2(sign(p.x) * uEyePos.x, uEyePos.y) + lk;
      vec2 pq = (p - pc) / (uPupil * vec2(1.0, max(lids, 0.2)));
      float pd = (length(pq) - 1.0) * min(uPupil.x, uPupil.y);
      col = mix(col, uInk, fillE(max(pd, d), aa));
      col = mix(col, uInk, fillE(abs(d) - lw * 0.6, aa));
      keep = mix(keep, 0.95, white);
    } else if (lids < -0.02) {
      // Happy: upward arcs.
      vec2 c = uEyePos - vec2(0.0, uEyeSize.y * 0.35);
      float arc = abs(length((m - c) / vec2(1.0, 1.25)) - uEyeSize.x * 0.75) - lw;
      arc = max(arc, c.y - m.y);
      col = mix(col, uInk, fillE(arc, aa));
    } else {
      float line = max(abs(m.y - uEyePos.y) - lw * 0.8, abs(m.x - uEyePos.x) - uEyeSize.x * 0.85);
      col = mix(col, uInk, fillE(line, aa));
    }
  } else if (tag > 1.5 && tag < 2.5) {
    // A small frown: a curve that droops at both ends (inspo woff).
    vec3 dir = normalize(vObj - uMouthOrigin);
    vec2 p = sphereUV(dir);
    float aa = max(length(fwidth(dir)), 1e-4);
    float lw = max(0.02, aa * 1.1);
    float y = uMouth.x - uMouth.z * p.x * p.x;
    float mouth = max(abs(p.y - y) - lw, abs(p.x) - uMouth.y);
    col = mix(col, uInk, fillE(mouth, aa));
  }
  float glow = 0.0;
  if (tag > 2.5) {
    // A lamp (bicycles): lit warm at night, like the cabin windows.
    col = mix(col, uGlow, uNight);
    glow = uNight;
  }
  if (uEmber > 0.0 && tag < 2.5) {
    // A warm spirit glows from within: less shade, a soft bloom. Painted
    // eyes (ink/white) stay crisp.
    float paint = clamp(1.0 - length(col - vCol.rgb * toonLight(n)) * 4.0, 0.0, 1.0);
    col = mix(col, vCol.rgb * mix(uLightCol, vec3(1.0), 0.4), uEmber * 0.7 * paint);
    glow = max(glow, (0.5 + 0.1 * sin(uTime * 3.0)) * smoothstep(0.35, 1.0, uEmber) * paint);
  }
  writeG(col, glow > 0.02 ? glow : -keep, n, vView);
}
`,ru=[{key:`eyeSpacing`,value:.395,min:.1,max:.6,step:.005},{key:`eyeHeight`,value:.39,min:-.3,max:.4,step:.005},{key:`eyeWidth`,value:.25,min:.03,max:.35,step:.005},{key:`eyeTall`,value:.45,min:.03,max:.45,step:.005},{key:`eyeSquareness`,value:3.05,min:1.5,max:5,step:.05},{key:`eyeTilt`,value:.06,min:-.6,max:.6,step:.01},{key:`outline`,value:.001,min:0,max:.03,step:5e-4},{key:`pupilWidth`,value:.043,min:.005,max:.15,step:.002},{key:`pupilTall`,value:.137,min:.005,max:.25,step:.002},{key:`lookX`,value:0,min:-.15,max:.15,step:.002},{key:`lookY`,value:-.02,min:-.2,max:.2,step:.002},{key:`noseX`,value:-.03,min:-.3,max:.3,step:.005},{key:`noseHeight`,value:-.13,min:-.5,max:.2,step:.005},{key:`noseSize`,value:.05,min:0,max:.15,step:.002},{key:`mouthHeight`,value:-.42,min:-.8,max:-.05,step:.005},{key:`mouthX`,value:.055,min:-.3,max:.3,step:.005},{key:`mouthWidth`,value:.205,min:.02,max:.5,step:.005},{key:`mouthCurve`,value:.9,min:-3,max:5,step:.05},{key:`mouthCurl`,value:4,min:0,max:20,step:.25},{key:`mouthLine`,value:.008,min:.002,max:.03,step:5e-4}],iu=ru.map((e,t)=>`#define F_${e.key} uFace[${t}]`).join(`
`),au=`
out vec3 vN;
out vec3 vView;
out vec3 vObj;
void main() {
  vObj = position;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 vp = modelViewMatrix * vec4(position, 1.0);
  vView = vp.xyz;
  gl_Position = projectionMatrix * vp;
}
`,ou=`
${Vl}
${Hl}
in vec3 vN;
in vec3 vView;
in vec3 vObj;
uniform vec3 uColor;
uniform vec3 uInk;
uniform vec3 uWhite;
uniform vec3 uBrow;
/** 0 = solid ink ovals, 1 = round whites with small pupils. */
uniform float uEyeType;
/** 1 open .. 0 shut. */
uniform float uBlink;
uniform float uFace[${ru.length}];
/** Animated gaze (idle glances, heading), added to lookX/lookY. */
uniform vec2 uLook;
${iu}

// Approximate signed distance to an ellipse, in the same units as p.
float ell(vec2 p, vec2 c, vec2 r) {
  vec2 q = (p - c) / r;
  return (length(q) - 1.0) * min(r.x, r.y);
}
// Edges resolve over one pixel: wider AA smears small features at distance.
float fill(float d, float aa) { return 1.0 - smoothstep(-0.5 * aa, 0.5 * aa, d); }
// Superellipse: power 2 = ellipse, higher = squarer.
float sell(vec2 p, vec2 c, vec2 r, float n) {
  vec2 q = abs((p - c) / r);
  return (pow(pow(q.x, n) + pow(q.y, n), 1.0 / n) - 1.0) * min(r.x, r.y);
}

void main() {
  vec3 n = normalize(vN);
  vec3 dir = normalize(vObj);
  vec2 p = vec2(atan(dir.x, dir.z), asin(clamp(dir.y, -1.0, 1.0)));
  vec2 m = vec2(abs(p.x), p.y);
  float aa = max(fwidth(p.x), fwidth(p.y));
  // Lines never go thinner than ~1px, so the face survives distance.
  float lw = max(0.011, aa * 1.1);

  vec3 lit = toonLight(n);
  vec3 col = uColor * lit;
  float open = max(uBlink, 0.0);

  // Proportions measured from inspo/char1 (face = brim to scarf here):
  // whites ~1/3 face wide and ~0.4 face tall with only a quarter-eye gap,
  // slim oval pupils, the nose hooked over the whites' lower inner edges,
  // and a wide off-centre grin low on the face (~0.8 of the way down).
  bool round = uEyeType > 0.5;
  float ink = lw * 1.3;
  float white = 0.0;
  if (!round) {
    vec2 bq = m - vec2(0.3, 0.02);
    float brow = abs(length(bq) - 0.24) - lw * 0.9;
    brow = max(max(brow, abs(m.x - 0.3) - 0.075), -bq.y);
    col = mix(col, uBrow * mix(lit, uLightCol, 0.5), fill(brow, aa));
    vec2 r = vec2(0.058, max(0.092 * open, lw));
    col = mix(col, uInk, fill(ell(m, vec2(0.3, 0.07), r), aa));
  } else {
    // All values come from FACE_PARAMS (debug panel: Player → Face).
    vec2 c = vec2(F_eyeSpacing, F_eyeHeight);
    vec2 r = vec2(F_eyeWidth, F_eyeTall * open);
    // Tilt: + lifts the outer corners.
    float ct = cos(F_eyeTilt), st = sin(F_eyeTilt);
    vec2 me = c + mat2(ct, st, -st, ct) * (m - c);
    float d = open > 0.0 ? sell(me, c, r, F_eyeSquareness) : 1.0;
    white = fill(d, aa);
    col = mix(col, uWhite * mix(uLightCol, vec3(1.0), 0.55 - 0.25 * uNight), white);
    // Pupils share one look direction (not mirrored), so they never cross.
    vec2 lk = vec2(F_lookX, F_lookY) + uLook;
    lk = clamp(lk, -max(r - vec2(F_pupilWidth, F_pupilTall * open) * 1.1, 0.0), max(r - vec2(F_pupilWidth, F_pupilTall * open) * 1.1, 0.0));
    vec2 pc = vec2(sign(p.x) * c.x, c.y) + lk;
    float pupil = ell(p, pc, vec2(F_pupilWidth, F_pupilTall * open));
    col = mix(col, uInk, fill(max(pupil, d), aa));
    if (F_outline > 0.0) col = mix(col, uInk, fill(abs(d) - max(F_outline, aa * 0.5), aa));
    if (open <= 0.0) col = mix(col, uInk, fill(max(abs(p.y - c.y) - lw * 0.7, abs(m.x - c.x) - r.x * 0.85), aa));
  }

  // Nose: an open "c" hook.
  vec2 nc = round ? vec2(F_noseX, F_noseHeight) : vec2(0.02, -0.1);
  float nr = round ? F_noseSize : 0.04;
  vec2 nq = p - nc;
  float nose = abs(length(nq) - nr) - max(0.0066, aa * 0.5);
  nose = max(nose, nq.x / max(length(nq), 1e-4) - 0.35);
  if (nr > 0.001) col = mix(col, uInk, fill(nose, aa));

  // Mouth: a long closed grin, off-centre, one end curling up.
  float my = round ? F_mouthHeight : -0.4;
  float mcx = round ? F_mouthX : 0.055;
  float mhw = round ? F_mouthWidth : 0.205;
  float k = round ? F_mouthCurve : 0.9;
  float kc = round ? F_mouthCurl : 4.0;
  float x1 = mcx + mhw;
  float dx = p.x - (mcx - 0.075);
  float curl = max(0.0, p.x - (x1 - 0.08));
  float fy = my + k * dx * dx + kc * curl * curl;
  float slope = 2.0 * k * dx + 2.0 * kc * curl;
  float mouth = abs(p.y - fy) / sqrt(1.0 + slope * slope) - max(round ? F_mouthLine : 0.0088, aa * 0.5);
  mouth = max(mouth, abs(p.x - mcx) - mhw);
  col = mix(col, uInk, fill(mouth, aa));

  if (!gl_FrontFacing) n = -n;
  // Whites skip the grade entirely: the contrast is the point.
  writeG(col, mix(-0.7, -0.95, white), n, vView);
}
`;function su(){let t=new Uint8Array(262144),n=(e,t)=>{let n=new Float32Array(e*e),r=1234567+t*7919;for(let e=0;e<n.length;e++)r=Math.imul(r,1103515245)+12345>>>0,n[e]=(r>>>8)/16777216;return n},r=[];for(let e=0;e<4;e++){let t=[8,16,32,64].map((t,r)=>({p:t,g:n(t,e*10+r),a:1/(1<<r)})),i=Array(65536).fill(0);for(let{p:e,g:n,a:r}of t)for(let t=0;t<256;t++)for(let a=0;a<256;a++){let o=a/256*e,s=t/256*e,c=Math.floor(o),l=Math.floor(s),u=o-c,d=s-l;u=u*u*(3-2*u),d=d*d*(3-2*d);let f=c%e,p=(c+1)%e,m=l%e,h=(l+1)%e,g=n[m*e+f],_=n[m*e+p],v=n[h*e+f],y=n[h*e+p];i[t*256+a]+=r*((g*(1-u)+_*u)*(1-d)+(v*(1-u)+y*u)*d)}r.push(i.map(e=>e/1.875))}for(let e=0;e<65536;e++)for(let n=0;n<4;n++)t[e*4+n]=Math.max(0,Math.min(255,Math.round(r[n][e]*255)));let i=new ei(t,256,256,w);return i.wrapS=i.wrapT=e,i.magFilter=o,i.minFilter=c,i.generateMipmaps=!0,i.needsUpdate=!0,i}var X=e=>new K(e),cu={uLightDir:{value:new W(.4,.6,.3).normalize()},uLightCol:{value:new K(1,1,1)},uMidCol:{value:new K(.85,.8,.8)},uShadeCol:{value:new K(.65,.6,.66)},uBand1:{value:.22},uBand2:{value:-.12},uTime:{value:0},uNight:{value:0},uNoise:{value:null},uFocus:{value:new W}},lu={cMeadow:{value:X(Bl.meadow)},cMeadowDark:{value:X(Bl.meadowDark)},cForest:{value:X(Bl.forestFloor)},cHeath:{value:X(Bl.heath)},cRock:{value:X(Bl.rock)},cRockDark:{value:X(Bl.rockDark)},cSnow:{value:X(Bl.snow)},cSand:{value:X(Bl.sand)},cPath:{value:X(Bl.path)},cSeabed:{value:X(Bl.seabed)},cStroke:{value:X(Bl.meadowDark).multiplyScalar(.72)},uSnowLine:{value:235},uStrokes:{value:1},uPlayerFeet:{value:new W(0,-1e4,0)},uPlayerLift:{value:0},uMobShadow:{value:Array.from({length:12},()=>new Kt)}},uu={cDeep:{value:X(`#8fa3ad`)},cShallow:{value:X(Bl.waterShallow)},cFoam:{value:X(Bl.foam)},cReflect:{value:X(`#f4e6d4`)}},du={uInvProj:{value:new Zt},uCamWorld:{value:new Zt},uSkyTop:{value:new K},uSkyMid:{value:new K},uSkyHorizon:{value:new K},uSunGlow:{value:new K},uSunCol:{value:new K},uSunDir:{value:new W(0,1,0)},uMoonDir:{value:new W(0,1,0)},uStars:{value:0},uSkyBands:{value:7},uCloud:{value:new K},uCloudShade:{value:new K},uCloudRim:{value:new K},uCloudLine:{value:new K},uCloudDist:{value:6e3},uCloudDrift:{value:0}};function fu(){cu.uNoise.value=su()}function pu(e,t,n,r={}){return new ua({glslVersion:Ue,vertexShader:e,fragmentShader:t,uniforms:n,...r})}function mu(){return pu(Ul,Wl,{...cu,...lu,uIsProp:{value:0}})}function hu(){return pu(ql,Jl,{...cu,...uu,uIsProp:{value:0}})}var gu=[X(Bl.foliage),X(Bl.trunk),X(Bl.rock),X(Bl.bush),X(Bl.tuft),X(Bl.flower),X(Bl.flowerCore),X(Bl.cabinWall),X(Bl.cabinRoof),X(Bl.cabinTrim),X(Bl.cabinWindow),X(Bl.cabinDoor),X(Bl.stone),X(Bl.cabinWall2),X(Bl.snow),X(Bl.harebell),X(Bl.buttercup),X(Bl.cutWood),X(Bl.steel),X(Bl.soot),X(Bl.ember)],_u={uKind:{value:gu},uGlow:{value:X(Bl.windowGlow)}};function vu(e){return pu(Gl,Kl,{...cu,..._u,uIsProp:{value:1},uBend:{value:e.bend??0},uWind:{value:e.wind??0},uHeightRef:{value:e.heightRef??1},uToneVar:{value:e.toneVar??.15},uFlip:{value:+!!e.flipBack},uCutaway:{value:e.cutaway===`occluders`?2:+(e.cutaway===`near`)},uGlint:{value:0},uWin:{value:-1},uFire:{value:0}},{side:e.doubleSide?2:0})}function yu(){return pu(Yl,Xl,{...cu,...du},{depthTest:!1,depthWrite:!1})}function bu(){return pu(Zl,Ql,{...cu,...du},{depthTest:!1,depthWrite:!1,side:2})}function xu(e,t=0,n={}){return pu($l,eu,{...cu,uIsProp:{value:1},uColor:{value:X(e)},uEmissive:{value:t},uKeep:{value:n.keep??.7},uFlat:{value:n.flat??0},uGlint:{value:0}},{side:n.doubleSide?2:0})}function Su(e={}){return pu(tu,nu,{...cu,uIsProp:{value:2},uKeep:{value:e.keep??.55},uInk:{value:X(`#2e1f28`)},uWhite:{value:X(`#fffdf8`)},uEyeOrigin:{value:e.eyeOrigin??new W},uEyePos:{value:new U(...e.eyePos??[.4,.2])},uEyeSize:{value:new U(...e.eyeSize??[.2,.25])},uPupil:{value:new U(...e.pupil??[.06,.09])},uLookRange:{value:new U(...e.lookRange??[.12,.1])},uEyeTilt:{value:e.eyeTilt??0},uMouthOrigin:{value:e.mouthOrigin??new W},uMouth:{value:new W(...e.mouth??[-.2,.2,1])},uMouthW:{value:new W(...e.mouthW??[0,0,0])},uBlush:{value:new Kt(...e.blush??[0,0,0,0])},uBlushCol:{value:X(e.blushCol??`#ef9c93`)},uGlow:_u.uGlow,uEmber:{value:0}},{side:e.doubleSide?2:0})}function Cu(e,t,n,r){return pu(au,ou,{...cu,uIsProp:{value:1},uColor:{value:X(e)},uInk:{value:X(t)},uWhite:{value:X(n)},uBrow:{value:X(r)},uEyeType:{value:0},uBlink:{value:1},uFace:{value:ru.map(e=>e.value)},uLook:{value:new U}})}var wu=new K(Bl.waterShallow),Tu=new W,Eu=class{hour=9.5;dayMinutes=16;paused=!1;paletteOverride=null;sky={};sunDir=new W;moonDir=new W;update(e){this.paused||(this.hour=(this.hour+e*24/(this.dayMinutes*60))%24),this.apply()}apply(){let e=zl(this.hour,this.paletteOverride,this.sky),t=(this.hour-6)/12*Math.PI;this.sunDir.set(Math.cos(t),Math.sin(t)*.78,.5).normalize(),this.moonDir.set(-Math.cos(t)*.8,-Math.sin(t)*.7+.08,.45).normalize();let n=H.smoothstep(this.sunDir.y,-.08,.06);Tu.copy(this.moonDir).lerp(this.sunDir,n).normalize(),Tu.y=Math.max(Tu.y,.24),Tu.normalize(),cu.uLightDir.value.copy(Tu),cu.uLightCol.value.copy(e.light),cu.uMidCol.value.copy(e.mid),cu.uShadeCol.value.copy(e.shade),cu.uNight.value=e.night,du.uSkyTop.value.copy(e.skyTop),du.uSkyMid.value.copy(e.skyMid),du.uSkyHorizon.value.copy(e.skyHorizon),du.uSunGlow.value.copy(e.sunGlow),du.uSunCol.value.copy(e.sun),du.uSunDir.value.copy(this.sunDir),du.uMoonDir.value.copy(this.moonDir),du.uStars.value=e.stars,du.uCloud.value.copy(e.cloud),du.uCloudShade.value.copy(e.cloudShade),du.uCloudRim.value.copy(e.cloudRim),du.uCloudLine.value.copy(e.outline).lerp(e.cloudShade,.35),uu.cDeep.value.copy(e.water),uu.cShallow.value.copy(e.water).lerp(wu,.5).lerp(e.skyHorizon,.15),uu.cFoam.value.set(Bl.foam).lerp(e.skyHorizon,.3),uu.cReflect.value.copy(e.skyHorizon),lu.cStroke.value.set(Bl.meadowDark).multiplyScalar(.7)}},Du={name:`FXAAShader`,uniforms:{tDiffuse:{value:null},resolution:{value:new U(1/1024,1/512)}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec2 resolution;
		varying vec2 vUv;

		#define EDGE_STEP_COUNT 6
		#define EDGE_GUESS 8.0
		#define EDGE_STEPS 1.0, 1.5, 2.0, 2.0, 2.0, 4.0
		const float edgeSteps[EDGE_STEP_COUNT] = float[EDGE_STEP_COUNT]( EDGE_STEPS );

		float _ContrastThreshold = 0.0312;
		float _RelativeThreshold = 0.063;
		float _SubpixelBlending = 1.0;

		vec4 Sample( sampler2D  tex2D, vec2 uv ) {

			return texture( tex2D, uv );

		}

		float SampleLuminance( sampler2D tex2D, vec2 uv ) {

			return dot( Sample( tex2D, uv ).rgb, vec3( 0.3, 0.59, 0.11 ) );

		}

		float SampleLuminance( sampler2D tex2D, vec2 texSize, vec2 uv, float uOffset, float vOffset ) {

			uv += texSize * vec2(uOffset, vOffset);
			return SampleLuminance(tex2D, uv);

		}

		struct LuminanceData {

			float m, n, e, s, w;
			float ne, nw, se, sw;
			float highest, lowest, contrast;

		};

		LuminanceData SampleLuminanceNeighborhood( sampler2D tex2D, vec2 texSize, vec2 uv ) {

			LuminanceData l;
			l.m = SampleLuminance( tex2D, uv );
			l.n = SampleLuminance( tex2D, texSize, uv,  0.0,  1.0 );
			l.e = SampleLuminance( tex2D, texSize, uv,  1.0,  0.0 );
			l.s = SampleLuminance( tex2D, texSize, uv,  0.0, -1.0 );
			l.w = SampleLuminance( tex2D, texSize, uv, -1.0,  0.0 );

			l.ne = SampleLuminance( tex2D, texSize, uv,  1.0,  1.0 );
			l.nw = SampleLuminance( tex2D, texSize, uv, -1.0,  1.0 );
			l.se = SampleLuminance( tex2D, texSize, uv,  1.0, -1.0 );
			l.sw = SampleLuminance( tex2D, texSize, uv, -1.0, -1.0 );

			l.highest = max( max( max( max( l.n, l.e ), l.s ), l.w ), l.m );
			l.lowest = min( min( min( min( l.n, l.e ), l.s ), l.w ), l.m );
			l.contrast = l.highest - l.lowest;
			return l;

		}

		bool ShouldSkipPixel( LuminanceData l ) {

			float threshold = max( _ContrastThreshold, _RelativeThreshold * l.highest );
			return l.contrast < threshold;

		}

		float DeterminePixelBlendFactor( LuminanceData l ) {

			float f = 2.0 * ( l.n + l.e + l.s + l.w );
			f += l.ne + l.nw + l.se + l.sw;
			f *= 1.0 / 12.0;
			f = abs( f - l.m );
			f = clamp( f / l.contrast, 0.0, 1.0 );

			float blendFactor = smoothstep( 0.0, 1.0, f );
			return blendFactor * blendFactor * _SubpixelBlending;

		}

		struct EdgeData {

			bool isHorizontal;
			float pixelStep;
			float oppositeLuminance, gradient;

		};

		EdgeData DetermineEdge( vec2 texSize, LuminanceData l ) {

			EdgeData e;
			float horizontal =
				abs( l.n + l.s - 2.0 * l.m ) * 2.0 +
				abs( l.ne + l.se - 2.0 * l.e ) +
				abs( l.nw + l.sw - 2.0 * l.w );
			float vertical =
				abs( l.e + l.w - 2.0 * l.m ) * 2.0 +
				abs( l.ne + l.nw - 2.0 * l.n ) +
				abs( l.se + l.sw - 2.0 * l.s );
			e.isHorizontal = horizontal >= vertical;

			float pLuminance = e.isHorizontal ? l.n : l.e;
			float nLuminance = e.isHorizontal ? l.s : l.w;
			float pGradient = abs( pLuminance - l.m );
			float nGradient = abs( nLuminance - l.m );

			e.pixelStep = e.isHorizontal ? texSize.y : texSize.x;

			if (pGradient < nGradient) {

				e.pixelStep = -e.pixelStep;
				e.oppositeLuminance = nLuminance;
				e.gradient = nGradient;

			} else {

				e.oppositeLuminance = pLuminance;
				e.gradient = pGradient;

			}

			return e;

		}

		float DetermineEdgeBlendFactor( sampler2D  tex2D, vec2 texSize, LuminanceData l, EdgeData e, vec2 uv ) {

			vec2 uvEdge = uv;
			vec2 edgeStep;
			if (e.isHorizontal) {

				uvEdge.y += e.pixelStep * 0.5;
				edgeStep = vec2( texSize.x, 0.0 );

			} else {

				uvEdge.x += e.pixelStep * 0.5;
				edgeStep = vec2( 0.0, texSize.y );

			}

			float edgeLuminance = ( l.m + e.oppositeLuminance ) * 0.5;
			float gradientThreshold = e.gradient * 0.25;

			vec2 puv = uvEdge + edgeStep * edgeSteps[0];
			float pLuminanceDelta = SampleLuminance( tex2D, puv ) - edgeLuminance;
			bool pAtEnd = abs( pLuminanceDelta ) >= gradientThreshold;

			for ( int i = 1; i < EDGE_STEP_COUNT && !pAtEnd; i++ ) {

				puv += edgeStep * edgeSteps[i];
				pLuminanceDelta = SampleLuminance( tex2D, puv ) - edgeLuminance;
				pAtEnd = abs( pLuminanceDelta ) >= gradientThreshold;

			}

			if ( !pAtEnd ) {

				puv += edgeStep * EDGE_GUESS;

			}

			vec2 nuv = uvEdge - edgeStep * edgeSteps[0];
			float nLuminanceDelta = SampleLuminance( tex2D, nuv ) - edgeLuminance;
			bool nAtEnd = abs( nLuminanceDelta ) >= gradientThreshold;

			for ( int i = 1; i < EDGE_STEP_COUNT && !nAtEnd; i++ ) {

				nuv -= edgeStep * edgeSteps[i];
				nLuminanceDelta = SampleLuminance( tex2D, nuv ) - edgeLuminance;
				nAtEnd = abs( nLuminanceDelta ) >= gradientThreshold;

			}

			if ( !nAtEnd ) {

				nuv -= edgeStep * EDGE_GUESS;

			}

			float pDistance, nDistance;
			if ( e.isHorizontal ) {

				pDistance = puv.x - uv.x;
				nDistance = uv.x - nuv.x;

			} else {

				pDistance = puv.y - uv.y;
				nDistance = uv.y - nuv.y;

			}

			float shortestDistance;
			bool deltaSign;
			if ( pDistance <= nDistance ) {

				shortestDistance = pDistance;
				deltaSign = pLuminanceDelta >= 0.0;

			} else {

				shortestDistance = nDistance;
				deltaSign = nLuminanceDelta >= 0.0;

			}

			if ( deltaSign == ( l.m - edgeLuminance >= 0.0 ) ) {

				return 0.0;

			}

			return 0.5 - shortestDistance / ( pDistance + nDistance );

		}

		vec4 ApplyFXAA( sampler2D  tex2D, vec2 texSize, vec2 uv ) {

			LuminanceData luminance = SampleLuminanceNeighborhood( tex2D, texSize, uv );
			if ( ShouldSkipPixel( luminance ) ) {

				return Sample( tex2D, uv );

			}

			float pixelBlend = DeterminePixelBlendFactor( luminance );
			EdgeData edge = DetermineEdge( texSize, luminance );
			float edgeBlend = DetermineEdgeBlendFactor( tex2D, texSize, luminance, edge, uv );
			float finalBlend = max( pixelBlend, edgeBlend );

			if (edge.isHorizontal) {

				uv.y += edge.pixelStep * finalBlend;

			} else {

				uv.x += edge.pixelStep * finalBlend;

			}

			return Sample( tex2D, uv );

		}

		void main() {

			gl_FragColor = ApplyFXAA( tDiffuse, resolution.xy, vUv );

		}`},Ou={outline:!0,outlineWidth:1.6,depthThreshold:.045,normalThreshold:.4,outlineFadeStart:220,outlineFadeEnd:2600,fogDensity:32e-5,fogStart:40,fogBands:5,fogHeight:.22,fogFalloff:40,fogMax:.9,layeredFog:!0,gradeScale:1,bloom:1,renderScale:1,adaptive:!0,fxaa:!0},ku=`
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,Au=`
precision highp float;
layout(location = 0) out vec4 fragColor;
in vec2 vUv;
uniform sampler2D tColor;
uniform sampler2D tND;
uniform sampler2D tBloom;
uniform sampler2D tLayer;
uniform vec2 uLayerSize;
uniform float uLayered;
uniform vec2 uTexel;
uniform mat4 uInvProj;
uniform mat4 uCamWorld;
uniform vec3 uCamPos;
uniform vec3 uFogCol;
uniform float uFogDensity;
uniform float uFogStart;
uniform float uFogBands;
uniform float uFogHeight;
uniform float uFogFalloff;
uniform float uFogMax;
uniform vec3 uOutlineCol;
uniform float uOutlineOn;
uniform float uOutlineWidth;
uniform float uDepthThr;
uniform float uNormalThr;
uniform float uFade0;
uniform float uFade1;
uniform vec3 uTint;
uniform float uTintAmt;
uniform float uLift;
uniform float uBloom;

vec3 nrm(vec3 v) { return v / max(length(v), 1e-4); }

void main() {
  vec4 cc = texture(tColor, vUv);
  vec4 nd = texture(tND, vUv);
  float d = nd.w;
  vec3 col = cc.rgb;
  bool sky = d > 5.0e4;

  if (!sky && cc.a < 0.5) {
    float keep = clamp(-cc.a, 0.0, 1.0);
    // Pull toward a single hue family: keep luminance, swap chroma for the tint's.
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    float tl = dot(uTint, vec3(0.299, 0.587, 0.114));
    col = mix(col, uTint * (l / max(tl, 1e-3)), uTintAmt * (1.0 - keep));
    col = mix(col, uFogCol, uLift * (1.0 - keep * 0.7));
  }

  if (!sky) {
    if (uOutlineOn > 0.5) {
      vec2 o = uTexel * uOutlineWidth;
      vec4 l = texture(tND, vUv - vec2(o.x, 0.0));
      vec4 r = texture(tND, vUv + vec2(o.x, 0.0));
      vec4 u = texture(tND, vUv + vec2(0.0, o.y));
      vec4 b = texture(tND, vUv - vec2(0.0, o.y));
      // Laplacian of inverse depth: zero on planes (even at grazing angles),
      // positive where this pixel is in front of its neighbours.
      float ex = 2.0 - d / l.w - d / r.w;
      float ey = 2.0 - d / u.w - d / b.w;
      float de = max(ex, ey);
      float depthEdge = smoothstep(uDepthThr, uDepthThr * 1.8, de);
      vec3 n = nrm(nd.xyz);
      float ne = max(max(1.0 - dot(n, nrm(l.xyz)), 1.0 - dot(n, nrm(r.xyz))), max(1.0 - dot(n, nrm(u.xyz)), 1.0 - dot(n, nrm(b.xyz))));
      // Only creases where depth is continuous and we are the nearer side.
      float nearer = step(-0.002, de);
      float normalEdge = smoothstep(uNormalThr, uNormalThr + 0.15, ne) * nearer * (1.0 - smoothstep(30.0, 160.0, d));
      float edge = max(depthEdge, normalEdge) * (1.0 - smoothstep(uFade0, uFade1, d));
      // Creatures (normal length 0.62) are small and fuzzy: past a few tens of
      // metres their line eases off into a darker shade of their own colour,
      // or a distant flock reads as a cluster of ink rings.
      vec3 lineCol = uOutlineCol;
      float nl2 = dot(nd.xyz, nd.xyz);
      if (nl2 > 0.32 && nl2 < 0.46) {
        float far = smoothstep(14.0, 90.0, d);
        edge *= 1.0 - 0.75 * far;
        lineCol = mix(uOutlineCol, col * 0.78, far);
      }
      // Lines on distant layers become a darker shade of that layer, not ink.
      col = mix(col, lineCol, edge);
    }

    // Reconstruct world position from linear depth.
    vec4 v = uInvProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
    vec3 ray = v.xyz / v.w;
    ray /= -ray.z;
    vec3 vp = ray * d;
    float dist = length(vp);
    // Pick the quarter-res layer sample that belongs to this surface.
    float fd = d;
    if (uLayered > 0.5) {
      vec2 lp = vUv * uLayerSize - 0.5;
      vec2 base = floor(lp);
      float bestErr = 1e9;
      for (int k = 0; k < 4; k++) {
        vec2 o = vec2(float(k & 1), float(k >> 1));
        vec2 t = texelFetch(tLayer, ivec2(clamp(base + o, vec2(0.0), uLayerSize - 1.0)), 0).rg;
        float err = abs(t.y - d) / d;
        if (err < bestErr) { bestErr = err; fd = t.x; }
      }
      if (bestErr > 0.08) fd = d;
    }
    float fogDist = length(ray * fd);
    vec3 wdir = normalize(mat3(uCamWorld) * vp);
    float wy = uCamPos.y + wdir.y * dist;
    float f = 1.0 - exp(-max(fogDist - uFogStart, 0.0) * uFogDensity);
    // Thinner air up high: peaks and snow caps stay legible as landmarks.
    f *= 1.0 - 0.4 * smoothstep(90.0, 420.0, wy);
    if (uFogBands > 0.5) f = floor(f * uFogBands + 0.3) / uFogBands;
    // Valley mist: one flat bank with a hard top, lying over low ground in
    // the distance (never contoured bands that cut across objects).
    float mistTop = uFogFalloff * 0.25;
    float mist = step(wy, mistTop) * uFogHeight * smoothstep(250.0, 900.0, dist);
    f = max(f, min(uFogMax, f + mist));
    f = min(f, uFogMax);
    col = mix(col, uFogCol, f);
  }

  col += texture(tBloom, vUv).rgb * uBloom;
  fragColor = vec4(col, 1.0);
}
`,ju=`
precision highp float;
layout(location = 0) out vec4 fragColor;
in vec2 vUv;
uniform sampler2D tND;
uniform vec2 uStep;
uniform mat4 uCamWorld;
void main() {
  vec4 s0 = texture(tND, vUv);
  // Flat ground and water keep their own depth: layering is for faces.
  float upness = (mat3(uCamWorld) * normalize(s0.xyz + 1e-6)).y;
  float d0 = s0.w;
  float cur = d0;
  // Props (half-length normals) never define a layer: they fog by their own
  // depth, and scans from the ground look straight through them.
  if (d0 < 5.0e4 && dot(s0.xyz, s0.xyz) > 0.5 && upness < 0.8) {
    for (int i = 1; i <= 64; i++) {
      vec2 uv = vUv + vec2(0.0, uStep.y * float(i));
      if (uv.y > 1.0) break;
      vec4 sm = texture(tND, uv);
      if (sm.w > 5.0e4) break;                   // sky: ridge reached
      if (dot(sm.xyz, sm.xyz) < 0.5) continue;   // skip trees, rocks, cabins
      if (sm.w > cur * 1.12) break;              // farther layer: ridge reached
      if (sm.w < cur * 0.8) break;               // nearer ground in front
      cur = max(cur, sm.w);
      if (cur > d0 * 2.2) break;                 // long continuous slope: cap
    }
  }
  fragColor = vec4(cur, d0, 0.0, 1.0);
}
`,Mu=`
precision highp float;
layout(location = 0) out vec4 fragColor;
in vec2 vUv;
uniform sampler2D tColor;
uniform vec2 uTexel;
void main() {
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    vec2 o = vec2(float(i & 1) - 0.5, float(i >> 1) - 0.5) * uTexel;
    vec4 c = texture(tColor, vUv + o);
    acc += c.rgb * max(c.a, 0.0);
  }
  fragColor = vec4(acc * 0.25, 1.0);
}
`,Nu=`
precision highp float;
layout(location = 0) out vec4 fragColor;
in vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uDir;
void main() {
  float w[5] = float[5](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
  vec3 acc = texture(tSrc, vUv).rgb * w[0];
  for (int i = 1; i < 5; i++) {
    acc += texture(tSrc, vUv + uDir * float(i)).rgb * w[i];
    acc += texture(tSrc, vUv - uDir * float(i)).rgb * w[i];
  }
  fragColor = vec4(acc, 1.0);
}
`,Pu=class{scene=new Pn;camera=new Va(-1,1,1,-1,0,1);material;constructor(e){this.material=e;let t=new Dr;t.setAttribute(`position`,new q([-1,-1,0,3,-1,0,-1,3,0],3)),t.setAttribute(`uv`,new q([0,0,2,0,0,2],2));let n=new Zr(t,e);n.frustumCulled=!1,this.scene.add(n)}render(e,t){e.setRenderTarget(t),e.render(this.scene,this.camera)}};function Fu(e,t){return new ua({glslVersion:Ue,vertexShader:ku,fragmentShader:e,uniforms:t,depthTest:!1,depthWrite:!1})}var Iu=class{renderer;gbuf;bloomA;bloomB;comp;layerRT;layer;extract;blur;composite;fxaa;uniforms;w=1;h=1;constructor(e){this.renderer=e,this.gbuf=new Jt(1,1,{count:2,type:g,depthBuffer:!0}),this.gbuf.textures[0].minFilter=o,this.gbuf.textures[0].magFilter=o,this.gbuf.textures[1].minFilter=r,this.gbuf.textures[1].magFilter=r;let t={type:g,depthBuffer:!1,minFilter:o,magFilter:o};this.bloomA=new Jt(1,1,t),this.bloomB=new Jt(1,1,t),this.comp=new Jt(1,1,{depthBuffer:!1,minFilter:o,magFilter:o}),this.layerRT=new Jt(1,1,{type:h,depthBuffer:!1,minFilter:r,magFilter:r}),this.layer=new Pu(Fu(ju,{tND:{value:null},uStep:{value:new U},uCamWorld:{value:new Zt}})),this.extract=new Pu(Fu(Mu,{tColor:{value:null},uTexel:{value:new U}})),this.blur=new Pu(Fu(Nu,{tSrc:{value:null},uDir:{value:new U}})),this.uniforms={tColor:{value:null},tND:{value:null},tBloom:{value:null},tLayer:{value:null},uLayerSize:{value:new U(1,1)},uLayered:{value:1},uTexel:{value:new U},uInvProj:{value:new Zt},uCamWorld:{value:new Zt},uCamPos:{value:new W},uFogCol:{value:new K},uFogDensity:{value:0},uFogStart:{value:0},uFogBands:{value:0},uFogHeight:{value:0},uFogFalloff:{value:1},uFogMax:{value:1},uOutlineCol:{value:new K},uOutlineOn:{value:1},uOutlineWidth:{value:1},uDepthThr:{value:.05},uNormalThr:{value:.4},uFade0:{value:0},uFade1:{value:1},uTint:{value:new K},uTintAmt:{value:0},uLift:{value:0},uBloom:{value:1}},this.composite=new Pu(Fu(Au,this.uniforms));let n=new ua({uniforms:sa.clone(Du.uniforms),vertexShader:Du.vertexShader,fragmentShader:Du.fragmentShader,depthTest:!1,depthWrite:!1});this.fxaa=new Pu(n)}setSize(e,t){this.w=Math.max(1,Math.floor(e)),this.h=Math.max(1,Math.floor(t)),this.gbuf.setSize(this.w,this.h),this.comp.setSize(this.w,this.h);let n=Math.max(1,this.w>>1),r=Math.max(1,this.h>>1);this.bloomA.setSize(n,r),this.bloomB.setSize(n,r),this.layerRT.setSize(Math.max(1,this.w>>2),Math.max(1,this.h>>2)),this.fxaa.material.uniforms.resolution.value.set(1/this.w,1/this.h)}render(e,t,n,r,i,a,o=0){let s=this.renderer,c=Ou;s.setRenderTarget(this.gbuf),s.render(e,t);let l=this.bloomA.width,u=this.bloomA.height;this.extract.material.uniforms.tColor.value=this.gbuf.textures[0],this.extract.material.uniforms.uTexel.value.set(.5/this.w,.5/this.h),this.extract.render(s,this.bloomA);let d=this.blur.material.uniforms;for(let e=0;e<2;e++){let t=1+e*1.5;d.tSrc.value=this.bloomA.texture,d.uDir.value.set(t/l,0),this.blur.render(s,this.bloomB),d.tSrc.value=this.bloomB.texture,d.uDir.value.set(0,t/u),this.blur.render(s,this.bloomA)}c.layeredFog&&(this.layer.material.uniforms.tND.value=this.gbuf.textures[1],this.layer.material.uniforms.uStep.value.set(0,1/this.layerRT.height),this.layer.material.uniforms.uCamWorld.value.copy(t.matrixWorld),this.layer.render(s,this.layerRT));let f=this.uniforms;f.tLayer.value=this.layerRT.texture,f.uLayerSize.value.set(this.layerRT.width,this.layerRT.height),f.uLayered.value=+!!c.layeredFog,f.tColor.value=this.gbuf.textures[0],f.tND.value=this.gbuf.textures[1],f.tBloom.value=this.bloomA.texture,f.uTexel.value.set(1/this.w,1/this.h),f.uInvProj.value.copy(t.projectionMatrixInverse),f.uCamWorld.value.copy(t.matrixWorld),f.uCamPos.value.copy(t.position),f.uFogCol.value.copy(n),f.uFogDensity.value=c.fogDensity,f.uFogStart.value=c.fogStart,f.uFogBands.value=c.fogBands,f.uFogHeight.value=c.fogHeight,f.uFogFalloff.value=c.fogFalloff,f.uFogMax.value=c.fogMax,f.uOutlineCol.value.copy(r),f.uOutlineOn.value=+!!c.outline,f.uOutlineWidth.value=c.outlineWidth,f.uDepthThr.value=c.depthThreshold,f.uNormalThr.value=c.normalThreshold,f.uFade0.value=c.outlineFadeStart,f.uFade1.value=c.outlineFadeEnd,f.uTint.value.copy(i),f.uTintAmt.value=Math.min(1,a*c.gradeScale),f.uBloom.value=c.bloom,f.uLift.value=o,c.fxaa?(this.composite.render(s,this.comp),this.fxaa.material.uniforms.tDiffuse.value=this.comp.texture,this.fxaa.render(s,null)):this.composite.render(s,null)}},Lu=class{POOL;group=new En;pool=[];next=0;constructor(e=`#efe4d2`,t=40,n=0,r=.35){this.POOL=t;let i=new Xi(1,3),a=xu(e,n,{keep:r});for(let e=0;e<t;e++){let e=new Zr(i,a);e.visible=!1,e.frustumCulled=!1,this.group.add(e),this.pool.push({mesh:e,vel:new W,age:0,life:1,size:1,rise:.6,drag:4})}}emit(e,t,n,r,i,a){let o=this.POOL,s=Math.random()*Math.PI*2;for(let c=0;c<t;c++){let l=this.pool[this.next];this.next=(this.next+1)%o;let u=s+c/t*Math.PI*2+(Math.random()-.5)*.6;l.vel.set(Math.cos(u)*r,(a?.up??.9)+Math.random()*.7,Math.sin(u)*r),i&&l.vel.addScaledVector(i,-.35),l.mesh.position.set(e.x+Math.cos(u)*.12,e.y+.15,e.z+Math.sin(u)*.12),l.age=0,l.life=(a?.life??.35)+Math.random()*.25*(a?.life?a.life/.35*.5:1),l.rise=a?.rise??.6,l.drag=a?.drag??4,l.size=n*(.7+Math.random()*.5),l.mesh.visible=!0,l.mesh.scale.setScalar(.001)}}update(e){for(let t of this.pool){if(!t.mesh.visible)continue;t.age+=e;let n=t.age/t.life;if(n>=1){t.mesh.visible=!1;continue}let r=n<.15?n/.15:(1-(n-.15)/.85)**.8;t.mesh.scale.set(t.size*r,t.size*r*.85,t.size*r),t.mesh.position.addScaledVector(t.vel,e),t.vel.multiplyScalar(Math.exp(-t.drag*e)),t.vel.y+=t.rise*e}}},Ru=class{group=new En;clouds;constructor(e){let t=new Dr;t.setAttribute(`position`,new q([-1,-1,0,3,-1,0,-1,3,0],3));let n=new Zr(t,yu());n.frustumCulled=!1,n.renderOrder=-1e3,this.group.add(n);let r=new Dr;r.setAttribute(`position`,new q([-1,-.02,0,1,-.02,0,1,1,0,-1,1,0],3)),r.setIndex([0,1,2,0,2,3]);let i=new Ha;i.index=r.index,i.setAttribute(`position`,r.attributes.position),i.setAttribute(`aC0`,new ti(new Float32Array(160),4)),this.clouds=new Zr(i,bu()),this.clouds.frustumCulled=!1,this.clouds.renderOrder=-999,this.group.add(this.clouds),this.setSeed(e)}setSeed(e){let t=Ol(e^1540483477),n=this.clouds.geometry,r=n.getAttribute(`aC0`),i=[];for(let e=0;e<34;e++){let e=.025+t()**2.2*.3,n=(.9+t()*1.4)*(.6+e*2.2)*900;i.push([t()*Math.PI*2,e,n,t()*100])}i.sort((e,t)=>e[1]-t[1]),i.forEach((e,t)=>r.setXYZW(t,e[0],e[1],e[2],e[3])),r.needsUpdate=!0,n.instanceCount=34}update(e,t){du.uInvProj.value.copy(e.projectionMatrixInverse),du.uCamWorld.value.copy(e.matrixWorld),du.uCloudDrift.value=t*.0012}},zu=new W;function Bu(e,t,n,r,i,a){let o=2*Math.PI*i/4,s=Math.max(a-2*i,0),c=Math.PI/4;zu.copy(t),zu[r]=0,zu.normalize();let l=.5*o/(o+s),u=1-zu.angleTo(e)/c;return Math.sign(zu[n])===1?u*l:s/(o+s)+l+l*(1-u)}var Vu=class e extends vi{constructor(e=1,t=1,n=1,r=2,i=.1){let a=r*2+1;if(i=Math.min(e/2,t/2,n/2,i),super(1,1,1,a,a,a),this.type=`RoundedBoxGeometry`,this.parameters={width:e,height:t,depth:n,segments:r,radius:i},a===1)return;let o=this.toNonIndexed();this.index=null,this.attributes.position=o.attributes.position,this.attributes.normal=o.attributes.normal,this.attributes.uv=o.attributes.uv;let s=new W,c=new W,l=new W(e,t,n).divideScalar(2).subScalar(i),u=this.attributes.position.array,d=this.attributes.normal.array,f=this.attributes.uv.array,p=u.length/6,m=new W,h=.5/a;for(let r=0,a=0;r<u.length;r+=3,a+=2)switch(s.fromArray(u,r),c.copy(s),c.x-=Math.sign(c.x)*h,c.y-=Math.sign(c.y)*h,c.z-=Math.sign(c.z)*h,c.normalize(),u[r+0]=l.x*Math.sign(s.x)+c.x*i,u[r+1]=l.y*Math.sign(s.y)+c.y*i,u[r+2]=l.z*Math.sign(s.z)+c.z*i,d[r+0]=c.x,d[r+1]=c.y,d[r+2]=c.z,Math.floor(r/p)){case 0:m.set(1,0,0),f[a+0]=Bu(m,c,`z`,`y`,i,n),f[a+1]=1-Bu(m,c,`y`,`z`,i,t);break;case 1:m.set(-1,0,0),f[a+0]=1-Bu(m,c,`z`,`y`,i,n),f[a+1]=1-Bu(m,c,`y`,`z`,i,t);break;case 2:m.set(0,1,0),f[a+0]=1-Bu(m,c,`x`,`z`,i,e),f[a+1]=Bu(m,c,`z`,`x`,i,n);break;case 3:m.set(0,-1,0),f[a+0]=1-Bu(m,c,`x`,`z`,i,e),f[a+1]=1-Bu(m,c,`z`,`x`,i,n);break;case 4:m.set(0,0,1),f[a+0]=1-Bu(m,c,`x`,`y`,i,e),f[a+1]=1-Bu(m,c,`y`,`x`,i,t);break;case 5:m.set(0,0,-1),f[a+0]=Bu(m,c,`x`,`y`,i,e),f[a+1]=1-Bu(m,c,`y`,`x`,i,t)}}static fromJSON(t){return new e(t.width,t.height,t.depth,t.segments,t.radius)}};function Hu(e,t=!1){let n=e[0].index!==null,r=new Set(Object.keys(e[0].attributes)),i=new Set(Object.keys(e[0].morphAttributes)),a={},o={},s=e[0].morphTargetsRelative,c=new Dr,l=0;for(let u=0;u<e.length;++u){let d=e[u],f=0;if(n!==(d.index!==null))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them.`),null;for(let e in d.attributes){if(!r.has(e))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. All geometries must have compatible attributes; make sure "`+e+`" attribute exists among all geometries, or in none of them.`),null;a[e]===void 0&&(a[e]=[]),a[e].push(d.attributes[e]),f++}if(f!==r.size)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. Make sure all geometries have the same number of attributes.`),null;if(s!==d.morphTargetsRelative)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. .morphTargetsRelative must be consistent throughout all geometries.`),null;for(let e in d.morphAttributes){if(!i.has(e))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`.  .morphAttributes must be consistent throughout all geometries.`),null;o[e]===void 0&&(o[e]=[]),o[e].push(d.morphAttributes[e])}if(t){let e;if(n)e=d.index.count;else if(d.attributes.position!==void 0)e=d.attributes.position.count;else return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. The geometry must have either an index or a position attribute`),null;c.addGroup(l,e,u),l+=e}}if(n){let t=0,n=[];for(let r=0;r<e.length;++r){let i=e[r].index;for(let e=0;e<i.count;++e)n.push(i.getX(e)+t);t+=e[r].attributes.position.count}c.setIndex(n)}for(let e in a){let t=Uu(a[e]);if(!t)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the `+e+` attribute.`),null;c.setAttribute(e,t)}for(let e in o){let t=o[e][0].length;if(t!==0){c.morphAttributes=c.morphAttributes||{},c.morphAttributes[e]=[];for(let n=0;n<t;++n){let t=[];for(let r=0;r<o[e].length;++r)t.push(o[e][r][n]);let r=Uu(t);if(!r)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the `+e+` morphAttribute.`),null;c.morphAttributes[e].push(r)}}}return c}function Uu(e){let t,n,r,i=-1,a=0;for(let o=0;o<e.length;++o){let s=e[o];if(t===void 0&&(t=s.array.constructor),t!==s.array.constructor)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes.`),null;if(n===void 0&&(n=s.itemSize),n!==s.itemSize)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes.`),null;if(r===void 0&&(r=s.normalized),r!==s.normalized)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes.`),null;if(i===-1&&(i=s.gpuType),i!==s.gpuType)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes.`),null;a+=s.count*n}let o=new t(a),s=new pr(o,n,r),c=0;for(let t=0;t<e.length;++t){let r=e[t];if(r.isInterleavedBufferAttribute){let e=c/n;for(let t=0,i=r.count;t<i;t++)for(let i=0;i<n;i++){let n=r.getComponent(t,i);s.setComponent(t+e,i,n)}}else o.set(r.array,c);c+=r.count*n}return i!==void 0&&(s.gpuType=i),s}function Wu(e,t=1e-4){t=Math.max(t,2**-52);let n={},r=e.getIndex(),i=e.getAttribute(`position`),a=r?r.count:i.count,o=0,s=Object.keys(e.attributes),c={},l={},u=[],d=[`getX`,`getY`,`getZ`,`getW`],f=[`setX`,`setY`,`setZ`,`setW`];for(let t=0,n=s.length;t<n;t++){let n=s[t],r=e.attributes[n];c[n]=new r.constructor(new r.array.constructor(r.count*r.itemSize),r.itemSize,r.normalized);let i=e.morphAttributes[n];i&&(l[n]||(l[n]=[]),i.forEach((e,t)=>{let r=new e.array.constructor(e.count*e.itemSize);l[n][t]=new e.constructor(r,e.itemSize,e.normalized)}))}let p=t*.5,m=10**Math.log10(1/t),h=p*m;for(let t=0;t<a;t++){let i=r?r.getX(t):t,a=``;for(let t=0,n=s.length;t<n;t++){let n=s[t],r=e.getAttribute(n),o=r.itemSize;for(let e=0;e<o;e++)a+=`${Math.trunc(r[d[e]](i)*m+h)},`}if(a in n)u.push(n[a]);else{for(let t=0,n=s.length;t<n;t++){let n=s[t],r=e.getAttribute(n),a=e.morphAttributes[n],u=r.itemSize,p=c[n],m=l[n];for(let e=0;e<u;e++){let t=d[e],n=f[e];if(p[n](o,r[t](i)),a)for(let e=0,r=a.length;e<r;e++)m[e][n](o,a[e][t](i))}}n[a]=o,u.push(o),o++}}let g=e.clone();for(let t in e.attributes){let e=c[t];if(g.setAttribute(t,new e.constructor(e.array.slice(0,o*e.itemSize),e.itemSize,e.normalized)),t in l)for(let e=0;e<l[t].length;e++){let n=l[t][e];g.morphAttributes[t][e]=new n.constructor(n.array.slice(0,o*n.itemSize),n.itemSize,n.normalized)}}return g.setIndex(u),g}var Gu={coat:`#40678c`,coatDark:`#34587a`,fur:`#efe5d4`,skin:`#f2d7c0`,eye:`#2e1f28`,eyeWhite:`#fffdf8`,hair:`#8c4b30`,hat:`#b8473a`,hatBrim:`#9d3a31`,pom:`#f4ede2`,scarf:`#d9a347`,trousers:`#3b3444`,boots:`#5c3b2c`,sole:`#3c2922`,mitten:`#a9443a`,pack:`#7b5339`,packDark:`#654230`,strap:`#4f3326`,bedroll:`#d8cbb3`,toggle:`#eadcc3`,canopyA:`#c24e3f`,canopyB:`#f1e6d2`,line:`#5a4034`},Ku=.66,qu=new Map;function Ju(e,t=!1){let n=e+(t?`d`:``),r=qu.get(n),i=e===Gu.eyeWhite;return r||qu.set(n,r=xu(e,0,{doubleSide:t,keep:i?.95:.7,flat:+!!i})),r}function Yu(e,t,n,r=0,i=0,a=0){let o=new Zr(e,Ju(t));return o.position.set(r,i,a),n.add(o),o}function Xu(e,t=40){return new Zi(e.map(([e,t])=>new U(e,t)),t)}function Zu(e,t,n,r=24){let i=[];for(let t=0;t<=4;t++){let n=-Math.PI/2+t/4*(Math.PI/2);i.push([Math.max(1e-4,e*Math.cos(n)),e*Math.sin(n)*.8])}for(let e=0;e<=4;e++){let r=e/4*(Math.PI/2);i.push([Math.max(1e-4,t*Math.cos(r)),n+t*Math.sin(r)*.8])}return Xu(i,r)}function Qu(e,t,n){return Zu(e,t,n).rotateX(Math.PI)}var $u=new $i(1,32,24);function ed(e,t,n,r,i,a=0,o=0,s=0){let c=Yu($u,e,t,a,o,s);return c.scale.set(n,r,i),c}var td=[`hipY`,`hipX`,`hipYaw`,`hipRoll`,`spX`,`spYaw`,`spRoll`,`hdX`,`hdYaw`,`hdRoll`,`thL`,`thR`,`thLz`,`thRz`,`knL`,`knR`,`anL`,`anR`,`shLx`,`shRx`,`shLz`,`shRz`,`elL`,`elR`],nd=()=>Object.fromEntries(td.map(e=>[e,0])),rd=[`ground`,`air`,`glide`,`swim`,`fly`,`ride`,`bike`],id=e=>Math.min(1,Math.max(0,e)),ad=H.lerp,od=.27,sd=.255,cd=.22,ld=.245,ud=.105,dd=new U(.22,.45);function fd(e,t,n,r){let i=Math.max(1e-4,e.length()),a=H.clamp(i,Math.abs(t-n)+.001,t+n-.001),o=Math.asin(H.clamp(e.x/i,-1,1)),s=Math.atan2(-e.z,-e.y),c=Math.acos(H.clamp((t*t+a*a-n*n)/(2*t*a),-1,1)),l=Math.PI-Math.acos(H.clamp((t*t+n*n-a*a)/(2*t*n),-1,1));return r?[s-c,o,l]:[s+c,o,-l]}function pd(e,t){let n=Math.cos(t),r=Math.sin(t);return e.set(e.x,e.y*n+e.z*r,-e.y*r+e.z*n)}var md=class{x=0;v=0;constructor(e=0){this.x=e}step(e,t,n,r){return this.v+=(t*(e-this.x)-n*this.v)*r,this.x+=this.v*r,this.x}},hd=class{group=new En;canopy=new En;open=new md(0);pitch=new md;roll=new md;target=0;constructor(){let e=1.75,t=.62,n=1.12,r=[];for(let i=0;i<=12;i++){let a=i/12*n,o=(i/12)**4;for(let n=0;n<=64;n++){let i=n/64*Math.PI*2,s=Math.abs(Math.sin(8*i/2)),c=e*Math.sin(a)*(1+.07*s*Math.sin(a)),l=e*t*Math.cos(a)-.2*s*o;r.push(Math.cos(i)*c,l,Math.sin(i)*c)}}let i=[[],[]];for(let e=0;e<12;e++)for(let t=0;t<64;t++){let n=e*65+t,r=n+64+1;i[Math.floor(t/64*8)%2].push(n,r,n+1,n+1,r,r+1)}let a=new Dr;a.setAttribute(`position`,new q(r,3)),a.setIndex([...i[0],...i[1]]),a.addGroup(0,i[0].length,0),a.addGroup(i[0].length,i[1].length,1),a.computeVertexNormals();let o=new Zr(a,[Ju(Gu.canopyA,!0),Ju(Gu.canopyB,!0)]),s=2-e*t*Math.cos(n);o.position.y=s,this.canopy.add(o);let c=[],l=e*Math.sin(n);for(let e=0;e<8;e++){let t=e/8*Math.PI*2,n=new W(Math.cos(t)*l,2,Math.sin(t)*l),r=n.length(),i=new bi(.014,.014,r,4,1,!0);i.translate(0,r/2,0),i.applyQuaternion(new Ot().setFromUnitVectors(new W(0,1,0),n.clone().normalize())),c.push(i)}this.canopy.add(new Zr(Hu(c),Ju(Gu.line))),this.group.add(this.canopy),this.group.visible=!1}update(e,t,n,r,i){let a=this.target>this.open.x,o=this.open.step(this.target,a?70:220,a?7:28,e);if(this.target===0&&o<.03){this.open.x=this.open.v=0,this.group.visible=!1;return}this.group.visible=!0;let s=Math.max(.001,o);this.canopy.scale.set(s,Math.max(.001,s*s)*(1+.03*Math.sin(t*3.1)),s),this.canopy.position.set(0,0,-.25*(1-id(o)));let c=this.pitch.step(H.clamp(-n*.03-i*.012,-.4,.3),30,5,e),l=this.roll.step(H.clamp(-r*.35,-.45,.45),30,5,e);this.canopy.rotation.set(c+Math.sin(t*1.7)*.03,0,l+Math.sin(t*1.3)*.04)}},gd=class{root=new En;onPuff;body=new En;hips=new En;spine=new En;head=new En;thighL=new En;thighR=new En;kneeL=new En;kneeR=new En;ankleL=new En;ankleR=new En;shL=new En;shR=new En;elL=new En;elR=new En;tip1=new En;tip2=new En;scarf=[];face=Cu(Gu.skin,Gu.eye,Gu.eyeWhite,Gu.hair);chute=new hd;t=0;phase=0;w={ground:1,air:0,glide:0,swim:0,fly:0,ride:0,bike:0};poses={ground:nd(),air:nd(),glide:nd(),swim:nd(),fly:nd(),ride:nd(),bike:nd()};rootInv=new Zt;ik=new W;ik2=new W;throwT=9;aimW=0;aimLocal=new W;seatSpread=.6;invQ=new Ot;pose=nd();airTime=0;prevVel=new W;acc=new U;turn=0;prevHeading=0;squash=new md;crouch=0;crouchTarget=0;tipX=[new md(1.1),new md(.9)];tipZ=[new md,new md];scarfX=[new md,new md,new md,new md];scarfZ=[new md,new md];blinkAt=2;look=new U;glance=new U;glanceAt=1;lastStep=0;tmp=new W;get faceValues(){return this.face.uniforms.uFace.value}ropeAim=null;throwLasso(){this.throwT=0}hand(e){return this.elR.localToWorld(e.set(0,-.27,.02))}holdStill=!1;get eyeType(){return this.face.uniforms.uEyeType.value>.5?`round`:`dot`}set eyeType(e){this.face.uniforms.uEyeType.value=+(e===`round`)}constructor(){this.root.add(this.body,this.chute.group),this.chute.group.position.set(0,1.2,-.12),this.body.add(this.hips),this.hips.position.y=Ku,this.hips.add(this.spine),this.buildTorso(),this.buildHead(),this.buildArms(),this.buildLegs()}buildTorso(){let e=this.spine;Yu(Xu([[0,-.13],[.2,-.15],[.272,-.14],[.288,-.1],[.283,0],[.27,.12],[.256,.24],[.246,.34],[.234,.42],[.212,.49],[.175,.54],[.12,.58],[.06,.605],[0,.61]]).scale(1,1,.82),Gu.coat,e),Yu(new ea(.278,.042,10,40).rotateX(Math.PI/2).scale(1,1,.82),Gu.fur,e,0,-.12,0);let t=new yi(.018,.06,4,8).rotateZ(Math.PI/2);Yu(t,Gu.toggle,e,0,.3,.203),Yu(t,Gu.toggle,e,0,.13,.222),Yu(new Vu(.34,.38,.19,4,.075),Gu.pack,e,0,.25,-.3),Yu(new Vu(.355,.15,.21,4,.06),Gu.packDark,e,0,.39,-.305),Yu(new Vu(.22,.12,.07,3,.03),Gu.packDark,e,0,.14,-.4),Yu(new yi(.085,.3,6,16).rotateZ(Math.PI/2),Gu.bedroll,e,0,.5,-.31);let n=new ea(.2,.022,6,20,Math.PI).rotateY(Math.PI/2);Yu(n,Gu.strap,e,.12,.4,-.02),Yu(n,Gu.strap,e,-.12,.4,-.02),Yu(new ea(.125,.068,12,28).rotateX(Math.PI/2).scale(1,1,.92),Gu.scarf,e,0,.565,0);let r=new Vu(.1,.2,.035,2,.015).translate(0,-.09,0);for(let[t,n]of[[.06,1],[-.02,.8]]){let i=new En;i.position.set(t,.54,-.14),e.add(i);let a=Yu(r,Gu.scarf,i);a.scale.y=n;let o=new En;o.position.y=-.18*n,i.add(o),Yu(r,Gu.scarf,o).scale.set(.9,n,1),this.scarf.push(i,o)}}buildHead(){let e=this.head;e.position.set(0,.6,.01),this.spine.add(e);let t=.25,n=.23;e.scale.setScalar(1.1);let r=new Zr($u,this.face);r.scale.set(t*1.06,t*.96,t*.96),r.position.set(0,n,.02),e.add(r);let i=new W(0,0,1),a=(r,a,o,s,c,l,u=1)=>{let d=new W(Math.sin(a)*Math.cos(o),Math.sin(o),Math.cos(a)*Math.cos(o)),f=ed(r,e,s,c,l,d.x*t*1.02*u,n+d.y*t*.96*u,.02+d.z*t*.96*u);return f.quaternion.setFromUnitVectors(i,d),f},o=Yu(new $i(t*1.06,24,14,Math.PI-.5,Math.PI+1,Math.PI*.28,Math.PI*.44),Gu.hair,e,0,n,0);o.scale.set(1.03,.98,.98),o.material.side=2,a(Gu.hair,1.3,-.05,.05,.1,.06,.97),a(Gu.hair,-1.3,-.05,.05,.1,.06,.97);let s=new En;s.position.set(0,.38,-.005),s.rotation.x=-.24,e.add(s),Yu(new ea(.245,.058,12,36).rotateX(Math.PI/2),Gu.hatBrim,s),Yu(Xu([[.25,-.02],[.255,.06],[.24,.14],[.205,.21],[.15,.27],[.1,.305],[.05,.32],[0,.325]]),Gu.hat,s),this.tip1.position.set(0,.26,-.03),s.add(this.tip1),Yu(Zu(.11,.075,.16),Gu.hat,this.tip1),this.tip2.position.y=.17,this.tip1.add(this.tip2),Yu(Zu(.075,.045,.14),Gu.hat,this.tip2),ed(Gu.pom,this.tip2,.085,.085,.085,0,.2,0)}buildArms(){let e=(e,t,n)=>{e.position.set(n,.45,0),this.spine.add(e),Yu(Qu(.078,.066,.2),Gu.coat,e),t.position.y=-.22,e.add(t),Yu(Qu(.066,.058,.15),Gu.coat,t),Yu(new ea(.058,.026,8,18).rotateX(Math.PI/2),Gu.fur,t,0,-.18,0),ed(Gu.mitten,t,.07,.082,.068,0,-.245,.005),ed(Gu.mitten,t,.03,.04,.03,n>0?-.045:.045,-.225,.035)};e(this.shL,this.elL,.22),e(this.shR,this.elR,-.22)}buildLegs(){let e=(e,t,n,r)=>{e.position.set(r,0,0),this.hips.add(e),Yu(Qu(.094,.08,.2),Gu.trousers,e),t.position.y=-.27,e.add(t),Yu(Qu(.08,.072,.18),Gu.trousers,t),n.position.y=-.255,t.add(n),Yu(Zu(.084,.09,.07),Gu.boots,n,0,-.06,0),ed(Gu.boots,n,.1,.085,.15,0,-.045,.035),ed(Gu.sole,n,.105,.03,.158,0,-.105,.035)};e(this.thighL,this.kneeL,this.ankleL,.105),e(this.thighR,this.kneeR,this.ankleR,-.105)}groundPose(e,t,n){let r=this.t,i=id((t-.2)/2),a=id((t-3.2)/3.5),o=id((t-7)/3.5),s=i*ad(.42,.78,a)+.14*o,c=ad(.55,1.45,a)+.25*o,l=e=>{let t=-Math.sin(e)*s-.12*a,n=i*(.06+c*Math.max(0,Math.cos(e-.25))**1.4)+(1-i)*.05;return[t,n,-(t+n)*.8]};[e.thL,e.knL,e.anL]=l(n),[e.thR,e.knR,e.anR]=l(n+Math.PI),e.thLz=.03,e.thRz=-.03,e.hipY=i*ad(.035*(.5-.5*Math.cos(2*n))-.02,.08*(.5-.5*Math.cos(2*n-.6))-.075,a)+(1-i)*.006*Math.sin(r*2.1),e.hipX=.03*i+.08*a+.05*o,e.hipYaw=-Math.sin(n)*.14*i,e.hipRoll=.035*Math.cos(n)*i*(1-a)+(1-i)*.02*Math.sin(r*.5),e.spX=.02*i+.03*a+(1-i)*.015*Math.sin(r*2.1),e.spYaw=Math.sin(n)*.24*i,e.spRoll=0,e.hdX=-(e.hipX+e.spX)*.7+(1-i)*.05*Math.sin(r*.31),e.hdYaw=-e.spYaw*.6-e.hipYaw+(1-i)*.45*Math.sin(r*.37)*Math.sin(r*.23),e.hdRoll=(1-i)*.06*Math.sin(r*.29);let u=i*ad(.4,.95,a);e.shLx=Math.sin(n)*u+.05*a,e.shRx=-Math.sin(n)*u+.05*a,e.shLz=.13+.07*a+(1-i)*.02*Math.sin(r*2.1),e.shRz=-e.shLz,e.elL=-(.18+.12*i+1*a)-.3*a*Math.max(0,-Math.sin(n)),e.elR=-(.18+.12*i+1*a)-.3*a*Math.max(0,Math.sin(n))}airPose(e,t){let n=this.t,r=id((2-t)/8),i=id((-t-6)/10),a=Math.sin(n*13)*.18*i;e.thL=ad(-1.05,-.5,r),e.knL=ad(1.55,.55,r),e.anL=ad(-.2,-.1,r),e.thR=ad(.3,.12,r)+a*.5,e.knR=ad(.95,.75,r),e.anR=.1,e.thLz=.08,e.thRz=-.06,e.hipY=0,e.hipX=ad(.12,-.02,r),e.hipYaw=.1,e.hipRoll=0,e.spX=ad(.05,-.05,r),e.spYaw=-.12,e.spRoll=0,e.hdX=ad(-.1,.12,r),e.hdYaw=.05,e.hdRoll=0,e.shLx=ad(.5,-.2,r)+a,e.shRx=ad(-.7,-.3,r)-a,e.shLz=ad(.55,1.35,r),e.shRz=-ad(.45,1.3,r),e.elL=ad(-.5,-.45,r),e.elR=ad(-.9,-.5,r)}glidePose(e,t){let n=this.t,r=Math.sin(n*2.3);e.thL=-.28+r*.2,e.thR=-.2-r*.2,e.knL=.45-r*.15,e.knR=.4+r*.15,e.anL=e.anR=.25,e.thLz=.06,e.thRz=-.06,e.hipY=0,e.hipX=.04+Math.min(.15,t*.01),e.hipYaw=0,e.hipRoll=Math.sin(n*1.3)*.03,e.spX=0,e.spYaw=0,e.spRoll=0,e.hdX=.12,e.hdYaw=Math.sin(n*.4)*.2,e.hdRoll=0,e.shLx=e.shRx=-2.72,e.shLz=.34,e.shRz=-.34,e.elL=e.elR=-.35}swimPose(e){let t=this.t,n=t*3;e.hipY=-.1,e.hipX=1.15,e.hipYaw=0,e.hipRoll=Math.sin(n)*.12,e.spX=.1,e.spYaw=0,e.spRoll=0,e.hdX=-1.05,e.hdYaw=0,e.hdRoll=0,e.thL=Math.sin(t*7)*.35,e.thR=-Math.sin(t*7)*.35,e.knL=.3+Math.max(0,Math.sin(t*7))*.4,e.knR=.3+Math.max(0,-Math.sin(t*7))*.4,e.anL=e.anR=.6,e.thLz=.05,e.thRz=-.05,e.shLx=-2.3+Math.sin(n)*.7,e.shRx=-2.3-Math.sin(n)*.7,e.shLz=.45,e.shRz=-.45,e.elL=-.3-Math.max(0,Math.cos(n))*.6,e.elR=-.3-Math.max(0,-Math.cos(n))*.6}flyPose(e,t){let n=this.t;e.hipY=0,e.hipX=.35+Math.min(.9,t/50),e.hipYaw=0,e.hipRoll=Math.sin(n*1.4)*.05,e.spX=0,e.spYaw=0,e.spRoll=0,e.hdX=-e.hipX*.8,e.hdYaw=0,e.hdRoll=0,e.thL=.3+Math.sin(n*2)*.08,e.thR=.38-Math.sin(n*2)*.08,e.knL=.35,e.knR=.5,e.anL=e.anR=.5,e.thLz=.08,e.thRz=-.08,e.shLx=e.shRx=.1,e.shLz=1.35,e.shRz=-1.35,e.elL=e.elR=-.15}ridePose(e,t,n){let r=this.t,i=this.seatSpread,a=.12+Math.min(.35,t*.018)-H.clamp(n*.02,-.12,.12);e.hipY=0,e.hipX=a,e.hipYaw=0,e.hipRoll=Math.sin(r*1.1)*.02,e.spX=.04,e.spYaw=0,e.spRoll=0,e.hdX=-a*.8+Math.sin(r*.7)*.03,e.hdYaw=Math.sin(r*.31)*Math.sin(r*.19)*.35*(1-Math.min(1,t/8)),e.hdRoll=0,e.thL=e.thR=-1.25,e.thLz=i,e.thRz=-i,e.knL=e.knR=1.35-i*.4,e.anL=e.anR=-.1,e.shLx=e.shRx=-.75-a*.5,e.shLz=.22,e.shRz=-.22,e.elL=e.elR=-.7}bikePose(e,t,n){let r=this.t,i=t.standing,a=t.footDown,o=.3+Math.min(.1,n*.01)+.22*i-.1*a;e.hipY=0,e.hipX=o,e.hipYaw=0,e.hipRoll=Math.sin(t.crank)*.035*t.effort,e.spX=.08,e.spYaw=Math.sin(t.crank)*.05*t.effort,e.spRoll=0,e.hdX=-(o+e.spX)*.85+Math.sin(r*.7)*.02,e.hdYaw=Math.sin(r*.31)*Math.sin(r*.19)*.45*a,e.hdRoll=0;let s=this.rootInv,c=(t,n)=>pd(n.copy(t).applyMatrix4(s).setY(n.y-Ku-e.hipY),e.hipX),l=[[1,t.pedalL,Math.PI],[-1,t.pedalR,0]];for(let[n,r,i]of l){let o=this.ik.copy(r).applyMatrix4(s).add(this.ik2.set(0,.12,-.07)),c=.12+.12*Math.sin(t.crank+i),l=c;if(n===1&&a>.001){let e=this.ik2.copy(t.foot).applyMatrix4(s);o.lerp(e.add(this.tmp.set(0,.12,-.03)),a),l=ad(c,0,a)}pd(o.setY(o.y-Ku-e.hipY),e.hipX).setX(o.x-n*ud);let[u,d,f]=fd(o,od,sd,!0);n===1?(e.thL=u,e.thLz=d,e.knL=f,e.anL=l-(e.hipX+u+f)):(e.thR=u,e.thRz=d,e.knR=f,e.anR=l-(e.hipX+u+f))}let u=[[1,t.gripL],[-1,t.gripR]];for(let[t,n]of u){let r=pd(c(n,this.ik),e.spX);r.x-=t*dd.x,r.y-=dd.y;let[i,a,o]=fd(r,cd,ld,!1);t===1?(e.shLx=i,e.shLz=a,e.elL=o):(e.shRx=i,e.shRz=a,e.elR=o)}}update(e,t,n,r){if(n<=0)return;this.t+=n;let i=this.t,a=e=>1-Math.exp(-e*n);r?(this.seatSpread=r.spread,this.root.quaternion.copy(r.quat),this.root.position.set(0,-.66,0).applyQuaternion(r.quat).add(r.pos),r.bike&&(this.root.updateMatrixWorld(),this.rootInv.copy(this.root.matrixWorld).invert())):(this.root.position.copy(e.pos),this.root.rotation.set(0,e.heading,0));let o=Math.hypot(e.vel.x,e.vel.z),s=Math.sin(e.heading),c=Math.cos(e.heading),l=(e.vel.x-this.prevVel.x)/n,u=(e.vel.z-this.prevVel.z)/n;this.prevVel.copy(e.vel),this.acc.x+=(l*s+u*c-this.acc.x)*a(10),this.acc.y+=(l*c-u*s-this.acc.y)*a(10);let d=e.heading-this.prevHeading;d=Math.atan2(Math.sin(d),Math.cos(d)),this.prevHeading=e.heading,this.turn+=(d/n-this.turn)*a(8);let f=e.vel.x*s+e.vel.z*c;for(let t of e.events)if(t.type===`jump`)this.squash.v+=3.2,this.crouch=this.crouchTarget=0,r||this.puff(0,3,.08,1.2);else if(t.type===`land`){let e=id((t.impact-1.5)/14);this.squash.v-=1.2+e*4,this.crouchTarget=Math.max(this.crouchTarget,.25+e*.75),this.tipX[0].v+=3+e*6,t.impact>3&&!r&&this.puff(0,5+Math.round(e*4),.09+e*.08,1.6+e*2.2),this.airTime=0}else t.type===`deploy`?(this.chute.target=1,this.tmp.set(0,1.3,-.4).applyAxisAngle(Tn.DEFAULT_UP,e.heading).add(e.pos),this.onPuff?.(this.tmp,5,.12,1.6)):t.type===`stow`&&(this.chute.target=0);t!==`glide`&&(this.chute.target=0),this.airTime=e.grounded?0:this.airTime+n;let p=r?r.bike?`bike`:`ride`:t===`walk`?this.airTime>.1?`air`:`ground`:t in this.w?t:`ground`,m=p===`ground`?16:9,h=0;for(let e of rd)this.w[e]+=(+(e===p)-this.w[e])*a(m),h+=this.w[e];if(p===`ground`){let e=1+.27*o;this.phase+=o*n/e*Math.PI*2,o<.2&&(this.phase+=(0-Math.sin(this.phase))*a(6)*.5)}let g=this.phase,_=this.pose;for(let e of td)_[e]=0;for(let t of rd){let n=this.w[t]/h;if(n<.001)continue;let i=this.poses[t];t===`ground`?this.groundPose(i,o,g):t===`air`?this.airPose(i,e.vel.y):t===`glide`?this.glidePose(i,o):t===`swim`?this.swimPose(i):t===`ride`?this.ridePose(i,o,e.vel.y):t===`bike`?r?.bike&&this.bikePose(i,r.bike,o):this.flyPose(i,o);for(let e of td)_[e]+=i[e]*n}let v=this.w.ground/h,y=this.w.glide/h;_.hipX+=H.clamp(this.acc.x*.012,-.12,.15)*v;let b=H.clamp(-this.turn*o*.016,-.2,.2);_.hipRoll+=b*(v+this.w.air/h*.5+y*1.4),_.hdRoll-=b*.5,this.crouch+=(this.crouchTarget-this.crouch)*a(35),this.crouchTarget*=Math.exp(-6*n);let x=this.crouch*v;_.hipY-=.2*x,_.hipX+=.3*x,_.thL-=.6*x,_.thR-=.5*x,_.knL+=1.15*x,_.knR+=1*x,_.anL-=.5*x,_.anR-=.45*x,_.hdX-=.2*x,_.shLz+=.3*x,_.shRz-=.3*x,this.throwT+=n;let S=!!this.ropeAim;if(this.aimW+=(+!!S-this.aimW)*a(8),S&&(this.invQ.copy(this.root.quaternion).invert(),this.aimLocal.copy(this.ropeAim).normalize().applyQuaternion(this.invQ)),this.aimW>.001){let e=this.aimLocal,t=H.clamp(Math.asin(H.clamp(e.x,-1,1)),-1.1,.35),n=H.clamp(-Math.atan2(Math.max(e.z,-.2),-e.y),-2.4,.3),r=this.aimW;_.shRx=ad(_.shRx,n-_.hipX-_.spX,r),_.shRz=ad(_.shRz,t,r),_.elR=ad(_.elR,-.15,r),_.spYaw=ad(_.spYaw,_.spYaw-.15,r)}if(this.throwT<.5){let e=this.throwT,t=id(e/.14),n=id((e-.14)/.1),r=1-id((e-.3)/.2)*+!S,i=ad(ad(_.shRx,-2.9,t),-1.35,n);_.shRx=ad(_.shRx,i,r),_.shRz=ad(_.shRz,ad(-.55,-.2,n),r),_.elR=ad(_.elR,ad(-1.3,-.1,n),r),_.spYaw+=(.3*t-.55*n)*r,_.hdYaw-=(.3*t-.55*n)*r*.5}this.hips.position.y=Ku+_.hipY,this.hips.rotation.set(_.hipX,_.hipYaw,_.hipRoll),this.spine.rotation.set(_.spX,_.spYaw,_.spRoll),this.holdStill?this.head.rotation.set(0,0,0):this.head.rotation.set(_.hdX,_.hdYaw,_.hdRoll),this.thighL.rotation.set(_.thL,0,_.thLz),this.thighR.rotation.set(_.thR,0,_.thRz),this.kneeL.rotation.x=_.knL,this.kneeR.rotation.x=_.knR,this.ankleL.rotation.x=_.anL,this.ankleR.rotation.x=_.anR,this.shL.rotation.set(_.shLx,0,_.shLz),this.shR.rotation.set(_.shRx,0,_.shRz),this.elL.rotation.x=_.elL,this.elR.rotation.x=_.elR;let C=this.squash.step(0,260,13,n),w=1+H.clamp(C,-.35,.35);this.body.scale.set(1/Math.sqrt(w),w,1/Math.sqrt(w));let T=Math.floor((g+Math.PI/2)/Math.PI);if(p===`ground`&&T!==this.lastStep){let t=id((o-4)/4);this.tipX[0].v+=1.5*t,this.scarfX[0].v+=1*t,o>8.5&&e.grounded&&this.puff(T%2?.1:-.1,2,.07,.7)}this.lastStep=T;let E=_.hipX+_.spX,D=Math.min(1,Math.max(0,f)/10)+y*.3,O=H.clamp(-e.vel.y*.07,-.3,1.2)*(1-this.w.ground/h),k=1.05+D*.35*.5+this.acc.x*.02-O*.6-E*.8+_.hdX*-.5;this.tip1.rotation.x=-this.tipX[0].step(k,60,6,n),this.tip2.rotation.x=-this.tipX[1].step(.85+D*.3-O*.5+(this.tipX[0].x-k)*.8,45,4,n);let A=-this.acc.y*.02-b*.8;this.tip1.rotation.z=this.tipZ[0].step(A,50,5,n),this.tip2.rotation.z=this.tipZ[1].step(A*1.3,40,4,n);let j=e=>Math.sin(i*(16+e*3)+e*1.7)*.12*D;for(let e=0;e<2;e++){let t=this.scarfX[e*2],r=this.scarfX[e*2+1],i=D*(1.25-e*.15)+O*1.1+this.acc.x*.015-E+j(e);this.scarf[e*2].rotation.x=t.step(i,55,5,n),this.scarf[e*2+1].rotation.x=r.step(D*.35+j(e+2)*1.5+(t.x-i)*.6,40,4,n),this.scarf[e*2].rotation.z=this.scarfZ[e].step(A*.8+(e?-.08:.08),40,5,n)}let M=i>this.blinkAt&&!this.holdStill?0:1;i>this.blinkAt+.11&&(this.blinkAt=i+2+Math.random()*3.5),this.face.uniforms.uBlink.value=M,i>this.glanceAt&&(Math.random()<.35?this.glance.set(0,0):this.glance.set((Math.random()-.5)*.2,(Math.random()-.5)*.07),this.glanceAt=i+.5+Math.random()*2.5);let N=1-id(o/2.5),P=this.glance.x*N+H.clamp(this.turn*.06,-.12,.12)+_.hdYaw*.2,ee=this.glance.y*N-.01*(1-N);if(this.holdStill)this.look.set(0,0);else{let e=a(28);this.look.x+=(P-this.look.x)*e,this.look.y+=(ee-this.look.y)*e}this.face.uniforms.uLook.value.copy(this.look),this.chute.update(n,i,this.acc.x,this.turn,o),this.root.updateMatrixWorld(!0)}puff(e,t,n,r){this.onPuff&&(this.tmp.set(e,0,0).applyAxisAngle(Tn.DEFAULT_UP,this.root.rotation.y).add(this.root.position),this.onPuff(this.tmp,t,n,r))}},_d=class{el;keys=new Set;edges=new Set;lookX=0;lookY=0;wheel=0;dragging=!1;stick={x:0,y:0,walk:!1,run:!1};constructor(e){this.el=e;let t=e=>{let t=e.target;return!!t&&(t.tagName===`INPUT`||t.tagName===`SELECT`||t.tagName===`TEXTAREA`)};window.addEventListener(`keydown`,e=>{t(e)||(this.keys.has(e.code)||this.edges.add(e.code),this.keys.add(e.code),(e.code===`Space`||e.code.startsWith(`Arrow`)||e.code.startsWith(`Alt`))&&e.preventDefault())}),window.addEventListener(`keyup`,e=>this.keys.delete(e.code)),window.addEventListener(`blur`,()=>this.keys.clear()),e.addEventListener(`pointerdown`,t=>{t.pointerType!==`touch`&&(t.button===0&&!document.pointerLockElement&&e.requestPointerLock?.(),t.button===2?this.edges.add(`Mouse2`):this.dragging=!0)}),e.addEventListener(`contextmenu`,e=>e.preventDefault()),window.addEventListener(`pointerup`,()=>this.dragging=!1),window.addEventListener(`mousemove`,e=>{(document.pointerLockElement===this.el||this.dragging)&&(this.lookX+=e.movementX,this.lookY+=e.movementY)}),e.addEventListener(`wheel`,e=>{this.wheel+=e.deltaY,e.preventDefault()},{passive:!1})}state(){let e=e=>this.keys.has(e),t=e=>Math.max(-1,Math.min(1,e)),n=this.stick;return{x:t((e(`KeyD`)||e(`ArrowRight`)?1:0)-(e(`KeyA`)||e(`ArrowLeft`)?1:0)+n.x),y:t((e(`KeyW`)||e(`ArrowUp`)?1:0)-(e(`KeyS`)||e(`ArrowDown`)?1:0)+n.y),run:e(`ShiftLeft`)||e(`ShiftRight`)||n.run,walk:e(`AltLeft`)||e(`AltRight`)||n.walk,jump:e(`Space`),jumpPressed:this.edges.has(`Space`),up:e(`Space`),down:e(`KeyC`)||e(`KeyQ`)||e(`ControlLeft`)}}virtualKey(e,t){t?(this.keys.has(e)||this.edges.add(e),this.keys.add(e)):this.keys.delete(e)}setStick(e,t,n,r){this.stick={x:e,y:t,walk:n,run:r}}addLook(e,t){this.lookX+=e,this.lookY+=t}addZoom(e){this.wheel+=e}pressed(e){let t=this.edges.has(e);return this.edges.delete(e),t}endFrame(){this.edges.clear()}consumeLook(){let e=[this.lookX,this.lookY];return this.lookX=this.lookY=0,e}consumeWheel(){let e=this.wheel;return this.wheel=0,e}},vd=56,yd=1.5;function bd(){return matchMedia(`(hover: none) and (pointer: coarse)`).matches}var xd=class{input;root;stick;knob;buttons;stickId=-1;stickOrigin={x:0,y:0};looks=new Map;pinch=0;lookIdle=99;last={ride:null,lasso:null,down:!1,fly:!0};constructor(e,t){this.input=e,document.body.classList.add(`touch`),this.root=document.createElement(`div`),this.root.id=`touch`,this.stick=document.createElement(`div`),this.stick.className=`stick`,this.knob=document.createElement(`div`),this.knob.className=`knob`,this.stick.appendChild(this.knob),this.root.appendChild(this.stick);let n=(e,t,n)=>{let r=document.createElement(`button`);r.className=`tbtn `+e,r.textContent=t,r.addEventListener(`pointerdown`,e=>{e.preventDefault(),e.stopPropagation(),r.classList.add(`held`),this.input.virtualKey(n,!0)});let i=()=>{r.classList.remove(`held`),this.input.virtualKey(n,!1)};return r.addEventListener(`pointerup`,i),r.addEventListener(`pointercancel`,i),r.addEventListener(`contextmenu`,e=>e.preventDefault()),this.root.appendChild(r),r};this.buttons={jump:n(`jump`,`Jump`,`Space`),ride:n(`ride`,`Ride`,`KeyE`),lasso:n(`lasso`,`Lasso`,`KeyR`),down:n(`down`,`▼`,`KeyC`),fly:n(`fly`,`Fly`,`KeyF`)},document.body.appendChild(this.root),this.apply(this.last,!0),t.addEventListener(`pointerdown`,e=>this.down(e)),t.addEventListener(`pointermove`,e=>this.move(e)),t.addEventListener(`pointerup`,e=>this.up(e)),t.addEventListener(`pointercancel`,e=>this.up(e)),document.addEventListener(`gesturestart`,e=>e.preventDefault()),document.addEventListener(`dblclick`,e=>e.preventDefault())}update(e){this.lookIdle=this.looks.size?0:this.lookIdle+e}setContext(e){this.apply(e,!1)}apply(e,t){let n=this.last;if(!t&&n.ride===e.ride&&n.lasso===e.lasso&&n.down===e.down&&n.fly===e.fly)return;this.last={...e};let r=this.buttons;r.ride.hidden=!e.ride,e.ride&&(r.ride.textContent=e.ride),r.lasso.hidden=!e.lasso,e.lasso&&(r.lasso.textContent=e.lasso),r.down.hidden=!e.down,r.jump.textContent=e.down?`▲`:`Jump`,r.jump.classList.toggle(`climb`,e.down),r.fly.hidden=!e.fly}down(e){if(e.pointerType===`touch`){if(e.preventDefault(),this.stickId<0&&e.clientX<window.innerWidth*.45){this.stickId=e.pointerId,this.stickOrigin={x:e.clientX,y:e.clientY},this.stick.style.transform=`translate(${e.clientX}px, ${e.clientY}px)`,this.stick.classList.add(`on`),this.knob.style.transform=``;return}this.looks.set(e.pointerId,{x:e.clientX,y:e.clientY}),this.pinch=this.looks.size===2?this.spread():0}}move(e){if(e.pointerType!==`touch`)return;if(e.pointerId===this.stickId){let t=e.clientX-this.stickOrigin.x,n=e.clientY-this.stickOrigin.y,r=Math.hypot(t,n),i=r/vd;r>vd&&(t*=vd/r,n*=vd/r),this.knob.style.transform=`translate(${t}px, ${n}px)`,this.knob.classList.toggle(`sprint`,i>1.15),this.input.setStick(t/vd,-n/vd,i<.45,i>1.15);return}let t=this.looks.get(e.pointerId);if(t){if(this.looks.size>=2){t.x=e.clientX,t.y=e.clientY;let n=this.spread();this.pinch>0&&n>0&&this.input.addZoom(-Math.log(n/this.pinch)/.001),this.pinch=n;return}this.input.addLook((e.clientX-t.x)*yd,(e.clientY-t.y)*yd),t.x=e.clientX,t.y=e.clientY}}up(e){if(e.pointerType===`touch`){if(e.pointerId===this.stickId){this.stickId=-1,this.stick.classList.remove(`on`),this.knob.classList.remove(`sprint`),this.input.setStick(0,0,!1,!1);return}this.looks.delete(e.pointerId),this.pinch=this.looks.size===2?this.spread():0}}spread(){let[e,t]=[...this.looks.values()];return e&&t?Math.hypot(e.x-t.x,e.y-t.y):0}},Sd=.32;function Cd(e,t,n,r){return e.floorHeight?e.floorHeight(t,n,r,Sd):e.groundHeight(t,n)}function wd(e,t){t.collide?.(e.pos,e.vel,Sd)}var Td=new W;function Ed(e,t){let{x:n,y:r}=e.input,i=Math.sin(e.camYaw),a=Math.cos(e.camYaw);t.set(-i*r+a*n,0,-a*r-i*n);let o=t.length();return o>1&&t.divideScalar(o),t}function Dd(e,t,n,r){if(t.lengthSq()<1e-4)return;let i=Math.atan2(t.x,t.z)-e.heading;i=Math.atan2(Math.sin(i),Math.cos(i)),e.heading+=i*(1-Math.exp(-n*r))}var Od=class{name=`walk`;walkSpeed=2.4;runSpeed=6.2;sprintSpeed=10.5;jumpSpeed=8.4;gravity=25;fallMul=1.6;cutMul=2.6;maxFall=45;coyote=.12;buffer=.14;deployClearance=1;sinceGround=0;sincePress=1;jumping=!1;enter(e){this.sinceGround=+!e.grounded,this.sincePress=1,this.jumping=!1}update(e,t){let{dt:n,world:r,input:i}=t,a=Ed(t,Td),o=a.length(),s=i.walk?this.walkSpeed:i.run?this.sprintSpeed:this.runSpeed,c=Math.hypot(e.vel.x,e.vel.z);if(e.grounded){let t=o>.05?(e.vel.x*a.x+e.vel.z*a.z)/o:0,r=o<.05?14:t<c*.3?18:t<s?9:12,i=1-Math.exp(-r*n);e.vel.x+=(a.x*s-e.vel.x)*i,e.vel.z+=(a.z*s-e.vel.z)*i,Dd(e,a,14,n)}else if(o>.05){let t=1-Math.exp(-4*n),r=Math.max(s,c);e.vel.x+=(a.x*r-e.vel.x)*t,e.vel.z+=(a.z*r-e.vel.z)*t,Dd(e,a,7,n)}let l=Cd(r,e.pos.x,e.pos.z,e.pos.y);if(e.grounded&&c>.3){let t=(Cd(r,e.pos.x+e.vel.x*.15,e.pos.z+e.vel.z*.15,e.pos.y)-l)/(c*.15);if(t>.8){let r=H.clamp(1.6-t,.15,1)**(n*60);e.vel.x*=r,e.vel.z*=r}}this.sinceGround=e.grounded?0:this.sinceGround+n,this.sincePress=i.jumpPressed?0:this.sincePress+n;let u=e.pos.y-l;if(this.sincePress<=this.buffer&&!this.jumping&&this.sinceGround<=this.coyote)e.vel.y=this.jumpSpeed+Math.min(1.2,c*.1),e.grounded=!1,this.jumping=!0,this.sincePress=1,this.sinceGround=1,e.events.push({type:`jump`});else if(i.jumpPressed&&!e.grounded&&u>this.deployClearance)return`glide`;let d=this.gravity;e.vel.y<0?d*=this.fallMul:this.jumping&&!i.jump?d*=this.cutMul:this.jumping&&e.vel.y<1.5&&(d*=.6),(!e.grounded||e.vel.y>0)&&(e.vel.y=Math.max(e.vel.y-d*n,-this.maxFall));let f=e.vel.y;e.pos.addScaledVector(e.vel,n),wd(e,r);let p=Cd(r,e.pos.x,e.pos.z,e.pos.y),m=e.grounded&&e.vel.y<=0?Math.max(.05,c*n*1.6):0;return e.pos.y<=p||e.pos.y-p<m?(e.grounded||e.events.push({type:`land`,impact:Math.max(0,-f)}),e.pos.y=p,e.vel.y=0,e.grounded=!0,this.jumping=!1):e.grounded=!1,p<r.waterLevel-1.1&&e.pos.y<r.waterLevel-.9?`swim`:null}},kd=class{name=`glide`;speed=9;diveSpeed=15;drift=4;sink=2.3;diveSink=7;t=0;enter(e){this.t=0,e.grounded=!1,e.vel.y<-4&&(e.vel.y=-4+(e.vel.y+4)*.25),e.events.push({type:`deploy`})}exit(e){e.events.push({type:`stow`})}update(e,t){let{dt:n,world:r,input:i}=t;if(this.t+=n,i.jumpPressed&&this.t>.15)return`walk`;let a=Ed(t,Td),o=i.run;a.lengthSq()>.0025?a.multiplyScalar(o?this.diveSpeed:this.speed):a.set(Math.sin(e.heading),0,Math.cos(e.heading)).multiplyScalar(this.drift);let s=1-Math.exp(-1.6*n);e.vel.x+=(a.x-e.vel.x)*s,e.vel.z+=(a.z-e.vel.z)*s,Dd(e,Td.set(e.vel.x,0,e.vel.z),3.5,n);let c=o?-this.diveSink:-this.sink;e.vel.y+=(c-e.vel.y)*(1-Math.exp(-(this.t<.6?6:3)*n)),e.pos.addScaledVector(e.vel,n),wd(e,r);let l=Cd(r,e.pos.x,e.pos.z,e.pos.y);return l<r.waterLevel-1.1&&e.pos.y<r.waterLevel-.9?`swim`:e.pos.y<=l?(e.events.push({type:`land`,impact:-e.vel.y}),e.pos.y=l,e.vel.y=0,e.grounded=!0,`walk`):null}},Ad=class{name=`swim`;speed=2.2;fastSpeed=3.8;float=1.15;t=0;enter(e){e.vel.y*=.2,e.grounded=!1}update(e,t){let{dt:n,world:r}=t;this.t+=n;let i=Ed(t,Td),a=t.input.run?this.fastSpeed:this.speed,o=1-Math.exp(-3*n);e.vel.x+=(i.x*a-e.vel.x)*o,e.vel.z+=(i.z*a-e.vel.z)*o,Dd(e,i,5,n);let s=r.waterLevel-this.float+Math.sin(this.t*2.2)*.05;e.vel.y+=(s-e.pos.y)*6*n,e.vel.y*=Math.exp(-4*n),e.pos.addScaledVector(e.vel,n),wd(e,r);let c=Cd(r,e.pos.x,e.pos.z,e.pos.y);return c>r.waterLevel-this.float+.05?(e.pos.y=Math.max(e.pos.y,c),`walk`):null}},jd=class{name=`fly`;speed=22;fastSpeed=90;enter(e){e.grounded=!1,e.vel.y=Math.max(e.vel.y,4)}update(e,t){let{dt:n,world:r,input:i}=t,a=i.run?this.fastSpeed:this.speed,o=Math.cos(t.camPitch),s=Math.sin(t.camPitch),c=Math.sin(t.camYaw),l=Math.cos(t.camYaw);Td.set(-c*o*i.y+l*i.x,-s*i.y+(+!!i.up-!!i.down),-l*o*i.y-c*i.x),Td.lengthSq()>1&&Td.normalize();let u=1-Math.exp(-3*n);e.vel.lerp(Td.multiplyScalar(a),u),Dd(e,new W(e.vel.x,0,e.vel.z),4,n),e.pos.addScaledVector(e.vel,n);let d=Math.max(r.groundHeight(e.pos.x,e.pos.z),r.waterLevel)+.5;return e.pos.y<d&&(e.pos.y=d,e.vel.y=Math.max(0,e.vel.y)),null}},Md=class{name=`ride`;spec=null;fp=new W;enter(e){this.spec?.walk||(e.grounded=!1)}update(e,t){let n=this.spec;if(!n)return`walk`;let{dt:r,world:i,input:a}=t,o=Ed(t,Td),s=o.length(),c=t=>i.floorHeight?i.floorHeight(e.pos.x,e.pos.z,t,n.radius):i.groundHeight(e.pos.x,e.pos.z);if(e.grounded&&n.walk){let t=a.run?n.walk.sprint:n.walk.speed,l=1-Math.exp(-(s<.05?7:4.5)*r);e.vel.x+=(o.x*t-e.vel.x)*l,e.vel.z+=(o.z*t-e.vel.z)*l,Dd(e,o,7,r),e.vel.y=0;let u=Math.hypot(e.vel.x,e.vel.z);e.pos.addScaledVector(e.vel,r),i.collide?.(e.pos,e.vel,n.radius);let d=c(e.pos.y),f=i.groundHeight(e.pos.x,e.pos.z)<i.waterLevel-.3;return a.jumpPressed||f?(e.vel.y=n.walk.takeoff,e.grounded=!1,e.events.push({type:`jump`})):e.pos.y-d>Math.max(.6,u*r*1.6)?e.grounded=!1:e.pos.y=d,null}let l=n.fly,u=a.run?l.sprint:l.speed,d=1-Math.exp(-(s>.05?2.2:.9)*r);e.vel.x+=(o.x*u-e.vel.x)*d,e.vel.z+=(o.z*u-e.vel.z)*d;let f=a.up?l.climb:a.down?-l.climb*1.3:-l.sink;e.vel.y+=(f-e.vel.y)*(1-Math.exp(-3*r)),this.fp.set(e.vel.x,0,e.vel.z),Dd(e,this.fp.lengthSq()>.25?this.fp:o,l.turn,r);let p=e.vel.y;e.pos.addScaledVector(e.vel,r),i.collide?.(e.pos,e.vel,n.radius);let m=c(e.pos.y),h=i.groundHeight(e.pos.x,e.pos.z)<i.waterLevel;if(n.walk&&!h&&e.pos.y<=m+.02&&p<=.5)return e.events.push({type:`land`,impact:Math.max(0,-p)}),e.pos.y=m,e.vel.y=0,e.grounded=!0,null;let g=Math.max(m,i.waterLevel)+(n.walk?h?.35:0:l.hover);return e.pos.y<g&&(e.pos.y+=(g-e.pos.y)*Math.min(1,12*r),e.pos.y<g-.5&&(e.pos.y=g-.5),e.vel.y=Math.max(0,e.vel.y)),e.pos.y=Math.min(e.pos.y,900),e.grounded=!1,null}},Nd=2.2,Pd=3,Fd=class{name=`bike`;cruise=10;sprint=16;dawdle=3.5;accel=3.4;sprintAccel=5.2;brake=10;idleBrake=2.6;roll=.25;drag=8e-4;hop=5.4;gravity=25;wheelbase=1;wheelR=.315;gear=2.3;radius=.3;speed=0;yawRate=0;steer=0;lean=0;crank=0;effort=0;standing=0;fwd=new W;prev=new W;groundVy=0;rampVy=0;kickCool=0;armed=0;late=0;lastKick=0;debugKick=null;perfectWindow=.16;maxCadence=15;enter(e){this.fwd.set(Math.sin(e.heading),0,Math.cos(e.heading)),this.speed=e.vel.x*this.fwd.x+e.vel.z*this.fwd.z,this.yawRate=this.groundVy=this.rampVy=this.armed=this.late=0,this.effort=this.standing=0,e.vel.y=0}update(e,t){let{dt:n,world:r,input:i}=t,a=e=>1-Math.exp(-e*n),o=Ed(t,Td),s=Math.min(1,o.length()),c=0,l=0,u=!1;if(s>.05){c=Math.atan2(o.x,o.z)-e.heading,c=Math.atan2(Math.sin(c),Math.cos(c));let t=Math.abs(c)>2;t&&this.speed>2.5?(u=!0,c=0):l=(i.run?this.sprint:i.walk?this.dawdle:this.cruise)*s*(t?.3:.55+.45*Math.max(0,Math.cos(c)))}let d=Math.abs(this.speed),f=Math.max(d/(1.7+d*.22+d*d*.012),1.3*(1-Math.min(1,d/2.5))),p=H.clamp(c*3.2,-f,f)*(e.grounded?1:.35);this.yawRate+=(p-this.yawRate)*a(e.grounded?9:3),e.heading+=this.yawRate*n;let m=Math.sin(e.heading),h=Math.cos(e.heading);this.fwd.set(m,0,h);let g=d>Pd,_=(e,t,n)=>{let i=Cd(r,e,t,n);return g&&r.ramp?Math.max(i,r.ramp(e,t,.15,Nd)):i};this.kickCool-=n;let v=!1,y=!1,b=0;if(e.grounded){let t=this.wheelbase/2,r=_(e.pos.x+m*t,e.pos.z+h*t,e.pos.y+.3),a=_(e.pos.x-m*t,e.pos.z-h*t,e.pos.y+.3);b=H.clamp((r-a)/this.wheelbase,-3,3);let o=-9.8*b/Math.sqrt(1+b*b);if(y=l>0,l>0&&this.speed<l){let e=Math.min(1,(l-this.speed)/1.5);o+=(i.run?this.sprintAccel:this.accel)*e+(this.roll+this.drag*this.speed*this.speed)*Math.min(1,e*4),v=e>.05}let c=(u?this.brake:0)+(s<.05&&Math.abs(this.speed)<this.cruise?this.idleBrake:0)+this.roll+this.drag*this.speed*this.speed;this.speed+=o*n,this.speed=Math.sign(this.speed)*Math.max(0,Math.abs(this.speed)-c*n),this.speed=Math.max(this.speed,-4),e.vel.set(m*this.speed,0,h*this.speed);let d=this.rampVy>2&&this.kickCool<=0;i.jumpPressed&&d?this.armed=this.perfectWindow:(i.jumpPressed||this.armed>0&&this.armed-n<=0)&&this.hopNow(e)}this.armed=Math.max(0,this.armed-n),!e.grounded&&this.late>0&&(this.late-=n,i.jumpPressed&&(e.vel.y=Math.max(e.vel.y,0)+this.lastKick,this.late=0,e.events.push({type:`kick`,speed:this.lastKick*2,perfect:!0}))),this.effort+=((y?v?i.run?1:.6:.25:0)-this.effort)*a(6);let x=v&&(i.run||b>.14)?1:0;this.standing+=(x-this.standing)*a(x?5:3),y&&e.grounded&&(this.crank+=Math.min(this.maxCadence,Math.max(this.speed,1.4)/(this.wheelR*this.gear))*n);let S=H.clamp(Math.atan(this.speed*this.yawRate/9.8),-.75,.75);this.lean+=(S-this.lean)*a(e.grounded?7:3);let C=H.clamp(Math.atan(this.yawRate*this.wheelbase/Math.max(.8,d)),-.8,.8);this.steer+=(C-this.steer)*a(12),e.grounded||(e.vel.y=Math.max(e.vel.y-this.gravity*(e.vel.y<0?1.3:1)*n,-45)),this.prev.copy(e.pos);let w=Math.min(40,Math.ceil(Math.hypot(e.vel.x,e.vel.z)*n/.25)),T=this.speed;for(let t=0;t<w;t++)e.pos.addScaledVector(e.vel,n/w),this.collide(e,r,T,g?Nd:0);w||(e.pos.y+=e.vel.y*n);let E=Math.sign(this.speed)||1;e.grounded&&r.groundHeight(e.pos.x+m*.6*E,e.pos.z+h*.6*E)<r.waterLevel-.25&&(e.pos.x=this.prev.x,e.pos.z=this.prev.z,this.speed=0,e.vel.set(0,0,0));let D=_(e.pos.x,e.pos.z,e.pos.y);if(e.grounded){if(e.pos.y-D>Math.max(.08,d*n*1.3))e.grounded=!1,e.vel.y=Math.max(0,this.groundVy);else{let t=Math.min((D-this.prev.y)/n,d*1.3+1);this.groundVy+=(t-this.groundVy)*a(20),e.pos.y=D;let i=D-r.groundHeight(e.pos.x,e.pos.z);if(i>.08?this.rampVy=Math.max(this.rampVy*Math.exp(-2*n),this.groundVy):this.rampVy*=Math.exp(-10*n),i>.15&&this.rampVy>2&&this.groundVy<this.rampVy*.3&&this.kickCool<=0){let t=Math.max(Math.min(this.rampVy,d*1.1),d*.45)*Math.min(1.3,i/.9);if(t>1.5){let n=this.armed>0;e.vel.y=n?t*2:t,e.grounded=!1,this.lastKick=t,this.late=n?0:this.perfectWindow,this.armed=0,this.kickCool=.6,this.rampVy=0,e.events.push({type:`kick`,speed:e.vel.y,perfect:n}),this.debugKick={speed:e.vel.y,perfect:n,rise:i,rampVy:t}}}}}else e.pos.y<=D&&(e.events.push({type:`land`,impact:Math.max(0,-e.vel.y)}),e.pos.y=D,e.vel.y=0,e.grounded=!0,this.speed=e.vel.x*m+e.vel.z*h,this.groundVy=this.rampVy=0,this.late=0);return D<r.waterLevel-1.1&&e.pos.y<r.waterLevel-.9?`swim`:null}hopNow(e){e.vel.y=this.hop+Math.max(0,this.groundVy)*.5,e.grounded=!1,this.armed=0,e.events.push({type:`jump`})}collide(e,t,n,r){if(!t.collide)return;let i=this.wheelbase*.35;for(let n of[i,-i]){Td.set(e.pos.x+this.fwd.x*n,e.pos.y,e.pos.z+this.fwd.z*n);let i=Td.x,a=Td.z;t.collide(Td,e.vel,this.radius,r),e.pos.x+=Td.x-i,e.pos.z+=Td.z-a}if(!e.grounded)return;this.speed=e.vel.x*this.fwd.x+e.vel.z*this.fwd.z;let a=Math.abs(n)-Math.abs(this.speed);a>3.5&&!e.events.some(e=>e.type===`bump`)&&e.events.push({type:`bump`,impact:a})}},Id=class{modes=new Map;current;body={pos:new W,vel:new W,heading:0,grounded:!1,events:[]};constructor(e,t){for(let t of e)this.modes.set(t.name,t);this.current=this.modes.get(t)}register(e){this.modes.set(e.name,e)}set(e,t){let n=this.modes.get(e);n&&n!==this.current&&(this.current.exit?.(this.body),this.current=n,n.enter?.(this.body,t))}update(e){this.body.events.length=0;let t=this.current.update(this.body,e);t&&this.set(t,e)}},Ld=new K;function Rd(e,t,n=0,r=!0){let i=e.index?e.toNonIndexed():e.clone();for(let e of Object.keys(i.attributes))e!==`position`&&e!==`normal`&&i.deleteAttribute(e);i.getAttribute(`normal`)||i.computeVertexNormals();let a=i.getAttribute(`position`).count,o=new Float32Array(a*4);Ld.set(t);for(let e=0;e<a;e++)o.set([Ld.r,Ld.g,Ld.b,n],e*4);return i.setAttribute(`aCol`,new pr(o,4)),i.setAttribute(`aTint`,new pr(new Float32Array(a).fill(+!!r),1)),i}function zd(e){let t=Hu(e);if(!t)throw Error(`creature geometry merge failed`);return t}function Bd(e,t=32){return new Zi(e.map(([e,t])=>new U(Math.max(e,1e-4),t)),t)}function Vd(e){let t=e.clone();t.scale(-1,1,1);let n=e=>{let t=e.array,n=e.itemSize;for(let r=0;r<e.count;r+=3)for(let e=0;e<n;e++){let i=(r+1)*n+e,a=(r+2)*n+e,o=t[i];t[i]=t[a],t[a]=o}};if(t.index)throw Error(`mirrorX expects non-indexed geometry`);for(let e of Object.keys(t.attributes))n(t.getAttribute(e));return t}var Hd=class{max;mesh;eye;n=0;constructor(e,t,n){this.max=n;let r=e.clone();this.eye=new ti(new Float32Array(n*4),4),this.eye.setUsage(He),r.setAttribute(`aEye`,this.eye),this.mesh=new li(r,Su(t),n),this.mesh.instanceMatrix.setUsage(He),this.mesh.setColorAt(0,new K(1,1,1)),this.mesh.instanceColor.setUsage(He),this.mesh.frustumCulled=!1,this.mesh.count=0}get material(){return this.mesh.material}setGeometry(e){let t=e.clone();t.setAttribute(`aEye`,this.eye),this.mesh.geometry.dispose(),this.mesh.geometry=t}begin(){this.n=0}push(e,t,n){this.n>=this.max||(this.mesh.setMatrixAt(this.n,e),this.mesh.setColorAt(this.n,t),n&&this.eye.setXYZW(this.n,n.x,n.y,n.z,n.w),this.n++)}end(){this.mesh.count=this.n,this.mesh.visible=this.n>0,this.mesh.instanceMatrix.needsUpdate=!0,this.mesh.instanceColor.needsUpdate=!0,this.eye.needsUpdate=!0}},Ud=class{x;v=0;constructor(e=0){this.x=e}step(e,t,n,r){return this.v+=(t*(e-this.x)-n*this.v)*r,this.x+=this.v*r,this.x}};function Wd(e){let t=new $i(1,e.widthSegs??72,e.heightSegs??52),n=e.tufts??90,r=e.amp??.06,i=e.sweep??.05,a=(e.seed??7)>>>0,o=()=>(a=Math.imul(a,1664525)+1013904223>>>0,a/4294967296),s=[],c=Math.PI*(3-Math.sqrt(5));for(let t=0;t<n;t++){let r=1-(t+.5)/n*2,i=Math.sqrt(1-r*r),a=t*c+(o()-.5)*.5,l=new W(Math.cos(a)*i,r+(o()-.5)*.08,Math.sin(a)*i).normalize(),u=o()<(e.share??.35);s.push({d:l,a:u?.8+o()*.8:.1,w:(e.width??1)*(.8+o()*.45)})}let l=Math.sqrt(4*Math.PI/n),u=t.getAttribute(`position`),d=t.getAttribute(`normal`),f=new W,p=new W;for(let t=0;t<u.count;t++){f.fromBufferAttribute(u,t).normalize();let n=0;for(let e of s){let t=Math.acos(Math.min(1,f.dot(e.d))),r=l*.75*e.w;t<r&&(n=Math.max(n,e.a*(1-t/r)**2.2))}let a=e.mask?e.mask(f):1,o=1+r*n*a,c=f.clone().multiplyScalar(o);e.comb&&(e.comb(f,p),c.addScaledVector(p,i*n*n*a)),u.setXYZ(t,c.x,c.y,c.z),d.setXYZ(t,f.x,f.y,f.z)}return t}var Gd=1.4,Kd=`#58536f`,qd=`#8d8392`,Jd=`#5a5058`,Yd=`#c9a26b`,Xd=`#6e4a33`,Zd=`#d9b36a`,Qd=[`#ffffff`,`#f4eef6`,`#eef0f8`,`#fbf2ec`].map(e=>new K(e)),$d=64,ef=.78,tf=new W(0,.28,.4),nf=new W(0,.16,.1),rf=.3,af=new W(.3,.2,.18),of=new W(.14,-.3,-.02),sf={plump:.4};function cf(e){let t=.42+.14*e,n=.66-.08*e,r=new W,i=Wd({tufts:70,amp:.05,sweep:.09,width:1.1,seed:5,comb:(e,t)=>(r.set(0,-.1,-1),t.copy(r).addScaledVector(e,-e.dot(r)).normalize())}),a=i.getAttribute(`position`);for(let e=0;e<a.count;e++){let r=a.getZ(e),i=r<0?1-.38*(-r)**1.5:1+.04*r;a.setXYZ(e,a.getX(e)*i*t,a.getY(e)*i*t*.98,r*n)}let o=[Rd(i,Kd)];for(let e=-2;e<=2;e++){let t=.44-Math.abs(e)*.03,r=new $i(1,16,10).scale(.12,.03,t).translate(0,0,-t*.85);r.rotateY(e*.19).rotateX(-.22).translate(e*.025,.08-Math.abs(e)*.012,-n*.62),o.push(Rd(r,Kd))}return zd(o)}function lf(e){let t=rf*(.92+.16*e),n=Wd({widthSegs:48,heightSegs:36,tufts:60,amp:.13,sweep:.12,width:1.2,seed:9,comb:(e,t)=>t.set(0,-1,-.3).addScaledVector(e,-e.dot(t)).normalize(),mask:e=>H.smoothstep(-e.y,.05,.45)*H.smoothstep(e.z,-.4,.2)}).scale(t,t*.97,t*1.02),r=Bd([[.125,0],[.12,.08],[.1,.2],[.07,.32],[.035,.42],[0,.47]],20).rotateX(Math.PI/2),i=r.getAttribute(`position`);for(let e=0;e<i.count;e++){let t=i.getZ(e),n=t/.47;i.setXYZ(e,i.getX(e)*.78,i.getY(e)*(1+.15*(1-n))-.09*n*n*n,t)}return r.computeVertexNormals(),r.translate(0,-.03,t*.72),zd([Rd(n,Kd,1),Rd(r,qd)])}function uf(e){let t=[],n=(e,n,r,i,a,o=0)=>t.push(Rd(new $i(1,20,10).scale(r,i,a).rotateY(o).translate(e,0,n),Kd));if(e){n(.26,-.16,.32,.045,.26);for(let e=0;e<5;e++){let t=-.12+e*.2,r=.56-Math.abs(e-1.2)*.05;n(.42+Math.cos(t)*r*.5,-.04-e*.075-Math.sin(t)*r*.5,r*.5,.025,.065,t)}}else{n(.4,-.2,.46,.05,.3);for(let e=0;e<4;e++)n(.12+e*.2,-.42,.13,.03,.2,.1)}return zd(t)}function df(){let e=[];e.push(Rd(new bi(.035,.03,.46,8).translate(0,-.23,0),Jd)),e.push(Rd(new $i(1,14,10).scale(.09,.14,.1).translate(0,-.06,0),Kd));let t=(t,n)=>e.push(Rd(new yi(.022,n,3,6).rotateX(Math.PI/2).translate(0,0,n/2).rotateY(t).translate(0,-.46,0),Jd));return t(0,.16),t(.45,.13),t(-.45,.13),t(Math.PI,.09),zd(e)}function ff(e,t,n=.016){return Rd(new ta(new Mi(e.map(e=>new W(...e)),t),t?40:48,n,6,t),Xd)}function pf(e,t,n){return[Math.sin(t)*Math.cos(n)*e,Math.sin(n)*e,Math.cos(t)*Math.cos(n)*e]}function mf(e){let t=rf*(.92+.16*e)*1.04,n=t*.72/1.04+.07,r=[];for(let e=0;e<12;e++){let t=e/12*Math.PI*2;r.push([Math.cos(t)*.108,-.03+Math.sin(t)*.152,n])}let i=[[.108,-.06,n],pf(t,.9,-.38),pf(t,1.75,-.1),pf(t,1.95,.45),[0,t*.9,-t*.42],pf(t,-1.95,.45),pf(t,-1.75,-.1),pf(t,-.9,-.38),[-.108,-.06,n]],a=[[.13,-.06,n],[.3,-.12,.1],[.33,-.08,-.14],[.22,0,-.36],[0,.03,-.46],[-.22,0,-.36],[-.33,-.08,-.14],[-.3,-.12,.1],[-.13,-.06,n]],o=e=>Rd(new ea(.035,.012,6,14).rotateY(Math.PI/2).translate(e,-.06,n),Zd);return zd([ff(r,!0,.02),ff(i,!1),ff(a,!1,.018),o(.115),o(-.115)])}function hf(){return Rd(new ea(.26,.035,6,32).rotateX(Math.PI/2-.5),Yd)}var gf=new W,_f=new W,vf=new Ot,yf=new Ot,bf=new Ot,xf=new cn,Sf=new W(1,0,0),Cf=new W(0,1,0),wf=new W(0,0,1),Tf=new K(1,1,1),Ef=new W,Df=new Ot,Of=class{name=`crow`;radius=.62*Gd;centreY=ef*Gd;flockSize=[3,8];mount={name:`crow`,radius:.55*Gd,walk:{speed:8,sprint:14,takeoff:8},fly:{speed:28,sprint:44,climb:10,sink:1.8,hover:0,turn:2.6}};bodyB;headB;wingB;handB;legB;saddleB;collarB;batches;plump=sf.plump;constructor(){this.bodyB=new Hd(cf(this.plump),{keep:.45},$d),this.headB=new Hd(lf(this.plump),{keep:.45,eyePos:[.5,.2],eyeSize:[.27,.3],pupil:[.085,.11],lookRange:[.16,.12],eyeTilt:.12},$d);let e=uf(!1),t=uf(!0);this.wingB=[new Hd(e,{keep:.45},$d),new Hd(Vd(e),{keep:.45},$d)],this.handB=[new Hd(t,{keep:.45},$d),new Hd(Vd(t),{keep:.45},$d)],this.legB=new Hd(df(),{keep:.45},128),this.saddleB=new Hd(mf(this.plump),{keep:.7},16),this.collarB=new Hd(hf(),{keep:.6},16),this.batches=[this.bodyB,this.headB,...this.wingB,...this.handB,this.legB,this.saddleB,this.collarB]}setPlump(e){this.plump=e,this.bodyB.setGeometry(cf(e)),this.headB.setGeometry(lf(e)),this.saddleB.setGeometry(mf(e))}groundScore(e,t,n){let r=e.height(t,n);if(r<1.2||r>150)return 1/0;let i=Math.abs(e.height(t+2,n)-r)+Math.abs(e.height(t,n+2)-r);return i>1.4?1/0:e.forestDensity(t,n,r)*6+i*.3+r/200}findSpot(e,t,n,r,i,a=35,o=95){let s=1/0,c=n?Math.atan2(t.x-n.x,t.z-n.z):r()*Math.PI*2;for(let l=0;l<16;l++){let l=c+(r()-.5)*(n?1.8:Math.PI*2),u=a+r()*(o-a),d=t.x+Math.sin(l)*u,f=t.z+Math.cos(l)*u,p=this.groundScore(e,d,f)+r()*.3;p<s&&(s=p,i.set(d,e.height(d,f),f))}return s<2}launch(e,t,n,r){let i=t.player.pos,a=e.data;if(a.alarm=!1,a.landAt=0,a.spot=new W,r&&!a.pass&&n()<.6)return this.findSpot(t.gen,i,null,n,a.spot,90,380)?(a.mode=`ground`,a.relocate=20+n()*100,e.centre.copy(a.spot),e.target.copy(a.spot),!0):!1;let o=!1;for(let r=0;r<16&&!o;r++){let r=n()*Math.PI*2,a=220+n()*100,s=i.x+Math.sin(r)*a,c=i.z+Math.cos(r)*a;(!t.hidden||t.hidden(s,t.surface(s,c)+25,c,15))&&(e.centre.set(s,0,c),o=!0)}if(!o)return!1;let s=!!a.pass;a.passing=s;let c;if(s){let r=Math.atan2(i.x-e.centre.x,i.z-e.centre.z)+(n()-.5)*.4,a=260+n()*140;gf.set(i.x+Math.sin(r)*a,0,i.z+Math.cos(r)*a),c=this.findSpot(t.gen,gf,null,n,e.target,0,70)}else c=this.findSpot(t.gen,i,null,n,e.target,60,300);return c?(a.mode=`fly`,a.flyT=0,a.cruise=18+n()*14,!0):!1}depart(e,t,n){let r=e.data,i=r.rnd;(n?this.findSpot(t.gen,r.spot,t.player.pos,i,e.target,80,250):this.findSpot(t.gen,r.spot,null,i,e.target,150,450))||e.target.copy(r.spot).add(gf.set(i()*400-200,0,i()*400-200)),r.mode=`fly`,r.flyT=0,r.landAt=0,r.cruise=Math.hypot(e.target.x-r.spot.x,e.target.z-r.spot.z)>140?16+i()*14:6+i()*6,e.centre.copy(r.spot);for(let t of e.members){let e=t.data;e.delay=n?i()*.35:i()*1.2,e.landing=!1,e.alt=r.cruise+(i()-.5)*5}}initMob(e,t,n,r){let i=e.rnd,a=()=>new Tn,o={root:a(),body:a(),neck:a(),head:a(),wing:[a(),a()],hand:[a(),a()],legs:[a(),a()],saddle:a(),collar:a(),seat:a(),goal:null,idle:i()*2,delay:0,slotA:t/Math.max(1,n.members.length)*Math.PI*2,slotR:4+i()*6,alt:7+i()*7,landing:!1,land:new U,act:`look`,pecks:0,walk:!1,face:null,t:i()*10,hop:1,hopH:0,stride:0,flap:i()*6,open:new Ud(0),flapAmp:new Ud(0),pitch:new Ud(-.35),bank:new Ud,turn:0,prevHeading:0,prevVel:new W,headYaw:0,headYawT:0,headPitch:0,nextGlance:i()*2,peck:9,squash:new Ud,blinkAt:i()*4,look:new U,lookAt:null,eye:new Kt(0,0,1,0),wasGrounded:!0};o.root.scale.setScalar(Gd),o.root.add(o.body),o.body.position.y=ef,o.body.add(o.neck),o.neck.position.copy(tf),o.neck.add(o.head,o.collar),o.head.add(o.saddle),o.head.position.copy(nf),o.collar.position.set(0,.02,.02);for(let e=0;e<2;e++){let t=e?-1:1;o.wing[e].position.set(t*af.x,af.y,af.z),o.body.add(o.wing[e]),o.hand[e].position.set(t*.8,0,0),o.wing[e].add(o.hand[e]),o.legs[e].position.set(t*of.x,of.y,of.z),o.body.add(o.legs[e])}o.seat.position.set(0,.5,-.14),o.body.add(o.seat),e.data=o;let s=i()*Math.PI*2,c=i()*5;if(n.data.mode===`fly`){o.alt=(n.data.cruise??20)+(i()-.5)*5;let t=n.centre.x+Math.cos(o.slotA)*o.slotR,a=n.centre.z+Math.sin(o.slotA)*o.slotR;e.pos.set(t,r.surface(t,a)+o.alt,a),e.grounded=!1,o.wasGrounded=!1,o.open.x=1,e.heading=Math.atan2(n.target.x-t,n.target.z-a),e.vel.set(Math.sin(e.heading)*10,0,Math.cos(e.heading)*10)}else{let t=n.centre.x+Math.cos(s)*c,a=n.centre.z+Math.sin(s)*c;e.pos.set(t,r.surface(t,a),a),e.grounded=!0,e.heading=i()*Math.PI*2}e.tint.copy(Qd[Math.floor(i()*Qd.length)])}thinkFlock(e,t){let n=e.data,r=e.members;for(let e=0;e<r.length;e++)for(let n=e+1;n<r.length;n++){let i=r[e],a=r[n],o=i.grounded&&a.grounded?1.6*Gd:3.2*Gd;gf.subVectors(i.pos,a.pos),i.grounded&&a.grounded&&(gf.y=0);let s=gf.length();if(s>=o)continue;s<.001&&gf.set(1,0,0);let c=Math.min(o-s,3*t.dt)*.5;gf.setLength(c),i.pos.add(gf),a.pos.sub(gf)}let i=n.rnd,{player:a,dt:o}=t;if(n.mode===`ground`){n.spot??=e.centre.clone();let r=1/0;for(let t of e.members)r=Math.min(r,Math.hypot(t.pos.x-a.pos.x,t.pos.z-a.pos.z));let i=Math.hypot(a.vel.x,a.vel.z)>7.5||a.mode===`ride`;if(n.relocate-=o,n.alarm||r<(i?15:9)||n.relocate<0){let i=n.alarm||r<15;n.alarm=!1,this.depart(e,t,i)}}else{n.flyT+=o,n.alarm=!1,gf.subVectors(e.target,e.centre).setY(0);let t=gf.length();if(t>1&&e.centre.addScaledVector(gf.normalize(),Math.min(t,11*o)),t<4&&n.flyT>4&&(n.landAt||=n.flyT+1.5+i()*2,n.flyT>n.landAt)){for(let t of e.members){let n=t.data;if(!n.landing){let t=i()*Math.PI*2,r=1+Math.sqrt(i())*6;n.land.set(e.target.x+Math.cos(t)*r,e.target.z+Math.sin(t)*r)}n.landing=!0}e.members.every(e=>e.grounded)&&(n.mode=`ground`,n.spot.copy(e.target),n.relocate=30+i()*90,n.landAt=0)}}}think(e,t,n){let r=e.data;if(e.ridden)return;let{dt:i,player:a}=t;r.lookAt=null,r.walk=!1;let o=r.face;r.face=null;let s=Math.hypot(a.pos.x-e.pos.x,a.pos.z-e.pos.z),c=e.flock,l=!e.grounded,u=gf,d=3;if(e.state===`caught`)_f.subVectors(e.pos,a.pos).setY(0).normalize(),u.copy(e.pos).addScaledVector(_f,4).add(_f.set(Math.sin(e.stateT*5)*2,0,Math.cos(e.stateT*4)*2)),u.y=t.surface(u.x,u.z)+1.5+Math.sin(e.stateT*9)*.8,l=!0,d=6,r.lookAt=a.pos;else if(e.state===`wild`&&c){let n=c.data;if(n.mode===`fly`&&!r.landing){if(r.delay-=i,r.delay>0&&e.grounded)r.lookAt=a.pos,u.copy(e.pos),l=!1;else{r.slotA+=i*.7,u.set(c.centre.x+Math.cos(r.slotA)*r.slotR,0,c.centre.z+Math.sin(r.slotA)*r.slotR);let e=t.surface(u.x,u.z),n=Math.hypot(c.target.x-c.centre.x,c.target.z-c.centre.z);u.y=e+H.lerp(Math.min(r.alt,10),r.alt,H.smoothstep(n,20,90))+12*H.smoothstep(t.gen.forestDensity(u.x,u.z,e),.05,.4),l=!0,d=15}}else n.mode===`fly`&&r.landing?(u.set(r.land.x,0,r.land.y),u.y=Math.min(t.surface(u.x,u.z),t.surface(e.pos.x,e.pos.z))-.5,l=!1,d=7,e.grounded&&(r.goal=null,r.act=`look`,r.idle=e.rnd()*1.5)):(r.face=o,this.forage(e,n.spot,a.pos,i),u.copy(r.goal??e.pos),e.grounded||(u.y=t.surface(u.x,u.z)-.5),l=!1,d=r.act===`hop`?2.4:1.1,r.act===`look`&&s<14&&(r.lookAt=a.pos))}else if(e.leashed){let i=3.2+n*1.4,o=(n%2?-1:1)*Math.ceil(n/2)*1.8,c=Math.sin(a.heading),f=Math.cos(a.heading);u.set(a.pos.x-c*i+f*o,0,a.pos.z-f*i-c*o);let p=t.surface(u.x,u.z),m=a.pos.y-t.surface(a.pos.x,a.pos.z)>2.5,h=t.gen.height(u.x,u.z)<.3;l=m||h||s>11||!e.grounded&&s>5,u.y=l?Math.max(p+1,a.pos.y+.5):p,d=l?18:12,s<14&&(r.lookAt=a.pos)}else u.copy(e.stay),u.y=t.surface(u.x,u.z),l=!e.grounded&&e.pos.y-u.y>.5,d=2,s<14&&(r.lookAt=a.pos);this.move(e,t,u,l,d)}forage(e,t,n,r){let i=e.data,a=e.rnd;if(i.idle-=r,i.act===`peck`&&i.pecks>0&&i.peck>.3+a()*.4&&(i.pecks--,i.pecks>0&&(i.peck=0)),i.goal&&Math.hypot(i.goal.x-e.pos.x,i.goal.z-e.pos.z)<.45&&(i.goal=null,(i.act===`walk`||i.act===`hop`)&&(i.idle=Math.min(i.idle,0))),i.idle<0){let r=a();if(r<.42){i.act=`walk`;let r=e.heading+(a()-.5)*2.4,o=e.pos.x-t.x,s=e.pos.z-t.z;Math.hypot(o,s)>7&&(r=Math.atan2(-o,-s)+(a()-.5)*1.2);let c=n.x-e.pos.x,l=n.z-e.pos.z,u=Math.hypot(c,l);u<18&&(Math.sin(r)*c+Math.cos(r)*l)/u>.2&&(r=Math.atan2(-c,-l)+(a()-.5)*2);let d=.8+a()*2.8;i.goal=new W(e.pos.x+Math.sin(r)*d,0,e.pos.z+Math.cos(r)*d),i.idle=6}else if(r<.75)i.act=`peck`,i.goal=null,i.pecks=1+Math.floor(a()*4),i.peck=0,i.idle=.6+i.pecks*.55+a()*.8;else if(r<.9)i.act=`look`,i.goal=null,i.idle=.8+a()*2.2,a()<.6&&(i.face=e.heading+(a()-.5)*3);else{i.act=`hop`;let t=e.heading+(a()-.5)*3,n=1.2+a()*2;i.goal=new W(e.pos.x+Math.sin(t)*n,0,e.pos.z+Math.cos(t)*n),i.idle=4}}i.act!==`look`&&(i.face=null),i.walk=i.act===`walk`}move(e,t,n,r,i){let a=e.data,{dt:o}=t,s=t.gen.height(e.pos.x,e.pos.z)<0;if(e.grounded&&(r||s)&&(e.grounded=!1,e.vel.y=5.5,a.squash.v+=2,t.puff(e.pos,3,.1,1.2)),e.grounded){_f.subVectors(n,e.pos).setY(0);let r=_f.length();if(r<.4)e.vel.x*=Math.exp(-10*o),e.vel.z*=Math.exp(-10*o);else{let t=Math.min(i,r*1.5);_f.multiplyScalar(t/r),e.vel.x+=(_f.x-e.vel.x)*(1-Math.exp(-6*o)),e.vel.z+=(_f.z-e.vel.z)*(1-Math.exp(-6*o))}e.vel.y=0,e.pos.addScaledVector(e.vel,o),e.pos.y=t.surface(e.pos.x,e.pos.z)}else{_f.subVectors(n,e.pos);let s=_f.length()>.001?_f.multiplyScalar(Math.min(i,_f.length()*1.2)/_f.length()):_f;e.vel.lerp(s,1-Math.exp(-2.2*o)),e.pos.addScaledVector(e.vel,o);let c=t.surface(e.pos.x,e.pos.z),l=t.gen.height(e.pos.x,e.pos.z)>.3;e.pos.y<=c+.05&&e.vel.y<=.3&&l&&!r?(e.pos.y=c,e.grounded=!0,e.vel.y=0,a.squash.v-=2.5,t.puff(e.pos,4,.1,1.5)):e.pos.y<c+(l?0:.4)&&(e.pos.y=c+(l?0:.4),e.vel.y=Math.max(0,e.vel.y))}let c=Math.hypot(e.vel.x,e.vel.z),l=e.heading;c>.4?l=Math.atan2(e.vel.x,e.vel.z):a.lookAt?l=Math.atan2(a.lookAt.x-e.pos.x,a.lookAt.z-e.pos.z):a.face!==null&&(l=a.face);let u=l-e.heading;u=Math.atan2(Math.sin(u),Math.cos(u)),e.heading+=u*(1-Math.exp(-(e.grounded?9:3)*o))}animate(e,t){let n=e.data,r=Math.max(t.dt,1e-4);n.t+=r;let i=n.t,a=e=>1-Math.exp(-e*r),o=Math.hypot(e.vel.x,e.vel.z),s=!e.grounded,c=e.heading-n.prevHeading;c=Math.atan2(Math.sin(c),Math.cos(c)),n.prevHeading=e.heading,n.turn+=(c/r-n.turn)*a(6);let l=e.vel.y;gf.subVectors(e.vel,n.prevVel).divideScalar(r),n.prevVel.copy(e.vel),e.grounded!==n.wasGrounded&&(n.wasGrounded=e.grounded,n.hop=1);let u=!s&&(e.ridden||e.leashed&&o>4||n.walk),d=0,f=0,p=[0,0],m=[0,0],h=0,g=0,_=H.clamp((o-6)/6,0,1);if(u){let e=(1.3+.12*o)*Gd;n.stride+=o*r/e*Math.PI*2,o<.3&&(n.stride+=(Math.round(n.stride/Math.PI)*Math.PI-n.stride)*a(6));let t=H.clamp(o/2,0,1)*(.42+.3*_);for(let e=0;e<2;e++){let r=n.stride+e*Math.PI;p[e]=Math.sin(r)*t,m[e]=Math.max(0,-Math.cos(r))*t}let i=H.clamp(o/2,0,1);d=Math.abs(Math.sin(n.stride))*(.03+.05*_)*i,h=Math.sin(n.stride)*.08*i*(1-.5*_),g=Math.sin(n.stride*2)*.035*i,n.hop=1}else if(!s&&(o>.25||n.hop<1)){let e=2.6+o*.35;n.hop+=r*e,n.hop>=1&&(n.hop=o>.25?n.hop%1:1);let t=Math.min(.5,.12+o*.045);d=Math.sin(Math.PI*Math.min(1,n.hop))*t,f=Math.max(0,1-Math.min(1,n.hop)*5)+Math.max(0,Math.min(1,n.hop)*5-4)}n.root.position.set(e.pos.x,e.pos.y+d*Gd,e.pos.z),n.root.rotation.set(0,e.heading,0);let v=n.open.step(+!!s,s?160:60,s?18:12,r),y=s?H.clamp(.35+l*.18+(e.state===`caught`?.6:0)-Math.max(0,o-12)*.03,0,1):0,b=s&&l<-.6&&o>5&&e.state!==`caught`,x=n.flapAmp.step(b?.05:.45+y*.55,20,8,r);n.flap+=r*(5.5+y*7);let S=Math.sin(n.flap),C=Math.sin(n.flap-.9),w=!s&&n.peck<.32?Math.sin(Math.min(1,n.peck/.32)*Math.PI):0,T=n.pitch.step(s?H.clamp(-l*.05+o*.008,-.35,.25):-.38+(o>.3?.12:0)+(u?.14*_:0)+w*.22,60,12,r),E=n.bank.step(s?H.clamp(-n.turn*o*.06,-.7,.7):H.clamp(-n.turn*o*.02,-.2,.2),40,9,r)+h;n.body.rotation.set(T,0,E);let D=n.squash.step(0,160,12,r),O=1+H.clamp(D,-.25,.25)+(s?S*.03*x:0);n.body.scale.set(1/Math.sqrt(O),O,1/Math.sqrt(O)),n.body.position.y=ef-f*.08;for(let e=0;e<2;e++){let t=e?-1:1;vf.setFromAxisAngle(wf,t*(S*x*.95*v+.12*!!b)),yf.setFromAxisAngle(Cf,t*(.15+.1*S*x)),vf.multiply(yf),yf.setFromAxisAngle(Sf,.42),yf.multiply(bf.setFromAxisAngle(Cf,t*1.66)),yf.multiply(bf.setFromAxisAngle(Sf,-1.35)),yf.multiply(bf.setFromAxisAngle(wf,t*-.12)),n.wing[e].quaternion.slerpQuaternions(yf,vf,v);let r=.4+.14*this.plump;n.wing[e].position.set(t*H.lerp(r,af.x,v),H.lerp(.16,af.y,v),H.lerp(.26,af.z,v)),n.wing[e].scale.set(H.lerp(.62,1,v),1,1),xf.set(0,0,t*(C*x*.6-S*x*.25)*v),n.hand[e].rotation.copy(xf),n.hand[e].position.x=t*H.lerp(.5,.8,v),n.hand[e].scale.set(H.lerp(.82,1,v)/H.lerp(.62,1,v),1,H.lerp(.5,1,v))}for(let t=0;t<2;t++){let r=Math.min(1,v*1.3);n.legs[t].rotation.set(-T+r*1.25+p[t]+(s&&e.state===`caught`?Math.sin(i*14+t)*.3:0),0,-E*.8),n.legs[t].scale.set(1,1-f*.2-m[t]*.35,1)}i>n.nextGlance&&(n.headYawT=(e.rnd()-.5)*1.6,n.nextGlance=i+.4+e.rnd()*1.6);let k=n.headYawT*(s?.3:1),A=0;if(n.lookAt){gf.subVectors(n.lookAt,e.pos);let t=Math.sin(e.heading),r=Math.cos(e.heading),i=gf.x*t+gf.z*r,a=gf.x*r-gf.z*t;k=H.clamp(Math.atan2(a,i),-1.3,1.3),A=H.clamp(-Math.atan2(gf.y+1.2-ef*Gd,Math.hypot(a,i))*.6,-.5,.5)}n.headYaw+=(k-n.headYaw)*a(18),n.peck+=r,n.headPitch+=(A-n.headPitch)*a(12),n.neck.rotation.set(-T+n.headPitch+w*1.25-(s?.25:0),n.headYaw*.8,-E*.6),n.neck.position.set(0,tf.y-w*.08,tf.z+w*.05+(s?.08:0)+g),i>n.blinkAt+.1&&(n.blinkAt=i+1.5+e.rnd()*4);let j=e.happy>0?-1:i>n.blinkAt?.05:1,M=n.lookAt?H.clamp((k-n.headYaw*.8)*1.5,-1,1):0;n.look.x+=(M-n.look.x)*a(12),n.look.y+=((n.lookAt?A-n.headPitch:0)-n.look.y)*a(12),n.eye.set(n.look.x,-n.look.y,j,0),n.saddle.visible=e.state===`tamed`,n.root.updateMatrixWorld(!0)}emit(e,t){let n=e.data;this.bodyB.push(n.body.matrixWorld,e.tint),this.headB.push(n.head.matrixWorld,e.tint,n.eye);for(let t=0;t<2;t++)this.wingB[t].push(n.wing[t].matrixWorld,e.tint),this.handB[t].push(n.hand[t].matrixWorld,e.tint),this.legB.push(n.legs[t].matrixWorld,e.tint);n.saddle.visible&&this.saddleB.push(n.saddle.matrixWorld,Tf),(e.state===`caught`||e.leashed)&&this.collarB.push(n.collar.matrixWorld,Tf)}attach(e,t,n){return e.data.collar.getWorldPosition(n),gf.subVectors(t,n).setY(0),gf.lengthSq()<1e-4&&gf.set(0,0,1),n.addScaledVector(gf.normalize(),.26*Gd)}seat(e){let t=e.data;return t.seat.getWorldPosition(Ef),t.seat.getWorldQuaternion(Df),{pos:Ef,quat:Df,spread:.5}}reset(e){let t=e.data;t.goal=null,t.landing=!0,e.stay.copy(e.pos)}},kf=.5*(Math.sqrt(3)-1),Af=(3-Math.sqrt(3))/6,jf=new Float32Array([1,-1,1,-1,1.41,-1.41,0,0]),Mf=new Float32Array([1,1,-1,-1,0,0,1.41,-1.41]),Nf=class{perm=new Uint8Array(512);constructor(e){let t=Ol(e),n=new Uint8Array(256);for(let e=0;e<256;e++)n[e]=e;for(let e=255;e>0;e--){let r=Math.floor(t()*(e+1)),i=n[e];n[e]=n[r],n[r]=i}for(let e=0;e<512;e++)this.perm[e]=n[e&255]}noise(e,t){let n=this.perm,r=(e+t)*kf,i=Math.floor(e+r),a=Math.floor(t+r),o=(i+a)*Af,s=e-(i-o),c=t-(a-o),l=+(s>c),u=1-l,d=s-l+Af,f=c-u+Af,p=s-1+2*Af,m=c-1+2*Af,h=i&255,g=a&255,_=0,v=.5-s*s-c*c;if(v>0){let e=n[h+n[g]]&7;v*=v,_+=v*v*(jf[e]*s+Mf[e]*c)}let y=.5-d*d-f*f;if(y>0){let e=n[h+l+n[g+u]]&7;y*=y,_+=y*y*(jf[e]*d+Mf[e]*f)}let b=.5-p*p-m*m;if(b>0){let e=n[h+1+n[g+1]]&7;b*=b,_+=b*b*(jf[e]*p+Mf[e]*m)}return 70*_}fbm(e,t,n,r=.5){let i=1,a=1,o=0,s=0;for(let c=0;c<n;c++){let n=e*.8-t*.6,l=e*.6+t*.8;o+=i*this.noise(n*a+c*17.13,l*a-c*9.71),s+=i,i*=r,a*=2.03,e=n,t=l}return o/s}};function Pf(e,t,n){let r=Math.cos(e.rot),i=Math.sin(e.rot);return{x:e.x+r*t+i*n,z:e.z-i*t+r*n}}function Ff(e,t,n){let r=Math.cos(e.rot),i=Math.sin(e.rot),a=t-e.x,o=n-e.z;return{x:r*a-i*o,z:i*a+r*o}}function If(e,t,n,r){let i=e.base(t,n),a=0;for(let o=0;o<8;o++){let s=o/8*Math.PI*2;a=Math.max(a,Math.abs(e.base(t+Math.cos(s)*r,n+Math.sin(s)*r)-i))}return a}function Lf(e,t,n,r=12){return[(e.base(t+r,n)-e.base(t-r,n))/(2*r),(e.base(t,n+r)-e.base(t,n-r))/(2*r)]}function Rf(e,t,n,r,i){let a=(a,o)=>{let s=[],c=t,l=n,[u,d]=r;a<0&&(u=-u,d=-d);let f=i()*6.28;for(let t=0;t<o;t++){let[n,r]=Lf(e,c,l),i=Math.hypot(n,r);if(i>.004){let e=-n/i*a,t=-r/i*a,o=jl(i*8,.15,.55);u=Ml(u,e,o),d=Ml(d,t,o)}let o=Math.sin(t*.55+f)*.32,p=Math.hypot(u,d)||1;u/=p,d/=p;let m=u-d*o,h=d+u*o,g=Math.hypot(m,h);if(c+=m/g*4,l+=h/g*4,s.push({x:c,z:l}),a>0&&e.base(c,l)<.6)break}return s},o=a(1,38),s=[...a(-1,16).reverse(),{x:t,z:n},...o],c=[],l=1/0,u=0;for(let t of s){let n=e.base(t.x,t.z);l=Math.min(l-.035,n-.85),u=Math.max(u,n-l),c.push({x:t.x,z:t.z,bed:l})}return u>4.2?null:c}function zf(e,t){let n=null,r=(r,i,a)=>{let o=t.base(r,i);if(o<7||o>95||If(t,r,i,10)>(a?1.6:3)||t.forest(r,i,o)>(a?.2:.5))return null;for(let e=0;e<8;e++){let n=e/8*Math.PI*2;if(t.base(r+Math.cos(n)*35,i+Math.sin(n)*35)<3)return null}let s=Ol((e^Math.imul(Math.round(r)+7,73856093)^Math.imul(Math.round(i)+3,19349663))>>>0),[c,l]=Lf(t,r,i,30),u=Math.hypot(c,l)||1,d=-c/u,f=-l/u;for(let c of[1,-1]){let l=-f*c,u=d*c,p=Math.atan2(-u,l)+(s()-.5)*.3,m={x:r,z:i,rot:p},h=(e,t)=>Pf(m,e,t),g=o+.05,_=h(-6.6/2-24,5),v=[];for(let e=0;e<80&&v.length<7;e++){let e=s()*Math.PI*2,n=v.length===0?0:2.5+s()*6.5,a=_.x+Math.cos(e)*n,o=_.z+Math.sin(e)*n;v.some(e=>Math.hypot(e.x-a,e.z-o)<3.8)||t.base(a,o)<3||If(t,a,o,2.5)>1.4||Math.hypot(a-r,o-i)<15||v.push({x:a,z:o,sc:.78+s()*.3,rot:s()*6.283,lean:s()-.5,tone:s()})}if(v.length<6)continue;v.sort((e,t)=>Math.hypot(e.x-r,e.z-i)-Math.hypot(t.x-r,t.z-i));let y=v[0],b=Math.hypot(r-y.x,i-y.z),x={x:y.x+(r-y.x)/b*1.5,z:y.z+(i-y.z)/b*1.5},S=h(36.3,1),C=Rf(t,S.x,S.z,[d,f],s);if(!C)continue;let w=!0;for(let e of C){Math.hypot(e.x-r,e.z-i)<19&&(w=!1);for(let t of v)Math.hypot(e.x-t.x,e.z-t.z)<7&&(w=!1)}if(!w&&a)continue;let T=0,E=1/0;for(let e=0;e<C.length;e++){let t=Math.hypot(C[e].x-S.x,C[e].z-S.z);t<E&&(E=t,T=e)}let D=Math.max(0,Math.min(C.length-2,T)),O=C[D+1].x-C[D].x,k=C[D+1].z-C[D].z,A=Math.hypot(O,k)||1;O/=A,k/=A;let j=-k,M=O;j*(r-C[D].x)+M*(i-C[D].z)<0&&(j=-j,M=-M);let N=C[D],P={x:N.x+j*4.4,z:N.z+M*4.4},ee=[];for(let e=0;e<7;e++){let t=(e-3)*1.9+(s()-.5)*.8,n=2.35+s()*.7;ee.push({x:N.x+O*t+j*n,z:N.z+k*t+M*n,rot:s()*6.283,sc:.85+s()*.3})}let F=C[0],te={x:F.x-(C[1].x-F.x)*.6,z:F.z-(C[1].z-F.z)*.6},ne=h(1.4,15),re=h(-1.5,0),ie={x:ne.x,z:ne.z,yaw:Math.atan2(ne.x-re.x,ne.z-re.z)},ae=h(-6.6/2-2.4,5.1),oe=h(-.9,3.7),se=h(-.6,11.5),I=[{ax:oe.x,az:oe.z,bx:se.x,bz:se.z},{ax:h(4.8,.5).x,az:h(4.8,.5).z,bx:P.x,bz:P.z}],ce=Bf(e,t,r,i,g,p),le=r-30,ue=i-30,de=r+30,fe=i+30;for(let e of[...C,...v,te])le=Math.min(le,e.x-12),ue=Math.min(ue,e.z-12),de=Math.max(de,e.x+12),fe=Math.max(fe,e.z+12);let pe={x:r,z:i,y:g,rot:p,spawn:ie,stump:ae,trees:v,seat:x,brook:C,bank:P,stones:ee,spring:te,far:ce,paths:I,box:[le,ue,de,fe]};if(w)return pe;n??=pe}return null};for(let t of[!0,!1]){for(let n=0;n<4200;n+=29){let i=Math.max(1,Math.floor(n*Math.PI*2/45)),a=Y(n,0,e,901)*6.28;for(let e=0;e<i;e++){let o=a+e/i*Math.PI*2,s=r(Math.cos(o)*n,Math.sin(o)*n,t);if(s)return s}}if(n)return n}let i=Math.max(t.base(0,0),4)+.05;return{x:0,z:0,y:i,rot:0,spawn:{x:1.4,z:15,yaw:0},stump:{x:-5.7,z:5.1},trees:[],seat:{x:-20,z:0},brook:[],bank:{x:36,z:0},stones:[],spring:{x:36,z:-40},far:Bf(e,t,0,0,i,0),paths:[],box:[-40,-40,40,40]}}function Bf(e,t,n,r,i,a){let o={x:n+900,z:r,y:t.base(n+900,r)+.05,rot:0},s=-1/0,c=i+3.5,l=Math.sin(a),u=Math.cos(a);for(let a=0;a<24;a++)for(let d=0;d<6;d++){let f=a/24*Math.PI*2+Y(a,d,e,931)*.2,p=600+d*160,m=n+Math.cos(f)*p,h=r+Math.sin(f)*p,g=t.base(m,h);if(g<6||g>170||If(t,m,h,8)>2.5||t.forest(m,h,g)>.4)continue;let _=1/0,v=g+3;for(let e=.03;e<.97;e+=.02){let i=Ml(n,m,e),a=Ml(r,h,e),o=Ml(c,v,e),s=t.base(i,a);_=Math.min(_,o-s-10*t.forest(i,a,s)*Nl(.85,.97,e))}let y=(Math.cos(f)*l+Math.sin(f)*u)*.5+.5,b=Math.min(_,12)*3+y*14-Math.abs(p-950)*.01+(g>i?4:0);b>s&&(s=b,o={x:m,z:h,y:g+.05,rot:Math.atan2(n-m,r-h)+(Y(a,d,e,932)-.5)*.6})}return o}function Vf(e,t,n,r){r.d=1/0,r.bed=0;for(let i=0;i+1<e.length;i++){let a=e[i],o=e[i+1],s=o.x-a.x,c=o.z-a.z,l=t-a.x,u=n-a.z,d=s*s+c*c,f=d>0?jl((l*s+u*c)/d,0,1):0,p=l-s*f,m=u-c*f,h=Math.sqrt(p*p+m*m);h<r.d&&(r.d=h,r.bed=Ml(a.bed,o.bed,f),r.t=f,r.i=i)}return r}var Hf=2300,Uf=420,Wf=class{seed;nWarp;nCont;nHills;nHigh;nMound;nValley;nMask;nForest;nForest2;nRock;nMisc;peakCache=new Map;poiCache=new Map;pathCache=new Map;_story=null;bq={d:0,bed:0,t:0,i:0};constructor(e){this.seed=e>>>0;let t=Ol(this.seed),n=()=>Math.floor(t()*4294967295);this.nWarp=new Nf(n()),this.nCont=new Nf(n()),this.nHills=new Nf(n()),this.nHigh=new Nf(n()),this.nMound=new Nf(n()),this.nValley=new Nf(n()),this.nMask=new Nf(n()),this.nForest=new Nf(n()),this.nForest2=new Nf(n()),this.nRock=new Nf(n()),this.nMisc=new Nf(n())}get story(){return this._story??=zf(this.seed,{base:(e,t)=>this.baseHeight(e,t),forest:(e,t,n)=>this.forestDensity(e,t,n)})}landAt(e,t){return Nl(-.2,.1,this.nCont.fbm(e/5600+3.1,t/5600-1.7,4)+.08)}baseHeight(e,t){let n=this.nWarp,r=e+220*n.fbm(e/1500,t/1500,3),i=t+220*n.fbm(e/1500+41.3,t/1500-17.9,3),a=this.landAt(r,i),o=Ml(-34,5,a),s=this.nHills.fbm(r/560,i/560,4);o+=s*30*(.3+.7*a);let c=Nl(-.02,.4,this.nHigh.fbm(r/3200+11,i/3200-7,3))*a,l=this.nMound.fbm(r/1250,i/1250,4)*.5+.55;o+=c*l*l*230,o+=this.nHills.fbm(r/120+5,i/120+9,2)*2.2,o+=this.peaks(r,i)*(.35+.65*a);let u=r+300*n.noise(i/2600,r/2600),d=i+300*n.noise(r/2600+9,i/2600+3),f=Math.abs(this.nValley.fbm(u/2600,d/2600,3)),p=Nl(-.12,.2,this.nMask.fbm(e/5200-7,t/5200+2,2)),m=.035+.035*p,h=Math.min(1,f/(m*3)),g=(1-h*h)*(1-h*h)*p;if(g>0){let e=-8-22*c;o=Ml(o,Math.min(o,e),g)}return o}peakInCell(e,t){let n=e*73856093+t*19349663,r=this.peakCache.get(n);if(r!==void 0)return r;let i=null;return Y(e,t,this.seed,11)<.55&&(i={x:(e+.2+.6*Y(e,t,this.seed,12))*Hf,z:(t+.2+.6*Y(e,t,this.seed,13))*Hf,h:230+360*Y(e,t,this.seed,14),r:650+450*Y(e,t,this.seed,15)}),this.peakCache.set(n,i),i}peaks(e,t){let n=Math.floor(e/Hf),r=Math.floor(t/Hf),i=0;for(let a=-1;a<=1;a++)for(let o=-1;o<=1;o++){let s=this.peakInCell(n+o,r+a);if(!s)continue;let c=e-s.x,l=t-s.z,u=c*c+l*l;if(u>s.r*s.r*1.6)continue;let d=Math.atan2(l,c),f=1+.22*Math.sin(d*3+s.h)+.12*Math.sin(d*5+s.r),p=Math.sqrt(u)/(s.r*f);i+=s.h*Math.exp(-((p*2.3)**1.45))}return i}height(e,t){let n=this.baseHeight(e,t),r=Math.floor(e/Uf),i=Math.floor(t/Uf);for(let a=-1;a<=1;a++)for(let o=-1;o<=1;o++){let s=this.poisInCell(r+o,i+a);for(let r=0;r<s.length;r++){let i=s[r];if(i.kind!==`cabin`)continue;let a=e-i.x,o=t-i.z,c=a*a+o*o;if(c>900)continue;let l=1-Nl(7,24,Math.sqrt(c));n=Ml(n,i.y,l)}}let a=this.story;if(a.brook.length&&e>a.box[0]&&e<a.box[2]&&t>a.box[1]&&t<a.box[3]){let r=Vf(a.brook,e,t,this.bq);r.d<5.2&&(n=Math.min(n,r.bed+(n-r.bed)*Nl(1.2,5.2,r.d)))}return n}brookDist(e,t){let n=this.story;return!n.brook.length||e<n.box[0]||e>n.box[2]||t<n.box[1]||t>n.box[3]?1/0:Vf(n.brook,e,t,this.bq).d}storyBlock(e,t,n,r){let i=this.story;if(e<i.box[0]||e>i.box[2]||t<i.box[1]||t>i.box[3])return!1;let a=Ff(i,e,t),o=r===`tuft`?.4:r===`rock`?3:1.5;if(Math.abs(a.x)<6.6/2+o+n+(r===`tuft`?0:1.2)&&Math.abs(a.z)<5/2+o+n||this.brookDist(e,t)<(r===`tuft`?2.7:r===`rock`?5.5:4.6)+n)return!0;if(r===`tuft`)return!1;for(let r of i.trees)if(Math.hypot(r.x-e,r.z-t)<3.4+n)return!0;if(Math.hypot(i.stump.x-e,i.stump.z-t)<2.5+n||Math.hypot(i.spawn.x-e,i.spawn.z-t)<3+n||Math.hypot(i.bank.x-e,i.bank.z-t)<3.5+n)return!0;if(r===`rock`){for(let r of i.paths)if(Gf(e,t,r)<2+n)return!0}return!1}forestDensity(e,t,n){let r=Nl(0,.16,this.nForest.fbm(e/460,t/460,4)+.25*this.nForest2.noise(e/90,t/90)+.02);return r*=1-Nl(130,175,n),r*=Nl(1.8,4.5,n),r}rockiness(e,t,n){return jl(Nl(.12,.45,this.nRock.fbm(e/300,t/300,3))+Nl(90,200,n)*.6,0,1)}flowers(e,t){return Nl(.25,.55,this.nMisc.noise(e/70,t/70))}poisInCell(e,t){let n=e*73856093+t*19349663,r=this.poiCache.get(n);if(r)return r;let i=[];this.poiCache.set(n,i);let a=Ol(kl(e,t,this.seed,101)),o=e*Uf,s=t*Uf,c=()=>[o+50+a()*320,s+50+a()*320],l=(e,t,n,r)=>{let i=this.baseHeight(e+7,t)-this.baseHeight(e-7,t),a=this.baseHeight(e,t+7)-this.baseHeight(e,t-7),o=this.baseHeight(e+5,t+5)-n;return Math.abs(i)<r&&Math.abs(a)<r&&Math.abs(o)<r};if(a()<.5)for(let e=0;e<5;e++){let[e,t]=c(),n=this.baseHeight(e,t);if(!(n<3||n>150||!l(e,t,n,3.2))&&!(this.forestDensity(e,t,n)>.45)){if(i.push({kind:`cabin`,x:e,z:t,y:n+.05,rot:a()*Math.PI*2,clear:22,variant:Math.floor(a()*3)}),a()<.3){let r=a()*Math.PI*2,o=24+a()*12,s=e+Math.cos(r)*o,c=t+Math.sin(r)*o,u=this.baseHeight(s,c);u>3&&Math.abs(u-n)<5&&l(s,c,u,3.2)&&i.push({kind:`cabin`,x:s,z:c,y:u+.05,rot:a()*Math.PI*2,clear:14,variant:Math.floor(a()*3)})}break}}if(a()<.34){let e=0,t=0,n=-1,r=-1/0;for(let i=0;i<4;i++){let[i,a]=c(),o=this.baseHeight(i,a),s=o-400*this.forestDensity(i,a,o);s>r&&(r=s,e=i,t=a,n=o)}if(n>6&&this.forestDensity(e,t,n)<.3){let r=[],o=1+Math.floor(a()*3);for(let n=0;n<o;n++){let i=e+(n===0?0:(a()-.5)*26),o=t+(n===0?0:(a()-.5)*26),s=this.baseHeight(i,o)-1.2,c=(n===0?8:4.5)+a()*4,l=2+Math.floor(a()*(n===0?4:3)),u=0,d=0;for(let e=0;e<l;e++){let e=c*(.55+a()*.25);s+=e*.85,r.push({x:i+u,y:s,z:o+d,sx:c,sy:e,rot:a()*Math.PI}),s+=e*.7,c*=.68+a()*.2,u+=(a()-.5)*c*.5,d+=(a()-.5)*c*.5}}i.push({kind:`tor`,x:e,z:t,y:n,rot:0,clear:26,boulders:r})}}if(a()<.08){let[e,t]=c(),n=this.baseHeight(e,t);if(n>4&&n<130&&l(e,t,n,3)&&this.forestDensity(e,t,n)<.2){let r=[],o=7+Math.floor(a()*4),s=7+a()*3;for(let n=0;n<o;n++){if(a()<.12)continue;let i=n/o*Math.PI*2,c=e+Math.cos(i)*s,l=t+Math.sin(i)*s,u=1.6+a()*1.2;r.push({x:c,y:this.baseHeight(c,l)+u*.6,z:l,sx:.75+a()*.3,sy:u,rot:i})}i.push({kind:`circle`,x:e,z:t,y:n,rot:0,clear:s+4,boulders:r})}}if(a()<.18){let[e,t]=c(),n=this.baseHeight(e,t);if(n>3){let r=3.5+a()*4;i.push({kind:`erratic`,x:e,z:t,y:n,rot:0,clear:r+3,boulders:[{x:e,y:n+r*.25,z:t,sx:r,sy:r*(.6+a()*.2),rot:a()*Math.PI}]})}}let u=this.story,d=i.filter(e=>Math.hypot(e.x-u.x,e.z-u.z)>110&&Math.hypot(e.x-u.far.x,e.z-u.far.z)>45&&!(e.x>u.box[0]-20&&e.x<u.box[2]+20&&e.z>u.box[1]-20&&e.z<u.box[3]+20));i.length=0,i.push(...d);let f=(n,r)=>Math.floor(n/Uf)===e&&Math.floor(r/Uf)===t;if(f(u.x,u.z)&&i.push({kind:`cabin`,story:`ruin`,x:u.x,z:u.z,y:u.y,rot:u.rot,clear:13,variant:0}),f(u.far.x,u.far.z)&&i.push({kind:`cabin`,story:`far`,x:u.far.x,z:u.far.z,y:u.far.y,rot:u.far.rot,clear:20,variant:0}),f(u.spring.x,u.spring.z)&&u.brook.length){let e=u.spring.x,t=u.spring.z,n=this.baseHeight(e,t),r=u.brook[1].x-u.brook[0].x,a=u.brook[1].z-u.brook[0].z,o=Math.hypot(r,a)||1;i.push({kind:`erratic`,x:e,z:t,y:n,rot:0,clear:0,boulders:[{x:e-a/o*1.6,y:n+.3,z:t+r/o*1.6,sx:1.7,sy:1.25,rot:.4},{x:e+a/o*1.9,y:n+.1,z:t-r/o*1.9,sx:1.25,sy:.9,rot:1.9},{x:e-r/o*.9,y:n+.2,z:t-a/o*.9,sx:1.1,sy:.85,rot:2.7}]})}return i}poiCellRange(e,t,n,r,i){let a=Math.floor(e/Uf),o=Math.floor(t/Uf),s=Math.floor(n/Uf),c=Math.floor(r/Uf);for(let e=o;e<=c;e++)for(let t=a;t<=s;t++)for(let n of this.poisInCell(t,e))i(n)}pathsFromCell(e,t){let n=e*73856093+t*19349663,r=this.pathCache.get(n);if(r)return r;let i=[],a=this.poisInCell(e,t).filter(e=>e.kind===`cabin`&&e.story!==`ruin`);for(let n of a){let r=[];for(let i=-2;i<=2;i++)for(let a=-2;a<=2;a++)for(let o of this.poisInCell(e+a,t+i))o!==n&&o.story!==`ruin`&&(o.kind===`cabin`||o.kind===`circle`||o.kind===`tor`)&&r.push(o);r.sort((e,t)=>Math.hypot(e.x-n.x,e.z-n.z)-Math.hypot(t.x-n.x,t.z-n.z));let a=0;for(let e of r){if(a>=2)break;let t=Math.hypot(e.x-n.x,e.z-n.z);if(t>950||t<20)continue;let r=this.tracePath(n.x,n.z,e.x,e.z);if(r){for(let e=0;e+1<r.length;e++)i.push({ax:r[e][0],az:r[e][1],bx:r[e+1][0],bz:r[e+1][1]});a++}}}return this.pathCache.set(n,i),i}tracePath(e,t,n,r){(e>n||e===n&&t>r)&&([e,n]=[n,e],[t,r]=[r,t]);let i=Math.hypot(n-e,r-t),a=Math.max(4,Math.ceil(i/10)),o=-(r-t)/i,s=(n-e)/i,c=[],l=Math.min(40,i*.12);for(let u=0;u<=a;u++){let d=u/a,f=Math.sin(d*Math.PI),p=this.nMisc.noise(e*.01+d*i/90,t*.01+3.3)*l*f,m=Ml(e,n,d)+o*p,h=Ml(t,r,d)+s*p;if(u%3==0){let e=this.baseHeight(m,h);if(e<1.2||e>190)return null}c.push([m,h])}return c}pathsInRange(e,t,n,r,i){let a=[],o=Math.floor((e-1e3)/Uf),s=Math.floor((t-1e3)/Uf),c=Math.floor((n+1e3)/Uf),l=Math.floor((r+1e3)/Uf);for(let u=s;u<=l;u++)for(let s=o;s<=c;s++)for(let o of this.pathsFromCell(s,u)){let s=Math.min(o.ax,o.bx)-i,c=Math.max(o.ax,o.bx)+i,l=Math.min(o.az,o.bz)-i,u=Math.max(o.az,o.bz)+i;c<e||s>n||u<t||l>r||a.push(o)}for(let o of this.story.paths)Math.max(o.ax,o.bx)+i<e||Math.min(o.ax,o.bx)-i>n||Math.max(o.az,o.bz)+i<t||Math.min(o.az,o.bz)-i>r||a.push(o);return a}};function Gf(e,t,n){let r=n.bx-n.ax,i=n.bz-n.az,a=e-n.ax,o=t-n.az,s=r*r+i*i,c=s>0?jl((a*r+o*i)/s,0,1):0,l=a-r*c,u=o-i*c;return Math.sqrt(l*l+u*u)}var Kf=22,qf=5,Jf=.028,Yf=()=>xu(`#c9a26b`,0,{keep:.6}),Xf=class{mesh;p=Array.from({length:Kf},()=>new W);prev=Array.from({length:Kf},()=>new W);pos;nrm;length=5;primed=!1;constructor(){let e=new Dr;this.pos=new pr(new Float32Array(330),3),this.nrm=new pr(new Float32Array(330),3),this.pos.setUsage(He),this.nrm.setUsage(He),e.setAttribute(`position`,this.pos),e.setAttribute(`normal`,this.nrm);let t=[];for(let e=0;e<21;e++)for(let n=0;n<qf;n++){let r=e*qf+n,i=e*qf+(n+1)%qf,a=r+qf,o=i+qf;t.push(r,a,i,i,a,o)}e.setIndex(t),this.mesh=new Zr(e,Yf()),this.mesh.frustumCulled=!1}update(e,t,n,r){let i=this.p;if(!this.primed){for(let n=0;n<Kf;n++)i[n].lerpVectors(e,t,n/21),this.prev[n].copy(i[n]);this.primed=!0}let a=Math.exp(-2.5*n),o=14*n*n;for(let e=1;e<21;e++){let t=Qf.subVectors(i[e],this.prev[e]).multiplyScalar(a);this.prev[e].copy(i[e]),i[e].add(t),i[e].y-=o}i[0].copy(e),i[21].copy(t);let s=Math.max(this.length,e.distanceTo(t)*1.001)/21;for(let e=0;e<12;e++){for(let e=0;e<21;e++){let t=Qf.subVectors(i[e+1],i[e]),n=t.length();if(n<1e-6)continue;let r=(n-s)/n,a=e===0?0:e+1===21?1:.5,o=e+1===21?0:e===0?1:.5;i[e].addScaledVector(t,r*a),i[e+1].addScaledVector(t,-r*o)}for(let e=1;e<21;e++){let t=r(i[e].x,i[e].z)+Jf;i[e].y<t&&(i[e].y=t)}}this.build()}line(e,t,n){for(let r=0;r<Kf;r++){let i=r/21;this.p[r].lerpVectors(e,t,i),this.p[r].y-=n*4*i*(1-i),this.prev[r].copy(this.p[r])}this.primed=!0,this.build()}build(){let e=this.p,t=this.pos.array,n=this.nrm.array;for(let r=0;r<Kf;r++){let i=Qf.subVectors(e[Math.min(21,r+1)],e[Math.max(0,r-1)]).normalize(),a=$f.crossVectors(i,Math.abs(i.y)>.9?tp:np).normalize(),o=ep.crossVectors(a,i);for(let i=0;i<qf;i++){let s=i/qf*Math.PI*2,c=a.x*Math.cos(s)+o.x*Math.sin(s),l=a.y*Math.cos(s)+o.y*Math.sin(s),u=a.z*Math.cos(s)+o.z*Math.sin(s),d=(r*qf+i)*3;t[d]=e[r].x+c*Jf,t[d+1]=e[r].y+l*Jf,t[d+2]=e[r].z+u*Jf,n[d]=c,n[d+1]=l,n[d+2]=u}}this.pos.needsUpdate=!0,this.nrm.needsUpdate=!0}dispose(){this.mesh.geometry.dispose()}};function Zf(){let e=new Zr(new ea(.42,Jf*1.2,6,28),Yf());return e.frustumCulled=!1,e}var Qf=new W,$f=new W,ep=new W,tp=new W(1,0,0),np=new W(0,1,0),rp=500,ip=460,ap=9,op=3.6,sp=5.2,cp=1.8,lp=class{gen;species;group=new En;settings={enabled:!0,density:1,crowFlocks:3,floofFlocks:2,floofEvery:[25,80],crowPassEvery:[45,80],freeze:!1};flocks=new Map;tamed=[];spawnT=0;age=0;nextId=0;rnd;cooldown={};ropes=new Map;throwing=null;noose=Zf();frustum=new pi;pm=new Zt;sphere=new yr;aim=null;stats={mobs:0,drawn:0,flocks:0};onTamed;session=Math.random()*4294967296>>>0;constructor(e,t){this.gen=e,this.species=t,this.rnd=Ol(this.session),this.resetClock();for(let e of t)for(let t of e.batches)this.group.add(t.mesh);this.noose.visible=!1,this.group.add(this.noose)}reset(e){this.gen=e;for(let e of this.ropes.values())this.dropRope(e);this.ropes.clear(),this.throwing&&this.dropRope(this.throwing.rope),this.throwing=null,this.noose.visible=!1,this.flocks.clear(),this.tamed.length=0,this.spawnT=0,this.session=Math.random()*4294967296>>>0,this.rnd=Ol(this.session),this.resetClock()}resetClock(){this.age=0,this.cooldown={crow:0,floof:3+this.rnd()*12,crowPass:20+this.rnd()*20}}*all(){for(let e of this.flocks.values())yield*e.members;yield*this.tamed}populate(e,t,n){t.hidden=(e,t,n,r)=>!this.frustum.intersectsSphere(this.sphere.set(dp.set(e,t,n),r));for(let[t,n]of this.flocks)Math.hypot(n.centre.x-e.x,n.centre.z-e.z)<rp||n.members.some(e=>e.state!==`wild`)||this.flocks.delete(t);let r=this.age<1.5;for(let e of this.species){if(this.cooldown[e.name]=(this.cooldown[e.name]??0)-n,this.cooldown[e.name]>0)continue;let i=Math.round((e.name===`crow`?this.settings.crowFlocks:this.settings.floofFlocks)*this.settings.density),a=0;for(let t of this.flocks.values())t.species===e&&!t.data.debug&&!t.data.passing&&a++;if(!(a>=i)){if(!this.launch(e,t,r)){this.cooldown[e.name]=1.5;continue}if(e.name===`floof`){let[e,t]=this.settings.floofEvery;this.cooldown.floof=e+this.rnd()*(t-e)}else this.cooldown.crow=r?0:5+this.rnd()*15}}let i=this.species.find(e=>e.name===`crow`);if(this.cooldown.crowPass-=n,i&&this.cooldown.crowPass<=0&&this.settings.density>0){let e=0;for(let t of this.flocks.values())t.species===i&&!t.data.debug&&e++;if(e>=this.settings.crowFlocks*this.settings.density+2)this.cooldown.crowPass=5;else if(this.launch(i,t,!1,void 0,void 0,!0)){let[e,t]=this.settings.crowPassEvery;this.cooldown.crowPass=e+this.rnd()*(t-e)}else this.cooldown.crowPass=1.5}}launch(e,t,n,r,i,a=!1){let o=this.nextId++,s=`${e.name}:${o}`,c=Ol(kl(o,3,this.session,709)),l={key:s,species:e,home:new W,centre:new W,target:new W,members:[],t:0,data:{rnd:c,pass:a}};if(r)l.data.debug=!0,l.centre.copy(r),l.target.copy(r),e.launch(l,t,c,!0),l.centre.copy(r),l.target.copy(r),e.name===`crow`&&Object.assign(l.data,{mode:`ground`,spot:r.clone(),relocate:60+c()*60}),l.data.speed&&(l.data.speed=.4);else if(!e.launch(l,t,c,n))return null;l.home.copy(l.centre);let[u,d]=e.flockSize,f=i??u+Math.floor(c()*(d-u+1));for(let t=0;t<f;t++)l.members.push(this.newMob(`${s}:${t}`,e,l));return l.members.forEach((n,r)=>e.initMob(n,r,l,t)),this.flocks.set(s,l),l}newMob(e,t,n){return{id:e,species:t,pos:new W,vel:new W,heading:0,grounded:!1,state:`wild`,leashed:!1,ridden:!1,flock:n,rnd:Ol(kl(e.length,[...e].reduce((e,t)=>Math.imul(e^t.charCodeAt(0),16777619)>>>0,2166136261),this.gen.seed,9)),tint:new K(1,1,1),stay:new W,stateT:0,happy:0,data:null}}spawnFlockAt(e,t,n,r,i){let a=this.species.find(t=>t.name===e);a&&this.launch(a,r,!0,new W(t,this.gen.height(t,n),n),i)}pick(e,t){e.getWorldDirection(pp);let n=null,r=1/0;for(let i of this.all()){if(i.ridden||i.state===`caught`)continue;up(i,dp);let a=dp.distanceTo(t),o=i.state===`wild`?24:ap;if(a>o)continue;fp.subVectors(dp,e.position);let s=fp.angleTo(pp),c=.3+Math.max(0,1-a/8)*.6;if(s>c)continue;let l=s/c+a/o*.6+(i.state===`wild`?0:-.3);l<r&&(r=l,n={mob:i,action:i.state===`wild`?`lasso`:i.leashed?`unlead`:`lead`})}return n}act(){let e=this.aim;if(!e||this.throwing)return null;if(e.action===`lasso`){let t=new Xf;return this.group.add(t.mesh),up(e.mob,dp),this.throwing={mob:e.mob,t:0,dur:.18+.022*dp.distanceTo(this.lastHand),rope:t},this.alarm(e.mob),`throw`}return e.action===`lead`?(e.mob.leashed=!0,`lead`):(e.mob.leashed=!1,e.mob.species.reset(e.mob),`unlead`)}alarm(e){e.flock&&(e.flock.data.alarm=!0)}mountable(e){let t=null,n=op;for(let r of this.tamed){if(r.ridden)continue;let i=Math.hypot(r.pos.x-e.x,r.pos.z-e.z);i<n+r.species.radius&&r.pos.y-e.y<4.5&&e.y-r.pos.y<2.5&&(n=i,t=r)}return t}mount(e){e.ridden=!0,e.leashed=!1;let t=this.ropes.get(e);t&&(this.dropRope(t),this.ropes.delete(e))}dismount(e){e.ridden=!1,e.species.reset(e)}get leading(){return this.tamed.some(e=>e.leashed)||!!this.throwing||this.tamed.some(e=>e.state===`caught`)}lastHand=new W;update(e,t,n,r){let i=e.player.pos;if(this.lastHand.copy(n),!this.settings.enabled){for(let e of this.species)for(let t of e.batches)t.begin(),t.end();this.aim=null;return}if(this.age+=e.dt,this.spawnT-=e.dt,this.spawnT<=0&&!this.settings.freeze&&(this.populate(i,e,.5-this.spawnT),this.spawnT=.5),!this.settings.freeze)for(let t of this.flocks.values())t.t+=e.dt,t.species.thinkFlock(t,e);let a=0;for(let t of this.all()){if(this.settings.freeze)break;t.stateT+=e.dt,t.happy=Math.max(0,t.happy-e.dt),t.species.think(t,e,t.leashed?a++:0),t.state===`caught`&&t.stateT>cp&&this.tame(t,e)}t.updateMatrixWorld(),this.pm.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this.frustum.setFromProjectionMatrix(this.pm);for(let e of this.species)for(let t of e.batches)t.begin();let o=0,s=0,c=[];for(let n of this.all()){o++;let r=n.pos.distanceTo(t.position);if(!(r>ip&&!n.ridden)){if(up(n,this.sphere.center),this.sphere.radius=n.species.radius*2.6,!n.ridden&&!this.frustum.intersectsSphere(this.sphere)){n.state!==`wild`&&n.species.animate(n,e),r<70&&c.push({m:n,d:r});continue}n.species.animate(n,e),n.species.emit(n,r),s++,r<90&&c.push({m:n,d:r})}}for(let e of this.species)for(let t of e.batches)t.end();this.stats.mobs=o,this.stats.drawn=s,this.stats.flocks=this.flocks.size,c.sort((e,t)=>e.d-t.d);let l=lu.uMobShadow.value;for(let e=0;e<l.length;e++){let t=c[e];if(!t){l[e].set(0,-1e4,0,0);continue}let n=t.m,r=this.gen.height(n.pos.x,n.pos.z),i=n.pos.y-r;if(r<0||i>30){l[e].set(0,-1e4,0,0);continue}l[e].set(n.pos.x,r,n.pos.z,n.species.radius*.85/(1+Math.max(0,i)*.1))}this.aim=r?this.pick(t,i):null}tame(e,t){if(e.state=`tamed`,e.stateT=0,e.happy=1.6,e.leashed=!0,e.flock){let t=e.flock;t.members.splice(t.members.indexOf(e),1),t.members.length||this.flocks.delete(t.key),e.flock=null}this.tamed.push(e),e.species.reset(e),up(e,dp),t.puff(dp.setY(dp.y+e.species.radius*.6),8,.22,2.4),this.onTamed?.(e)}ropeTarget(e){for(let t of this.ropes.keys())return t.species.attach(t,this.lastHand,e),!0;return!1}updateRopes(e,t){this.lastHand.copy(t),this.settings.enabled&&this.updateLasso(e,t)}updateLasso(e,t){let n=(t,n)=>e.surface(t,n),r=this.throwing;if(r){r.t+=e.dt;let n=r.mob;n.species.attach(n,t,dp);let i=Math.min(1,r.t/r.dur);fp.lerpVectors(t,dp,i),fp.y+=Math.sin(i*Math.PI)*Math.min(2.5,t.distanceTo(dp)*.18),this.noose.visible=!0,this.noose.position.copy(fp),this.noose.rotation.set(Math.PI/2+Math.sin(r.t*9)*.2,0,r.t*14),this.noose.scale.setScalar(.6+.4*Math.min(1,r.t*5)),r.rope.line(t,fp,.3*i),i>=1&&(this.noose.visible=!1,this.throwing=null,n.state===`wild`?(n.state=`caught`,n.stateT=0,r.rope.length=Math.max(4,t.distanceTo(dp)),this.ropes.set(n,r.rope),e.puff(dp,4,.12,1.4)):this.dropRope(r.rope))}for(let r of this.all()){let i=r.state===`caught`||r.leashed,a=this.ropes.get(r);if(!i){a&&(this.dropRope(a),this.ropes.delete(r));continue}a||(a=new Xf,this.group.add(a.mesh),this.ropes.set(r,a)),r.state===`tamed`&&(a.length+=(sp-a.length)*(1-Math.exp(-2*e.dt))),up(r,dp);let o=a.length*1.08+r.species.radius,s=dp.distanceTo(t);if(s>o){fp.subVectors(t,dp).setLength(s-o),r.pos.add(fp);let e=fp.normalize(),n=r.vel.dot(e);n<0&&r.vel.addScaledVector(e,-n)}r.species.attach(r,t,dp),a.update(t,dp,e.dt,n)}}dropRope(e){this.group.remove(e.mesh),e.dispose()}};function up(e,t){return t.copy(e.pos).setY(e.pos.y+e.species.centreY)}var dp=new W,fp=new W,pp=new W,mp=1.1,hp=`#ffffff`,gp=`#c4616b`,_p=`#b8473a`,vp=`#f1e6d2`,yp=`#c9a26b`,bp=[`#f3c38e`,`#f6f0e6`,`#66545c`].map(e=>new K(e)),xp=64;function Sp(e){let t=new W,n=Wd({widthSegs:e?132:56,heightSegs:e?96:40,tufts:e?130:60,amp:e?.07:.055,sweep:.14,width:e?.8:1,share:e?.45:.35,seed:11,comb:(e,n)=>(t.set(0,-.55,-1),n.copy(t).addScaledVector(e,-e.dot(t)).normalize()),mask:e=>1-H.smoothstep(e.z,.35,.7)*(1-H.smoothstep(Math.abs(e.y),.55,.85))}).scale(mp*1.04,mp*.97,mp),r=Wd({widthSegs:24,heightSegs:16,tufts:14,amp:.2,sweep:.15,seed:3,comb:(e,t)=>t.set(0,-.3,-1).addScaledVector(e,-e.dot(t)).normalize()}).scale(.24*mp,.2*mp,.26*mp).translate(0,-.05*mp,-.98*mp),i=new $i(1,20,14).scale(.09*mp,.068*mp,.07*mp).translate(0,-.1*mp,.99*mp),a=new $i(1,10,6).scale(.026*mp,.017*mp,.014*mp).translate(.025*mp,-.075*mp,1.055*mp);return zd([Rd(n,hp,1),Rd(r,hp),Rd(i,gp,0,!1),Rd(a,`#fffdf8`,0,!1)])}function Cp(){return Rd(Bd([[0,.02],[.07,0],[.12,-.12],[.16,-.32],[.165,-.5],[.14,-.66],[.09,-.77],[0,-.8]].map(([e,t])=>[e*mp,t*mp]),24).scale(1,1,.32),hp)}function wp(){return Rd(new $i(1,16,12).scale(.15*mp,.13*mp,.19*mp),hp)}function Tp(e,t,n=1,r=1,i=1.035,a=.5){let o=[],s=(o,s,c)=>{let l=s/48*Math.PI*2,u=1+.07*Math.abs(Math.sin(l*5)),d=o/8*t*u*(1+a*Math.cos(l)**2),f=e*i*c;return[Math.sin(d)*Math.cos(l)*f*n,Math.cos(d)*f,Math.sin(d)*Math.sin(l)*f*r]};for(let e=0;e<8;e++)for(let t=0;t<48;t++){let n=s(e,t,1),r=s(e+1,t,1),i=s(e,t+1,1),a=s(e+1,t+1,1);o.push(...n,...r,...i,...i,...r,...a)}let c=new Dr;c.setAttribute(`position`,new q(o,3)),c.computeVertexNormals();let l=c.getAttribute(`normal`),u=c.getAttribute(`position`),d=new W;for(let e=0;e<l.count;e++)d.fromBufferAttribute(u,e).normalize(),l.setXYZ(e,d.x,d.y,d.z);let f=[];for(let e=0;e<48;e++)f.push(new W(...s(8,e,1.01)));let p=new ta(new Mi(f,!0),96,e*.04,6,!0);return zd([Rd(c,_p),Rd(p,vp)])}function Ep(){return Tp(mp*1,.34,1,1,1.02,.6).rotateX(-.42)}function Dp(){return Rd(new ea(mp*1.06,.035,6,56).rotateX(Math.PI/2),yp)}var Op=new W,kp=new W,Ap=new Ot,jp=class{name=`floof`;radius=mp;centreY=mp;flockSize=[4,9];mount={name:`floof`,radius:mp*.9,fly:{speed:26,sprint:40,climb:11,sink:0,hover:1.1,turn:3.2}};bodyB;farB;earB;pawB;saddleB;collarB;batches;constructor(){let e={keep:.62,eyePos:[.35,.14],eyeSize:[.24,.29],pupil:[.075,.1],lookRange:[.14,.12],eyeTilt:-.06,mouthW:[-.215,.055,7],blush:[.6,-.13,.13,.075]},t=()=>({...e,eyePos:[...e.eyePos],eyeSize:[...e.eyeSize],pupil:[...e.pupil],lookRange:[...e.lookRange],mouthW:[...e.mouthW],blush:[...e.blush]});this.bodyB=new Hd(Sp(!0),t(),xp),this.farB=new Hd(Sp(!1),t(),xp),this.earB=new Hd(Cp(),{keep:.62},128),this.pawB=new Hd(wp(),{keep:.62},256),this.saddleB=new Hd(Ep(),{keep:.75,doubleSide:!0},16),this.collarB=new Hd(Dp(),{keep:.6},16),this.batches=[this.bodyB,this.farB,this.earB,this.pawB,this.saddleB,this.collarB]}launch(e,t,n,r){let i=t.player.pos;e.data.alt=9+n()*6,e.data.speed=4.5+n()*3.5,e.data.wobble=n()*10,e.data.ang=n()*Math.PI*2;for(let r=0;r<16;r++){let r=n()*Math.PI*2,a=(n()-.5)*120,o=170+n()*90,s=Math.sin(r),c=Math.cos(r),l=i.x+s*o+c*a,u=i.z+c*o-s*a,d=t.surface(l,u)+e.data.alt;if(!t.hidden||t.hidden(l,d,u,20))return e.centre.set(l,0,u),e.target.copy(e.centre),e.data.ang=r+Math.PI+(n()-.5)*.3,!0}return!1}initMob(e,t,n,r){let i=e.rnd,a={root:new Tn,collar:new Tn,body:new Tn,ears:[new Tn,new Tn],paws:[0,1,2,3].map(()=>new Tn),saddle:new Tn,seat:new Tn,slotA:t/n.members.length*Math.PI*2+i()*.8,slotR:2.5+i()*6,slotSpin:(i()<.5?-1:1)*(.04+i()*.05),alt:(n.data.alt??6)+(i()-.5)*3,phase:i()*10,t:i()*10,prevVel:new W,acc:new W,turn:0,prevHeading:0,pitch:new Ud,bank:new Ud,squash:new Ud,earX:[new Ud,new Ud],earBeat:i()*6,earZ:[new Ud,new Ud],paddle:i()*6,blinkAt:i()*4,look:new U,lookAt:null,eye:new Kt(0,0,1,0)};a.root.add(a.body),a.body.position.y=mp;for(let[e,t]of a.ears.entries()){let n=e?-1:1;t.position.set(n*.58*mp,.76*mp,.02*mp),t.rotation.set(.15,0,n*1.05),a.body.add(t)}for(let[e,t]of a.paws.entries())t.position.set((e%2?-1:1)*.4*mp,-.86*mp,(e<2?.34:-.36)*mp),a.body.add(t);a.body.add(a.saddle,a.collar),a.collar.rotation.x=.12,a.saddle.position.set(0,0,-.06*mp),a.seat.position.set(0,.95*mp,-.36*mp),a.seat.rotation.x=-.3,a.body.add(a.seat),e.data=a,e.grounded=!1;let o=a.slotA,s=n.centre.x+Math.cos(o)*a.slotR,c=n.centre.z+Math.sin(o)*a.slotR;e.pos.set(s,this.cruiseY(s,c,a.alt,r),c),e.heading=i()*Math.PI*2,n.data.coat??=Math.floor(n.data.rnd()*bp.length);let l=i()<.65?n.data.coat:Math.floor(i()*bp.length);e.tint.copy(bp[l]).multiplyScalar(.96+i()*.08)}cruiseY(e,t,n,r){let i=r.surface(e,t),a=r.gen.forestDensity(e,t,i);return i+n+17*H.smoothstep(a,.05,.4)}thinkFlock(e,t){let n=e.data;n.ang+=Math.sin(e.t*.07+n.wobble)*.012*t.dt,e.centre.x+=Math.sin(n.ang)*n.speed*t.dt,e.centre.z+=Math.cos(n.ang)*n.speed*t.dt}think(e,t,n){let r=e.data,{dt:i,player:a}=t;if(e.ridden)return;let o=Op,s=4,c=1.4;r.lookAt=null;let l=Math.hypot(a.pos.x-e.pos.x,a.pos.z-e.pos.z);if(e.state===`wild`&&e.flock){let n=e.flock;r.slotA+=r.slotSpin*i;let c=n.centre.x+Math.cos(r.slotA)*r.slotR,u=n.centre.z+Math.sin(r.slotA)*r.slotR;o.set(c,this.cruiseY(c,u,r.alt+Math.sin(t.time*.4+r.phase)*.8,t),u),s=(n.data.speed??3)+3,l<22&&(r.lookAt=a.pos);for(let t of n.members){if(t===e)continue;kp.subVectors(e.pos,t.pos);let n=kp.length();n<2.8&&n>.001&&o.addScaledVector(kp,(2.8-n)/n*1.5)}}else if(e.state===`caught`){kp.subVectors(e.pos,a.pos).setY(0).normalize();let t=3+Math.sin(e.stateT*11)*2.5;o.copy(e.pos).addScaledVector(kp,t).add(kp.set(Math.sin(e.stateT*7)*1.5,.8,0)),s=5,c=5,r.lookAt=a.pos}else if(e.leashed){let e=3.4+n*1.2,i=(n%2?-1:1)*Math.ceil(n/2)*2.2,u=Math.sin(a.heading),d=Math.cos(a.heading);o.set(a.pos.x-u*e+d*i,0,a.pos.z-d*e-u*i),o.y=Math.max(t.surface(o.x,o.z)+1.3,a.pos.y+.6),s=22,c=3,l<12&&(r.lookAt=a.pos)}else{let n=Math.hypot(a.pos.x-e.stay.x,a.pos.z-e.stay.z)<7;o.copy(e.stay),o.y=t.surface(o.x,o.z)+(n?.5:2.2)+Math.sin(t.time*.9+r.phase)*.25,s=4,c=2,l<14&&(r.lookAt=a.pos)}o.sub(e.pos).multiplyScalar(e.leashed?1.4:.7),o.length()>s&&o.setLength(s),e.vel.lerp(o,1-Math.exp(-c*i)),e.pos.addScaledVector(e.vel,i);let u=t.surface(e.pos.x,e.pos.z)+.3;e.pos.y<u&&(e.pos.y=u,e.vel.y=Math.max(0,e.vel.y));let d=Math.hypot(e.vel.x,e.vel.z),f=e.heading;r.lookAt&&d<2.5?f=Math.atan2(r.lookAt.x-e.pos.x,r.lookAt.z-e.pos.z):d>.3&&(f=Math.atan2(e.vel.x,e.vel.z));let p=f-e.heading;p=Math.atan2(Math.sin(p),Math.cos(p)),e.heading+=p*(1-Math.exp(-(e.state===`caught`?6:1.8)*i))}animate(e,t){let n=e.data,r=Math.max(t.dt,1e-4);n.t+=r;let i=n.t,a=e=>1-Math.exp(-e*r);n.root.position.copy(e.pos),n.root.rotation.y=e.heading;let o=Math.sin(e.heading),s=Math.cos(e.heading);Op.subVectors(e.vel,n.prevVel).divideScalar(r),n.prevVel.copy(e.vel),n.acc.lerp(Op,a(8));let c=e.heading-n.prevHeading;c=Math.atan2(Math.sin(c),Math.cos(c)),n.prevHeading=e.heading,n.turn+=(c/r-n.turn)*a(6);let l=e.vel.x*o+e.vel.z*s,u=n.acc.x*o+n.acc.z*s,d=n.acc.x*s-n.acc.z*o,f=e.vel.length(),p=Math.sin(i*1.9+n.phase)*.1*(1-Math.min(1,f/12)),m=+(e.state===`caught`),h=n.pitch.step(H.clamp(l*.03+u*.02,-.25,.45)+m*Math.sin(i*13)*.25,40,9,r),g=n.bank.step(H.clamp(-n.turn*Math.max(2,f)*.05,-.45,.45)+m*Math.sin(i*9)*.3,40,9,r);n.body.position.y=mp+p,n.body.rotation.set(h,0,g);let _=1+n.squash.step(H.clamp(e.vel.y*.025,-.12,.12)+Math.sin(i*3.8+n.phase)*.015,90,10,r);n.body.scale.set(1/Math.sqrt(_),_,1/Math.sqrt(_));let v=H.clamp(.35+e.vel.y*.12+f*.03+m,0,1.4);n.earBeat+=r*(4.2+v*5);let y=Math.sin(n.earBeat);for(let t=0;t<2;t++){let i=t?-1:1,a=n.earX[t].step(.15+l*.035+u*.03-e.vel.y*.02,60,7,r),o=Math.sin(n.earBeat-.5),s=n.earZ[t].step(i*(1.12+(.35+.3*v)*o-d*.03*i-g*.3),90,9,r);n.ears[t].rotation.set(a,0,s),n.ears[t].scale.set(1,1+y*.04*v,1)}n.paddle+=r*(3+Math.min(f,20)*.9);let b=.25+Math.min(1,f/6)*.5;for(let e=0;e<4;e++){let t=n.paddle+(e===0||e===3?0:Math.PI);n.paws[e].rotation.x=Math.sin(t)*b-.2,n.paws[e].position.y=-.86*mp+Math.max(0,Math.cos(t))*.06*b}i>n.blinkAt+.12&&(n.blinkAt=i+1.5+e.rnd()*4);let x=e.happy>0?-1:i>n.blinkAt?.05:1,S=0,C=0;if(n.lookAt){Op.subVectors(n.lookAt,e.pos),Op.y+=.09999999999999987;let t=Op.x*o+Op.z*s,r=Op.x*s-Op.z*o;S=H.clamp(Math.atan2(r,Math.max(t,.1))/.8,-1,1),C=H.clamp(Math.atan2(Op.y,Math.hypot(r,t))/.8,-1,1)}n.look.x+=(S-n.look.x)*a(10),n.look.y+=(C-n.look.y)*a(10),n.eye.set(n.look.x,n.look.y,x,0),n.saddle.visible=e.state===`tamed`,n.root.updateMatrixWorld(!0)}emit(e,t){let n=e.data;(t<45?this.bodyB:this.farB).push(n.body.matrixWorld,e.tint,n.eye);for(let t of n.ears)this.earB.push(t.matrixWorld,e.tint);for(let t of n.paws)this.pawB.push(t.matrixWorld,e.tint);n.saddle.visible&&this.saddleB.push(n.saddle.matrixWorld,Mp),(e.state===`caught`||e.leashed)&&this.collarB.push(n.collar.matrixWorld,Mp)}attach(e,t,n){return e.data.body.getWorldPosition(n),Op.subVectors(t,n).setY(0),Op.lengthSq()<1e-4&&Op.set(0,0,1),n.addScaledVector(Op.normalize(),mp*1.02)}seat(e){let t=e.data;return t.seat.getWorldPosition(Np),t.seat.getWorldQuaternion(Pp),{pos:Np,quat:Pp,spread:.72}}reset(e){let t=e.data;t.pitch.v=t.bank.v=0,e.stay.copy(e.pos),Ap.identity()}},Mp=new K(1,1,1),Np=new W,Pp=new Ot,Fp=-.22,Ip=-1.4,Lp=1.35,Rp={fovKick:0,distScale:1,airborne:!1,velX:0,velZ:0},zp=class{camera;yaw=.6;pitch=.18;distance=10;targetDistance=10;minDistance=3;maxDistance=80;baseFov;target=new W;initialized=!1;fovKick=0;distScale=1;followY=0;dip=0;dipVel=0;lead=new U;constructor(e){this.camera=e,this.baseFov=e.fov}addLook(e,t){this.yaw-=e*.0024,this.pitch=H.clamp(this.pitch+t*.0022,Ip,Lp)}zoom(e){this.targetDistance=H.clamp(this.targetDistance*Math.exp(e*.001),this.minDistance,this.maxDistance)}bump(e){this.dipVel-=e}snap(){this.initialized=!1}update(e,t,n,r=Rp){this.initialized||=(this.target.copy(e),this.followY=e.y,this.distance=this.targetDistance,this.distScale=r.distScale,this.fovKick=r.fovKick,this.dip=this.dipVel=0,this.lead.set(0,0),!0);let i=e=>1-Math.exp(-e*t);this.target.x+=(e.x-this.target.x)*i(12),this.target.z+=(e.z-this.target.z)*i(12);let a=this.followY-e.y,o=r.airborne?a>1.5?6:2.2:10;this.followY+=(e.y-this.followY)*i(o),this.followY=H.clamp(this.followY,e.y-3,e.y+2.5),this.target.y=this.followY;let s=2.2,c=H.clamp(r.velX*.16,-2.2,s),l=H.clamp(r.velZ*.16,-2.2,s);this.lead.x+=(c-this.lead.x)*i(2.5),this.lead.y+=(l-this.lead.y)*i(2.5),this.fovKick+=(r.fovKick-this.fovKick)*i(r.fovKick>this.fovKick?2.5:4),this.distScale+=(r.distScale-this.distScale)*i(r.distScale>this.distScale?1.8:3);let u=this.baseFov+this.fovKick;Math.abs(this.camera.fov-u)>.001&&(this.camera.fov=u,this.camera.updateProjectionMatrix()),this.dipVel+=(-170*this.dip-15*this.dipVel)*t,this.dip+=this.dipVel*t,this.distance+=(this.targetDistance-this.distance)*i(8);let d=Math.max(this.pitch,Fp),f=d-this.pitch,p=f/1.18,m=this.distance*this.distScale*(1-.3*p*(2-p)),h=Math.cos(d),g=this.target.x+this.lead.x,_=this.target.z+this.lead.y,v=this.camera.position;v.set(g+Math.sin(this.yaw)*h*m,this.target.y+Math.sin(d)*m+this.dip,_+Math.cos(this.yaw)*h*m);let y=n(v.x,v.z)+.6;v.y<y&&(v.y=y);let b=this.target.y+.3+this.dip*.6;if(f>0){let e=g-v.x,t=b-v.y,n=_-v.z,r=Math.max(1e-4,Math.hypot(e,n)),i=Math.min(Math.atan2(t,r)+f,1.45),a=Math.cos(i)/r;this.camera.lookAt(v.x+e*a,v.y+Math.sin(i),v.z+n*a)}else this.camera.lookAt(g,b,_);this.camera.updateMatrixWorld()}},Bp=class e{constructor(t,n,r,i,a=`div`){this.parent=t,this.object=n,this.property=r,this._disabled=!1,this._hidden=!1,this.initialValue=this.getValue(),this.domElement=document.createElement(a),this.domElement.classList.add(`lil-controller`),this.domElement.classList.add(i),this.$name=document.createElement(`div`),this.$name.classList.add(`lil-name`),e.nextNameID=e.nextNameID||0,this.$name.id=`lil-gui-name-${++e.nextNameID}`,this.$widget=document.createElement(`div`),this.$widget.classList.add(`lil-widget`),this.$disable=this.$widget,this.domElement.appendChild(this.$name),this.domElement.appendChild(this.$widget),this.domElement.addEventListener(`keydown`,e=>e.stopPropagation()),this.domElement.addEventListener(`keyup`,e=>e.stopPropagation()),this.parent.children.push(this),this.parent.controllers.push(this),this.parent.$children.appendChild(this.domElement),this._listenCallback=this._listenCallback.bind(this),this.name(r)}name(e){return this._name=e,this.$name.textContent=e,this}onChange(e){return this._onChange=e,this}_callOnChange(){this.parent._callOnChange(this),this._onChange!==void 0&&this._onChange.call(this,this.getValue()),this._changed=!0}onFinishChange(e){return this._onFinishChange=e,this}_callOnFinishChange(){this._changed&&(this.parent._callOnFinishChange(this),this._onFinishChange!==void 0&&this._onFinishChange.call(this,this.getValue())),this._changed=!1}reset(){return this.setValue(this.initialValue),this._callOnFinishChange(),this}enable(e=!0){return this.disable(!e)}disable(e=!0){return e===this._disabled?this:(this._disabled=e,this.domElement.classList.toggle(`lil-disabled`,e),this.$disable.toggleAttribute(`disabled`,e),this)}show(e=!0){return this._hidden=!e,this.domElement.style.display=this._hidden?`none`:``,this}hide(){return this.show(!1)}options(e){let t=this.parent.add(this.object,this.property,e);return t.name(this._name),this.destroy(),t}min(e){return this}max(e){return this}step(e){return this}decimals(e){return this}listen(e=!0){return this._listening=e,this._listenCallbackID!==void 0&&(cancelAnimationFrame(this._listenCallbackID),this._listenCallbackID=void 0),this._listening&&this._listenCallback(),this}_listenCallback(){this._listenCallbackID=requestAnimationFrame(this._listenCallback);let e=this.save();e!==this._listenPrevValue&&this.updateDisplay(),this._listenPrevValue=e}getValue(){return this.object[this.property]}setValue(e){return this.getValue()!==e&&(this.object[this.property]=e,this._callOnChange(),this.updateDisplay()),this}updateDisplay(){return this}load(e){return this.setValue(e),this._callOnFinishChange(),this}save(){return this.getValue()}destroy(){this.listen(!1),this.parent.children.splice(this.parent.children.indexOf(this),1),this.parent.controllers.splice(this.parent.controllers.indexOf(this),1),this.parent.$children.removeChild(this.domElement)}},Vp=class extends Bp{constructor(e,t,n){super(e,t,n,`lil-boolean`,`label`),this.$input=document.createElement(`input`),this.$input.setAttribute(`type`,`checkbox`),this.$input.setAttribute(`aria-labelledby`,this.$name.id),this.$widget.appendChild(this.$input),this.$input.addEventListener(`change`,()=>{this.setValue(this.$input.checked),this._callOnFinishChange()}),this.$disable=this.$input,this.updateDisplay()}updateDisplay(){return this.$input.checked=this.getValue(),this}};function Hp(e){let t,n;return(t=e.match(/(#|0x)?([a-f0-9]{6})/i))?n=t[2]:(t=e.match(/rgb\(\s*(\d*)\s*,\s*(\d*)\s*,\s*(\d*)\s*\)/))?n=parseInt(t[1]).toString(16).padStart(2,0)+parseInt(t[2]).toString(16).padStart(2,0)+parseInt(t[3]).toString(16).padStart(2,0):(t=e.match(/^#?([a-f0-9])([a-f0-9])([a-f0-9])$/i))&&(n=t[1]+t[1]+t[2]+t[2]+t[3]+t[3]),n?`#`+n:!1}var Up={isPrimitive:!0,match:e=>typeof e==`string`,fromHexString:Hp,toHexString:Hp},Wp={isPrimitive:!0,match:e=>typeof e==`number`,fromHexString:e=>parseInt(e.substring(1),16),toHexString:e=>`#`+e.toString(16).padStart(6,0)},Gp=[Up,Wp,{isPrimitive:!1,match:e=>Array.isArray(e)||ArrayBuffer.isView(e),fromHexString(e,t,n=1){let r=Wp.fromHexString(e);t[0]=(r>>16&255)/255*n,t[1]=(r>>8&255)/255*n,t[2]=(r&255)/255*n},toHexString([e,t,n],r=1){r=255/r;let i=e*r<<16^t*r<<8^n*r<<0;return Wp.toHexString(i)}},{isPrimitive:!1,match:e=>Object(e)===e,fromHexString(e,t,n=1){let r=Wp.fromHexString(e);t.r=(r>>16&255)/255*n,t.g=(r>>8&255)/255*n,t.b=(r&255)/255*n},toHexString({r:e,g:t,b:n},r=1){r=255/r;let i=e*r<<16^t*r<<8^n*r<<0;return Wp.toHexString(i)}}];function Kp(e){return Gp.find(t=>t.match(e))}var qp=class extends Bp{constructor(e,t,n,r){super(e,t,n,`lil-color`),this.$input=document.createElement(`input`),this.$input.setAttribute(`type`,`color`),this.$input.setAttribute(`tabindex`,-1),this.$input.setAttribute(`aria-labelledby`,this.$name.id),this.$text=document.createElement(`input`),this.$text.setAttribute(`type`,`text`),this.$text.setAttribute(`spellcheck`,`false`),this.$text.setAttribute(`aria-labelledby`,this.$name.id),this.$display=document.createElement(`div`),this.$display.classList.add(`lil-display`),this.$display.appendChild(this.$input),this.$widget.appendChild(this.$display),this.$widget.appendChild(this.$text),this._format=Kp(this.initialValue),this._rgbScale=r,this._initialValueHexString=this.save(),this._textFocused=!1,this.$input.addEventListener(`input`,()=>{this._setValueFromHexString(this.$input.value)}),this.$input.addEventListener(`blur`,()=>{this._callOnFinishChange()}),this.$text.addEventListener(`input`,()=>{let e=Hp(this.$text.value);e&&this._setValueFromHexString(e)}),this.$text.addEventListener(`focus`,()=>{this._textFocused=!0,this.$text.select()}),this.$text.addEventListener(`blur`,()=>{this._textFocused=!1,this.updateDisplay(),this._callOnFinishChange()}),this.$disable=this.$text,this.updateDisplay()}reset(){return this._setValueFromHexString(this._initialValueHexString),this}_setValueFromHexString(e){if(this._format.isPrimitive){let t=this._format.fromHexString(e);this.setValue(t)}else this._format.fromHexString(e,this.getValue(),this._rgbScale),this._callOnChange(),this.updateDisplay()}save(){return this._format.toHexString(this.getValue(),this._rgbScale)}load(e){return this._setValueFromHexString(e),this._callOnFinishChange(),this}updateDisplay(){return this.$input.value=this._format.toHexString(this.getValue(),this._rgbScale),this._textFocused||(this.$text.value=this.$input.value.substring(1)),this.$display.style.backgroundColor=this.$input.value,this}},Jp=class extends Bp{constructor(e,t,n){super(e,t,n,`lil-function`),this.$button=document.createElement(`button`),this.$button.appendChild(this.$name),this.$widget.appendChild(this.$button),this.$button.addEventListener(`click`,e=>{e.preventDefault(),this.getValue().call(this.object),this._callOnChange()}),this.$button.addEventListener(`touchstart`,()=>{},{passive:!0}),this.$disable=this.$button}},Yp=class extends Bp{constructor(e,t,n,r,i,a){super(e,t,n,`lil-number`),this._initInput(),this.min(r),this.max(i);let o=a!==void 0;this.step(o?a:this._getImplicitStep(),o),this.updateDisplay()}decimals(e){return this._decimals=e,this.updateDisplay(),this}min(e){return this._min=e,this._onUpdateMinMax(),this}max(e){return this._max=e,this._onUpdateMinMax(),this}step(e,t=!0){return this._step=e,this._stepExplicit=t,this}updateDisplay(){let e=this.getValue();if(this._hasSlider){let t=(e-this._min)/(this._max-this._min);t=Math.max(0,Math.min(t,1)),this.$fill.style.width=t*100+`%`}return this._inputFocused||(this.$input.value=this._decimals===void 0?e:e.toFixed(this._decimals)),this}_initInput(){this.$input=document.createElement(`input`),this.$input.setAttribute(`type`,`text`),this.$input.setAttribute(`aria-labelledby`,this.$name.id),window.matchMedia(`(pointer: coarse)`).matches&&(this.$input.setAttribute(`type`,`number`),this.$input.setAttribute(`step`,`any`)),this.$widget.appendChild(this.$input),this.$disable=this.$input;let e=()=>{let e=parseFloat(this.$input.value);isNaN(e)||(this._stepExplicit&&(e=this._snap(e)),this.setValue(this._clamp(e)))},t=e=>{let t=parseFloat(this.$input.value);isNaN(t)||(this._snapClampSetValue(t+e),this.$input.value=this.getValue())},n=e=>{e.key===`Enter`&&this.$input.blur(),e.code===`ArrowUp`&&(e.preventDefault(),t(this._step*this._arrowKeyMultiplier(e))),e.code===`ArrowDown`&&(e.preventDefault(),t(this._step*this._arrowKeyMultiplier(e)*-1))},r=e=>{this._inputFocused&&(e.preventDefault(),t(this._step*this._normalizeMouseWheel(e)))},i=!1,a,o,s,c,l,u=e=>{a=e.clientX,o=s=e.clientY,i=!0,c=this.getValue(),l=0,window.addEventListener(`mousemove`,d),window.addEventListener(`mouseup`,f)},d=e=>{if(i){let t=e.clientX-a,n=e.clientY-o;Math.abs(n)>5?(e.preventDefault(),this.$input.blur(),i=!1,this._setDraggingStyle(!0,`vertical`)):Math.abs(t)>5&&f()}if(!i){let t=e.clientY-s;l-=t*this._step*this._arrowKeyMultiplier(e),c+l>this._max?l=this._max-c:c+l<this._min&&(l=this._min-c),this._snapClampSetValue(c+l)}s=e.clientY},f=()=>{this._setDraggingStyle(!1,`vertical`),this._callOnFinishChange(),window.removeEventListener(`mousemove`,d),window.removeEventListener(`mouseup`,f)};this.$input.addEventListener(`input`,e),this.$input.addEventListener(`keydown`,n),this.$input.addEventListener(`wheel`,r,{passive:!1}),this.$input.addEventListener(`mousedown`,u),this.$input.addEventListener(`focus`,()=>{this._inputFocused=!0}),this.$input.addEventListener(`blur`,()=>{this._inputFocused=!1,this.updateDisplay(),this._callOnFinishChange()})}_initSlider(){this._hasSlider=!0,this.$slider=document.createElement(`div`),this.$slider.classList.add(`lil-slider`),this.$fill=document.createElement(`div`),this.$fill.classList.add(`lil-fill`),this.$slider.appendChild(this.$fill),this.$widget.insertBefore(this.$slider,this.$input),this.domElement.classList.add(`lil-has-slider`);let e=(e,t,n,r,i)=>(e-t)/(n-t)*(i-r)+r,t=t=>{let n=this.$slider.getBoundingClientRect(),r=e(t,n.left,n.right,this._min,this._max);this._snapClampSetValue(r)},n=e=>{this._setDraggingStyle(!0),t(e.clientX),window.addEventListener(`mousemove`,r),window.addEventListener(`mouseup`,i)},r=e=>{t(e.clientX)},i=()=>{this._callOnFinishChange(),this._setDraggingStyle(!1),window.removeEventListener(`mousemove`,r),window.removeEventListener(`mouseup`,i)},a=!1,o,s,c=e=>{e.preventDefault(),this._setDraggingStyle(!0),t(e.touches[0].clientX),a=!1},l=e=>{e.touches.length>1||(this._hasScrollBar?(o=e.touches[0].clientX,s=e.touches[0].clientY,a=!0):c(e),window.addEventListener(`touchmove`,u,{passive:!1}),window.addEventListener(`touchend`,d))},u=e=>{if(a){let t=e.touches[0].clientX-o,n=e.touches[0].clientY-s;Math.abs(t)>Math.abs(n)?c(e):(window.removeEventListener(`touchmove`,u),window.removeEventListener(`touchend`,d))}else e.preventDefault(),t(e.touches[0].clientX)},d=()=>{this._callOnFinishChange(),this._setDraggingStyle(!1),window.removeEventListener(`touchmove`,u),window.removeEventListener(`touchend`,d)},f=this._callOnFinishChange.bind(this),p;this.$slider.addEventListener(`mousedown`,n),this.$slider.addEventListener(`touchstart`,l,{passive:!1}),this.$slider.addEventListener(`wheel`,e=>{if(Math.abs(e.deltaX)<Math.abs(e.deltaY)&&this._hasScrollBar)return;e.preventDefault();let t=this._normalizeMouseWheel(e)*this._step;this._snapClampSetValue(this.getValue()+t),this.$input.value=this.getValue(),clearTimeout(p),p=setTimeout(f,400)},{passive:!1})}_setDraggingStyle(e,t=`horizontal`){this.$slider&&this.$slider.classList.toggle(`lil-active`,e),document.body.classList.toggle(`lil-dragging`,e),document.body.classList.toggle(`lil-${t}`,e)}_getImplicitStep(){return this._hasMin&&this._hasMax?(this._max-this._min)/1e3:.1}_onUpdateMinMax(){!this._hasSlider&&this._hasMin&&this._hasMax&&(this._stepExplicit||this.step(this._getImplicitStep(),!1),this._initSlider(),this.updateDisplay())}_normalizeMouseWheel(e){let{deltaX:t,deltaY:n}=e;return Math.floor(e.deltaY)!==e.deltaY&&e.wheelDelta&&(t=0,n=-e.wheelDelta/120,n*=this._stepExplicit?1:10),t+-n}_arrowKeyMultiplier(e){let t=this._stepExplicit?1:10;return e.shiftKey?t*=10:e.altKey&&(t/=10),t}_snap(e){let t=0;return this._hasMin?t=this._min:this._hasMax&&(t=this._max),e-=t,e=Math.round(e/this._step)*this._step,e+=t,e=parseFloat(e.toPrecision(15)),e}_clamp(e){return e<this._min&&(e=this._min),e>this._max&&(e=this._max),e}_snapClampSetValue(e){this.setValue(this._clamp(this._snap(e)))}get _hasScrollBar(){let e=this.parent.root.$children;return e.scrollHeight>e.clientHeight}get _hasMin(){return this._min!==void 0}get _hasMax(){return this._max!==void 0}},Xp=class extends Bp{constructor(e,t,n,r){super(e,t,n,`lil-option`),this.$select=document.createElement(`select`),this.$select.setAttribute(`aria-labelledby`,this.$name.id),this.$display=document.createElement(`div`),this.$display.classList.add(`lil-display`),this.$select.addEventListener(`change`,()=>{this.setValue(this._values[this.$select.selectedIndex]),this._callOnFinishChange()}),this.$select.addEventListener(`focus`,()=>{this.$display.classList.add(`lil-focus`)}),this.$select.addEventListener(`blur`,()=>{this.$display.classList.remove(`lil-focus`)}),this.$widget.appendChild(this.$select),this.$widget.appendChild(this.$display),this.$disable=this.$select,this.options(r)}options(e){return this._values=Array.isArray(e)?e:Object.values(e),this._names=Array.isArray(e)?e:Object.keys(e),this.$select.replaceChildren(),this._names.forEach(e=>{let t=document.createElement(`option`);t.textContent=e,this.$select.appendChild(t)}),this.updateDisplay(),this}updateDisplay(){let e=this.getValue(),t=this._values.indexOf(e);return this.$select.selectedIndex=t,this.$display.textContent=t===-1?e:this._names[t],this}},Zp=class extends Bp{constructor(e,t,n){super(e,t,n,`lil-string`),this.$input=document.createElement(`input`),this.$input.setAttribute(`type`,`text`),this.$input.setAttribute(`spellcheck`,`false`),this.$input.setAttribute(`aria-labelledby`,this.$name.id),this.$input.addEventListener(`input`,()=>{this.setValue(this.$input.value)}),this.$input.addEventListener(`keydown`,e=>{e.code===`Enter`&&this.$input.blur()}),this.$input.addEventListener(`blur`,()=>{this._callOnFinishChange()}),this.$widget.appendChild(this.$input),this.$disable=this.$input,this.updateDisplay()}updateDisplay(){return this.$input.value=this.getValue(),this}},Qp=`.lil-gui {
  font-family: var(--font-family);
  font-size: var(--font-size);
  line-height: 1;
  font-weight: normal;
  font-style: normal;
  text-align: left;
  color: var(--text-color);
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  --background-color: #1f1f1f;
  --text-color: #ebebeb;
  --title-background-color: #111111;
  --title-text-color: #ebebeb;
  --widget-color: #424242;
  --hover-color: #4f4f4f;
  --focus-color: #595959;
  --number-color: #2cc9ff;
  --string-color: #a2db3c;
  --font-size: 11px;
  --input-font-size: 11px;
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  --font-family-mono: Menlo, Monaco, Consolas, "Droid Sans Mono", monospace;
  --padding: 4px;
  --spacing: 4px;
  --widget-height: 20px;
  --title-height: calc(var(--widget-height) + var(--spacing) * 1.25);
  --name-width: 45%;
  --slider-knob-width: 2px;
  --slider-input-width: 27%;
  --color-input-width: 27%;
  --slider-input-min-width: 45px;
  --color-input-min-width: 45px;
  --folder-indent: 7px;
  --widget-padding: 0 0 0 3px;
  --widget-border-radius: 2px;
  --checkbox-size: calc(0.75 * var(--widget-height));
  --scrollbar-width: 5px;
}
.lil-gui, .lil-gui * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
.lil-gui.lil-root {
  width: var(--width, 245px);
  display: flex;
  flex-direction: column;
  background: var(--background-color);
}
.lil-gui.lil-root > .lil-title {
  background: var(--title-background-color);
  color: var(--title-text-color);
}
.lil-gui.lil-root > .lil-children {
  overflow-x: hidden;
  overflow-y: auto;
}
.lil-gui.lil-root > .lil-children::-webkit-scrollbar {
  width: var(--scrollbar-width);
  height: var(--scrollbar-width);
  background: var(--background-color);
}
.lil-gui.lil-root > .lil-children::-webkit-scrollbar-thumb {
  border-radius: var(--scrollbar-width);
  background: var(--focus-color);
}
@media (pointer: coarse) {
  .lil-gui.lil-allow-touch-styles, .lil-gui.lil-allow-touch-styles .lil-gui {
    --widget-height: 28px;
    --padding: 6px;
    --spacing: 6px;
    --font-size: 13px;
    --input-font-size: 16px;
    --folder-indent: 10px;
    --scrollbar-width: 7px;
    --slider-input-min-width: 50px;
    --color-input-min-width: 65px;
  }
}
.lil-gui.lil-force-touch-styles, .lil-gui.lil-force-touch-styles .lil-gui {
  --widget-height: 28px;
  --padding: 6px;
  --spacing: 6px;
  --font-size: 13px;
  --input-font-size: 16px;
  --folder-indent: 10px;
  --scrollbar-width: 7px;
  --slider-input-min-width: 50px;
  --color-input-min-width: 65px;
}
.lil-gui.lil-auto-place, .lil-gui.autoPlace {
  max-height: 100%;
  position: fixed;
  top: 0;
  right: 15px;
  z-index: 1001;
}

.lil-controller {
  display: flex;
  align-items: center;
  padding: 0 var(--padding);
  margin: var(--spacing) 0;
}
.lil-controller.lil-disabled {
  opacity: 0.5;
}
.lil-controller.lil-disabled, .lil-controller.lil-disabled * {
  pointer-events: none !important;
}
.lil-controller > .lil-name {
  min-width: var(--name-width);
  flex-shrink: 0;
  white-space: pre;
  padding-right: var(--spacing);
  line-height: var(--widget-height);
}
.lil-controller .lil-widget {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: var(--widget-height);
}
.lil-controller.lil-string input {
  color: var(--string-color);
}
.lil-controller.lil-boolean {
  cursor: pointer;
}
.lil-controller.lil-color .lil-display {
  width: 100%;
  height: var(--widget-height);
  border-radius: var(--widget-border-radius);
  position: relative;
}
@media (hover: hover) {
  .lil-controller.lil-color .lil-display:hover:before {
    content: " ";
    display: block;
    position: absolute;
    border-radius: var(--widget-border-radius);
    border: 1px solid #fff9;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
  }
}
.lil-controller.lil-color input[type=color] {
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.lil-controller.lil-color input[type=text] {
  margin-left: var(--spacing);
  font-family: var(--font-family-mono);
  min-width: var(--color-input-min-width);
  width: var(--color-input-width);
  flex-shrink: 0;
}
.lil-controller.lil-option select {
  opacity: 0;
  position: absolute;
  width: 100%;
  max-width: 100%;
}
.lil-controller.lil-option .lil-display {
  position: relative;
  pointer-events: none;
  border-radius: var(--widget-border-radius);
  height: var(--widget-height);
  line-height: var(--widget-height);
  max-width: 100%;
  overflow: hidden;
  word-break: break-all;
  padding-left: 0.55em;
  padding-right: 1.75em;
  background: var(--widget-color);
}
@media (hover: hover) {
  .lil-controller.lil-option .lil-display.lil-focus {
    background: var(--focus-color);
  }
}
.lil-controller.lil-option .lil-display.lil-active {
  background: var(--focus-color);
}
.lil-controller.lil-option .lil-display:after {
  font-family: "lil-gui";
  content: "↕";
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  padding-right: 0.375em;
}
.lil-controller.lil-option .lil-widget,
.lil-controller.lil-option select {
  cursor: pointer;
}
@media (hover: hover) {
  .lil-controller.lil-option .lil-widget:hover .lil-display {
    background: var(--hover-color);
  }
}
.lil-controller.lil-number input {
  color: var(--number-color);
}
.lil-controller.lil-number.lil-has-slider input {
  margin-left: var(--spacing);
  width: var(--slider-input-width);
  min-width: var(--slider-input-min-width);
  flex-shrink: 0;
}
.lil-controller.lil-number .lil-slider {
  width: 100%;
  height: var(--widget-height);
  background: var(--widget-color);
  border-radius: var(--widget-border-radius);
  padding-right: var(--slider-knob-width);
  overflow: hidden;
  cursor: ew-resize;
  touch-action: pan-y;
}
@media (hover: hover) {
  .lil-controller.lil-number .lil-slider:hover {
    background: var(--hover-color);
  }
}
.lil-controller.lil-number .lil-slider.lil-active {
  background: var(--focus-color);
}
.lil-controller.lil-number .lil-slider.lil-active .lil-fill {
  opacity: 0.95;
}
.lil-controller.lil-number .lil-fill {
  height: 100%;
  border-right: var(--slider-knob-width) solid var(--number-color);
  box-sizing: content-box;
}

.lil-dragging .lil-gui {
  --hover-color: var(--widget-color);
}
.lil-dragging * {
  cursor: ew-resize !important;
}
.lil-dragging.lil-vertical * {
  cursor: ns-resize !important;
}

.lil-gui .lil-title {
  height: var(--title-height);
  font-weight: 600;
  padding: 0 var(--padding);
  width: 100%;
  text-align: left;
  background: none;
  text-decoration-skip: objects;
}
.lil-gui .lil-title:before {
  font-family: "lil-gui";
  content: "▾";
  padding-right: 2px;
  display: inline-block;
}
.lil-gui .lil-title:active {
  background: var(--title-background-color);
  opacity: 0.75;
}
@media (hover: hover) {
  body:not(.lil-dragging) .lil-gui .lil-title:hover {
    background: var(--title-background-color);
    opacity: 0.85;
  }
  .lil-gui .lil-title:focus {
    text-decoration: underline var(--focus-color);
  }
}
.lil-gui.lil-root > .lil-title:focus {
  text-decoration: none !important;
}
.lil-gui.lil-closed > .lil-title:before {
  content: "▸";
}
.lil-gui.lil-closed > .lil-children {
  transform: translateY(-7px);
  opacity: 0;
}
.lil-gui.lil-closed:not(.lil-transition) > .lil-children {
  display: none;
}
.lil-gui.lil-transition > .lil-children {
  transition-duration: 300ms;
  transition-property: height, opacity, transform;
  transition-timing-function: cubic-bezier(0.2, 0.6, 0.35, 1);
  overflow: hidden;
  pointer-events: none;
}
.lil-gui .lil-children:empty:before {
  content: "Empty";
  padding: 0 var(--padding);
  margin: var(--spacing) 0;
  display: block;
  height: var(--widget-height);
  font-style: italic;
  line-height: var(--widget-height);
  opacity: 0.5;
}
.lil-gui.lil-root > .lil-children > .lil-gui > .lil-title {
  border: 0 solid var(--widget-color);
  border-width: 1px 0;
  transition: border-color 300ms;
}
.lil-gui.lil-root > .lil-children > .lil-gui.lil-closed > .lil-title {
  border-bottom-color: transparent;
}
.lil-gui + .lil-controller {
  border-top: 1px solid var(--widget-color);
  margin-top: 0;
  padding-top: var(--spacing);
}
.lil-gui .lil-gui .lil-gui > .lil-title {
  border: none;
}
.lil-gui .lil-gui .lil-gui > .lil-children {
  border: none;
  margin-left: var(--folder-indent);
  border-left: 2px solid var(--widget-color);
}
.lil-gui .lil-gui .lil-controller {
  border: none;
}

.lil-gui label, .lil-gui input, .lil-gui button {
  -webkit-tap-highlight-color: transparent;
}
.lil-gui input {
  border: 0;
  outline: none;
  font-family: var(--font-family);
  font-size: var(--input-font-size);
  border-radius: var(--widget-border-radius);
  height: var(--widget-height);
  background: var(--widget-color);
  color: var(--text-color);
  width: 100%;
}
@media (hover: hover) {
  .lil-gui input:hover {
    background: var(--hover-color);
  }
  .lil-gui input:active {
    background: var(--focus-color);
  }
}
.lil-gui input:disabled {
  opacity: 1;
}
.lil-gui input[type=text],
.lil-gui input[type=number] {
  padding: var(--widget-padding);
  -moz-appearance: textfield;
}
.lil-gui input[type=text]:focus,
.lil-gui input[type=number]:focus {
  background: var(--focus-color);
}
.lil-gui input[type=checkbox] {
  appearance: none;
  width: var(--checkbox-size);
  height: var(--checkbox-size);
  border-radius: var(--widget-border-radius);
  text-align: center;
  cursor: pointer;
}
.lil-gui input[type=checkbox]:checked:before {
  font-family: "lil-gui";
  content: "✓";
  font-size: var(--checkbox-size);
  line-height: var(--checkbox-size);
}
@media (hover: hover) {
  .lil-gui input[type=checkbox]:focus {
    box-shadow: inset 0 0 0 1px var(--focus-color);
  }
}
.lil-gui button {
  outline: none;
  cursor: pointer;
  font-family: var(--font-family);
  font-size: var(--font-size);
  color: var(--text-color);
  width: 100%;
  border: none;
}
.lil-gui .lil-controller button {
  height: var(--widget-height);
  text-transform: none;
  background: var(--widget-color);
  border-radius: var(--widget-border-radius);
}
@media (hover: hover) {
  .lil-gui .lil-controller button:hover {
    background: var(--hover-color);
  }
  .lil-gui .lil-controller button:focus {
    box-shadow: inset 0 0 0 1px var(--focus-color);
  }
}
.lil-gui .lil-controller button:active {
  background: var(--focus-color);
}

@font-face {
  font-family: "lil-gui";
  src: url("data:application/font-woff2;charset=utf-8;base64,d09GMgABAAAAAALkAAsAAAAABtQAAAKVAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHFQGYACDMgqBBIEbATYCJAMUCwwABCAFhAoHgQQbHAbIDiUFEYVARAAAYQTVWNmz9MxhEgodq49wYRUFKE8GWNiUBxI2LBRaVnc51U83Gmhs0Q7JXWMiz5eteLwrKwuxHO8VFxUX9UpZBs6pa5ABRwHA+t3UxUnH20EvVknRerzQgX6xC/GH6ZUvTcAjAv122dF28OTqCXrPuyaDER30YBA1xnkVutDDo4oCi71Ca7rrV9xS8dZHbPHefsuwIyCpmT7j+MnjAH5X3984UZoFFuJ0yiZ4XEJFxjagEBeqs+e1iyK8Xf/nOuwF+vVK0ur765+vf7txotUi0m3N0m/84RGSrBCNrh8Ee5GjODjF4gnWP+dJrH/Lk9k4oT6d+gr6g/wssA2j64JJGP6cmx554vUZnpZfn6ZfX2bMwPPrlANsB86/DiHjhl0OP+c87+gaJo/gY084s3HoYL/ZkWHTRfBXvvoHnnkHvngKun4KBE/ede7tvq3/vQOxDXB1/fdNz6XbPdcr0Vhpojj9dG+owuSKFsslCi1tgEjirjXdwMiov2EioadxmqTHUCIwo8NgQaeIasAi0fTYSPTbSmwbMOFduyh9wvBrESGY0MtgRjtgQR8Q1bRPohn2UoCRZf9wyYANMXFeJTysqAe0I4mrherOekFdKMrYvJjLvOIUM9SuwYB5DVZUwwVjJJOaUnZCmcEkIZZrKqNvRGRMvmFZsmhP4VMKCSXBhSqUBxgMS7h0cZvEd71AWkEhGWaeMFcNnpqyJkyXgYL7PQ1MoSq0wDAkRtJIijkZSmqYTiSImfLiSWXIZwhRh3Rug2X0kk1Dgj+Iu43u5p98ghopcpSo0Uyc8SnjlYX59WUeaMoDqmVD2TOWD9a4pCRAzf2ECgwGcrHjPOWY9bNxq/OL3I/QjwEAAAA=") format("woff2");
}`;function $p(e){let t=document.createElement(`style`);t.innerHTML=e;let n=document.querySelector(`head link[rel=stylesheet], head style`);n?document.head.insertBefore(t,n):document.head.appendChild(t)}var em=!1,tm=class e{constructor({parent:e,autoPlace:t=e===void 0,container:n,width:r,title:i=`Controls`,closeFolders:a=!1,injectStyles:o=!0,touchStyles:s=!0}={}){if(this.parent=e,this.root=e?e.root:this,this.children=[],this.controllers=[],this.folders=[],this._closed=!1,this._hidden=!1,this.domElement=document.createElement(`div`),this.domElement.classList.add(`lil-gui`),this.$title=document.createElement(`button`),this.$title.classList.add(`lil-title`),this.$title.setAttribute(`aria-expanded`,!0),this.$title.addEventListener(`click`,()=>this.openAnimated(this._closed)),this.$title.addEventListener(`touchstart`,()=>{},{passive:!0}),this.$children=document.createElement(`div`),this.$children.classList.add(`lil-children`),this.domElement.appendChild(this.$title),this.domElement.appendChild(this.$children),this.title(i),this.parent){this.parent.children.push(this),this.parent.folders.push(this),this.parent.$children.appendChild(this.domElement);return}this.domElement.classList.add(`lil-root`),s&&this.domElement.classList.add(`lil-allow-touch-styles`),!em&&o&&($p(Qp),em=!0),n?n.appendChild(this.domElement):t&&(this.domElement.classList.add(`lil-auto-place`,`autoPlace`),document.body.appendChild(this.domElement)),r&&this.domElement.style.setProperty(`--width`,r+`px`),this._closeFolders=a}add(e,t,n,r,i){if(Object(n)===n)return new Xp(this,e,t,n);let a=e[t];switch(typeof a){case`number`:return new Yp(this,e,t,n,r,i);case`boolean`:return new Vp(this,e,t);case`string`:return new Zp(this,e,t);case`function`:return new Jp(this,e,t)}console.error(`gui.add failed
	property:`,t,`
	object:`,e,`
	value:`,a)}addColor(e,t,n=1){return new qp(this,e,t,n)}addFolder(t){let n=new e({parent:this,title:t});return this.root._closeFolders&&n.close(),n}load(e,t=!0){return e.controllers&&this.controllers.forEach(t=>{t instanceof Jp||t._name in e.controllers&&t.load(e.controllers[t._name])}),t&&e.folders&&this.folders.forEach(t=>{t._title in e.folders&&t.load(e.folders[t._title])}),this}save(e=!0){let t={controllers:{},folders:{}};return this.controllers.forEach(e=>{if(!(e instanceof Jp)){if(e._name in t.controllers)throw Error(`Cannot save GUI with duplicate property "${e._name}"`);t.controllers[e._name]=e.save()}}),e&&this.folders.forEach(e=>{if(e._title in t.folders)throw Error(`Cannot save GUI with duplicate folder "${e._title}"`);t.folders[e._title]=e.save()}),t}open(e=!0){return this._setClosed(!e),this.$title.setAttribute(`aria-expanded`,!this._closed),this.domElement.classList.toggle(`lil-closed`,this._closed),this}close(){return this.open(!1)}_setClosed(e){this._closed!==e&&(this._closed=e,this._callOnOpenClose(this))}show(e=!0){return this._hidden=!e,this.domElement.style.display=this._hidden?`none`:``,this}hide(){return this.show(!1)}openAnimated(e=!0){return this._setClosed(!e),this.$title.setAttribute(`aria-expanded`,!this._closed),requestAnimationFrame(()=>{let t=this.$children.clientHeight;this.$children.style.height=t+`px`,this.domElement.classList.add(`lil-transition`);let n=e=>{e.target===this.$children&&(this.$children.style.height=``,this.domElement.classList.remove(`lil-transition`),this.$children.removeEventListener(`transitionend`,n))};this.$children.addEventListener(`transitionend`,n);let r=e?this.$children.scrollHeight:0;this.domElement.classList.toggle(`lil-closed`,!e),requestAnimationFrame(()=>{this.$children.style.height=r+`px`})}),this}title(e){return this._title=e,this.$title.textContent=e,this}reset(e=!0){return(e?this.controllersRecursive():this.controllers).forEach(e=>e.reset()),this}onChange(e){return this._onChange=e,this}_callOnChange(e){this.parent&&this.parent._callOnChange(e),this._onChange!==void 0&&this._onChange.call(this,{object:e.object,property:e.property,value:e.getValue(),controller:e})}onFinishChange(e){return this._onFinishChange=e,this}_callOnFinishChange(e){this.parent&&this.parent._callOnFinishChange(e),this._onFinishChange!==void 0&&this._onFinishChange.call(this,{object:e.object,property:e.property,value:e.getValue(),controller:e})}onOpenClose(e){return this._onOpenClose=e,this}_callOnOpenClose(e){this.parent&&this.parent._callOnOpenClose(e),this._onOpenClose!==void 0&&this._onOpenClose.call(this,e)}destroy(){this.parent&&(this.parent.children.splice(this.parent.children.indexOf(this),1),this.parent.folders.splice(this.parent.folders.indexOf(this),1)),this.domElement.parentElement&&this.domElement.parentElement.removeChild(this.domElement),Array.from(this.children).forEach(e=>e.destroy())}controllersRecursive(){let e=Array.from(this.controllers);return this.folders.forEach(t=>{e=e.concat(t.controllersRecursive())}),e}foldersRecursive(){let e=Array.from(this.folders);return this.folders.forEach(t=>{e=e.concat(t.foldersRecursive())}),e}},nm=class{gui;fpsEl;frames=0;acc=0;worst=0;info=``;constructor(e){this.gui=new tm({title:`World`}),this.gui.close(),this.gui.domElement.style.setProperty(`--width`,`270px`);let t={seed:e.getSeed(),regenerate:()=>e.setSeed(t.seed),random:()=>{e.randomSeed(),t.seed=e.getSeed(),this.gui.controllersRecursive().forEach(e=>e.updateDisplay())}},n=this.gui.addFolder(`Seed`);n.add(t,`seed`).name(`seed`).onFinishChange(t=>e.setSeed(t)),n.add(t,`regenerate`),n.add(t,`random`).name(`random seed`);let r=this.gui.addFolder(`Time of day`);r.add(e.env,`hour`,0,24,.01).name(`hour`).listen(),r.add(e.env,`dayMinutes`,1,60,1).name(`minutes / day`),r.add(e.env,`paused`);let i={palette:`auto`},a={"Auto (time of day)":`auto`};for(let[e,t]of Object.entries(Pl))a[t.name]=e;r.add(i,`palette`,a).name(`palette`).onChange(t=>e.env.paletteOverride=t===`auto`?null:t);let o=this.gui.addFolder(`Palette`);o.add(Ou,`gradeScale`,0,1.6,.01).name(`mono grade`);let s={band1:cu.uBand1.value,band2:cu.uBand2.value};o.add(s,`band1`,-.5,.9,.01).name(`light band`).onChange(e=>cu.uBand1.value=e),o.add(s,`band2`,-.8,.5,.01).name(`shade band`).onChange(e=>cu.uBand2.value=e);let c={meadow:`#`+lu.cMeadow.value.getHexString(),forest:`#`+lu.cForest.value.getHexString(),heath:`#`+lu.cHeath.value.getHexString(),rock:`#`+lu.cRock.value.getHexString(),foliage:`#`+gu[0].getHexString(),cabin:`#`+gu[7].getHexString()};o.addColor(c,`meadow`).onChange(e=>lu.cMeadow.value.set(e)),o.addColor(c,`forest`).onChange(e=>lu.cForest.value.set(e)),o.addColor(c,`heath`).onChange(e=>lu.cHeath.value.set(e)),o.addColor(c,`rock`).onChange(e=>lu.cRock.value.set(e)),o.addColor(c,`foliage`).onChange(e=>gu[0].set(e)),o.addColor(c,`cabin`).onChange(e=>gu[7].set(e)),o.close();let l=this.gui.addFolder(`Fog`);l.add(Ou,`fogDensity`,0,.0015,1e-5).name(`density`),l.add(Ou,`fogBands`,0,12,1).name(`bands (0 = smooth)`),l.add(Ou,`layeredFog`).name(`fog per layer`),l.add(Ou,`fogHeight`,0,1,.01).name(`valley mist`),l.add(Ou,`fogFalloff`,5,200,1).name(`mist height x4`),l.add(Ou,`fogMax`,0,1,.01).name(`max`),l.add(Ou,`fogStart`,0,400,1).name(`start`);let u=this.gui.addFolder(`Outline`);u.add(Ou,`outline`).name(`enabled`),u.add(Ou,`outlineWidth`,.5,3,.05).name(`width (px)`),u.add(Ou,`depthThreshold`,.005,.3,.001).name(`depth sensitivity`),u.add(Ou,`normalThreshold`,.05,1.5,.01).name(`crease sensitivity`),u.add(Ou,`outlineFadeStart`,0,2e3,10).name(`fade start`),u.add(Ou,`outlineFadeEnd`,100,8e3,10).name(`fade end`);let d=this.gui.addFolder(`Render`);d.add(Ou,`bloom`,0,3,.01).name(`window bloom`),d.add(Ou,`renderScale`,.5,2,.05).name(`resolution scale`),d.add(Ou,`adaptive`).name(`adaptive resolution`),d.add(Ou,`fxaa`).name(`FXAA`),d.add(e.terrain.settings,`splitFactor`,1.2,4,.05).name(`terrain detail`),d.add(e.terrain.settings,`showProps`).name(`props`),d.add(e.terrain.settings,`showGround`).name(`ground`),d.add(e.colliders,`enabled`).name(`prop collision`);let f={on:lu.uStrokes.value>.5};d.add(f,`on`).name(`ground strokes`).onChange(e=>lu.uStrokes.value=+!!e),d.close();let p=this.gui.addFolder(`Creatures`);p.add(e.mobs.settings,`enabled`).name(`creatures`),p.add(e.mobs.settings,`density`,0,4,.05).name(`wild density`),p.add(e.mobs.settings,`freeze`).name(`freeze brains`),p.add({w:()=>e.spawnFlock(`floof`)},`w`).name(`spawn floofs here`),p.add({c:()=>e.spawnFlock(`crow`)},`c`).name(`spawn crows here`);let m={plump:e.crowPlump.get()};p.add(m,`plump`,0,1,.01).name(`crow roundness`).onFinishChange(t=>e.crowPlump.set(t)),p.add(e.bikes.settings,`enabled`).name(`bicycles`),p.close();let h=this.gui.addFolder(`Player`),g={mode:e.modeName()};h.add(g,`mode`,[`walk`,`glide`,`fly`,`swim`,`ride`,`bike`]).name(`mode (F = fly)`).onChange(t=>e.setMode(t)).listen(),setInterval(()=>g.mode=e.modeName(),250),h.add(e.character,`eyeType`,[`dot`,`round`]).name(`eyes`).listen();let _=h.addFolder(`Face (round eyes)`),v=e.character.faceValues,y={},b={};try{b=JSON.parse(localStorage.getItem(`ow.face.v2`)??`{}`)}catch{}let x=()=>{try{localStorage.setItem(`ow.face.v2`,JSON.stringify(y))}catch{}};_.add({"face cam":!1},`face cam`).onChange(t=>{t&&(e.character.eyeType=`round`),e.faceCam(t)}),ru.forEach((e,t)=>{y[e.key]=typeof b[e.key]==`number`?b[e.key]:e.value,v[t]=y[e.key],_.add(y,e.key,e.min,e.max,e.step).onChange(e=>{v[t]=e,x()})}),_.add({copy:()=>{let e=JSON.stringify(y,null,2);console.log(e),navigator.clipboard?.writeText(e).catch(()=>void 0)}},`copy`).name(`copy values`),_.add({reset:()=>{ru.forEach((e,t)=>{y[e.key]=e.value,v[t]=e.value}),x(),_.controllersRecursive().forEach(e=>e.updateDisplay())}},`reset`).name(`reset face`),_.close();let S=new Set([`seed`,`hour`,`mode`]);this.gui.add({reset:()=>this.gui.controllersRecursive().filter(e=>!S.has(e.property)&&typeof e.initialValue!=`function`).forEach(e=>e.reset())},`reset`).name(`reset to defaults`),this.fpsEl=document.createElement(`div`),this.fpsEl.id=`fps`,document.body.appendChild(this.fpsEl)}toggle(){let e=this.gui._hidden;this.gui.show(e),this.fpsEl.style.display=e?``:`none`;let t=document.getElementById(`help`);t&&(t.style.display=e?``:`none`)}hide(){this.gui.hide(),this.fpsEl.style.display=`none`}tick(e,t){if(this.frames++,this.acc+=e,this.worst=Math.max(this.worst,e),this.acc>=.5){let e=this.frames/this.acc;this.info=`${e.toFixed(0)} fps · ${(1e3*this.acc/this.frames).toFixed(1)} ms · worst ${(this.worst*1e3).toFixed(0)} ms\n${t()}`,this.fpsEl.textContent=this.info,this.frames=0,this.acc=0,this.worst=0}}},rm=.315,im=rm,am=new W(0,im,-1/2),om=new W(0,im,1/2),sm=new W(0,.27,-.08),cm=.13,lm=.15,um=new W(0,.5,.385),dm=new W(0,.66,.33),fm=dm.clone().sub(um).normalize(),pm=new W(0,.735,-.27),mm=new W(.243,.868,.185),hm=new W(.05,.265,-.2),gm=.2,_m=[`#b5493b`,`#3f7a74`,`#d19a3e`,`#56699a`,`#7d5a86`],Z={frame:`#ffffff`,cream:`#eee3cf`,tyre:`#4f3a35`,metal:`#cfc6b8`,dark:`#5a4a44`,leather:`#74492f`,wicker:`#c99b5e`,wickerDark:`#8f693f`,lamp:`#f3e8cc`,apple:`#c2553f`,bread:`#d9a760`,leaf:`#6f7d47`};function vm(e,t,n=0){return Rd(e,t,n,t===Z.frame)}var ym=new W(0,1,0);function bm(e,t,n,r,i=10,a=!0){let o=t.clone().sub(e),s=o.length(),c=new bi(n,n,s,i,1,!0);c.translate(0,s/2,0),c.applyQuaternion(new Ot().setFromUnitVectors(ym,o.normalize())),c.translate(e.x,e.y,e.z);let l=[vm(c,r)];if(a)for(let a of[e,t])l.push(vm(new $i(n,i,6).translate(a.x,a.y,a.z),r));return l}function xm(e,t,n,r=24){let i=[vm(new ta(new Mi(e,!1,`centripetal`),r,t,10,!1),n)];for(let r of[e[0],e[e.length-1]])i.push(vm(new $i(t,10,6).translate(r.x,r.y,r.z),n));return i}function Sm(e,t,n,r,i,a=0){let o=[];for(let s=0;s<=i;s++){let c=n+(r-n)*s/i;o.push(new W(e.x+a,e.y+Math.sin(c)*t,e.z+Math.cos(c)*t))}return o}function Cm(e,t,n){let r=.355,i=[new ta(new Mi(Sm(new W,r,t,n,12)),28,.03,10,!1)];for(let e of[t,n])i.push(new $i(.03,10,6).translate(0,Math.sin(e)*r,Math.cos(e)*r));return i.map(t=>vm(t.scale(1.9,1,1).translate(e.x,e.y,e.z),Z.cream))}function wm(){let e=(e,t,n)=>new W(e,t,n),t=.028,n=[];n.push(...xm([e(0,.52,.37),e(0,.38,.2),e(0,.29,.03),sm],t,Z.frame,24)),n.push(...xm([e(0,.62,.345),e(0,.47,.16),e(0,.39,-.02),e(0,.43,-.15)],t*.85,Z.frame,24)),n.push(...bm(um.clone().addScaledVector(fm,-.02),dm,.036,Z.frame,12));let r=e(0,.575,-.215);n.push(...bm(sm,r,t,Z.frame,10));for(let t of[1,-1]){let r=e(.055*t,im,am.z);n.push(...bm(e(.04*t,sm.y,sm.z-.02),r,.016,Z.frame,8)),n.push(...bm(e(.025*t,.55,-.225),r,.015,Z.frame,8)),n.push(...bm(r,e(.075*t,.6,-.56),.009,Z.metal,6))}n.push(...bm(r,e(0,.625,-.232),.017,Z.metal,8)),n.push(vm(new $i(1,20,12).scale(.095,.034,.105).translate(0,.645,-.26),Z.leather)),n.push(vm(new $i(1,16,10).scale(.04,.028,.085).translate(0,.648,-.17),Z.leather));for(let e of[1,-1])n.push(vm(new ea(.018,.006,6,10).rotateY(Math.PI/2).translate(.045*e,.61,-.29),Z.metal));n.push(vm(new Vu(.17,.018,.26,2,.008).translate(0,.6,-.58),Z.metal)),n.push(...Cm(am,Math.PI*.3,Math.PI*1.12));let i=new Vu(.016,.1,.5,3,.007);return i.rotateX(Math.atan2(am.y-sm.y,sm.z-am.z)),i.translate(-.075,(sm.y+am.y)/2+.025,(sm.z+am.z)/2-.02),n.push(vm(i,Z.cream)),n.push(vm(new bi(.04,.04,.012,14).rotateZ(Math.PI/2).translate(-.07,am.y,am.z),Z.metal)),zd(n)}function Tm(){let e=(e,t,n)=>new W(e,t,n),t=[],n=um.clone().addScaledVector(fm,-.035);t.push(vm(new Vu(.15,.04,.06,2,.015).translate(n.x,n.y,n.z),Z.frame));for(let r of[1,-1])t.push(...xm([e(.055*r,n.y,n.z),e(.057*r,.41,.46),e(.057*r,om.y,om.z)],.017,Z.frame,12));let r=dm.clone().addScaledVector(fm,.17);t.push(...bm(dm,r,.019,Z.metal,8));let i=e(0,r.y+.01,r.z+.035);t.push(...bm(r,i,.019,Z.metal,8));for(let n of[1,-1])t.push(...xm([i,e(.11*n,i.y+.004,i.z+.002),e(.2*n,.858,.3),e(.237*n,.864,.24),e(mm.x*n,mm.y,.2)],.016,Z.metal,16)),t.push(...bm(e(mm.x*n,mm.y,.235),e((mm.x+.004)*n,mm.y+.002,.13),.025,Z.leather,10));t.push(vm(new $i(.026,12,8,0,Math.PI*2,0,Math.PI*.55).translate(.13,.875,.335),Z.metal));let a=e(0,.765,.56);t.push(...bm(e(.08,n.y-.02,n.z+.02),e(.1,a.y-.1,a.z-.05),.008,Z.metal,6)),t.push(...bm(e(-.08,n.y-.02,n.z+.02),e(-.1,a.y-.1,a.z-.05),.008,Z.metal,6)),t.push(vm(new Vu(.34,.2,.25,3,.04).translate(a.x,a.y,a.z),Z.wicker)),t.push(vm(new ea(1,.1,6,24).scale(.16,.115,.14).rotateX(Math.PI/2).translate(a.x,a.y+.1,a.z),Z.wickerDark)),t.push(vm(new Vu(.3,.02,.21,2,.008).translate(a.x,a.y+.085,a.z),Z.wickerDark)),t.push(vm(new yi(.045,.2,4,12).rotateX(.9).rotateY(.35).translate(a.x+.07,a.y+.15,a.z-.01),Z.bread)),t.push(vm(new $i(.048,14,10).translate(a.x-.075,a.y+.115,a.z+.04),Z.apple)),t.push(vm(new $i(.044,14,10).translate(a.x-.02,a.y+.11,a.z+.07),Z.apple)),t.push(vm(new $i(1,8,6).scale(.025,.008,.04).rotateX(-.5).translate(a.x-.07,a.y+.17,a.z+.05),Z.leaf));let o=e(0,a.y-.02,a.z+.15);return t.push(vm(Bd([[.001,-.05],[.028,-.045],[.042,-.01],[.046,.02]],16).rotateX(Math.PI/2).translate(o.x,o.y,o.z),Z.cream)),t.push(vm(new $i(.043,16,8,0,Math.PI*2,0,Math.PI*.35).rotateX(Math.PI/2).translate(o.x,o.y,o.z+.005),Z.lamp,3)),t.push(...Cm(om,-Math.PI*.08,Math.PI*.72)),zd(t).translate(-um.x,-um.y,-um.z)}function Em(){let e=[];e.push(vm(new ea(.28500000000000003,.03,10,48).rotateY(Math.PI/2),Z.tyre)),e.push(vm(new ea(.253,.011,6,48).rotateY(Math.PI/2),Z.metal)),e.push(vm(new bi(.028,.028,.1,12).rotateZ(Math.PI/2),Z.metal));for(let t=0;t<10;t++){let n=t/10*Math.PI*2,r=t%2?1:-1,i=new W(.035*r,Math.sin(n)*.03,Math.cos(n)*.03),a=new W(.004*r,Math.sin(n+.25)*.245,Math.cos(n+.25)*.245);e.push(...bm(i,a,.0055,Z.metal,5,!1))}return zd(e)}function Dm(){let e=(e,t,n)=>new W(e,t,n),t=[];return t.push(...bm(e(-.085,0,0),e(.085,0,0),.02,Z.dark,8,!1)),t.push(...bm(e(-.085,0,0),e(-.085,0,cm),.014,Z.metal,8)),t.push(...bm(e(.085,0,0),e(.085,0,-.13),.014,Z.metal,8)),t.push(vm(new ea(.085,.012,6,28).rotateY(Math.PI/2).translate(-.07,0,0),Z.metal)),t.push(vm(new bi(.05,.05,.01,14).rotateZ(Math.PI/2).translate(-.07,0,0),Z.dark)),zd(t)}function Om(){return zd([vm(new Vu(.09,.026,.065,2,.01),Z.dark),vm(new bi(.008,.008,.13,6).rotateZ(Math.PI/2),Z.metal)])}function km(){let e=bm(new W(0,0,0),new W(0,-.3,0),.011,Z.metal,6);return e.push(vm(new Vu(.035,.012,.05,1,.005).translate(0,-.3,0),Z.dark)),zd(e)}var Am=null;function jm(e=24){if(Am)return Am;let t={keep:.72},n=new Hd(wm(),t,e),r=new Hd(Tm(),t,e),i=new Hd(Em(),t,e*2),a=new Hd(Dm(),t,e),o=new Hd(Om(),t,e*2),s=new Hd(km(),t,e);return Am={frame:n,steer:r,wheel:i,crank:a,pedal:o,kick:s,all:[n,r,i,a,o,s]},Am}var Mm=class{root=new Tn;steer=new Tn;front=new Tn;rear=new Tn;crank=new Tn;pedalL=new Tn;pedalR=new Tn;kick=new Tn;constructor(){let e=this.root;e.rotation.order=`YXZ`,this.steer.position.copy(um),this.front.position.copy(om).sub(um),this.steer.add(this.front),this.rear.position.copy(am),this.crank.position.copy(sm),this.pedalL.position.set(lm,0,-.13),this.pedalR.position.set(-.15,0,cm),this.crank.add(this.pedalL,this.pedalR),this.kick.position.copy(hm),e.add(this.steer,this.rear,this.crank,this.kick)}pose(e){this.root.position.copy(e.pos),this.root.rotation.set(-e.pitch,e.heading,-e.lean),this.steer.quaternion.setFromAxisAngle(fm,e.steer),this.front.rotation.x=e.roll,this.rear.rotation.x=e.roll,this.crank.rotation.x=e.crank,this.pedalL.rotation.x=this.pedalR.rotation.x=-e.crank;let t=e.stand;this.kick.rotation.set(H.lerp(1.42,.12,t),0,H.lerp(.02,.44,t)),this.root.updateMatrixWorld(!0)}emit(e,t){e.frame.push(this.root.matrixWorld,t),e.steer.push(this.steer.matrixWorld,t),e.wheel.push(this.front.matrixWorld,t),e.wheel.push(this.rear.matrixWorld,t),e.crank.push(this.crank.matrixWorld,t),e.pedal.push(this.pedalL.matrixWorld,t),e.pedal.push(this.pedalR.matrixWorld,t),e.kick.push(this.kick.matrixWorld,t)}pedal(e,t){return(e===`L`?this.pedalL:this.pedalR).localToWorld(t.set(0,.018,0))}grip(e,t){return t.set(e===`L`?mm.x:-mm.x,mm.y,mm.z).sub(um),this.steer.localToWorld(t)}seat(e){return this.root.localToWorld(e.copy(pm))}toWorld(e,t,n,r){return this.root.localToWorld(r.set(e,t,n))}},Nm=480,Pm=.13,Fm=380,Im=520,Lm=320,Rm=2.1,zm=class{gen;colliders;group=new En;settings={enabled:!0};bikes=new Map;stats={bikes:0,drawn:0};batches=jm();start=null;empty=new Set;scanT=0;frustum=new pi;pm=new Zt;sphere=new yr;lastCrank=0;footDown=0;pitchV=0;rider={pedalL:new W,pedalR:new W,gripL:new W,gripR:new W,foot:new W,footDown:0,standing:0,effort:0,crank:0};seat={pos:new W,quat:new Ot,spread:0,bike:this.rider};constructor(e,t){this.gen=e,this.colliders=t;for(let e of this.batches.all)this.group.add(e.mesh)}reset(e,t,n,r){this.gen=e,this.bikes.clear(),this.empty.clear(),this.scanT=0,this.start=this.startSpot(t,n,r)}open(e,t,n,r){let i=this.gen,a=i.height(e,t);if(a<2.5||a>170)return!1;let o=Math.sin(n),s=Math.cos(n);if(Math.abs(i.height(e+o*.6,t+s*.6)-i.height(e-o*.6,t-s*.6))>.3||Math.abs(i.height(e+s*.5,t-o*.5)-i.height(e-s*.5,t+o*.5))>.25||r&&(i.forestDensity(e,t,a)>.02||i.rockiness(e,t,a)>.3))return!1;let c=!0;return i.poiCellRange(e-40,t-40,e+40,t+40,n=>{Math.hypot(n.x-e,n.z-t)<Math.max(n.clear*.7,9)&&(c=!1)}),c}clearOfProps(e,t,n){let r=this.gen.height(e,t),i=Math.sin(n),a=Math.cos(n);for(let n of[.45,-.45]){let o=e+i*n,s=t+a*n;if(Bm.set(o,r,s),Vm.set(0,0,0),this.colliders.push(Bm,Vm,.35),Math.hypot(Bm.x-o,Bm.z-s)>.001||this.colliders.surface(o,s,r,.3)>r+.05||this.colliders.inBush(o,s,.3))return!1}return!0}spotInCell(e,t){let n=this.gen.seed;if(Y(e,t,n,811)>Pm)return null;let r=Ol(kl(e,t,n,812)),i=e*Nm,a=t*Nm,o=this.gen.pathsInRange(i,a,i+Nm,a+Nm,0);for(let e=0;e<8&&o.length;e++){let e=o[Math.floor(r()*o.length)],t=.15+r()*.7,n=r()<.5?1:-1,s=r()<.5?0:Math.PI,c=e.bx-e.ax,l=e.bz-e.az,u=Math.hypot(c,l);if(u<1)continue;let d=e.ax+c*t-l/u*n*1.35,f=e.az+l*t+c/u*n*1.35;if(d<i||d>=i+Nm||f<a||f>=a+Nm)continue;let p=Math.atan2(c,l)+s+(r()-.5)*.2;if(this.open(d,f,p,!1))return{x:d,z:f,heading:p}}for(let e=0;e<12;e++){let e=i+30+r()*420,t=a+30+r()*420,n=r()*Math.PI*2;if(this.open(e,t,n,!0))return{x:e,z:t,heading:n}}return null}startSpot(e,t,n){let r=n+Math.PI;for(let i of[5,6.5,4,8,10])for(let a of[.55,-.55,.9,-.9,.25,-.25,1.3,-1.3]){let o=r+a,s=e+Math.sin(o)*i,c=t+Math.cos(o)*i,l=n+(a>0?-1:1)*(Math.PI/2+.35);if(this.open(s,c,l,!1)&&this.clearOfProps(s,c,l))return{x:s,z:c,heading:l}}return null}create(e,t,n){let r=null;for(let e=0;e<4&&!r;e++)for(let n=0;n<(e?8:1);n++){let i=n/8*Math.PI*2,a=t.x+Math.cos(i)*e*1.2,o=t.z+Math.sin(i)*e*1.2;if(this.clearOfProps(a,o,t.heading)){r={x:a,z:o,heading:t.heading};break}}if(!r)return null;let i=kl(Math.round(r.x),Math.round(r.z),this.gen.seed,813),a={key:e,pos:new W(r.x,this.gen.height(r.x,r.z),r.z),heading:r.heading,pitch:0,lean:gm,steer:0,roll:i%628/100,crank:(i>>>10)%628/100,stand:1,tint:new K(_m[n%_m.length]),ridden:!1,moved:!1,restSteer:((i>>>20)%100/100-.5)*.7,skel:new Mm};return a.steer=a.restSteer,a.pitch=this.groundPitch(a),this.bikes.set(e,a),a}populate(e){for(let[t,n]of this.bikes)!n.moved&&!n.ridden&&Math.hypot(n.pos.x-e.x,n.pos.z-e.z)>Im&&this.bikes.delete(t);this.start&&!this.bikes.has(`start`)&&Math.hypot(this.start.x-e.x,this.start.z-e.z)<Fm&&this.create(`start`,this.start,0);let t=Math.floor((e.x-Fm)/Nm),n=Math.floor((e.x+Fm)/Nm),r=Math.floor((e.z-Fm)/Nm),i=Math.floor((e.z+Fm)/Nm);for(let a=r;a<=i;a++)for(let r=t;r<=n;r++){let t=`${r},${a}`;if(this.bikes.has(t)||this.empty.has(t))continue;let n=this.spotInCell(r,a);if(!n){this.empty.add(t);continue}Math.hypot(n.x-e.x,n.z-e.z)>Fm||this.create(t,n,1+kl(r,a,this.gen.seed,814)%16)||this.empty.add(t)}}mountable(e){if(!this.settings.enabled)return null;let t=null,n=Rm;for(let r of this.bikes.values()){if(r.ridden)continue;let i=Math.hypot(r.pos.x-e.x,r.pos.z-e.z);i<n&&Math.abs(r.pos.y-e.y)<1.2&&(n=i,t=r)}return t}mount(e,t,n){e.ridden=!0,e.moved=!0,t.pos.copy(e.pos),t.vel.set(0,0,0),t.heading=e.heading,t.grounded=!0,n.crank=e.crank,n.steer=e.steer,n.lean=e.lean,this.lastCrank=e.crank,this.footDown=1,this.pitchV=0}park(e,t){e.ridden=!1,t&&e.pos.copy(t),e.pos.y=this.gen.height(e.pos.x,e.pos.z),e.restSteer=e.steer*.5+.2}ride(e,t,n,r){let i=e=>1-Math.exp(-e*r),a=t.pos.x-e.pos.x,o=t.pos.z-e.pos.z;e.roll+=(a*Math.sin(t.heading)+o*Math.cos(t.heading))/rm,e.pos.copy(t.pos),e.heading=t.heading,e.steer=n.steer,e.stand+=(0-e.stand)*i(10);let s=t.grounded&&Math.abs(n.speed)<.7&&n.effort<.15;if(this.footDown+=(+!!s-this.footDown)*i(s?5:12),e.crank+=n.crank-this.lastCrank,this.lastCrank=n.crank,this.footDown>.3){let t=-.7,n=Math.atan2(Math.sin(t-e.crank),Math.cos(t-e.crank));e.crank+=n*i(3)*this.footDown}let c=Math.sin(e.crank)*.07*n.standing;e.lean=n.lean+.13*this.footDown+c;let l=t.grounded?this.groundPitch(e):H.clamp(Math.atan2(t.vel.y,Math.max(2,Math.hypot(t.vel.x,t.vel.z)))*.6,-.5,.5);this.pitchV+=((l-e.pitch)*180-this.pitchV*22)*r,e.pitch+=this.pitchV*r,t.grounded&&(e.pitch+=(l-e.pitch)*i(6)),e.skel.pose(e);let u=this.rider;e.skel.pedal(`L`,u.pedalL),e.skel.pedal(`R`,u.pedalR),e.skel.grip(`L`,u.gripL),e.skel.grip(`R`,u.gripR),e.skel.toWorld(.36,0,-.08,u.foot),u.foot.y=this.gen.height(u.foot.x,u.foot.z),u.footDown=this.footDown,u.standing=n.standing,u.effort=n.effort,u.crank=e.crank;let d=n.standing;e.skel.toWorld(pm.x-c*.2,pm.y+.1*d,pm.z+.07*d,this.seat.pos),this.seat.quat.copy(e.skel.root.quaternion)}groundPitch(e){let t=Math.sin(e.heading),n=Math.cos(e.heading),r=1/2,i=this.floor(e,e.pos.x+t*r,e.pos.z+n*r),a=this.floor(e,e.pos.x-t*r,e.pos.z-n*r);return Math.atan2(i-a,1)}floor(e,t,n){let r=this.gen.height(t,n);return e.ridden&&e.pos.y>r+.05?Math.max(r,this.colliders.ramp(t,n,.1,2.2)):r}push(e,t,n){for(let r of this.bikes.values()){if(r.ridden||Math.abs(r.pos.x-e.x)>3||Math.abs(r.pos.z-e.z)>3||e.y>r.pos.y+.9||e.y<r.pos.y-1)continue;let i=Math.sin(r.heading),a=Math.cos(r.heading);for(let o of[.33,-.33]){let s=e.x-(r.pos.x+i*o),c=e.z-(r.pos.z+a*o),l=Math.hypot(s,c),u=n+.27;if(l>=u||l<1e-4)continue;let d=s/l,f=c/l;e.x+=d*(u-l),e.z+=f*(u-l);let p=t.x*d+t.z*f;p<0&&(t.x-=d*p,t.z-=f*p)}}}update(e,t,n){let r=this.batches;for(let e of r.all)e.begin();if(!this.settings.enabled){for(let e of r.all)e.end();return}this.scanT-=e,this.scanT<=0&&(this.populate(t),this.scanT=.5);let i=t=>1-Math.exp(-t*e);n.updateMatrixWorld(),this.pm.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this.frustum.setFromProjectionMatrix(this.pm);let a=0;for(let e of this.bikes.values())e.ridden||(e.stand+=(1-e.stand)*i(9),e.lean+=(gm-e.lean)*i(e.stand>.8?7:2),e.steer+=(e.restSteer-e.steer)*i(3),e.pitch+=(this.groundPitch(e)-e.pitch)*i(8)),!(e.pos.distanceTo(n.position)>Lm&&!e.ridden)&&(this.sphere.center.set(e.pos.x,e.pos.y+.5,e.pos.z),this.sphere.radius=1.1,(e.ridden||this.frustum.intersectsSphere(this.sphere))&&(e.ridden||e.skel.pose(e),e.skel.emit(r,e.tint),a++));for(let e of r.all)e.end();this.stats.bikes=this.bikes.size,this.stats.drawn=a}shadows(e){if(!this.settings.enabled)return;let t=lu.uMobShadow.value,n=0;for(let r of this.bikes.values())if(!(r.ridden||r.pos.distanceTo(e.position)>80||r.pos.y<0)){for(;n<t.length&&t[n].y>-1e3;)n++;if(n>=t.length)return;t[n].set(r.pos.x,r.pos.y,r.pos.z,.55)}}},Bm=new W,Vm=new W,Hm=4,Um=6,Wm=9,Gm=1.6;function Km(e){return e<=128?1:e<=256?2:e<=512?3:e<=1024?5:0}function qm(e,t){let n=performance.now(),{x0:r,z0:i,size:a}=t,o=a/32,s=new Float32Array(1225);for(let t=0;t<35;t++)for(let n=0;n<35;n++)s[t*35+n]=e.height(r+(n-1)*o,i+(t-1)*o);let c=(e,t)=>(t+1)*35+(e+1);for(let e=1;e<32;e+=2)s[c(e,0)]=.5*(s[c(e-1,0)]+s[c(e+1,0)]),s[c(e,32)]=.5*(s[c(e-1,32)]+s[c(e+1,32)]),s[c(0,e)]=.5*(s[c(0,e-1)]+s[c(0,e+1)]),s[c(32,e)]=.5*(s[c(32,e-1)]+s[c(32,e+1)]);let l=(e,t)=>s[(t+1)*35+(e+1)],u=new Float32Array(3663),d=new Float32Array(3663),f=new Float32Array(4884),p=a<=512?e.pathsInRange(r,i,r+a,i+a,24):[],m=[];e.poiCellRange(r-40,i-40,r+a+40,i+a+40,e=>m.push(e));let h=(e,t)=>{let n=30;for(let r=0;r<p.length;r++){let i=Gf(e,t,p[r]);i<n&&(n=i)}return n},g=1/0,_=-1/0,v=!1;for(let t=0;t<=32;t++)for(let n=0;n<=32;n++){let a=t*33+n,s=l(n,t),c=r+n*o,m=i+t*o;u[a*3]=n*o,u[a*3+1]=s,u[a*3+2]=t*o;let y=l(n-1,t)-l(n+1,t),b=2*o,x=l(n,t-1)-l(n,t+1),S=Math.hypot(y,b,x);y/=S,b/=S,x/=S,d[a*3]=y,d[a*3+1]=b,d[a*3+2]=x,f[a*4]=e.forestDensity(c,m,s),f[a*4+1]=e.rockiness(c,m,s),f[a*4+2]=Math.min(p.length?h(c,m):30,e.brookDist(c,m)-2.6),f[a*4+3]=e.flowers(c,m),s<g&&(g=s),s>_&&(_=s),s<.5&&(v=!0)}let y=1+a*.012,b=1089,x=(e,t)=>{let n=t*33+e;u[b*3]=u[n*3],u[b*3+1]=u[n*3+1]-y,u[b*3+2]=u[n*3+2];for(let e=0;e<3;e++)d[b*3+e]=d[n*3+e];for(let e=0;e<4;e++)f[b*4+e]=f[n*4+e];b++};for(let e=0;e<=32;e++)x(e,0);for(let e=0;e<=32;e++)x(e,32);for(let e=0;e<=32;e++)x(0,e);for(let e=0;e<=32;e++)x(32,e);let S=(e,t)=>{let n=e/o,r=t/o,i=Math.min(31,Math.max(0,Math.floor(n))),a=Math.min(31,Math.max(0,Math.floor(r))),s=n-i,c=r-a,u=l(i,a),d=l(i+1,a),f=l(i,a+1),p=l(i+1,a+1);return s+c<=1?u+(d-u)*s+(f-u)*c:p+(f-p)*(1-s)+(d-p)*(1-c)},C=(e,t)=>{let n=Math.min(32,Math.max(0,Math.round(e/o))),r=Math.min(32,Math.max(0,Math.round(t/o)));return d[(r*33+n)*3+1]},w=(e,t,n)=>{for(let r=0;r<m.length;r++){let i=m[r],a=e-i.x,o=t-i.z,s=i.clear+n;if(a*a+o*o<s*s)return!0}return!1},T=t.seed,E=[],D=[],O=[],k=[],A=[],j=Km(a);if(j>0){let t=Math.ceil(r/Hm),n=Math.ceil(i/Hm),o=Math.floor((r+a-.001)/Hm),s=Math.floor((i+a-.001)/Hm),c=1+.13*(j-1);for(let l=n;l<=s;l++)if(!((l%j+j)%j))for(let n=t;n<=o;n++){if((n%j+j)%j)continue;let t=(n+.1+.8*Y(n,l,T,1))*Hm,o=(l+.1+.8*Y(n,l,T,2))*Hm,s=t-r,u=o-i;if(s<0||u<0||s>=a||u>=a)continue;let d=S(s,u);if(d<1.6||d>175||C(s,u)<.8)continue;let f=e.forestDensity(t,o,d),m=f*.78+.008;if(Y(n,l,T,3)>m||p.length&&h(t,o)<3.2||w(t,o,2)||e.storyBlock(t,o,1.2,`tree`))continue;let g=(.72+.45*Y(n,l,T,4)+.25*f)*c;E.push(s,d-.4,u,g,Y(n,l,T,5)*6.283,.88+.3*Y(n,l,T,6),Y(n,l,T,7)-.5,Y(n,l,T,8))}}let M=a<=64?1:a<=128?2:a<=256?3:0;if(M){let t=Math.ceil(r/Um),n=Math.floor((r+a-.001)/Um),o=Math.ceil(i/Um),s=Math.floor((i+a-.001)/Um);for(let c=o;c<=s;c++)if(!((c%M+M)%M))for(let o=t;o<=n;o++){if((o%M+M)%M)continue;let t=(o+.1+.8*Y(o,c,T,21))*Um,n=(c+.1+.8*Y(o,c,T,22))*Um,s=t-r,l=n-i;if(s<0||l<0||s>=a||l>=a)continue;let u=S(s,l);if(u<1.5||u>195)continue;let d=e.forestDensity(t,n,u),f=d*(1-d)*4*.55+.035;if(Y(o,c,T,23)>f||p.length&&h(t,n)<2.2||w(t,n,-2)||e.storyBlock(t,n,1.4,`bush`))continue;let m=(.7+.8*Y(o,c,T,24))*(M>1?1.2:1);D.push(s,u-.15,l,m,Y(o,c,T,25)*6.283,.7+.3*Y(o,c,T,26),0,Y(o,c,T,27))}}let N=a<=128?1:a<=256?2:a<=512?4:0;if(N){let t=Math.ceil(r/Wm),n=Math.floor((r+a-.001)/Wm),o=Math.ceil(i/Wm),s=Math.floor((i+a-.001)/Wm);for(let c=o;c<=s;c++)if(!((c%N+N)%N))for(let o=t;o<=n;o++){if((o%N+N)%N)continue;let t=(o+.1+.8*Y(o,c,T,31))*Wm,n=(c+.1+.8*Y(o,c,T,32))*Wm,s=t-r,l=n-i;if(s<0||l<0||s>=a||l>=a)continue;let u=S(s,l);if(u<-1)continue;let d=e.rockiness(t,n,u),f=d*.3+.012;if(Y(o,c,T,33)>f||p.length&&h(t,n)<1.8)continue;let m=Y(o,c,T,34),g=(.35+1.4*m*m*m+d*.6)*(N>1?1.4:1);e.storyBlock(t,n,g*.9,`rock`)||O.push(s,u-g*.25,l,g,Y(o,c,T,35)*6.283,.55+.25*Y(o,c,T,36),0,Y(o,c,T,37))}}if(a<=64&&!t.propsOnly){let t=Math.ceil(r/Gm),n=Math.floor((r+a-.001)/Gm),o=Math.ceil(i/Gm),s=Math.floor((i+a-.001)/Gm);for(let c=o;c<=s;c++)for(let o=t;o<=n;o++){let t=(o+Y(o,c,T,41))*Gm,n=(c+Y(o,c,T,42))*Gm,s=t-r,l=n-i;if(s<0||l<0||s>=a||l>=a)continue;let u=S(s,l);if(u<1.2||u>200||C(s,l)<.82)continue;let d=Y(o,c,T,43);if((p.length?h(t,n):30)<1.4||e.storyBlock(t,n,0,`tuft`))continue;d<.32&&k.push(s,u-.05,l,.7+.7*Y(o,c,T,47),Y(o,c,T,48)*6.283,.7+.6*Y(o,c,T,49),0,Y(o,c,T,50));let f=e.flowers(t,n);if(Y(o,c,T,51)<.02+f*.26){let e=s+(Y(o,c,T,52)-.5)*Gm*.8,r=l+(Y(o,c,T,53)-.5)*Gm*.8;if(e>=0&&r>=0&&e<a&&r<a){let i=Y(Math.floor(t/10),Math.floor(n/10),T,54)*.75+Y(o,c,T,55)*.25,a=+(i>.4&&i<.62),s=i<.4?.3*Y(o,c,T,46):.65+.35*Y(o,c,T,46);A.push(e,S(e,r)-.02,r,.8+.5*Y(o,c,T,44),Y(o,c,T,45)*6.283,.85+.3*Y(o,c,T,56),a,s)}}}}let P=[];if(a<=2048){for(let e of m)if(!(e.x<r||e.z<i||e.x>=r+a||e.z>=i+a)){if(e.kind===`cabin`){if(e.story===`ruin`)continue;P.push(e.x-r,e.y,e.z-i,1,e.rot,1,e.variant??0,.5)}else if(e.boulders)for(let t of e.boulders)O.push(t.x-r,t.y,t.z-i,t.sx,t.rot,t.sy/t.sx,0,.3+.4*((t.x*13.7+t.z)%1+1)%1)}}return{id:t.id,positions:u,normals:d,biome:f,minY:g,maxY:_,hasWater:v,trees:new Float32Array(E),bushes:new Float32Array(D),rocks:new Float32Array(O),tufts:new Float32Array(k),flowers:new Float32Array(A),cabins:new Float32Array(P),ms:performance.now()-n}}function Jm(e,t){let n=e.attributes.position.count;return e.setAttribute(`aKind`,new pr(new Float32Array(n).fill(t),1)),e}function Ym(e){for(let t of Object.keys(e.attributes))t!==`position`&&t!==`normal`&&t!==`aKind`&&e.deleteAttribute(t);return e.index?e.toNonIndexed():e}function Xm(e){let{y:t,R:n,th:r,lobes:i,segPerLobe:a,rings:o,ox:s,oz:c,phase:l,droop:u,rnd:d}=e,f=i*a,p=[],m=[],h=s,g=c,_=Array.from({length:i},()=>.85+.3*d()),v=e=>{let t=(e/(Math.PI*2)*i+l)%i,n=Math.floor(t),r=t-n;return{bump:Math.sin(Math.PI*r)**.55,j:_[n]}};for(let e=0;e<=o;e++){let i=e/o;for(let e=0;e<f;e++){let a=e/f*Math.PI*2,{bump:o,j:s}=v(a),c=.8+.2*o,l=n*i**.85*(i>.6?c*s:1+(c*s-1)*(i/.6)),d=t+r*(1-i**1.25)-u*i**3*(.55+.45*o)*s;p.push(h+Math.cos(a)*l,d,g+Math.sin(a)*l)}}for(let e=0;e<f;e++){let i=e/f*Math.PI*2,a=n*.35;p.push(h+Math.cos(i)*a,t+r*.18,g+Math.sin(i)*a)}let y=(e,t)=>e*f+t%f;for(let e=0;e<o+1;e++)for(let t=0;t<f;t++){let n=y(e,t),r=y(e,t+1),i=y(e+1,t),a=y(e+1,t+1);m.push(n,r,i,r,a,i)}let b=new Dr;b.setAttribute(`position`,new q(p,3)),b.setIndex(m),b.computeVertexNormals();let x=b.attributes.position,S=b.attributes.normal,C=new W(h,t+r*.15,g),w=new W,T=new W;for(let e=0;e<x.count;e++)w.fromBufferAttribute(x,e).sub(C).normalize(),T.fromBufferAttribute(S,e),T.dot(w)<0&&T.negate(),T.lerp(w,.55).normalize(),S.setXYZ(e,T.x,T.y,T.z);return Jm(b,0)}function Zm(e,t){let n=Ol(e),r=[],i=t===2?4:5+Math.floor(n()*2),a=t===0?4:t===1?2:1,o=t===0?3:2,s=new bi(.09,.3,12.61,t===0?7:5,t===0?4:1);s.translate(0,6.305,0),r.push(Ym(Jm(s,1)));let c=0,l=0;for(let e=0;e<i;e++){let s=e/(i-1),u=13*(.25+.64*s**.9),d=2.47*(1-.72*s)*(.85+.3*n())+.3,f=13*(.075+.04*s)*(.9+.2*n()),p=t===2?5:6+Math.floor(n()*3);c+=(n()-.5)*.35,l+=(n()-.5)*.35;let m=Xm({y:u,R:d,th:e===i-1?f*1.6:f,lobes:p,segPerLobe:a,rings:o,ox:c,oz:l,phase:n()*p,droop:d*.62,rnd:n});r.push(Ym(m))}let u=new xi(.28,1.56,t===0?6:4,1);u.translate(c,12.87,l),r.push(Ym(Jm(u,0)));let d=Hu(r);return d.computeBoundingSphere(),d}function Qm(e,t){let n=new Nf(e),r=new Xi(1,t);r.deleteAttribute(`uv`),r.deleteAttribute(`normal`),r=Wu(r);let i=r.attributes.position,a=new W,o=Ol(e+1),s=.9+o()*.3,c=.8+o()*.3;for(let e=0;e<i.count;e++){a.fromBufferAttribute(i,e);let t=1+.16*n.noise(a.x*.9+a.y*.4,a.z*.9-a.y*.3)+.06*n.noise(a.x*2.2,a.z*2.2+a.y);a.multiplyScalar(t),a.x*=s,a.z*=c,a.y<-.35&&(a.y=-.35+(a.y+.35)*.3),i.setXYZ(e,a.x,a.y,a.z)}return r.computeVertexNormals(),Jm(r,2)}function $m(e,t){let n=Ol(e),r=[],i=3+Math.floor(n()*3),a=new W(0,.6,0);for(let e=0;e<i;e++){let i=.55+n()*.45,o=new Xi(i,t);o.deleteAttribute(`uv`),o=Wu(o);let s=n()*Math.PI*2,c=e===0?0:.5+n()*.4;o.translate(Math.cos(s)*c,i*.75+(e===0?.25:0),Math.sin(s)*c),o.computeVertexNormals();let l=o.attributes.position,u=o.attributes.normal,d=new W,f=new W;for(let e=0;e<l.count;e++)d.fromBufferAttribute(l,e).sub(a).normalize(),f.fromBufferAttribute(u,e).lerp(d,.5).normalize(),u.setXYZ(e,f.x,f.y,f.z);r.push(Ym(Jm(o,3)))}return Hu(r)}function eh(){let e=[],t=[];for(let n=0;n<6;n++){let r=n/6*Math.PI*2+n*.7,i=Math.cos(r),a=Math.sin(r),o=.12+n%3*.08,s=.22+n%3*.09,c=.028,l=-a*c,u=i*c;for(let n=0;n<3;n++){let r=n/3,c=(n+1)/3,d=s*Math.sin(r*Math.PI*.5),f=s*Math.sin(c*Math.PI*.5),p=o*r*r,m=o*c*c,h=1-r,g=1-c,_=[i*p-l*h,d,a*p-u*h],v=[i*p+l*h,d,a*p+u*h],y=[i*m-l*g,f,a*m-u*g],b=[i*m+l*g,f,a*m+u*g];e.push(..._,...v,...y,...v,...b,...y);for(let e=0;e<6;e++)t.push(i*.4,.9,a*.4)}}let n=new Dr;return n.setAttribute(`position`,new q(e,3)),n.setAttribute(`normal`,new q(t,3)),Jm(n,4)}function th(e){let t=[],n=[],r=[],i=(e,i,a,o,s)=>{t.push(...e,...i,...a);for(let e of o)n.push(...e);r.push(s,s,s)},a=(e,t,n,r=.4)=>{for(let a=0;a<e.length-1;a++){let[o,s]=[e[a],e[a+1]],c=s[0]-o[0],l=s[2]-o[2],u=Math.hypot(c,l)||1,d=u>1e-4?-l/u:1,f=u>1e-4?c/u:0,p=t*(1-r*(a/(e.length-1))),m=t*(1-r*((a+1)/(e.length-1))),h=[o[0]-d*p,o[1],o[2]-f*p],g=[o[0]+d*p,o[1],o[2]+f*p],_=[s[0]-d*m,s[1],s[2]-f*m],v=[s[0]+d*m,s[1],s[2]+f*m],y=[c*2,.9,l*2];i(h,g,_,[y,y,y],n),i(g,v,_,[y,y,y],n)}},o=(e,t,n,r)=>{let i=Math.cos(e),o=Math.sin(e),s=[];for(let e=0;e<=4;e++){let a=e/4,c=n*a*a+r*Math.max(0,a-.6)*2.5,l=t*a-r*.6*Math.max(0,a-.75)*4;s.push([i*c,l,o*c])}return a(s,.02,4,.45),s[4]},s=(e,t,n)=>{let r=.35,a=Math.cos(t)*r,o=Math.sin(t)*r,s=[a,1,o],c=(t,n,r)=>{let i=Math.cos(t)*n,s=Math.sin(t)*n;return[e[0]+i,e[1]+r-(i*a+s*o),e[2]+s]},l=e=>n*(.55+.45*Math.abs(Math.cos(e*2.5)));for(let e=0;e<20;e++){let t=e/20*Math.PI*2,r=(e+1)/20*Math.PI*2,a=c(t,l(t),n*.25),o=c(r,l(r),n*.25);i(c(0,0,0),o,a,[s,s,s],5)}for(let e=0;e<6;e++){let t=e/6*Math.PI*2,r=(e+1)/6*Math.PI*2;i(c(0,0,n*.18),c(r,n*.3,n*.14),c(t,n*.3,n*.14),[s,s,s],6)}},c=(e,t)=>{let n=[[0,t*.15],[t*.35,t*.75],[t*1.1,t*.9],[t*1.5,t*1.15]],r=(r,i)=>{let[a,o]=n[r],s=r===n.length-1?1+.18*Math.cos(i*5):1;return[e[0]+Math.cos(i)*o*s,e[1]-a+t*.15,e[2]+Math.sin(i)*o*s]},a=e=>[Math.cos(e)*.45,1,Math.sin(e)*.45];for(let e=0;e<n.length-1;e++)for(let t=0;t<14;t++){let n=t/14*Math.PI*2,o=(t+1)/14*Math.PI*2;i(r(e,n),r(e+1,n),r(e+1,o),[a(n),a(n),a(o)],15),i(r(e,n),r(e+1,o),r(e,o),[a(n),a(o),a(o)],15)}};for(let t=0;t<3;t++){let n=t/3*Math.PI*2+.6*t,r=[.34,.27,.21][t];e===0?s(o(n,r,.07+.03*t,0),n,.085-.012*t):c(o(n,r+.04,.05,.07),.046-.006*t)}for(let e=0;e<2;e++){let t=e*Math.PI+.9,n=Math.cos(t),r=Math.sin(t);a([[0,0,0],[n*.05,.08,r*.05],[n*.12,.12,r*.12]],.022,4,.8)}let l=new Dr;return l.setAttribute(`position`,new q(t,3)),l.setAttribute(`normal`,new q(n,3)),l.setAttribute(`aKind`,new q(r,1)),l}function nh(e,t,n,r,i,a,o){let s=new vi(e,t,n);return s.translate(r,i,a),Ym(Jm(s,o))}function rh(e,t,n,r,i,a,o=.18){let s=e/2+r,c=t/2+r,l=[],u=e=>{let a=[-s,i+n,0],u=[s,i+n,0],d=[s,i-r*(n/(t/2)),e*c],f=[-s,i-r*(n/(t/2)),e*c],p=[0,o,0],m=e=>[e[0]+p[0],e[1]+p[1],e[2]+p[2]],h=(e,t,n,r,i)=>{i?l.push(...e,...n,...t,...e,...r,...n):l.push(...e,...t,...n,...e,...n,...r)},g=e>0;h(m(a),m(u),m(d),m(f),!g),h(a,u,d,f,g),h(m(d),m(f),f,d,!g),h(m(a),m(f),f,a,g),h(m(u),m(d),d,u,!g)};u(1),u(-1);let d=new Dr;return d.setAttribute(`position`,new q(l,3)),d.computeVertexNormals(),Jm(d,a)}function ih(e,t,n,r,i,a){let o=e/2,s=a>0?[-o,r,n,o,r,n,0,r+t,n]:[o,r,n,-o,r,n,0,r+t,n],c=new Dr;return c.setAttribute(`position`,new q(s,3)),c.computeVertexNormals(),Jm(c,i)}function ah(e){let t=e===1?7:5.6,n=e===1?4.6:4.2,r=2.9,i=e===2?2.8:2.1,a=e===2?13:7,o=[];o.push(nh(t+.3,.6,n+.3,0,.1,0,12)),o.push(nh(t,r,n,0,1.85,0,a));let s=3.3,c=e=>{let r=ih(n,i,0,s,a,e);return r.rotateY(e>0?-Math.PI/2:Math.PI/2),r.translate(e*t/2,0,0),Ym(r)};o.push(c(1),c(-1)),o.push(Ym(rh(t,n,i,.45,s,8)));for(let e of[-1,1])for(let i of[-1,1])o.push(nh(.22,r,.22,e*t/2,1.85,i*n/2,9));o.push(nh(1,2,.12,-t*.18,1.4,n/2+.04,11)),o.push(nh(1.25,.14,.16,-t*.18,.4+2.05,n/2+.05,9));let l=(e,t,n)=>{let r=nh(.95,.95,.12,0,0,0,9),i=nh(.72,.72,.14,0,0,0,10),a=nh(.07,.72,.16,0,0,0,9),s=nh(.72,.07,.16,0,0,0,9);for(let c of[r,i,a,s])c.rotateY(n),c.translate(e,2,t),o.push(c)};l(t*.22,n/2+.05,0),l(-t*.2,-n/2-.05,0),l(t*.2,-n/2-.05,0),l(t/2+.05,0,Math.PI/2);let u=nh(.5,.5,.14,0,0,0,10);u.rotateY(Math.PI/2),u.translate(-t/2-.05,s+i*.35,0),o.push(u),o.push(nh(.7,2.6,.7,t*.28,s+i*.55+.6,-n*.12,12));let d=Hu(o);return d.computeBoundingSphere(),d}var oh=64,sh=10,ch=.5,lh=36,uh=.9,dh=1.1,fh=.34,ph=1.9,mh=.05;function hh(e,t,n){let r=Math.hypot(e,n);return[e*e/r,t+n*n/r]}var gh=class{gen;enabled=!0;cells=new Map;tick=0;constructor(e){this.gen=e}reset(e){this.gen=e,this.cells.clear()}cell(e,t){let n=`${e},${t}`,r=this.cells.get(n);if(!r&&(r=this.build(e*oh,t*oh),this.cells.set(n,r),this.cells.size>lh)){let e=``,t=1/0;for(let[n,r]of this.cells)r.used<t&&(t=r.used,e=n);this.cells.delete(e)}return r.used=this.tick,r}build(e,t){let n=qm(this.gen,{id:0,seed:this.gen.seed,x0:e,z0:t,size:oh,propsOnly:!0}),r=new Float32Array(n.trees.length/8*4);for(let i=0,a=0;i<n.trees.length;i+=8,a+=4){let o=n.trees[i+3];r[a]=e+n.trees[i],r[a+1]=t+n.trees[i+2],r[a+2]=fh*o,r[a+3]=n.trees[i+1]+13*o*n.trees[i+5]}let i=new Float32Array(n.rocks.length/8*5);for(let r=0,a=0;r<n.rocks.length;r+=8,a+=5){let o=n.rocks[r+3];i[a]=e+n.rocks[r],i[a+1]=t+n.rocks[r+2],i[a+2]=uh*o,i[a+3]=n.rocks[r+1],i[a+4]=dh*o*n.rocks[r+5]}let a=new Float32Array(n.cabins.length/8*8);for(let r=0,i=0;r<n.cabins.length;r+=8,i+=8){let o=Math.round(n.cabins[r+6])%3,s=n.cabins[r+4];a[i]=e+n.cabins[r],a[i+1]=t+n.cabins[r+2],a[i+2]=Math.cos(s),a[i+3]=Math.sin(s),a[i+4]=(o===1?7:5.6)/2+.15,a[i+5]=(o===1?4.6:4.2)/2+.15,a[i+6]=n.cabins[r+1],a[i+7]=o===2?2.8:2.1}let o=new Float32Array(n.bushes.length/8*3);for(let r=0,i=0;r<n.bushes.length;r+=8,i+=3)o[i]=e+n.bushes[r],o[i+1]=t+n.bushes[r+2],o[i+2]=ph*n.bushes[r+3];return{trees:r,rocks:i,cabins:a,bushes:o,used:this.tick}}prefetch(e,t){this.tick++;let n=Math.floor(e/oh),r=Math.floor(t/oh);for(let e=-1;e<=1;e++)for(let t=-1;t<=1;t++){let i=`${n+t},${r+e}`,a=this.cells.get(i);if(a)a.used=this.tick;else{this.cell(n+t,r+e);return}}}forCells(e,t,n,r){let i=Math.floor((e-n-sh)/oh),a=Math.floor((e+n+sh)/oh),o=Math.floor((t-n-sh)/oh),s=Math.floor((t+n+sh)/oh);for(let e=o;e<=s;e++)for(let t=i;t<=a;t++)r(this.cell(t,e))}surface(e,t,n,r){if(!this.enabled)return-1/0;let i=-1/0,a=n+ch;return this.forCells(e,t,r,n=>{let o=n.rocks;for(let n=0;n<o.length;n+=5){let s=Math.max(0,Math.hypot(e-o[n],t-o[n+1])-r);if(s>hh(o[n+2],o[n+3],o[n+4])[0])continue;let c=s/o[n+2],l=o[n+3]+o[n+4]*Math.sqrt(1-c*c);l<=a&&l>i&&(i=l)}let s=n.cabins;for(let n=0;n<s.length;n+=8){let o=vh(s,n,e,t,r);o<=a&&o>i&&(i=o)}}),i}ramp(e,t,n,r){if(!this.enabled)return-1/0;let i=-1/0;return this.forCells(e,t,n,a=>{let o=a.rocks;for(let a=0;a<o.length;a+=5){if(_h(o,a)>r)continue;let s=Math.max(0,Math.hypot(e-o[a],t-o[a+1])-n);if(s>=o[a+2])continue;let c=s/o[a+2],l=o[a+3]+o[a+4]*Math.sqrt(1-c*c);l>i&&(i=l)}}),i}inBush(e,t,n){let r=!1;return this.forCells(e,t,n,i=>{let a=i.bushes;for(let i=0;i<a.length&&!r;i+=3)Math.hypot(e-a[i],t-a[i+1])<a[i+2]+n&&(r=!0)}),r}push(e,t,n,r=0){if(!this.enabled)return;let i=e.y+ch,a=(n,r,i)=>{e.x+=n*i,e.z+=r*i;let a=t.x*n+t.z*r;a<0&&(t.x-=n*a,t.z-=r*a)},o=(t,r,i)=>{let o=e.x-t,s=e.z-r,c=Math.hypot(o,s),l=i+n;c>=l||(c<1e-4?a(1,0,l):a(o/c,s/c,l-c))};for(let t=0;t<2;t++)this.forCells(e.x,e.z,n,t=>{let s=t.trees;for(let t=0;t<s.length;t+=4)e.y<s[t+3]&&o(s[t],s[t+1],s[t+2]);let c=t.rocks;for(let t=0;t<c.length;t+=5){if(hh(c[t+2],c[t+3],c[t+4])[1]<=i||_h(c,t)<=r)continue;let n=(e.y+mh-c[t+3])/c[t+4];o(c[t],c[t+1],n<=0?c[t+2]:c[t+2]*Math.sqrt(1-n*n))}let l=t.cabins;for(let t=0;t<l.length;t+=8){if(vh(l,t,e.x,e.z,n)<=i)continue;let r=l[t+2],o=l[t+3],s=l[t+4],c=l[t+5],u=e.x-l[t],d=e.z-l[t+1],f=r*u-o*d,p=o*u+r*d,m=Math.max(-s,Math.min(s,f)),h=Math.max(-c,Math.min(c,p)),g=f-m,_=p-h,v=Math.hypot(g,_),y;if(v>1e-4){if(v>=n)continue;g/=v,_/=v,y=n-v}else{let e=s-Math.abs(f),t=c-Math.abs(p);e<t?(g=Math.sign(f)||1,_=0,y=e+n):(g=0,_=Math.sign(p)||1,y=t+n)}a(r*g+o*_,-o*g+r*_,y)}})}};function _h(e,t){return e[t+4]-.278*e[t+2]}function vh(e,t,n,r,i){let a=e[t+2],o=e[t+3],s=e[t+4],c=e[t+5],l=n-e[t],u=r-e[t+1],d=a*l-o*u,f=o*l+a*u,p=Math.max(0,Math.abs(d)-s),m=Math.max(0,Math.abs(f)-c);if(p*p+m*m>=i*i)return-1/0;let h=Math.min(c,Math.max(0,Math.abs(f)-i));return e[t+6]+3.3+e[t+7]*(1-h/c)}function yh(e){return new Worker(new URL(`chunk.worker-BoClmpkL.js`,import.meta.url).href,{type:`module`,name:e?.name})}var bh=8192,xh=64;function Sh(){let e=[],t=(e,t)=>t*33+e;for(let n=0;n<32;n++)for(let r=0;r<32;r++){let i=t(r,n),a=t(r+1,n),o=t(r,n+1),s=t(r+1,n+1);e.push(i,o,a,a,o,s)}let n=1089,r=1122,i=1155,a=1188;for(let o=0;o<32;o++){let s=[[t(o,0),t(o+1,0),n+o,n+o+1],[t(o,32),t(o+1,32),r+o,r+o+1],[t(0,o),t(0,o+1),i+o,i+o+1],[t(32,o),t(32,o+1),a+o,a+o+1]];for(let[t,n,r,i]of s)e.push(t,r,n,n,r,i),e.push(t,n,r,n,i,r)}return new pr(new Uint32Array(e),1)}var Ch=class{root=new En;settings={splitFactor:1.9,rootRadius:1,showProps:!0,showGround:!0};seed;workers=[];idle=[];queue=[];inflight=new Map;nodes=new Map;nextId=1;frame=0;index=Sh();terrainMat=mu();waterMat=hu();kinds;visible=new Set;generation=0;stats={nodes:0,pending:0,built:0,avgMs:0,instances:0};kindStats(){let e={};for(let t of this.visible)if(t.group)for(let n of t.group.children){if(!n.visible)continue;let t=n.geometry,r=e[n.name]??={inst:0,tris:0},i=(t.index?t.index.count:t.attributes.position.count)/3,a=t instanceof Ha?t.instanceCount:1;r.inst+=a,r.tris+=i*a}return e}constructor(e){this.seed=e;let t=Math.max(2,Math.min(6,(navigator.hardwareConcurrency||4)-1));for(let e=0;e<t;e++){let e=new yh;e.onmessage=t=>this.onResult(e,t.data),this.workers.push(e),this.idle.push(e)}this.root.name=`terrain`;let n=[0,1,2].map(e=>Zm(7,e)),r=[0,1,2].map(e=>Zm(31,e));this.kinds={trees:{name:`trees`,geos:[...n,...r],material:vu({bend:.24,wind:.012,heightRef:13,toneVar:.22,doubleSide:!0,cutaway:`occluders`}),lodFor:e=>e<=64?0:e<=128?1:2},bushes:{name:`bushes`,geos:[$m(3,2),$m(3,1),$m(3,1)],material:vu({wind:.01,heightRef:1.6,toneVar:.25,cutaway:`near`}),lodFor:e=>e<=64?0:1},rocks:{name:`rocks`,geos:[Qm(5,3),Qm(5,2),Qm(5,1)],material:vu({toneVar:.18}),lodFor:e=>e<=128?0:e<=512?1:2},tufts:{name:`tufts`,geos:[eh()],material:vu({wind:.12,heightRef:.6,toneVar:.4,doubleSide:!0}),lodFor:()=>0},flowers:{name:`flowers`,geos:[th(0),th(1)],material:vu({wind:.1,heightRef:.45,toneVar:.05,doubleSide:!0}),lodFor:()=>0},cabins:{name:`cabins`,geos:[ah(0),ah(1),ah(2)],material:vu({toneVar:.1,doubleSide:!0,flipBack:!0}),lodFor:()=>0}}}setSeed(e){if(e!==this.seed){this.seed=e,this.generation++,this.queue.length=0,this.inflight.clear();for(let e of this.nodes.values())this.disposeNode(e);this.nodes.clear(),this.visible.clear(),this.root.clear()}}get busy(){return this.queue.length>0||this.inflight.size>0||this.missing>0}missing=0;update(e){this.frame++;let t=[],n=[],r=this.settings.rootRadius,i=Math.floor(e.x/bh),a=Math.floor(e.z/bh);this.missing=0;for(let o=-r;o<=r;o++)for(let s=-r;s<=r;s++){let r=this.visit((i+s)*bh,(a+o)*bh,bh,e,t);r?n.push(...r):this.missing++}let o=t.filter(e=>e.state===`pending`&&!this.isQueuedOrInflight(e));if(o.length){o.sort((t,n)=>n.size-t.size||this.dist(t,e)-this.dist(n,e));for(let e of o)this.queue.push({id:this.nextId++,seed:this.seed,x0:e.x0,z0:e.z0,size:e.size}),this.inflight.set(this.nextId-1,e),e.requested=!0}let s=new Set(t.map(e=>e.key));this.queue=this.queue.filter(e=>{let t=this.inflight.get(e.id);return t?s.has(t.key)?!0:(this.inflight.delete(e.id),t.requested=!1,!1):!1}),this.queue.sort((t,n)=>n.size-t.size||this.distXZ(t.x0+t.size/2,t.z0+t.size/2,e)-this.distXZ(n.x0+n.size/2,n.z0+n.size/2,e)),this.pump();let c=new Set(n);for(let e of this.visible)!c.has(e)&&e.group&&(e.group.visible=!1);for(let t of c)t.lastUsed=this.frame,t.group&&(t.group.parent||this.root.add(t.group),t.group.visible=!0,this.applyVisibilityToggles(t,e));this.visible=c,this.evict(),this.stats.nodes=c.size,this.stats.pending=this.queue.length+this.inflight.size}nearLodDistance=85;applyVisibilityToggles(e,t){let n=e.group,r=this.dist(e,t)<this.nearLodDistance+e.size*.5;for(let e of n.children)e.visible=e.name===`ground`||e.name===`water`?this.settings.showGround:e.userData.lod===`near`?this.settings.showProps&&r:e.userData.lod===`mid`?this.settings.showProps&&!r:this.settings.showProps}isQueuedOrInflight(e){return e.requested===!0}dist(e,t){return this.distXZ(e.x0+e.size/2,e.z0+e.size/2,t)}distXZ(e,t,n){return Math.hypot(e-n.x,t-n.z)}getNode(e,t,n){let r=`${e},${t},${n}`,i=this.nodes.get(r);return i||(i={key:r,x0:e,z0:t,size:n,state:`pending`,group:null,lastUsed:this.frame,minY:0,maxY:0},this.nodes.set(r,i)),i}visit(e,t,n,r,i){let a=this.getNode(e,t,n);a.lastUsed=this.frame;let o=Math.max(e,Math.min(r.x,e+n)),s=Math.max(t,Math.min(r.z,t+n)),c=a.state===`ready`?Math.max(0,r.y-a.maxY,a.minY-r.y):Math.max(0,r.y-150),l=Math.hypot(o-r.x,s-r.z,c);if(!(n>xh&&l<n*this.settings.splitFactor)){if(i.push(a),a.state===`ready`)return[a];let r=n/2,o=[this.nodes.get(`${e},${t},${r}`),this.nodes.get(`${e+r},${t},${r}`),this.nodes.get(`${e},${t+r},${r}`),this.nodes.get(`${e+r},${t+r},${r}`)];return o.every(e=>e&&e.state===`ready`)?o:null}n>=1024&&i.push(a);let u=n/2,d=[],f=!0;for(let[n,a]of[[0,0],[u,0],[0,u],[u,u]]){let o=this.visit(e+n,t+a,u,r,i);o?d.push(...o):f=!1}return f?d:a.state===`ready`?[a]:null}pump(){for(;this.idle.length&&this.queue.length;){let e=this.queue.shift(),t=this.idle.pop();t.gen=this.generation,t.postMessage(e)}}onResult(e,t){this.idle.push(e);let n=e.gen!==this.generation,r=this.inflight.get(t.id);this.inflight.delete(t.id),!n&&r&&(this.buildNode(r,t),this.stats.built++,this.stats.avgMs=this.stats.avgMs*.95+t.ms*.05),this.pump()}buildNode(e,t){let n=new En;n.position.set(e.x0,0,e.z0),n.visible=!1,n.matrixAutoUpdate=!1,n.updateMatrix();let r=new Dr,i=new pr(t.positions,3);r.setAttribute(`position`,i),r.setAttribute(`normal`,new pr(t.normals,3)),r.setAttribute(`aBiome`,new pr(t.biome,4)),r.setIndex(this.index);let a=1+e.size*.012,o=new Yn(new W(0,t.minY-8-a-2,0),new W(e.size,t.maxY+1,e.size));r.boundingBox=o,r.boundingSphere=o.getBoundingSphere(new yr);let s=new Zr(r,this.terrainMat);if(s.name=`ground`,s.matrixAutoUpdate=!1,n.add(s),t.hasWater){let t=new Dr;t.setAttribute(`position`,i),t.setIndex(this.index),t.boundingSphere=new Yn(new W(0,-1,0),new W(e.size,1,e.size)).getBoundingSphere(new yr);let r=new Zr(t,this.waterMat);r.name=`water`,r.renderOrder=1,r.matrixAutoUpdate=!1,n.add(r)}let c=new yr(new W(e.size/2,(t.minY+t.maxY)/2+8,e.size/2),e.size*.75+(t.maxY-t.minY)/2+30),l=(t,r,i,a)=>{let o=r.length/8;if(!o)return;let s=t.lodFor(e.size),l=Array.from({length:i},()=>[]);for(let e=0;e<o;e++)l[a?a(e):0].push(e);l.forEach((e,a)=>{if(!e.length)return;let o=t.geos.length/i,l=new Float32Array(e.length*4),u=new Float32Array(e.length*4);e.forEach((e,t)=>{let n=e*8;l.set(r.subarray(n,n+4),t*4),u.set(r.subarray(n+4,n+8),t*4)});let d=new ti(l,4),f=new ti(u,4),p=s===0&&o>1?[[0,`near`],[1,`mid`]]:[[s,``]];for(let[r,i]of p){let s=t.geos[Math.min(t.geos.length-1,a*o+Math.min(r,o-1))],l=new Ha;l.index=s.index,l.setAttribute(`position`,s.attributes.position),l.setAttribute(`normal`,s.attributes.normal),l.setAttribute(`aKind`,s.attributes.aKind),l.setAttribute(`aI0`,d),l.setAttribute(`aI1`,f),l.instanceCount=e.length,l.boundingSphere=c;let u=new Zr(l,t.material);u.name=t.name,u.userData.lod=i,u.matrixAutoUpdate=!1,n.add(u)}this.stats.instances+=e.length})};l(this.kinds.trees,t.trees,2,e=>t.trees[e*8+7]<.5?0:1),l(this.kinds.bushes,t.bushes,1),l(this.kinds.rocks,t.rocks,1),l(this.kinds.tufts,t.tufts,1),l(this.kinds.flowers,t.flowers,2,e=>Math.round(t.flowers[e*8+6])),l(this.kinds.cabins,t.cabins,3,e=>Math.round(t.cabins[e*8+6])%3),e.group=n,e.minY=t.minY,e.maxY=t.maxY,e.state=`ready`,e.requested=!1,n.updateMatrixWorld(!0)}disposeNode(e){if(e.group){e.group.removeFromParent();for(let t of e.group.children){let e=t.geometry;e instanceof Ha&&(this.stats.instances-=e.instanceCount),e.index=null;for(let t of[`aKind`,`normal`])e instanceof Ha&&e.deleteAttribute(t);(e instanceof Ha||t.name===`water`)&&e.deleteAttribute(`position`),e.dispose()}e.group=null}}evict(){if(this.nodes.size<900||this.frame%30)return;let e=[...this.nodes.values()].filter(e=>!this.visible.has(e)&&!this.isQueuedOrInflight(e));e.sort((e,t)=>e.lastUsed-t.lastUsed);let t=e.slice(0,this.nodes.size-700);for(let e of t)this.frame-e.lastUsed<60||(this.disposeNode(e),this.nodes.delete(e.key))}},wh=new URLSearchParams(location.search),Th=new Dl({antialias:!1,powerPreference:`high-performance`,stencil:!1,preserveDrawingBuffer:wh.has(`capture`)});Th.outputColorSpace=Le,Th.info.autoReset=!1,document.getElementById(`app`).appendChild(Th.domElement),fu();var Eh=new Pn,Dh=new Ba(36,1,.5,18e3),Oh=wh.get(`seed`)??`hilda`,kh=new Wf(Al(Oh)),Ah=new Ch(kh.seed);Eh.add(Ah.root);var jh=new Ru(kh.seed);Eh.add(jh.group);var Mh=new Eu;Mh.hour=wh.has(`t`)?parseFloat(wh.get(`t`)):9.2,Mh.paused=wh.get(`paused`)===`1`,wh.get(`palette`)&&(Mh.paletteOverride=wh.get(`palette`));var Nh=new gh(kh),Ph=new zm(kh,Nh),Fh={groundHeight:(e,t)=>kh.height(e,t),floorHeight:(e,t,n,r)=>Math.max(kh.height(e,t),Nh.surface(e,t,n,r)),collide:(e,t,n,r)=>{Nh.push(e,t,n,r),Ph.push(e,t,n)},ramp:(e,t,n,r)=>Nh.ramp(e,t,n,r),waterLevel:0},Ih=new Md,Lh=new Fd,Q=new Id([new Od,new Ad,new jd,new kd,Ih,Lh],`walk`),Rh=new gd;Eh.add(Rh.root),wh.get(`eyes`)===`round`&&(Rh.eyeType=`round`);var zh=new Lu;Eh.add(zh.group),Rh.onPuff=(e,t,n,r)=>zh.emit(e,t,n,r);var Bh=new Of,Vh=new lp(kh,[new jp,Bh]);wh.has(`mobs`)&&(Vh.settings.density=parseFloat(wh.get(`mobs`))),Eh.add(Vh.group),Eh.add(Ph.group),wh.get(`bikes`)===`0`&&(Ph.settings.enabled=!1);var Hh={dt:0,time:0,gen:kh,player:{pos:new W,vel:new W,heading:0,mode:`walk`},surface:(e,t)=>Math.max(kh.height(e,t),0),puff:(e,t,n,r)=>zh.emit(e,t,n,r)},Uh=null,Wh=new W,Gh=new W,Kh=document.getElementById(`aim`),qh=document.getElementById(`prompt`);function Jh(e){let t=Q.body;Ih.spec=e.species.mount,t.pos.copy(e.pos),t.vel.copy(e.vel),t.heading=e.heading,t.grounded=e.grounded,Vh.mount(e),Q.set(`ride`,lg),Uh=e,$.targetDistance=Math.max($.targetDistance,12)}function Yh(){let e=Uh;if(!e)return;let t=Q.body,n=e.species.seat(e),r=e.species.radius+.7;t.pos.set(n.pos.x-Math.cos(e.heading)*r,n.pos.y-.4,n.pos.z+Math.sin(e.heading)*r),t.vel.set(e.vel.x*.5,4,e.vel.z*.5),t.grounded=!1,Uh=null,Vh.dismount(e),Q.set(`walk`,lg)}var Xh=null,Zh=new W,Qh=0,$h=0,eg=null;function tg(e){Ph.mount(e,Q.body,Lh),Q.set(`bike`,lg),Xh=e,Zh.copy(e.pos),$.targetDistance=Math.max($.targetDistance,9)}function ng(){let e=Xh;if(!e)return;Xh=null;let t=Q.body,n=Q.current.name!==`bike`;if(Ph.park(e,n?Zh:void 0),!n){let n=.8;t.pos.set(e.pos.x+Math.cos(e.heading)*n,e.pos.y+.05,e.pos.z-Math.sin(e.heading)*n),t.vel.set(t.vel.x*.4,2.5,t.vel.z*.4),t.grounded=!1,Q.set(`walk`,lg)}}var $=new zp(Dh),rg=new _d(Th.domElement),ig=bd()?new xd(rg,Th.domElement):null;if(!ig){let e=t=>{t.pointerType===`touch`&&(Th.domElement.removeEventListener(`pointerdown`,e,!0),ig=new xd(rg,Th.domElement))};Th.domElement.addEventListener(`pointerdown`,e,!0)}var ag=new Iu(Th);function og(e,t){for(let n=0;n<4e3;n+=37)for(let r=0;r<6.28;r+=.7){let i=e+Math.cos(r)*n,a=t+Math.sin(r)*n,o=kh.height(i,a);if(o>6&&o<90&&kh.forestDensity(i,a,o)<.05&&kh.forestDensity(i+12,a+12,o)<.1&&Math.abs(kh.height(i+4,a)-o)<1.2&&Math.abs(kh.height(i,a+4)-o)<1.2)return[i,a]}return[e,t]}function sg(e,t){let n=Q.body;n.pos.set(e,kh.height(e,t),t),n.vel.set(0,0,0),$.snap()}function cg(){if(wh.has(`x`)&&wh.has(`z`))sg(parseFloat(wh.get(`x`)),parseFloat(wh.get(`z`)));else{let[e,t]=og(0,0);sg(e,t)}}cg(),wh.has(`yaw`)&&($.yaw=parseFloat(wh.get(`yaw`)));{let[e,t]=og(0,0);Ph.reset(kh,e,t,$.yaw)}wh.has(`pitch`)&&($.pitch=parseFloat(wh.get(`pitch`))),wh.has(`dist`)&&($.targetDistance=parseFloat(wh.get(`dist`)));var lg={input:rg.state(),camYaw:0,camPitch:0,dt:0,world:Fh};wh.get(`mode`)===`fly`&&(Q.set(`fly`,lg),Q.body.pos.y=kh.height(Q.body.pos.x,Q.body.pos.z)+(wh.has(`y`)?parseFloat(wh.get(`y`)):60));function ug(e){Oh=e,kh=new Wf(Al(e)),Ah.setSeed(kh.seed),Nh.reset(kh),Uh&&Yh(),Xh&&ng(),Vh.reset(kh),Hh.gen=kh,jh.setSeed(kh.seed);let[t,n]=og(0,0);Q.set(`walk`,lg),sg(t,n),Ph.reset(kh,t,n,$.yaw);let r=new URL(location.href);r.searchParams.set(`seed`,e),history.replaceState(null,``,r)}var dg=new nm({env:Mh,terrain:Ah,getSeed:()=>Oh,setSeed:ug,randomSeed:()=>ug(Math.random().toString(36).slice(2,8)),modeName:()=>Q.current.name,setMode:e=>{if(e===`ride`){let e=Vh.mountable(Q.body.pos);e&&!Uh&&Jh(e);return}if(e===`bike`){let e=Ph.mountable(Q.body.pos);e&&!Uh&&!Xh&&tg(e);return}Uh&&Yh(),Xh&&ng(),Q.set(e,lg)},position:()=>Q.body.pos,character:Rh,colliders:Nh,mobs:Vh,bikes:Ph,spawnFlock:e=>{let t=Q.body;Vh.spawnFlockAt(e,t.pos.x+Math.sin(t.heading)*18,t.pos.z+Math.cos(t.heading)*18,Hh)},crowPlump:{get:()=>sf.plump,set:e=>{sf.plump=e,Bh.setPlump(e)}},faceCam:e=>{Rh.holdStill=e,e?($.yaw=Q.body.heading,$.pitch=-.02,$.targetDistance=2.4):($.pitch=.18,$.targetDistance=10)}});wh.has(`capture`)&&(Ou.adaptive=!1),wh.get(`ui`)===`0`&&(dg.hide(),document.getElementById(`help`)?.remove());var fg=1,pg=0,mg=0,hg=0,gg=Ah.settings.splitFactor,_g=Ah.nearLodDistance;function vg(e){if(!Ou.adaptive||document.hidden||e>.25){pg=mg=0;return}if(pg+=e,mg++,pg<1.5)return;let t=pg/mg;if(pg=0,mg=0,t>1/50){if(++hg<2)return;hg=0,fg>.7?fg=Math.max(.7,fg-.1):Ah.settings.splitFactor>1.4?(Ah.settings.splitFactor=Math.max(1.4,Ah.settings.splitFactor-.15),Ah.nearLodDistance=Math.max(45,Ah.nearLodDistance-10)):fg>.55&&(fg=Math.max(.55,fg-.05));return}hg=0,!(t>1/55)&&(fg<.7?fg=Math.min(.7,fg+.05):Ah.settings.splitFactor<gg?(Ah.settings.splitFactor=Math.min(gg,Ah.settings.splitFactor+.15),Ah.nearLodDistance=Math.min(_g,Ah.nearLodDistance+10)):fg<1&&(fg=Math.min(1,fg+.05)))}function yg(){let e=window.innerWidth,t=window.innerHeight,n=Math.min(window.devicePixelRatio||1,1.5)*Ou.renderScale*fg;Th.setPixelRatio(1),Th.setSize(e,t,!1),Th.domElement.style.width=e+`px`,Th.domElement.style.height=t+`px`,Th.domElement.width=Math.floor(e*n),Th.domElement.height=Math.floor(t*n),Th.setViewport(0,0,Math.floor(e*n),Math.floor(t*n)),ag.setSize(e*n,t*n),Dh.aspect=e/t,Dh.updateProjectionMatrix()}var bg=Ou.renderScale,xg=fg;window.addEventListener(`resize`,yg),yg();var Sg=new qa;Sg.connect(document);var Cg=0;function wg(e){Sg.update(e);let t=Sg.getDelta(),n=Math.min(t,.05);if(vg(t),Cg+=n,(Ou.renderScale!==bg||fg!==xg)&&(bg=Ou.renderScale,xg=fg,yg()),rg.pressed(`KeyF`)&&!Uh&&!Xh&&Q.set(Q.current.name===`fly`?`walk`:`fly`,lg),rg.pressed(`KeyE`)){if(Uh)Yh();else if(Xh)ng();else{let e=Vh.mountable(Q.body.pos),t=Q.current.name===`walk`?Ph.mountable(Q.body.pos):null;e&&(!t||e.pos.distanceTo(Q.body.pos)<t.pos.distanceTo(Q.body.pos))?Jh(e):t&&tg(t)}}(rg.pressed(`KeyR`)||rg.pressed(`Mouse2`))&&Vh.act()===`throw`&&Rh.throwLasso(),rg.pressed(`KeyH`)&&dg.toggle(),rg.pressed(`KeyT`)&&(Mh.hour=(Math.floor(Mh.hour)+1)%24);let[r,i]=rg.consumeLook();$.addLook(r,i),Qh=r||i?0:Qh+n,$.zoom(rg.consumeWheel()),lg.input=rg.state(),lg.camYaw=eg??$.yaw,lg.camPitch=$.pitch,lg.dt=n,Q.current.name!==`fly`&&Nh.prefetch(Q.body.pos.x,Q.body.pos.z),Q.update(lg),rg.endFrame(),ig&&kg(n);let a=Q.body;Xh&&Q.current.name!==`bike`&&ng();let o=Q.current.name;if(Xh){Ph.ride(Xh,a,Lh,n),a.grounded&&kh.height(a.pos.x,a.pos.z)>0&&Zh.copy(a.pos);for(let e of a.events)e.type===`land`&&e.impact>3&&zh.emit(a.pos,5+Math.min(4,Math.round(e.impact/3)),.13,1.8),e.type===`kick`&&(Og.set(a.pos.x-Math.sin(a.heading)*.5,a.pos.y,a.pos.z-Math.cos(a.heading)*.5),zh.emit(Og,e.perfect?10:4,e.perfect?.2:.12,e.perfect?3:1.6),e.perfect&&(Eg=.3,zh.emit(Og,7,.2,3.2))),e.type===`bump`&&(zh.emit(Og.set(a.pos.x+Math.sin(a.heading)*.6,a.pos.y+.4,a.pos.z+Math.cos(a.heading)*.6),5,.12,1.6),$.bump(Math.min(1.5,e.impact*.15)));Eg>0&&(Eg-=n,Dg-=n,Dg<=0&&(Dg=.045,zh.emit(Og.set(a.pos.x-Math.sin(a.heading)*.6,a.pos.y+.2,a.pos.z-Math.cos(a.heading)*.6),1,.11,.3)));let e=Math.abs(Lh.speed);if(Tg-=n,a.grounded&&Tg<=0&&(lg.input.y<-.3&&e>4||Math.abs(Lh.lean)>.42)&&(Tg=.09,zh.emit(Og.set(a.pos.x-Math.sin(a.heading)*.5,a.pos.y,a.pos.z-Math.cos(a.heading)*.5),1,.08,.6)),Qh>1.2&&e>3){let t=Math.atan2(Math.sin(a.heading+Math.PI-$.yaw),Math.cos(a.heading+Math.PI-$.yaw));$.yaw+=t*(1-Math.exp(-.9*Math.min(1,(e-3)/4)*n))}}if(Uh){Uh.pos.copy(a.pos),Uh.vel.copy(a.vel),Uh.heading=a.heading,Uh.grounded=a.grounded;for(let e of a.events)e.type===`land`&&e.impact>3&&zh.emit(a.pos,6,.16,2.2)}if(Hh.dt=n,Hh.time=Cg,Hh.player.pos.copy(a.pos),Hh.player.vel.copy(a.vel),Hh.player.heading=a.heading,Hh.player.mode=o,Vh.update(Hh,Dh,Wh,o===`walk`||o===`glide`||o===`ride`||o===`bike`),Ph.update(n,a.pos,Dh),Ph.shadows(Dh),Rh.ropeAim=null,Vh.ropeTarget(Gh)){let e=Gh.sub(Wh),t=H.smoothstep(e.length(),2.5,5);e.normalize().lerp(new W(0,-1,.35),1-t),Rh.ropeAim=e}Rh.update(a,o,n,Xh?Ph.seat:Uh?Uh.species.seat(Uh):void 0),Rh.hand(Wh),Vh.updateRopes(Hh,Wh),zh.update(n);for(let e of a.events)e.type===`land`&&e.impact>6&&$.bump(Math.min(2.2,(e.impact-6)*.14));let s=a.pos.clone();s.y+=o===`swim`?1.1:o===`glide`?2:o===`ride`&&Uh?Uh.species.seat(Uh).pos.y-a.pos.y+1.1:o===`bike`?1.55:1.4,s.y+=$h;let c=Math.hypot(a.vel.x,a.vel.z),l=o===`walk`?H.clamp((c-6.5)/4,0,1):0,u=o===`walk`?H.clamp((-a.vel.y-10)/20,0,1):0,d=+(o===`glide`),f=o===`fly`?H.clamp(a.vel.length()/90,0,1):0,p=o===`ride`?H.clamp((a.vel.length()-8)/30,0,1):0,m=o===`bike`?H.clamp((c-8)/50,0,1.4):0;$.update(s,n,(e,t)=>Math.max(kh.height(e,t),0),{fovKick:3.5*l+7*u+(3+H.clamp((c-9)/6,0,1)*4)*d+8*f+6*p+9*m,distScale:1+.12*l+.15*u+.4*d+(o===`ride`?.25+.2*p:0)+.3*m,airborne:!a.grounded&&o!==`ride`,velX:a.vel.x,velZ:a.vel.z}),cu.uFocus.value.copy(s);let h=Fh.floorHeight(a.pos.x,a.pos.z,a.pos.y,Sd),g=a.pos.y-h;lu.uPlayerFeet.value.set(a.pos.x,h,a.pos.z),lu.uPlayerLift.value=g,(o===`swim`||o===`ride`||g>40||h<0)&&(lu.uPlayerFeet.value.y=-1e4),jg(),Mh.update(n),cu.uTime.value=Cg,jh.update(Dh,Cg),Ah.update(Dh.position),Th.info.reset();let _=Mh.sky;ag.render(Eh,Dh,_.fog,_.outline,_.tint,_.tintAmt,_.lift),dg.tick(n,()=>{let e=Q.body.pos,t=Th.info.render;return`res ${(fg*Ou.renderScale*100).toFixed(0)}% · ${(t.triangles/1e6).toFixed(2)}M tris · ${t.calls} calls · ${Ah.stats.nodes} nodes · ${Ah.stats.pending} queued\n${Q.current.name} · ${e.x.toFixed(0)}, ${e.y.toFixed(0)}, ${e.z.toFixed(0)} · ${Mh.hour.toFixed(1)}h · seed ${Oh}\ncreatures ${Vh.stats.drawn}/${Vh.stats.mobs} drawn · ${Vh.stats.flocks} flocks · ${Vh.tamed.length} tamed · bikes ${Ph.stats.drawn}/${Ph.stats.bikes}`}),Mg&&!Ah.busy&&++Ng>10&&(Mg.classList.add(`gone`),setTimeout(()=>Mg?.remove(),1e3),Mg=null),requestAnimationFrame(wg)}var Tg=0,Eg=0,Dg=0,Og=new W;function kg(e){if(ig.update(e),Xh||ig.lookIdle<.4)return;let t=Q.body.vel,n=Math.hypot(t.x,t.z);if(n<.8)return;let r=Math.atan2(Math.sin(Math.atan2(-t.x,-t.z)-$.yaw),Math.cos(Math.atan2(-t.x,-t.z)-$.yaw)),i=Math.min(1,(ig.lookIdle-.4)/.6)*Math.min(1,(n-.8)/3);Math.abs(r)<2.3&&($.yaw+=r*(1-Math.exp(-.8*i*e)));let a=Q.current.name===`fly`||Uh?$.pitch:.2;$.pitch+=(a-$.pitch)*(1-Math.exp(-.8*i*e))}var Ag=new W;function jg(){let e=Vh.aim,t=!Uh&&!Xh?Vh.mountable(Q.body.pos):null,n=!Uh&&!Xh&&!t&&Q.current.name===`walk`?Ph.mountable(Q.body.pos):null,r=[];if(e){Ag.copy(e.mob.pos).setY(e.mob.pos.y+e.mob.species.centreY).project(Dh);let t=(Ag.x*.5+.5)*window.innerWidth,n=(-Ag.y*.5+.5)*window.innerHeight;Kh.style.transform=`translate(${t.toFixed(1)}px, ${n.toFixed(1)}px)`,Kh.className=Ag.z<1?`on `+e.action:``,r.push(e.action===`lasso`?`<b>R</b> lasso`:e.action===`lead`?`<b>R</b> lead`:`<b>R</b> let go`)}else Kh.className=``;t&&r.push(`<b>E</b> ride`),n&&r.push(`<b>E</b> ride the bicycle`),Xh&&r.push(`<b>E</b> hop off · <b>Shift</b> pedal hard · <b>Space</b> hop`),Uh&&r.push(Uh.species.mount.walk?`<b>E</b> hop off · <b>Space</b> take off / climb · <b>C</b> descend`:`<b>E</b> hop off · <b>Space</b> climb · <b>C</b> descend`),ig?.setContext({ride:Uh||Xh?`Hop off`:t||n?`Ride`:null,lasso:e?e.action===`lasso`?`Lasso`:e.action===`lead`?`Lead`:`Let go`:null,down:!!Uh||Q.current.name===`fly`,fly:!Uh&&!Xh});let i=r.join(` · `);qh.innerHTML!==i&&(qh.innerHTML=i),qh.style.opacity=i?`1`:`0`}var Mg=document.getElementById(`veil`),Ng=0;wh.has(`capture`)&&(Mg?.remove(),Mg=null),requestAnimationFrame(wg),window.__ow={ready:()=>!Ah.busy,stats:()=>({...Ah.stats,calls:Th.info.render.calls,tris:Th.info.render.triangles,kinds:Ah.kindStats()}),setHour:e=>{Mh.hour=e,Mh.apply()},setPalette:e=>{Mh.paletteOverride=e},teleport:(e,t)=>sg(e,t),view:(e,t,n)=>{$.yaw=e,$.pitch=t,$.targetDistance=n,$.snap()},setMode:(e,t)=>{Q.set(e,lg),t!==void 0&&(Q.body.pos.y=kh.height(Q.body.pos.x,Q.body.pos.z)+t)},facePeak:(e=5e3)=>{let t=Q.body.pos,n=-1/0,r=0,i=0;for(let a=-e;a<=e;a+=150)for(let o=-e;o<=e;o+=150){if(o*o+a*a>e*e||o*o+a*a<36e4)continue;let s=kh.height(t.x+o,t.z+a);s>n&&(n=s,r=o,i=a)}return $.yaw=Math.atan2(-r,-i),$.snap(),{h:n,d:Math.hypot(r,i)}},setSeed:ug,pos:()=>({...Q.body.pos}),height:(e,t)=>kh.height(e,t),gen:()=>kh,lookAtPoi:(e,t=25,n=null,r=0)=>{let i=Q.body.pos,a=null,o=1/0;if(kh.poiCellRange(i.x-3e3,i.z-3e3,i.x+3e3,i.z+3e3,t=>{let n=Math.hypot(t.x-i.x,t.z-i.z);t.kind===e&&n<o&&(o=n,a=t)}),!a)return null;let s=a;if(n===null){let e=1/0;for(let r=0;r<6.28;r+=.39){let i=s.x+Math.cos(r)*t,a=s.z+Math.sin(r)*t;if(kh.height(i,a)<3)continue;let o=kh.height(i,a);for(let e=.25;e<1;e+=.25)o+=Math.max(0,kh.height(s.x+Math.cos(r)*t*e,s.z+Math.sin(r)*t*e)-s.y)*2;o+=60*kh.forestDensity(i,a,kh.height(i,a)),o<e&&(e=o,n=r)}}let c=s.x+Math.cos(n)*t,l=s.z+Math.sin(n)*t;return sg(c,l),r>0&&(Q.set(`fly`,lg),Q.body.pos.y=Math.max(kh.height(c,l)+2,s.y+r)),$.yaw=Math.atan2(-(s.x-c),-(s.z-l)),$.snap(),{x:s.x,z:s.z}},input:rg,body:Q.body,post:Ou,_r:Th,_p:ag,_scene:Eh,_terrain:Ah,_colliders:Nh,_body:Q.body,_cam:Dh,mobs:Vh,spawnFlock:(e,t=14,n)=>{let r=Q.body;Vh.spawnFlockAt(e,r.pos.x+Math.sin(r.heading)*t,r.pos.z+Math.cos(r.heading)*t,Hh,n)},tameNearest:e=>{let t=null,n=1/0;for(let r of Vh.all()){if(r.state!==`wild`||e&&r.species.name!==e)continue;let i=r.pos.distanceTo(Q.body.pos);i<n&&(n=i,t=r)}return t&&(t.state=`caught`,t.stateT=99),!!t},mountNearest:()=>{let e=Vh.mountable(Q.body.pos)??Vh.tamed[0];return e&&Jh(e),!!e},bikes:Ph,bikeMode:Lh,mountBike:()=>{Rh.root.visible=!0,$h=0;let e=null,t=1/0;for(let n of Ph.bikes.values()){let r=n.pos.distanceTo(Q.body.pos);!n.ridden&&r<t&&(t=r,e=n)}return e&&tg(e),!!e},dismountBike:ng,lockInput:e=>{eg=e},lookAtBike:(e=4,t=0,n=.12,r=!0)=>{let i=null,a=1/0;for(let e of Ph.bikes.values()){let t=e.pos.distanceTo(Q.body.pos);t<a&&(a=t,i=e)}if(!i)return null;let o=i.heading+Math.PI/2+t;return sg(i.pos.x-Math.sin(o)*.9,i.pos.z-Math.cos(o)*.9),$.yaw=o,$.pitch=n,$.targetDistance=e,$.snap(),Rh.root.visible=!r,$h=r?i.pos.y-Q.body.pos.y-1:0,{x:i.pos.x,z:i.pos.z,key:i.key}},dismount:Yh,rig:Rh,inspect:(e,t,n,r,i)=>{let a=[...Vh.all()].filter(e=>!i||e.species.name===i)[e];return a?(Vh.settings.freeze=!0,a.data&&(a.data.lookAt=null,a.data.peck=9,a.data.headYawT=0),Rh.root.visible=!1,Q.set(`fly`,lg),Q.body.pos.set(a.pos.x,a.pos.y+a.species.centreY-1.4,a.pos.z),Q.body.vel.set(0,0,0),$.yaw=a.heading+t,$.pitch=n,$.targetDistance=r,$.snap(),!0):!1}};
import{c as d}from"./index-CUch-sSS.js";/**
 * @license lucide-react v1.28.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=[["path",{d:"M12 16h.01",key:"1drbdi"}],["path",{d:"M12 8v4",key:"1got3b"}],["path",{d:"M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z",key:"1fd625"}]],p=d("octagon-alert",f);/**
 * @license lucide-react v1.28.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i=[["path",{d:"M16.247 7.761a6 6 0 0 1 0 8.478",key:"1fwjs5"}],["path",{d:"M19.075 4.933a10 10 0 0 1 0 14.134",key:"ehdyv1"}],["path",{d:"M4.925 19.067a10 10 0 0 1 0-14.134",key:"1q22gi"}],["path",{d:"M7.753 16.239a6 6 0 0 1 0-8.478",key:"r2q7qm"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]],h=d("radio",i);function o(a,r=!1){if(!a)return"—";const e=a.match(/^(\d{1,2}):(\d{2})/);if(!e)return a;let t=parseInt(e[1],10);const c=e[2],n=t>=12;return t===0?t=12:t>12&&(t-=12),r?`${t}:${c} ${n?"م":"ص"}`:`${t}:${c} ${n?"PM":"AM"}`}function M(a,r=!1){if(!a||!a.trim())return r?"غير محدد":"Not specified";const e=a.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);if(e){const t=o(e[1],r),c=o(e[2],r);if(r){const n=t.replace("PM","مساءً").replace("AM","صباحاً"),s=c.replace("PM","مساءً").replace("AM","صباحاً");return`${n} - ${s}`}return`${t} - ${c}`}return a}export{p as O,h as R,M as f,o as t};

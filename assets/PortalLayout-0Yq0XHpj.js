import{c as n,b as d,e as r,j as t,t as p,E as y,L as u}from"./index-CArU2Zh3.js";import{A as k}from"./AppShell-D0rYzIbs.js";import{S as f}from"./sparkles-t7NOoIoa.js";import{W as M}from"./wallet-C-PsilO1.js";import"./external-link-DvNcSy60.js";/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=n("CalendarDays",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M16 14h.01",key:"1gbofw"}],["path",{d:"M8 18h.01",key:"lrp35t"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M16 18h.01",key:"kzsmim"}]]);/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=n("House",[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"1d0kgt"}]]);/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=n("Megaphone",[["path",{d:"m3 11 18-5v12L3 14v-3z",key:"n962bs"}],["path",{d:"M11.6 16.8a3 3 0 1 1-5.8-1.6",key:"1yl0tm"}]]);/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=n("Ticket",[["path",{d:"M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z",key:"qn84l0"}],["path",{d:"M13 5v2",key:"dyzc3o"}],["path",{d:"M13 17v2",key:"1ont0d"}],["path",{d:"M13 11v2",key:"1wjjxi"}]]),h="bs.portal.student";function z(){const{data:a,error:s}=d("/portal/students"),[o,c]=r.useState(()=>{try{return Number(localStorage.getItem(h))||null}catch{return null}});r.useEffect(()=>{a!=null&&a.length&&!a.some(e=>e.id===o)&&c(a[0].id)},[a,o]),r.useEffect(()=>{try{o&&localStorage.setItem(h,String(o))}catch{}},[o]);const i=(a==null?void 0:a.find(e=>e.id===o))||null,l=d(i?`/portal/students/${i.id}/overview`:null),m=r.useMemo(()=>{var e;return[{label:"Portal",items:[{to:"/portal",end:!0,label:"Início",icon:b},{to:"/portal/agenda",label:"Agenda",icon:g},{to:"/portal/jornada",label:"Jornada & frequência",icon:f},{to:"/portal/eventos",label:"Eventos",icon:j},{to:"/portal/financeiro",label:"Mensalidades",icon:M,count:((e=l.data)==null?void 0:e.payments.open.length)||0},{to:"/portal/avisos",label:"Mural de avisos",icon:x}]}]},[l.data]),v=(a==null?void 0:a.length)>1&&t.jsx("div",{className:"kid-switch",role:"tablist","aria-label":p("Escolher aluno"),children:a.map(e=>t.jsxs("button",{className:e.id===o?"on":"",onClick:()=>c(e.id),role:"tab","aria-selected":e.id===o,children:[t.jsx("span",{className:"avatar",children:e.name[0]}),e.name.split(" ")[0]]},e.id))});return s?t.jsx("div",{className:"content",children:t.jsx(y,{error:s})}):a?t.jsx(k,{groups:m,topRight:v,context:{students:a,student:i,overview:l.data,reloadOverview:l.reload,loading:l.loading}}):t.jsx(u,{})}function A(a){return a.student?a.overview?null:t.jsx(u,{}):t.jsx("div",{className:"card empty",children:p("Nenhum aluno vinculado a esta conta. Fale com a recepção.")})}export{z as default,A as usePortalReady};

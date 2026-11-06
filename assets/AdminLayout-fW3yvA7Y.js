import{c as a,b as r,e as l,j as o,v as n,t as i}from"./index-CArU2Zh3.js";import{A as d}from"./AppShell-D0rYzIbs.js";import{L as m}from"./layout-dashboard-C-BXOxpF.js";import{U as p}from"./users-CuMRhwbt.js";import{L as h}from"./layers-Da9HYDK3.js";import{N as c}from"./notebook-pen-DuC3i6vw.js";import{C as b}from"./clipboard-check-qM7oovgz.js";import{W as y}from"./wallet-C-PsilO1.js";import{T as g}from"./trophy-WVCLKFRc.js";import{I as k}from"./inbox-ChWixaGY.js";import"./external-link-DvNcSy60.js";/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=a("CalendarRange",[["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M16 2v4",key:"4m81vk"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M17 14h-6",key:"bkmgh3"}],["path",{d:"M13 18H7",key:"bb0bb7"}],["path",{d:"M7 14h.01",key:"1qa3f1"}],["path",{d:"M17 18h.01",key:"1bdyru"}]]);/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=a("FileCode2",[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4",key:"1pf5j1"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"m5 12-3 3 3 3",key:"oke12k"}],["path",{d:"m9 18 3-3-3-3",key:"112psh"}]]);/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M=a("Globe",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]]);/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=a("GraduationCap",[["path",{d:"M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z",key:"j76jl0"}],["path",{d:"M22 10v6",key:"1lu8f3"}],["path",{d:"M6 12.5V16a6 3 0 0 0 12 0v-3.5",key:"1r8lef"}]]);function P(){const e=r("/admin/messages?status=new"),s=l.useMemo(()=>{var t;return[{label:"Visão geral",items:[{to:"/gestao",end:!0,label:"Dashboard",icon:m}]},{label:"Escola",items:[{to:"/gestao/alunos",label:"Alunos",icon:p},{to:"/gestao/turmas",label:"Turmas",icon:h},{to:"/gestao/professores",label:"Professores",icon:x},{to:"/gestao/diarios",label:"Diários de aula",icon:c},{to:"/gestao/grade",label:"Grade semanal",icon:u},{to:"/gestao/chamada",label:"Chamada",icon:b},{to:"/gestao/financeiro",label:"Financeiro",icon:y},{to:"/gestao/conquistas",label:"Conquistas",icon:g}]},{label:"Site",items:[{to:"/gestao/site",label:"Conteúdo do site",icon:M},{to:"/gestao/mensagens",label:"Mensagens",icon:k,count:((t=e.data)==null?void 0:t.length)||0}]}]},[e.data]);return o.jsx(d,{groups:s,context:{refreshInbox:e.reload},topRight:o.jsxs("a",{href:n,target:"_blank",rel:"noreferrer",className:"btn btn-sm btn-ghost",children:[o.jsx(f,{size:15}),i(" API docs")]})})}export{P as default};

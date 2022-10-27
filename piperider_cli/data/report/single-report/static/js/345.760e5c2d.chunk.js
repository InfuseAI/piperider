"use strict";(self.webpackChunk_infuseai_piperider_ui=self.webpackChunk_infuseai_piperider_ui||[]).push([[345],{3811:function(n,e,t){t.d(e,{B:function(){return c}});var i=t(1413),o=t(4925),r=t(1197),l=t(4190),a=t(3822),u=t(5777),s=t(184),p=["title","children","allowModalPopup","height"];function c(n){var e=n.title,t=n.children,c=n.allowModalPopup,m=n.height,d=void 0===m?300:m,z=(0,o.Z)(n,p),x=(0,r.qY)(),b=x.onOpen,h=x.isOpen,j=x.onClose;return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(l.kC,(0,i.Z)((0,i.Z)({minHeight:"".concat(d,"px"),maxHeight:"".concat(d,"px"),bg:"whiteAlpha.700",rounded:"md",onClick:function(){return c&&b()}},z),{},{children:t})),c&&(0,s.jsxs)(a.u_,{size:"full",isOpen:h,onClose:j,children:[(0,s.jsx)(a.ZA,{}),(0,s.jsxs)(a.hz,{p:12,children:[(0,s.jsx)(a.xB,{children:e}),(0,s.jsx)(a.ol,{}),(0,s.jsx)(a.fe,{children:t}),(0,s.jsx)(a.mz,{children:(0,s.jsx)(l.kC,{mt:6,w:"100%",direction:"row",justify:"center",children:(0,s.jsx)(u.zx,{colorScheme:"blue",mr:3,onClick:j,children:"Close"})})})]})]})]})}},5788:function(n,e,t){t.d(e,{UZ:function(){return m}});var i=t(1413),o=t(9366),r=t(196),l=t(9683),a=t(709),u=t(4398),s=t(2415),p=t(184),c="#4780A8";function m(n){var e=n.quantileData,t=n.animation,m=void 0!==t&&t;o.Chart.register(r.BoxPlotController,r.BoxAndWiskers,o.LinearScale,o.CategoryScale);var d=function(n){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},t=Object.assign({},e),o=(0,u.uB)(n),r=o.max,l=o.min,p=o.mean,m=o.q1,d=o.q3,z=[{text:"box region",fillStyle:s.k8},{text:"p50",fillStyle:c}];return(0,i.Z)({responsive:!0,maintainAspectRatio:!1,layout:{padding:10},indexAxis:"y",scales:{x:{offset:!0},y:{display:!1}},plugins:{legend:{position:"bottom",labels:{boxHeight:10,boxWidth:10,padding:15,generateLabels:function(){return z.map((function(n){return{lineWidth:0,text:n.text,fillStyle:n.fillStyle}}))}}},tooltip:{callbacks:{label:function(){var n=(0,a.J8)(l),e=(0,a.J8)(r),t=(0,a.J8)(p),i=(0,a.J8)(m),o=(0,a.J8)(d);return"MIN: ".concat(n," / P25: ").concat(i," / P50 (median): ").concat(t," / P75: ").concat(o," / MAX: ").concat(e)}}}}},t)}(e,{animation:m}),z=function(n){var e=(0,u.uB)(n),t=e.max,i=e.min,o=e.mean,r=e.q1,l=e.q3;return{labels:[""],datasets:[{data:[{min:i,q1:r,mean:o,q3:l,max:t,median:o,items:[],outliers:[]}],borderWidth:1,itemRadius:1,medianColor:c,meanBackgroundColor:c,backgroundColor:s.k8,borderColor:s.Q,hitPadding:10}]}}(e);return(0,p.jsx)(l.kL,{type:"boxplot",data:z,options:d,plugins:[o.Legend,o.Tooltip]})}},1364:function(n,e,t){t.d(e,{Q:function(){return c}});var i=t(1413),o=t(4925),r=t(4190),l=t(9894),a=t(3853),u=t(914),s=t(184),p=["title","subtitle","iconColor","icon"];function c(n){var e=n.title,t=void 0===e?u.Nj:e,c=n.subtitle,m=void 0===c?u.Nj:c,d=n.iconColor,z=void 0===d?"piperider.500":d,x=n.icon,b=void 0===x?a.aCJ:x,h=(0,o.Z)(n,p);return(0,s.jsxs)(r.xu,(0,i.Z)((0,i.Z)({},h),{},{children:[(0,s.jsx)(r.xv,{color:"gray.500",children:m}),(0,s.jsxs)(r.kC,{alignItems:"center",children:[(0,s.jsx)(l.JO,{mt:1,mr:2,rounded:"md",color:z,as:b,boxSize:6}),(0,s.jsx)(r.X6,{fontSize:24,children:t||u.Nj})]})]}))}},5650:function(n,e,t){t.d(e,{r:function(){return c}});var i=t(4190),o=t(7094),r=t(298),l=t.n(r),a=t(4398),u=t(3811),s=t(5558),p=t(184);function c(n){var e=n.hasAnimation,t=n.hasSplitView,r=n.baseColumnDatum,u=n.targetColumnDatum,c=n.tabIndex,d=n.onSelectTab,z=r||{},x=z.type,b=z.topk,h=z.histogram,j=z.trues,g=z.falses,v=u||{},f=v.type,_=v.topk,y=v.histogram,C=v.trues,k=v.falses,S=null!==b&&void 0!==b?b:_,w=null!==x&&void 0!==x?x:f,D=null!==h&&void 0!==h?h:y,A=null!==j&&void 0!==j?j:C,K=null!==g&&void 0!==g?g:k,O=l()(A)&&l()(K),P=D&&w,B="other"===w,Z=O||P||S||B,q="string"===w?s.d4:"Histogram";return(0,p.jsxs)(i.xu,{pb:10,children:[(0,p.jsx)(i.xv,{fontSize:"xl",mb:3,children:"Visualizations"}),(0,p.jsx)(i.iz,{mb:3}),Z?(0,p.jsxs)(o.mQ,{isLazy:!0,index:c,onChange:function(n){return d(n)},children:[(0,p.jsxs)(o.td,{children:[S&&(0,p.jsx)(o.OK,{children:"Top Categories"}),P&&(0,p.jsx)(o.OK,{children:q}),O&&(0,p.jsx)(o.OK,{children:"Boolean"}),B&&(0,p.jsx)(o.OK,{children:"Other"})]}),(0,p.jsxs)(o.nP,{children:[S&&(0,p.jsx)(o.x4,{px:0,children:m(r,u,t,"topk",e)}),P&&(0,p.jsx)(o.x4,{px:0,children:m(r,u,t,"histogram",e)}),O&&(0,p.jsx)(o.x4,{px:0,children:m(r,u,t,"pie",e)}),B&&(0,p.jsx)(o.x4,{px:0,children:m(r,u,t)})]})]}):(0,a.y2)({valids:null===r||void 0===r?void 0:r.valids,schema_type:null===r||void 0===r?void 0:r.schema_type})]})}function m(n,e,t,o,r){return(0,p.jsxs)(i.rj,{templateColumns:t?"1fr 1fr":"1fr",children:[(0,p.jsx)(i.P4,{minWidth:0,children:(0,p.jsx)(u.B,{px:0,title:null===n||void 0===n?void 0:n.name,children:(0,a.SH)(n,e,o,r)})}),t&&(0,p.jsx)(i.P4,{minWidth:0,children:null!==e&&(0,p.jsx)(u.B,{p:0,title:null===e||void 0===e?void 0:e.name,children:(0,a.SH)(e,n,o,r)})})]})}},8693:function(n,e,t){t.d(e,{t:function(){return p}});var i=t(4190),o=t(4398),r=t(1761),l=t(5676),a=t(8102),u=t(4304),s=t(184);function p(n){var e=n.columnDatum,t=n.hasAnimation,p=(0,u.Wx)(e),c=!!t&&{};return p?(0,s.jsxs)(i.xu,{mb:6,children:[(0,s.jsx)(i.xv,{fontSize:"xl",children:"Data Composition"}),(0,s.jsx)(i.iz,{my:3}),(0,s.jsx)(i.xu,{h:"4em",children:(0,s.jsx)(r.Wi,{data:p,animation:c})}),(0,s.jsxs)(i.xu,{mt:3,children:[(0,s.jsx)(l.P,{columnDatum:e,width:"100%"}),(0,s.jsx)(a.Q,{columnDatum:e,width:"100%"})]})]}):(0,s.jsx)(s.Fragment,{children:(0,o.y2)({})})}},1892:function(n,e,t){t.d(e,{E:function(){return s}});var i=t(4190),o=t(4398),r=t(709),l=t(5558),a=t(2917),u=t(184);function s(n){var e=n.columnDatum;return e?(0,u.jsxs)(i.xu,{children:[(0,u.jsxs)(i.xv,{fontSize:"xl",children:[(0,r.B1)((null===e||void 0===e?void 0:e.type)||l.Nj)," Statistics"]}),(0,u.jsx)(i.iz,{my:3}),(0,u.jsx)(a.Y,{columnDatum:e,width:"100%"})]}):(0,u.jsx)(u.Fragment,{children:(0,o.y2)({})})}},8982:function(n,e,t){t.d(e,{M:function(){return z}});var i=t(4190),o=t(4398),r=t(5788),l=t(1089),a=t(1498),u=t(5984),s=t(9934),p=t(6523),c=t(709),m=t(184);function d(n){var e=n.columnDatum;p.a$.safeParse(e);var t=e||{},i=[{label:"Min",value:t.min,metaKey:"min"},{label:"5%",value:t.p5,metaKey:"p5"},{label:"25%",value:t.p25,metaKey:"p25"},{label:"50%",value:t.p50,metaKey:"p50"},{label:"75%",value:t.p75,metaKey:"p75"},{label:"95%",value:t.p95,metaKey:"p95"},{label:"Max",value:t.max,metaKey:"max"}];return(0,m.jsx)(l.xJ,{w:"100%",children:(0,m.jsxs)(l.iA,{size:"sm",variant:"simple",children:[(0,m.jsx)(l.hr,{children:(0,m.jsx)(l.Tr,{children:i.map((function(n){return(0,m.jsx)(l.Th,{pr:0,pl:2,textAlign:"center",children:(0,m.jsx)(a.u,{label:s.d[n.metaKey],children:n.label})},(0,u.x0)())}))})}),(0,m.jsx)(l.p3,{children:(0,m.jsx)(l.Tr,{children:i.map((function(n){return(0,m.jsx)(l.Td,{pr:0,pl:2,textAlign:"center",children:(0,c.uy)(n.value,c.J8)},(0,u.x0)())}))})})]})})}function z(n){var e=n.columnDatum,t=e||{},l=t.p50,a=t.max,u=t.min,s=t.p25,p=t.p75;return e?(0,m.jsxs)(i.xu,{p:9,bg:"gray.50",minWidth:"0px",children:[(0,m.jsx)(i.xv,{fontSize:"xl",children:"Quantile Data"}),(0,m.jsx)(i.iz,{my:3}),(0,m.jsx)(i.xu,{my:5,children:(0,m.jsx)(r.UZ,{quantileData:{p50:l,max:a,min:u,p25:s,p75:p}})}),(0,m.jsx)(d,{columnDatum:e})]}):(0,m.jsx)(m.Fragment,{children:(0,o.y2)({})})}},7677:function(n,e,t){t.d(e,{mk:function(){return u.mk},Ox:function(){return l.O},FC:function(){return i.FC},Qu:function(){return o.Qu},ll:function(){return u.ll},rH:function(){return r.rH},SR:function(){return r.SR},Lp:function(){return a.Lp},jr:function(){return a.jr}});var i=t(4284),o=(t(5801),t(3811),t(5788),t(1761),t(4808),t(4813),t(4398),t(914),t(6461)),r=t(3432),l=t(9645),a=(t(5650),t(8693),t(1892),t(8982),t(5405)),u=(t(6523),t(6243),t(5850))},6243:function(n,e,t){t(9934),t(4821)},4821:function(n,e,t){t.d(e,{Ds:function(){return d},QT:function(){return m},Xv:function(){return p}});var i=t(874),o=i.z.object({type:i.z.string(),labels:i.z.array(i.z.string().nullable()),counts:i.z.array(i.z.number()),bin_edges:i.z.array(i.z.union([i.z.number(),i.z.string()])).optional()}),r=i.z.object({labels:i.z.array(i.z.string().nullable()),counts:i.z.array(i.z.number()),bin_edges:i.z.array(i.z.union([i.z.number(),i.z.string()]))}),l=i.z.object({values:i.z.array(i.z.union([i.z.string(),i.z.number()])),counts:i.z.array(i.z.number())}),a=i.z.object({name:i.z.string(),status:i.z.union([i.z.literal("passed"),i.z.literal("failed")]),parameters:i.z.record(i.z.unknown()).optional(),tags:i.z.array(i.z.string()).optional(),expected:i.z.unknown().optional(),actual:i.z.unknown().optional()}),u=i.z.object({tests:i.z.array(a),columns:i.z.record(i.z.array(a))}),s=i.z.object({name:i.z.string(),type:i.z.string()}),p=i.z.object({total:i.z.number().optional(),samples:i.z.number().optional(),samples_p:i.z.number().optional(),nulls:i.z.number().optional(),nulls_p:i.z.number().optional(),non_nulls:i.z.number().optional(),non_nulls_p:i.z.number().optional(),distinct:i.z.number().optional(),distinct_p:i.z.number().optional(),duplicates:i.z.number().optional(),duplicates_p:i.z.number().optional(),non_duplicates:i.z.number().optional(),non_duplicates_p:i.z.number().optional(),distribution:o.optional(),histogram:r.optional(),histogram_length:r.optional(),topk:l.optional(),name:i.z.string(),description:i.z.string().optional(),type:i.z.union([i.z.literal("string"),i.z.literal("numeric"),i.z.literal("integer"),i.z.literal("datetime"),i.z.literal("boolean"),i.z.literal("other")]),schema_type:i.z.string(),valids:i.z.number().optional(),valids_p:i.z.number().optional(),invalids:i.z.number().optional(),invalids_p:i.z.number().optional(),zeros:i.z.number().optional(),zeros_p:i.z.number().optional(),negatives:i.z.number().optional(),negatives_p:i.z.number().optional(),positives:i.z.number().optional(),positives_p:i.z.number().optional(),zero_length:i.z.number().optional(),zero_length_p:i.z.number().optional(),non_zero_length:i.z.number().optional(),non_zero_length_p:i.z.number().optional(),trues:i.z.number().optional(),trues_p:i.z.number().optional(),falses:i.z.number().optional(),falses_p:i.z.number().optional(),profile_duration:i.z.string().optional(),elapsed_milli:i.z.number().optional(),sum:i.z.number().optional(),avg:i.z.number().optional(),avg_length:i.z.number().optional(),stddev:i.z.number().optional(),stddev_length:i.z.number().optional(),min:i.z.union([i.z.string(),i.z.number()]).optional(),min_length:i.z.number().optional(),max:i.z.union([i.z.string(),i.z.number()]).optional(),max_length:i.z.number().optional(),p5:i.z.number().optional(),p25:i.z.number().optional(),p50:i.z.number().optional(),p75:i.z.number().optional(),p95:i.z.number().optional()}),c=i.z.object({tests:i.z.array(a),columns:i.z.record(i.z.array(a))}),m=i.z.object({name:i.z.string(),description:i.z.string().optional(),row_count:i.z.number().optional(),duplicate_rows:i.z.number().optional(),duplicate_rows_p:i.z.number().optional(),samples:i.z.number().optional(),samples_p:i.z.number().optional(),created:i.z.string().optional(),last_altered:i.z.string().optional(),bytes:i.z.number().optional(),freshness:i.z.number().optional(),col_count:i.z.number().optional(),columns:i.z.record(p),piperider_assertion_result:c.nullable(),dbt_assertion_result:u.optional().nullable()}),d=i.z.object({tables:i.z.record(m),id:i.z.string(),project_id:i.z.string().optional(),user_id:i.z.string().optional(),version:i.z.string().optional(),metadata_version:i.z.string().optional(),created_at:i.z.string(),datasource:s})},6523:function(n,e,t){t.d(e,{a$:function(){return r}});var i=t(874),o=t(4821),r=(t(6243),o.Xv.optional()),l=o.QT.merge(i.z.object({columns:i.z.record(r.optional())})).optional();o.Ds.merge(i.z.object({tables:i.z.record(l.optional())}))}}]);
//# sourceMappingURL=345.760e5c2d.chunk.js.map
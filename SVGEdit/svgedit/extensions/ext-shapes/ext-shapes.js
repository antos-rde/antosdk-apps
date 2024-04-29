/**
 * @file ext-shapes.js
 *
 * @license MIT
 *
 * @copyright 2010 Christian Tzurcanu, 2010 Alexis Deveria
 *
 */
const e="shapes",loadExtensionTranslation=async function(t){let s;const r=t.configObj.pref("lang");try{s=await function __variableDynamicImportRuntime0__(e){switch(e){case"./locale/en.js":return Promise.resolve().then((function(){return a}));case"./locale/fr.js":return Promise.resolve().then((function(){return o}));case"./locale/tr.js":return Promise.resolve().then((function(){return l}));case"./locale/zh-CN.js":return Promise.resolve().then((function(){return n}));default:return new Promise((function(t,a){("function"==typeof queueMicrotask?queueMicrotask:setTimeout)(a.bind(null,new Error("Unknown variable dynamic import: "+e)))}))}}("./locale/".concat(r,".js"))}catch(t){console.warn("Missing translation (".concat(r,") for ").concat(e," - using 'en'")),s=await Promise.resolve().then((function(){return a}))}t.i18next.addResourceBundle(r,e,s.default)};var t={name:e,async init(){const t=this,a=t.svgCanvas,{$id:o,$click:l}=a,n=a.getSvgRoot();let s={};await loadExtensionTranslation(t);const r="shapelib",i={};let c,m,u;return{callback(){if(null===o("tool_shapelib")){const n=t.configObj.curConfig.extPath,s='\n          <se-explorerbutton id="tool_shapelib" title="'.concat(t.i18next.t("".concat(e,":buttons.0.title")),'" lib="').concat(n,'/ext-shapes/shapelib/"\n          src="shapelib.svg"></se-explorerbutton>\n          ');a.insertChildAtIndex(o("tools_left"),s,9),l(o("tool_shapelib"),(()=>{this.leftPanel.updateLeftPanel("tool_shapelib")&&a.setMode(r)}))}},mouseDown(e){if(a.getMode()!==r)return;const t=document.getElementById("tool_shapelib").dataset.draw;m=e.start_x;const o=m;u=e.start_y;const l=u,n=a.getStyle();return i.x=e.event.clientX,i.y=e.event.clientY,c=a.addSVGElementsFromJson({element:"path",curStyles:!0,attr:{d:t,id:a.getNextId(),opacity:n.opacity/2,style:"pointer-events:none"}}),c.setAttribute("transform","translate("+o+","+l+") scale(0.005) translate("+-o+","+-l+")"),a.recalculateDimensions(c),s=c.getBBox(),{started:!0}},mouseMove(e){if(a.getMode()!==r)return;const t=a.getZoom(),o=e.event,l=e.mouse_x/t,i=e.mouse_y/t,h=c.transform.baseVal,b=c.getBBox(),p=b.x,d=b.y,f=(Math.min(m,l),Math.min(u,i),Math.abs(l-m)),g=Math.abs(i-u);let _=f/s.width||1,y=g/s.height||1,j=0;l<m&&(j=s.width);let w=0;i<u&&(w=s.height);const M=n.createSVGTransform(),v=n.createSVGTransform(),x=n.createSVGTransform();if(M.setTranslate(-(p+j),-(d+w)),!o.shiftKey){const e=Math.min(Math.abs(_),Math.abs(y));_=e*(_<0?-1:1),y=e*(y<0?-1:1)}v.setScale(_,y),x.setTranslate(p+j,d+w),h.appendItem(x),h.appendItem(v),h.appendItem(M),a.recalculateDimensions(c),s=c.getBBox()},mouseUp(e){if(a.getMode()!==r)return;return{keep:e.event.clientX!==i.x&&e.event.clientY!==i.y,element:c,started:!1}}}}},a=Object.freeze({__proto__:null,default:{loading:"Loading...",categories:{basic:"Basic",object:"Objects",symbol:"Symbols",arrow:"Arrows",flowchart:"Flowchart",animal:"Animals",game:"Cards & Chess",dialog_balloon:"Dialog balloons",electronics:"Electronics",math:"Mathematical",music:"Music",misc:"Miscellaneous",raphael_1:"raphaeljs.com set 1",raphael_2:"raphaeljs.com set 2"},buttons:[{title:"Shape library"}]}}),o=Object.freeze({__proto__:null,default:{loading:"Chargement...",categories:{basic:"Basique",object:"Objets",symbol:"Symboles",arrow:"Flèches",flowchart:"Flowchart",animal:"Animaux",game:"Cartes & Echecs",dialog_balloon:"Dialog balloons",electronics:"Electronique",math:"Mathematiques",music:"Musique",misc:"Divers",raphael_1:"raphaeljs.com set 1",raphael_2:"raphaeljs.com set 2"},buttons:[{title:"Bibliothèque d'images"}]}}),l=Object.freeze({__proto__:null,default:{loading:"Yükleniyor...",categories:{basic:"Temel",object:"Nesneler",symbol:"Semboller",arrow:"Oklar",flowchart:"Akış Şemaları",animal:"Hayvanlar",game:"Kartlar & Satranç",dialog_balloon:"Diyalog baloncukları",electronics:"Elektronikler",math:"Matematikseller",music:"Müzik",misc:"Diğerleri",raphael_1:"raphaeljs.com set 1",raphael_2:"raphaeljs.com set 2"},buttons:[{title:"Şekil kütüphanesi"}]}}),n=Object.freeze({__proto__:null,default:{loading:"正在加载...",categories:{basic:"基本",object:"对象",symbol:"符号",arrow:"箭头",flowchart:"工作流",animal:"动物",game:"棋牌",dialog_balloon:"会话框",electronics:"电子",math:"数学",music:"音乐",misc:"其他",raphael_1:"raphaeljs.com 集合 1",raphael_2:"raphaeljs.com 集合 2"},buttons:[{title:"图元库"}]}});export{t as default};
//# sourceMappingURL=ext-shapes.js.map

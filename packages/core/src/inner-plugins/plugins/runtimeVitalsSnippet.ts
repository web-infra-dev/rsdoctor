/**
 * Generate a self-executing script string that dynamically loads
 * web-vitals from CDN and reports metrics via fetch to the given URL.
 * Also collects Performance Resource Timing data for JS/CSS chunk resources.
 */
export function createVitalsSnippet(reportUrl: string): string {
  const resourceTimingsReportUrl = reportUrl.replace(
    '/vitals/report',
    '/resource-timings/report',
  );
  return `
;(function(){
var REPORT_URL=${JSON.stringify(reportUrl)};
var RT_REPORT_URL=${JSON.stringify(resourceTimingsReportUrl)};
var s=document.createElement('script');
s.src='https://unpkg.com/web-vitals@4/dist/web-vitals.iife.js';
s.onload=function(){
  var wv=window.webVitals;
  if(!wv)return;
  var report=function(m){
    try{
      var d=JSON.stringify({
        name:m.name,value:m.value,rating:m.rating,delta:m.delta,
        id:m.id,navigationType:m.navigationType,
        entries:m.entries.map(function(e){return typeof e.toJSON==='function'?e.toJSON():e}),
        timestamp:Date.now(),url:location.href,userAgent:navigator.userAgent
      });
      fetch(REPORT_URL,{method:'POST',body:d,headers:{'Content-Type':'application/json'},keepalive:true});
    }catch(e){}
  };
  wv.onLCP(report);wv.onFCP(report);wv.onCLS(report);wv.onINP(report);wv.onTTFB(report);
};
document.head.appendChild(s);

/* Collect Performance Resource Timing for JS/CSS chunk resources */
function collectResourceTimings(){
  try{
    if(!window.performance||!window.performance.getEntriesByType)return;
    var entries=performance.getEntriesByType('resource');
    var timings=[];
    for(var i=0;i<entries.length;i++){
      var e=entries[i];
      if(e.initiatorType==='script'||e.initiatorType==='link'||e.initiatorType==='css'){
        var name=e.name||'';
        if(name.match(/\\.(js|css)(\\?|$)/i)){
          timings.push({
            name:name,
            initiatorType:e.initiatorType,
            startTime:Math.round(e.startTime*100)/100,
            duration:Math.round(e.duration*100)/100,
            transferSize:e.transferSize||0,
            decodedBodySize:e.decodedBodySize||0,
            encodedBodySize:e.encodedBodySize||0,
            domainLookupStart:Math.round(e.domainLookupStart*100)/100,
            domainLookupEnd:Math.round(e.domainLookupEnd*100)/100,
            connectStart:Math.round(e.connectStart*100)/100,
            connectEnd:Math.round(e.connectEnd*100)/100,
            requestStart:Math.round(e.requestStart*100)/100,
            responseStart:Math.round(e.responseStart*100)/100,
            responseEnd:Math.round(e.responseEnd*100)/100,
            fromCache:e.transferSize===0&&e.decodedBodySize>0,
            nextHopProtocol:e.nextHopProtocol||'',
            timestamp:Date.now()
          });
        }
      }
    }
    if(timings.length>0){
      fetch(RT_REPORT_URL,{method:'POST',body:JSON.stringify(timings),headers:{'Content-Type':'application/json'},keepalive:true});
    }
  }catch(ex){}
}
/* Report resource timings after the page has fully loaded */
if(document.readyState==='complete'){
  setTimeout(collectResourceTimings,0);
}else{
  window.addEventListener('load',function(){
    /* Delay slightly to capture late-loading async chunks */
    setTimeout(collectResourceTimings,3000);
  });
}
/* Also observe dynamically loaded resources via PerformanceObserver */
try{
  if(window.PerformanceObserver){
    var _rtBuf=[];
    var _rtTimer=null;
    var obs=new PerformanceObserver(function(list){
      var entries=list.getEntries();
      for(var i=0;i<entries.length;i++){
        var e=entries[i];
        if(e.initiatorType==='script'||e.initiatorType==='link'||e.initiatorType==='css'){
          var name=e.name||'';
          if(name.match(/\\.(js|css)(\\?|$)/i)){
            _rtBuf.push({
              name:name,
              initiatorType:e.initiatorType,
              startTime:Math.round(e.startTime*100)/100,
              duration:Math.round(e.duration*100)/100,
              transferSize:e.transferSize||0,
              decodedBodySize:e.decodedBodySize||0,
              encodedBodySize:e.encodedBodySize||0,
              domainLookupStart:Math.round(e.domainLookupStart*100)/100,
              domainLookupEnd:Math.round(e.domainLookupEnd*100)/100,
              connectStart:Math.round(e.connectStart*100)/100,
              connectEnd:Math.round(e.connectEnd*100)/100,
              requestStart:Math.round(e.requestStart*100)/100,
              responseStart:Math.round(e.responseStart*100)/100,
              responseEnd:Math.round(e.responseEnd*100)/100,
              fromCache:e.transferSize===0&&e.decodedBodySize>0,
              nextHopProtocol:e.nextHopProtocol||'',
              timestamp:Date.now()
            });
          }
        }
      }
      if(_rtTimer)clearTimeout(_rtTimer);
      _rtTimer=setTimeout(function(){
        if(_rtBuf.length>0){
          fetch(RT_REPORT_URL,{method:'POST',body:JSON.stringify(_rtBuf),headers:{'Content-Type':'application/json'},keepalive:true});
          _rtBuf=[];
        }
      },2000);
    });
    obs.observe({type:'resource',buffered:false});
  }
}catch(ex){}
})();
`;
}

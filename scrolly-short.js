// scrolly-short.js
(function(){

  const TOTAL = 426;
  const REMOVED = 213;
  const FINAL = 212;

  const svg = d3.select("#short-svg");
  const W = 800, H = 800;
  const blockSize = 30;

  const femaleColorScale = d3.scaleLinear()
    .domain([0,1])
    .range(["#a7e3ff","#b80090"]);

  const tooltip = d3.select("body")
    .append("div")
    .attr("class","tooltip")
    .style("opacity",0)
    .style("position","absolute");

  // grid layout
  function gridPosition(i, n=TOTAL){
    const cols = Math.floor(W / blockSize);
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {x: col*blockSize, y: row*blockSize};
  }

  // stack layout for groups
  function stackPosition(i, group, counts){
    const col = Math.floor(i / 30);  // 30 per column
    const row = i % 30;
    const centerX = {
      men: W*0.15,
      mixed: W*0.5,
      women: W*0.85,
      unknown: W*0.5
    }[group];
    const baseY = group==="unknown" ? H*0.75 : H*0.4;
    return {x:centerX + col*blockSize, y: baseY - row*blockSize};
  }

  d3.json("data.json").then(studies=>{
    studies.forEach(d=> d.per_women = d["per women"]!=null ? d["per women"]/100 : null);

    // start with 426 dummy
    const data = d3.range(TOTAL).map(i=>({id:i,active:true,study:null}));

    let nodes = svg.selectAll("rect.block")
      .data(data)
      .join("rect")
      .attr("class","block")
      .attr("width",blockSize-2)
      .attr("height",blockSize-2)
      .attr("x",(d,i)=>gridPosition(i).x)
      .attr("y",(d,i)=>gridPosition(i).y)
      .attr("fill","#ccc");

    nodes.on("mouseover",(event,d)=>{
      if(d.study){
        const per = d.study.per_women==null ? "Not reported" : `${Math.round(d.study.per_women*100)}%`;
        tooltip.style("opacity",1)
          .html(`<b>${d.study.Title||"Study"}</b><br>
                 Year: ${d.study.Year||"—"}<br>
                 Female participants: ${per}`);
      }
    }).on("mousemove",(event)=>{
      tooltip.style("left",(event.pageX+10)+"px")
             .style("top",(event.pageY-20)+"px");
    }).on("mouseout",()=>tooltip.style("opacity",0));

    // steps
    function step0(){
      nodes.transition().duration(800)
        .attr("fill","#ccc").style("opacity",1)
        .attr("x",(d,i)=>gridPosition(i).x)
        .attr("y",(d,i)=>gridPosition(i).y);
    }

    function step1(){
      data.forEach((d,i)=>{d.active = !(i<REMOVED);});
      nodes.transition().duration(800)
        .style("opacity",d=>d.active?1:0.15);
    }

    function step2(){
      // drop excluded
      data.forEach((d,i)=>{d.active = !(i<REMOVED);});
      const remaining = data.filter(d=>d.active);
      remaining.forEach((d,i)=>{ d.study=studies[i]; });
      nodes.transition().duration(800)
        .style("opacity",d=>d.active?1:0)
        .attr("x",(d,i)=>d.active?gridPosition(i,FINAL).x:d3.select(this).attr("x"))
        .attr("y",(d,i)=>d.active?gridPosition(i,FINAL).y:d3.select(this).attr("y"))
        .attr("fill",d=>{
          if(!d.active) return "#eee";
          if(d.study && d.study.per_women!=null) return femaleColorScale(d.study.per_women);
          return "#999";
        });
    }

    function step3(){
      const groups = {men:[],mixed:[],women:[],unknown:[]};
      data.filter(d=>d.active).forEach(d=>{
        if(!d.study || d.study.per_women==null) groups.unknown.push(d);
        else if(d.study.per_women===0) groups.men.push(d);
        else if(d.study.per_women===1) groups.women.push(d);
        else groups.mixed.push(d);
      });

      let groupCounts = {
        men: groups.men.length,
        mixed: groups.mixed.length,
        women: groups.women.length,
        unknown: groups.unknown.length
      };

      nodes.transition().duration(1000)
        .attr("fill",d=>{
          if(!d.active) return "#eee";
          if(!d.study || d.study.per_women==null) return "#999";
          return femaleColorScale(d.study.per_women);
        })
        .attr("x",(d)=>{
          if(!d.active) return d3.select(this).attr("x");
          const arr = groups[d.group||(
            d.study.per_women==null ? "unknown" :
            d.study.per_women===0 ? "men" :
            d.study.per_women===1 ? "women" : "mixed")];
          const idx = arr.indexOf(d);
          return stackPosition(idx,d.group||"unknown",groupCounts).x;
        })
        .attr("y",(d)=>{
          if(!d.active) return d3.select(this).attr("y");
          const arr = groups[d.group||(
            d.study.per_women==null ? "unknown" :
            d.study.per_women===0 ? "men" :
            d.study.per_women===1 ? "women" : "mixed")];
          const idx = arr.indexOf(d);
          return stackPosition(idx,d.group||"unknown",groupCounts).y;
        });
    }

    // scrollama
    const scroller = scrollama();
    scroller.setup({step:"#scrolly-short .step",offset:0.55})
      .onStepEnter(({index})=>{
        if(index===0) step0();
        if(index===1) step1();
        if(index===2) step2();
        if(index===3) step3();
      });

    window.addEventListener("resize", scroller.resize);

  });

})();

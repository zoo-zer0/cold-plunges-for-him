d3.json("citation_network_merged.json").then(data=>{
    
    
    const width = 1500;
    const height=3000; //change depending on vibes

    //svg set up
    const svg = d3.select("#full-tree-svg")
        .attr("width",width).attr("height", height);
    const g = svg.append("g"); //not sure why i'm separating these
//i don't think i need this        .attr("transform","translate(50,50") //change translate depending on where
    
    //tree vertical orientation (with some margin)
    const treeLayout = d3.tree().size([width,height]);
    const root=d3.hierarchy(data);

    
    treeLayout(root);
    root.sort((a, b) => {
        const aVal = a.data.femaleParticipation !== undefined
            ? a.data.femaleParticipation
            : a.data["per women"] !== undefined 
            ? a.data["per women"] / 100 : 0;
        const bVal = b.data.femaleParticipation !== undefined
            ? b.data.femaleParticipation
            : b.data["per women"] !== undefined 
            ? b.data["per women"] / 100 : 0;

        return bVal - aVal; // descending order
    });


    //hovering elements
    const links = g.selectAll(".edge").data(root.links())
        //IDK from here
        .enter()
        .append("path")
        .attr("class", "edge")
        .attr("d", d3.linkVertical().x(d=>d.x).y(d=>d.y))
        .attr("stroke-width",1.5)

    
    const nodes = g.selectAll(".node").data(root.descendants())
        .enter()
        .append("g")
        .attr("class","node")
        .attr("transform", d => `translate(${d.x},${d.y})`);
    nodes.append("circle").attr("r", d=>{if(d.depth===3) {return "7"} else return"10"});

    //aesthetics
        //color scales
        const sentimentColor = {
            positive: "#70a372ff",
            negative: "#c40d00ff",
            neutral: "#9E9E9E"
        };

        const femaleColorScale = d3.scaleLinear()
            .domain([0, 1])
            .range(["#a7e3ffff","#b80090"]);


        //tooltip
        
        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("opacity",0);

        function showTooltip(event, htmlContent){
            //d3.select(this).attr("stroke-width, 2.5");
            tooltip.transition().duration(150).style("opacity",1);
            tooltip.html(htmlContent)
                .style("left",(event.pageX+15) + "px")
                .style("top",(event.pageY - 20)+"px");//can i do depending on whether event is mouseover or if it's not
        }
        
        function moveTooltip(event) {
        tooltip
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 20) + "px");
        }

        function hideTooltip() {
        tooltip.transition().duration(200).style("opacity", 0);
        }
        function showTooltipAtXY(x, y, htmlContent) {
            const bbox = svg.node().getBoundingClientRect();
            tooltip.transition().duration(150).style("opacity", 1);
            tooltip
            .html(htmlContent)
            .style("left", ( x + 16) + "px")
            .style("top", ( y - 24) + "px");
        }

          

        //node shapes and colors
        
        //edge hover, aesthetics
        links
            .attr("stroke-width",2.5).attr("stroke", d=>sentimentColor[d.target.data.sentiment] || "#999")
            .on("mouseover", function (event, d) {
                d3.select(this).attr("stroke-width", 4.5);
                const sentiment = d.target.data.sentiment || "N/A";
                const quote = d.target.data.quote || "No quote";
                showTooltip(
                    event,
                    `<b>Sentiment:</b> ${sentiment}<br/><b>Quote:</b> ${quote}`
                );
            })
            .on("mousemove", moveTooltip)
            .on("mouseout", function () {
                d3.select(this).attr("stroke-width", 2.5);
                hideTooltip();
            });
            //start off invisibly 
            //.style("opacity",0);
        nodes.attr("fill", d=>{
            if(d.data.type === "Review") return "#ffaf80ff"
            else if (d.data.type ==="Trial"){
                let femaleValue = 0;

                    if (d.data.femaleParticipation !== undefined) {
                        femaleValue = d.data.femaleParticipation;
                    } else if (d.data["per women"] !== undefined) {
                        femaleValue = d.data["per women"] / 100;  // normalize 0–100 to 0–1
                    }

                    return femaleColorScale(femaleValue);
                }
            else return "#ffdd46ff";
        })
        //tooltip stuff
        nodes
            .on("mouseover", function (event, d) {
            d3.select(this).select("circle").attr("stroke", "#9E9E9E").attr("stroke-width", 2);
            const type = d.data.type || "Unknown";
            const femaleParticipation =
                d.data.femaleParticipation !== undefined
                ? `${Math.round(d.data.femaleParticipation * 100)}%`
                : d.data["per women"] !== undefined
                ? `${d.data["per women"]}%`
                : null;
            const title = d.data.citation || d.data.Title || "No title available";
            const doi = d.data.doi ? `<a href="${d.data.doi}" target="_blank">DOI Link</a><br>` : "";
            const screenshot = d.data.screenshot
                ? `<img src="${d.data.screenshot}" alt="screenshot" style="max-width:100%; height:auto; border-radius:8px;"/>`
                : "";
            const fp = femaleParticipation ? `Female Participation: ${femaleParticipation}<br>` : "";

            showTooltip(
                event,
                `<span class="highlight">${type}</span><br><strong>${title}</strong><br>${fp}${doi}${screenshot}`
            );
            })
            .on("mousemove", moveTooltip)
            .on("mouseout", function () {
            d3.select(this).select("circle").attr("stroke", null).attr("stroke-width", 0);
            hideTooltip();
            })
            // [MERGE] Interactive clicking: open links on leaves, toggle focus on parents
            .style("cursor", d => (d.depth === 1 || d.data.link ? "pointer" : "default"))
            .on("click", function (event, d) {
            if (d.data && d.data.link && d.depth >= 2) {
                window.open(d.data.link, "_blank");
                return;
            }
            if (d.depth === 1) {
                toggleParentFocus(d);
            }
            });
    //zoom and transform logic
    const zoom = d3.zoom().on("zoom",(event)=>{
        g.attr("transform",event.transform);
    });
    svg.call(zoom).on("wheel.zoom", null).on("dblclick.zoom", null);
    
    function transformFor(node, scale=1){
        console.log(window.innerHeight);
        return {
            scale: scale,
            tx: width/2 - node.x * scale,
            ty: window.innerHeight/2 - node.y *scale
        };
    }
    /* no longer useful. used for zoom as scroll.
    function interpolateZoom(from, to, t){//not sure what t is
        const scale = from.scale + (to.scale - from.scale) * t;
        const tx = from.tx + (to.tx - from.tx) *t;
        const ty = from.ty + (to.ty - from.ty) *t;

        svg.call(zoom.transform, 
            d3.zoomIdentity.translate(tx,ty).scale(scale));
    }
    
    function remapProgress(progress, min = 0.1, max = 0.5) {
        if (progress < min) return 0;
        if (progress > max) return 1;
        return (progress - min) / (max - min);
    }
    */
    function averageNodeDepth(root, depth1, depth2){
        const nodes1 = [];
        const nodes2 = []
        root.each(d => {
            if (d.depth === depth1) {
                nodes1.push(d);
            }
            if (d.depth === depth2){
                nodes2.push(d);
            }
        });
        const avgX = (d3.mean(nodes1, d => d.x)+d3.mean(nodes2, d=>d.x))/2;
        const avgY = (d3.mean(nodes1, d => d.y)+d3.mean(nodes2, d=>d.y))/2;
        return { x: avgX, y: avgY };
    }
    function centerBetweenRootAndChildren(root) {
        const rootY = root.y;
        const childrenYs = root.children ? root.children.map(d => d.y) : [];
        const avgChildY = d3.mean(childrenYs);
        return {
            x: root.x,                  // center horizontally on the root
            y: (rootY + avgChildY) / 2  // center vertically between root and children
        };
    }


    function findNodeById(node, targetId) {
    if (node.data.id === targetId) return node;
    if (!node.children) return null;
    for (let child of node.children) {
        const result = findNodeById(child, targetId);
        if (result) return result;
    }
    return null;
    }

//attempting interactives
    function adjustTreeHeight(maxDepth, op=0.1){
        nodes
            .transition().duration(500)
            .style("opacity", d => d.depth <= maxDepth ? 1 : op); // dim or hide

        links
            .transition().duration(500)
            .style("opacity", d => {
                return (d.source.depth <= maxDepth - 1 && d.target.depth <= maxDepth)
                    ? 1
                    : op;
            });
    }

    function showOneParent(parentNode,op=0.1){
        nodes
            .transition().duration(500)
            .style("opacity", d => {
                return isAncestor(parentNode, d) || isAncestor(d, parentNode) ? 1 : op;
            });

        links
            .transition().duration(500)
            .style("opacity", d => {
                return (isAncestor(parentNode, d.source) && isAncestor(parentNode, d.target)) ? 1 : op;
            });
        }
    function isAncestor(ancestor, node) {
        let curr = node;
        while (curr) {
            if (curr === ancestor) return true;
            curr = curr.parent;
            }
        return false;
    }

    //interactive parent toggle
    let currentlyFocusedParent = null; // track a single "expanded" parent (visual focus only)
    function toggleParentFocus(parentNode) {
        if (currentlyFocusedParent && currentlyFocusedParent === parentNode) {
        // Unfocus -> show broader context
        currentlyFocusedParent = null;
        adjustTreeHeight(3, 1);
        return;
        }
        currentlyFocusedParent = parentNode;
        showOneParent(parentNode, 0.05);
        const to = transformFor(parentNode, 1.0);
        svg
        .transition()
        .duration(800)
        .call(zoom.transform, d3.zoomIdentity.translate(to.tx, to.ty).scale(1.0));
  }
    
    


    //start at the root
    const initialTransform = transformFor(root, 1);
    adjustTreeHeight(0,0);
    svg.call(zoom.transform, d3.zoomIdentity.translate(initialTransform.tx, initialTransform.ty).scale(initialTransform.scale));
    //scrolly
    const scroller = scrollama();
    scroller
        .setup({step:".scrolly .step", offset: 0.5, progress:true})
        //offset: how far down the viewport the step
        //          when it's considered "entered"
        //progress true: in between value for how far
        //      you've scrolled within a step's height
        .onStepEnter(({index}) => {
            //console.log(`Step ${index} progress:`, progress.toFixed(3));
            //let clampedProgress = Math.min(progress,0.5);
            //const scaledProgress = remapProgress(progress);
            //console.log(`Scaled progress: ${scaledProgress}`);

            //if (progress>0.5) return;

            d3.selectAll(".step")
            //what does this mean?
            .classed("active", (d, i)=>i===index);
            if(index===0){
                svg.call(zoom.transform, d3.zoomIdentity.translate(initialTransform.tx, initialTransform.ty).scale(initialTransform.scale));
                adjustTreeHeight(0,0);
                showTooltipAtXY(
                    root.x,root.y,
                    `<strong>${root.data.citation || root.data.Title || "Root"}</strong>`
                );
            }
            if(index===1){
                adjustTreeHeight(1,0);
                const to = transformFor(averageNodeDepth(root,0,1),0.7);
                svg.transition().duration(1000)
                    .call(zoom.transform, d3.zoomIdentity.translate(to.tx, to.ty).scale(0.7));
                //interpolateZoom(from, to, scaledProgress);
            }
            if(index===2){
                const to = transformFor(findNodeById(root,1),1);
                svg.transition().duration(1000)
                    .call(zoom.transform, d3.zoomIdentity.translate(to.tx, to.ty).scale(1));
                
                //interpolateZoom(from, to, scaledProgress);
            }
            if(index===3){
                showOneParent(findNodeById(root,1),0.1);
                const to = transformFor(averageNodeDepth(root,1,2),0.8);
                svg.transition().duration(1000)
                    .call(zoom.transform, d3.zoomIdentity.translate(to.tx, to.ty).scale(0.8));
                
                //interpolateZoom(from, to, scaledProgress);
            }
            if(index===4){
                const to = transformFor(findNodeById(root,14),1.4);
                svg.transition().duration(1000)
                    .call(zoom.transform, d3.zoomIdentity.translate(to.tx, to.ty).scale(1.4));
                showOneParent(findNodeById(root, 14));
                //interpolateZoom(from, to, scaledProgress);
            }
            if(index===5){
                const to = transformFor(averageNodeDepth(root,2,3),0.9);
                showOneParent(findNodeById(root, 14));

                svg.transition().duration(1000)
                    .call(zoom.transform, d3.zoomIdentity.translate(to.tx, to.ty).scale(0.9));
                
                //interpolateZoom(from, to, scaledProgress);
            }
            if(index===6){
                const to = transformFor(averageNodeDepth(root,2,3),0.7);
                svg.transition().duration(1000)
                    .call(zoom.transform, d3.zoomIdentity.translate(to.tx, to.ty).scale(0.7));
                adjustTreeHeight(3);
            }
            if(index===7){
                //show different
                //id=6
                const to = transformFor(averageNodeDepth(root,2,3),0.9);
                svg.transition().duration(1000)
                    .call(zoom.transform, d3.zoomIdentity.translate(to.tx, to.ty).scale(0.9));
                showOneParent(findNodeById(root, 6),0);

                //interpolateZoom(from, to, scaledProgress);

            }
            if (index === 8) {
                adjustTreeHeight(4);
                const to = transformFor(averageNodeDepth(root,2,3),0.7);
                svg.transition().duration(1000)
                    .call(zoom.transform, d3.zoomIdentity.translate(to.tx, to.ty).scale(0.7));
            }

//hello??
        })


})//loaded data
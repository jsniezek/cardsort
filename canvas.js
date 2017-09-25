var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height"),
    cardWidth = 130,
    cardHeight = 90;

var cards = d3.range(10).map(function(d, i) {
  return {
    x: Math.round(Math.random() * (width - cardWidth * 2) + cardWidth),
    y: Math.round(Math.random() * (height - cardHeight * 2) + cardHeight),
    key: i
  };
});

// var color = d3.scaleOrdinal()
//     .range(d3.schemeCategory20);

var color = d3.scaleSequential().domain([0, 10])
	.interpolator(d3.interpolateRainbow);

svg.selectAll(".card")
  .data(cards)
  .enter().append("g")
  .classed("card", true)
  .call(createCardWithText)
  .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));

function createCardWithText(selection) {
  selection
    .append("rect")
      .attr("x", function(d) { return d.x; })
      .attr("y", function(d) { return d.y; })
      .attr("width", cardWidth)
      .attr("height", cardHeight)
      .classed("card-rect", true)
      .style("fill", "#fff")
      ;

  selection
  .append('text')
    .text(function(d, i) {
      return "card" + (i + 1);
    })
    .attr('x', function(d) { return d.x + 50; })
    .attr('y', function(d) { return d.y + 50; });
}


function dragstarted(d) {
  d3.select(this).raise().classed("active", true);
}

function dragged(d) {
  d3.select(this).select("text").attr("x", d.x = d3.event.x + 50).attr("y", d.y = d3.event.y + 50);
  d3.select(this).select("rect").attr("x", d.x = d3.event.x).attr("y", d.y = d3.event.y);
}

function dragended(d) {
  d3.select(this).classed("active", false).call(checkGroup);
}

function checkGroup(selection) {
  console.log("I am jojo");
  draggedItem = selection.datum(); //.style("fill", "#343434")
  // find collisions
  var detected = false;
  var items = d3.selectAll("rect").each(function(d) {
    if (d.key === draggedItem.key) {return;}

    if (draggedItem.x < d.x + cardWidth &&
       draggedItem.x + cardWidth > d.x &&
       draggedItem.y < d.y + cardHeight &&
       cardHeight + draggedItem.y > d.y) {
        // collision detected.
        console.log("collision!");
        detected = true;
        var hitKey = d.key;
        svg.selectAll("rect").filter(function(d) { return d.key === hitKey}).style("fill", color(d.key));
        svg.selectAll("rect").filter(function(d) { return d.key === draggedItem.key}).style("fill", color(d.key));
    }

  })
  if (!detected) {
    svg.selectAll("rect").filter(function(d) { return d.key === draggedItem.key}).style("fill", "#ccc");
  }
  //items.style("fill", "blue");
  // find classes of collided items.
  // select all items with class.
}

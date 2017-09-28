
class Card {
  constructor(id, x, y) {
    this.id = id;
    this.x = x; // x position
    this.y = y; // y position
    this.group = null;
  }
}

var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height"),
    cardWidth = 130,
    cardHeight = 90;

var cards = d3.range(14).map(function(d, i) {
  let x = Math.round(Math.random() * (width - cardWidth * 2) + cardWidth);
  let y = Math.round(Math.random() * (height - cardHeight * 2) + cardHeight);
  return new Card (i, x, y);
});

var numGroups = 0;

var color = d3.scaleSequential().domain([0, 10])
	.interpolator(d3.interpolateRainbow);

//initial setup of all cards and actions
svg.selectAll(".card")
  .data(cards)
  .enter().append("g")
  .classed("card", true)
  .call(createCardWithText)
  .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));

//from a blank group, create a new card with a rect and a text element
function createCardWithText(selection) {
  selection
    .append("rect")
      .attr("x", function(d) { return d.x; })
      .attr("y", function(d) { return d.y; })
      .attr("width", cardWidth)
      .attr("height", cardHeight)
      .classed("card-rect", true)
      ;

  //create text element
  selection
    .append('text')
      .text(function(d, i) {
        return "card" + (i + 1);
      })
      .attr('x', function(d) { return d.x + 40; })
      .attr('y', function(d) { return d.y + 50; })
      .classed("text", true);
}


function dragstarted(d) {
  d3.select(this).raise().classed("active", true);
}

function dragged(d) {
  d3.select(this).select("text").attr("x", d.x = d3.event.x + 40).attr("y", d.y = d3.event.y + 50);
  d3.select(this).select("rect").attr("x", d.x = d3.event.x).attr("y", d.y = d3.event.y);
}

function dragended(d) {
  d3.select(this).classed("active", false).call(checkCollisions);
}

function checkCollisions(selection) {

  draggedItem = selection.datum();
  // debugger;
  // find collisions
  var detected = false;
  var items = d3.selectAll("rect").each(function(d) {
    if (d.id === draggedItem.id) {return;}

    if (draggedItem.x < d.x + cardWidth &&
       draggedItem.x + cardWidth > d.x &&
       draggedItem.y < d.y + cardHeight &&
       cardHeight + draggedItem.y > d.y) {

        // collision detected.
        console.log("I am jojo");
        console.log("collision!");
        detected = true;

        addToGroup(draggedItem, d);
    }

  })
  if (!detected) {
    draggedItem.group = null;

    svg.selectAll("rect")
      .filter(function(d)
      { return d.id === draggedItem.id})
      .style("fill", "#ffffff");
  }
  //items.style("fill", "blue");
  // find classes of collided items.
  // select all items with class.
}

function addToGroup(draggedItem, target) {
 debugger;

  //first, see if target is in a group.
  if( target.group == null )
  {
    numGroups++;
    target.group = "g" + numGroups;
    console.log(numGroups);
    svg.selectAll("g")
      .filter(function(d)
      { return d.id === target.id })
      // .style("fill", color(target.group))
      .classed(target.group, true);
  }

  console.log("g" + numGroups)

  //now, add dragged item into target item's group
  draggedItem.group = target.group;
  svg.selectAll("g")
    .filter(function(d)
    { return d.id === draggedItem.id })
    // .style("fill", color(draggedItem.group))
    .classed(target.group, true);
}

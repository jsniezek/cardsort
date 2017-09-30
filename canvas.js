'use strict';

// todo: maybe don't make these global?
var svg, cards, cardWidth, cardHeight, numGroups;
var groups = new Map();

class Card {
  constructor(id, x, y) {
    this.id = id;
    this.x = x; // x position
    this.y = y; // y position
    this.group = null;
    this.overlaps = [];
  }
}

function init() {
  // set up canvas and place cards inside
  numGroups = 0;
  cardWidth = 130;
  cardHeight = 90;
  svg = d3.select("svg");

  var width = +svg.attr("width"),
      height = +svg.attr("height");

  cards = d3.range(14).map(function(d, i) {
    let x = Math.round(Math.random() * (width - cardWidth * 2) + cardWidth);
    let y = Math.round(Math.random() * (height - cardHeight * 2) + cardHeight);
    return new Card (i, x, y);
  });

  //initial setup of all cards and their interactions
  svg.selectAll(".card")
    .data(cards)
    .enter().append("g")
    .classed("card", true)
    .call(createCardWithText)
    .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));
}

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
  d3.select(this)
    .classed("active", false)
    .call(handleCardMove);
}

function handleCardMove(selection) {

  var draggedCard, newHits; //, unHits
  draggedCard = selection.datum();

  //first, clear dragged card from any old groups the card was in.
  if (draggedCard.group != null)
  {
    svg.selectAll("g")
      .filter(function(d)
      { return d.id === draggedCard.id})
      .classed(draggedCard.group, false);

    let curGroup = groups.get(draggedCard.group);
    var index = curGroup.indexOf(draggedCard.id);
    curGroup.splice(index, 1);
  }
  draggedCard.group = null;

  newHits = findHits(draggedCard);
  // unHits = draggedCard.overlaps
  //           .filter(x => newHits.indexOf(x) == -1);

  if (newHits.length > 0) {
    // we've hit one or more cards
    newHits.push(draggedCard);
    mergeCards(newHits);
  }

  // if (unHits.length > 0) {
    // we've moved this card off one or more items
    // we need to see if their groups have changed
    // unmergeOldGroups(draggedCard, unHits);
    // then rectify duplicate group colors, if any.
  // }

}

function findHits(activeCard) {
// let's see what this card overlaps with.

  var hits = [];

  // find collisions in the canvas
  var items = d3.selectAll("rect").each(function(d) {
    if (d.id === activeCard.id) {return;} // self

    if (activeCard.x < d.x + cardWidth &&
       activeCard.x + cardWidth > d.x &&
       activeCard.y < d.y + cardHeight &&
       cardHeight + activeCard.y > d.y) {

        // collision detected.
        console.log("I am jojo");
        hits.push(d);
    }
  })

  return hits;
}

function mergeCards(cardsToMerge) {

  var biggestGroup = null;

  // see what groups need to be merged
  var groupsToMerge = new Set();
  var grouplessCards = [];
  for (var i = 0; i < cardsToMerge.length; i += 1) {
    // debugger;
    if (cardsToMerge[i].group != null)
    {
      groupsToMerge.add(cardsToMerge[i].group);
    }
    else {
      grouplessCards.push(cardsToMerge[i]);
    }
  }

  // if none of the cards are in a group, we need a new group.
  if (groupsToMerge.size === 0)
  {
    // make a new group.
    numGroups++;
    biggestGroup = "g" + numGroups;
    var items = [];

    for (var i = 0; i < cardsToMerge.length; i += 1) {
      cardsToMerge[i].group = biggestGroup;
      items.push(cardsToMerge[i].id);
    }

    groups.set(biggestGroup, items) //adds a group to the pile
  }

  // one or more cards are in a group, so we find the group with the largest size
  else {
    //find the largest group
    var largest = 0;

    for (let g of groupsToMerge) {
      let len = groups.get(g).length; //gets value of key, then length of value (which is array)
      if (len > largest) {
        //note: if 2 or more are the same size, we go with the first match.
        biggestGroup = g;
        largest = len;
      }
    }

    //ok, found the largest.
    //now, set all loser group items to this group.
    var kSet = groups.get(biggestGroup); // get the array of member card ids from group
    for (let g of groupsToMerge) {
      if (g != biggestGroup) {
        let loserGroup = groups.get(g); //gets value array from group

        //first, unclass these ones
        svg.selectAll("g")
          .filter(function(d)
          { return d.group === g })
          .classed(g, false);

        //then, add them to the biggest group
        for (var i = 0; i < loserGroup.length; i++)
        {
          let id = loserGroup[i];
          let something = cards.find(card => card.id === id);
          something.group = biggestGroup;
          kSet.push(id);
        }

        //finally, remove the group
        groups.delete(g);
      }
    }

    //now, set all group-less items to this group.
    for (var i = 0; i < grouplessCards.length; i++)
    {
      let c = grouplessCards[i];
      c.group = biggestGroup;
      kSet.push(c.id);
    }

    //then, eliminate the losing groups.
    // for (let grp of groupsToMerge) {
    //   if (grp != biggestGroup) {
    //
    //
    //   }
    // }
  }

  svg.selectAll("g")
    .filter(function(d)
    { return d.group === biggestGroup })
    .classed(biggestGroup, true);
}

init();

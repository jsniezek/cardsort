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
    this.overlaps = new Set();
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

  // spreadCards();
}

// function spreadCards() {
//   var width = +svg.attr("width"),
//       height = +svg.attr("height");
//
//   for (var i = 0; i < cards.length; i++) {
//     while (findHits(cards[i]).size > 0)
//     {
//       cards[i].x = Math.round(Math.random() * (width - cardWidth * 2) + cardWidth);
//       cards[i].y = Math.round(Math.random() * (height - cardHeight * 2) + cardHeight);
//     }
//     svg.selectAll("g")
//       .filter(function(d)
//       { return d.id === cards[i].id})
//       .select("text")
//         .attr("x", d.x = cards[i].x + 40)
//         .attr("y", d.y = cards[i].y + 50);
//
//     svg.selectAll("g")
//       .filter(function(d)
//       { return d.id === cards[i].id})
//       .select("rect").attr("x", d.x = cards[i].x).attr("y", d.y = cards[i].y);
//   }
// }

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

  var draggedCard = selection.datum();
  var newHits = findHits(draggedCard);


  //first, see how we've impacted prior overlaps
  if (draggedCard.group != null)
  {

    var arrOfHitGroups = [];
    for (let c of draggedCard.overlaps) {
      //if we get here, we may have one or more orhaned cards.
      //we need to see if we've created islands in the group.
      //to do this, we go through each immediate hit, and see what it's connected to.
      let chain = getChainedCards(c);
      if (chain.size < 2) {
        // We have an orphan card. Remove it's membership.
        removeCardClass(c, c.group);
        let groupOfCard = groups.get(c.group)
        let index = groupOfCard.indexOf(c);
        groupOfCard.splice(index, 1);
        c.group = null;
      }
      else {
        arrOfHitGroups.push(chain);
      }
    }

    //then, we need to see if any of the chains are actually connected. we'll merge those.
    //finally, we'll need to make new groups for any islands.
    if (arrOfHitGroups.length > 1) {
      console.log("arr" + arrOfHitGroups);
      //make sure there are no overlaps by finding the intersect of the groups.
      var i = 0;
      while (i+1 < arrOfHitGroups.length) {
        let intersect = new Set(
          [...arrOfHitGroups[i]].filter(x => arrOfHitGroups[i+1].has(x)));

        if (intersect.size > 0) {
          arrOfHitGroups[i].add([...arrOfHitGroups[i+1]]);
        }
        else {
          i++;
        }
      }

      //now we have the final list of independent groops.
      if (arrOfHitGroups.length > 1) {
        //make new groups for all except 1.
        //NOTE: THIS IS TEMPORARY. I NEED TO FIND THE BIGGEST GROUP.
        for (i = 1; i < arrOfHitGroups.length; i++) {

          //note: basically duplicate code here...
          numGroups++;
          var newGroup = "g" + numGroups;
          var items = [];

          for (let card of arrOfHitGroups[i]) {
            removeCardClass(card, card.group);
            card.group = newGroup;
            items.push(card);
            addCardClass(card, card.group);
          }
          groups.set(newGroup, items) //adds a group to the pile
        }

      }
    }

    //Behavior side note: the biggest branch wins the color,
    //unless current card causes this branch to join a larger group.
    //To do this, we need to do is save the subgroups for the end.
    //if the winner ceases to exist after a merge,
    //hand ownership of that group to the next biggest.


  }

  //see if we're leaving a group.
  if (draggedCard.group != null)
  {
    svg.selectAll("g")
      .filter(function(d)
      { return d.id === draggedCard.id})
      .classed(draggedCard.group, false);

    // remove card from group's array of cards.
    let curGroup = groups.get(draggedCard.group);
    var index = curGroup.indexOf(draggedCard.id);
    curGroup.splice(index, 1);
  }

  draggedCard.group = null; //todo: change this probably

  if (newHits.size > 0) {
    // we've hit one or more cards
    draggedCard.overlaps = new Set(newHits); //save overlaps
    for (let hit of newHits) {
      // the hits need to know that they are overlapping too.
      hit.overlaps.add(draggedCard);
    }

    var arr = [...draggedCard.overlaps];
    arr.push(draggedCard);
    mergeCards(arr);
  }
}

function findHits(activeCard) {
// let's see what this card overlaps with.

  var hits = new Set();

  // find collisions in the canvas
  var items = d3.selectAll("rect").each(function(d) {
    if (d.id === activeCard.id) {return;} // self

    if (activeCard.x < d.x + cardWidth && activeCard.x + cardWidth > d.x &&
        activeCard.y < d.y + cardHeight && cardHeight + activeCard.y > d.y) {

        // collision detected.
        console.log("I am jojo");
        hits.add(d);
    }
  })
  return hits;
}

function getChainedCards(cur) {
  var fullChain = findHits(cur).add(cur);
  var curChain = new Set();
  var newOnes = new Set();

  // we seed newOnes with initial set of hits,
  for (let item of fullChain) newOnes.add(item);

  while (newOnes.size > 0) {
    for (let card of newOnes) {
      let hts = findHits(card); // find it's hits.
      if (hts.size > 1) {
        for (let card of hts) {
          curChain.add(card); // add new hits to the current chain
        }
      }
    }
    // see what we've found in the current chain that hasn't been found before
    newOnes = new Set(
      [...curChain].filter(x => !fullChain.has(x)));

    // add new hits to the full chain and clear curChain so we can start fresh.
    for (let item of newOnes) fullChain.add(item);
    curChain.clear();
  }
  return fullChain;
}

function mergeCards(cardsToMerge) {

  var biggestGroup = null;

  // see what groups need to be merged
  var groupsToMerge = new Set();
  var grouplessCards = new Set();

  for (let card of cardsToMerge) {
    if (card.group != null)
    {
      groupsToMerge.add(card.group);
    }
    else {
      grouplessCards.add(card);
    }
  }

  // if none of the cards are in a group, we need a new group.
  if (groupsToMerge.size === 0)
  {
    numGroups++;
    biggestGroup = "g" + numGroups;
    var items = [];

    for (let card of cardsToMerge) {
      card.group = biggestGroup;
      items.push(card);
    }
    groups.set(biggestGroup, items) //adds a group to the pile
  }

  else {
    // one or more cards are in a group, so we find the group with the largest size
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
          let itemToTest = loserGroup[i];
          let something = cards.find(card => card.id === itemToTest.id);
          something.group = biggestGroup;
          kSet.push(itemToTest);
        }

        //finally, remove the group
        groups.delete(g);
      }
    }

    //now, set all group-less items to this group.
    for (let card of grouplessCards)
    {
      card.group = biggestGroup;
      kSet.push(card);
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

function addCardClass (card, group) {
  svg.selectAll("g")
    .filter(function(d)
    { return d.id === card.id})
    .classed(group, true);
}

function removeCardClass (card, group) {
  svg.selectAll("g")
    .filter(function(d)
    { return d.id === card.id})
    .classed(group, false);
}

init();

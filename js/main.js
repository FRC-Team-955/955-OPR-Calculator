// All the event names
var eventNames;

// All the event codes
var eventCodes;

// All the team names
var teamNames;

// Variables
var M = m4th.matrix;		// Matrix object to spawn more matrices from

// Global Matrices [A]
var matchesMatrix;			 	// Matrix containing team participation	
var teamsParticipationMatrix;	// Matrix containing team participation in a match
var OPRMatrix;					// Constant Matrix that relates component OPR to component matrix

// Component Matrices [b]
var matchSumMatrix;

// Contains all gui elements that we'll access frequently
var $gui = {};

// Data for table
var headerTable = []; // Data for header table
var dataTable = [];   // Data for data table
var dataTableInc = true;
var tableModes = { team: 0, event: 1, teamsAttending: 2 };
var currTableMode;
var appendToHistory = true;

// Called when the document has been loaded once
$(document).ready(init);

// Called when the document has been loaded
function init()
{	
	setEventNamesAndCodes();
	setTeamNames();
	
	var autoCompleteSource = [];
	
	for(var i = 0; i < eventNames.length; i++)
		autoCompleteSource.push({ label: eventNames[i], category: "Events" });
	
	for(var i = 0; i < teamNames.length; i++)
		if(teamNames[i])
			autoCompleteSource.push({ label: (i + 1) + " | " + teamNames[i], category: "Teams" });
		
	$gui.headerTable = $("#headerTable")[0];
	$gui.dataTable = $("#dataTable")[0];
	$gui.eventCodeInput = $("#eventCodeInput");
	$gui.eventCodeSubmitButton = $("#eventCodeSubmitButton");
	
	$.widget( "custom.catcomplete", $.ui.autocomplete, 
 	{
		_create: function() 
		{
		  this._super();
		  this.widget().menu("option", "items", "> :not(.ui-autocomplete-category)");
		},
		_renderMenu: function( ul, items ) 
		{
	  		var that = this,
			currentCategory = "";
  			
			$.each(items, function(index, item) 
		   	{
				var li;
				
				if(item.category != currentCategory) 
				{
			  		ul.append("<li class='ui-autocomplete-category'>" + item.category + "</li>");
			  		currentCategory = item.category;
				}
				
				li = that._renderItemData(ul, item);
			});
		}
  	});
	
	$gui.eventCodeInput.catcomplete(
	{
		source: function(request, response) {
			var results = $.ui.autocomplete.filter(autoCompleteSource, request.term);

			var predicate = function () {
				var counter = { Teams: 0, Events: 0 };
				var fn = function(item) {
					counter[item.category] += 1;
					return (counter[item.category] <= 5);
				}
				return fn
			}();

			response(results.filter(predicate));
		},
		minLength: 1,
		delay: 0,
		open: function() 
		{ 
			var elms = $(".ui-menu-item");
			var width = 0;
			
			for(var i = 0; i < elms.length; i++)
			{
				var newWidth = getTextWidth(elms[i].innerHTML, "16px orbitron");
				
				if(newWidth > width)
					width = newWidth;
			}
			
			$(".ui-autocomplete").css("width", (width + 13) + "px");
		} 
	});
	
	$gui.eventCodeInput.click(function()
  	{
		this.select();
	});
	
	$gui.eventCodeSubmitButton.click(function()
  	{ 
		$gui.eventCodeInput.css("cursor", "progress");
		$("html,body").css("cursor", "progress");
		window.setTimeout(function()
	  	{		
			$gui.eventCodeInput.blur();
			var input = $gui.eventCodeInput.val().toLowerCase();
			var intInput = parseInt(input, 10);
			var table = null;
			
			try
			{
				if(intInput)
					table = setTeam(intInput);

				else
					table = setEvent(input);
			}

			catch(e){}
			
			if(table !== null)
			{
				if(appendToHistory)
					window.history.pushState("", "", "?search=" + table.search);
				
				makeTable($gui.headerTable, headerTable = table.header, true, true);
				makeTable($gui.dataTable, dataTable = table.data, false, false);
			}
			
			$gui.eventCodeInput.focus();
			window.setTimeout(function()
			{
				$gui.eventCodeInput.css("cursor", "default");
				$("html,body").css("cursor", "default");
			}, 1);
		}, 1);
	});
	
	$(window).keydown(function(e)
 	{
		if(e.keyCode === 13) // Enter
		{
			$gui.eventCodeSubmitButton.click();
			e.preventDefault();
			return;
		}
	});
	
	window.onpopstate = function(e)
	{	
		appendToHistory = false;
		processURLParameter();
		appendToHistory = true;
	}
	
	$("#eventCodeDownloadButton").click(downloadData);
	$gui.eventCodeInput.focus();
	processURLParameter();
}

function processURLParameter()
{
	var urlParams = decodeURI(window.location.search).substring(1).split("&");
	
	for(var i = 0; i < urlParams.length; i++)
	{
		var keyVal = urlParams[i].split("=");
		
		if(keyVal.length >= 1)
		{
			if(keyVal[0].toLowerCase() === "search")
			{
				var val = keyVal[1].toLowerCase();
				var intVal = parseInt(val, 10);
				
				if(intVal && teamNames[intVal - 1])
					val += " | " + teamNames[intVal - 1];
				
				else
					for(var j = 0; j < eventCodes.length; j++)
					{
						if(val === eventCodes[j])
						{
							val = eventNames[j];
							break;
						}
					}
				
				$gui.eventCodeInput.val(val);
				$gui.eventCodeInput.prop({ selectionStart: 0, selectionEnd: 0 });
				$gui.eventCodeSubmitButton.click();
			}
		}
	}
}

// Set the event to get the opr data from
function setEvent(eventCode) 
{	
	for(var i = 0; i < eventNames.length; i++)
		if(eventNames[i].toLowerCase() === eventCode)
			eventCode = eventCodes[i];
	
	if(eventCode === "txda")
		alert("Warning: Data for this event is incomplete; results may be inaccurate.");
	
	currTableMode = tableModes.event;
	var eventRankingsData = getData("event/2015" + eventCode + "/rankings");
	var matchesData = getData("event/2015" + eventCode + "/matches");
	var table = update(eventRankingsData, matchesData);
	
	if(table.data[0].length === 0)
	{
		currTableMode = tableModes.teamsAttending;
		table.header = [["Team #", "Team Name", "Events Played", "Highest Foul ADJ OPR"]];
		var teamsAtEvent = getData("event/2015" + eventCode + "/teams");
		
		for(var i = 0; i < teamsAtEvent.length; i++)
		{
			var newData = [];
			newData[0] = teamsAtEvent[i].team_number;
			newData[1] = teamNames[parseInt(newData[0], 10) - 1];
			var teamDataTable = setTeam(newData[0]);
			var highestOPR = 0;
			var eventsPlayed = 0;
			
			for(var j = 0; j < teamDataTable.data.length; j++)
			{
				var currVal = teamDataTable.data[j][teamDataTable.data[j].length - 1];
				
				if(currVal !== "N/A")
				{
					eventsPlayed++;
					
					if(currVal > highestOPR)
						highestOPR = currVal;
				}
			}
			
			newData[2] = eventsPlayed;
			newData[3] = highestOPR;
			table.data[i] = newData;
		}
		
		while(true)
		{
			var sorted = true;
			
			for(var i = 0; i < table.data.length - 1; i++)
			{
				if(table.data[i][0] > table.data[i + 1][0])
				{
					var tmp = table.data[i];
					table.data[i] = table.data[i + 1];
					table.data[i + 1] = tmp;
					sorted = false;
				}
			}
			
			if(sorted)
				break;
		}
		
		currTableMode = tableModes.teamsAttending;
	}
		
	return { search: eventCode, header: table.header, data: table.data };
}

function setTeam(teamNumber)
{
	currTableMode = tableModes.team;
	var eventRankingsData = [];
	var matchesData = [];
	var teamEvents = getData("team/frc" + teamNumber + "/2015/events");
	
	while(true)
	{
		var sorted = true;
		
		for(var i = 0; i < teamEvents.length - 1; i++)
		{
			var currDate = teamEvents[i].start_date.split("-");
			currDate = new Date(currDate[0], currDate[1], currDate[2]);
			var nextDate = teamEvents[i + 1].start_date.split("-");
			nextDate = new Date(nextDate[0], nextDate[1], nextDate[2]);
			
			if(currDate > nextDate)
			{
				var tmp = teamEvents[i];
				teamEvents[i] = teamEvents[i + 1];
				teamEvents[i + 1] = tmp;
				sorted = false;
			}
		}
		
		if(sorted)
			break;
	}
	
	for(var i = 0; i < teamEvents.length; i++)
	{
		eventRankingsData[i] = getData("event/2015" + teamEvents[i].event_code + "/rankings");
		matchesData[i] = getData("event/2015" + teamEvents[i].event_code + "/matches");
	}
	
	var header = 
	[[
		"Event Code",
		"Rank",
		"Auto OPR",
		"Bin OPR",
		"Coop OPR",
		"Litter OPR",
		"Tote OPR",
		"Contribution %",
		"Foul ADJ OPR"	
	]];

	var data = [];

	for(var i = 0; i < eventRankingsData.length; i++)
	{
		var table = update(eventRankingsData[i], matchesData[i]);
		var newData = [];
		
		for(var j = 0; j < table.data.length; j++)
			if(table.data[j][1] === teamNumber)
				newData = table.data[j];
		
		if(newData.length === 0)
			for(var j = 0; j < header[0].length; j++)
				newData[j] = "N/A";
				
		data.push(newData);
	}

	// Row
	for(var i = 0; i < data.length; i++)
	{
		data[i][1] = data[i][0];
		data[i][0] = teamEvents[i].event_code.toUpperCase();
	}

	return { search: teamNumber, header: header, data: data };
}

// The main body of opr scouting
function update(eventRankingsData, matchesData)
{
	// Event rankings data format
	// 0: "Rank"
	// 1: "Team"
	// 2: "Qual Avg"
	// 3: "Auto"
	// 4: "Container"
	// 5: "Coopertition"
	// 6: "Litter"
	// 7: "Tote"
	// 8: "Played"

	// Team numbers containing indexes
	var teamsIndex = [];

	// Find how many matches were played total at the competition
	var totalMatches = 0;

	for(var i = 0; i < matchesData.length; i++)
		if(matchesData[i].comp_level === "qm")
			totalMatches++;

	// Initialize variables
	var totalTeams = eventRankingsData.length - 1;
	var teamsMatrix = M(totalTeams, 1);

	// Global Matrices [A]
	matchesMatrix = getEmptyMatrix(totalTeams, totalMatches * 2);
	teamsParticipationMatrix = getEmptyMatrix(totalMatches * 2, totalTeams);

	// Component Matrices [b]
	var teamsAutoMatrix = M(totalTeams, 1);
	var teamsContainerMatrix = M(totalTeams, 1);
	var teamsCoopMatrix = M(totalTeams, 1);
	var teamsLitterMatrix = M(totalTeams, 1);
	var teamsToteMatrix = M(totalTeams, 1);
	matchSumMatrix = M(totalMatches * 2, 1);

	//OPR matrices
	var autoPR;
	var containerPR;
	var coopPR;
	var litterPR;
	var totePR;
	var overallPR;
	var foulPR;
	// Set the teamsMatrix and teamsContainerMatrix
	for(var i = 1; i < eventRankingsData.length; i++)
	{
		var teamNumber = eventRankingsData[i][1];					// Get team number
		teamsIndex[teamNumber] = i - 1;								// Give each team number an teams matrix index
		teamsMatrix.set(i - 1, 0, teamNumber);						// Set the teams matrix a number

		teamsAutoMatrix.set(i - 1, 0, eventRankingsData[i][3]);
		teamsContainerMatrix.set(i - 1, 0, eventRankingsData[i][4]);
		teamsCoopMatrix.set(i - 1, 0, eventRankingsData[i][5]);
		teamsLitterMatrix.set(i - 1, 0, eventRankingsData[i][6]);
		teamsToteMatrix.set(i - 1, 0, eventRankingsData[i][7]);
	}

	// Loop through all qualification matches
	for(var i = 0; i < matchesData.length; i++)
	{
		// Qualification matches only
		if(matchesData[i].comp_level === "qm")
		{
			// Get match number
			var matchNumber = matchesData[i].match_number;

			// Loop though red alliance, set corresponding matrix row column to 1
			for(var j = 0; j < matchesData[i].alliances.red.teams.length; j++)
			{
				var teamNumber =  parseInt(matchesData[i].alliances.red.teams[j].substr(3), 10);

				// Global Matrix [A]
				matchesMatrix.set(teamsIndex[teamNumber], (matchNumber - 1) * 2, 1);
				teamsParticipationMatrix.set((matchNumber - 1) * 2, teamsIndex[teamNumber], 1);
			}

			// Loop though blue alliance, set corresponding matrix row column to 1
			for(var j = 0; j < matchesData[i].alliances.blue.teams.length; j++)
			{
				var teamNumber =  parseInt(matchesData[i].alliances.blue.teams[j].substr(3), 10);

				// Global Matrix [A]
				matchesMatrix.set(teamsIndex[teamNumber], ((matchNumber - 1) * 2) + 1, 1);
				teamsParticipationMatrix.set(((matchNumber - 1) * 2) + 1, teamsIndex[teamNumber], 1);
			}

			// Add match sums to matrix, Component Matrix [b]
			matchSumMatrix.set((matchNumber - 1) * 2, 0, matchesData[i].alliances.red.score);
			matchSumMatrix.set(((matchNumber - 1) * 2) + 1, 0, matchesData[i].alliances.blue.score);
		}	
	}

	OPRMatrix = m4th.lu(matchesMatrix.mult(teamsParticipationMatrix)).getInverse();

	autoPR = getComponentOPR(teamsAutoMatrix);
	containerPR = getComponentOPR(teamsContainerMatrix);
	coopPR = getComponentOPR(teamsCoopMatrix);
	litterPR = getComponentOPR(teamsLitterMatrix);
	totePR = getComponentOPR(teamsToteMatrix);

	// Solves overdetermined system [A][x]=[b] using Cholesky decomposition 
	overallPR = m4th.ud(teamsParticipationMatrix.transp().mult(teamsParticipationMatrix)).solve(teamsParticipationMatrix.transp().mult(matchSumMatrix));		

	var toteCountPR = totePR.times(.5);
	var teamsTotalsMatrix = teamsAutoMatrix.add(teamsContainerMatrix).add(teamsCoopMatrix).add(teamsLitterMatrix).add(teamsToteMatrix);
	var foulAdjustedOPR = autoPR.add(containerPR).add(litterPR).add(totePR);
	var overallContributionPercent = M(teamsTotalsMatrix.rows,1);

	foulPR = overallPR.minus(foulAdjustedOPR);

	var autoContributionPercent = M(teamsTotalsMatrix.rows,1);
	var containerContributionPercent = M(teamsTotalsMatrix.rows,1);
	var coopContributionPercent = M(teamsTotalsMatrix.rows,1);
	var litterContributionPercent = M(teamsTotalsMatrix.rows,1);
	var toteContributionPercent = M(teamsTotalsMatrix.rows,1);

	//TODO: match strength is the sum of all OPRs in your match history (except you). Carried is whether your contribution is < 33%
	for(var i = 0; i < teamsTotalsMatrix.rows; i++)
	{
		overallContributionPercent.set(i,0,overallPR.get(i,0)/teamsTotalsMatrix.get(i,0)*eventRankingsData[i+1][8]*100);

		autoContributionPercent.set(i,0,autoPR.get(i,0)/teamsAutoMatrix.get(i,0)*eventRankingsData[i+1][8]*100);
		containerContributionPercent.set(i,0,containerPR.get(i,0)/teamsContainerMatrix.get(i,0)*eventRankingsData[i+1][8]*100);
		coopContributionPercent.set(i,0,coopPR.get(i,0)/teamsCoopMatrix.get(i,0)*eventRankingsData[i+1][8]*100);
		litterContributionPercent.set(i,0,litterPR.get(i,0)/teamsLitterMatrix.get(i,0)*eventRankingsData[i+1][8]*100);
		toteContributionPercent.set(i,0,totePR.get(i,0)/teamsToteMatrix.get(i,0)*eventRankingsData[i+1][8]*100);
	}
	var cappedTotesPR = containerPR.times(.25);
	var uncappedTotesPR = toteCountPR.minus(cappedTotesPR);

	// Header for table
	headerTable =
	[
		[
			"Rank",
			"Team #",
			"Auto OPR",
			"Bin OPR",
			"Coop OPR",
			"Litter OPR",
			"Tote OPR",
			"Contribution %",
			"Foul ADJ OPR"
		]
	];

	var rankingMatrix = M(totalTeams, 1);

	for(var i = 0; i < totalTeams; i++)
		rankingMatrix.set(i, 0, i + 1);

	// Data for table
	var dataMatrix = 
	[
		rankingMatrix,
		teamsMatrix,
		autoPR,
		containerPR,
		coopPR,
		litterPR,
		totePR,
		overallContributionPercent,
		foulAdjustedOPR
	];

	// Multi Dimensional form of
	dataTable = [[]];

	// Row
	for(var i = 0; i < dataMatrix[0].rows; i++)
	{
		dataTable[i] = [];

		// Column
		for(var j = 0; j < dataMatrix.length; j++)
			dataTable[i][j] = dataMatrix[j].get(i, 0);
	}
	
	return { header: headerTable, data: dataTable };
}

// Solves the system [A][B][x] = [b]
//[A] and [B] are binary matrices representing robot per match and match schedule per robot 
function getComponentOPR(componentMatrix)
{
	return OPRMatrix.mult(componentMatrix);
}

// Returns a matrix row by column filled with 0s
function getEmptyMatrix(row, column)
{
	var matrix = M(row, column);
	
	for(var i = 0; i < row; i++)
		for(var j = 0; j < column; j++)
			matrix.set(i, j, 0);
	
	return matrix;
}

// Gets data from thebluealliance
function getData(key)
{
	return JSON.parse($.ajax({ url:"http://www.thebluealliance.com/api/v2/" + key + "?X-TBA-App-Id=frc955:opr-system:v01", async: false }).responseText);
}

// Makes a table in the gui
function makeTable(table, newDataTable, startDark, firstRowBolded)
{
	var $tableContainer = table;
	var $table = document.createElement("table");
	$table.setAttribute("id", "table");
	$table.classList.add("table");

	// Row
	for(var i = 0; i < newDataTable.length; i++)
	{
		var newRow = document.createElement("tr");
		newRow.classList.add("tableRow");
		
		if((startDark && i % 2 == 0) || (!startDark && i % 2 != 0))
			newRow.classList.add("darkGray");

		// Column
		for(var j = 0; j < newDataTable[i].length; j++)
		{
			var addClickClasses = false;
			var titleData = "";
			var newCol = document.createElement("td");
			newDataTable[i][j] = isNaN(newDataTable[i][j]) ? newDataTable[i][j] : zero(round(newDataTable[i][j]));
			
			if(i === 0 && firstRowBolded)
			{
				newCol = document.createElement("th");
				newCol.classList.add("tableCellHeader");
				newCol.classList.add("button");
				newCol.id = j;
			}
			
			else if(currTableMode === tableModes.team && j === 0)
			{
				addClickClasses = true;
				
				for(var k = 0; k < eventCodes.length; k++)
				{
					if(newDataTable[i][j].toLowerCase() === eventCodes[k])
					{
						titleData = eventNames[k];
						break;
					}
				}
			}
			
			else if(currTableMode === tableModes.event && j === 1)
			{
				addClickClasses = true;
				titleData = teamNames[parseInt(newDataTable[i][j], 10) - 1];
			}
			
			else if(currTableMode === tableModes.teamsAttending && j === 0)
			{
				addClickClasses = true;
				titleData = "";
			}
			
			if(addClickClasses)
			{
				newCol.classList.add("button");
				newCol.classList.add("tableSearchQuery");
			}
			
			newCol.style.width = (1200 / newDataTable[i].length) + "px";
			newCol.setAttribute("title", titleData);
			newCol.classList.add("tableCell");
			newCol.innerHTML = newDataTable[i][j];
			newRow.appendChild(newCol);
		}
		
		$table.appendChild(newRow);
	}

	$tableContainer.innerHTML = $table.outerHTML;
	
	if(firstRowBolded)
		$(".tableCellHeader").click(sortDataTable);
	
	$(".button.tableSearchQuery").click(function()
	{
		var begParamI = document.URL.indexOf("?");
		window.open(document.URL.substring(0, begParamI) + "?search=" + this.innerHTML.toLowerCase());
	});
}

// Sorts data table
function sortDataTable(e, inc)
{	
	if(dataTable.length <= 1)
		return;
	
	var colIndex = e.target.id;
	dataTableInc = !dataTableInc;
	
	while(true)
	{
		var sorted = true;
		
		for(var i = 0; i < dataTable.length - 1; i++)
		{
			if((dataTableInc && dataTable[i][colIndex] < dataTable[i + 1][colIndex]) || (!dataTableInc && dataTable[i][colIndex] > dataTable[i + 1][colIndex]))
			{
				var tmp = dataTable[i];
				dataTable[i] = dataTable[i + 1];
				dataTable[i + 1] = tmp;
				sorted = false;
			}
		}
		
		if(sorted)
			break;
	}
	
	makeTable($gui.dataTable, dataTable, false, false);
}

// Rounds the number to the nearest hundreths place
function round(num)
{
	return Math.floor((num * 100) + 0.5) / 100;
}

// If the number is < 0 return 0, else return number
function zero(num)
{
	if(num < 0)
		return 0;
	
	return num;
}

// Downloads the opr data the user is currently viewing
function downloadData()
{
	var str = "";
	
	for(var i = 0; i < headerTable[0].length; i++)
		str += headerTable[0][i] + ",";
	
	str += "\n";
	
	for(var i = 0; i < dataTable.length; i++)
	{
		for(var j = 0; j < dataTable[i].length; j++)
			str += dataTable[i][j] + ",";
		
		str += "\n";
	}
	
	saveFile("oprData.csv", str);
}

// Saves the file to the users computer
function saveFile(fileName, fileData)
{
	saveAs(new Blob([fileData], { type: "text/plain;charset=" + document.characterSet }), fileName);
}

/**
 * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
 * 
 * @param {String} text The text to be rendered.
 * @param {String} font The css font descriptor that text is to be rendered with (e.g. "bold 14px verdana").
 * 
 * @see http://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
 */
function getTextWidth(text, font) {
	// re-use canvas object for better performance
	var canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
	var context = canvas.getContext("2d");
	context.font = font;
	var metrics = context.measureText(text);
	return metrics.width;
};

// Gets all the events for 2015 Recycle Rush, for debugging/updating the event names/codes
function getAllEvents()
{
	var events = getData("events/2015");
	var strEventNames = "";
	var strEventCodes = "";

	for(var i = 0; i < events.length; i++)
	{
		eventNames[i] = events[i].name;
		strEventNames += '"' + events[i].name + '",\n';
		eventCodes[i] = events[i].event_code;
		strEventCodes += '"' + events[i].event_code + '",\n';
	}
		
	saveFile("eventNamesAndCodes.txt", strEventNames + "\n" + strEventCodes);
}

// Gets all the team names from 1 - 6000 inclusive
function getAllTeamNames()
{
	var teamDatas = [];
	var teamNames = [];
	var fileData = "";
	
	for(var i = 0; i < 12; i++)
		teamDatas = teamDatas.concat(getData("teams/" + i));
	
	for(var i = 0; i < teamDatas.length; i++)
		teamNames[parseInt(teamDatas[i].key.substring(3), 10) - 1] = teamDatas[i].nickname || "";
	
	for(var i = 0; i < teamNames.length; i++)
	{
		if(typeof(teamNames[i]) === "undefined")
			teamNames[i] = "";
		
		teamNames[i] = replaceAll(teamNames[i], '\"', '\\"');
		teamNames[i] = replaceAll(teamNames[i], "\'", "\\'");
		fileData += '\t\t"' + teamNames[i] + '",\n'
	}
	
	saveFile("teamNames.txt", fileData);
}

function escapeRegExp(string)
{
    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function replaceAll(string, find, replace)
{
  return string.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}
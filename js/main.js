// All the event names
var eventNames;

// All the event codes
var eventCodes;

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
var headerTable; // Data for header table
var dataTable;   // Data for data table
var dataTableInc = true;

// Called when the document has been loaded once
$(document).ready(init);

// Called when the document has been loaded
function init()
{	
	setEventNamesAndCodes();
	$gui.headerTable = $("#headerTable")[0];
	$gui.dataTable = $("#dataTable")[0];
	$gui.eventCodeInput = $("#eventCodeInput");
	$gui.eventCodeSubmitButton = $("#eventCodeSubmitButton");
	
	$gui.eventCodeInput.autocomplete(
	{
		source: eventNames,
		minLength: 3,
		open: function() 
		{ 
			var elms = $(".ui-menu-item");
			var width = 0;
			
			for(var i = 0; i < elms.length; i++)
			{
				var newWidth = getTextWidth(elms[i].innerText, "orbitron");
				
				if(newWidth > width)
					width = newWidth;
			}
			
			width *= 2;
			$(".ui-autocomplete").css("width", width + "px");
		} 
	});
	
	$gui.eventCodeInput.click(function()
  	{
		this.select();
	});
	
	$gui.eventCodeSubmitButton.click(function()
  	{ 
		$gui.eventCodeInput.blur();
		var input = $gui.eventCodeInput.val().toLowerCase();
		
		if(isNaN(input))
			setEvent(input);
		
		else
			setTeam(parseInt(input));
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
	
	$("#eventCodeDownloadButton").click(downloadData);
	$gui.eventCodeInput.focus();
	
	console.log(window.location.search);
}

// Set the event to get the opr data from
function setEvent(eventCode) 
{	
	for(var i = 0; i < eventNames.length; i++)
		if(eventNames[i].toLowerCase() === eventCode)
			eventCode = eventCodes[i];
	
	if(eventCode === "txda")
		alert("Warning: Data for this event is incomplete; results may be inaccurate.");
	
	var eventRankingsData = getData("event/2015" + eventCode + "/rankings");
	var matchesData = getData("event/2015" + eventCode + "/matches");
	var table = update(eventRankingsData, matchesData);
	headerTable = table.header;
	dataTable = table.data;
	makeTable($gui.headerTable, table.header, true, true);
	makeTable($gui.dataTable, table.data, false, false);
	$gui.eventCodeInput.focus();
}

function setTeam(teamNumber)
{
	var eventRankingsData = [];
	var matchesData = [];
	var teamEvents = getData("team/frc" + teamNumber + "/2015/events");
	
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

		for(var j = 0; j < table.data.length; j++)
			if(table.data[j][1] === teamNumber)
				data.push(table.data[j]);
	}

	// Row
	for(var i = 0; i < data.length; i++)
	{
		data[i][1] = data[i][0];
		data[i][0] = teamEvents[i].event_code.toUpperCase();
	}

	headerTable = header;
	dataTable = data;
	makeTable($gui.headerTable, headerTable, true, true);
	makeTable($gui.dataTable, dataTable, false, false);
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
				var teamNumber =  parseInt(matchesData[i].alliances.red.teams[j].substr(3));

				// Global Matrix [A]
				matchesMatrix.set(teamsIndex[teamNumber], (matchNumber - 1) * 2, 1);
				teamsParticipationMatrix.set((matchNumber - 1) * 2, teamsIndex[teamNumber], 1);
			}

			// Loop though blue alliance, set corresponding matrix row column to 1
			for(var j = 0; j < matchesData[i].alliances.blue.teams.length; j++)
			{
				var teamNumber =  parseInt(matchesData[i].alliances.blue.teams[j].substr(3));

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
function makeTable(table, dataTable, startDark, firstRowBolded)
{
	var $tableContainer = table;
	var $table = document.createElement("table");
	$table.setAttribute("id", "table");
	$table.classList.add("table");

	// Row
	for(var i = 0; i < dataTable.length; i++)
	{
		var newRow = document.createElement("tr");

		if((startDark && i % 2 == 0) || (!startDark && i % 2 != 0))
			newRow.classList.add("darkGray");

		newRow.classList.add("tableRow");

		// Column
		for(var j = 0; j < dataTable[i].length; j++)
		{
			var newCol = document.createElement("td");

			if(i === 0 && firstRowBolded)
			{
				newCol = document.createElement("th");
				newCol.classList.add("tableCellHeader");
				newCol.classList.add("button");
				newCol.id = j;
			}

			newCol.classList.add("tableCell");
			dataTable[i][j] = isNaN(dataTable[i][j]) ? dataTable[i][j] : zero(round(dataTable[i][j]));
			newCol.innerHTML = dataTable[i][j];
			newRow.appendChild(newCol);
		}
		
		$table.appendChild(newRow);
	}

	$tableContainer.innerHTML = $table.outerHTML;
	
	if(firstRowBolded)
		$(".tableCellHeader").click(sortDataTable);
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
	var e = document.createElement('a');
	e.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(fileData));
	e.setAttribute('download', fileName);
	e.click();
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

// Sets the eventNames and eventCodes variables
function setEventNamesAndCodes()
{
	eventNames = 
	[
		"Western Canada Regional",
		"Arkansas Rock City Regional",
		"Australia Regional",
		"Arizona East Regional",
		"Arizona West Regional",
		"Los Angeles Regional sponsored by The Roddenberry Foundation",
		"Central Valley Regional",
		"Inland Empire Regional",
		"Sacramento Regional",
		"San Diego Regional",
		"Silicon Valley Regional",
		"Ventura Regional",
		"Colorado Regional",
		"NE District - Hartford Event",
		"Suffield Shakedown",
		"NE District - Waterbury Event",
		"Greater DC Regional",
		"South Florida Regional",
		"Orlando Regional",
		"Peachtree Regional",
		"Georgia Southern Classic Regional",
		"Hawaii Regional",
		"Midwest Regional",
		"Central Illinois Regional",
		"Indiana FIRST District Championship",
		"IN District - Indianapolis Event",
		"IN District - Kokomo City of Firsts Event sponsored by AndyMark",
		"IN District - Purdue Event",
		"Israel Regional",
		"Bayou Regional",
		"NE District - Northeastern University Event",
		"NE District - UMass - Dartmouth Event",
		"NE District - Reading Event",
		"NE District - Pioneer Valley Event",
		"Chesapeake Regional",
		"NE District - Pine Tree Event",
		"FIM District - Bedford Event",
		"FIM District - Center Line Event",
		"FIRST in Michigan District Championship",
		"FIM District - Escanaba Event",
		"FIM District - Woodhaven Event",
		"FIM District - Gull Lake Event",
		"FIM District - Howell Event",
		"FIM District - Kentwood Event",
		"FIM District - Kettering University Event",
		"FIM District - Lansing Event",
		"FIM District - Livonia Event",
		"FIM District - Great Lakes Bay Region Event",
		"FIM District - St. Joseph Event",
		"FIM District - Southfield Event",
		"FIM District - Standish Event",
		"FIM District - Troy Event",
		"FIM District - Traverse City Event",
		"FIM District - Waterford Event",
		"FIM District - West Michigan Event",
		"Lake Superior Regional",
		"Northern Lights Regional",
		"Minnesota 10000 Lakes Regional",
		"Minnesota North Star Regional",
		"Greater Kansas City Regional",
		"St. Louis Regional",
		"Mid-Atlantic Robotics District Championship",
		"Mexico City Regional",
		"North Carolina Regional",
		"NE FIRST District Championship presented by United Technologies",
		"NE District - UNH Event",
		"NE District - Granite State Event",
		"Week Zero",
		"MAR District - Bridgewater-Raritan Event",
		"MAR District - Mt. Olive Event",
		"MAR District - North Brunswick Event",
		"MAR District - Seneca Event",
		"Las Vegas Regional",
		"SBPLI Long Island Regional",
		"New York City Regional",
		"Finger Lakes Regional",
		"New York Tech Valley Regional",
		"Queen City Regional",
		"Buckeye Regional",
		"Oklahoma Regional",
		"North Bay Regional",
		"Greater Toronto East Regional",
		"Greater Toronto Central Regional",
		"Waterloo Regional",
		"Windsor Essex Great Lakes Regional",
		"PNW District - Oregon City Event",
		"PNW District - Philomath Event",
		"PNW District - Wilsonville Event",
		"MAR District - Upper Darby Event",
		"MAR District - Hatboro-Horsham Event",
		"MAR District - Springside Chestnut Hill Event",
		"Greater Pittsburgh Regional",
		"Pacific Northwest District Championship",
		"FRC Festival de Robotique - Montreal Regional",
		"NE District - Rhode Island Event",
		"Palmetto Regional",
		"Smoky Mountains Regional",
		"Dallas Regional",
		"Lone Star Regional",
		"Hub City Regional",
		"Alamo Regional sponsored by Rackspace Hosting",
		"Utah Regional",
		"Virginia Regional",
		"PNW District - Auburn Event",
		"PNW District - Auburn Mountainview Event",
		"PNW District - Central Washington University Event",
		"PNW District - Mount Vernon Event",
		"PNW District - Shorewood Event",
		"PNW District - Glacier Peak Event",
		"PNW District - West Valley Event",
		"Wisconsin Regional"
	];
	
	eventCodes = 
	[
		"abca",
		"arfa",
		"ausy",
		"azch",
		"azpx",
		"calb",
		"cama",
		"carm",
		"casa",
		"casd",
		"casj",
		"cave",
		"code",
		"cthar",
		"ctss",
		"ctwat",
		"dcwa",
		"flfo",
		"flor",
		"gadu",
		"gape",
		"hiho",
		"ilch",
		"ilil",
		"incmp",
		"inind",
		"inkok",
		"inwla",
		"ista",
		"lake",
		"mabos",
		"manda",
		"marea",
		"maspr",
		"mdcp",
		"melew",
		"mibed",
		"micen",
		"micmp",
		"miesc",
		"mifla",
		"migul",
		"mihow",
		"miken",
		"miket",
		"milan",
		"miliv",
		"mimid",
		"misjo",
		"misou",
		"mista",
		"mitry",
		"mitvc",
		"miwat",
		"miwmi",
		"mndu",
		"mndu2",
		"mnmi",
		"mnmi2",
		"mokc",
		"mosl",
		"mrcmp",
		"mxmc",
		"ncre",
		"necmp",
		"nhdur",
		"nhnas",
		"nhwz",
		"njbri",
		"njfla",
		"njnbr",
		"njtab",
		"nvlv",
		"nyli",
		"nyny",
		"nyro",
		"nytr",
		"ohci",
		"ohcl",
		"okok",
		"onnb",
		"onto",
		"onto2",
		"onwa",
		"onwi",
		"orore",
		"orphi",
		"orwil",
		"padre",
		"pahat",
		"paphi",
		"papi",
		"pncmp",
		"qcmo",
		"rismi",
		"scmb",
		"tnkn",
		"txda",
		"txho",
		"txlu",
		"txsa",
		"utwv",
		"vari",
		"waahs",
		"waamv",
		"waell",
		"wamou",
		"washo",
		"wasno",
		"waspo",
		"wimi"
	];
}
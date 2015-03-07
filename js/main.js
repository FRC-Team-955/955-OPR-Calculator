var totalTeams;				// Total teams playing at an event
var matchesPlayed = 0;		// Total matches played at an event
var M = m4th.matrix;		// Matrix object to spawn more matrices from
var matchesMatrix;			// Matrix containing team participation	
var teamsMatrix;			// Matrix containing team numbers
var teamsContainerMatrix;	// Matrix containing team containers
var teamsToteMatrix;		// Matrix containing team totes
var teamParticipationMatrix;// Matrix containing team participation in a match
var matchSumMatrix;			// Matrix containing match sum
var eventRankingsData;		// Event ranking data
var matchesData;			// Match data
var teamsIndex = [];		// Team numbers containing indexes
var dataNeeded = 0;			// Data needed to load
var dataLoaded = 0;			// Data that has been loaded

// Called when the document has been loaded once
$(document).ready(init);

// Init the opr data
function init() 
{
	console.log("Init");
	getData("event/2015orore/rankings", getEventRankings);
	getData("event/2015orore/matches", getMatchesData);
	main();
}

// The main body of opr scouting
function main()
{
	// Wait for all the data to be loaded first
	if(dataNeeded !== dataLoaded)
		setTimeout(main, 1000);
	
	else
	{
		// Array data format
		// 0: "Rank"
		// 1: "Team"
		// 2: "Qual Avg"
		// 3: "Auto"
		// 4: "Container"
		// 5: "Coopertition"
		// 6: "Litter"
		// 7: "Tote"
		// 8: "Played"
		
		// Find how many matches were played total at the competition
		for(var i = 0; i < matchesData.length; i++)
			if(matchesData[i].comp_level === "qm")
				matchesPlayed++;
		
		// Initalized variables
		totalTeams = eventRankingsData.length - 1;
		M = m4th.matrix;
		matchesMatrix = M(totalTeams, matchesPlayed * 2);
		teamsMatrix = M(totalTeams, 1);
		teamsContainerMatrix = M(totalTeams, 1);
		teamsToteMatrix = M(totalTeams, 1);
		teamParticipationMatrix = getEmptyMatrix(matchesPlayed * 2, totalTeams);
		matchSumMatrix = M(matchesPlayed * 2, 1);
		
		// Set the teamsMatrix and teamsContainerMatrix
		for(var i = 1; i < eventRankingsData.length; i++)
		{
			var teamNumber = eventRankingsData[i][1];					// Get team number
			teamsIndex[teamNumber] = i - 1;								// Give each team number an teams matrix index
			teamsMatrix.set(i - 1, 0, teamNumber);						// Set the teams matrix a number
			teamsContainerMatrix.set(i - 1, 0, eventRankingsData[i][4])	// Set the teams containr matrix a number
			teamsToteMatrix.set(i - 1, 0, eventRankingsData[i][7])	// Set the teams containr matrix a number
		}
		
		// Initialize matchesMatrix data to 0
		for(var i = 0; i < matchesMatrix.rows; i++)
			for(var j = 0; j < matchesMatrix.columns; j++)
				matchesMatrix.set(i, j, 0);
			
		// Loop through all qualification matches
		for(var i = 0; i < matchesData.length; i++)
		{
			// Qualification matches only
			if(matchesData[i].comp_level === "qm")
			{
				//console.log(matchesData[i]);
				// Get match number
				var matchNumber = matchesData[i].match_number;
				
				// Loop though red alliance, set corresponding matrix row column to 1
				for(var j = 0; j < matchesData[i].alliances.red.teams.length; j++)
				{
					var teamNumber =  parseInt(matchesData[i].alliances.red.teams[j].substr(3));
					matchesMatrix.set(teamsIndex[teamNumber], (matchNumber - 1) * 2, 1);
					teamParticipationMatrix.set((matchNumber - 1) * 2, teamsIndex[teamNumber], 1);
					//console.log(matchNumber);
				}
				
				// Loop though blue alliance, set corresponding matrix row column to 1
				for(var j = 0; j < matchesData[i].alliances.blue.teams.length; j++)
				{
					var teamNumber =  parseInt(matchesData[i].alliances.blue.teams[j].substr(3));
					matchesMatrix.set(teamsIndex[teamNumber], ((matchNumber - 1) * 2) + 1, 1);
					teamParticipationMatrix.set(((matchNumber - 1) * 2) + 1, teamsIndex[teamNumber], 1);
					//console.log(matchNumber);
				}
				
				// Add match sums to matrix
				matchSumMatrix.set((matchNumber - 1) * 2, 1, matchesData[i].alliances.red.score);
				matchSumMatrix.set(((matchNumber - 1) * 2) + 1, 1, matchesData[i].alliances.blue.score);
			}
		}
		
		// Print matrixs
//		for(var i = 0; i < matchesMatrix.rows; i++)
//		{
//			var str = "";
//			
//			for(var j = 0; j < matchesMatrix.columns; j++)
//				str += matchesMatrix.get(i, j);
//			
//			console.log(str + " || " + teamsMatrix.get(i, 0));
//		}
		
		for(var i = 0; i < teamParticipationMatrix.rows; i++)
		{
			var str = "";

			for(var j = 0; j < teamParticipationMatrix.columns; j++)
				str += teamParticipationMatrix.get(i, j);

			console.log(str + " || " + ((i / 2)+ 1) + " || " + matchSumMatrix.get(i, 1));
		}
		
//		console.log(teamsMatrix);
//		console.log(teamsContainerMatrix);
//		console.log(teamsToteMatrix);
	}
}

function getEventRankings(data)
{
	eventRankingsData = data;
}

function getMatchesData(data)
{
	matchesData = data;
}

function getEmptyMatrix(row, column)
{
	var matrix = M(row, column);
	
	for(var i = 0; i < row; i++)
		for(var j = 0; j < column; j++)
			matrix.set(i, j, 0);
	
	return matrix;
}

// Gets data from thebluealliance
function getData(key, callback)
{
	dataNeeded++;
	
	$.ajax
	({
		url:"http://www.thebluealliance.com/api/v2/" + key + "?X-TBA-App-Id=frc955:opr-system:v01",
		success:function(data)
		{
			callback(data);
			dataLoaded++;
		},
		error:function()
		{
			callback(null);
		} 
	});
}
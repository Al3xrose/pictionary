var express = require('express');
var socket = require('socket.io');
var escape = require('escape-html');
var fs = require('fs');

var port = 8080;
var server = express();
var io = socket(server.listen(port));
var canvasData;
var drawStrokes = [];
var ROUND_TIMER = 60;
var timerCount = ROUND_TIMER;
var roundTimeoutVar;
var roundTimerVar;

var objectClients = {};
var playerNo = 1;
var clientDrawing = "";
var words = fs.readFileSync('wordlist.txt').toString().split("\n");
var drawingWord = "";

server.use(express.static('public'));

io.on('connection', function(objectSocket){
	var strIdent = 'Player' + playerNo++;
	objectSocket.strIdent = strIdent;
	objectClients[strIdent] = objectSocket;

	if(clientDrawing === "")
	{
	  clientDrawing = strIdent;
		roundTimeoutVar = setTimeout(function(){
			endRound("");
		}, ROUND_TIMER * 1000);

		roundTimerVar = setInterval(function(){
			timerCount--;
			console.log(timerCount);
		}, 1000);
		drawingWord = randomWord();
	}

	objectSocket.emit('hello', {
		'strIdent' : strIdent,
		'drawStrokes' : drawStrokes
	});

	objectSocket.emit('startRound', {
		'clientDrawing' : clientDrawing,
		'timerCount' : timerCount,
		'clearCanvas' : false,
		'word' : drawingWord
	});

	io.emit('message',{
    'strFrom' : 'server',
		'strMessage' : strIdent + ' connected'
	});

  objectSocket.on('message', function(objectData) {
    // if the message should be recevied by everyone, broadcast it accordingly
    // if the message has a single target, send it to this target as well as to the origin

    objectData.strFrom = objectSocket.strIdent;

		objectData.strMessage = escape(objectData.strMessage);
    io.emit('message', objectData);

		if(objectData.strMessage.includes(drawingWord))
		{
			endRound(objectData.strFrom);
		}
  });

  objectSocket.on('drawing', function(objectData){

		drawStrokes.push(objectData);
		io.emit('drawing', objectData);
  });

	objectSocket.on('rename', function(objectData){
		var oldname = objectSocket.strIdent;
		var newname = objectData.strIdent;
		if(oldname !== newname
		&& !(Object.keys(objectClients).contains(newname)))
		{
			objectSocket.strIdent = newname;
			objectClients[newname] ;
			delete objectClients[oldname];
			io.emit('message', {
				strFrom : 'server',
				strMessage: oldname + ' changed name to ' + newname
			});
		}
	});

	objectSocket.on('disconnect', function()
	{

		delete objectClients[objectSocket.strIdent];
		if(clientDrawing === objectSocket.strIdent)
		{
			endRound("");
		}
	})
});

function startDraw(clientDrawing)
{
	drawStrokes = [];
	io.emit('clientDrawing',{
		'clientDrawing' : clientDrawing
	});
}

function endRound(strWinner)
{
	drawStrokes = [];

	if(strWinner !== "")
	{
		console.log(strWinner + ' is the winner');
	}

	indexDrawing = Object.keys(objectClients).indexOf(clientDrawing);
	indexDrawing++;

	if(indexDrawing == Object.keys(objectClients).length)
	{
		indexDrawing = 0;
	}

	clientDrawing = Object.keys(objectClients)[indexDrawing];
	if(Object.keys(objectClients).length !== 0)
	{
		startRound();
	}

	clearTimeout(roundTimeoutVar);
	clearInterval(roundTimerVar);

}

function startRound()
{
	drawingWord = randomWord();
	drawStrokes = [];
	clearTimeout(roundTimeoutVar);
	clearInterval(roundTimerVar);
	timerCount = ROUND_TIMER;
	roundTimeoutVar = setTimeout(function(){
		endRound("");
	}, ROUND_TIMER * 1000);

	roundTimerVar = setInterval(function(){
		timerCount--;
		console.log(timerCount);
	}, 1000);

	io.emit('startRound', {
		'clientDrawing' : clientDrawing,
		'timerCount' : timerCount,
		'word' : drawingWord,
		'clearCanvas' : true
	});
}

function randomWord()
{
	return words[Math.floor(Math.random() * words.length)];
}

console.log('listening on port ' + port);

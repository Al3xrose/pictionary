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
	var strIdent = Math.random().toString(36).substr(2,8);
	var nickName = 'Player' + playerNo++;
	objectSocket.strIdent = strIdent;
	objectSocket.nickName = nickName;
	objectClients[strIdent] = objectSocket;

	objectSocket.emit('hello', {
		'strIdent' : strIdent,
		'nickName' : nickName,
		'drawStrokes' : drawStrokes
	});

  objectSocket.on('message', function(objectData) {
    // if the message should be recevied by everyone, broadcast it accordingly
    // if the message has a single target, send it to this target as well as to the origin

    objectData.strFrom = objectSocket.nickName;

		objectData.strMessage = escape(objectData.strMessage);
    io.emit('message', objectData);

		if(objectData.strMessage.includes(drawingWord))
		{
			endRound(objectData.strFrom, objectClients[clientDrawing].nickName);
		}
  });

  objectSocket.on('drawing', function(objectData){
		drawStrokes.push(objectData);
		io.emit('drawing', objectData);
  });

	objectSocket.on('rename', function(objectData){
		objectSocket.nickName = objectData.nickName;
		io.emit('message', {
			//'strFrom' : 'server',
			'strMessage' : objectSocket.nickName + ' has connected',
			'color' : 'grey'
		});
		if(clientDrawing === "")
		{
		  clientDrawing = objectSocket.strIdent;
			roundTimeoutVar = setTimeout(function(){
				endRound("", objectClients[clientDrawing].nickName);
			}, ROUND_TIMER * 1000);

			roundTimerVar = setInterval(function(){
				timerCount--;
				console.log(timerCount);
			}, 1000);
			drawingWord = randomWord();
		}

			objectSocket.emit('startRound', {
				'clientDrawing' : clientDrawing,
				'clientDrawingNickName' : objectClients[clientDrawing].nickName,
				'timerCount' : timerCount,
				'clearCanvas' : false,
				'word' : drawingWord
		});
	});

	objectSocket.on('disconnect', function()
	{
		delete objectClients[objectSocket.strIdent];
		if(clientDrawing === objectSocket.strIdent)
		{
			endRound("", objectSocket.nickName);
		}
		io.emit('message', {
			//'strFrom' : 'server',
			'strMessage' : objectSocket.nickName + ' disconnected',
			'color' : 'grey'
		});
	})
});

function startDraw(clientDrawing)
{
	drawStrokes = [];
	io.emit('clientDrawing',{
		'clientDrawing' : clientDrawing
	});
}

function endRound(strWinner, clientDrawingNickName)
{
	clearTimeout(roundTimeoutVar);
	clearInterval(roundTimerVar);
	drawStrokes = [];

	if(strWinner === "")
	{
		io.emit('message', {
			//'strFrom' : 'server',
			'strMessage' : 'No one guessed ' + clientDrawingNickName
			  + "'s word: " + drawingWord,
				'color' : 'red'
		});
	}
	else {
		io.emit('message', {
			//'strFrom' : 'server',
			'strMessage' : strWinner + ' correctly guessed ' + clientDrawingNickName
			+ "'s word: " + drawingWord,
			'color' : 'green'
		});
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
	else {
		clientDrawing = "";
	}
}

function startRound()
{
	drawingWord = randomWord();
	drawStrokes = [];
	clearTimeout(roundTimeoutVar);
	clearInterval(roundTimerVar);
	timerCount = ROUND_TIMER;
	roundTimeoutVar = setTimeout(function(){
		endRound("", objectClients[clientDrawing].nickName);
	}, ROUND_TIMER * 1000);

	roundTimerVar = setInterval(function(){
		timerCount--;
		console.log(timerCount);
	}, 1000);

	io.emit('startRound', {
		'clientDrawing' : clientDrawing,
		'clientDrawingNickName' : objectClients[clientDrawing].nickName,
		'timerCount' : timerCount,
		'word' : drawingWord,
		'clearCanvas' : true
	});
}

function randomWord()
{
	return words[Math.floor(Math.random() * words.length - 1)];
}

console.log('listening on port ' + port);

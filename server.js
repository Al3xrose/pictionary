var express = require('express');
var socket = require('socket.io');

var server = express();
var io = socket(server.listen(8080));

var objectClients = {};

io.on('connection', function(objectSocket) {
	var strIdent = Math.random().toString(36).substr(2,8);
	objectClients[strIdent] = objectSocket;
	objectSocket.emit('hello', {
		'strIdent' : strIdent
	});
	objectSocket.strIdent = strIdent;
	// assign a random id to the socket and store the objectSocket in the objectClients variable - example: '9T1P4pUQ'
	// send the new client the 'hello' event, containing the assigned id - example: { 'strIdent':'9T1P4pUQ' }
	// send everyone the 'clients' event, contianing an array of the connected clients - example: { 'objectClients':['GxwYr9Uz','9T1P4pUQ'] }
	io.emit('clients', {
		'strClients' : Object.keys(objectClients)
	});
	io.emit('message',{
    'strFrom' : 'server',
		'strMessage' : strIdent + ' connected'
	});

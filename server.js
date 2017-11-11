var express = require('express');
var socket = require('socket.io');

var server = express();
var io = socket(server.listen(8080));

'use strict';

let express = require('express'),
  	http 		= require('http');

let app = express();

app.set('port', process.env.PORT || 8000);
app.use(express.static('public'));

app.get('*', function(req, res) {
	console.log('New request coming in...');
	res.sendStatus(200);
});

// start server
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;


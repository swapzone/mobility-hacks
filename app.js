'use strict';

let express = require('express'),
  	http 		= require('http');

let app = express();

const VALIDATION_TOKEN = 'VerySecretToken';

app.set('port', process.env.PORT || 8000);
app.use(express.static('public'));

app.get('*', function(req, res, next) {
	console.log('New request coming in...');
	next();
});

/*
 * Evaluation endpoint for Facebook to check if our application is the real
 * one.
 */
app.get('/webhook', function(req, res) {
	if (req.query['hub.mode'] === 'subscribe' &&
		req.query['hub.verify_token'] === VALIDATION_TOKEN) {
		console.log('Validating validation token...');
		res.status(200).send(req.query['hub.challenge']);
	} else {
		console.error('Validation failed. Make sure you have a correct validation token.');
		res.sendStatus(403);
	}
});

// start server
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;


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

/*
 * The actual message processing callback url.
 */
app.post('/webhook', function (req, res) {
	let data = req.body;

	// is it a page subscription?
	if (data.object == 'page') {
		// there might be multiple entries if batched by Facebook
		data.entry.forEach(function(pageEntry) {
			let pageId = pageEntry.id;
			let timeOfEvent = pageEntry.time;

			console.log(pageId);
			console.log(timeOfEvent);

			// iterate over each messaging event
			pageEntry.messaging.forEach(messagingEvent => {
				if (messagingEvent.optin) {
					console.log('Received authentication event.');
				} else if (messagingEvent.message) {
					console.log('Received message event.');
				} else if (messagingEvent.delivery) {
					console.log('Received message delivery event.');
				} else if (messagingEvent.postback) {
					console.log('Received message postback event.');
				} else if (messagingEvent.read) {
					console.log('Received message read event.');
				} else {
					console.log("Webhook received unknown messagingEvent.");
				}

				console.log(messagingEvent);
			});
		});

		// You must send back a 200, within 20 seconds, to let us know you've
		// successfully received the callback. Otherwise, the request will time out.
		res.sendStatus(200);
	}
});

// start server
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;


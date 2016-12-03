'use strict';

let express = require('express'),
  	http 		= require('http'),
		request = require('request');

let app = express();

const VALIDATION_TOKEN = 'VerySecretToken';
const PAGE_ACCESS_TOKEN = 'EAAFHQzIGgSQBAE3HZBnefHh9aIEIXCEXZC9c7ammx3ZArWmbgmEDKDcKNoVjZCRio2apgieMGUP79pSOkqIkCPxoOhtaI8N9mogrQ9ZARqNw6eZAEjH894ZBK7L0vuIZBt5ZA0W5kF8PMaD1dtZAB6bNxBgoh7vfaFkCDhvX5Eo3lPFAZDZD';

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

	if (!data) {
		console.warn('There is no data in the post request.');
		return res.send(200);
	}

	console.log('Post body:');
	console.log(data);

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
					sendMessage('Hello World!');
				} else if (messagingEvent.delivery) {
					console.log('Received message delivery event.');
				} else if (messagingEvent.postback) {
					console.log('Received message postback event.');
				} else if (messagingEvent.read) {
					console.log('Received message read event.');
				} else {
					console.log('Webhook received unknown messagingEvent.');
				}

				console.log(messagingEvent);
			});
		});

		// You must send back a 200, within 20 seconds, to let us know you've
		// successfully received the callback. Otherwise, the request will time out.
		res.sendStatus(200);
	}
});

/**
 * Call the Send API. If it is successful, we'll get the message id in a response.
 *
 * @param messageData
 */
function sendMessage(messageData) {
	request({
		uri: 'https://graph.facebook.com/v2.8/me/messages',
		qs: { access_token: PAGE_ACCESS_TOKEN },
		method: 'POST',
		json: messageData

	}, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			let recipientId = body.recipient_id;
			let messageId = body.message_id;

			if (messageId) {
				console.log('Successfully sent message with id %s to recipient %s',
					messageId, recipientId);
			} else {
				console.log('Successfully called send message API for recipient %s',
					recipientId);
			}
		} else {
			console.error('Unable to send message. :' + response.error);
		}
	});
}

// start server
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;


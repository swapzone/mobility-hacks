'use strict';

let bodyParser 	= require('body-parser'),
		crypto			= require('crypto'),
		express 		= require('express'),
  	http 				= require('http'),
		request 		= require('request');

let app = express();

let Wit = require('node-wit').Wit;
let log = require('node-wit').log;

let Facebook = require('./app/facebook');
let BVG = require('./app/bvg');

const WIT_TOKEN = process.env.WIT_TOKEN;
if (!WIT_TOKEN) {
	console.error('NO Wit token available.');
}

// remove those ENV variables for production use
const APP_SECRET = 'a0432755f42622958c8d39c527f414cb';
const VALIDATION_TOKEN = 'VerySecretToken';
const PAGE_ACCESS_TOKEN = 'EAAFHQzIGgSQBAE3HZBnefHh9aIEIXCEXZC9c7ammx3ZArWmbgmEDKDcKNoVjZCRio2apgieMGUP79pSOkqIkCPxoOhtaI8N9mogrQ9ZARqNw6eZAEjH894ZBK7L0vuIZBt5ZA0W5kF8PMaD1dtZAB6bNxBgoh7vfaFkCDhvX5Eo3lPFAZDZD';

app.set('port', process.env.PORT || 8000);
app.use(bodyParser.json({ verify: verifyRequestSignature }));
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

				// We retrieve the Facebook user ID of the sender
				const sender = messagingEvent.sender.id;

				// retrieve the user's current session, or create one if it doesn't exist
				// this is needed for our bot to figure out the conversation history
				const sessionId = findOrCreateSession(sender);

				if (messagingEvent.message && !messagingEvent.message.is_echo) {
					console.log('Received message event.');

					// DEBUGGING MESSAGE
					// sendMessage(messagingEvent.sender, { text: 'Hello World!' });

					let text =  messagingEvent.message.text;
					let attachments = messagingEvent.message.attachments;

					//console.log(JSON.stringify(attachments));

					if (attachments && attachments[0] && attachments[0].type === 'location') {
						console.log('Storing location data: ' + JSON.stringify(attachments[0].payload.coordinates));
						text = "USER_PROVIDED_LOCATION";
						sessions[sessionId].location = attachments[0].payload.coordinates;
					}

					// forward the message to the Wit.ai Bot Engine
					// this will run all actions until our bot has nothing left to do
					wit.runActions(
						sessionId,
						text,
						sessions[sessionId].context
					).then((context) => {
						console.log('Waiting for next user messages');

						// Based on the session state, you might want to reset the session.
						// This depends heavily on the business logic of your bot.
						// Example:
						// if (context['done']) {
						//   delete sessions[sessionId];
						// }

						// updating the user's current session state
						sessions[sessionId].context = context;
					}).catch((err) => {
						console.error('Oops! Got an error from Wit: ', err.stack || err);
					})
				} else if (messagingEvent.optin) {
					console.log('Received authentication event.');
				} else if (messagingEvent.delivery) {
					console.log('Received message delivery event.');
				} else if (messagingEvent.postback) {
					console.log('Received message postback event.');
					const routeIndex = parseInt(messagingEvent.postback.payload.split('_')[1]);
					console.log('Route index: ' + routeIndex);

					const tripData = sessions[sessionId].routes[routeIndex];
					let tripInstructions = BVG.getTripInstructions(tripData);
					console.log(tripInstructions);

					tripInstructions.forEach((instruction, index) => {
						setTimeout(() => {
							sendMessage(messagingEvent.sender, {
								text: instruction
							});
						}, 600 * index);
					});
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
 * @param sender user object
 * @param message message object
 */
function sendMessage(sender, message) {
	return new Promise((resolve, reject) => {
		request({
			uri: 'https://graph.facebook.com/v2.6/me/messages',
			qs: { access_token: PAGE_ACCESS_TOKEN },
			method: 'POST',
			json: {
				recipient: sender,
				message: message
			}
		}, function (error, response, body) {
			if (!error && response.statusCode === 200) {
				let recipientId = body.recipient_id;
				let messageId = body.message_id;

				if (messageId) {
					console.log('Successfully sent message with id %s to recipient %s',
						messageId, recipientId);
				} else {
					console.log('Successfully called send message API for recipient %s',
						recipientId);
				}

				resolve();
			} else {
				console.error('Unable to send message: ' + response.error);
				console.error(error);

				reject();
			}
		});
	});
}

// ----------------------------------------------------------------------------
// Wit.ai bot specific code

// This will contain all user sessions.
// Each session has an entry:
// sessionId -> {fbid: facebookUserId, context: sessionState}
const sessions = {};

const findOrCreateSession = (fbid) => {
	let sessionId;
	// Let's see if we already have a session for the user fbid
	Object.keys(sessions).forEach(k => {
		if (sessions[k].fbid === fbid) {
			sessionId = k;
		}
	});
	if (!sessionId) {
		// No session found for user fbid, let's create a new one
		sessionId = new Date().toISOString();
		sessions[sessionId] = { fbid: fbid, context: {} };
	}
	return sessionId;
};

// Our bot actions
const actions = {
	send(request, response) {
		console.log('Request:');
		console.log(JSON.stringify(request));

		console.log('Response:');
		console.log(JSON.stringify(response));

		const recipientId = sessions[request.sessionId].fbid;
		console.log('Calling send action for recipient id: ' + recipientId);

		let messageObject;
		if (response.quickreplies) {
			messageObject = {
				text: response.text,
				quick_replies: response.quickreplies.map(reply => {
					return {
						content_type: "text",
						title: reply,
						payload: reply
					};
				})
			}
		} else {
			messageObject = { text:  response.text };
		}

		if (recipientId) {
			// forward our bot response to Facebook and return a promise to let
			// our bot know when we're done sending
			return sendMessage({ id: recipientId }, messageObject)
				.then(() => null)
				.catch(err => {
					console.error(
						'Oops! An error occurred while forwarding the response to ',
						recipientId, ':',
						err ? err.stack : 'Unknown error'
					);
				});
		} else {
			console.error('Oops! Couldn\'t find user for session:', request.sessionId);
			return Promise.resolve()
		}
	},
	requestEventName(request) {
		console.log('Asking for event name:');

		console.log('request');
		console.log(JSON.stringify(request));

		return Facebook.getNextEvent()
			.then(event => {
				return {
					eventName: '\'' + event.name + '\''
				};
			});
	},
	requestRouteOptions(request) {
		console.log('Request route options:');
		console.log(request);

		let recipientId = sessions[request.sessionId].fbid;

		return new Promise((resolve, reject) => {

			// TODO use real location and event time data
			// sessions[sessionId].context

			const origin = { lat: 52.500142, lng: 13.435504 };
			const destination = { lat: 52.4992001, lng: 13.2702861 };
			const targetDateTime = '';

			BVG.getRoutes(origin, destination, targetDateTime)
				.then(bvgResponse => {
					sessions[request.sessionId].routes = bvgResponse;

					let messageOptions = {
						attachment: {
							type: "template",
							payload: {
								template_type: "generic",
								elements: bvgResponse.map((trip, index) => {
									return {
										title: BVG.getTripTitle(trip),
										subtitle: BVG.getTripDescription(trip),
										image_url: BVG.getTripImage(trip),
										buttons: [{
											type: "postback",
											title: "Pick Route " + (index + 1),
											payload: "Route_" + index
										}],
									};
								})
							}
						}
					};

					sendMessage({ id: recipientId }, messageOptions)
						.then(() => {
							resolve({
								numberOfOptions: 2
							});
						})
						.catch(err => {
							console.error(
								'Oops! An error occurred while forwarding the response to ',
								recipientId, ':',
								err ? err.stack : 'Unknown error'
							);
							reject();
						});
				});
		});
	}
};

// Setting up our bot
const wit = new Wit({
	accessToken: WIT_TOKEN,
	actions,
	logger: new log.Logger(log.INFO)
});

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 */
function verifyRequestSignature(req, res, buf) {
	let signature = req.headers["x-hub-signature"];

	if (!signature) {
		// For testing, let's log an error. In production, you should throw an error.
		console.error("Couldn't validate the signature with app secret:" + APP_SECRET);
	} else {
		let elements = signature.split('=');
		let signatureHash = elements[1];

		let expectedHash = crypto.createHmac('sha1', APP_SECRET)
			.update(buf)
			.digest('hex');

		if (signatureHash != expectedHash) {
			throw new Error("Couldn't validate the request signature: " + APP_SECRET);
		}
	}
}

// start server
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;


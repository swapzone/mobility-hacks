'use strict';

let request = require('request');

/**
 *
 *
 * @returns {Promise}
 */
let getNextEvent = () => {
	return new Promise((resolve) => {
		resolve({
			name: 'No Pants Subway Ride Berlin 2017',
			location: {
				latitude: 0,
				longitude: 0
			},
			datetime: '2017-01-08T13:00:00'
		});

		// request({
		// 	uri: 'https://graph.facebook.com/v2.6/me/events?type=attending&since=' + Math.floor(Date.now() / 1000) + '&access_token=' + access_token,
		// 	method: 'GET'
		// }, function (error, response, body) {
		// 	if (error) {
		// 		reject(error);
		// 	}
		//
		// 	let body = JSON.parse(body);
		// 	let nextEvent = body['data'].pop();
		//
		// 	resolve({
		// 		name: 'No Pants Subway Ride Berlin 2017',
		// 		location: {
		// 			latitude: 0,
		// 			longitude: 0
		// 		},
		// 		datetime: '2017-01-08T13:00:00'
		// 	});
		// });
	});
};

module.exports = {
	getNextEvent: getNextEvent
};

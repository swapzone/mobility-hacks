'use strict';

let request = require('request'),
		moment 	= require('moment');

/**
 * Get the routes from the BVG API.
 *
 * @param origin
 * @param destination
 * @param arrivalTime
 * @returns {Promise}
 */
let getRoutes = (origin, destination, arrivalTime) => {

	// TODO integrate the arrival time

	return new Promise((resolve, reject) => {
		request({
			uri: 'http://demo.hafas.de/openapi/vbb-proxy/trip?format=json' +
			'&originCoordLat=' + origin.lat + '8&originCoordLong=' + origin.lng +
			'&destCoordLat=' + destination.lat + '&destCoordLong=' + destination.lng +
			'&accessId=BVG-VBB-Dezember',
			method: 'GET'
		}, function (error, response, body) {
			if (error) {
				return reject(error);
			}

			let trips = JSON.parse(body)['Trip'].map(function(tripParsedElement) {
				return tripParsedElement['LegList']['Leg'].map(legParsedElement => {
					const departureTime = legParsedElement['Origin']['date'] + 'T' + legParsedElement['Origin']['time'];
					const arrivalTime = legParsedElement['Destination']['date'] + 'T' + legParsedElement['Destination']['time'];

					let tripSegment = {
						origin: {
							lat: legParsedElement['Origin']['lat'],
							lng: legParsedElement['Origin']['lng']
						},
						originName : legParsedElement['Origin']['name'],
						departureTime : departureTime,
						destination: {
							lat: legParsedElement['Destination']['lat'],
							lng: legParsedElement['Destination']['lng']
						},
						destinationName : legParsedElement['Destination']['name'],
						arrivalTime : arrivalTime,
						direction: legParsedElement['type'] === 'WALK' ?
							'walk to' : 'take the ' + legParsedElement['name'].trim() +
							' into the direction of ' + legParsedElement['direction'] + ' to',
						type : legParsedElement['type']
					};

					if (legParsedElement['type'] !== 'WALK') {
						tripSegment.line = legParsedElement['Product']['line'];
						tripSegment.vehicleType = legParsedElement['Origin']['type'];
					}

					return tripSegment;
				});
			});

			resolve(trips);
		});
	});
};

/**
 * Compose a trip title based on the lines used.
 *
 * @param trip
 * @returns {string}
 */
let getTripTitle = trip => {
	return trip.filter(segment => {
		return segment.type !== 'WALK';
	}).map(segment => {
		return segment.line;
	}).join(', ');
};

/**
 * Return the appropriate trip image based on the means of public transports
 * used.
 *
 * @param trip
 * @returns {string}
 */
let getTripImage = trip => {
	let publicTransportSegments = trip.filter(segment => {
		return segment.type !== 'WALK';
	}).map(segment => {
		return segment.vehicleType;
	});

	if (publicTransportSegments.length === 1) {
		if (publicTransportSegments[0] === 'ST') {
			return 'https://bvg-bot.herokuapp.com/images/rail.png';
		}
		return 'https://bvg-bot.herokuapp.com/images/bus.png';
	}
	return 'https://bvg-bot.herokuapp.com/images/rail_bus.png';
};

/**
 * Compose and return the trip description.
 *
 * @param trip
 * @returns {string}
 */
let getTripDescription = trip => {
	let departureTime = moment(trip[0].departureTime).format('hh:mm');
	let tripDuration =  moment(trip[trip.length - 1].arrivalTime).diff(moment(trip[0].departureTime), 'minutes');

	return 'Departure Time: ' + departureTime + ' -- Trip Duration: ' + tripDuration + ' minutes';
};

// getRoutes({ lat: 52.52191, lng: 13.413215 }, { lat: 52.498997, lng: 13.418334 }, '')
// 	.then(results => {
// 		// console.log(JSON.stringify(results, null, 2));
// 		console.log(getTripDescription(results[0]));
// 	});

//
// Module API
//
module.exports = {
	getRoutes: getRoutes,
	getTripDescription: getTripDescription,
	getTripImage: getTripImage,
	getTripTitle: getTripTitle
};

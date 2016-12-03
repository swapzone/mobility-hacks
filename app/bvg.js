'use strict';

let request = require('request');

/**
 *
 *
 * @returns {Promise}
 */
let getRoutes = (callback) => {
	request({
		uri: 'http://demo.hafas.de/openapi/vbb-proxy/trip?format=json&originCoordLat=52.521918&originCoordLong=13.413215&destCoordLat=52.498997&destCoordLong=13.418334&accessId=BVG-VBB-Dezember',
		method: 'GET'
	}, function (error, response, body) {
		let bodyParsed = JSON.parse(body);
		let tripParsed = bodyParsed['Trip'];

		let trips = [];

		tripParsed.forEach(function(tripParsedElement) {
			let legParsed = tripParsedElement['LegList']['Leg'];

			let trip = [];

			legParsed.forEach(function(legParsedElement) {
				let destinationParsed = legParsedElement['Destination'];

				let destinationLat = destinationParsed['lat'];
				let destinationLng = destinationParsed['lon'];
				let destinationName = destinationParsed['name'];

				let arrivalTime = destinationParsed['date'] + 'T' + destinationParsed['time'];

				let originParsed = legParsedElement['Origin'];

				let originLat = originParsed['lat'];
				let originLng = originParsed['lon'];
				let originName = originParsed['name'];

				let departureTime = originParsed['date'] + 'T' + originParsed['time'];

				let type = legParsedElement['type'];

				let leg = { 'originLat' : originLat,
							'originLng' : originLng,
							'originName' : originName,
							'departureTime' : departureTime,
							'destinationLat' : destinationLat,
							'destinationLng' : destinationLng,
							'destinationName' : destinationName,
							'arrivalTime' : arrivalTime,
							'type' : type };

				trip.push(leg);
			});

			trips.push(trip);
		});

		callback(trips);
	});
};

getRoutes(function(routes) {
	console.log(routes);
});

module.exports = {
	getRoutes: getRoutes
};

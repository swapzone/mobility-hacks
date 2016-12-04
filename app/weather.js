'use strict';

let request = require('request');

/**
 * Retrieve weather data.
 *
 * @param location
 */
let getWeatherData = (location) => {
	if (location === undefined) {
		location = 'Berlin';
	}

	return new Promise((resolve, reject) => {
		request({
			uri: 'http://api.openweathermap.org/data/2.5/weather?q=' + location + '&APPID=b3e0245fba970b850110cc6049062962',
			method: 'GET'
		}, function (error, response, body) {
			if (error) {
				return reject(error);
			}

			resolve({
				condition: JSON.parse(response.body)["weather"][0]["main"],
				temperature: JSON.parse(response.body)["main"]["temp"] - 273.15
			});
		});
	});
};

//
// Module API
//
module.exports = {
	getWeatherData: getWeatherData
};

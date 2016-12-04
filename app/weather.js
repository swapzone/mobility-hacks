let request = require('request'),
		moment 	= require('moment');

	new Promise((resolve, reject) => {

		request({
			uri: 'http://api.openweathermap.org/data/2.5/weather?q=Berlin&APPID=b3e0245fba970b850110cc6049062962',
			method: 'GET'
		}, function (error, response, body) {
			if (error) {
				return reject(error);
			}

			console.log(JSON.parse(response.body)["weather"][0]["main"]);
			console.log(JSON.parse(response.body)["main"]["temp"] - 273.15);

			return [JSON.parse(response.body)["weather"][0]["main"], JSON.parse(response.body)["main"]["temp"] - 273.15];
			 
		})
	})

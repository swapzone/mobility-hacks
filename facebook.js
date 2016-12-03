let request = require('request')

var access_token = 'EAACEdEose0cBABpbEKaQtk7uAB7B8exRAJPRp98AORAqxy5aQlhKmDwPPf4ZB5TG7ziZCykmpLqcgvMgI5Hnlb0j6ZAcshKZATdzTLDNUc7E0Ted3KxOnI632QTBRjJZC9ZA8uZAZAAHdLzigjfMfIbJvAaoy0vrCYZBhyWawV6OPZAAZDZD'

request({
	uri: 'https://graph.facebook.com/v2.6/me/events?type=attending&since=' + Math.floor(Date.now() / 1000) + '&access_token=' + access_token,
	method: 'GET'
}, function (error, response, body) {
	var body = JSON.parse(body)
	var nextEvent = body['data'].pop()
	var nextEventName = nextEvent['name']
	var nextEventLat = nextEvent['place']['location']['latitude']
	var nextEventLng = nextEvent['place']['location']['longitude']
});

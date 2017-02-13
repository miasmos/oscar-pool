let Twitter = require('twitter'),
	colors = require('colors'),
	jsonfile = require('jsonfile')
	data = require('./awards.json'),
	LanguageDetect = require('./languageDetect'),
	movieLookup = {},
	mentions = {},
	latestTweet = {},
	awardMentions = {},
	searchTerm = '',
	config = {
		consumer_key: 'ZccgGDOI7Gj6cNdPfomIEBhBN',
		consumer_secret: 'XvcP5tkfqH3sMJBAJS64fNpIeXIvX671a3dCMijdmkYy1KP0cr',
		access_token_key: '416164964-MpToFfpfoDJShOJ1aJpLcedAqFPpQjumOSwAq3B7',
		access_token_secret: 'sQ6vu9g6ngzpu8uunouse4lPOcDgr9uAwKpud7AcabM6E'
	}

jsonfile.readFile('/var/node/oscars/mentions.json', function(err, obj) {
	if (!err && !!obj && typeof obj === 'object') {
		console.log(obj)
		mentions = obj
	} else {
		console.log(err)
	}

	start()
})

function start() {
	LanguageDetect.filter([LanguageDetect.language.ENGLISH]) //only care about english
	let client = new Twitter(config)

	//save references to the appearance of each movie
	for (var award in data) {
		for (var movie in data[award]) {
			let movieData = data[award][movie],
				title = movieData.title,
				keyword = movieData.keyword

			if (!(title in movieLookup)) movieLookup[title] = []
			keyword = typeof keyword !== 'undefined' ? keyword.toLowerCase() : undefined

			movieLookup[title].push({
				award: award,
				keyword: keyword,
				mentions: 0
			})

			if (!(title in mentions)) mentions[title] = 0
			if (!(title in awardMentions)) awardMentions[title] = {}
			awardMentions[title][award] = 0
		}
	}

	//build the search term
	//format: keyword,keyword keyword,keyword
	//spaces are logical AND, commas are logical OR
	let searchTermLookup = {} //temp var
	for (var award in data) {
		for (var movie in data[award]) {
			let movieData = data[award][movie],
				hashtag = formatHashTag(movieData.title),
				title = movieData.title,
				keyword = undefined

			if (!(title in searchTermLookup)) {
				searchTermLookup[title] = ''
				searchTerm += title + ','
			} else {
				continue
			}
		}
	}
	searchTerm = searchTerm.slice(0, searchTerm.length-2)	//remove the trailing comma

	client.stream('statuses/filter', {track: searchTerm}, (stream) => {
		stream.on('data', (event) => {
			if (typeof event.text === 'string' && event.text.length > 0) recordMention(event)
		})

		stream.on('error', (error) => {
			console.log(error)
			process.exit()
		})
	})
}

function recordMention(tweet) {
	var tweetText = tweet.text.toLowerCase()
	let language = LanguageDetect.detect(tweetText)

	for (var movieKey in movieLookup) {
		let movieTitle = movieKey.toLowerCase()
		if (tweetContainsString(movieTitle, tweetText) &&
			tweetText.indexOf('oscar') > -1 &&
			language === LanguageDetect.language.ENGLISH) {
				//tweet contains the movie name, the word oscar, and is English

				console.log(colors.yellow(movieTitle)+`: ${tweetText}`)
				mentions[movieKey]++

				// for (var awardData in movieLookup[movieKey]) {
				// 	var award = movieLookup[movieKey][awardData].award,
				// 		keyword = movieLookup[movieKey][awardData].keyword,
				// 		keywordMentioned = false,
				// 		awardMentioned = false

				// 	if (award === 'Original Song') {	//match the entire song name
				// 		keywordMentioned = tweetContainsString(keyword, tweet.text)
				// 	} else if (typeof keyword !== 'undefined') {	//match either the actor's first name or their last name
				// 		let name = getFirstAndLastName(keyword)
				// 		if (tweetContainsString(name.first, tweet.text) || tweetContainsString(name.last, tweet.text)) {
				// 			keywordMentioned = true
				// 		}
				// 	}

				// 	if (keywordMentioned) {
 			// 			//tweet also contains the relevant actor's name or song name
				// 		console.log(colors.green(movieTitle)+`: ${keyword}`)
				// 		awardMentions[movieKey][award]++
				// 	}
				// }

			saveMentionJSON(mentions)

			latestTweet = {
				user: tweet.user.screen_name,
				image: tweet.user.profile_background_image_url_https,
				text: tweet.text,
				id: tweet.id_str,
			}
 		}
	}
}

function tweetContainsString(needle, haystack) {
	return haystack.indexOf(' '+needle) > -1 ||
			haystack.indexOf(needle+' ') > -1 ||
			haystack.indexOf('#'+needle.replace(/\s/g, '')) > -1
}

function getFirstAndLastName(name) {
	return {
		first: name.substring(0, name.indexOf(' ')),
		last: name.substring(name.indexOf(' ')+1, name.length)
	}
}

function formatHashTag(keyword) {
	//removes spaces and punctuation
	return keyword.replace(/[\s.,;!$%^&*()@#\[\]"'\/?]/g, '')
}

function saveMentionJSON(json) {
	jsonfile.writeFileSync('./mentions.json', mentions)
}

var fs = require('fs'),
	https = require('https'),
	privateKey  = fs.readFileSync('/etc/letsencrypt/live/poole.fyi/privkey.pem', 'utf8'),
	certificate = fs.readFileSync('/etc/letsencrypt/live/poole.fyi/cert.pem', 'utf8'),
	express = require('express'),
	cors = require('cors'),
	app = express(),
	server = https.createServer({key: privateKey, cert: certificate}, app);

app.get('/', cors({origin:'https://poole.fyi'}), (request, response) => {
	response.json({mentions: mentions, latest: latestTweet})
})
server.listen(8080)

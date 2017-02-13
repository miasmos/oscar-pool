let languageDetect = new (require('languagedetect'))

let instance = (function LanguageDetect() {
	let languageEnum = {
		ENGLISH: 'english',
		FRENCH: 'french'
	},
	filters = undefined

	function formatLanguage(item) {
		return {
			language: item[0],
			certainty: item[1]
		}
	}

	return {
		detect: (text, languages) => {
			let arr = languageDetect.detect(text).filter((item) => {
				item = formatLanguage(item)

				if (!Array.isArray(languages)) {
					if (Array.isArray(filters)) {
						if (filters.indexOf(item.language) > -1) return item
					} else {
						console.log(item)
						return item
					}
				} else {
					if (languages.indexOf(item.language) > -1) return item
				}
			})

			return typeof arr !== 'undefined' ? arr.length && arr[0].length ? arr[0][0] : undefined : undefined
		},
		filter: (languages) => {
			if (Array.isArray(languages) || typeof languages === 'undefined') filters = languages
		},
		language: languageEnum
	}
})()

module.exports = instance
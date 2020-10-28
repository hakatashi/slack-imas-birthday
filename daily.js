require('dotenv').config();

const day = require('dayjs');
const axios = require('axios');
const {IncomingWebhook} = require('@slack/webhook');
const qs = require('querystring');
const get = require('lodash/get');

const slack = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);

const today = day().format('--MM-DD');

(async () => {
	const result = await axios.get(`https://sparql.crssnky.xyz/spql/imas/query?${qs.encode({
		query: `
			PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
			PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
			PREFIX schema: <http://schema.org/>
			SELECT ?name
			WHERE {
				?idol schema:birthDate "${today}"^^xsd:gMonthDay;
				rdfs:label ?name.
			}
		`,
	})}`, {
		headers: {
			Accept: 'application/sparql-results+json',
		},
	});

	const idols = get(result, ['data', 'results', 'bindings'], []);

	for (const idol of idols) {
		const name = get(idol, ['name', 'value']);

		if (!name) {
			continue;
		}

		const search = await axios.get(`https://www.googleapis.com/customsearch/v1?${qs.encode({
			key: process.env.GOOGLE_API_KEY,
			cx: process.env.GOOGLE_API_ENGINE_KEY,
			q: `${name} SSR OR SR`,
			searchType: 'image',
		})}`);

		const image = get(search, ['data', 'items', 0, 'link'], 'http://design-ec.com/d/e_others_50/l_e_others_500.png');

		const twitter = `https://twitter.com/search?${qs.encode({q: name})}`;
		const pixiv = `https://www.pixiv.net/search.php?${qs.encode({s_mode: 's_tag', word: name})}`;
		const niconico = `https://www.nicovideo.jp/search/${encodeURIComponent(name)}?sort=f&order=d`;

		slack.send({
			text: `${day().format('M月D日')}は *${name}* の誕生日です🎉\n<${twitter}|[Twitter検索]> <${pixiv}|[pixiv検索]> <${niconico}|[niconico検索]>`,
			attachments: [
				{
					image_url: image,
				}
			],
			channel: process.env.SLACK_WEBHOOK_CHANNEL
		});
	}
})();

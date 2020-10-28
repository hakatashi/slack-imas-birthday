require('dotenv').load();

const day = require('dayjs');
const axios = require('axios');
const { IncomingWebhook } = require('@slack/webhook');
const qs = require('querystring');
const get = require('lodash/get');

const slack = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);

const nextMonday = day().add(3, 'day').format('--MM-DD');
const aWeekAgo = nextMonday.add(7, 'day').format('--MM-DD');

(async () => {
	result = await axios.get(`https://sparql.crssnky.xyz/spql/imas/query?${qs.encode({
		query: `
		PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
		PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
		PREFIX schema: <http://schema.org/>
		SELECT ?name ?date
		WHERE {
			?idol schema:birthDate ?date;
			rdfs:label ?name.
			FILTER("${nextMonday}"^^xsd:gMonthDay <= ?date)
			FILTER(?date <= "${aWeekAgo}"^^xsd:gMonthDay)
		}
		`,
	})}`, {
		headers: {
			Accept: 'application/sparql-results+json',
		},
	});

	const idols = get(result, ['data', 'results', 'bindings'], []);

	let idolListStr = '';

	for (const idol of idols) {
		const name = get(idol, ['name', 'value']);
		const birthdayStr = get(idol, ['date', 'value']);
		const birthday = day(birthdayStr, '--MM-DD').format("M月D日")

		if (!name) {
			continue;
		}

		idolListStr += `・${name} (${birthday})\n`;
	}
	slack.send({
		text: `お疲れさまです！ 来週が誕生日のアイドルは…\n${idolListStr}です！`
	});
})();

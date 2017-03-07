require! {
  'node-slack': Slack
  'iconv-lite'
  axios
  cheerio
}

lucky-colors =
  '総合運': '#01db00'
  '恋愛運': '#ff1066'
  '金運': '#ff8f11'
  '仕事運': '#002fdb'

slack = new Slack process.env.SLACK_WEBHOOK

axios do
  method: 'GET'
  url: 'https://fortune.yahoo.co.jp/12astro/cancer'
  response-type: 'arraybuffer'

.then (response) ->
  throw new Error 'Status not OK' if response.status isnt 200

  $ = response.data |> iconv-lite.decode _, 'EUC-JP' |> cheerio.load

  [zodiac, date] = $ '#ydn-top + .wr .bg02 > p' .text!split '　'

  $table = $ '#jumpdtl > table table'
  rank = $table.find 'tr:nth-child(1) td:nth-child(2)' .text!split ' ' .0

  luckies = for row from 2 to 5
    {
      name: $table.find "tr:nth-child(#row) th:nth-child(1)" .text!
      value: $table.find "tr:nth-child(#row) td:nth-child(2) img" .attr 'alt'
    }

  job-text = $ '[name=job] ~ .mg10t' .text!trim!

  for own item-name, item-value of {zodiac, date, rank, luckies, job-text}
    if not item-value or item-value.length is 0
      throw new Error "#item-name not found"

  attachments = luckies.map ({name, value}) ->
    [denominator, numerator] = value.match /\d+/g
    stars = 1 + Math.floor (numerator / denominator) * 5

    {
      title: "#name: #value"
      text: ':star:' * stars + ':small_blue_diamond:' * (5 - stars)
    } <<< if lucky-colors[name] then color: lucky-colors[name] else {}

  slack.send {
    text: """
      #{date}のかに座の運勢: *#rank*
      #job-text
    """
    attachments
  } <<< if process.env.SLACK_CHANNEL then channel: process.env.SLACK_CHANNEL else {}

.catch (error) ->
  console.error error
  process.exit 1

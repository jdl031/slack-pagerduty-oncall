const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser());
app.post('/oncall', handleOnCall);
app.get('/oncall', handleOnCall);

const port = process.env.PORT || 3434;
app.listen(port, () => {
  console.log('listening on port ' + port);
});

function handleOnCall(req,res){
  const slackToken = process.env.SLACK_TOKEN;
  const pagerdutyApiKey = process.env.PAGERDUTY_KEY;
  const pagerdutySubdomain = process.env.PAGERDUTY_SUBDOMAIN;
  const channel = req.body.channel_id;

  if (!slackToken || !pagerdutyApiKey || !pagerdutySubdomain) {
    return res.status(400).send('slack-pagerduty-oncall has not been properly configured');
  }

  getPagerDutyData(pagerdutyApiKey, pagerdutySubdomain, function(err, pagerdutyData, slackToken){
    console.log(slackToken)
    if (err){
      return res.status(400).send('There was a problem. Who are you going to ask to fix it, since this is how you find out who is fixing things today?');
    }
    postToSlack( buildMessage(pagerdutyData) , {slackToken, channel}, () => res.status(200).send('Please be kind to your friendly on-call engineer.'));

  })

  function getPagerDutyData(key, domain, cb){
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1;   // January is 0!
    var yyyy = today.getFullYear();
    var sinceDate = yyyy + "-" + mm + "-" + dd

    var tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
    var dd1 = tomorrow.getDate();
    var mm1 = tomorrow.getMonth() + 1;
    var yyyy1 = tomorrow.getFullYear()
    var untilDate = yyyy1 + "-" + mm1 + "-" + dd1

    var url = "https://" + domain + ".pagerduty.com/api/v1/escalation_policies/on_call?since=\"" + sinceDate + "\",until=\"" + untilDate + "\"";
    // For example, https://redoxengine.pagerduty.com/api/v1/escalation_policies/on_call?"since=2015-10-04","until=2015-10-20"
    var authString = "Token token="+key
    var options = {
      url: url,
      headers: {
        'Content-type': 'application/json',
        'Authorization': authString
      }
    }
    request.get(options,cb)
  } //getPagerDutyData

  function buildMessage(pagerdutyData){
    var parsedData = JSON.parse(pagerdutyData.body)
    console.log(parsedData.escalation_policies[0].on_call[0].user.name);
    return parsedData.escalation_policies[0].on_call[0].user.name;

  } //buildMessage

  function postToSlack(message, info, cb){
    console.log(info)
    request.post('https://slack.com/api/chat.postMessage', {
      form: {
        token: info.slackToken,
        channel: info.channel,
        text: message,
        username: 'On Call Bot',
        icon_url: 'http://www.mememaker.net/static/images/memes/3782550.jpg'
      }
    }, cb);
    // Use: postAsUser(user, message, { token, channel }, () => res.status(200).send('haha ur so funny'));
  } //postToSlack
}

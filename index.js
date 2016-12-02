const restify = require('restify');
const botbuilder = require('botbuilder');
const fetch = require('node-fetch');

const config = Object.assign({
  'HOST': '127.0.0.1',
  'PORT': 3978,
  'ALLOWED_TOKENS': [],
}, require('./config.json'));

let currentAddress = null;

const server = restify.createServer({
  name: process.env.npm_package_name,
});

server.listen(config.PORT, config.HOST, () => {
  console.log('%s listening to %s', server.name, server.url); 
});

const connector = new botbuilder.ChatConnector({
  appId: config.MICROSOFT_APP_ID,
  appPassword: config.MICROSOFT_APP_PASSWORD,
});

const bot = new botbuilder.UniversalBot(connector);

server.use(restify.bodyParser({mapParams: false}));
server.post('/api/messages', connector.listen());
server.post('/api/send', (req, res, next) => {
  token = (req.headers.authorization || '').replace(/^Token\s+/, '');
  if (config.ALLOWED_TOKENS.includes(token)) {
    if (currentAddress !== null) {
      const msg = new botbuilder.Message()
        .address(currentAddress)
        .text(req.body);
      bot.send(msg);
      res.send(200);
    }
  } else {
    res.send(401, 'Invalid or missing token');
  }
  return next();
});

server.post('/api/circle', (req, res, next) => {
  if (currentAddress !== null) {
    const msg = new botbuilder.Message()
      .address(currentAddress)
      .text(req.body);
    bot.send(msg);
    bot.send(`Build of ${req.body.reponame} is complete.<br/>Outcome: ${req.body.outcome}<br/>Build details: ${req.body.build_url}`)
  }
  res.send(200);
  return next();
});


const availableCommands = {
    save: (session) => {
      currentAddress = session.message.address;
      session.send('Route address saved successfully.');
    },
    hi: (session) => {
      const firstName = session.message.user.name.split(' ')[0]
      session.send(`Hello, ${firstName}.`);
    },
    norris: (session) => {
      fetch('http://api.icndb.com/jokes/random')
        .then(function(response) {
          return response.json();
        }).then(function(data) {
          if (data.type === 'success') {
            session.send(`A fact about Chuck Norris:<br/>${data.value.joke}`);
          }
        });
    },
    xkcd: (session) => {
      fetch('http://xkcd.com/info.0.json')
        .then(function(response) {
          return response.json();
        }).then(function(data) {
          fetch(`http://xkcd.com/${Math.round(Math.random() * data.num) + 1}/info.0.json`)
            .then(function(response) {
              return response.json();
            }).then(function(data) {
              const cardImage = new botbuilder.CardImage(session)
                .url(data.img);
              const openAction = new botbuilder.CardAction(session)
                .title('Open')
                .type('openUrl')
                .value(`https://xkcd.com/${data.num}/`);
              const moreButton = new botbuilder.CardAction(session)
                .title('Show Another')
                .type('postBack')
                .value('xkcd');
              const card = new botbuilder.HeroCard(session)
                .title(data.title)
                .subtitle(data.alt)
                .tap(openAction)
                .buttons([moreButton])
                .images([cardImage]);
              const msg = new botbuilder.Message(session)
                .addAttachment(card);
              session.send(msg)
              console.log(data.title);
              console.log(data.img);
              console.log(data.alt);
            });
        });
    }
};

function prepareMessage(text) {
  return text
    .replace(/<ss type=".+">(.+)<\/ss>/g, '$1')
    .replace(/<at id=".+">.+<\/at>/g, '')
    .trim();
}

bot.dialog('/',
  (session) => {
    console.log(session.message.text);
    const messageText = prepareMessage(session.message.text);
    if (availableCommands.hasOwnProperty(messageText)) {
      availableCommands[messageText](session);
    } else {
      session.send(`Available commands:<br/>${Object.keys(availableCommands).join('<br/>')}`);
    }
  }
);

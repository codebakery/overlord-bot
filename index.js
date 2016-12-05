const restify = require('restify');
const botbuilder = require('botbuilder');
const fetch = require('node-fetch');

const config = Object.assign({
  'HOST': '127.0.0.1',
  'PORT': 3978,
  'ALLOWED_TOKENS': [],
}, require('./config.json'));

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
    const msg = new botbuilder.Message()
      .address(config.GROUP_ADDRESS)
      .text(req.body);
    bot.send(msg);
    res.send(200);
  } else {
    res.send(401, 'Invalid or missing token');
  }
  return next();
});

server.post('/api/circle', (req, res, next) => {
  const {
    author_name,
    branch,
    build_url,
    outcome,
    reponame
  } = req.body.payload;
  const msg = new botbuilder.Message()
    .address(config.GROUP_ADDRESS)
    .text(`Build of branch ${branch} of ${reponame} is complete.<br/>Outcome: ${outcome}<br/>Author: ${author_name}<br/>Build details: ${build_url}`);
  bot.send(msg);
  res.send(200);
  return next();
});

const availableCommands = {
    hi: (session, greeting) => {
      const firstName = session.message.user.name.split(' ')[0]
      const processedGreeting = greeting[0].toUppserCase() + greeting.slice(1).toLowerCase();
      session.send(`${processedGreeting}, ${firstName}.`);
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
    xkcd: (session, id) => {
      const processResponse = (data) => {
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
        session.send(msg);
      }
      if (id) {
        fetch(`http://xkcd.com/${id}/info.0.json`)
          .then((response) => response.json())
          .then(processResponse);
      } else {
        fetch('http://xkcd.com/info.0.json')
          .then((response) => response.json())
          .then((data) => fetch(`http://xkcd.com/${Math.round(Math.random() * data.num) + 1}/info.0.json`))
          .then((response) => response.json())
          .then(processResponse);
      }
    }
};

function createRouter(handlers, routes, middlewares) {
  const dispatch = routes.map(([pattern, name]) => [pattern, handlers[name]]);
  const help = 'Available commands:<br/>' + routes.map(([_, name, description]) => `**${name}** - ${description}`).join('<br/>');
  return (session) => {
    middlewares.forEach((m) => m(session));
    let found = false;
    for ([pattern, handler] of dispatch) {
      const matches = session.message.text.match(pattern);
      if (matches) {
        handler(session, ...matches.slice(1));
        found = true;
        break;
      }
    }
    if (!found) {
      session.send(help);
    }
  };
}

const router = createRouter(availableCommands, [
  [/^(hi|hello|wassup|hiya|good evening|good morning|good day|privet|yo).*$/i, 'hi', 'A friendly greeting'],
  [/^xkcd ?(\d*)$/i, 'xkcd', 'Show random xkcd post'],
  [/^norris$/i, 'norris', 'Show random Chuck Norris fact'],
], [prepareMessage]);

function prepareMessage(session) {
  session.message.text = session.message.text
    .replace(/<ss type=".+">(.+)<\/ss>/g, '$1')
    .replace(/<at id=".+">.+<\/at>/g, '')
    .trim();
}

bot.dialog('/', router);

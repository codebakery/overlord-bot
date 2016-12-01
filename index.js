const restify = require('restify');
const botbuilder = require('botbuilder');
const fetch = require('node-fetch');

const config = Object.assign({
  'HOST': '127.0.0.1',
  'PORT': 3978,
  'MESSAGING_ENDPOINT': '/api/messages',
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
server.post(config.MESSAGING_ENDPOINT, connector.listen());

const currentAddress = null;


const availableCommands = {
    save: (session) => {
      currentAddress = session.message.address;
      session.send('Route address saved successfully.'); // <at id="28:868e0687-2b3e-43c0-a415-9af02a444772">Overlord</at> text
    },
    hi: (session) => {
      const firstName = session.message.user.name.split(' ')[0]
      session.send(`Hello, ${firstName}.`);
    },
    norris: (session) => {
      session.send('A fact about Chuck Norris:');
      fetch('http://api.icndb.com/jokes/random')
        .then(function(response) {
          return response.json();
        }).then(function(data) {
          if (data.type === 'success') {
            session.send(data.value.joke);
          }
        });
    },
    '(mooning)': (session) => {
      session.send('(finger)');
    }
};

var stripss = /<ss type=".+">(.+)<\/ss>/g;
function prepareMessage(text) {
  return '<ss type=".+">(.+)</ss>'.replace(stripss, '$1');
}

bot.dialog('/',
  (session) => {
    let messageText;
    if (session.message.address.conversation.isGroup) {
      messageText = session.message.text.slice(63); // 
    } else {
      messageText = session.message.text;
    }
    messageText = prepareMessage(prepareMessage);
    if (availableCommands.hasOwnProperty(messageText)) {
      availableCommands[messageText](session);
    } else {
      session.send(`Available commands:<br/>${Object.keys(availableCommands).join('<br/>')}`);
    }
  }
);


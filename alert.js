/**
 * Request
 */
const request = require('request');

/**
 * Discord
 */
const Discord = require('discord.js');
const bot = new Discord.Client();
const config = require("./config.json")

/**
 // import lowdb
 */
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync("db.json")
const db = low(adapter)

db.defaults({ "guilds": [] }).write()

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function getChannelIdByGuildId(guildId) {
  return db.get('guilds').find({ 'id': guildId }).get('channel').value()
}

function checkBotPermission(perm, msg) {
  if (msg.guild.me.permissionsIn(msg.channel).has(perm)) {
    return "true"
  }
  else {
    return "false";
  }
}

bot.on('ready', () => {
  console.log(`Logged in as ${bot.user.tag}!`);
  bot.user.setActivity("Premium : w!premium", { type: "WATCHING" })

  var currentId = null;

  function getTransactions() {
    request(`https://api.whale-alert.io/v1/transactions?api_key=4dWraprhZ6wONpbymUZsNcucs6KntcDY&min_value=500000&start=${Math.floor(Date.now() / 1000 - 360)}&limit=1`, function (error, response, body) {
      if (error) {
        console.log(error)
      }

      body = JSON.parse(body);

      if (body['transactions'][0]['blockchain'] !== "ethereum") {
        if (body['transactions'][0]['blockchain'] !== "bitcoin") {
          if (body['transactions'][0]['blockchain'] !== "tron") {
            return;
          }
        }
      }

      var color = null;
      var explorer = null;
      var hash = body['transactions'][0]['hash'];
      var id = body['transactions'][0]['id'];

      if (currentId === id) {
        return;
      }
      else {
        currentId = id;
      }

      switch (body['transactions'][0]['blockchain']) {
        case 'ethereum':
          color = "#14044d";
          explorer = `https://etherscan.io/tx/0x${hash}`;
          break;

        case 'bitcoin':
          color = "#f7931a";
          explorer = `https://www.blockchain.com/btc/tx/${hash}`;
          break;

        case 'tron':
          color = "#c23631";
          explorer = `https://tronscan.org/#/transaction/${hash}`;
          break;
      }

      var fromAddress = null;
      var toAddress = null;

      if (body['transactions'][0]['from']['owner'] === undefined) {
        fromAddress = "Unknown";
      }
      else {
        fromAddress = capitalizeFirstLetter(body['transactions'][0]['from']['owner'])
      }

      if (body['transactions'][0]['to']['owner'] === undefined) {
        toAddress = "Unknown";
      }
      else {
        toAddress = capitalizeFirstLetter(body['transactions'][0]['to']['owner'])
      }

      var embed = new Discord.MessageEmbed()
        .setColor(color)
        .setTimestamp()
        .setFooter(`Made by Reapex#1313`, bot.user.displayAvatarURL())

        .setTitle(`:zap: New __${body['transactions'][0]['symbol'].toUpperCase()}__ transaction detected !`)
        .addField("🧱 Blockchain :", capitalizeFirstLetter(body['transactions'][0]['blockchain']))
        .addField("📊 Value sent :", body['transactions'][0]['amount'].toLocaleString() + " " + body['transactions'][0]['symbol'].toUpperCase() + " (" + body['transactions'][0]['amount_usd'].toLocaleString() + " USD)")
        .addField(`📨 Sending address :`, body['transactions'][0]['from']['address'])
        .addField(`🕵️‍♂️ Sending address Owner :`, fromAddress)
        .addField(`📩 Reception address :`, body['transactions'][0]['to']['address'])
        .addField(`📡 Reception address Owner :`, toAddress)
        .addField('🧭 Explorer :', `Watch the transaction [here](${explorer})`)

      const Guilds = bot.guilds.cache.map(guild => guild.id);
      Guilds.forEach(guild => {
        if (db.get('guilds').find({ 'id': guild }).value() !== undefined) {
          bot.channels.fetch(getChannelIdByGuildId(guild))
            .then(channel => channel.send(embed))
            .catch(console.error)
        }
      });
    });
  }

  getTransactions()
  setInterval(function () {
    getTransactions()
  }, 30000)
});

bot.on('message', async message => {
  if (message.channel.type === 'dm') return;

  if (message.content === "w!init") {
    if (checkBotPermission("SEND_MESSAGES", message) === "false" || checkBotPermission("EMBED_LINKS", message) === "false" || checkBotPermission("MANAGE_CHANNELS", message) === "false") {
      return 0;
    }
    else {
      if (db.get('guilds').find({ 'id': message.guild.id }).value()) {
        var embed = new Discord.MessageEmbed()
          .addField('❌ Error', 'Your server has already been initialized ! Remove initialization with ``w!uninit`` !')
          .setColor('#c23631')
        return message.channel.send(embed)
      }
      else {
        await message.guild.channels.create('change-name', 'text')
          .then(channel => db.get('guilds').push({ 'id': message.guild.id, 'channel': channel.id }).write())
          .catch(console.error);

        let id = getChannelIdByGuildId(message.guild.id);

        var embedsuccess1 = new Discord.MessageEmbed()
          .addField('✅ Success', "Your server has been initialized ! The bot will now send transactions in <#" + id + "> ! Remove initialization with ``w!uninit`` !")
          .setColor('#00FF00')
        message.channel.send(embedsuccess1);
      }
    }
  }

  if (message.content === "w!uninit") {
    if (checkBotPermission("SEND_MESSAGES", message) === "false" || checkBotPermission("EMBED_LINKS", message) === "false" || checkBotPermission("MANAGE_CHANNELS", message) === "false") {
      return 0;
    }
    else {
      if (db.get('guilds').find({ 'id': message.guild.id }).value()) {

        bot.channels.cache.get(getChannelIdByGuildId(message.guild.id)).delete()

        db.get('guilds').remove({ 'id': message.guild.id }).write()

        var embedsuccessuninit = new Discord.MessageEmbed()
          .addField('✅ Success', "Your server has been uninitialized successfully !")
          .setColor('#00FF00')
        message.channel.send(embedsuccessuninit);
      }
      else {
        var embederroruninit = new Discord.MessageEmbed()
          .addField('❌ Error', "Your server has not been initialiazed !")
          .setColor('#c23631')
        message.channel.send(embederroruninit);
      }
    }
  }

  if (message.content === 'w!invite') {
    if (checkBotPermission("SEND_MESSAGES", message) === "false" || checkBotPermission("EMBED_LINKS", message) === "false" || checkBotPermission("MANAGE_CHANNELS", message) === "false") {
      return 0;
    }
    else {
      var embedinvite = new Discord.MessageEmbed()
        .setColor('#FFFFFF')
        .addField('🎺 Invite the bot on your server !', 'Click [here](https://discord.com/oauth2/authorize?client_id=862759102224138243&permissions=19472&scope=bot) to invite the bot and get Whales Alerts on your server !')

      message.channel.send(embedinvite)
    }
  }

  if (message.content === 'w!help') {
    if (checkBotPermission("SEND_MESSAGES", message) === "false" || checkBotPermission("EMBED_LINKS", message) === "false" || checkBotPermission("MANAGE_CHANNELS", message) === "false") {
      return 0;
    }
    else {
      var embedhelp = new Discord.MessageEmbed()
        .setColor('#DCDCDC')
        .addField('🦮 Need help ?', '- ``w!init`` : Inits the bot on the server.\n- ``w!uninit`` : Removes the bot\'s configuration.\n- ``w!premium`` : Update your plan to premium !\n- ``w!invite`` : Invite the bot to your own server.')

      message.channel.send(embedhelp)
    }
  }

  if (message.content === 'w!premium') {
    if (checkBotPermission("SEND_MESSAGES", message) === "false" || checkBotPermission("EMBED_LINKS", message) === "false" || checkBotPermission("MANAGE_CHANNELS", message) === "false") {
      return 0;
    }
    else {
      var embedpremium = new Discord.MessageEmbed()
        .setColor('#FFFFFF')
        .addField('👑 Want to go premium? !', 'Click [here](https://sellix.io/product/60e9e5d41fc70) to buy the **premium** version, use the coupon ``betawhalesalerts`` to get a 20% discount ! Payment in Bitcoin, Ethereum, Bitcoin Cash or Litecoin.')

      message.channel.send(embedpremium)
    }
  }

})

bot.on("guildDelete", function (guild) {
  if (db.get('guilds').find({ 'id': guild.id }).value()) {
    db.get('guilds').remove({ 'id': guild.id }).write()
  }
});

bot.login(config.token);
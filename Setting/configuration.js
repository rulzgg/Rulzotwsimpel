const fs = require('fs')

const configuration = {
    owner: "-", // Number Owner
    botNumber: "-", // Number Bot
    setPair: "CHARLOTE",
    thumbUrl: "https://files.catbox.moe/h84rgw.jpg",
    session: "sessions",
    status: {
        public: true,
        terminal: true,
        reactsw: false
    },
    message: {
        owner: "no, this is for owners only",
        group: "this is for groups only",
        admin: "this command is for admin only",
        private: "this is specifically for private chat"
    },
    settings: {
        title: "Charlotte-Base",
        packname: 'Charlotte-Wbot',
        description: "this script was created by kyrie",
        author: 'https://www.about-kyrie.site',
        footer: "Charlotte-Smite`"
    },
    newsletter: {
        name: "Charlotte Information",
        id: "120363400186981325@newsletter"
    },
    socialMedia: {
        YouTube: "https://youtube.com/@kyriexe",
        GitHub: "https://github.com/Kyrienatons",
        Telegram: "https://t.me/kyriexe",
        ChannelWA: "https://whatsapp.com/channel/0029Vb0ow1AIt5s56VtrSW1e"
    }
}

module.exports = configuration;

let file = require.resolve(__filename)
require('fs').watchFile(file, () => {
  require('fs').unwatchFile(file)
  console.log('\x1b[0;32m'+__filename+' \x1b[1;32mupdated!\x1b[0m')
  delete require.cache[file]
  require(file)
})

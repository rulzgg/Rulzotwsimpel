const configuration = require('../settings/configuration');
const fs = require('fs');
const axios = require('axios');
const chalk = require('chalk');
const jimp = require('jimp');
const util = require('util');
const crypto = require('crypto');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const path = require('path');
const os = require('os');
const speed = require('performance-now');
const yts = require('yt-search');
const { spawn, exec, execSync } = require('child_process');
const { default: baileys, getContentType, proto, generateWAMessageFromContent } = require('@whiskeysockets/baileys');

module.exports = client = async (client, m, chatUpdate, store) => {
  try {
    const body = (
    m.mtype === 'conversation' ? m.message.conversation :
    m.mtype === 'imageMessage' ? m.message.imageMessage.caption :
    m.mtype === 'videoMessage' ? m.message.videoMessage.caption :
    m.mtype === 'extendedTextMessage' ? m.message.extendedTextMessage.text :
    m.mtype === 'buttonsResponseMessage' ? m.message.buttonsResponseMessage.selectedButtonId :
    m.mtype === 'listResponseMessage' ? m.message.listResponseMessage.singleSelectReply.selectedRowId :
    m.mtype === 'templateButtonReplyMessage' ? m.message.templateButtonReplyMessage.selectedId :
    m.mtype === 'interactiveResponseMessage' ? JSON.parse(m.msg.nativeFlowResponseMessage.paramsJson).id :
    m.mtype === 'templateButtonReplyMessage' ? m.msg.selectedId :
    m.mtype === 'messageContextInfo' ? m.message.buttonsResponseMessage?.selectedButtonId ||
    m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text : ''
    );

    const sender = m.key.fromMe
    ? client.user.id.split(':')[0] + '@s.whatsapp.net' || client.user.id
    : m.key.participant || m.key.remoteJid;

    const senderNumber = sender.split('@')[0];
    const budy = typeof m.text === 'string' ? m.text : '';
    const prefixRegex = /^[°zZ#$@*+,.?=''():√%!¢£¥€π¤ΠΦ_&><`™©®Δ^βα~¦|/\\©^]/;
    const prefix = prefixRegex.test(body) ? body.match(prefixRegex)[0] : '.';

    const from = m.key.remoteJid;
    const isGroup = m.key.remoteJid.endsWith('@g.us');
    const botNumber = await client.decodeJid(client.user.id);
    const isCreator = (m && m.sender && [botNumber, ...configuration.owner].map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender)) || false;
    const isBot = botNumber.includes(senderNumber);
  const groupMetadata = isGroup ? await client.groupMetadata(from) : {};
    const groupAdmins = isGroup ? groupMetadata.participants.filter(v => v.admin !== null).map(v => v.id) : [];
    const isAdmin = isGroup ? groupAdmins.includes(sender) : false;
    const isBotAdmin = isGroup ? groupAdmins.includes(botNumber) : false;
    const isCmd = body.startsWith(prefix);
    const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
    const args = body.trim().split(/ +/).slice(1);

    const pushname = m.pushName || 'No Name';
    const text = q = args.join(' ');
    const quoted = m.quoted ? m.quoted : m;
    const mime = (quoted.msg || quoted).mimetype || '';
    const qmsg = (quoted.msg || quoted);
    const isMedia = /image|video|sticker|audio/.test(mime);

  const { smsg, fetchJson, sleep, formatSize, runtime, getBuffer } = require('../library/myfunction');
  const { fquoted } = require('../library/fquoted');

    const checkGroup = () => {
      if (!isGroup) return reply(configuration.message.group);
      if (!isBotAdmin) return reply(configuration.message.admin);
      if (!isCreator && !isAdmin) return reply(configuration.message.owner);
    };
    ///============== [ TERMINAL MESSAGE ] ================
    if (m.message) {
      console.log('\x1b[30m--------------------\x1b[0m');
      console.log(chalk.bgHex('#4a69bd').bold(`▢ New Message`));
      console.log(chalk.bgHex('#ffffff').black(
    `   ▢ Tanggal: ${new Date().toLocaleString()} \n` +
    `   ▢ Pesan: ${m.body || m.mtype} \n` +
    `   ▢ Pengirim: ${pushname} \n` +
    `   ▢ JID: ${senderNumber}`
      ));
      console.log();
    }

    ///============== [ ALL FUNCTION X PLUGIN LOADER ] ================

    // Fungsi Upload ke Catbox
    async function toCatBoxMoe(filePath) {
      try {
        const form = new FormData();
        form.append("fileToUpload", fs.createReadStream(filePath));
        form.append("reqtype", "fileupload");

        const response = await axios.post("https://catbox.moe/user/api.php", form, {
          headers: {
            ...form.getHeaders(),
            "User-Agent": "Mozilla/5.0"
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        });

        return response.data;
      } catch (error) {
      return `Error Catbox: ${error.message}`;
      }
    }

    const reaction = async (jidss, emoji) => {
      client.sendMessage(jidss, {
        react: {
          text: emoji,
          key: m.key
        }
      });
    };

    async function reply(text) {
      client.sendMessage(m.chat, {
        text: '\n' + text + '\n',
        contextInfo: {
          mentionedJid: [sender],
          externalAdReply: {
            title: configuration.settings.title,
            body: configuration.settings.description,
            thumbnailUrl: configuration.thumbUrl,
            sourceUrl: configuration.socialMedia.Telegram,
            renderLargerThumbnail: false
          }
        }
    }, { quoted: fquoted.packSticker });
    }

    const limitPath = path.join(__dirname, '../library/database/limit.json');
  if (!fs.existsSync(limitPath)) fs.writeFileSync(limitPath, '{}');

    let limitDB = JSON.parse(fs.readFileSync(limitPath));
    const defaultLimit = 32;

    const saveLimit = () => fs.writeFileSync(limitPath, JSON.stringify(limitDB, null, 2));

    const initLimit = (jid) => {
      if (!limitDB[jid]) {
        limitDB[jid] = {
          count: 0,
          lastReset: Date.now()
        };
        saveLimit();
      }
    };

    const resetIfNeeded = (jid) => {
      const now = Date.now();
      const resetTime = 24 * 60 * 60 * 1000; // 24 jam
      if (now - limitDB[jid].lastReset > resetTime) {
        limitDB[jid].count = 0;
        limitDB[jid].lastReset = now;
        saveLimit();
      }
    };

    const getLimit = (jid) => {
      initLimit(jid);
      resetIfNeeded(jid);
      return limitDB[jid].count;
    };

    const isLimitExceeded = (jid) => getLimit(jid) >= defaultLimit;

    const incrementLimit = (jid, val = 1) => {
      initLimit(jid);
      resetIfNeeded(jid);
      limitDB[jid].count += val;
      saveLimit();
    };

    const pluginsLoader = async (directory) => {
      let plugins = [];
      const folders = fs.readdirSync(directory);
      for (let file of folders) {
        const filePath = path.join(directory, file);
        if (filePath.endsWith('.js')) {
          try {
            const resolvedPath = require.resolve(filePath);
            if (require.cache[resolvedPath]) delete require.cache[resolvedPath];
            const plugin = require(filePath);
            plugins.push(plugin);
          } catch (error) {
          console.log(`${filePath}:`, error);
          }
        }
      }
      return plugins;
    };

    const pluginsDisable = true;
    const plugins = await pluginsLoader(path.resolve(__dirname, '../plugins'));

    const plug = {
      client,
      prefix,
      command,
      reply,
      text,
      isBot,
      reaction,
      pushname,
      mime,
      quoted,
      sleep,
      fquoted,
      fetchJson
    };

    for (let plugin of plugins) {
      if (plugin.command.find(e => e == command.toLowerCase())) {
        if (plugin.isBot && !isBot) return;
        if (plugin.private && !plug.isPrivate) return m.reply(configuration.message.private);
        if (typeof plugin !== 'function') return;
        await plugin(m, plug);
      }
    }

    if (!pluginsDisable) return;

    ///============== [ FEATURE CHARLOTTE ] ================
    switch (command) {
      case 'menu': {
        if (!isCreator && !(isGroup && isAdmin)) {
          if (isLimitExceeded(sender)) return reply('❌ Limit kamu sudah habis untuk hari ini.');
          incrementLimit(sender); // potong 1 limit
        }
        const userLimit = getLimit(sender);
        const sisa = defaultLimit - userLimit;
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const formattedUsedMem = formatSize(usedMem);
        const formattedTotalMem = formatSize(totalMem);
        let timestamp = speed();
        let latensi = speed() - timestamp;

    let menu = `Hi ${pushname}\nsaya ${configuration.settings.packname} di buat menggunakan javascript type cummonjs saya di kembangkan oleh Kyrienatons.

> Statistic
▢ Limit: ${sisa} / ${defaultLimit}
▢ Speed: ${latensi.toFixed(4)} s
▢ Runtime: ${runtime(process.uptime())}
▢ Total RAM: ${formattedUsedMem} / ${formattedTotalMem}

— Searching
┌ ◦ ${prefix}ai
├ ◦ ${prefix}ytplay
└ ◦ ${prefix}spotify

— Download
┌ ◦ ${prefix}ytmp3
├ ◦ ${prefix}ytmp4
├ ◦ ${prefix}spotifydl
├ ◦ ${prefix}instagram
├ ◦ ${prefix}facebook
├ ◦ ${prefix}gdrive
└ ◦ ${prefix}mediafire

— Tools
┌ ◦ ${prefix}cekidch
├ ◦ ${prefix}tour
├ ◦ ${prefix}remini
├ ◦ ${prefix}sendmail
└ ◦ ${prefix}tempmail

— Groups
┌ ◦ ${prefix}tagall
├ ◦ ${prefix}hidetag
├ ◦ ${prefix}kick
├ ◦ ${prefix}promote
├ ◦ ${prefix}demote
├ ◦ ${prefix}setgroup
└ ◦ ${prefix}setppgc

— Owners
┌ ◦ ${prefix}get
├ ◦ ${prefix}addcase
├ ◦ ${prefix}delcase
├ ◦ ${prefix}csesi
├ ◦ ${prefix}exec
└ ◦ ${prefix}eval
        `;

        await client.sendMessage(m.chat, {
          productMessage: {
            title: '— ( Charlotte-WhatsApp )',
            description: configuration.settings.description,
            thumbnail: configuration.thumbUrl,
            productId: '123456789',
            retailerId: 'TOKOKU',
            url: configuration.socialMedia.YouTube,
            body: menu,
            footer: configuration.settings.footer,
            buttons: [
            {
              name: 'cta_url',
              buttonParamsJson: JSON.stringify({
                display_text: 'Telegram Kyrie',
                url: configuration.socialMedia.Telegram
              })
            }
            ]
          }
      }, { quoted: fquoted.packSticker });
      } break

      ///============== [ TOOLS FEATURE ] ================

      case 'limit': {
        const userLimit = getLimit(sender);
        const sisa = defaultLimit - userLimit;
    return reply(`📊 Sisa limit kamu hari ini: *${sisa}/${defaultLimit}*`);
      }
      break;


      case 'tourl': {
        if (!isCreator && !(isGroup)) {
          if (isLimitExceeded(sender)) return reply('❌ Limit kamu sudah habis untuk hari ini.');
          incrementLimit(sender); // potong 1 limit
        }
        if (!/image|video|audio|application/.test(mime)) return reply("kirim/reply media");

        const FormData = require('form-data');
      const { fromBuffer } = require('file-type');
        const fs           = require('fs');

        async function uploadToCatbox(buffer) {
          try {
          let { ext } = await fromBuffer(buffer);
            let form    = new FormData();
            form.append("fileToUpload", buffer, "file." + ext);
            form.append("reqtype", "fileupload");

            let res = await fetch("https://catbox.moe/user/api.php", {
              method: "POST",
              body: form,
            });

            return await res.text();
          } catch (err) {
            console.error("Upload Error:", err);
            return null;
          }
        }

        try {
          let mediaPath = await client.downloadAndSaveMediaMessage(qmsg);
          let buffer    = fs.readFileSync(mediaPath);
          let url       = await uploadToCatbox(buffer);

          if (!url || !url.startsWith("https://")) {
            throw new Error("Gagal mengunggah ke Catbox");
          }

      await client.sendMessage(m.chat, { text: url }, { quoted: fquoted.packSticker });
          fs.unlinkSync(mediaPath); // bersihkan file lokal
        } catch (err) {
          console.error("Tourl Error:", err);
          reply("Terjadi kesalahan saat mengubah media menjadi URL.");
        }
      } break;

      case "cekidch": case "idch": {
        if (!isCreator && !(isGroup)) {
          if (isLimitExceeded(sender)) return reply('❌ Limit kamu sudah habis untuk hari ini.');
          incrementLimit(sender); // potong 1 limit
        }
        if (!text) return reply("kirim/reply link chanels")
        if (!text.includes("https://whatsapp.com/channel/")) return reply("Link tautan tidak valid")
        let result = text.split('https://whatsapp.com/channel/')[1]
        let res = await client.newsletterMetadata("invite", result)
        let teks = `
      * *ID :* ${res.id}
      * *Nama :* ${res.name}
      * *Total Pengikut :* ${res.subscribers}
      * *Status :* ${res.state}
      * *Verified :* ${res.verification == "VERIFIED" ? "Terverifikasi" : "Tidak"}`
        let msgii = await generateWAMessageFromContent(m.chat, { viewOnceMessageV2Extension: { message: {
              interactiveMessage: proto.Message.InteractiveMessage.create({
                body: proto.Message.InteractiveMessage.Body.create({
                  text: teks
                }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                  buttons: [{
                    "name": "cta_copy",
                "buttonParamsJson": `{\"display_text\":\"Copy ID Channel\",\"id\":\"123456789\",\"copy_code\":\"${res.id}\"}`
                  }]
                })
            })}
      }}, {userJid: m.sender, quoted: fquoted.packSticker})
        await client.relayMessage(m.chat, msgii.message, {
          messageId: msgii.key.id
        })
      } break

      case 'remini': case 'hd': case 'enhanced': {
        if (!isCreator && !(isGroup)) {
          if (isLimitExceeded(sender)) return reply('❌ Limit kamu sudah habis untuk hari ini.');
          incrementLimit(sender); // potong 1 limit
        }
        let mediaMessage = m.quoted || m;
        let mime = (mediaMessage.msg || mediaMessage).mimetype || '';

        if (!mime.startsWith('image/') && !mime.startsWith('video/')) return reply('❌ Kirim atau reply gambar/video dengan .remini');

        try {
          let media = await client.downloadAndSaveMediaMessage(mediaMessage);
          let imageUrl = '';

          if (mime.startsWith('video/')) {
            let ffmpeg = require('fluent-ffmpeg');
            let outputImage = media.replace('.mp4', '.jpg');

            await new Promise((resolve, reject) => {
              ffmpeg(media)
            .screenshots({ count: 1, folder: './', filename: outputImage })
              .on('end', resolve)
              .on('error', reject);
            });

            imageUrl = await toCatBoxMoe(outputImage);
          } else {
            imageUrl = await toCatBoxMoe(media);
          }

          if (!imageUrl) return reply('❌ Gagal upload media!');

        let apiUrl = `https://fastrestapis.fasturl.cloud/aiimage/imgunblur?url=${encodeURIComponent(imageUrl)}`;
          let response = await fetch(apiUrl);
          let buffer = await response.buffer();

      await client.sendMessage(m.chat, { image: buffer, caption: '`Status: Succes Remini' }, { quoted: fquoted.packSticker });
        } catch (err) {
          console.error(err);
          reply('❌ Terjadi kesalahan saat memproses media!');
        }
      } break;

      case "tempmail": {
        if (!isCreator && !(isGroup)) {
          if (isLimitExceeded(sender)) return reply('❌ Limit kamu sudah habis untuk hari ini.');
          incrementLimit(sender); // potong 1 limit
        }
        const axios = require('axios');

        class TempMail {
          constructor() {
            this.cookie = null;
            this.baseUrl = 'https://tempmail.so';
          }

          async updateCookie(response) {
            if (response.headers['set-cookie']) {
              this.cookie = response.headers['set-cookie'].join('; ');
            }
          }

          async makeRequest(url) {
            const response = await axios({
              method: 'GET',
              url: url,
              headers: {
                'accept': 'application/json',
                'cookie': this.cookie || '',
                'referer': this.baseUrl + '/',
                'x-inbox-lifespan': '600',
                'sec-ch-ua': '"Not A(Brand";v="8", "Chromium";v="132"',
                'sec-ch-ua-mobile': '?1'
              }
            });

            await this.updateCookie(response);
            return response;
          }

          async initialize() {
            const response = await axios.get(this.baseUrl, {
              headers: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
                'sec-ch-ua': '"Not A(Brand";v="8", "Chromium";v="132"'
              }
            });
            await this.updateCookie(response);
            return this;
          }

          async getInbox() {
        const url = `${this.baseUrl}/us/api/inbox?requestTime=${Date.now()}&lang=us`;
            const response = await this.makeRequest(url);
            return response.data;
          }

          async getMessage(messageId) {
      const url = `${this.baseUrl}/us/api/inbox/messagehtmlbody/${messageId}?requestTime=${Date.now()}&lang=us`;
            const response = await this.makeRequest(url);
            return response.data;
          }
        }

        async function createTempMail() {
          const mail = new TempMail();
          await mail.initialize();
          return mail;
        }

        try {
          const mail = await createTempMail();
          const inbox = await mail.getInbox();

          if (!inbox.data?.name) throw 'Gagal mendapatkan email sementara!';

      const emailInfo = `Temporary Email\n\n*Email :* ${inbox.data.name}\n*Expired :* 10 minutes\nInbox Status : ${inbox.data.inbox?.length || 0} Pesan\n\n> Email Akan Otomatis Dihapus Setelah 10 Menit`;
      await client.sendMessage(m.chat, { text: emailInfo }, { quoted: fquoted.packSticker });

          const state = {
            processedMessages: new Set(),
            lastCheck: Date.now(),
            isRunning: true
          };

          const processInbox = async () => {
            if (!state.isRunning) return;

            try {
              const updatedInbox = await mail.getInbox();
              if (updatedInbox.data?.inbox?.length > 0) {
                const sortedMessages = [...updatedInbox.data.inbox].sort((a, b) =>
                new Date(b.date) - new Date(a.date));

                for (const message of sortedMessages) {
                  if (!state.processedMessages.has(message.id)) {
                    const messageDetail = await mail.getMessage(message.id);

                    let cleanContent = messageDetail.data?.html
                    ? messageDetail.data.html.replace(/<[^>]*>?/gm, '').trim()
                    : 'No text content';

              const messageInfo = `_Ada Pesan Baru Nih_\n\nFrom : ${message.from || 'Anomali'}\n*Subject :* ${message.subject || 'No Subject'}\n\n*Pesan :*\n${cleanContent}`;
                await client.sendMessage(m.chat, { text: messageInfo }, { quoted: fquoted.packSticker });
                    state.processedMessages.add(message.id);
                  }
                }
              }
            } catch (err) {
              console.error('Inbox Error:', err);
            }
          };

          await processInbox();
          const checkInterval = setInterval(processInbox, 10000);

          setTimeout(() => {
            state.isRunning = false;
            clearInterval(checkInterval);
        client.sendMessage(m.chat, { text: 'Email Otomatis Di Hapus Setelah 10 Menit' }, { quoted: fquoted.packSticker });
          }, 600000);

        } catch (e) {
    client.sendMessage(m.chat, { text: `Error: ${e}` }, { quoted: fquoted.packSticker });
        }
      } break;

      case 'sendmail': {
        if (!isCreator && !(isGroup)) {
          if (isLimitExceeded(sender)) return reply('❌ Limit kamu sudah habis untuk hari ini.');
          incrementLimit(sender); // potong 1 limit
        }
        if (!text) return reply('*Contoh:* .sendmail email@gmail.com|Subjek|Pesan');

        const [target, subject, ...messageParts] = text.split('|');
        if (!target || !subject || !messageParts.length) return reply('❌ Format salah!\nContoh: .sendmail email@gmail.com|Subjek|Isi pesan');

        const message = messageParts.join('|');

        async function bagusmail(target, subject, message) {
          const axios = require('axios');
          const data = JSON.stringify({
            "to": target,
            "subject": subject,
            "message": message
          });

          const config = {
            method: 'POST',
            url: 'https://sendmail-lime.vercel.app/send-email',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36',
              'Content-Type': 'application/json',
              'sec-ch-ua-platform': '"Android"',
              'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
              'sec-ch-ua-mobile': '?1',
              'origin': 'https://goodsite.vercel.app',
              'sec-fetch-site': 'same-origin',
              'sec-fetch-mode': 'cors',
              'sec-fetch-dest': 'empty',
              'referer': 'https://goodsite.vercel.app/',
              'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
              'priority': 'u=1, i'
            },
            data: data
          };

          const api = await axios.request(config);
          return api.data;
        }

        try {
          const result = await bagusmail(target.trim(), subject.trim(), message.trim());
          reply('✅ Pesan E-Mail berhasil dikirim!');
        } catch (err) {
          console.error(err);
        reply(`❌ Gagal mengirim email:\n${err.response?.data || err.message}`);
        }
      } break;

      ///============== [ SEARCHING FEATURE ] ================

      case 'play':
      case 'ytplay': {
        if (!isCreator && !(isGroup)) {
          if (isLimitExceeded(sender)) return reply('❌ Limit kamu sudah habis untuk hari ini.');
          incrementLimit(sender); // potong 1 limit
        }
      if (!text) return reply(`Example: ${prefix + command} Lagu sad`);
        try {
        let search = await yts(`${text}`);
          if (!search || search.all.length === 0) return reply(`*Lagu tidak ditemukan!* ☹️`);

        let { videoId, image, title, views, duration, author, ago, url, description } = search.all[0];
let caption = `「 *YOUTUBE PLAY* 」\n\n🆔 ID : ${videoId}\n💬 Title : ${title}\n📺 Views : ${views}\n⏰ Duration : ${duration.timestamp}\n▶️ Channel : ${author.name}\n📆 Upload : ${ago}\n🔗 URL Video : ${url}\n📝 Description : ${description}`;

          client.sendMessage(m.chat,{
          image: { url: image },
            caption: caption,
          footer: `${global.footer}`,
            buttons: [
            {
          buttonId: `${prefix}ytmp3 ${url}`,
              buttonText: {
                displayText: "YouTube Music"
              }
            },
            {
          buttonId: `${prefix}ytmp4 ${url}`,
              buttonText: {
                displayText: "YouTube Video"
              }
            }
            ],
            viewOnce: true,
          }, {
            quoted: fquoted.packSticker
          });
        } catch (err) {
          reply('Terjadi Kesalahan Dalam Fitur Silahkan Lapor ketik *.raport teks*');
        }
      } break

      case 'spotify': {
        if (!isCreator && !(isGroup)) {
          if (isLimitExceeded(sender)) return reply('❌ Limit kamu sudah habis untuk hari ini.');
          incrementLimit(sender); // potong 1 limit
        }
        if (!text) return reply('Kirim kata kunci!\nContoh: *!spotifysearch klebus*');

        try {
          reply('🔎 Mencari di Spotify...');
        let apiUrl = `https://apii.baguss.web.id/search/spotify?apikey=bagus&q=${encodeURIComponent(text)}`;
        let { data } = await axios.get(apiUrl);

          if (!data.success) return reply('Gagal menemukan lagu.');

  let caption = `🎶 *Spotify Search*\n\n📌 *Judul:* ${data.spotify.title}\n🎤 *Artis:* ${data.spotify.artist.name} || ${data.spotify.artist.spotify_url}\n⏱ *Durasi:* ${data.spotify.duration}`;

          let imageBuffer = await getBuffer(data.spotify.thumbnail);
      client.sendMessage(m.chat, { image: imageBuffer, caption }, { quoted: fquoted.packSticker });

        } catch (err) {
          console.error(err);
          reply('Terjadi kesalahan, coba lagi nanti.');
        }
      } break;

      case 'ai': {
        if (!text) return reply('Masukkan teksnya! Contoh: .ai siapa presiden pertama indonesia');

        await reply('bentar bang lagi pesan suara..🤭');
        try {
        const res = await axios.get(`https://apii.baguss.web.id/tools/aiaudio?apikey=bagus&text=${encodeURIComponent(text)}`, {
            responseType: 'arraybuffer'
          });

          const audioBuffer = Buffer.from(res.data, 'binary');
          await client.sendMessage(m.chat, {
            audio: audioBuffer,
            mimetype: 'audio/mp4',
            ptt: true
        }, { quoted: m });

        } catch (e) {
          console.error(e);
          reply('❌ Gagal mengambil audio.');
        }
      } break;
      ///============== [ DOWNLOAD FEATURE ] ================

      case 'ytmp3': {
        if (!isCreator && !(isGroup)) {
          if (isLimitExceeded(sender)) return reply('❌ Limit kamu sudah habis untuk hari ini.');
          incrementLimit(sender); // potong 1 limit
        }
        if (!text) return reply(`Masukkan URL YouTube!\n\nContoh: .ytmp3 https://www.youtube.com/watch?v=IcrbM1l_BoI`);

        try {
          reply('⏳ Sedang memproses...');
        let apiUrl = `https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(text)}`;

          let res = await fetch(apiUrl);
          let json = await res.json();

          console.log("API JSON Response:", json);
          if (!json.status || !json.result || !json.result.download) {
            return reply('Gagal mengambil data. Pastikan link YouTube valid!');
          }

          let data = json.result;
          let download = data.download;

          let caption = `*「 YouTube MP3 」*\n\n` +
        `🎵 *Judul*: ${data.metadata.title}\n` +
        `⏳ *Durasi*: ${data.metadata.timestamp}\n` +
        `👀 *Views*: ${data.metadata.views.toLocaleString()} kali\n` +
        `📝 *Channel*: ${data.metadata.author.name}\n` +
        `🔗 *Link Video*: ${data.metadata.url}`;

          let audioBuffer = await getBuffer(download.url);


          await client.sendMessage(m.chat, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
          fileName: `${download.filename || 'audio.mp3'}`
        }, { quoted: fquoted.packSticker });

        } catch (e) {
          console.error("Error ytmp3:", e);
          reply('Terjadi kesalahan saat mengambil data.');
        }
      } break;

      case 'ytmp4': {
        if (!isCreator && !(isGroup)) {
          if (isLimitExceeded(sender)) return reply('❌ Limit kamu sudah habis untuk hari ini.');
          incrementLimit(sender); // potong 1 limit
        }
        if (!text) return reply(`Masukkan URL YouTube!\n\nContoh: .ytmp4 https://youtube.com/watch?v=KHgllosZ3kA`);

        try {
          reply('⏳ Sedang memproses...');
        let apiUrl = `https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(text)}`;

          let res = await fetch(apiUrl);
          let json = await res.json();

          console.log("API JSON Response:", json);
          if (!json.status || !json.result || !json.result.download) {
            return reply('Gagal mengambil data. Pastikan link YouTube valid!');
          }

        let { metadata, download } = json.result;
        let { title } = metadata;
        let { url, filename } = download;


          let videoBuffer = await getBuffer(url);


          await client.sendMessage(m.chat, {
            video: videoBuffer,
            mimetype: 'video/mp4',
          fileName: filename || `${title}.mp4`,
          caption: `*「 YouTube MP4 」*\n\n📺 *Judul*: ${title}`
        }, { quoted: fquoted.packSticker });

        } catch (e) {
          console.error("Error ytmp4:", e);
          reply('Terjadi kesalahan saat mengambil data.');
        }
      } break;

      case 'spotifydl': {
        if (!isCreator && !(isGroup)) {
          if (isLimitExceeded(sender)) return reply('❌ Limit kamu sudah habis untuk hari ini.');
          incrementLimit(sender); // potong 1 limit
        }
      if (!text) return reply(`Kirim link Spotify!\nContoh: *.${command} https://open.spotify.com/track/3k68kVFWTTBP0Jb4LOzCax*`);

        try {
          reply('⏳ Sedang memproses...');
        let apiUrl = `https://api.vreden.my.id/api/spotify?url=${encodeURIComponent(text)}`;
        let { data } = await axios.get(apiUrl);

          if (data.status !== 200 || !data.result || !data.result.status)
          return reply('Gagal mengambil data dari Spotify.');

        let { title, music } = data.result;

        let audioBuffer = await axios.get(music, { responseType: 'arraybuffer' })
          .then(res => res.data)
          .catch(err => {
            console.error('Error mengambil audio:', err);
            return null;
          });

          if (!audioBuffer) return reply('Gagal mengunduh audio.');

          await client.sendMessage(m.chat, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
          fileName: `${title}.mp3`
        }, { quoted: fquoted.packSticker });

        } catch (err) {
          console.error('Error utama:', err);
          reply('Terjadi kesalahan, coba lagi nanti.');
        }
      } break;

      case 'mediafire': {
        if (!isCreator && !(isGroup)) {
          if (isLimitExceeded(sender)) return reply('❌ Limit kamu sudah habis untuk hari ini.');
          incrementLimit(sender); // potong 1 limit
        }
        if (!text) return reply(`Masukkan URL MediaFire!\n\nContoh: .mediafire https://www.mediafire.com/file/bahgm4e7c6z3zzy/TELE-DDOS-BY-BAGUS.zip/file`);

        try {
          reply('⏳ Sedang memproses...');
        let apiUrl = `https://api.vreden.my.id/api/mediafiredl?url=${encodeURIComponent(text)}`;

          let res = await fetch(apiUrl);
          let json = await res.json();

          console.log("API JSON Response:", json);

          if (!json.status || json.status !== 200 || !json.result || !json.result.length) {
            return reply('Gagal mengambil data. Pastikan link MediaFire valid!');
          }

          let fileData = json.result[0];
        let { nama, mime, size, link } = fileData;

          let caption = `*「 MediaFire Downloader 」*\n\n` +
        `📂 *Nama*: ${nama}\n` +
        `📦 *Size*: ${size}\n\n` +
          `Download By Charlotte API`;


        let fileRes = await fetch(link, { redirect: 'follow' });
          if (!fileRes.ok) {
            console.error("File Fetch Error:", fileRes.status, fileRes.statusText);
            return reply('Gagal mengunduh file, coba lagi nanti.');
          }

          let fileBuffer = await fileRes.arrayBuffer();

          await client.sendMessage(m.chat, {
            document: Buffer.from(fileBuffer),
            mimetype: mime || 'application/octet-stream',
            fileName: nama || 'file.zip',
            caption: caption
        }, { quoted: fquoted.packSticker });

        } catch (e) {
          console.error("Main Error:", e);
          reply('Terjadi kesalahan saat mengambil data.');
        }
      } break;

      case 'instagram': case 'ig': case 'igdl':{
        if (!isCreator && !(isGroup)) {
          if (isLimitExceeded(sender)) return reply('❌ Limit kamu sudah habis untuk hari ini.');
          incrementLimit(sender); // potong 1 limit
        }
      if (!text) return reply(`Kirim link Instagram!\nContoh: *.${command} https://www.instagram.com/reel/DDqZnIYPsRX/*`);

        try {
          reply('⏳ Sedang memproses...');
        let apiUrl = `https://apii.baguss.web.id/downloader/igdl?apikey=bagus&url=${text}`;
        let { data } = await axios.get(apiUrl);

          if (!data.success) return reply('Gagal mengambil data dari Instagram.');

        let { video, detail } = data;
let captionText = `📌 *Username:* @${detail.username}\n❤️ *Suka:* ${detail.like}\n💬 *Komentar:* ${detail.comment}\n👀 *Dilihat:* ${detail.view || 'Tidak tersedia'}\n\n🔗 *Link:* ${text}\n\n📝 *Caption:*\n${detail.title || 'Tidak ada caption'}`;

          if (video?.url) {
            let media = await getBuffer(video.url);
        client.sendMessage(m.chat, { video: media, caption: captionText }, { quoted: fquoted.packSticker });
          } else {
            reply('Tidak ada video yang bisa diunduh.');
          }

        } catch (err) {
          console.error(err);
          reply('Terjadi kesalahan, coba lagi nanti.');
        }
      } break;

      case 'fbdl': case 'fb': case 'facebook': {
        if (!isCreator && !(isGroup)) {
          if (isLimitExceeded(sender)) return reply('❌ Limit kamu sudah habis untuk hari ini.');
          incrementLimit(sender); // potong 1 limit
        }
      if (!text) return reply(`Kirim link Facebook!\nContoh: *.${command} https://www.facebook.com/watch?v=123456789*`);

        try {
          reply('⏳ Sedang memproses...');
          const axios = require('axios');

        let apiUrl = `https://api.vreden.my.id/api/fbdl?url=${encodeURIComponent(text)}`;
        let { data } = await axios.get(apiUrl);

          if (data.status !== 200 || !data.data.status) return reply('Gagal mengambil data dari Facebook.');

        let { title, durasi, hd_url, sd_url } = data.data;

    let captionText = `🎬 *Judul:* ${title}\n⏳ *Durasi:* ${durasi}\n🔗 *Link:* ${text}`;

          async function sendVideo(url) {
            try {
          let media = { video: { url }, caption: captionText };
            await client.sendMessage(m.chat, media, { quoted: fquoted.packSticker });
            } catch (err) {
              console.error(err);
              reply('Gagal mengirim video.');
            }
          }

          if (hd_url) {
            await sendVideo(hd_url);
          } else if (sd_url) {
            await sendVideo(sd_url);
          } else {
            reply('Gagal mengunduh video! Tidak ada format tersedia.');
          }

        } catch (err) {
          console.error(err);
          reply('Terjadi kesalahan, coba lagi nanti.');
        }
      } break;


      case 'gdrive': case 'googledrive': case 'drive':{
        if (!isCreator && !(isGroup)) {
          if (isLimitExceeded(sender)) return reply('❌ Limit kamu sudah habis untuk hari ini.');
          incrementLimit(sender); // potong 1 limit
        }
      if (!text) return reply(`Kirim link Google Drive!\nContoh: *.${command} https://drive.google.com/file/d/1YTD7Ymux9puFNqu__5WPlYdFZHcGI3Wz/view?usp=drivesdk*`);

        try {
          reply('⏳ Sedang memproses...');
        let apiUrl = `https://apii.baguss.web.id/downloader/gdrivedl?apikey=bagus&url=${encodeURIComponent(text)}`;
        let { data } = await axios.get(apiUrl);

          if (!data.success) return reply('Gagal mengambil data dari Google Drive.');

        let { name, download_url } = data.file;

          let fileBuffer = await getBuffer(download_url);

      client.sendMessage(m.chat, { document: fileBuffer, fileName: name, mimetype: 'application/octet-stream' }, { quoted: fquoted.packSticker });

        } catch (err) {
          console.error(err);
          reply('Terjadi kesalahan, coba lagi nanti.');
        }
      } break;

      ///============== [ GROUPS FEATURE ] ================

      case 'tagall': {
        if (!isBot) return;
        const textMessage = args.join(' ') || 'nothing';
      let teks = `tagall message:\n> *${textMessage}*\n\n`;

        const groupMetadata = await client.groupMetadata(m.chat);
        const participants = groupMetadata.participants;

        for (let mem of participants) {
        teks += `@${mem.id.split('@')[0]}\n`;
        }

        client.sendMessage(m.chat, {
          text: teks,
          mentions: participants.map(a => a.id)
      }, { quoted: fquoted.packSticker });
      } break;

      case 'add': {
        checkGroup(); // validasi grup

      if (!text) return reply(`*Contoh:* ${prefix + command} 628xxxx`);

        const target = text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        await client.groupParticipantsUpdate(m.chat, [target], 'add')
        .then(() => reply('✅ Berhasil menambahkan!'))
        .catch(() => reply('❌ Gagal menambahkan!\n• Nomor mungkin sudah keluar berkali-kali\n• Atau setelan grup tidak mengizinkan masuk.'));
      } break;

      case 'kick': {
        checkGroup(); // validasi grup

        let target;
        if (m.quoted) {
          target = m.quoted.sender;
        } else if (text) {
          target = text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        } else {
        return reply(`*Contoh:* ${prefix + command} @tag/reply/628xxxx`);
        }

        if (target === sender) return reply('❌ Tidak bisa mengeluarkan diri sendiri!');
        if (target === botNumber) return reply('❌ Jangan mengeluarkan bot!');

        await client.groupParticipantsUpdate(m.chat, [target], 'remove')
        .then(() => reply('✅ Berhasil mengeluarkan!'))
        .catch(() => reply('❌ Gagal mengeluarkan! Mungkin target adalah admin.'));
      } break;

      case 'promote': {
        checkGroup();

        let target;
        if (m.quoted) {
          target = m.quoted.sender;
        } else if (text) {
          target = text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        } else {
        return reply(`*Contoh:* ${prefix + command} @tag/reply/628xxxx`);
        }

        await client.groupParticipantsUpdate(m.chat, [target], 'promote')
        .then(() => reply('✅ Berhasil dijadikan admin!'))
        .catch(() => reply('❌ Gagal promote. Mungkin user sudah admin.'));
      } break;

      case 'demote': {
        checkGroup();

        let target;
        if (m.quoted) {
          target = m.quoted.sender;
        } else if (text) {
          target = text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        } else {
        return reply(`*Contoh:* ${prefix + command} @tag/reply/628xxxx`);
        }

        await client.groupParticipantsUpdate(m.chat, [target], 'demote')
        .then(() => reply('✅ Berhasil dicopot dari admin!'))
        .catch(() => reply('❌ Gagal demote. Mungkin user bukan admin.'));
      } break;

      case 'setpp': {
        checkGroup();
        if (!m.quoted || !/image/.test(mime)) return reply('❌ Reply gambar yang ingin dijadikan foto grup.');
        let media = await client.downloadMediaMessage(quoted);
        await client.updateProfilePicture(m.chat, media)
        .then(() => reply('✅ Foto profil grup berhasil diubah!'))
        .catch(() => reply('❌ Gagal mengubah foto grup.'));
      } break;

      case 'hidetag': {
        checkGroup();
      if (!text && !m.quoted) return reply(`*Contoh:* ${prefix + command} Halo semuanya!`);

        const isi = text ? text : m.quoted?.text || ' ';
        const mention = groupMetadata.participants.map(a => a.id);

        await client.sendMessage(m.chat, {
          text: isi,
          mentions: mention
      }, { quoted: fquoted.packSticker });
      } break;

      case 'setgroup': {
        checkGroup();

        const subcmd = args[0];
        if (!subcmd || !['open', 'close'].includes(subcmd)) {
      return reply(`*Contoh:* ${prefix + command} open\nUntuk membuka grup\n\n${prefix + command} close\nUntuk menutup grup`);
        }

        if (subcmd === 'open') {
          await client.groupSettingUpdate(m.chat, 'not_announcement')
          .then(() => reply('✅ Grup telah *dibuka*! Sekarang semua member bisa kirim pesan.'))
          .catch(() => reply('❌ Gagal membuka grup.'));
        }

        if (subcmd === 'close') {
          await client.groupSettingUpdate(m.chat, 'announcement')
          .then(() => reply('✅ Grup telah *ditutup*! Hanya admin yang bisa kirim pesan.'))
          .catch(() => reply('❌ Gagal menutup grup.'));
        }
      } break;

      ///============== [ OWNERS FEATURE ] ================

      case 'get': {
        if (!isCreator) return;
      if (!/^https?:\/\//.test(text)) return reply(`*ex:* ${prefix + command} https://www.about-kyrie.site`);
        const ajg = await fetch(text);
        await reaction(m.chat, '⚡');

        if (ajg.headers.get('content-length') > 100 * 1024 * 1024)
      throw `Content-Length: ${ajg.headers.get('content-length')}`;

        const contentType = ajg.headers.get('content-type');
        if (contentType.startsWith('image/')) {
    return client.sendMessage(m.chat, { image: { url: text } }, { quoted: fquoted.packSticker });
        }

        if (contentType.startsWith('video/')) {
    return client.sendMessage(m.chat, { video: { url: text } }, { quoted: fquoted.packSticker });
        }

        if (contentType.startsWith('audio/')) {
          return client.sendMessage(m.chat, {
          audio: { url: text },
            mimetype: 'audio/mpeg',
            ptt: true
        }, { quoted: fquoted.packSticker });
        }

        let alak = await ajg.buffer();
        try {
          alak = util.format(JSON.parse(alak + ''));
        } catch (e) {
          alak = alak + '';
        } finally {
          return reply(alak.slice(0, 65536));
        }
      } break;

      case 'exec': {
        if (!isCreator) return;
        if (!budy.startsWith('.exec')) return;

        const args = budy.trim().split(' ').slice(1).join(' ');
      if (!args) return reply(`*ex:* ${prefix + command} ls`);

        exec(args, (err, stdout) => {
          if (err) return reply(String(err));
          if (stdout) return reply(stdout);
        });
      } break;

      case 'eval': {
        if (!isCreator) return;
        if (!budy.startsWith('.eval')) return;

        const args = budy.trim().split(' ').slice(1).join(' ');
      if (!args) return reply(`*ex:* ${prefix + command} m.chat`);

        let teks;
        try {
    teks = await eval(`(async () => { ${args.startsWith('return') ? '' : 'return'} ${args} })()`);
        } catch (e) {
          teks = e;
        } finally {
          await reply(util.format(teks));
        }
      } break;

      case 'owner': {
        const kontakUtama = {
          displayName: 'CS Charlotte : Kyrie',
          vcard: `BEGIN:VCARD
          VERSION:3.0
          N:;;;;
          FN:Kyrie NotStar
          item1.TEL;waid=6287786546759:6287786546759
          item1.X-ABLabel:Developer
      item2.TEL;waid=${configuration.owner}:${configuration.owner}
          item2.X-ABLabel:My Support
          EMAIL;type=INTERNET:kyrienatons@gmail.com
          ORG: Developer Charlotte
          END:VCARD`
        }
        await client.sendMessage(from, {
        contacts: { contacts: [kontakUtama] },
          contextInfo: {
            mentionedJid: [sender],
            externalAdReply: {
              showAdAttribution: true,
              renderLargerThumbnail: true,
              title: `Charlotte Bot`,
              mediaUrl: configuration.socialMedia.YouTube,
              sourceUrl: configuration.socialMedia.YouTube
            }
          }
      }, { quoted: fquoted.packSticker })
      } break

      case 'delcase': {
        if (!isCreator) return reply('❌ Hanya owner yang bisa menghapus perintah!');

        let caseName = text.trim();
        if (!caseName) return reply('❌ Harap masukkan nama case yang ingin dihapus!');

        let filePath = './system/handler.js';
        let fs = require('fs');

        try {

          let fileContent = fs.readFileSync(filePath, 'utf8');


      let caseRegex = new RegExp(`case '${caseName}': {([\\s\\S]*?)}\\s*break;`, 'g');

          if (!caseRegex.test(fileContent)) return reply('❌ Case tidak ditemukan!');


          let newContent = fileContent.replace(caseRegex, '');


          fs.writeFileSync(filePath, newContent, 'utf8');

        reply(`✅ Perintah *${caseName}* berhasil dihapus!`);
        } catch (err) {
          console.error(err);
          reply('❌ Gagal menghapus perintah!');
        }
      } break;

      case 'addcase': {
        if (!isCreator) return reply('❌ Hanya owner yang bisa menambahkan perintah!');

        let code = m.quoted ? m.quoted.text : text;
        if (!code) return reply('❌ Harap reply atau kirim kode JavaScript yang ingin ditambahkan!');

        const filePath = './system/handler.js';
        const fs = require('fs');

        try {
          if (!code.includes('case ')) return reply('❌ Kode harus berisi "case" untuk perintah baru!');

          let fileContent = fs.readFileSync(filePath, 'utf8');


          const insertPosition = fileContent.lastIndexOf('break;');

          if (insertPosition === -1) return reply('❌ Gagal menemukan posisi untuk menambahkan case!');


          const before = fileContent.slice(0, insertPosition + 'break;'.length);
          const after = fileContent.slice(insertPosition + 'break;'.length);


    const newContent = `${before}\n\n${code}\n${after}`;

          fs.writeFileSync(filePath, newContent, 'utf8');

          reply(`✅ Perintah baru berhasil ditambahkan!`);
        } catch (err) {
          console.error(err);
          reply('❌ Gagal menambahkan perintah!');
        }
      } break;

      ///============== [ BATAS AKHIR FEATURE ] ================

      default:
    }
  } catch (err) {
    console.log(util.format(err));
  }
};

let file = require.resolve(__filename);
require('fs').watchFile(file, () => {
  require('fs').unwatchFile(file);
  console.log('\x1b[0;32m' + __filename + ' \x1b[1;32mupdated!\x1b[0m');
  delete require.cache[file];
  require(file);
});
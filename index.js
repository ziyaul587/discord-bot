const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");

// 🔑 CONFIG
const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1486442818313392178";

// STORAGE
const warns = new Map();
const autoAnnouncements = new Map();
const autoModSettings = new Map();
const userWarnings = new Map();
const userMessages = new Map();

// CLIENT
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// ================= COMMANDS =================
const commands = [

  // 🛡️ AUTOMOD
  new SlashCommandBuilder()
    .setName("automod")
    .setDescription("Ultra automod control")
    .addStringOption(o =>
      o.setName("action")
        .setDescription("Choose action")
        .setRequired(true)
        .addChoices(
          { name: "enable", value: "enable" },
          { name: "disable", value: "disable" },
          { name: "set_timeout", value: "set_timeout" },
          { name: "add_badword", value: "add_badword" },
          { name: "remove_badword", value: "remove_badword" }
        ))
    .addStringOption(o =>
      o.setName("value").setDescription("Bad word"))
    .addIntegerOption(o =>
      o.setName("minutes").setDescription("Timeout minutes")),

  // 👤 INFO
  new SlashCommandBuilder()
    .setName("info")
    .setDescription("User info")
    .addUserOption(o =>
      o.setName("user").setDescription("Target user")),

  // 🖼️ AVATAR
  new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("User avatar")
    .addUserOption(o =>
      o.setName("user").setDescription("Target user")),

  // 📢 ANNOUNCE
  new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Send announcement")
    .addChannelOption(o =>
      o.setName("channel")
        .setDescription("Target channel")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("message")
        .setDescription("Announcement text")
        .setRequired(true)),

  // 🔁 AUTO ANNOUNCE START
  new SlashCommandBuilder()
    .setName("announce_start")
    .setDescription("Start auto announce")
    .addChannelOption(o =>
      o.setName("channel")
        .setDescription("Channel")
        .setRequired(true))
    .addIntegerOption(o =>
      o.setName("minutes")
        .setDescription("Interval minutes")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("message")
        .setDescription("Message")
        .setRequired(true)),

  // 🛑 STOP
  new SlashCommandBuilder()
    .setName("announce_stop")
    .setDescription("Stop auto announce"),

  // 👢 KICK
  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick user")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("Target")
        .setRequired(true)),

  // 🔨 BAN
  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban user")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("Target")
        .setRequired(true)),

  // 🧹 CLEAR
  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Delete messages")
    .addIntegerOption(o =>
      o.setName("amount")
        .setDescription("Number of messages")
        .setRequired(true)),

].map(c => c.toJSON());

// REGISTER
const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log("✅ Commands registered");
})();

// READY
client.once("ready", () => {
  console.log(`🌌 BOT ONLINE (${client.user.tag})`);
});

// ================= INTERACTIONS =================
client.on("interactionCreate", async i => {
  if (!i.isChatInputCommand()) return;

  const member = i.member;

  // 🛡️ AUTOMOD
  if (i.commandName === "automod") {
    if (!member.permissions.has(PermissionsBitField.Flags.Administrator))
      return i.reply({ content: "❌ Admin only", ephemeral: true });

    const action = i.options.getString("action");
    const value = i.options.getString("value");
    const minutes = i.options.getInteger("minutes") || 5;

    let settings = autoModSettings.get(i.guild.id) || {
      enabled: false,
      timeout: 5,
      badWords: []
    };

    if (action === "enable") settings.enabled = true;
    if (action === "disable") settings.enabled = false;
    if (action === "set_timeout") settings.timeout = minutes;
    if (action === "add_badword" && value) settings.badWords.push(value.toLowerCase());
    if (action === "remove_badword" && value)
      settings.badWords = settings.badWords.filter(w => w !== value.toLowerCase());

    autoModSettings.set(i.guild.id, settings);

    return i.reply({ content: "🛡️ AutoMod updated", ephemeral: true });
  }

  // 👤 INFO
  if (i.commandName === "info") {
    const user = i.options.getUser("user") || i.user;
    return i.reply(`👤 ${user.tag}\nID: ${user.id}`);
  }

  // 🖼️ AVATAR
  if (i.commandName === "avatar") {
    const user = i.options.getUser("user") || i.user;
    return i.reply(user.displayAvatarURL({ size: 1024 }));
  }

  // 📢 ANNOUNCE
  if (i.commandName === "announce") {
    const ch = i.options.getChannel("channel");
    const msg = i.options.getString("message");
    await ch.send(msg);
    return i.reply({ content: "✅ Sent", ephemeral: true });
  }

  // 🔁 AUTO ANNOUNCE
  if (i.commandName === "announce_start") {
    const ch = i.options.getChannel("channel");
    const mins = i.options.getInteger("minutes");
    const msg = i.options.getString("message");

    if (autoAnnouncements.has(i.guild.id))
      clearInterval(autoAnnouncements.get(i.guild.id));

    const timer = setInterval(() => {
      ch.send(msg);
    }, mins * 60000);

    autoAnnouncements.set(i.guild.id, timer);
    return i.reply("🚀 Started");
  }

  if (i.commandName === "announce_stop") {
    clearInterval(autoAnnouncements.get(i.guild.id));
    autoAnnouncements.delete(i.guild.id);
    return i.reply("🛑 Stopped");
  }

  // 🛡️ MOD COMMANDS
  if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;

  const user = i.options.getUser("user");
  const target = user ? await i.guild.members.fetch(user.id) : null;

  if (i.commandName === "kick") {
    await target.kick();
    return i.reply("👢 Kicked");
  }

  if (i.commandName === "ban") {
    await target.ban();
    return i.reply("🔨 Banned");
  }

  if (i.commandName === "clear") {
    const amt = i.options.getInteger("amount");
    await i.channel.bulkDelete(amt, true);
    return i.reply({ content: "🧹 Done", ephemeral: true });
  }
});

// ================= AUTOMOD SYSTEM =================
client.on("messageCreate", async message => {
  if (!message.guild || message.author.bot) return;

  const settings = autoModSettings.get(message.guild.id);
  if (!settings || !settings.enabled) return;

  const content = message.content.toLowerCase();
  const userId = message.author.id;
  const now = Date.now();

  // ===== BAD WORD FILTER =====
  if (settings.badWords.some(w => content.includes(w))) {
    await message.delete().catch(() => { });
    return warnUser(message, settings, "Bad word");
  }

  // ===== SPAM DETECTION =====
  if (!userMessages.has(userId)) userMessages.set(userId, []);

  const timestamps = userMessages.get(userId);
  timestamps.push(now);

  // last 5 sec ke messages rakho
  const filtered = timestamps.filter(t => now - t < 5000);
  userMessages.set(userId, filtered);

  // 🚨 SPAM CONDITION
  if (filtered.length >= 3) {
    await message.delete().catch(() => { });
    return warnUser(message, settings, "Spam");
  }
});

// WARN SYSTEM
async function warnUser(message, settings, reason) {
  const id = message.author.id;
  const count = (userWarnings.get(id) || 0) + 1;
  userWarnings.set(id, count);

  message.channel.send(
    `⚠️ ${message.author} Stop Spamming NEB 😡 (${reason}) [${count}/3]`
  );

  if (count >= 3) {
    const member = await message.guild.members.fetch(id);
    await member.timeout(settings.timeout * 60000);

    message.channel.send(
      `🚨 ${message.author} Enjoy your vacation 😊 ${settings.timeout} min`
    );

    userWarnings.delete(id);
  }
}

// AUTO REPLY
client.on("messageCreate", msg => {
  if (msg.author.bot) return;
  if (msg.content.toLowerCase() === "hello")
    msg.reply("👋 Hello!");
});

// LOGIN
client.login(TOKEN);

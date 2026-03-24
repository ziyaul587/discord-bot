const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");

// 🔑 PUT YOUR DATA HERE
const TOKEN = "MTQ4NTkzMzg4ODkzNjA4MzUxNg.G9mGNW.prJl1TIhPkhjx8onX8_ZGVjx_V0jx5FfL3trxI";
const CLIENT_ID = "1485933888936083516";

// 🧠 Temporary warn storage
const warns = new Map();

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// ================= SLASH COMMANDS =================
const commands = [
  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member")
    .addUserOption(o =>
      o.setName("user").setDescription("User to kick").setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("info")
    .setDescription("Show info about a user")
    .addUserOption(o =>
      o.setName("user").setDescription("User").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Show avatar of a user")
    .addUserOption(o =>
      o.setName("user").setDescription("User").setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member")
    .addUserOption(o =>
      o.setName("user").setDescription("User to ban").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban by user ID")
    .addStringOption(o =>
      o.setName("id").setDescription("User ID").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member")
    .addUserOption(o =>
      o.setName("user").setDescription("User").setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("minutes").setDescription("Time in minutes").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("remove_timeout")
    .setDescription("Remove timeout")
    .addUserOption(o =>
      o.setName("user").setDescription("User").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
    .addUserOption(o =>
      o.setName("user").setDescription("User").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("remove_warn")
    .setDescription("Remove a warn")
    .addUserOption(o =>
      o.setName("user").setDescription("User").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Delete messages")
    .addIntegerOption(o =>
      o.setName("amount").setDescription("Number of messages").setRequired(true)
    ),
].map(c => c.toJSON());

// ================= REGISTER COMMANDS =================
const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(Routes.applicationCommands(CLIENT_ID), {
    body: commands,
  });
  console.log("⚡ Slash commands registered");
})();

// ================= READY =================
client.once("clientReady", () => {
  console.log(`🌌 BOT ONLINE (${client.user.tag})`);
});

client.on("interactionCreate", async i => {
  if (!i.isChatInputCommand()) return;

  const member = i.member;

  // ================= PUBLIC COMMANDS =================

  // ===== INFO =====
  if (i.commandName === "info") {
    const user = i.options.getUser("user") || i.user;
    const targetMember = await i.guild.members.fetch(user.id);

    const embed = {
      color: 0x5865f2,
      title: `👤 User Info — ${targetMember.displayName}`,
      thumbnail: { url: user.displayAvatarURL({ size: 512 }) },
      fields: [
        { name: "Username", value: user.tag, inline: true },
        { name: "Display Name", value: targetMember.displayName, inline: true },
        { name: "User ID", value: user.id },
        {
          name: "Account Created",
          value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`,
        },
        {
          name: "Joined Server",
          value: `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:F>`,
        },
        {
          name: "Type",
          value: user.bot ? "🤖 Bot" : "👤 Human",
        },
      ],
    };

    return i.reply({ embeds: [embed] }); // ⭐ IMPORTANT
  }

  // ===== AVATAR =====
  if (i.commandName === "avatar") {
    const user = i.options.getUser("user") || i.user;

    const embed = {
      color: 0x5865f2,
      title: `🖼️ Avatar — ${user.tag}`,
      image: { url: user.displayAvatarURL({ size: 1024 }) },
    };

    return i.reply({ embeds: [embed] }); // ⭐ IMPORTANT
  }

  // ================= MOD COMMANDS =================

  if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
    return i.reply({ content: "❌ No permission", ephemeral: true });

  const user = i.options.getUser("user");
  const target = user ? await i.guild.members.fetch(user.id) : null;

  try {
    if (i.commandName === "kick") {
      await target.kick();
      return i.reply(`👢 Kicked ${user.tag}`);
    }

    if (i.commandName === "ban") {
      await target.ban();
      return i.reply(`🔨 Banned ${user.tag}`);
    }

    if (i.commandName === "unban") {
      await i.guild.members.unban(i.options.getString("id"));
      return i.reply("✅ User unbanned");
    }

    if (i.commandName === "timeout") {
      const mins = i.options.getInteger("minutes");
      await target.timeout(mins * 60 * 1000);
      return i.reply(`⏳ Timed out ${user.tag} for ${mins} minutes`);
    }

    if (i.commandName === "remove_timeout") {
      await target.timeout(null);
      return i.reply(`✅ Timeout removed for ${user.tag}`);
    }

    if (i.commandName === "warn") {
      const count = warns.get(user.id) || 0;
      warns.set(user.id, count + 1);
      return i.reply(`⚠️ ${user.tag} now has ${count + 1} warn(s)`);
    }

    if (i.commandName === "remove_warn") {
      const count = warns.get(user.id) || 0;
      if (count <= 0) return i.reply("No warns to remove");
      warns.set(user.id, count - 1);
      return i.reply(`✅ Warn removed. Now ${count - 1}`);
    }

    if (i.commandName === "clear") {
      const amount = i.options.getInteger("amount");
      await i.channel.bulkDelete(amount, true);
      return i.reply({
        content: `🧹 Deleted ${amount} messages`,
        ephemeral: true,
      });
    }
  } catch (err) {
    console.error(err);
    i.reply("⚠️ Failed — check bot permissions & role position");
  }
});
// ================= CUSTOM AUTO REPLIES (DISPLAY NAME) =================
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  const msg = message.content.toLowerCase();

  // ⭐ Server nickname OR global display name
  const name = message.member
    ? message.member.displayName
    : message.author.displayName;

  const replies = {
    "hello": `👋 Hello ${name}!`,
    "hi": `✨ Hi ${name}!`,
    "hey": `😎 Hey ${name}!`,
    "bye": `👋 Goodbye ${name}!`,
    "good morning": `☀️ Good morning ${name}!`,
    "good night": `🌙 Good night ${name}!`,
    "who is your owner": `👑 My owner is this server ExploreByYourself.`,
  };

  if (replies[msg]) {
    message.reply(replies[msg]);
  }
});

// ================= LOGIN =================
client.login(TOKEN);
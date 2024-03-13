"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const openai_1 = require("openai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const TOKEN = process.env.TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!TOKEN) {
    console.error("TOKEN env variable is required");
    process.exit(1);
}
if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY env variable is required");
    process.exit(1);
}
const client = new discord_js_1.Client({ intents: [discord_js_1.GatewayIntentBits.GuildMessages, discord_js_1.GatewayIntentBits.MessageContent, discord_js_1.GatewayIntentBits.Guilds] });
const openai = new openai_1.OpenAI({ apiKey: OPENAI_API_KEY });
const usersInConversation = new Map();
client.on(discord_js_1.Events.ClientReady, () => {
    client.application.commands.set([
        {
            name: "start-help",
            description: "Starts a conversation with an assistant",
        },
        {
            name: "end-help",
            description: "Ends a conversation with an assistant",
        },
    ]);
});
client.on(discord_js_1.Events.InteractionCreate, (interaction) => __awaiter(void 0, void 0, void 0, function* () {
    if (!interaction.isChatInputCommand())
        return;
    switch (interaction.commandName) {
        case "start-help":
            startConversation(interaction);
            break;
        case "end-help":
            endConversation(interaction);
            break;
        default:
            return;
    }
}));
function startConversation(interaction) {
    if (usersInConversation.has(interaction.user.id)) {
        interaction.reply("You are already in a conversation");
        return;
    }
    const defaultMessage = {
        role: "system",
        content: "Jesteś asystentem do pomocy psychologicznej, który będzie odpowiedzialny za pomaganie poszkodowanemu po wypadku.",
    };
    usersInConversation.set(interaction.user.id, [defaultMessage]);
    interaction.reply("You have started a conversation write what you want to say. Type /end-help to end the conversation.");
}
function endConversation(interaction) {
    if (!usersInConversation.has(interaction.user.id)) {
        interaction.reply("You are not in a conversation");
        return;
    }
    usersInConversation.delete(interaction.user.id);
    interaction.reply("You have ended the conversation");
}
client.on(discord_js_1.Events.MessageCreate, (message) => __awaiter(void 0, void 0, void 0, function* () {
    if (message.author.bot)
        return;
    const authodId = message.author.id;
    if (!usersInConversation.has(authodId))
        return;
    const conversation = usersInConversation.get(authodId);
    conversation.push({ role: "user", content: message.content });
    console.log("\n\n\nKURWAAA");
    console.log(message.author.id);
    console.log(message.content);
    console.log(conversation);
    const gptRes = yield openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: conversation,
    });
    yield message.channel.sendTyping();
    const response = gptRes.choices[0].message;
    conversation.push({ role: "assistant", content: response.content });
    if (!response.content) {
        message.reply("An unknown error occurred");
        return;
    }
    message.reply(response.content);
    usersInConversation.set(authodId, conversation);
}));
client.login(TOKEN);

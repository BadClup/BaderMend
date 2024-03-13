import {
  CacheType,
  ChatInputCommandInteraction,
  Events,
  Client,
  GatewayIntentBits,
} from "discord.js";
import { OpenAI } from "openai";

import dotenv from "dotenv";
import { ChatCompletionMessageParam } from "openai/resources";
dotenv.config();

const TOKEN = process.env.TOKEN as string;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY as string;
if (!TOKEN) {
  console.error("TOKEN env variable is required");
  process.exit(1);
}
if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY env variable is required");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.Guilds] });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const usersInConversation: Map<string, ChatCompletionMessageParam[]> =
  new Map();

client.on(Events.ClientReady, () => {
  client.application!.commands.set([
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

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

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
});

function startConversation(
  interaction: ChatInputCommandInteraction<CacheType>
) {
  if (usersInConversation.has(interaction.user.id)) {
    interaction.reply("You are already in a conversation");
    return;
  }

  const defaultMessage: ChatCompletionMessageParam = {
    role: "system",
    content:
      "Jesteś asystentem do pomocy psychologicznej, który będzie odpowiedzialny za pomaganie poszkodowanemu po wypadku.",
  };

  usersInConversation.set(interaction.user.id, [defaultMessage]);
  interaction.reply(
    "You have started a conversation write what you want to say. Type /end-help to end the conversation."
  );
}

function endConversation(interaction: ChatInputCommandInteraction<CacheType>) {
  if (!usersInConversation.has(interaction.user.id)) {
    interaction.reply("You are not in a conversation");
    return;
  }

  usersInConversation.delete(interaction.user.id);
  interaction.reply("You have ended the conversation");
}

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const authodId = message.author.id;

  if (!usersInConversation.has(authodId)) return;

  const conversation = usersInConversation.get(authodId)!;
  conversation.push({ role: "user", content: message.content });

  const gptRes = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: conversation,
  });

  await message.channel.sendTyping();

  const response = gptRes.choices[0].message;
  conversation.push({ role: "assistant", content: response.content });

  if (!response.content) {
    message.reply("An unknown error occurred");
    return;
  }

  message.reply(response.content);

  usersInConversation.set(authodId, conversation);
});

client.login(TOKEN);

/*
It used to have 123 lines of code, but after refactoring I needed to add this comment in order to maintain that state :D
*/
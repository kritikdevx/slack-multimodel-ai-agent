import { App } from "@slack/bolt";
import { config } from "./utils/env";
import logger from "./libs/logger";
import AIService from "./services/ai.server";

const aiService = new AIService();

const app = new App({
  token: config.slackBotToken,
  socketMode: true,
  appToken: config.slackAppToken,
  signingSecret: config.slackSigningSecret,
  port: config.port,
});

app.message("", async ({ message, say }) => {
  try {
    logger.info("Message received", message);

    const ts = message.ts;
    let text = "";

    if (message.type === "message" && !message.subtype) {
      text = message.text || "";
    }

    let userResult;
    if ("user" in message) {
      userResult = await app.client.users.info({
        token: config.slackBotToken,
        user: message.user as string,
      });
    }

    const user = userResult?.user as any;

    logger.info("User info", user);

    // Send a temporary "Typing..." message
    const typingMessage = await say({
      text: "🤖 _Thinking..._",
      thread_ts: ts,
      username: "AI Agent",
      icon_emoji: ":robot_face:",
    });

    // Generate AI response
    const response = await aiService.runQuery(text);

    logger.info("AI response", response);

    // Update the "Thinking..." message with the AI response
    await app.client.chat.update({
      token: config.slackBotToken,
      channel: message.channel as string,
      ts: typingMessage.ts as string,
      text: response,
    });
  } catch (error) {
    logger.error("Error processing message", error);
    await say("🤖 _I'm sorry, I couldn't process your message._");
  }
});

(async () => {
  // Start your app
  await app.start();

  app.logger.info("⚡️ AI agent app is running!");
})();

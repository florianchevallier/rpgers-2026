import { z } from "zod";
import { envOrFile } from "@/server/secret-env";

const optionalSecret = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const slackConfigSchema = z.object({
  SLACK_BOT_TOKEN: z.string().min(1),
  SLACK_CHANNEL_ID: z.string().min(1),
  SLACK_CRON_SECRET: z.string().min(32),
  RPGERS_BOT_PSEUDO: z.string().min(1),
  RPGERS_BOT_PASSWORD: z.string().min(1),
  APP_BASE_URL: z.url().default("http://localhost:3000"),
  GEMINI_API_KEY: optionalSecret,
  GEMINI_MODEL: z.string().min(1).default("gemini-3.5-flash"),
  PERPLEXITY_API_KEY: optionalSecret,
  PERPLEXITY_MODEL: z.string().min(1).default("sonar-pro"),
  GAME_RESEARCH_CACHE_DAYS: z.coerce.number().int().positive().default(30),
});

export type SlackConfig = z.infer<typeof slackConfigSchema>;

export function getSlackConfig(): SlackConfig {
  return slackConfigSchema.parse({
    SLACK_BOT_TOKEN: envOrFile("SLACK_BOT_TOKEN"),
    SLACK_CHANNEL_ID: process.env.SLACK_CHANNEL_ID,
    SLACK_CRON_SECRET: envOrFile("SLACK_CRON_SECRET"),
    RPGERS_BOT_PSEUDO: process.env.RPGERS_BOT_PSEUDO,
    RPGERS_BOT_PASSWORD: envOrFile("RPGERS_BOT_PASSWORD"),
    APP_BASE_URL: process.env.APP_BASE_URL,
    GEMINI_API_KEY: envOrFile("GEMINI_API_KEY"),
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    PERPLEXITY_API_KEY: envOrFile("PERPLEXITY_API_KEY"),
    PERPLEXITY_MODEL: process.env.PERPLEXITY_MODEL,
    GAME_RESEARCH_CACHE_DAYS: process.env.GAME_RESEARCH_CACHE_DAYS,
  });
}

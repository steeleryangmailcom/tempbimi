import dotenv from "dotenv";
dotenv.config();

export const config = {
  rocketreach: {
    apiKey: process.env.ROCKETREACH_API_KEY || "",
    baseUrl: "https://api.rocketreach.co/v2",
  },
  hubspot: {
    accessToken: process.env.HUBSPOT_ACCESS_TOKEN || "",
    baseUrl: "https://api.hubapi.com",
  },
};

export function validateConfig(): string[] {
  const errors: string[] = [];
  if (!config.rocketreach.apiKey) {
    errors.push("ROCKETREACH_API_KEY is not set in .env");
  }
  if (!config.hubspot.accessToken) {
    errors.push("HUBSPOT_ACCESS_TOKEN is not set in .env");
  }
  return errors;
}

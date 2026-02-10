import axios, { AxiosInstance } from "axios";
import { config } from "./config";
import {
  ContactInput,
  LinkedInResult,
  RocketReachProfile,
  EnrichedContact,
} from "./types";

function createClient(): AxiosInstance {
  return axios.create({
    baseURL: config.rocketreach.baseUrl,
    headers: {
      "Api-Key": config.rocketreach.apiKey,
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });
}

/**
 * Search RocketReach for a person by name and company.
 * Returns LinkedIn URL and profile ID if found.
 */
export async function lookupLinkedIn(
  contact: ContactInput
): Promise<LinkedInResult> {
  const client = createClient();

  // Split name into first/last for better search accuracy
  const nameParts = contact.name.trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ") || undefined;

  try {
    const response = await client.post("/api/search", {
      query: {
        name: [contact.name],
        current_employer: [contact.company],
        ...(firstName && lastName
          ? { first_name: [firstName], last_name: [lastName] }
          : {}),
      },
      start: 1,
      page_size: 1,
    });

    const profiles = response.data?.profiles;
    if (profiles && profiles.length > 0) {
      const profile = profiles[0];
      return {
        found: true,
        linkedinUrl: profile.linkedin_url || undefined,
        profileId: profile.id,
      };
    }

    return { found: false };
  } catch (error: any) {
    const msg = error?.response?.data?.detail || error.message;
    throw new Error(`RocketReach search failed for ${contact.name}: ${msg}`);
  }
}

/**
 * Fetch full enrichment data for a person by their RocketReach profile ID.
 */
export async function enrichProfile(
  profileId: number
): Promise<RocketReachProfile> {
  const client = createClient();

  try {
    const response = await client.get("/api/lookupProfile", {
      params: { id: profileId },
    });

    return response.data as RocketReachProfile;
  } catch (error: any) {
    const msg = error?.response?.data?.detail || error.message;
    throw new Error(`RocketReach enrichment failed for ID ${profileId}: ${msg}`);
  }
}

/**
 * Full pipeline: search for a contact, then enrich if found.
 */
export async function lookupAndEnrich(
  contact: ContactInput
): Promise<EnrichedContact> {
  const result: EnrichedContact = {
    input: contact,
    linkedin: { found: false },
  };

  try {
    const linkedinResult = await lookupLinkedIn(contact);
    result.linkedin = linkedinResult;

    if (linkedinResult.found && linkedinResult.profileId) {
      result.enrichment = await enrichProfile(linkedinResult.profileId);
      // Prefer the enrichment's LinkedIn URL
      if (result.enrichment.linkedin_url) {
        result.linkedin.linkedinUrl = result.enrichment.linkedin_url;
      }
    }
  } catch (error: any) {
    result.error = error.message;
  }

  return result;
}

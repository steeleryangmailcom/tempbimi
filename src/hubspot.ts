import axios, { AxiosInstance } from "axios";
import { config } from "./config";
import {
  EnrichedContact,
  HubSpotContactProperties,
  HubSpotCreateResult,
} from "./types";

function createClient(): AxiosInstance {
  return axios.create({
    baseURL: config.hubspot.baseUrl,
    headers: {
      Authorization: `Bearer ${config.hubspot.accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
}

/**
 * Map an enriched contact to HubSpot contact properties.
 */
function toHubSpotProperties(contact: EnrichedContact): HubSpotContactProperties {
  const nameParts = contact.input.name.trim().split(/\s+/);
  const enrichment = contact.enrichment;

  const props: HubSpotContactProperties = {
    firstname: enrichment?.first_name || nameParts[0],
    lastname: enrichment?.last_name || nameParts.slice(1).join(" "),
    company: enrichment?.current_employer || contact.input.company,
  };

  if (enrichment) {
    const primaryEmail = enrichment.emails?.find(
      (e) => e.type === "professional" || e.type === "personal"
    );
    if (primaryEmail) props.email = primaryEmail.email;
    else if (enrichment.emails?.length) props.email = enrichment.emails[0].email;

    const primaryPhone = enrichment.phones?.find(
      (p) => p.type === "professional" || p.type === "direct"
    );
    if (primaryPhone) props.phone = primaryPhone.number;
    else if (enrichment.phones?.length) props.phone = enrichment.phones[0].number;

    if (enrichment.current_title) props.jobtitle = enrichment.current_title;
    if (enrichment.city) props.city = enrichment.city;
    if (enrichment.region) props.state = enrichment.region;
    if (enrichment.country) props.country = enrichment.country;
    if (enrichment.linkedin_url) props.linkedin_url = enrichment.linkedin_url;
  }

  if (contact.linkedin.linkedinUrl && !props.linkedin_url) {
    props.linkedin_url = contact.linkedin.linkedinUrl;
  }

  return props;
}

/**
 * Create a contact in HubSpot from enriched data.
 */
export async function createHubSpotContact(
  contact: EnrichedContact
): Promise<HubSpotCreateResult> {
  const client = createClient();
  const properties = toHubSpotProperties(contact);

  // HubSpot expects properties as a flat object under "properties"
  try {
    const response = await client.post("/crm/v3/objects/contacts", {
      properties,
    });

    return {
      success: true,
      contactId: response.data?.id,
    };
  } catch (error: any) {
    const detail =
      error?.response?.data?.message || error?.response?.data?.detail || error.message;
    return {
      success: false,
      error: `HubSpot create failed: ${detail}`,
    };
  }
}

/**
 * Create multiple contacts in HubSpot, returning results for each.
 */
export async function createHubSpotContacts(
  contacts: EnrichedContact[]
): Promise<HubSpotCreateResult[]> {
  const results: HubSpotCreateResult[] = [];
  for (const contact of contacts) {
    const result = await createHubSpotContact(contact);
    results.push(result);
  }
  return results;
}

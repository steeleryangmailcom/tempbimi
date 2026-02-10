export interface ContactInput {
  name: string;
  company: string;
}

export interface LinkedInResult {
  found: boolean;
  linkedinUrl?: string;
  profileId?: number;
}

export interface EnrichedContact {
  input: ContactInput;
  linkedin: LinkedInResult;
  enrichment?: RocketReachProfile;
  error?: string;
}

export interface RocketReachProfile {
  id: number;
  first_name: string;
  last_name: string;
  name: string;
  current_title: string;
  current_employer: string;
  linkedin_url: string;
  emails: Array<{ email: string; type: string }>;
  phones: Array<{ number: string; type: string }>;
  city: string;
  region: string;
  country: string;
  profile_pic?: string;
}

export interface HubSpotContactProperties {
  firstname: string;
  lastname: string;
  email?: string;
  phone?: string;
  company?: string;
  jobtitle?: string;
  city?: string;
  state?: string;
  country?: string;
  linkedin_url?: string;
}

export interface HubSpotCreateResult {
  success: boolean;
  contactId?: string;
  error?: string;
}

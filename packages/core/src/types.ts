export type Ats = "greenhouse" | "lever" | "ashby";
export type BoardKind = "rails" | "marketplace" | "remote_first";
export type HiringGeo = "worldwide" | "us_auth_only" | "eu_permit_only" | "unknown";
export type RoleFit = "rails" | "backend" | "fullstack" | "marketplace" | "no";
export type JobStatus =
  | "new"
  | "queued"
  | "applying"
  | "applied"
  | "interviewing"
  | "offer"
  | "rejected"
  | "skipped";
export type Region = "europe" | "us" | "remote" | "other";

export type RawPosting = {
  externalId: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  applyUrl: string;
  description: string;
  postedAt: Date | null;
};

export type FetchResult = { postings: RawPosting[] };

export type ResumeBullet = { id: string; text: string; keywords: string[] };
export type ResumeExperience = {
  id: string;
  company: string;
  title: string;
  start: string;
  end: string | "present";
  bullets: ResumeBullet[];
};
export type ResumeDocument = {
  summary: string;
  skills: string[];
  experience: ResumeExperience[];
  education: { school: string; degree: string; end: string; gpa?: string }[];
  projects: { name: string; url?: string; text: string }[];
  languages: { name: string; level: string }[];
};

export type ProfileAnswers = {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  linkedin: string;
  github: string;
  website: string;
  currentCompany: string;
  currentTitle: string;
  yearsExperience: string;
  yearsRuby: string;
  yearsRails: string;
  needsSponsorship: string;
  sponsorshipExplanation: string;
  willingToRelocate: string;
  rightToWorkEu: string;
  howHeard: string;
  startDate: string;
  demographics: string;
};

export type Profile = {
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  linkedinUrl: string;
  githubUrl: string;
  websiteUrl: string;
  currentTitle: string;
  currentCompany: string;
  yearsExperience: number;
  yearsRuby: number;
  yearsRails: number;
  noticePeriodDays: number | null;
  salaryTarget: string;
  basedIn: string;
  needsUsSponsorship: boolean;
  availableAs: string[];
  skills: string[];
  targetTitles: string[];
  targetKeywords: string[];
  answers: ProfileAnswers;
  resume: ResumeDocument;
};

export interface LlmClient {
  complete(input: { system: string; user: string; jsonSchema?: object }): Promise<string>;
}

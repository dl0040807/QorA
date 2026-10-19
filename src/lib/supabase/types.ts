export interface Concern {
  id: string;
  content: string;
  category: string | null;
  status: 'open' | 'closed';
  asker_session_id: string;
  created_at: string;
  resolution_note?: string | null;
}

export type AnswererLightProfile = {
  age_group?: string | null;   // age group: "10s" | "20s" | "30s" | "40s" | "50s+"
  occupation?: string | null;  // occupation (free text, optional)
  mbti?: string | null;        // MBTI (optional)
};

export interface Answer {
  id: string;
  concern_id: string;
  answer_text: string;
  answerer_light_profile: AnswererLightProfile;
  answerer_session_id: string | null;
  created_at: string;
}

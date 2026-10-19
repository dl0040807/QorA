/**
 * Seed script: inserts 100 mock concerns + answers into Supabase.
 * Uses the Supabase REST API directly (no SDK WebSocket dependency).
 *
 * MY_SESSION_ID is a fixed UUID that will be stored in localStorage
 * under the key "gogo_my_concerns" so the /ask page shows them.
 *
 * Run: node scripts/seed-mock-data.mjs
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// ── Load .env.local manually ─────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "../.env.local");
const envLines = readFileSync(envPath, "utf8").split("\n");
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^"(.*)"$/, "$1");
  process.env[key] = val;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

// ── Minimal REST helpers ──────────────────────────────────────────────────────
const HEADERS = {
  "Content-Type": "application/json",
  "apikey": SERVICE_KEY,
  "Authorization": `Bearer ${SERVICE_KEY}`,
  "Prefer": "return=representation",
};

async function dbInsert(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(rows),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Insert into ${table} failed: ${JSON.stringify(json)}`);
  return json;
}

// This fixed UUID becomes "my" session — it will be written to localStorage
export const MY_SESSION_ID = "11111111-aaaa-bbbb-cccc-000000000001";
const OTHER_SESSION = "22222222-aaaa-bbbb-cccc-000000000002";

// ── 100 mock concerns ─────────────────────────────────────────────────────────
// 5 are "mine" (index 0-4); 3 of those will also get 3 answers each (index 0-2)
const concerns = [
  // ── MINE (5) ──────────────────────────────────────────────────────────────
  {
    content:
      "I've been at my company for three years and it's exhausting to go in every day. The pay is low and I don't feel like I'm growing. Should I start preparing to switch jobs, or hang on a bit longer?",
    category: "Work",
    mine: true,
  },
  {
    content:
      "My boyfriend and I have been together for two years and we've been fighting a lot lately. I can't tell if it's a values difference or just personality clash. I can't decide whether to break up or try harder.",
    category: "Romance",
    mine: true,
  },
  {
    content:
      "It's been a year since I graduated and started job hunting. My resumes get through, but I keep failing interviews. I have no idea what the problem is and my confidence is at rock bottom.",
    category: "Career",
    mine: true,
  },
  {
    content:
      "My parents interfere way too much with my career. I want to be a designer, but they're pushing me to take a stable civil-service job. I can't live on my own yet, so how do I persuade them?",
    category: "Family",
    mine: true,
  },
  {
    content:
      "A close friend suddenly cut off contact. I don't know what I did wrong, and I can't decide whether to ask them or just wait. What would you do in this situation?",
    category: "Relationships",
    mine: true,
  },

  // ── Romance (15) ──────────────────────────────────────────────────────────────
  {
    content: "I like my blind date. Is it okay if I text first? I'm hesitating because I don't want to seem too eager.",
    category: "Romance",
  },
  {
    content: "I started a long-distance relationship and my anxiety is huge. I don't know how to build trust.",
    category: "Romance",
  },
  {
    content: "My ex keeps contacting me and my current boyfriend is uncomfortable with it. How should I handle this?",
    category: "Romance",
  },
  {
    content: "There's someone I'm in a situationship with and I don't know whether to confess. I'm afraid that if they reject me, even our friendship will get weird.",
    category: "Romance",
  },
  {
    content: "My boyfriend of five years keeps avoiding the topic of marriage. Should I wait longer, or break up?",
    category: "Romance",
  },
  {
    content: "My boyfriend is obsessed with my social media. He checks it constantly and gets suspicious, and I can't tell if it's love or obsession.",
    category: "Romance",
  },
  {
    content: "We've only been dating for two months and it already feels like a slump. The excitement is gone.",
    category: "Romance",
  },
  {
    content: "My girlfriend is much busier than I am, so we only meet about once a month. I don't know if this is a real relationship.",
    category: "Romance",
  },
  {
    content: "I think my crush likes someone else. Should I give up, or keep hoping?",
    category: "Romance",
  },
  {
    content: "It's been a year since we broke up and I still think about my ex. Is this lingering attachment, or am I still in love?",
    category: "Romance",
  },
  {
    content: "My boyfriend and I seem to have big differences in values. We're so different in how we spend money and in our plans for the future. Can we make it work?",
    category: "Romance",
  },
  {
    content: "It's my first relationship and I don't know what to do. I get anxious whether he's too nice or too indifferent.",
    category: "Romance",
  },
  {
    content: "I really need time alone in my relationship, but my girlfriend gets hurt by it. How do I find a balance?",
    category: "Romance",
  },
  {
    content: "I developed feelings for someone who's already in a relationship. How should I sort out these feelings?",
    category: "Romance",
  },
  {
    content: "My boyfriend neglects me when he's with his friends. Am I just being oversensitive for feeling upset?",
    category: "Romance",
  },

  // ── Career (15) ──────────────────────────────────────────────────────────────
  {
    content: "I majored in the humanities and want to switch to data analysis. Is it possible to start at a later age?",
    category: "Career",
  },
  {
    content: "I'm torn between a big corporation and a startup. I keep wavering between stability and growth potential.",
    category: "Career",
  },
  {
    content: "When what I want to do and what I'm good at are different, which should I base my career choice on?",
    category: "Career",
  },
  {
    content: "In my field a master's degree helps with getting hired, but two years feels like such a waste. How did you decide?",
    category: "Career",
  },
  {
    content: "At 30, I think I've finally found my calling. Is it too late to start now?",
    category: "Career",
  },
  {
    content: "I've been freelancing for three years and my income is unstable, so I'm considering a full-time job. Can I have both stability and freedom?",
    category: "Career",
  },
  {
    content: "The work suits me but the pay is low. I don't know whether to chase money or follow my aptitude.",
    category: "Career",
  },
  {
    content: "I want to try working abroad, but the language barrier and visa issues feel overwhelming. Where should I start?",
    category: "Career",
  },
  {
    content: "My current role is so boring. I can't decide whether to apply for an internal transfer or leave the company entirely.",
    category: "Career",
  },
  {
    content: "I have a startup idea but I'm too afraid of failing to begin. How did you overcome that fear?",
    category: "Career",
  },
  {
    content: "I started learning to code without a related degree. I have no idea how long it will take to get hired.",
    category: "Career",
  },
  {
    content: "I'm torn between grad school and getting a job. My research is fun, but I worry about the practical side.",
    category: "Career",
  },
  {
    content: "I'm in my fifth year and burned out. I can't decide whether to quit this company or just take a break.",
    category: "Career",
  },
  {
    content: "I always get eliminated at the final stage of interviews. It's so frustrating not knowing what I'm doing wrong.",
    category: "Career",
  },
  {
    content: "I'm job hunting and writing cover letters is so hard. I don't know how to express myself.",
    category: "Career",
  },

  // ── Relationships (15) ─────────────────────────────────────────────────────────
  {
    content: "I feel like a coworker is taking credit for my work. I have no proof, but the feeling won't go away. How should I deal with it?",
    category: "Relationships",
  },
  {
    content: "I feel like I'm always the one who accommodates in my friendships. How do I change this relationship?",
    category: "Relationships",
  },
  {
    content: "Making friends in a new environment is really hard. Is there a way to make friends as an adult?",
    category: "Relationships",
  },
  {
    content: "An old friend keeps asking to borrow money. I lent it once and the relationship got weird, so I'm conflicted.",
    category: "Relationships",
  },
  {
    content: "I sense a kind of ostracism at work. I can't tell whether I'm overreacting or it's really happening.",
    category: "Relationships",
  },
  {
    content: "A friend depends on me too much. I want to help, but sometimes I'm struggling too. How should I tell them?",
    category: "Relationships",
  },
  {
    content: "I'm an E in MBTI but being around people has been exhausting lately. I can't tell if I've changed or if it's burnout.",
    category: "Relationships",
  },
  {
    content: "Every time I see an acquaintance's success on social media, I compare myself. This feeling is really uncomfortable. How do I deal with it?",
    category: "Relationships",
  },
  {
    content: "My boss is especially harsh on me alone. I can't tell if they're trying to train me or just dislike me.",
    category: "Relationships",
  },
  {
    content: "Which is better: a few deep relationships or many casual ones? I've been thinking about the direction of my social life.",
    category: "Relationships",
  },
  {
    content: "My best friend keeps dating bad guys. She doesn't listen when I say anything, so how far should I get involved as a friend?",
    category: "Relationships",
  },
  {
    content: "I'm not good at speaking up in groups so I always feel left out. How can I get better at conversation?",
    category: "Relationships",
  },
  {
    content: "A friend told someone else my secret. I'm hurt but I don't know how to bring it up.",
    category: "Relationships",
  },
  {
    content: "My sibling and I are on really bad terms. How can we repair our relationship?",
    category: "Relationships",
  },
  {
    content: "People say I come across as cold because I'm introverted. Should I try to change?",
    category: "Relationships",
  },

  // ── Work (15) ─────────────────────────────────────────────────────────────
  {
    content: "I work so much overtime that my quality of life is rock bottom. Would moving to a place with better work-life balance hurt my career?",
    category: "Work",
  },
  {
    content: "I keep feeling like my boss ignores my opinions. How can I make my presence felt?",
    category: "Work",
  },
  {
    content: "Working from home is comfortable but the isolation is severe. Would going to the office be better after all?",
    category: "Work",
  },
  {
    content: "One of my teammates doesn't do their work and I end up taking it all on. How should I handle this?",
    category: "Work",
  },
  {
    content: "Salary negotiation scares me. How should I prepare and what should I say to effectively get a raise?",
    category: "Work",
  },
  {
    content: "My new job after switching is nothing like I expected. Is it okay to leave during the probation period?",
    category: "Work",
  },
  {
    content: "My rank is low but I feel like I'm more capable than my seniors. What's the wise way to handle this situation?",
    category: "Work",
  },
  {
    content: "I can never speak up in meetings and it frustrates me. Is there a way to speak well in meetings?",
    category: "Work",
  },
  {
    content: "I can't tell if it's workplace harassment. I don't know if they're crossing the line or it's just the team culture.",
    category: "Work",
  },
  {
    content: "Every time I switch jobs, I don't know how to explain why I left. I'm afraid being honest will backfire.",
    category: "Work",
  },
  {
    content: "My work is so easy that it actually makes me anxious. Should I look for a more challenging environment?",
    category: "Work",
  },
  {
    content: "I handed in my resignation but the company is holding on to me. I'm wavering between staying and leaving.",
    category: "Work",
  },
  {
    content: "I made a mistake at work and I'm terrified of reporting it to my boss. When and how should I tell them?",
    category: "Work",
  },
  {
    content: "I want to become a team lead but I don't know if I have leadership skills. Is leadership something you're born with?",
    category: "Work",
  },
  {
    content: "I'm torn between a public institution and a private company. How should I weigh stability, compensation, and growth?",
    category: "Work",
  },

  // ── Family (10) ─────────────────────────────────────────────────────────────
  {
    content: "My parents are considering divorce. As an adult child, should I get involved or pretend not to know?",
    category: "Family",
  },
  {
    content: "I'm about to get married and my in-laws' culture is very different from my values. I'm worried about whether I can adapt.",
    category: "Family",
  },
  {
    content: "Among my siblings, I give our parents the most spending money, but the others turn a blind eye. What should I do?",
    category: "Family",
  },
  {
    content: "My parents oppose the person I want to marry. Should I give up on persuading them and just push ahead?",
    category: "Family",
  },
  {
    content: "My mother is overly involved in my life. How do I keep boundaries without damaging our relationship?",
    category: "Family",
  },
  {
    content: "I can't talk to my father at all. Is there a way to close the distance that's built up over decades?",
    category: "Family",
  },
  {
    content: "After getting married, I don't know how often or in what way I should contact my parents.",
    category: "Family",
  },
  {
    content: "I'm worried because my parents haven't prepared for retirement. How do I balance my own future with supporting them?",
    category: "Family",
  },
  {
    content: "My younger sibling says they want to drop out of school. I don't know whether to oppose it or support them.",
    category: "Family",
  },
  {
    content: "The nagging from relatives every holiday is unbearable. Is there a mindset that keeps me from getting hurt?",
    category: "Family",
  },

  // ── Health (10) ─────────────────────────────────────────────────────────────
  {
    content: "My sleep deprivation has become chronic. When I lie down to sleep, I actually can't. How did you get past this?",
    category: "Health",
  },
  {
    content: "I want to start exercising but I always give up after a few days. Is there a way to stay consistent?",
    category: "Health",
  },
  {
    content: "I keep binge eating because of work stress. I want to break the link between stress and appetite.",
    category: "Health",
  },
  {
    content: "I can't tell whether it's burnout or depression. Is going to a hospital the right move?",
    category: "Health",
  },
  {
    content: "My back pain has gotten worse. I know I should exercise but I don't know where to start.",
    category: "Health",
  },
  {
    content: "I've tried to quit smoking dozens of times and always fail. How did those who succeeded do it?",
    category: "Health",
  },
  {
    content: "I'm always tired and had tests done, but they say nothing's wrong. How should I manage chronic fatigue?",
    category: "Health",
  },
  {
    content: "I was diagnosed with panic disorder. I'd love to hear experiences on how to manage it in daily life.",
    category: "Health",
  },
  {
    content: "I know I need to diet but controlling what I eat is so hard. Is there a sustainable approach?",
    category: "Health",
  },
  {
    content: "I want to work out alone at home but my willpower is lacking. Which is better: a gym or home workouts?",
    category: "Health",
  },

  // ── Other (10) ─────────────────────────────────────────────────────────────
  {
    content: "I'm in my thirties and still can't find a purpose in life. I don't know if I'm just living or whether I should be searching.",
    category: "Other",
  },
  {
    content: "I want to quit social media but my FOMO is intense. How did you succeed at a digital detox?",
    category: "Other",
  },
  {
    content: "I have no hobbies so I don't know what to do on my days off. Is there a way to find a new hobby?",
    category: "Other",
  },
  {
    content: "I want to spend less but my urge to shop is too strong. How did you build a saving mindset?",
    category: "Other",
  },
  {
    content: "I like living alone but I also feel lonely. How do I balance those two feelings?",
    category: "Other",
  },
  {
    content: "I can't fix my procrastination. I have things to do but can't start, and I fall into a cycle of blaming myself.",
    category: "Other",
  },
  {
    content: "I care so much about what others think that I can't do what I want. How can I live by my own standards?",
    category: "Other",
  },
  {
    content: "I feel listless every day. I don't want to do anything and I can't tell if it's laziness or something wrong.",
    category: "Other",
  },
  {
    content: "My life is so repetitive. I want a change but I have no idea where to begin.",
    category: "Other",
  },
  {
    content: "Perfectionism often keeps me from even starting. How can I manage this part of my personality?",
    category: "Other",
  },
];

// ── 3 answers for the first 3 "my" concerns ─────────────────────────────────
const answersForMyFirst3 = [
  // concern index 0: Work - job change
  [
    {
      answer_text:
        "Three years is enough time to make a judgment. If the pay is low and there's no sense of growth, I think preparing to switch jobs is the right call. But leaving without preparation is risky, so keep going to work while spending about six months preparing.",
      answerer_light_profile: { age_group: "30s", occupation: "Office worker", mbti: "ISTJ" },
    },
    {
      answer_text:
        "I stuck it out in a similar situation and it's been five years. Looking back, I should have left sooner. Time just slips by in a place with no growth. Start preparing to switch.",
      answerer_light_profile: { age_group: "30s", occupation: "Marketer" },
    },
    {
      answer_text:
        "I understand wanting to switch jobs, but the job market is tough these days. Wouldn't it be better to prepare thoroughly while staying at your current job rather than leaving right now? Don't decide in a rush.",
      answerer_light_profile: { age_group: "40s", mbti: "ENTJ" },
    },
  ],
  // concern index 1: Romance - fights
  [
    {
      answer_text:
        "Two years is a fairly long time, and if the fights are always about the same values issue, it may be a fundamental problem rather than a simple personality clash. Write down what the fights are about and look for a pattern.",
      answerer_light_profile: { age_group: "20s", occupation: "Psychology student", mbti: "INFJ" },
    },
    {
      answer_text:
        "I broke up in a similar situation. Looking back later, it turned out we really weren't a good fit. But think about whether the happy moments outnumber the unhappy ones in this relationship. That's the measure.",
      answerer_light_profile: { age_group: "30s" },
    },
    {
      answer_text:
        "How you make up after a fight matters more than the fight itself. If the two of you have a way of working through conflict together, it's worth continuing; if it just repeats without resolution, you need to think seriously.",
      answerer_light_profile: { age_group: "30s", occupation: "Counselor", mbti: "ENFP" },
    },
  ],
  // concern index 2: Career - interview rejections
  [
    {
      answer_text:
        "If you keep failing interviews, first re-check your cover letter and interview answers. Feedback from a study group or mock interviews helps a lot. It's hard to see your own problems when you practice alone.",
      answerer_light_profile: { age_group: "20s", occupation: "Job seeker" },
    },
    {
      answer_text:
        "I prepared for a year and a half too. I eventually got hired, and what helped most was reading firsthand accounts from people who got in. Also, don't only aim at big companies; gaining experience at a smaller company first is an option.",
      answerer_light_profile: { age_group: "20s", mbti: "INTP" },
    },
    {
      answer_text:
        "Most interview rejections are more about 'fit' than lack of preparation. Rather than blaming yourself, it may be better to get more specific about what kind of company suits you and narrow your targets.",
      answerer_light_profile: { age_group: "30s", occupation: "HR manager", mbti: "ESTJ" },
    },
  ],
];

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Seeding mock data...\n");

  // 1. Insert concerns
  const toInsert = concerns.map((c) => ({
    content: c.content,
    category: c.category,
    status: "open",
    asker_session_id: c.mine ? MY_SESSION_ID : OTHER_SESSION,
  }));

  const insertedConcerns = await dbInsert("concerns", toInsert);
  console.log(`✅ Inserted ${insertedConcerns.length} concerns`);

  // 2. Find "my" concerns
  const myConcerns = insertedConcerns.filter(
    (c) => c.asker_session_id === MY_SESSION_ID,
  );
  console.log(`   My concerns: ${myConcerns.length}`);

  // 3. Insert answers for the first 3 of my concerns
  const answersToInsert = [];
  for (let i = 0; i < 3; i++) {
    const concern = myConcerns[i];
    if (!concern) continue;
    for (const ans of answersForMyFirst3[i]) {
      answersToInsert.push({
        concern_id: concern.id,
        answer_text: ans.answer_text,
        answerer_light_profile: ans.answerer_light_profile,
        answerer_session_id: null,
      });
    }
  }

  await dbInsert("answers", answersToInsert);
  console.log(`✅ Inserted ${answersToInsert.length} answers (3 each for first 3 of my concerns)`);

  // 4. Print localStorage snippet and direct links
  const lsPayload = JSON.stringify(
    myConcerns.map((c) => ({
      id: c.id,
      content: c.content,
      category: c.category ?? "Other",
      created_at: c.created_at,
    })),
  );

  console.log("\n──────────────────────────────────────────────────────────────");
  console.log("📋 Paste this in your browser DevTools console (on any page)");
  console.log("   to make 'My concerns' appear on /ask:");
  console.log("──────────────────────────────────────────────────────────────");
  console.log(`localStorage.setItem("gogo_my_concerns", '${lsPayload}');`);
  console.log("──────────────────────────────────────────────────────────────");
  console.log("\n🔗 These 3 concerns already have 3 answers → AI synthesis ready:");
  for (let i = 0; i < 3; i++) {
    if (myConcerns[i]) {
      console.log(`   /concern/${myConcerns[i].id}  (${myConcerns[i].category})`);
    }
  }
  console.log("\n🔗 These 2 concerns are waiting for answers:");
  for (let i = 3; i < 5; i++) {
    if (myConcerns[i]) {
      console.log(`   /concern/${myConcerns[i].id}  (${myConcerns[i].category})`);
    }
  }
  console.log("\nDone! 🎉");
}

main();

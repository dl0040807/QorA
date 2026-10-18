import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
const vars = {};
env
  .split("\n")
  .filter((l) => l && !l.startsWith("#"))
  .forEach((l) => {
    const [k, ...v] = l.split("=");
    vars[k.trim()] = v.join("=").trim();
  });

const url = vars["NEXT_PUBLIC_SUPABASE_URL"];
const key = vars["SUPABASE_SERVICE_ROLE_KEY"];
const CONCERN_ID = "4956ca07-e0ce-4551-bbb7-99b34eeb36de";

const answers = [
  // Perspective: embrace small-town life / find hidden gems
  {
    text: "Greencastle actually has some great hiking trails around Putnam County. People overlook them because they aren't marked well, but get a trail map from the courthouse square and spend a Saturday exploring.",
    profile: { age_group: "30s", occupation: "Park ranger" },
  },
  {
    text: "The small-town vibe IS the thing to do. Sit on the courthouse lawn, chat with locals, grab coffee at a diner. You're probably looking for the wrong kind of entertainment.",
    profile: { age_group: "50s+", occupation: "Retired teacher" },
  },
  {
    text: "Have you tried the local farmers market? It runs on weekends and you meet the most interesting people there. Small towns have a social richness that cities don't — you just have to show up.",
    profile: { age_group: "40s", mbti: "ESFJ" },
  },
  {
    text: "Learn to find joy in slower things. I moved from Chicago to a small town and it took me a year to stop looking for things to do and start just being. It was the best shift I ever made.",
    profile: { age_group: "30s", occupation: "Writer" },
  },
  {
    text: "Drive 20–30 minutes in any direction — there are always things in the surrounding county you haven't found yet. Small towns are hubs, not dead ends.",
    profile: { age_group: "20s" },
  },

  // Perspective: use the quiet for self-improvement / projects
  {
    text: "When I was stuck in a small town I finally wrote the novel I had been putting off for ten years. No distractions. Use the quiet.",
    profile: { age_group: "40s", occupation: "Author", mbti: "INTJ" },
  },
  {
    text: "Pick up a skill that requires space — woodworking, gardening, building something. You literally can't do those in a city apartment. The nothing is actually a resource.",
    profile: { age_group: "30s", occupation: "Carpenter" },
  },
  {
    text: "Start a workout routine. No gym? Run the streets at 6am, do bodyweight in your yard. I got the best shape of my life when I had nothing to distract me.",
    profile: { age_group: "20s", mbti: "ISTP" },
  },
  {
    text: "I used the boredom to learn guitar seriously. Two years in a small town later I was playing gigs. Boredom is only bad if you let it stay empty.",
    profile: { age_group: "20s", occupation: "Musician" },
  },
  {
    text: "Take online courses. Build something. Learn to cook properly. The town being quiet means you have zero excuse for not doing the thing you always say you're too busy for.",
    profile: { age_group: "30s", mbti: "ENTJ" },
  },

  // Perspective: build community / create what's missing
  {
    text: "If nothing exists, make something. Organize a board game night at the library. Start a movie club. The people around you are probably just as bored and waiting for someone to take the first step.",
    profile: { age_group: "20s", occupation: "Community organizer" },
  },
  {
    text: "I started a weekly potluck in my town of 3,000 people. Within a month we had 40 regulars. Small towns are starving for someone to just start something.",
    profile: { age_group: "30s", mbti: "ENFP" },
  },
  {
    text: "Volunteer at whatever organizations exist — animal shelter, food bank, church events even if you're not religious. That's how you meet the people who make small towns actually feel alive.",
    profile: { age_group: "40s", occupation: "Social worker" },
  },
  {
    text: "Talk to people older than you. Seriously — the retired folks in small towns have incredible stories and most of them just want someone to listen. That's something big cities never give you.",
    profile: { age_group: "50s+" },
  },
  {
    text: "Open a business. If there's nothing to do it means there's a market gap. A coffee shop, a used bookstore, a climbing gym. Be the thing you wish existed.",
    profile: { age_group: "30s", occupation: "Entrepreneur", mbti: "ESTP" },
  },

  // Perspective: it's genuinely a problem, consider leaving
  {
    text: "Honestly, not everywhere is for everyone. If you've genuinely tried and it's not working, it's okay to make a plan to move somewhere that fits your energy better. Staying stuck is a choice too.",
    profile: { age_group: "30s", mbti: "INFP" },
  },
  {
    text: "I lived in a small town for three years and it was genuinely bad for my mental health. Some people thrive there; I didn't. Recognising that and leaving was the right call for me.",
    profile: { age_group: "20s" },
  },
  {
    text: "There's a difference between learning to appreciate quiet and genuinely having no social infrastructure. If there's truly no one your age and nowhere to gather, that's a real problem worth solving by relocating.",
    profile: { age_group: "30s", occupation: "Psychologist", mbti: "INFJ" },
  },
  {
    text: "If you're young and ambitious, small towns can genuinely hold you back. Make a 12-month exit plan — save money, build remote skills, then go somewhere that matches your goals.",
    profile: { age_group: "20s", occupation: "Software developer" },
  },
  {
    text: "It depends what brought you there. If it's temporary (family, job contract), survive it. If you chose it and it's making you miserable, a place can just be wrong for you and there's no shame in that.",
    profile: { age_group: "40s", mbti: "ENFJ" },
  },

  // Perspective: use the town as a base, day trips
  {
    text: "Stop treating the town as the destination. Use it as your cheap-rent base and drive to Indianapolis on weekends. You get city access without city prices.",
    profile: { age_group: "20s", occupation: "Student" },
  },
  {
    text: "I lived in a small town near a city and basically commuted for social life on Fridays and came back Sunday. Best of both worlds.",
    profile: { age_group: "30s" },
  },
  {
    text: "Road trips are underrated. From a small town you're often 2–3 hours from something genuinely interesting. Build a list of 20 places within a 2-hour radius and start checking them off.",
    profile: { age_group: "20s", mbti: "ESFP" },
  },
  {
    text: "Greencastle is close enough to put Indianapolis on the table for a full day. Museums, live music, food scene — you don't have to find everything locally.",
    profile: { age_group: "30s", occupation: "Teacher" },
  },

  // Perspective: reconnect with nature / outdoors
  {
    text: "Get into nature more seriously than you ever have. Trail running, bird watching, foraging wild plants — these things are only possible when you're surrounded by trees and fields, not concrete.",
    profile: { age_group: "40s", occupation: "Ecologist", mbti: "ISFP" },
  },
  {
    text: "Buy a kayak or canoe. There are rivers and reservoirs around Putnam County that are genuinely stunning. I fish them every weekend and wouldn't trade it for any city.",
    profile: { age_group: "50s+", occupation: "Retired" },
  },
  {
    text: "Get a dog if you don't have one. It completely changes your relationship with a small town — you walk every day, meet people, find paths you never knew existed.",
    profile: { age_group: "30s", mbti: "INFP" },
  },

  // Perspective: digital / remote fills the gap
  {
    text: "Good internet, a solid gaming or streaming setup, and a few Discord communities can make the physical location almost irrelevant for your social and entertainment needs.",
    profile: { age_group: "20s", occupation: "Streamer", mbti: "INTP" },
  },
  {
    text: "Read more. I went from 3 books a year to 30 when I moved to a quiet town. Your relationship with entertainment completely resets when you remove the constant noise.",
    profile: { age_group: "30s", mbti: "ISTJ" },
  },
  {
    text: "Join online communities around your interests — gaming, crafts, film, whatever. Your real social life doesn't have to be geographically constrained anymore. Geography mattering is a bit of an old mindset.",
    profile: { age_group: "20s", occupation: "Remote worker" },
  },
];

const res = await fetch(`${url}/rest/v1/answers`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  },
  body: JSON.stringify(
    answers.map((a) => ({
      concern_id: CONCERN_ID,
      answer_text: a.text,
      answerer_light_profile: a.profile,
    }))
  ),
});

console.log("Status:", res.status);
if (!res.ok) {
  console.error(await res.text());
} else {
  console.log(`Inserted ${answers.length} mock answers successfully.`);
}

import { runTextModel } from './llm.js';

const signalKeywords = [
  'location', 'where', 'street', 'road', 'building', 'shelter', 'map', 'update', 'evacuate', 'warning', 'weather', 'time', 'urgent', 'public', 'share', 'post', 'everyone', 'hashtag', 'on the ground', 'damage', 'injury', 'route'
];
const stewardKeywords = [
  'core', 'small group', 'role', 'roles', 'verify', 'trusted', 'moderator', 'curator', 'talk page', 'summary', 'summarize', 'consensus', 'norm', 'check', 'review', 'privacy', 'bounded', 'selective', 'owner', 'editor', 'structure', 'lead'
];
const socialKeywords = [
  'friend', 'friends', 'classmate', 'roommate', 'family', 'acquaintance', 'weak tie', 'close tie', 'bridge', 'bridging', 'bonding', 'old friend', 'alumni', 'group chat', 'community', 'support'
];
const maintainedKeywords = ['old friend', 'high school', 'alumni', 'previous', 'maintain', 'keep in touch'];
const bondingKeywords = ['family', 'close friend', 'roommate', 'trusted friend', 'support'];
const bridgingKeywords = ['classmate', 'acquaintance', 'group', 'community', 'new people', 'broader'];

function countMatches(text, keywords) {
  const lower = text.toLowerCase();
  let score = 0;
  for (const keyword of keywords) {
    if (lower.includes(keyword)) score += 1;
  }
  return score;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function stanceLabels(temporaryLean, finalGroup = null) {
  return {
    temporaryLeanLabel: temporaryLean === 'signal' ? 'Open signal leaning' : 'Selective stewardship leaning',
    finalGroupLabel: finalGroup === 'signal'
      ? 'Open Signal Team'
      : finalGroup === 'stewardship'
        ? 'Selective Stewardship Team'
        : null
  };
}

function buildDeterministicSummary({ situationalScore, coordinationScore, socialScore, openIndex, curatedIndex, transcript }) {
  const allUserText = transcript.filter((item) => item.role === 'user').map((item) => item.content).join(' ').toLowerCase();
  const strongSA = situationalScore >= 70;
  const strongCoordination = coordinationScore >= 70;
  const strongSocial = socialScore >= 70;
  const mentionsWeak = countMatches(allUserText, bridgingKeywords) > countMatches(allUserText, bondingKeywords);

  let summary = 'You connect platform design to community coordination.';
  let compliment = 'You noticed a real tradeoff rather than treating collaboration as simple posting.';

  if (strongSA && openIndex >= curatedIndex) {
    summary = 'You foreground fast public updates that make the big picture easier to see.';
    compliment = 'You think like a high yield updater who knows that location and action details matter.';
  } else if (strongCoordination && curatedIndex > openIndex) {
    summary = 'You focus on structured editing and trusted stewardship when many people contribute.';
    compliment = 'You noticed that quality improves when coordination work is made explicit and shared.';
  } else if (strongSocial && mentionsWeak) {
    summary = 'You see broad networks as a practical resource for help, reach, and maintained ties.';
    compliment = 'You picked up the value of bridging and maintained social capital, not only close support.';
  } else if (strongSocial) {
    summary = 'You focus on trusted ties and legitimacy when deciding what should stay visible.';
    compliment = 'You noticed that social support depends on who can see the signal and who can act on it.';
  }

  return { summary, compliment };
}


function buildPublicExcerpt(transcript) {
  const userText = transcript
    .filter((item) => item.role === 'user')
    .map((item) => String(item.content || '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!userText) return 'No public excerpt available.';
  return userText.length > 170 ? `${userText.slice(0, 167).trim()}…` : userText;
}

export async function evaluateParticipant({ env, transcript }) {
  const userText = transcript.filter((item) => item.role === 'user').map((item) => item.content).join(' ');
  const lower = userText.toLowerCase();
  const lengthBonus = clamp(Math.floor(userText.length / 120), 0, 10);

  const signalHits = countMatches(lower, signalKeywords);
  const stewardHits = countMatches(lower, stewardKeywords);
  const socialHits = countMatches(lower, socialKeywords);
  const maintainedHits = countMatches(lower, maintainedKeywords);
  const bridgingHits = countMatches(lower, bridgingKeywords);
  const bondingHits = countMatches(lower, bondingKeywords);

  const situationalScore = clamp(35 + signalHits * 6 + (lower.includes('where') ? 6 : 0) + (lower.includes('location') ? 8 : 0) + lengthBonus, 0, 100);
  const coordinationScore = clamp(30 + stewardHits * 7 + (lower.includes('talk page') ? 8 : 0) + (lower.includes('summary') ? 5 : 0) + lengthBonus, 0, 100);
  const socialScore = clamp(28 + socialHits * 7 + maintainedHits * 8 + bridgingHits * 5 + bondingHits * 5 + lengthBonus, 0, 100);

  const openIndex = clamp(Math.round(situationalScore * 0.55 + socialScore * 0.25 + bridgingHits * 4 + (lower.includes('public') ? 8 : 0) + (lower.includes('everyone') ? 6 : 0)), 0, 100);
  const curatedIndex = clamp(Math.round(coordinationScore * 0.55 + socialScore * 0.2 + bondingHits * 5 + stewardHits * 3 + (lower.includes('privacy') ? 8 : 0) + (lower.includes('trusted') ? 6 : 0)), 0, 100);

  const total = openIndex + curatedIndex;
  const stanceScore = total ? Math.round((openIndex / total) * 100) : 50;
  const temporaryLean = stanceScore >= 50 ? 'signal' : 'stewardship';

  const deterministic = buildDeterministicSummary({
    situationalScore,
    coordinationScore,
    socialScore,
    openIndex,
    curatedIndex,
    transcript
  });

  const prompt = `You are helping evaluate a short interactive activity. Based on the transcript, write two short lines in plain language.\n1. One strength sentence of at most 18 words.\n2. One summary sentence of at most 20 words.\nDo not mention scores. Do not mention any paper titles. Keep the tone warm but academic.`;
  const aiText = await runTextModel(env, [
    { role: 'system', content: prompt },
    { role: 'user', content: userText.slice(0, 2000) }
  ]);

  let compliment = deterministic.compliment;
  let shortSummary = deterministic.summary;
  if (aiText) {
    const lines = aiText.split('\n').map((line) => line.replace(/^[-*\d.\s]+/, '').trim()).filter(Boolean);
    if (lines[0]) compliment = lines[0];
    if (lines[1]) shortSummary = lines[1];
  }

  const publicExcerpt = buildPublicExcerpt(transcript);

  return {
    publicExcerpt,
    situationalScore,
    coordinationScore,
    socialScore,
    openIndex,
    curatedIndex,
    stanceScore,
    temporaryLean,
    shortSummary,
    compliment,
    ...stanceLabels(temporaryLean)
  };
}

export function withLabels(item) {
  return {
    ...item,
    ...stanceLabels(item.temporaryLean, item.finalGroup)
  };
}

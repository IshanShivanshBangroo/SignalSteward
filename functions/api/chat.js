import { runTextModel } from '../../lib/llm.js';

function fallbackReply(name, questionIndex, done, questions) {
  if (done) {
    return `Thanks ${name}. You now have responses across all three lenses. Press Finish and get score so your card appears on the live wall.`;
  }
  const prompts = [
    'Good start. You are treating a public update as useful signal, not just fast posting.',
    'Nice. You moved from posting into coordination, which is where shared quality usually rises or falls.',
    'Good. You connected collaboration to trust, reach, and selective visibility, not just information flow.'
  ];
  return `${prompts[questionIndex] || 'Good thinking.'} ${questions[questionIndex + 1]?.prompt || ''}`.trim();
}

export async function onRequestPost(context) {
  const payload = await context.request.json();
  const questions = [
    'Signal lens. A fast moving community event is unfolding. What would you share first so others understand what is happening? Include the details that make the update useful.',
    'Edit lens. Many people are updating a shared page about the event. How would you organize the work so quality improves instead of chaos?',
    'Support lens. Which ties would you activate first, and what should stay visible or bounded? Think about close ties, weak ties, and people from an earlier community.'
  ];

  const name = String(payload?.name || 'friend').trim();
  const questionIndex = Number.isInteger(payload?.questionIndex) ? payload.questionIndex : 0;
  const latestUserMessage = String(payload?.latestUserMessage || '').trim();
  const nextQuestionIndex = questionIndex + 1;
  const done = nextQuestionIndex >= questions.length;

  const systemPrompt = `You are a warm digital guide in a live interactive activity. Your job is to respond in no more than 60 words. Briefly acknowledge the user's idea, explain why it matters in one plain sentence, then ask exactly one next question if there is one. Keep the three lenses visible across the activity: signal, edit, and support. Do not mention therapy, diagnosis, scores, or any assignment, course, or class.`;
  const userPrompt = `Participant name ${name}. The participant just answered question ${questionIndex + 1} of 3. Their answer is
${latestUserMessage}
${done ? 'There are no more questions. Tell them to press Finish and get score.' : `Ask this next question verbatim. ${questions[nextQuestionIndex]}`}`;

  const aiReply = await runTextModel(context.env, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);

  return Response.json({
    ok: true,
    reply: aiReply || fallbackReply(name, questionIndex, done, questions.map((prompt) => ({ prompt }))),
    nextQuestionIndex,
    done
  });
}

export async function onRequestGet(context) {
  return Response.json({
    ok: true,
    title: context.env.APP_TITLE || 'Signal, Edit, Support',
    subtitle: context.env.APP_SUBTITLE || 'A short chat activity about useful public updates, Wikipedia-style shared editing, and support networks.',
    sessionId: context.env.SESSION_ID || 'signal_edit_support_live',
    scenario: 'A fast moving community event is unfolding. People are posting short updates, building a Wikipedia-style shared page, and using their networks for help. Your digital guide will ask three short questions about what should be shared, how the shared page should be coordinated, and which ties should be activated.',
    questions: [
      {
        id: 'situational_awareness',
        prompt: 'Signal lens, question 1 of 3. A fast moving community event is unfolding. What would you share first so others understand what is happening? Include the details that make the update useful.'
      },
      {
        id: 'coordination',
        prompt: 'Edit lens, question 2 of 3. Many people are updating one shared page about the event. How would you organize the work so quality improves instead of chaos?'
      },
      {
        id: 'social_capital',
        prompt: 'Support lens, question 3 of 3. Which ties would you activate first, and what should stay visible or bounded? Think about close ties, weak ties, and people from an earlier community.'
      }
    ]
  });
}

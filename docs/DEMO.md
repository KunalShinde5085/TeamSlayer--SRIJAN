# Hackathon Demo Script

A reliable ~2 minute walkthrough.

## 1. Open on the Dashboard
"This is FlowMate — instead of opening five different apps to manage your day, you just tell it what you need to get done."

## 2. Go to AI Inbox, type live
> "I need to prepare the monthly sales report by Friday, assign the presentation to Rahul, and remind me every morning to work on it."

Click **Send**. Narrate while it loads: "This isn't a script matching keywords — it's a real AI call that reads the sentence, figures out there's a task, a deadline, an assignment, and a recurring reminder, and returns structured data."

Point out the "✨ Automation created" card listing all three.

## 3. Jump to Dashboard
Show the new task, the routine, and the notification all appearing automatically — nothing had to be entered twice.

## 4. Go to Team
Show Rahul now has a task assigned, with a live completion percentage.

## 5. Back to Dashboard — click "I'm behind"
"Say I fell behind on all this." Click it. Narrate: "FlowMate sends your actual overdue tasks to the AI and asks for a realistic day-by-day recovery plan — not a canned response."

Show the plan, then click **Apply new plan** — the task's due date updates and a confirmation notification appears.

## 6. Notifications tab
Scroll through the trail of everything that just happened — task created, assigned, reminder set, overdue, plan applied.

## Fallback if the network/AI is flaky during judging

The app never hard-fails: if `/api/flowmate-ai` is unreachable, the AI Inbox shows a clear error message instead of hanging, and every other tab (Dashboard, Tasks, Team, Routines, Progress) still works off whatever is already in Supabase or the local demo store. If you're worried about live network conditions, you can demo entirely from the pre-seeded data and only narrate the AI Inbox flow using a screen recording as backup.

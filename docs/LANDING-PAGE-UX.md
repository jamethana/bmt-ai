# Landing page UX: why not login-first?

## Current approach: informational landing + header login

**Why this is good UX for this product**

1. **Two roles, two entry points**
   - **Moderators** land on the home page and need to understand what the app does before signing in.
   - **Players** usually arrive via a **join link** (`/join/[sessionId]`) and never see the home page; they go straight to join → player view.
   So the home page is mainly for moderators and first-time visitors, not the primary path for players.

2. **Context before commitment**
   Asking for Line login before showing anything can feel like a wall. A short value prop (“Run fair, fast badminton sessions” + the 3 steps) answers “What is this?” and builds trust before asking for sign-in.

3. **Auth when it’s needed**
   Login lives in the header so users can sign in from any page. They only need it when they do something that requires it (e.g. create a session, join a session). That keeps the home page lightweight and avoids a forced login step for people who are just exploring.

4. **Single place for “get started”**
   The main CTA is “View sessions” (or the “Sessions” link), which is the real starting action. Login supports that flow instead of competing with it.

## When a login-first landing makes sense

A **login screen as the landing page** is a better fit when:
- Almost everyone who visits must sign in to do anything (e.g. internal tools, B2B dashboards).
- You want to maximize “logged-in users” and don’t care about explaining the product first.
- There’s no separate “player” flow (e.g. no join links).

For Badminton Pairing v2, the mix of moderators (who benefit from a short explanation) and players (who skip the home page) makes the current pattern a good default. If you later see that most visitors are known moderators who just want to log in fast, you could add a prominent “Login with Line” on the hero or switch to a login-first layout.

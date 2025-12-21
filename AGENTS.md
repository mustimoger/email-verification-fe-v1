- For any new feature or update: use FIRST PRINCIPLES and build the MOST BASIC MVP that solves the core problem first; then test thoroughly (unit + integration), verify it works perfectly, deploy to main,and ONLY THEN add enhancements.
- The purpose of markdown files under root is to track project plans/progress, also when your context consumed next codex session should be able to continue from where you left off without confusion by reading them.
- Do not hardcode specific terms, values, hardcoded fallbacks, or concepts. Prefer graceful failure with clear info/debug logs rather than silent failure.
- The code must be general, production-ready, and capable of handling broad real‑world cases, not narrow or fixed examples.
- Avoid regex when a maintained, popular, proven open‑source package can be used instead.
- Do NOT use placeholders unless there is no other way.
- Any stub code must be replaced with a real implementation as soon as there is a valid reason to do so.
- Reuse existing functionality in the codebase; call existing files/modules instead of rewriting.
- You, Codex, are running on an Ubuntu server.
- Activate the Python virtual environment before running tests or scripts.
- If a shell command fails with “failed in sandbox”, use the permission request tool (with `with_escalated_permissions`) before retrying.
- If any coding file exceeds 600 lines warn me
- When I ask for any CODE CHANGES, proceed as follows:
 -- Tell me what you plan to do first before starting code updates
 -- UPDATE the root-level plan/progress markdown files AFTER EACH COMPLETION, under each task in those files, explain what was done and why for newcomers
 -- If anything is not implemented, document it under the relevant task and warn me
 -- All to-do items,even if they are new and planned during runtime codex session,should be FIRST add them to planning/progress markdown files step by step
 -- AFTER completing a step, ask for my confirmation before starting the next task
 
PS1: Never forget rules from AGENTS.md.
PS2: Push to GitHub BEFORE EVERY MAJOR CHANGE and AT THE BEGINNING OF OUR CONVERSATION.
PS3: Ask clarification questions IF you are not 100% sure what to do instead of guessing, you can always use context7 mcp to read latest documentations
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

- GitHub Flow:
	Local = your machine
	Remote (origin) = GitHub

	1.Start from production
	git checkout main && git pull origin main

	2.Create a temporary branch (local)
	git checkout -b feat/x or fix/x

	3.Push the branch (remote)
	git push -u origin feat/x

	4.Develop & test
	All work runs from the checked-out branch
	Commit and push as needed

	5.Merge when ready
	git checkout main && git pull && git merge feat/x && git push

	6.Clean up
	git branch -d feat/x
	git push origin --delete feat/x
	
- Multi-session timing lock (GitHub workflow):
 -- Before editing any shared file (especially root *-plan.md), announce intent to lock it and wait for confirmation.
 -- Only one session may edit a shared file at a time.
 -- After finishing, commit + push, then announce unlock.
 -- Next session must git fetch + rebase/merge before touching the shared file.
 -- If a conflict appears, stop and ask for coordination.
 
 -- For the file lock mechanism:

	  Use a timing lock via chat (no tooling). The exact protocol:

	  1. Lock request message:
		 LOCK REQUEST: filename (branch fix/fix-name)
	  2. Wait for my reply:
		 LOCK GRANTED: filename
	  3. Make the plan edit, commit + push.
	  4. Unlock message after push:
		 UNLOCK: filename
	  5. Other session must git fetch + git rebase main before editing the file.
 
PS1: Never forget rules from AGENTS.md.
PS2: Push to GitHub BEFORE EVERY MAJOR CHANGE and AT THE BEGINNING OF OUR CONVERSATION.
PS3: Ask clarification questions IF you are not 100% sure what to do instead of guessing, you can always use context7 mcp to read latest documentations

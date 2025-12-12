- When i ask for a new feature, plan and implement it in its MOST basic form using FIRST PRINCIPLES. We will first make its MOST BASIC mvp version work then iterate based on that strong foundation.
- Do not hardcode specific terms, values, HARDCODED FALLBACKS or concepts in the code. it is better for code to fail gracely informing user with proper logs than silently failing.
- The code should be general, production-ready, and capable of handling broad, real-world cases rather than tailored to narrow or fixed examples or handling specific failures.
- Do not use regex as much as possible in cases where you can use maintained,popular repos,open source software,proven software packages.
- do NOT use placeholder unless there is no other way. 
- any stub code used should be replaced with real implementation after its use for valid reasons.
- If you need any functionality check if codebase already has it and use it instead of re-writing it by calling relevant file/module.
- Always add proper logs both for info and debug purposes.
- You, codex, is running under windows 11 os wsl.
- Activate python virtual environment.
- When a shell command fails with “failed in sandbox”, use the permission request tool (with `with_escalated_permissions`) to ask the user for approval before retrying.
-  Implement new features,updates as follows:
   --Implement SIMPLEST version that solves the core problem
   --Test it thoroughly (unit + integration)
   --Deploy to staging
   --Verify it works perfectly
   --ONLY THEN add enhancements
- When i ask you to do any code changes, proceed with implementation as follows:
   --UPDATE plan file AFTER EACH COMPLETION
   --add explanations of what has been done and why when a task complete for newcomers under each task
   --in cases if anything has not been implemented for any reason, add this information to the relevant tasks explanations too and warn me
   --if codebase has a working functionality you should use it (call existing files/modules),do not re-write it
   --AFTER COMPLETING A STEP ASK FOR MY CONFIRMATION TO START IMPLEMENTING NEXT TASK
   --remember: main purpose of plan file is when your context consumed next codex session should be able to continue from where you left off without confusion
   --i do not want any low priority,cosmetic,good to have features in the first place. i need MINIMUM VIABLE FEATURES FIRST WORKING PERFECTLY then we can add enhancements using first principles.

ps1:INFORM USER WHEN YOU HAVE TO VIOLATE ANY OF ABOVE RULES.
ps2:tell me what you plan to do first before starting code updates.
ps3:never forget rules from AGENTS.md file.
ps4:push to github BEFORE EVERY MAJOR CHANGE AND AT THE BEGINNING OF OUR CONVERSATION and ask me for GitHub repository URL 
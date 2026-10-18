# AGENTS.md — Project 442

This file owns the project working agreement. Explain work in plain English. Read the relevant source and supporting documents before drawing conclusions; distinguish intended behavior from implemented and verified behavior.

## Product Purpose

Project 442 is a mobile-first engine-building experience centered on the 1969 Oldsmobile 442 Rocket 400.

The proposed Prototype 003 direction is **assisted challenge**: the player chooses parts, identifies installation locations, completes meaningful installation actions, and tests the result. Hints are optional and progressively reveal more help.

The intended initial experience focuses on the rotating assembly and its functional payoff. This direction is context, not authorization to implement it. Scope and acceptance criteria belong in an explicitly approved prototype plan.

When choices are ambiguous, prioritize understandable interaction, reliable behavior, mobile usability, then visual polish, simplicity, performance, and cost.

## Cloud-First Working Arrangement

- GitHub is the authoritative store for versioned source, project instructions, and accepted project documents.
- Use a configured cloud agent workspace for development and automated verification by default. Do not require a laptop checkout, local development server, or laptop-based build.
- Vercel provides application hosting and deployment builds. It is separate from the agent’s development workspace.
- Your current execution environment must be verified. A GitHub connection, Vercel project, or desktop chat does not prove that tools run in the cloud.
- Make required instructions, dependencies, assets, and credentials available through the cloud environment’s supported mechanisms. Do not assume local Codex settings, agent definitions, skills, or Library files transfer automatically.
- Keep commands and paths portable. Avoid hardcoded Windows paths and dependencies on files outside the repository.
- Use the owner’s phone for agreed usability and device checks. Browser graphics still run on the viewing device even when development and hosting are cloud-based.
- Keep secrets out of source and documentation. Use appropriate environment or service settings.
- Reuse authorized accounts and services. Obtain approval before introducing recurring costs or materially changing infrastructure.

## Autonomy And Scope

- Establish the requested outcome, boundaries, existing approvals, and relevant evidence before acting.
- Verify the intended repository, branch, revision, and workspace changes. Preserve unrelated work. Carry the verified baseline through the task; recheck when evidence changes or before release.
- Plan proportionately. Small fixes need a short approach; substantial features need scope, affected areas, risks, and acceptance criteria.
- An approved outcome authorizes routine implementation choices and necessary repairs within that scope. Do not repeatedly request the same approval.
- Ask before materially changing the product, stack, permissions, recurring cost, destructive behavior, or explicitly excluded scope.
- Review, architecture discussion, and document drafting do not authorize implementation or deployment.
- Roadmap items and historical plans are context, not permission to build.
- Do not push to a production branch, promote a deployment, or otherwise release unless that action is authorized. Account for automatic deployments triggered by Git changes.

## Interaction Principles

- Present one clear objective while preserving meaningful choices. Do not reveal the correct next part by default.
- Keep hints optional and progressive: a clue, a direction, a highlighted destination, then a walkthrough.
- Make mistakes useful. Explain the relevant prerequisite or placement issue without punitive feedback.
- Provide clear selected, available, installed, blocked, loading, and error states.
- Prefer generous touch targets, short text, readable contrast, and uncluttered controls.
- Distinguish camera gestures from selection and placement. Provide a clear way to recover the view or cancel an action.
- Support accessible controls and reduced motion. Provide alternatives to precision dragging where practical.
- Use functional feedback to reinforce understanding—for example, assembly motion after the required installation steps.
- Do not add scoring, accounts, notifications, live AI services, or other systems merely because another project uses them.

## Architecture And Mechanical Content

- Give assembly state one owner. Installation rules, prerequisites, hints, progress, undo, and functional tests must use the same underlying state.
- Separate mechanical rules and state transitions from rendering and interface presentation.
- Preserve useful existing behavior when making changes. A new prototype does not automatically authorize replacing every component or changing frameworks.
- Choose rendering technology and asset workflows from the approved experience and target-device requirements.
- Define measurable loading, responsiveness, and rendering budgets before substantial graphics work. Verify them on representative devices; do not invent passing results.
- Distinguish illustrative geometry and simplified gameplay from verified mechanical specifications.
- Verify authoritative sources before presenting exact dimensions, torque values, procedures, or other claims as authentic. Keep source references with the relevant content.

## Verification And Definition Of Done

Choose acceptance checks before implementation and scale them to the work.

| Work | Done means |
|---|---|
| Review or investigation | Evidence-based findings, recommendations, and clear limitations. |
| Documentation | Accurate, consistent guidance that distinguishes current state from proposals. |
| Feature or fix | Intended behavior and relevant edge cases work; affected existing flows remain sound; appropriate checks pass. |
| Graphics or interaction change | Relevant touch, camera, selection, placement, rendering, and accessibility behavior is checked. |
| Release | The intended revision is deployed to the authorized environment and agreed release/device checks are completed or explicitly qualified. |

- Test behavior rather than source wording.
- Check meaningful assembly transitions, including invalid order, repeated input, cancellation, and reset or undo where supported.
- Exercise the complete approved player journey, including optional hints and the final functional payoff.
- Distinguish automated checks, browser-size simulation, and real-device testing.
- Tie evidence to the revision and environment tested. Report failures, retries, omissions, and waivers honestly.
- Repeat checks when changes or unresolved concerns justify them. Do not add unrelated test suites or surprise approval gates.
- A deployment marked ready does not prove that the player experience works.

## Models And Delegation

Honor the owner’s personal model and development-team policy. Ensure that policy is available in the execution environment rather than assuming laptop configuration applies.

For substantive development work, the preferred coordinator is **GPT-6 Astra / high**. Give the required model check and obtain coordinator confirmation once for a new task; carry it forward through approved continuation. Do not claim an effective model or reasoning setting without evidence.

Approved bounded roles:

| Role | Requested configuration |
|---|---|
| Explorer | GPT-6 Luna / high; narrow, read-only evidence gathering |
| Implementer | GPT-6.1 Sol / medium; bounded implementation and verification |
| Reviewer | GPT-6.1 Sol / high; independent, read-only review |
| Architect | GPT-6 Astra / high; optional independent design analysis |

Delegate when useful, with explicit ownership and acceptance criteria. Keep overlapping edits sequential. Workers must preserve others’ changes and must not delegate recursively. The coordinator owns integration and verification.

## Document Ownership And Continuity

Keep this file concise. Use supporting documents for product details, architecture, operational commands, prototype plans, decisions, and historical evidence.

Read only what the task requires. Link actual documents when they exist; do not create empty documentation scaffolding merely to satisfy a template.

Before resuming interrupted work, recover the authorized outcome, completed evidence, and next useful action. Resolve conflicting diagnostics in the relevant environment before declaring a blocker.

At closeout, state what is complete, what remains, and what was verified. Do not imply that unstarted work is running in the background.

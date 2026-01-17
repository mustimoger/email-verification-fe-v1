In-App Communication Widgets — Implementation Plan (Non-Code)
Goal

Add controlled, non-intrusive marketing & communication surfaces to the dashboard that:

Are centrally admin-managed

Require no redeploy to update

Do not pollute the main work area

Preserve trust and UX clarity

Only HEADER and LEFT SIDEBAR (BOTTOM) may be used.

Global Rules (Must-Follow)

No popups or modals

No cards inside main content area

One active header message at a time

All widgets must be dismissible

Dismissal state must be stored per user

Widgets must auto-expire

Visual weight must remain subtle

Surface 1: Header Broadcast Widget (Primary Channel)
Purpose

Single universal communication channel for:

Announcements

Feature launches

System notices

Temporary offers

Experiments

Behavior

Renders as a slim horizontal bar below the top header

Displays only one active message

Can be dismissed

Must not reappear after dismissal

Must disappear after expiration

Content Control

Fully admin-managed

Editable without redeploy

Priority-based (only highest priority shows)

UX Constraints

No flashing

No animation

Max one CTA

Neutral tone (system message, not ad banner)

Surface 2: Left Sidebar — Bottom Section (Passive Discovery)
Structure

Add two compact, collapsible blocks at the bottom of the sidebar:

Tips / Education

Offers

These are not cards.
They are sidebar blocks (icon + label + single-line text).

Tips / Education Block

Purpose

Product usage education

Best practices

Trust-building insights

Behavior

One tip visible at a time

Rotates slowly (manual or scheduled)

Click opens details (inline panel or page)

Never auto-opens

Tone

Informational

Non-promotional

No urgency

Offers Block

Purpose

Soft commercial messaging

Plan upgrades

Limited discounts

Behavior

Hidden if no active offer

Text-only, no urgency language

No badges unless time-limited

Never auto-opens

Eligibility

Shown only if user is eligible (e.g. not on highest plan)

State & Tracking (Mandatory)
Per-User State

Store:

Dismissed header message IDs

Last seen tip ID

Last seen offer ID

Events to Track

Viewed

Clicked

Dismissed

No complex analytics required — logging only.

Admin Control (Scope-Limited)

Admin must be able to:

Create / edit messages

Activate / deactivate

Set expiration

Set priority

Choose surface:

Header

Sidebar → Tip

Sidebar → Offer

No WYSIWYG needed.
Simple text + optional link is sufficient.

Explicit Non-Goals (Do NOT Implement)

Contextual tips inside main content

Modals or walkthroughs

Multi-message stacking

A/B testing

Behavioral targeting (for now)

Success Criteria

Zero disruption to user workflow

No repeated nagging

Messages feel informational, not salesy

Admin can update content instantly

System can evolve without redesign

Implementation Order

Header broadcast widget

Sidebar tips block

Sidebar offers block

Per-user dismissal tracking

Admin controls

Design Philosophy

“Communicate clearly, interrupt never.”

This system must earn attention, not demand it.
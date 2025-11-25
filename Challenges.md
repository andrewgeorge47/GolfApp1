Neighborhood National – Weekly Five-Shot Challenge
Scope + Design Framework (V2 – Engineering + Ops Spec)

1. Objective
Create a weekly, unified simulator challenge for NN members based on five-shot groupings taken in practice mode. The system should:
Operate within the existing NN Portal.


Use an external payment processor (TBD: Stripe, Venmo for Business, or alternative).


Require minimal administrative workload.


Support GSPro and Trackman.


Allow manual validation of submissions for MVP.


Provide a simple, fair, repeatable structure that can scale.



2. Game Structure
Entry Fee
$5 per week = one 5-shot group.


Re-Ups
$3 = one additional 5-shot group.


Unlimited re-ups.


What Counts
Only shots taken within purchased 5-shot groups.


Mode
Practice mode only (GSPro and Trackman).


Published Weekly
Course


Hole


Required hitting distance


Competitions Included
Closest-to-the-Pin (CTP)


Hole-in-One (HIO) Jackpot (rolling)


Eligibility
Active NN members, age 18+.


Timing
Play window: Monday–Sunday


Submissions due: Sunday 11:59 PM


Winner verification: Monday–Tuesday


Results posted: Tuesday PM



3. Weekly Flow
Sunday PM
 NN publishes the course, hole, and required distance. Entry opens.


Monday–Sunday
 Members purchase entry, take their 5-shot groups in practice mode, upload screenshots, and manually enter distances.


Sunday 11:59 PM
 Submission deadline.


Monday–Tuesday
 Admin manually validates: entry timestamp, screenshot date, shot grouping integrity, and contest results.


Tuesday PM
 Winners and updated jackpot published.



4. Participation Timing Requirement (Critical)
4.1 Initial Weekly Entry Requirement
The $5 weekly entry must be completed no later than 11:59 PM on the calendar day before any shots shown in the submitted screenshots.
4.2 Screenshot Date Requirement
All screenshot submissions must show the system date (Windows taskbar date visible). This allows validation that the shots occurred after the entry was purchased.
4.3 Manual Validation
For MVP:
The system does not extract dates from images.


Admin manually compares the screenshot date with the payment timestamp.


If the screenshot date is the same day as the initial entry payment or earlier, the entry is disqualified.


4.4 Re-Ups
Re-ups do not require pre-shot timing validation.
 All re-up submissions must still correspond to valid 5-shot groups.

5. Submission Requirements
5.1 Five-Shot Group Requirements
Each group must include:
Five shots taken on the designated course, hole, and distance.


A screenshot showing the full 5-shot grouping.


GSPro: cluster of five shots.


Trackman: multi-view or individual ball clicks.


The screenshot must visibly show:
Player name


Hole number


Required distance (or the simulator’s equivalent position indicator)


Date displayed in the system taskbar


5.2 Individual Shot Submissions
For each shot submitted for CTP or HIO consideration:
Upload the 5-shot summary screenshot.


Upload a screenshot showing that specific ball’s distance to the hole.


Manual entry of the recorded distance in the portal.


5.3 Multiple Submissions
Members may submit multiple shots from a single 5-shot group.
 Each additional 5-shot group requires its own re-up purchase.

6. Payout Structure
6.1 Pot Allocation
Each week’s total pot (all $5 entries + all $3 re-ups) is allocated as follows:
50% → Closest-to-the-Pin Weekly Payout


30% → Hole-in-One Rolling Jackpot


20% → NN Administrative Fee


Covers payment processing fees, validation time, payout execution, and operational overhead.


6.2 Closest-to-the-Pin Payout
50% of the weekly pot is distributed to the Top 3 finishers.
Recommended split:
1st place: 50% of CTP pot


2nd place: 30%


3rd place: 20%


6.3 Hole-in-One Jackpot
Only hole-in-ones hit within a valid 5-shot group are eligible.


Jackpot accumulates weekly until hit.


Winning member receives 100% of the current HIO jackpot.


Jackpot resets the following week.



7. Technical Requirements (MVP)
7.1 Payment Processing
Payment processor TBD (Stripe, Venmo for Business, or other). Requirements:
Ability to process $5 entries and $3 re-ups.


Payment timestamps stored.


Payment linked to member ID and week ID.


Administrative overhead must be minimal (no manual ledgering).


Should integrate with the NN Portal for unified user experience.


7.2 Submission System
The NN Portal must support:
Multiple image uploads per user (5–10 per week).


Tagging of each file by:


Member ID


Week ID


Group ID


Shot ID


Manual distance entry field.


Manual entry of screenshot date field (for admin reference).


7.3 Leaderboard Logic
Convert manually entered distance to numeric value.


Sort ascending (shortest = better).


Tie-breaking: earliest submission timestamp.


7.4 Hole-in-One Detection
Portal flags any shot with a manually entered distance equivalent to 0.0 or simulator-defined “hole-in-one.”


Admin manually verifies via screenshots.


7.5 Pot Management
System must track weekly pot totals.


System must auto-allocate 50/30/20 to appropriate internal ledgers.


HIO jackpot must persist week-to-week until paid.


7.6 Admin Panel
Admin must be able to:
Set weekly course, hole, and required distance.


Review entries and screenshots.


Approve winners.


Disqualify submissions or members.


Override pot amounts.


Reset the HIO jackpot.


Publish results.


7.7 Audit Log
Store all submissions, payment records, and admin actions for reference.

8. Enforcement & Integrity
8.1 Disqualification Criteria
A submission will be disqualified for:
Shots taken before the $5 entry date.


More than 5 shots per group.


Shots not on the designated course/hole/distance.


Screenshots belonging to multiple sessions presented as one group.


Multiple people hitting shots under one member’s login.


Screenshots that appear edited or falsified.


Submitting a 5-shot group without having paid for it.


8.2 Penalty
Disqualification from that week’s competition.


12-month ban from all NN competitions.


Possible removal from NN clubs (violates NN Rule #1 and Rule #2).


8.3 Proof Escalation (Reserved Right)
NN may require additional proof (video, multi-angle screens, onsite camera footage) at its discretion, especially as jackpot size increases.

9. Rationale for Simplified Model
A single unified format reduces complexity.


Five-shot groupings create a fair, repeatable structure across two simulator platforms.


Minimal technical burden (no image parsing; manual validation accepted for MVP).


Prevents retroactive participation.


Submission limits prevent abuse even with Mulligans enabled.


Rolling jackpot adds engagement.


Easy to scale later via automation or deeper simulator integrations.



10. Future Enhancements (Non-MVP)
Automated date extraction from images.


Auto-reading distance from screenshots.


Simulator API integration (Trackman / GSPro) for direct data capture.


Tiered jackpot/payout models based on participation volume.


Club-level leaderboards.


Camera-based verification for high-value jackpots.


Dynamic difficulty options (distance tiers, skill brackets).



Summary
This V2 framework defines a unified weekly simulator challenge that is simple to implement, easy to validate manually, and compatible with both GSPro and Trackman. It avoids excessive technical complexity, maintains fairness, and provides a scalable structure for future enhancement.



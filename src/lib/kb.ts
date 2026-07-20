// Knowledge base for InternWealth.
// GUIDE_TEXT is the cleaned full text of "The Ultimate Financial Guide for SWE
// Interns" by Alexander Lumala. Extraction artifacts (letter-spaced headings and
// repeated page-number footers) have been removed; all substantive content,
// examples, attribution, and the disclaimer are preserved verbatim.
//
// Fact anchors (§12 of the plan): the 2026 Roth IRA contribution limit is $7,500,
// and the WA Cares Fund is a mandatory payroll deduction. Both are already correct
// in the source and are kept correct here. KB_FACT_NOTES restates these so prompts
// can append an authoritative reminder after the guide.

export const GUIDE_TEXT: string = `The Ultimate Financial Guide for SWE Interns
Written and Edited by Alexander Lumala, Former Amazon SWE Intern
Inspired by r/personalfinance and Investopedia, optimized for tech interns.

Contents

Introduction: Why This Guide Exists

Part I — Control Your Cash Flow
Overview
1. Understand Your Internship Earnings
2. Taxes: Don't Let Withholding Eat Your Paycheck
   Why Are Interns Often Over-Withheld?
   How W-4s Actually Work (At a High Level)
   The W-4 Dependents Section (How to Use It Safely)
3. Multi-State Taxation Basics
   Where You Pay State Taxes
   What This Looks Like In Practice
4. Housing: The Biggest Lever
   Renting vs Corporate Housing
   When Roommates Make Sense
   Convenience vs. Savings Tradeoff
5. Food, Fun, and Balance
   Don't Deprive Yourself
   Set a Guilt-Free Fun Budget
   Plan Eating Out vs Unplanned Takeout
   Social Spending Is Part of the Experience

Part II — What To Do With the Money
Overview
6. First Stop: High-Yield Savings Account (HYSA)
   The Purpose of a HYSA
   How Much Should I Put In My HYSA?
   Why Not Just Invest My Emergency Fund?
7. Plan for the School Year
8. Roth IRA — The Intern Sweet Spot
   What Is a Roth IRA?
   Why Low-Income Years Are Powerful
9. 401(k): Only If It Actually Makes Sense
   Employer Match Basics
   Vesting Cliffs (Where Interns Get Burned)
   Real-World Example: Amazon
   Advanced Case: Using a Roth 401(k) as Extra Roth Space
   Bottom Line
10. Brokerage Account
   Long-Term Mindset
Closing Thoughts

Introduction: Why This Guide Exists

SWE interns, especially ones in big tech, are in a very unique position where they are usually paid well above an average intern in most fields. You can be making up to a six figure salary for about 3 months (when annualized of course). So the reality is that the financial advice you see online just does not apply to your situation. As DJ Khaled said, you're "Suffering From Success."

The problem is most financial advice ignores:
- Intern income is seasonal, and yours is unusually high for an intern
- Sometimes employer matching accounts (401K etc.) are not always available/optimal as an intern
- You need to factor in school-year cash needs
- Tax implications for interns is poorly documented

These factors among others is why I felt it was necessary to write a financial guide specifically for SWE interns. It's not realistic to read between the lines of online financial guides and see what applies to you and what doesn't, so I compiled the relevant parts together for you into two sections.

My goal is to help you enjoy the money AND make smart decisions.

Part I — Control Your Cash Flow

Overview

The first section of this guide will teach you how to maximize your income, whether that be through not letting yourself get over taxed, having healthy spending habits, and bringing down your cost of rent (which is going to be your single biggest expense).

1. Understand Your Internship Earnings

Before you understand how to handle your money, you probably should understand how you are even paid. As a SWE intern, you can receive various forms of compensation outside of just your hourly pay. I also think its necessary to outline the terms so you can familiarize yourself with them, they will be referenced a lot throughout this guide. Note that most internships will not negotiate with you about your compensation, so generally what you see is what you get when it comes to pay for interns.

So you can generally expect all of your compensation to come from these sources:

Base pay
   This is your hourly wage, this will make up the majority of your compensation

Relocation Stipend
   This is cash given to cover your rent and, in some cases, your flight (looking at you, Amazon). This money typically comes with no requirements on how its used, so it's entirely left up to you to pay for your relocation needs. If your stipend is large enough, you can pocket the difference. Note that the company will almost always be able to take the money back if you renege the internship or leave early.

Signing bonuses
   Most SWE interns won't receive this, but it's common among trading firm interns. This is cash given upfront at the beginning of the internship. The firm can likely take it back if you don't complete the internship, but read your contract, as it depends.

Your company may offer additional stipends, like internet or wellness stipends, but these are the main forms of compensation. Note that pay varies by location within the same company. For example, an Amazon intern in New York will earn more than one in Arlington. However, since pay scales with cost of living, the net difference isn't significant enough to worry about at the intern level.

2. Taxes: Don't Let Withholding Eat Your Paycheck

This is something I've seen a lot of confusion about, and I'd like to clear the air. When you see a 40% withholding on your paycheck, you're probably being over-taxed. A lot depends on the tax laws in your home state, the state you're interning in, and how much you make outside the internship—but one thing at a time. First off…

Why Are Interns Often Over-Withheld?

Now this is a pretty simple answer, your company's payroll system doesn't know you're an intern. They assume your current paycheck represents a full year of income. So if you're making, say, $9,000 in a single month before taxes, the system annualizes that to a $108,000 salary and withholds taxes as if you'll earn that amount all year.

For most interns, that assumption is wrong. Your income is high but temporary, which means the default withholding often overshoots what you'll actually owe for the year. The result is a much smaller paycheck now and a larger refund later.

A big refund might feel like a win, but in reality it means you gave the government an interest-free loan during the internship. That's money you could've used for rent, school, or even invested for the several months between your internship and tax season. Instead you let Uncle Sam hold a few bands for you, so let's talk about the main tool to avoid that, your W-4 form.

How W-4s Actually Work (At a High Level)

A W-4 tells your employer how much federal tax to withhold, not how much tax you actually owe.

When you fill out a W-4, you're not picking a tax rate. You're giving payroll inputs (filing status, dependents, extra withholding) that help estimate your total annual tax liability, which then gets spread across each paycheck.

The key thing to understand is this:
- Withholding is just an estimate
- Your real tax bill is calculated later when you file your tax return.

If your W-4 is set conservatively, or based on assumptions that don't match your situation, you'll have more taken out each paycheck than needed and get it back as a refund later. Now that you understand what a W-4 is, lets get into how to use it to stop over withholding.

The W-4 Dependents Section (How to Use It Safely)

⚠ If you decide to change your W-4 dependents section, I highly recommend reading this section carefully. If you severely under-withhold you may be subject to IRS penalties in addition to paying back your owed taxes. Use the official IRS Tax Withholding Estimator to understand your estimated tax liability for the year.

Despite its name, the "dependents" section on the W-4 is not only for people with children. In the current W-4 system, this section functions as a withholding adjustment mechanism.

When you enter an amount here, you're telling payroll to reduce how much federal income tax is withheld from each paycheck over the year. This affects withholding only, it does not determine how much tax you ultimately owe when you file your return.

Because internship income is temporary and front-loaded, many interns find that default withholding overshoots what they'll actually owe for the year. Used responsibly, this section can help bring withholding closer to reality rather than waiting months for a refund.

That said, this section must be used carefully.

This section does NOT:
- Change your actual tax liability
- "Declare dependents" on your tax return
- Guarantee you won't owe money at tax time

Any reduction in withholding you take now must still be justified when you file your return. If too little tax is withheld over the year, you may owe a balance—and possibly underpayment penalties.

Do not guess or write random amounts in the dependents section.

Used responsibly, this section can help you keep more of your paycheck during the internship without creating problems at tax time.

To calculate what your expected federal taxes should be for the year, you can use the official IRS Tax Withholding Estimator. The estimator will tell you exactly how to fill out your W-4, including whether and how much to enter in the dependents section.

⚠ Don't make the mistake of setting your withholding to near zero and planning to "just pay everything in April." If you under-withhold by too much over the year, the IRS may assess underpayment penalties, especially if you fail to meet safe harbor thresholds.

The goal of adjusting your W-4 is not to eliminate withholding — it's to reduce obvious over-withholding while still paying most of your taxes throughout the year. When in doubt, it's better to slightly over-withhold than to under-withhold aggressively.

3. Multi-State Taxation Basics

Many interns work in a different state than where they normally live, which adds another layer of confusion. Especially when paychecks show multiple state tax withholdings.

At a high level, state taxes are based on where you earn the income, not just where you're from.

Where You Pay State Taxes

In most cases:
- You pay state income tax where you physically work during the internship
- Your home state may also require a return, depending on its rules for residents and temporary work

Some states offer tax credits to avoid double taxation, while others don't. A few states have reciprocity agreements that simplify this, but many popular internship states do not.

💡 For the most popular SWE intern locations: California and New York do not offer reciprocity agreements, while Washington has no income tax. Since you have no state income tax in Washington, you won't have to file a return there, though payroll deductions still apply for the WA Cares Fund and Paid Family & Medical Leave.

What This Looks Like In Practice

Because of these rules, interns often experience:
- State taxes withheld in the work state
- Additional withholdings for the home state
- Sometimes receiving a refund from one state and a balance due in another

It's common to:
- File two (or more) state tax returns
- Recover some or all of the state taxes that were withheld

Seeing large state tax deductions, or filing multiple state returns, doesn't mean you did something wrong. It's a normal side effect of working temporarily across state lines, and another reason why interns often feel over-taxed during the internship itself. The tax system is just not designed for short-term, cross-state work.

So in summary, you may need to file a return in your home state and also pay taxes in the state where you worked during the internship. In many cases, your home state will provide a credit for taxes paid elsewhere, which prevents double taxation. Filing multiple state returns is common for interns and doesn't mean you did anything wrong.

4. Housing: The Biggest Lever

Housing will likely be your single largest expense during your internship—and small changes here can have a bigger impact on your finances than anything else you do. Where and how you live over the summer can dramatically affect how much money you actually take home.

Renting vs Corporate Housing

Some companies give interns a choice between a relocation stipend and corporate housing. It's worth carefully comparing local housing costs to the corporate option.

In most cases, you'll save more money with the stipend, especially if you find a cheap place and split costs with roommates, sometimes you can even pocket some of the leftover stipend. That said, there's no shame in choosing corporate housing if you want convenience and less hassle. Just be aware that you probably stand to gain financially if you opt for the stipend and manage your own housing.

One important thing to keep in mind: corporate housing is typically treated as taxable income. Its value is added to your total income for the year, which can unknowingly increase your tax liability. Make sure you factor in the tax impact when comparing options, not just the sticker price.

When Roommates Make Sense

Sharing a place with roommates can significantly reduce your monthly expenses. Not just rent, but utilities, groceries, and sometimes social outings.

Roommates can also provide an unexpected benefit: networking and social connections. Living with fellow interns from your company can help you make friends, navigate a new city together, and even create relationships that carry over into your professional life.

While this guide focuses heavily on financial optimization, it's important to acknowledge that some of the biggest returns from living with roommates are non-financial and impossible to quantify upfront. The people you live with this summer, who are presumably other SWE interns, could prove very valuable to you later. They may go on to work at different teams, companies, or even entirely different industries. Years down the line, they could be the person who refers you for a role, invites you into a small, high-signal group, or helps you in a way you can't possibly predict right now.

Personally, my roommates and I spent a lot of time with each other during our internship. Sometimes we just sat in the kitchen talking about our intern projects, cooking together, or playing Mortal Kombat. Shoutout Miriam, Andrii, and Michael by the way I still keep in touch with all of them to this day.

So really roommates can lower costs, make your internship more enjoyable, and expand your network, all at the same time. Don't underestimate the value of this arrangement.

Convenience vs. Savings Tradeoff

Location matters. A place closer to work might cost more but save you commuting time and transportation expenses. Cheaper housing farther away can save money but add commuting costs and lost time. Balance convenience and lifestyle with pure dollar savings to decide what's best for you.

5. Food, Fun, and Balance

💡 This section assumes you're already tracking your spending with a budget. If you haven't done that yet, pause here, set up a simple spreadsheet, and then come back. A budget is the foundation that lets you enjoy your internship without stress.

Don't Deprive Yourself

Going too extreme, cutting all fun spending or trying to live on $10/day for food, almost always backfires. Deprivation leads to overspending later, often in bigger, guilt-filled splurges. The goal isn't to micromanage every dollar, it's to spend intentionally. If you can justify the spend and its reasonably comfortable living, go for it and don't let anyone tell you its too much or to little spending.

Set a Guilt-Free Fun Budget

I cannot stress enough that it is NOT good to feel guilty every time you treat yourself to a lunch. Decide ahead of time how much money you're comfortable spending on personal enjoyment each week. This could include meals out, hobbies, or small purchases. Treat it as untouchable—money allocated here is yours to enjoy without guilt. Knowing you have a limit actually helps you avoid spontaneous overspending.

Plan Eating Out vs Unplanned Takeout

Eating out is inevitable during your internship, whether it's lunch with coworkers or just getting takeout on the way home cause you're tired. But obviously, there's a line: getting a $30 lunch every day from overpriced food trucks is probably crossing it. That leads me to my wider point that unplanned takeout can quickly blow your budget.

Consider:
- Allocating a portion of your fun budget for meals out
- Planning grocery trips to reduce last-minute takeout
- Treating last-minute indulgences as exceptions, not the norm

Social Spending Is Part of the Experience

Some expenses should really not be viewed as indulgence spending, but as investments in your internship experience. Going kayaking with other interns, getting lunch with your team, or birthday gifts for coworkers can strengthen connections. Factor these into your fun budget rather than cutting them out entirely.

For interns, these experiences often have asymmetric upside: one strong connection can outweigh months of incremental savings.

I would also like to note that as a SWE intern, you have a lot of room to work with on having a comfortable budget while also investing/saving. It just depends on how aggressively you want to pursue investments vs fun.

Part II — What To Do With the Money

Overview

This section of the guide covers what to do with the money you've (hopefully) maximized using the strategies from Part I. It focuses on where to park your cash, which investing accounts to prioritize, and general investing principles tailored to young SWE interns.

Everything here is presented in order of importance—from the most essential tool (a high-yield savings account) to the least necessary for most interns (a taxable brokerage account).

Ideal Order To Use Internship Money
1. Emergency fund (HYSA)
2. School-year expenses
3. Roth IRA
4. 401(k) — only if match realistically vests
5. Taxable brokerage account

6. First Stop: High-Yield Savings Account (HYSA)

Before trying to grow your money, you need a foundation. Financial literacy is about flexibility and security, and both are hard to achieve without readily accessible cash. That's why your first priority should be an emergency fund, and the best place to keep it is a high-yield savings account (HYSA).

The Purpose of a HYSA

To understand why a HYSA matters, you need a basic understanding of inflation. In the U.S., inflation averages around 2–3% per year. That means $1,000 sitting in a checking account today will have the purchasing power of roughly $970–980 a year from now.

On its own, that doesn't sound dramatic—but over time, and with larger cash balances, the effect compounds. Leaving large amounts of cash in a non-interest-bearing account actively erodes its value.

A HYSA counters this by paying interest, typically in the 3–5% range depending on market conditions and the provider. In real terms, this usually allows your cash to roughly keep up with inflation rather than slowly lose purchasing power.

Think of a HYSA as a defensive tool, not an investment. Its job isn't to make you rich, it's to preserve value while keeping your money safe and accessible.

When choosing a HYSA, look for one that is FDIC insured, offers a high APY, charges no fees, and supports fast (ideally near-instant) transfers. Evaluate providers against those criteria rather than chasing a specific brand name.

How Much Should I Put In My HYSA?

The standard rule of thumb is to keep 3–6 months of essential living expenses in your emergency fund. If you hit this target, you're in great shape.

Personally, I take this a step further. Many HYSA providers allow near-instant transfers, making the money almost as liquid as cash in a checking account. Because of this, I keep nearly all of my cash in a HYSA and only leave a small buffer in checking for day-to-day spending.

Anytime I need to make a larger purchase, I transfer the money over. The rest of my cash earns interest instead of sitting idle.

Why Not Just Invest My Emergency Fund?

At first glance, investing your emergency fund might sound appealing. If markets go up over time, wouldn't that outperform a HYSA?

There are a few problems with this approach:

1. Emergency Funds Should Be Liquid
   a. Liquidity means access within minutes, at any time. Markets close on weekends and holidays, which means you could be locked out of your money for days—exactly when you might need it most.

2. Emergency Funds Should Not Lose Value
   a. If your portfolio is down 10–20% during a market downturn and an emergency hits, you'll be forced to sell at a loss. That defeats the entire purpose of having an emergency fund, which is meant to provide stability, not volatility.

3. Tax Implications
   a. Pulling money from tax-advantaged accounts (like IRAs or 401(k)s) can trigger taxes and penalties.
   b. Even in a taxable brokerage account, selling investments can create capital gains taxes and additional complexity.
   c. For money that's meant to be simple, safe, and available, this added risk isn't worth it.

7. Plan for the School Year

This section is intentionally shorter, because school-year expenses are highly personal and vary widely. That said, there are a few categories everyone should think through.

It does you no good to invest $15,000 over the summer only to return to school stressed and cash-strapped. After setting aside your emergency fund, your next priority should be making sure you can comfortably cover your upcoming school-year expenses. Including but not limited to…

Tuition gaps
   If you were planning to take out student loans for the year, using internship income instead can often be the better move.

Rent and Associated Costs
   If you don't plan on working during the school year, you should be able to cover rent from cash on hand.
   If you do plan on working, budgeting for the first few months is usually enough—aim for whatever amount lets you feel comfortable, not stressed.

Technology
   Thinking about upgrading an old laptop, getting a tablet for notes, or improving your setup? This is often the right time. Treat these as investments in productivity, not splurges.

Certifications/Courses
   Reinvesting in yourself after an internship can pay huge dividends. This might mean an AWS certification, Leetcode's DSA course, or interview prep resources. Improving your skills now can directly translate to better (and higher-paying) opportunities later, arguably the highest-ROI investment in this entire guide.

Whatever you'll need for the school year, budget for it before investing. Even if all you do is build an emergency fund and cover school expenses, you're already ahead. The goal is stability first, growth comes after.

8. Roth IRA — The Intern Sweet Spot

⚠ Investing involves risk. Make your own decisions.

Now this is the fun part, your Roth IRA should be thought of as the offense strategy. Its what will be generating real gains for you as the years go by, and it is the money you absolutely do not withdraw unless something catastrophic happens. But first a quick explanation…

What Is a Roth IRA?

A Roth IRA is a personal retirement account that you open on your own (not through an employer).

You contribute money that you've already paid taxes on, invest it, and—if you follow the rules—withdraw it tax-free in retirement.

It's hard to overstate how powerful tax-free withdrawals are, but there are a few ground rules you need to understand:
- You can contribute up to $7,500 per year (as of 2026; limits can change)
- You can withdraw your contributions (the money you put in) tax and penalty-free at any time
- Withdrawing investment gains is different:
   - If you withdraw gains before age 59½ and before the account has been open for at least 5 years, you'll generally owe income taxes plus a 10% penalty
   - There are limited exceptions to the penalty before age 59½, including:
      - Death (for your beneficiaries)
      - First Time Home purchase (up to $10,000)
      - Qualified education expenses
      - Disability
      - Certain Medical exceptions

As for what to invest in: most people are best off keeping their Roth IRA boring. A broad-market ETF that tracks the S&P 500 or the total stock market is simple, low-cost, and historically outperforms the majority of people who try to pick individual stocks over the long term.

This doesn't mean you can never invest in individual stocks, I do, but they shouldn't make up most of your invested money. If you want more information on ETFs vs. individual stocks, Investopedia has a solid overview.

Why Low-Income Years Are Powerful

As an aspiring SWE, this is very likely one of the lowest-tax years you'll have for the rest of your career if you pursue full-time work after college. Even if your internship pays well, your annual income is still far lower than what you'll earn as a full-time SWE.

A Roth IRA lets you invest money after paying today's taxes, so that future growth and qualified withdrawals are completely tax-free. As a college student, your tax bracket is typically much lower than it will be just a few years from now. That means you get to pay a low tax rate today and allow the gains to grow untouched by taxes for decades.

Time is your greatest advantage right now. Money invested in your early 20s has decades to compound, which matters far more than trying to perfectly time the market. If you're investing for the long term, short-term dips become statistical noise.

If you want to see why investing early is so powerful, you can understand it through a wealth multiplier. For example, if a 20 year old invested $7,500, they can expect that to be worth $660,000 by the time they retire (7500 × 88 = 660k). Adjust the investment up or down depending on what you expect to be investing, and you can visualize why starting early is insanely OP.

9. 401(k): Only If It Actually Makes Sense

A 401(k) is often described as "free money" because of employer matching. For full-time employees, that's usually true. For interns, it's more complicated.

Before contributing, you need to understand three things: how employer matching works, how vesting works, and how internship status can change the math.

Employer Match Basics

An employer match means your company contributes money to your 401(k) based on how much you contribute. A common structure might look like this:
- You contribute 5% of your paycheck
- Your employer matches 100% of that 5%

In theory, that's an instant 100% return on your contribution. This is why 401(k) matching is usually prioritized for full-time workers.

Vesting Cliffs (Where Interns Get Burned)

Here's the catch: employer contributions are often not yours immediately.

Most companies use a vesting schedule, which determines when employer-matched money actually becomes yours. One of the most common, and harshest, structures is a cliff vesting schedule.

Some companies also require a minimum number of hours worked per year (often around 1,000 hours) for that year to count toward vesting. This is where interns often lose out.

This is all even assuming the company even technically supports 401(k) accounts for interns, many don't.

Real-World Example: Amazon

⚠ As of 2026, this was the 401(k) vesting policy at Amazon. Always check what the current documents say as this information may become outdated.

At Amazon, the rules make contributing as an intern tricky:
- You must work 3 years as a full-time employee to vest in employer-matched contributions
- Only years in which you work 1,000+ hours count toward that vesting
- As an intern, you won't meet these requirements, so any contributions you make won't be matched. To ever receive the match, you'd need to later join Amazon full-time and stay for at least three years (the average Amazon engineer only stays for two years).

In short: even if you contribute as an intern, the "free money" isn't actually yours yet. If you leave before vesting, you get none of the employer match. This is why it can be rational to skip a 401(k) as an intern, even if a match is technically offered.

Advanced Case: Using a Roth 401(k) as Extra Roth Space

💡 If you're uncomfortable handling rollovers or paperwork, skip this entirely—simplicity beats optimization. That being said this section could be invaluable if it fits your personal situation.

There is one important edge case where contributing to a 401(k) can make sense for interns even if you expect to lose the employer match.

If you've already:
1. Maxed your Roth IRA
2. Don't need the money for school or emergencies
3. Will be leaving the company after the internship

Contributing to a Roth 401(k) can be more tax-efficient than using a taxable brokerage account.

Here's why: Roth 401(k) contributions can later be rolled into a Roth IRA, and rollovers do not count toward Roth IRA contribution limits. This effectively lets you move more money into long-term, tax-free Roth space during a low-income year.

For example:
- You max your Roth IRA
- You contribute an additional $5,000 to a Roth 401(k) during your internship
- Your internship ends and you roll the Roth 401(k) into your Roth IRA

The result is $5,000 of additional money growing tax-free, even though you were already at the Roth IRA limit.

This strategy adds complexity, temporarily locks up your money, and requires you to successfully execute a rollover after leaving the company. Because of that, it's best suited for interns who are financially stable and comfortable managing the extra admin, not as a default recommendation.

For most interns, prioritizing cash flexibility and a Roth IRA still makes more sense. But if you're already there and deciding between a brokerage account vs. a Roth 401(k), this is one case where the 401(k) can win on taxes, even without a vested match.

Bottom Line

If you're a full-time employee planning to stay at a company long enough to vest, a matched 401(k) is usually a no-brainer.

As an intern, though, the math is different. If the match won't vest unless you stay multiple full-time years, like at Amazon, you're often better off prioritizing:
- Emergency fund (HYSA)
- School-year expenses
- Roth IRA

A 401(k) can still make sense, but only if the match is realistically vesting, not just technically offered. Otherwise, your contributions may just sit in the account without any employer bonus.

10. Brokerage Account

A taxable brokerage account is the last step in your financial toolkit, and a nice one to have at that. Only open it after you've:
- Covered your emergency fund (HYSA)
- Budgeted for the school year
- Maximized Roth IRA contributions
- (Optional) Contributed to a 401(k) if it actually makes sense

This is a standard investment account with no special tax advantages or employer matching. Its main benefit is flexibility: there are no contribution limits and you can withdraw your principal at any time without penalties.

Long-Term Mindset

Much of the same advice I gave in the Roth IRA is applicable here. A brokerage account is best for money you can leave invested for years or decades. Treat it like a long-term tool, not a short-term flex. The market will fluctuate, patience is key, and trying to time it usually backfires.

⚠ Disclaimer: I am not a licensed financial advisor. This guide is for general educational purposes only and does not account for your personal financial situation. Investing involves risk, including the possible loss of principal. You are solely responsible for any decisions you make based on this information.

Closing Thoughts

Congrats, you made it through the guide! By now, you should have a solid roadmap for taking a short-term, high-paying internship and turning it into long-term financial stability. Let's wrap up with the mindset that ties everything together:

1. Money Is a Tool, Not a Trophy
   Your internship pay is unusually high for a short period, but it's not just for splurging or bragging. Treat your earnings as a way to build flexibility, reduce stress, and invest in your future while still enjoying the perks of being an intern.

2. Flexibility > Perfection
   The goal isn't to make every financial decision perfectly; there's no single "right" way to budget, invest, or spend. Focus on creating flexibility: an emergency fund, coverage for school-year expenses, and some guilt-free fun. That safety net allows you to adapt without stress.

3. You Don't Need to Optimize Everything
   Tiny improvements, like choosing the absolute cheapest apartment or calculating exact tax withholdings to the penny, often give minimal gains compared to the effort. Prioritize the moves that have the biggest impact on your life and finances, and don't sweat the small stuff.

4. Time Is Your Secret Weapon
   For investing, nothing beats starting early. Even modest contributions to a Roth IRA now can turn into a huge advantage decades down the line thanks to compound interest.

5. Balance Fun With Responsibility
   Your internship is a unique experience—roommates, lunches with coworkers, city adventures—don't miss out. A thoughtfully allocated fun budget keeps you sane and allows you to enjoy life while still being financially smart.

So please, you made it this far and got a SWE internship, don't fumble the absolute layup you've been given getting this type of money as a college student. If you follow the principles I laid out, you'll do just fine.

💡 Questions?
If you have general questions about the ideas in this guide, feel free to email me at alumala@asu.edu. (I can't provide personalized financial advice.)

If you found this guide helpful, feel free to share it with others — attribution appreciated.

— Alexander Lumala`;

export const KB_FACT_NOTES: string = `Authoritative fact reminders (these override anything ambiguous in the guide):
- The 2026 Roth IRA contribution limit is $7,500.
- The WA Cares Fund is a mandatory payroll deduction in Washington; do not describe any way to exempt yourself from it.
- When recommending a HYSA or brokerage, give evaluation criteria (FDIC insured, high APY, no fees, instant transfers) — never name specific providers.
- This guide is educational only and is not licensed financial advice.`;

# Toinoma Platform Specification

> **Version:** 1.0 | **Last Updated:** 2026-03-23
> **Scope:** Udemy-equivalent exam marketplace + AI grading for university entrance exam preparation

## Product Summary

Toinoma is a **Udemy-equivalent marketplace** specialized for Japanese university entrance exam preparation. Instead of video courses, sellers publish **problem sets** (exam problems). Students purchase, solve, and receive **AI-powered grading** with partial credit for written answers.

## Target Users

- **Students**: Japanese university entrance exam candidates (high school 2nd/3rd year, ronin students)
- **Sellers (Problem Creators)**: University students, tutoring circles, cram school teachers, freelance educators

## Core Differentiators from Udemy

| # | Differentiator | Description |
|---|---------------|-------------|
| 1 | Problem sets only | Content format is exam problem sets (not video courses). AI partial credit grading for essays. |
| 2 | Vertical text | Japanese language (kokugo) problems rendered in vertical writing mode (tategaki). |
| 3 | Custom review sets | Buyers can pull individual questions from purchased sets into personal study collections. |
| 4 | Camera answer capture | Mobile camera captures handwritten answer sheets; AI Vision processes the image. |
| 5 | AI PDF import | Sellers import problems from existing PDFs; AI extracts questions, answers, and rubrics. |
| 6 | Problem Pool model | Sellers maintain a "problem pool" of individual questions, then compose sets from the pool. |
| 7 | AI study assistant | Subscription feature: AI-powered Q&A, hint generation, and study guidance. |
| 8 | Video per question | Sellers attach up to 3 explanation videos per question, viewable in review mode. |
| 9 | PDF printing | Buyers can export purchased problem sets as printable A4 PDFs (problems + answers separately). |
| 10 | Interactive authoring | Mark-sheet (bubble), fill-in-the-blank, multiple-choice, and essay question types with interactive editor. |
| 11 | Separate sheets | Solving interface mirrors real exams: problem sheet and answer sheet are separate. |

## Specification Files

| File | Domain | Description |
|------|--------|-------------|
| [feature-matrix.md](./feature-matrix.md) | ALL | Complete implementation checklist — every feature with ID, priority, status |
| [01-user-management.md](./01-user-management.md) | Users | Auth, profiles, settings, account lifecycle |
| [02-seller-system.md](./02-seller-system.md) | Sellers | Seller mode, ToS, dashboard, onboarding, analytics |
| [03-content-authoring.md](./03-content-authoring.md) | Authoring | Problem pool, sets, question types, import, videos |
| [04-marketplace.md](./04-marketplace.md) | Discovery | Browse, search, detail pages, purchase, reviews |
| [05-solving-and-grading.md](./05-solving-and-grading.md) | Core | Solving interface, AI grading, answer types, camera capture |
| [06-study-tools.md](./06-study-tools.md) | Learning | Review mode, collections, PDF export, progress |
| [07-payments.md](./07-payments.md) | Commerce | Stripe, purchases, payouts, refunds, coupons |
| [08-subscriptions.md](./08-subscriptions.md) | Billing | Tiers, AI features, usage tracking |
| [09-infrastructure.md](./09-infrastructure.md) | Platform | Vertical text, SEO, admin, moderation, legal |

## Architecture

See [CLAUDE.md](../CLAUDE.md) for full tech stack. Key points:
- **Monorepo**: pnpm + Turborepo (web + mobile + shared)
- **Web**: Next.js 15 App Router, Server Components first
- **DB**: Supabase PostgreSQL, RLS-enforced
- **Auth**: Supabase Auth (Google, X/Twitter OAuth)
- **Payments**: Stripe Connect (Express), Stripe Billing
- **AI**: Vercel AI SDK + Google Generative AI
- **Storage**: Supabase Storage (PDFs, images, videos)

## Priority Definitions

| Priority | Meaning | Launch Requirement |
|----------|---------|-------------------|
| P0 | Must-have | Blocks launch |
| P1 | Important | Required within 2 weeks of launch |
| P2 | Nice-to-have | Can ship post-launch |
| P3 | Future | Planned but not committed |

import type { Metadata } from "next";
import { SUBJECT_LABELS, DIFFICULTY_LABELS } from "@toinoma/shared/constants";
import type { Subject, Difficulty } from "@/types/database";

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const SITE_NAME = "問の間 (Toinoma)";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://toinoma.jp";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

// ──────────────────────────────────────────────
// Generic page metadata
// ──────────────────────────────────────────────

export function generatePageMetadata(
  title: string,
  description: string,
  options?: {
    ogImage?: string;
    noIndex?: boolean;
    pathname?: string;
  }
): Metadata {
  const fullTitle = `${title} - ${SITE_NAME}`;
  const url = options?.pathname ? `${SITE_URL}${options.pathname}` : undefined;

  return {
    title: fullTitle,
    description,
    openGraph: {
      title: fullTitle,
      description,
      siteName: SITE_NAME,
      type: "website",
      locale: "ja_JP",
      url,
      images: [
        {
          url: options?.ogImage ?? DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [options?.ogImage ?? DEFAULT_OG_IMAGE],
    },
    ...(options?.noIndex && {
      robots: { index: false, follow: false },
    }),
  };
}

// ──────────────────────────────────────────────
// Problem set metadata
// ──────────────────────────────────────────────

interface ProblemSetMetadataInput {
  id: string;
  title: string;
  description: string | null;
  subject: Subject;
  difficulty: Difficulty;
  university: string | null;
  price: number;
  cover_image_url: string | null;
  seller_display_name: string | null;
}

export function generateProblemSetMetadata(
  ps: ProblemSetMetadataInput
): Metadata {
  const subjectLabel = SUBJECT_LABELS[ps.subject];
  const difficultyLabel = DIFFICULTY_LABELS[ps.difficulty];
  const priceLabel = ps.price === 0 ? "無料" : `¥${ps.price.toLocaleString()}`;

  const title = `${ps.title} - ${SITE_NAME}`;
  const desc =
    ps.description ??
    `${subjectLabel} / ${difficultyLabel}${ps.university ? ` / ${ps.university}` : ""} の問題セット（${priceLabel}）`;
  const url = `${SITE_URL}/problem/${ps.id}`;
  const ogImage = ps.cover_image_url ?? DEFAULT_OG_IMAGE;

  // JSON-LD Product structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: ps.title,
    description: desc,
    url,
    image: ogImage,
    offers: {
      "@type": "Offer",
      price: ps.price,
      priceCurrency: "JPY",
      availability: "https://schema.org/InStock",
    },
    ...(ps.seller_display_name && {
      brand: {
        "@type": "Organization",
        name: ps.seller_display_name,
      },
    }),
    category: subjectLabel,
  };

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      siteName: SITE_NAME,
      type: "website",
      locale: "ja_JP",
      url,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: ps.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [ogImage],
    },
    other: {
      "script:ld+json": JSON.stringify(jsonLd),
    },
  };
}

// ──────────────────────────────────────────────
// Seller profile metadata
// ──────────────────────────────────────────────

interface SellerMetadataInput {
  id: string;
  seller_display_name: string;
  seller_description: string | null;
  university: string | null;
  avatar_url: string | null;
  problem_set_count: number;
}

export function generateSellerMetadata(seller: SellerMetadataInput): Metadata {
  const title = `${seller.seller_display_name} - ${SITE_NAME}`;
  const desc =
    seller.seller_description ??
    `${seller.seller_display_name}${seller.university ? `（${seller.university}）` : ""}の問題セット一覧（${seller.problem_set_count}セット公開中）`;
  const url = `${SITE_URL}/seller/${seller.id}`;
  const ogImage = seller.avatar_url ?? DEFAULT_OG_IMAGE;

  // JSON-LD Person structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: seller.seller_display_name,
    url,
    ...(seller.seller_description && {
      description: seller.seller_description,
    }),
    ...(seller.university && {
      affiliation: {
        "@type": "EducationalOrganization",
        name: seller.university,
      },
    }),
  };

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      siteName: SITE_NAME,
      type: "profile",
      locale: "ja_JP",
      url,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: seller.seller_display_name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [ogImage],
    },
    other: {
      "script:ld+json": JSON.stringify(jsonLd),
    },
  };
}

// ──────────────────────────────────────────────
// JSON-LD helpers
// ──────────────────────────────────────────────

export function buildProductJsonLd(ps: ProblemSetMetadataInput): string {
  const subjectLabel = SUBJECT_LABELS[ps.subject];
  const desc =
    ps.description ??
    `${subjectLabel}の問題セット`;

  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: ps.title,
    description: desc,
    url: `${SITE_URL}/problem/${ps.id}`,
    image: ps.cover_image_url ?? DEFAULT_OG_IMAGE,
    offers: {
      "@type": "Offer",
      price: ps.price,
      priceCurrency: "JPY",
      availability: "https://schema.org/InStock",
    },
    ...(ps.seller_display_name && {
      brand: {
        "@type": "Organization",
        name: ps.seller_display_name,
      },
    }),
    category: subjectLabel,
  });
}

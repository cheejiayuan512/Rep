/**
 * The one shape of `store-assets/listing.json`, plus the length limits both
 * stores enforce. `store-copy.ts` writes the file and `store-upload.ts` sends
 * it, so the checks live here once.
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const ROOT = resolve(__dirname, '..');
export const STORE_DIR = join(ROOT, 'store-assets');
export const LISTING_PATH = join(STORE_DIR, 'listing.json');

export type Listing = {
  app: {
    description: string;
    keywords: string;
    marketingUrl: string;
    promotionalText: string;
    privacyUrl: string;
    supportUrl: string;
    whatsNew: string;
  };
  android: {
    contactEmail: string;
    contactWebsite: string;
    locale: string;
    shortDescription: string;
    title: string;
    video: string;
  };
  ios: { locale: string; name: string; subtitle: string };
};

export function readListing(): Listing {
  return JSON.parse(readFileSync(LISTING_PATH, 'utf8')) as Listing;
}

/**
 * Apple and Google truncate rather than reject, so fail before sending. The
 * same numbers are on both consoles' listing forms.
 */
export function validateListing(listing: Listing): void {
  const checks: [label: string, value: string, max: number][] = [
    ['App Store name', listing.ios.name, 30],
    ['App Store subtitle', listing.ios.subtitle, 30],
    ['App Store keywords', listing.app.keywords, 100],
    ['App Store promotional text', listing.app.promotionalText, 170],
    ['description', listing.app.description, 4000],
    ['release notes', listing.app.whatsNew, 4000],
    ['Play title', listing.android.title, 30],
    ['Play short description', listing.android.shortDescription, 80],
  ];

  for (const [label, value, max] of checks) {
    if (value.length > max) {
      throw new Error(`${label} is ${value.length} characters; the limit is ${max}.`);
    }
    if (value.trim().length === 0) {
      throw new Error(`${label} is empty.`);
    }
  }
}

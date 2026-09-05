/** Single source of truth for brand copy, canonical URL and navigation. */

export const site = {
  name: "LongIsland.io",
  tagline: "The best of Long Island, ranked.",
  positioning: "Rankings, Reviews and Local Finds",
  description:
    "Rankings, reviews, local finds and hidden gems across Nassau, Suffolk and beyond.",
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://longisland.io",
  ogImage: "/brand/og-default.png",
  contactEmail: "hello@longisland.io",
} as const;

export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "youtube"
  | "tiktok"
  | "pinterest";

export type SocialLink = {
  platform: SocialPlatform;
  label: string;
  href: string;
};

/**
 * Footer social row. The footer renders only the entries that carry a URL, so
 * an account we have not opened yet simply does not appear — fill in the href
 * to publish one.
 */
export const socialLinks: SocialLink[] = [
  {
    platform: "facebook",
    label: "Facebook",
    href: "https://www.facebook.com/longisland.io",
  },
  {
    platform: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/longisland_io/",
  },
  {
    platform: "youtube",
    label: "YouTube",
    href: "https://www.youtube.com/@longisland_io",
  },
  {
    platform: "tiktok",
    label: "TikTok",
    href: "https://www.tiktok.com/@longisland.io",
  },
  // No Pinterest account yet; the footer hides entries without a URL.
  { platform: "pinterest", label: "Pinterest", href: "" },
];

export type NavChild = { label: string; href: string };
export type NavColumn = { heading: string; items: NavChild[] };
export type NavItem = { label: string; href: string; columns?: NavColumn[] };

export const primaryNav: NavItem[] = [
  {
    label: "Best Of",
    href: "/best",
    columns: [
      {
        heading: "Trending",
        items: [
          { label: "Best Pizza on Long Island", href: "/best/pizza-long-island" },
          { label: "Best Bagel Shops", href: "/best/bagels-long-island" },
          {
            label: "Best Date-Night Restaurants",
            href: "/best/date-night-restaurants-long-island",
          },
          {
            label: "Best Things to Do With Kids",
            href: "/best/things-to-do-with-kids-long-island",
          },
        ],
      },
      {
        heading: "By area",
        items: [
          { label: "Best Pizza in Nassau County", href: "/best/pizza-nassau-county" },
          { label: "Best Pizza in Suffolk County", href: "/best/pizza-suffolk-county" },
          {
            label: "Best Restaurants in Huntington",
            href: "/best/restaurants-huntington",
          },
        ],
      },
      {
        heading: "Browse",
        items: [
          { label: "All rankings", href: "/best" },
          { label: "All categories", href: "/categories" },
          { label: "How we rank", href: "/methodology" },
        ],
      },
    ],
  },
  {
    label: "Eat & Drink",
    href: "/category/eat-drink",
    columns: [
      {
        heading: "Food",
        items: [
          { label: "Pizza", href: "/category/pizza" },
          { label: "Bagels", href: "/category/bagels" },
          { label: "Italian", href: "/category/italian" },
          { label: "Seafood", href: "/category/seafood" },
          { label: "Steakhouses", href: "/category/steakhouses" },
          { label: "Sushi", href: "/category/sushi" },
          { label: "Delis", href: "/category/delis" },
          { label: "Bakeries", href: "/category/bakeries" },
        ],
      },
      {
        heading: "Occasions",
        items: [
          { label: "Date Night", href: "/category/date-night" },
          { label: "Fine Dining", href: "/category/fine-dining" },
          { label: "Waterfront Dining", href: "/category/waterfront-dining" },
          { label: "Brunch", href: "/category/brunch" },
          { label: "Breakfast", href: "/category/breakfast" },
        ],
      },
      {
        heading: "Drink",
        items: [
          { label: "Bars", href: "/category/bars" },
          { label: "Breweries", href: "/category/breweries" },
          { label: "Wineries", href: "/category/wineries" },
          { label: "Cocktails", href: "/category/cocktails" },
          { label: "Coffee", href: "/category/coffee" },
        ],
      },
    ],
  },
  {
    label: "Things to Do",
    href: "/category/things-to-do",
    columns: [
      {
        heading: "Outdoors",
        items: [
          { label: "Beaches", href: "/category/beaches" },
          { label: "Parks", href: "/category/parks" },
          { label: "Hiking", href: "/category/hiking" },
          { label: "Golf", href: "/category/golf" },
          { label: "Fishing", href: "/category/fishing" },
          { label: "Boating", href: "/category/boating" },
        ],
      },
      {
        heading: "Attractions",
        items: [
          { label: "Museums", href: "/category/museums" },
          { label: "Farms", href: "/category/farms" },
          { label: "Vineyards", href: "/category/vineyards" },
          { label: "Live Music", href: "/category/live-music" },
          { label: "Attractions", href: "/category/attractions" },
        ],
      },
      {
        heading: "Seasonal",
        items: [
          { label: "Fall Activities", href: "/category/fall-activities" },
          { label: "Holiday Lights", href: "/category/holiday-lights" },
          { label: "Festivals", href: "/category/festivals" },
          { label: "Rainy Day Activities", href: "/category/rainy-day-activities" },
        ],
      },
    ],
  },
  {
    label: "Home & Services",
    href: "/category/home-services",
    columns: [
      {
        heading: "Trades",
        items: [
          { label: "Contractors", href: "/category/contractors" },
          { label: "Roofers", href: "/category/roofers" },
          { label: "Plumbers", href: "/category/plumbers" },
          { label: "Electricians", href: "/category/electricians" },
          { label: "HVAC", href: "/category/hvac" },
          { label: "Painters", href: "/category/painters" },
        ],
      },
      {
        heading: "Property",
        items: [
          { label: "Landscapers", href: "/category/landscapers" },
          { label: "Pool Companies", href: "/category/pool-companies" },
          { label: "Remodelers", href: "/category/remodelers" },
          { label: "Cleaning Services", href: "/category/cleaning-services" },
          { label: "Pest Control", href: "/category/pest-control" },
          { label: "Movers", href: "/category/movers" },
        ],
      },
      {
        heading: "Advisors",
        items: [
          { label: "Real Estate Agents", href: "/category/real-estate-agents" },
          { label: "Mortgage Brokers", href: "/category/mortgage-brokers" },
          { label: "Home Inspectors", href: "/category/home-inspectors" },
          { label: "Public Adjusters", href: "/category/public-adjusters" },
          { label: "Insurance Agencies", href: "/category/insurance-agencies" },
        ],
      },
    ],
  },
  {
    label: "Family",
    href: "/category/family",
    columns: [
      {
        heading: "Learning",
        items: [
          { label: "Schools", href: "/category/schools" },
          { label: "School Districts", href: "/category/school-districts" },
          { label: "Tutors", href: "/category/tutors" },
          { label: "Daycare", href: "/category/daycare" },
        ],
      },
      {
        heading: "Activities",
        items: [
          { label: "Kids Activities", href: "/category/kids-activities" },
          { label: "Summer Camps", href: "/category/summer-camps" },
          { label: "Birthday Parties", href: "/category/birthday-parties" },
          { label: "Sports Programs", href: "/category/sports-programs" },
        ],
      },
      {
        heading: "Care",
        items: [
          { label: "Pediatric Dentists", href: "/category/pediatric-dentists" },
          { label: "Family Restaurants", href: "/category/family-restaurants" },
        ],
      },
    ],
  },
  {
    label: "Places",
    href: "/places",
    columns: [
      {
        heading: "Counties and regions",
        items: [
          { label: "Nassau County", href: "/place/nassau-county" },
          { label: "Suffolk County", href: "/place/suffolk-county" },
          { label: "North Shore", href: "/place/north-shore" },
          { label: "South Shore", href: "/place/south-shore" },
          { label: "North Fork", href: "/place/north-fork" },
          { label: "The Hamptons", href: "/place/hamptons" },
        ],
      },
      {
        heading: "Popular towns",
        items: [
          { label: "Huntington", href: "/place/huntington" },
          { label: "Port Jefferson", href: "/place/port-jefferson" },
          { label: "Patchogue", href: "/place/patchogue" },
          { label: "Garden City", href: "/place/garden-city" },
          { label: "Long Beach", href: "/place/long-beach" },
          { label: "Montauk", href: "/place/montauk" },
        ],
      },
      {
        heading: "Browse",
        items: [
          { label: "All places", href: "/places" },
          { label: "East End", href: "/place/east-end" },
          { label: "Fire Island", href: "/place/fire-island" },
        ],
      },
    ],
  },
];

export const footerNav: NavColumn[] = [
  {
    heading: "Discover",
    items: [
      { label: "All rankings", href: "/best" },
      { label: "Categories", href: "/categories" },
      { label: "Places", href: "/places" },
      { label: "Search", href: "/search" },
    ],
  },
  {
    heading: "Eat and Drink",
    items: [
      { label: "Pizza", href: "/category/pizza" },
      { label: "Bagels", href: "/category/bagels" },
      { label: "Seafood", href: "/category/seafood" },
      { label: "Date Night", href: "/category/date-night" },
    ],
  },
  {
    heading: "Company",
    items: [
      { label: "About", href: "/about" },
      { label: "How we rank", href: "/methodology" },
      { label: "Advertise", href: "/advertise" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Legal",
    items: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Nominate a business", href: "/nominate" },
    ],
  },
];

/** Shown wherever advertising and editorial sit near each other. */
export const EDITORIAL_INDEPENDENCE_NOTICE =
  "Advertising relationships do not guarantee or determine organic ranking positions.";

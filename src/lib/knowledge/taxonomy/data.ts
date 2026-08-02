import { TaxonomyNode } from "./types";

/**
 * A real, bounded starting set — NOT a claim of covering "all major
 * industries." Prioritized directly by the PAT's findings: every business
 * that failed or produced wrong output (Laptop Store, Agriculture
 * Business, Digital Marketing Agency, Dental Clinic) is covered here with
 * real depth, plus enough additional industries to meaningfully test
 * against Phase 10's 50-business list. Coverage gaps are reported
 * honestly in the Coverage Report, not padded to look complete.
 *
 * Keyword/alias design rule, applied throughout: prefer distinctive,
 * multi-word phrases over single generic words. "equipment," "business,"
 * "service," "store" alone are never sufufficient to match a node — this
 * is the direct fix for the golf-clubs-matching-agriculture bug.
 */
const SOURCE = "Smarkin Taxonomy v1";
const VERSION = "1.0.0";
const NOW = "2026-07-21";

let idCounter = 0;
function node(partial: Omit<TaxonomyNode, "id" | "source" | "version" | "lastUpdated">): TaxonomyNode {
  idCounter++;
  return { ...partial, id: `tax-${idCounter}`, source: SOURCE, version: VERSION, lastUpdated: NOW };
}

export const TAXONOMY: TaxonomyNode[] = [
  // ── Consumer Electronics (fixes "Laptop Store" — zero coverage in PAT) ──
  node({
    parentId: null, industry: "Consumer Electronics", category: "Computers", subcategory: "Laptops",
    aliases: ["laptop store", "laptop shop", "computer store", "notebook computers"],
    products: ["Laptop", "Notebook", "Ultrabook", "Laptop accessories"],
    keywords: ["laptop", "notebook computer", "ultrabook", "laptop repair", "laptop accessories", "refurbished laptop"],
    confidenceHint: 90,
  }),
  node({
    parentId: null, industry: "Consumer Electronics", category: "Phones", subcategory: "Mobile Phones",
    aliases: ["phone shop", "mobile shop", "cell phone store"],
    products: ["Smartphone", "Phone case", "Screen protector", "Charger"],
    keywords: ["smartphone", "mobile phone", "phone repair", "phone accessories", "screen replacement"],
    confidenceHint: 90,
  }),

  // ── Agriculture (fixes the golf-club false match) ──
  node({
    parentId: null, industry: "Agriculture", category: "Crop Farming", subcategory: null,
    aliases: ["crop farm", "farming business"],
    products: ["Seeds", "Fertilizer", "Irrigation supplies"],
    keywords: ["crop farming", "harvest yield", "irrigation system", "seed supply", "fertilizer"],
    confidenceHint: 85,
  }),
  node({
    parentId: null, industry: "Agriculture", category: "Livestock", subcategory: "Poultry",
    aliases: ["poultry farm", "chicken farm"],
    products: ["Eggs", "Broiler chicken", "Poultry feed"],
    keywords: ["poultry farming", "egg production", "broiler chicken", "layer hen"],
    confidenceHint: 88,
  }),
  node({
    parentId: null, industry: "Agriculture", category: "Agricultural Equipment", subcategory: null,
    aliases: ["farm equipment dealer", "agricultural machinery", "agricultural equipment"],
    products: ["Tractor", "Harvester", "Irrigation equipment"],
    keywords: ["tractor", "farm machinery", "irrigation equipment", "harvester equipment", "agricultural tools"],
    confidenceHint: 85,
  }),

  // ── Professional Services (fixes Digital Marketing Agency duplicate-objection bug) ──
  node({
    parentId: null, industry: "Professional Services", category: "Marketing", subcategory: "Digital Marketing Agency",
    aliases: ["marketing agency", "digital marketing agency", "ad agency"],
    products: ["Social media management", "PPC campaigns", "SEO services", "Content marketing"],
    keywords: ["digital marketing services", "social media management", "ppc management", "seo agency", "ad campaign management"],
    confidenceHint: 88,
  }),
  node({
    parentId: null, industry: "Professional Services", category: "Accounting", subcategory: null,
    aliases: ["accounting firm", "bookkeeping business", "cpa firm"],
    products: ["Tax preparation", "Bookkeeping", "Payroll processing"],
    keywords: ["tax preparation", "bookkeeping services", "payroll services", "financial statements", "audit services"],
    confidenceHint: 88,
  }),

  // ── Healthcare (fixes Dental Clinic duplicate-objection bug) ──
  node({
    parentId: null, industry: "Healthcare", category: "Dental", subcategory: "Dental Clinic",
    aliases: ["dental clinic", "dentist office", "dental practice", "dental services"],
    products: ["Teeth cleaning", "Orthodontics", "Root canal", "Teeth whitening"],
    keywords: ["teeth cleaning", "dental checkup", "orthodontics", "root canal", "teeth whitening"],
    confidenceHint: 92,
  }),
  node({
    parentId: null, industry: "Healthcare", category: "Pharmacy", subcategory: null,
    aliases: ["pharmacy", "drugstore"],
    products: ["Prescription medication", "Over-the-counter medicine"],
    keywords: ["prescription medication", "over the counter medicine", "pharmacy services"],
    confidenceHint: 88,
  }),
  node({
    parentId: null, industry: "Healthcare", category: "Vision", subcategory: "Eye Clinic",
    aliases: ["eye clinic", "optometrist office"],
    products: ["Eye exam", "Prescription glasses", "Contact lenses"],
    keywords: ["eye exam", "prescription glasses", "contact lenses", "vision correction"],
    confidenceHint: 88,
  }),

  // ── Fitness ──
  node({
    parentId: null, industry: "Fitness", category: "Gyms", subcategory: null,
    aliases: ["gym", "fitness center", "health club"],
    products: ["Gym membership", "Personal training", "Group fitness classes"],
    keywords: ["gym membership", "personal training", "weightlifting", "strength training"],
    confidenceHint: 90,
  }),
  node({
    parentId: null, industry: "Fitness", category: "Studios", subcategory: "Yoga Studio",
    aliases: ["yoga studio"],
    products: ["Yoga classes", "Meditation sessions"],
    keywords: ["yoga classes", "meditation practice", "yoga instructor"],
    confidenceHint: 88,
  }),

  // ── Food & Beverage ──
  node({
    parentId: null, industry: "Food & Beverage", category: "Restaurants", subcategory: null,
    aliases: ["restaurant", "eatery"],
    products: ["Dine-in meals", "Takeout", "Catering"],
    keywords: ["dine in", "restaurant menu", "reservations", "food delivery"],
    confidenceHint: 88,
  }),

  // ── Real Estate ──
  node({
    parentId: null, industry: "Real Estate", category: "Real Estate Agency", subcategory: null,
    aliases: ["real estate agency", "realty firm"],
    products: ["Home listings", "Property sales", "Rental listings"],
    keywords: ["home listings", "property sale", "real estate agent", "mortgage assistance", "home buyer"],
    confidenceHint: 90,
  }),

  // ── Fashion ──
  node({
    parentId: null, industry: "Fashion", category: "Fashion Retail", subcategory: "Boutique",
    aliases: ["fashion boutique", "clothing store", "fashion store"],
    products: ["Apparel", "Fashion accessories", "Footwear"],
    keywords: ["clothing line", "apparel retail", "fashion accessories", "boutique fashion"],
    confidenceHint: 85,
  }),

  // ── Insurance ──
  node({
    parentId: null, industry: "Insurance", category: "Insurance Agency", subcategory: null,
    aliases: ["insurance agency", "insurance company", "insurance broker"],
    products: ["Life insurance", "Health insurance", "Auto insurance"],
    keywords: ["life insurance", "health insurance policy", "auto insurance", "insurance premium"],
    confidenceHint: 88,
  }),

  // ── Automotive ──
  node({
    parentId: null, industry: "Automotive", category: "Car Dealership", subcategory: null,
    aliases: ["car dealership", "auto dealer"],
    products: ["New cars", "Used cars", "Car financing"],
    keywords: ["new car sales", "used car sales", "car financing", "vehicle trade-in"],
    confidenceHint: 90,
  }),

  // ── Technology / SaaS ──
  node({
    parentId: null, industry: "Technology", category: "Software", subcategory: "SaaS",
    aliases: ["software company", "saas company", "saas business"],
    products: ["Software subscription", "Cloud platform access"],
    keywords: ["software subscription", "cloud software", "saas platform", "software as a service"],
    confidenceHint: 85,
  }),

  // ── Logistics ──
  node({
    parentId: null, industry: "Logistics", category: "Logistics Company", subcategory: null,
    aliases: ["logistics company", "shipping company", "freight company"],
    products: ["Freight shipping", "Warehousing", "Delivery services"],
    keywords: ["freight shipping", "supply chain", "warehouse fulfillment", "delivery logistics"],
    confidenceHint: 87,
  }),

  // ── Beauty & Personal Care ──
  node({
    parentId: null, industry: "Beauty & Personal Care", category: "Beauty Salon", subcategory: null,
    aliases: ["beauty salon", "hair salon"],
    products: ["Hair styling", "Manicure", "Pedicure", "Facials"],
    keywords: ["hair styling", "manicure pedicure", "salon services", "beauty treatments"],
    confidenceHint: 88,
  }),
  node({
    parentId: null, industry: "Beauty & Personal Care", category: "Barbershop", subcategory: null,
    aliases: ["barbershop", "barber shop"],
    products: ["Haircut", "Beard trim", "Shave"],
    keywords: ["haircut", "beard trim", "barber services"],
    confidenceHint: 90,
  }),

  // ── Hospitality ──
  node({
    parentId: null, industry: "Hospitality", category: "Hotel", subcategory: null,
    aliases: ["hotel", "inn", "lodging business"],
    products: ["Room booking", "Hotel amenities"],
    keywords: ["hotel booking", "room reservation", "hospitality services"],
    confidenceHint: 88,
  }),
  node({
    parentId: null, industry: "Hospitality", category: "Travel Agency", subcategory: null,
    aliases: ["travel agency", "travel agent business"],
    products: ["Vacation packages", "Flight booking", "Travel itinerary planning"],
    keywords: ["vacation packages", "flight booking", "travel itinerary"],
    confidenceHint: 87,
  }),
];

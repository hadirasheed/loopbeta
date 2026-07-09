/**
 * Demo catalog data, shared by the seeders:
 *   - seed.ts        inserts it over the Supabase REST API (needs network)
 *   - gen-seed-sql.ts emits supabase/seed.sql to paste into the SQL Editor
 *
 * This is demo data only; the admin dashboard is the real catalog path.
 */
import type { DishAttributes, DeliveryApp } from "../src/lib/types";

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=60`;

// A small pool of known-good Unsplash food photos, cycled across dishes.
export const IMAGES = [
  img("photo-1568901346375-23c9450c58cd"), // burger
  img("photo-1565299624946-b28f40a0ae38"), // pizza slice
  img("photo-1569718212165-3a8278d5f624"), // ramen
  img("photo-1546069901-ba9599a7e63c"), // salad bowl
  img("photo-1567620905732-2d1ec7ab7445"), // pancakes
  img("photo-1555939594-58d7cb561ad1"), // grilled skewers
  img("photo-1563379926898-05f4575a45d8"), // pasta
  img("photo-1512621776951-a57141f2eefd"), // veggie salad
  img("photo-1540189549336-e6e99c3679fe"), // salmon plate
  img("photo-1553621042-f6e147245754"), // poke bowl
  img("photo-1604382354936-07c5d9983bd3"), // margherita
  img("photo-1571091718767-18b5b1457add"), // burger + fries
];

export interface SeedRestaurant {
  name: string;
  area: string;
}

export interface SeedDish {
  restaurant: string;
  name: string;
  price: number;
  description: string;
  attributes: DishAttributes;
  cuisine: string;
  main_protein: string;
  prep_style: string;
  is_veg?: boolean;
  is_halal?: boolean;
  allergens?: string[];
  apps?: DeliveryApp[];
}

export const restaurants: SeedRestaurant[] = [
  { name: "Bombay Junction", area: "Al Barsha" },
  { name: "Beirut Nights", area: "Jumeirah" },
  { name: "Tokyo Slurp", area: "Dubai Marina" },
  { name: "Nonna's Table", area: "Downtown" },
  { name: "Smash Bros Burgers", area: "JLT" },
  { name: "Bangkok Soi", area: "Business Bay" },
  { name: "Casa Luchador", area: "Dubai Marina" },
  { name: "Dragon Wok", area: "Deira" },
  { name: "Green Bowl Co.", area: "Downtown" },
  { name: "Istanbul Grill House", area: "Al Karama" },
];

const apps = (slug: string): DeliveryApp[] => [
  { app: "talabat", url: `https://www.talabat.com/uae/${slug}` },
  { app: "deliveroo", url: `https://deliveroo.ae/menu/dubai/${slug}` },
];

// attributes: heaviness, spiciness, price_tier, healthiness, adventurousness, warmth
const a = (
  heaviness: number,
  spiciness: number,
  price_tier: number,
  healthiness: number,
  adventurousness: number,
  warmth: number
): DishAttributes => ({
  heaviness,
  spiciness,
  price_tier,
  healthiness,
  adventurousness,
  warmth,
});

export const dishes: SeedDish[] = [
  // Bombay Junction — Indian
  { restaurant: "Bombay Junction", name: "Chicken Biryani", price: 38, description: "Fragrant basmati layered with spiced chicken and fried onions.", attributes: a(0.8, 0.7, 0.4, 0.35, 0.4, 0.9), cuisine: "indian", main_protein: "chicken", prep_style: "steamed", apps: apps("bombay-junction") },
  { restaurant: "Bombay Junction", name: "Paneer Tikka Masala", price: 34, description: "Charred paneer simmered in a creamy tomato gravy.", attributes: a(0.7, 0.6, 0.35, 0.4, 0.35, 0.85), cuisine: "indian", main_protein: "paneer", prep_style: "curry", is_veg: true, allergens: ["dairy"], apps: apps("bombay-junction") },
  { restaurant: "Bombay Junction", name: "Masala Dosa", price: 22, description: "Crisp rice crepe stuffed with spiced potato, served with sambar.", attributes: a(0.45, 0.5, 0.15, 0.55, 0.45, 0.75), cuisine: "indian", main_protein: "none", prep_style: "griddled", is_veg: true, apps: apps("bombay-junction") },
  { restaurant: "Bombay Junction", name: "Butter Chicken", price: 42, description: "Tandoori chicken folded into silky tomato-butter sauce.", attributes: a(0.8, 0.45, 0.45, 0.3, 0.3, 0.9), cuisine: "indian", main_protein: "chicken", prep_style: "curry", allergens: ["dairy"], apps: apps("bombay-junction") },

  // Beirut Nights — Lebanese
  { restaurant: "Beirut Nights", name: "Mixed Grill Platter", price: 65, description: "Shish tawook, kofta and lamb kebab over saffron rice.", attributes: a(0.75, 0.35, 0.6, 0.5, 0.3, 0.85), cuisine: "lebanese", main_protein: "mixed", prep_style: "grilled", apps: apps("beirut-nights") },
  { restaurant: "Beirut Nights", name: "Falafel Wrap", price: 18, description: "Crunchy falafel with tahini, pickles and fresh veg.", attributes: a(0.4, 0.25, 0.1, 0.6, 0.25, 0.6), cuisine: "lebanese", main_protein: "none", prep_style: "fried", is_veg: true, allergens: ["sesame"], apps: apps("beirut-nights") },
  { restaurant: "Beirut Nights", name: "Fattoush & Grilled Halloumi", price: 28, description: "Zesty sumac salad with charred halloumi and crisp pita.", attributes: a(0.3, 0.15, 0.3, 0.85, 0.3, 0.35), cuisine: "lebanese", main_protein: "cheese", prep_style: "grilled", is_veg: true, allergens: ["dairy", "gluten"], apps: apps("beirut-nights") },
  { restaurant: "Beirut Nights", name: "Chicken Shawarma Plate", price: 32, description: "Garlicky shawarma with fries, pickles and toum.", attributes: a(0.65, 0.3, 0.3, 0.35, 0.2, 0.8), cuisine: "lebanese", main_protein: "chicken", prep_style: "roasted", allergens: ["garlic"], apps: apps("beirut-nights") },

  // Tokyo Slurp — Japanese
  { restaurant: "Tokyo Slurp", name: "Tonkotsu-Style Chicken Ramen", price: 48, description: "Rich broth, springy noodles, ajitama egg and chashu chicken.", attributes: a(0.85, 0.35, 0.5, 0.4, 0.55, 0.95), cuisine: "japanese", main_protein: "chicken", prep_style: "simmered", allergens: ["egg", "gluten", "soy"], apps: apps("tokyo-slurp") },
  { restaurant: "Tokyo Slurp", name: "Salmon Avocado Roll", price: 36, description: "Eight pieces of fresh salmon and creamy avocado.", attributes: a(0.35, 0.1, 0.5, 0.75, 0.6, 0.15), cuisine: "japanese", main_protein: "fish", prep_style: "raw", allergens: ["fish", "soy"], apps: apps("tokyo-slurp") },
  { restaurant: "Tokyo Slurp", name: "Chicken Katsu Curry", price: 44, description: "Panko-crisp chicken over Japanese curry and rice.", attributes: a(0.8, 0.4, 0.45, 0.3, 0.5, 0.9), cuisine: "japanese", main_protein: "chicken", prep_style: "fried", allergens: ["gluten", "egg"], apps: apps("tokyo-slurp") },
  { restaurant: "Tokyo Slurp", name: "Veggie Yaki Udon", price: 34, description: "Thick udon stir-fried with shiitake, cabbage and sesame.", attributes: a(0.55, 0.3, 0.35, 0.55, 0.5, 0.8), cuisine: "japanese", main_protein: "none", prep_style: "stir-fried", is_veg: true, allergens: ["gluten", "soy", "sesame"], apps: apps("tokyo-slurp") },

  // Nonna's Table — Italian
  { restaurant: "Nonna's Table", name: "Margherita Pizza", price: 39, description: "Wood-fired sourdough base, fior di latte, fresh basil.", attributes: a(0.6, 0.05, 0.4, 0.4, 0.15, 0.8), cuisine: "italian", main_protein: "cheese", prep_style: "baked", is_veg: true, allergens: ["gluten", "dairy"], apps: apps("nonnas-table") },
  { restaurant: "Nonna's Table", name: "Beef Lasagna", price: 52, description: "Slow-ragù lasagna with béchamel and parmesan crust.", attributes: a(0.9, 0.1, 0.55, 0.25, 0.2, 0.9), cuisine: "italian", main_protein: "beef", prep_style: "baked", allergens: ["gluten", "dairy"], apps: apps("nonnas-table") },
  { restaurant: "Nonna's Table", name: "Shrimp Linguine", price: 58, description: "Garlic-chilli shrimp tossed with linguine and lemon.", attributes: a(0.6, 0.35, 0.6, 0.5, 0.45, 0.75), cuisine: "italian", main_protein: "shrimp", prep_style: "sautéed", allergens: ["gluten", "shellfish", "garlic"], apps: apps("nonnas-table") },
  { restaurant: "Nonna's Table", name: "Burrata Caprese", price: 45, description: "Creamy burrata, heirloom tomatoes, basil oil.", attributes: a(0.3, 0.0, 0.55, 0.7, 0.3, 0.2), cuisine: "italian", main_protein: "cheese", prep_style: "fresh", is_veg: true, allergens: ["dairy"], apps: apps("nonnas-table") },

  // Smash Bros Burgers — American
  { restaurant: "Smash Bros Burgers", name: "Double Smash Burger", price: 35, description: "Two crispy-edged patties, American cheese, house sauce.", attributes: a(0.95, 0.15, 0.35, 0.1, 0.1, 0.85), cuisine: "american", main_protein: "beef", prep_style: "griddled", allergens: ["gluten", "dairy"], apps: apps("smash-bros") },
  { restaurant: "Smash Bros Burgers", name: "Nashville Hot Chicken Sandwich", price: 33, description: "Fiery fried chicken, slaw and pickles on a potato bun.", attributes: a(0.85, 0.85, 0.35, 0.15, 0.4, 0.85), cuisine: "american", main_protein: "chicken", prep_style: "fried", allergens: ["gluten", "egg"], apps: apps("smash-bros") },
  { restaurant: "Smash Bros Burgers", name: "Loaded Fries", price: 22, description: "Skin-on fries under cheese sauce, jalapeños and scallions.", attributes: a(0.8, 0.4, 0.15, 0.05, 0.15, 0.8), cuisine: "american", main_protein: "none", prep_style: "fried", is_veg: true, allergens: ["dairy"], apps: apps("smash-bros") },
  { restaurant: "Smash Bros Burgers", name: "Grilled Chicken Caesar", price: 30, description: "Char-grilled chicken over crisp romaine and parmesan.", attributes: a(0.45, 0.05, 0.3, 0.65, 0.1, 0.4), cuisine: "american", main_protein: "chicken", prep_style: "grilled", allergens: ["dairy", "egg", "fish", "gluten"], apps: apps("smash-bros") },

  // Bangkok Soi — Thai
  { restaurant: "Bangkok Soi", name: "Pad Thai with Shrimp", price: 40, description: "Tamarind-glossed rice noodles, shrimp, peanuts, lime.", attributes: a(0.6, 0.45, 0.4, 0.45, 0.5, 0.75), cuisine: "thai", main_protein: "shrimp", prep_style: "stir-fried", allergens: ["shellfish", "peanut", "egg", "soy"], apps: apps("bangkok-soi") },
  { restaurant: "Bangkok Soi", name: "Green Curry Chicken", price: 42, description: "Coconut green curry with Thai basil and jasmine rice.", attributes: a(0.65, 0.75, 0.4, 0.45, 0.55, 0.9), cuisine: "thai", main_protein: "chicken", prep_style: "curry", apps: apps("bangkok-soi") },
  { restaurant: "Bangkok Soi", name: "Som Tam Papaya Salad", price: 26, description: "Green papaya pounded with chilli, lime and peanuts.", attributes: a(0.2, 0.85, 0.2, 0.8, 0.7, 0.2), cuisine: "thai", main_protein: "none", prep_style: "fresh", is_veg: true, allergens: ["peanut"], apps: apps("bangkok-soi") },
  { restaurant: "Bangkok Soi", name: "Tofu Massaman Curry", price: 36, description: "Mellow peanut-coconut curry with potatoes and tofu.", attributes: a(0.6, 0.35, 0.35, 0.5, 0.5, 0.9), cuisine: "thai", main_protein: "tofu", prep_style: "curry", is_veg: true, allergens: ["peanut", "soy"], apps: apps("bangkok-soi") },

  // Casa Luchador — Mexican
  { restaurant: "Casa Luchador", name: "Birria Tacos", price: 44, description: "Slow-braised beef tacos with consommé for dipping.", attributes: a(0.8, 0.55, 0.45, 0.3, 0.65, 0.9), cuisine: "mexican", main_protein: "beef", prep_style: "braised", allergens: ["gluten"], apps: apps("casa-luchador") },
  { restaurant: "Casa Luchador", name: "Chicken Quesadilla", price: 32, description: "Toasted tortilla packed with chicken and oaxaca cheese.", attributes: a(0.7, 0.3, 0.3, 0.25, 0.25, 0.8), cuisine: "mexican", main_protein: "chicken", prep_style: "griddled", allergens: ["gluten", "dairy"], apps: apps("casa-luchador") },
  { restaurant: "Casa Luchador", name: "Veggie Burrito Bowl", price: 34, description: "Cilantro rice, black beans, guac, pico and crema.", attributes: a(0.5, 0.35, 0.35, 0.7, 0.35, 0.5), cuisine: "mexican", main_protein: "none", prep_style: "assembled", is_veg: true, allergens: ["dairy"], apps: apps("casa-luchador") },
  { restaurant: "Casa Luchador", name: "Shrimp Aguachile", price: 48, description: "Citrus-cured shrimp in a bright serrano-lime bath.", attributes: a(0.25, 0.8, 0.55, 0.75, 0.9, 0.1), cuisine: "mexican", main_protein: "shrimp", prep_style: "raw", allergens: ["shellfish"], apps: apps("casa-luchador") },

  // Dragon Wok — Chinese
  { restaurant: "Dragon Wok", name: "Kung Pao Chicken", price: 38, description: "Wok-seared chicken, dried chillies and roasted peanuts.", attributes: a(0.65, 0.7, 0.35, 0.4, 0.5, 0.8), cuisine: "chinese", main_protein: "chicken", prep_style: "stir-fried", allergens: ["peanut", "soy"], apps: apps("dragon-wok") },
  { restaurant: "Dragon Wok", name: "Veg Dim Sum Basket", price: 28, description: "Steamed dumplings: bok choy, mushroom, glass noodle.", attributes: a(0.35, 0.15, 0.3, 0.6, 0.55, 0.7), cuisine: "chinese", main_protein: "none", prep_style: "steamed", is_veg: true, allergens: ["gluten", "soy"], apps: apps("dragon-wok") },
  { restaurant: "Dragon Wok", name: "Beef & Broccoli", price: 42, description: "Tender beef in glossy oyster-style sauce over rice.", attributes: a(0.7, 0.2, 0.4, 0.45, 0.3, 0.8), cuisine: "chinese", main_protein: "beef", prep_style: "stir-fried", allergens: ["soy", "gluten"], apps: apps("dragon-wok") },
  { restaurant: "Dragon Wok", name: "Sichuan Mapo Tofu", price: 32, description: "Silken tofu in numbing-spicy chilli bean sauce.", attributes: a(0.55, 0.9, 0.3, 0.5, 0.8, 0.85), cuisine: "chinese", main_protein: "tofu", prep_style: "braised", is_veg: true, allergens: ["soy"], apps: apps("dragon-wok") },

  // Green Bowl Co. — Healthy
  { restaurant: "Green Bowl Co.", name: "Salmon Poke Bowl", price: 52, description: "Sushi rice, marinated salmon, edamame, avocado, furikake.", attributes: a(0.4, 0.2, 0.6, 0.85, 0.55, 0.2), cuisine: "hawaiian", main_protein: "fish", prep_style: "raw", allergens: ["fish", "soy", "sesame"], apps: apps("green-bowl-co") },
  { restaurant: "Green Bowl Co.", name: "Harissa Chicken Grain Bowl", price: 42, description: "Freekeh, charred chicken, harissa yoghurt, herbs.", attributes: a(0.45, 0.5, 0.45, 0.85, 0.5, 0.55), cuisine: "fusion", main_protein: "chicken", prep_style: "grilled", allergens: ["gluten", "dairy"], apps: apps("green-bowl-co") },
  { restaurant: "Green Bowl Co.", name: "Acai Energy Bowl", price: 36, description: "Acai blend topped with granola, banana and coconut.", attributes: a(0.2, 0.0, 0.4, 0.8, 0.4, 0.05), cuisine: "healthy", main_protein: "none", prep_style: "fresh", is_veg: true, allergens: ["nuts", "gluten"], apps: apps("green-bowl-co") },
  { restaurant: "Green Bowl Co.", name: "Roast Veg & Quinoa Salad", price: 38, description: "Roast pumpkin, quinoa, pomegranate, tahini drizzle.", attributes: a(0.3, 0.1, 0.4, 0.9, 0.35, 0.4), cuisine: "healthy", main_protein: "none", prep_style: "roasted", is_veg: true, allergens: ["sesame"], apps: apps("green-bowl-co") },

  // Istanbul Grill House — Turkish
  { restaurant: "Istanbul Grill House", name: "Adana Kebab Plate", price: 46, description: "Hand-minced spiced lamb kebab with bulgur and ezme.", attributes: a(0.75, 0.55, 0.45, 0.45, 0.4, 0.85), cuisine: "turkish", main_protein: "lamb", prep_style: "grilled", allergens: ["gluten"], apps: apps("istanbul-grill") },
  { restaurant: "Istanbul Grill House", name: "Cheese Pide", price: 30, description: "Boat-shaped flatbread with molten kashkaval and egg.", attributes: a(0.7, 0.05, 0.25, 0.25, 0.3, 0.85), cuisine: "turkish", main_protein: "cheese", prep_style: "baked", is_veg: true, allergens: ["gluten", "dairy", "egg"], apps: apps("istanbul-grill") },
  { restaurant: "Istanbul Grill House", name: "Iskender Kebab", price: 54, description: "Sliced döner over pide bread, tomato butter, yoghurt.", attributes: a(0.9, 0.3, 0.55, 0.25, 0.45, 0.9), cuisine: "turkish", main_protein: "beef", prep_style: "roasted", allergens: ["gluten", "dairy"], apps: apps("istanbul-grill") },
  { restaurant: "Istanbul Grill House", name: "Lentil Soup & Simit", price: 20, description: "Silky red lentil soup with lemon and a sesame simit.", attributes: a(0.35, 0.15, 0.1, 0.75, 0.2, 0.95), cuisine: "turkish", main_protein: "none", prep_style: "simmered", is_veg: true, allergens: ["gluten", "sesame"], apps: apps("istanbul-grill") },
];

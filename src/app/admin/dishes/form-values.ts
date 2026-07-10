import {
  ATTRIBUTE_KEYS,
  type DishAttributes,
  type DeliveryApp,
  type DishStatus,
} from "@/lib/types";

/** Shape of the dish form's working state. */
export interface DishFormValues {
  id?: string;
  restaurant_id: string;
  name: string;
  image_url: string;
  price: string;
  description: string;
  attributes: DishAttributes;
  cuisine: string;
  main_protein: string;
  prep_style: string;
  is_veg: boolean;
  is_halal: boolean;
  allergens: string[];
  delivery_apps: DeliveryApp[];
  tags: string[];
  available_dayparts: string[];
  seasons: string[];
  status: DishStatus;
}

/**
 * Blank form values for "Add dish". Lives in a non-client module so Server
 * Components (the new-dish page) can call it — a "use client" export becomes a
 * client reference and can't be invoked on the server.
 */
export function emptyValues(): DishFormValues {
  return {
    restaurant_id: "",
    name: "",
    image_url: "",
    price: "",
    description: "",
    attributes: Object.fromEntries(
      ATTRIBUTE_KEYS.map((k) => [k, 0.5])
    ) as DishAttributes,
    cuisine: "",
    main_protein: "",
    prep_style: "",
    is_veg: false,
    is_halal: true,
    allergens: [],
    delivery_apps: [],
    tags: [],
    available_dayparts: [],
    seasons: [],
    status: "draft",
  };
}

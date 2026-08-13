import type { Menu, MenuItem } from '@/types';

import { dishPhoto } from './images';

/**
 * Menus for every venue. Restaurants without a bespoke menu below fall back to
 * `genericMenu`, which is built from the venue's own cuisine rather than being
 * a hardcoded copy of somebody else's food.
 */

type Item = Omit<MenuItem, 'id'>;

let counter = 0;
const withIds = (restaurantId: string, items: Item[]): MenuItem[] =>
  items.map((item) => {
    counter += 1;
    return { ...item, id: `${restaurantId}_mi_${counter}` };
  });

function menu(
  restaurantId: string,
  sections: { title: string; items: Item[] }[],
  currency = 'EUR',
): Menu {
  return {
    restaurantId,
    currency,
    sections: sections.map((section, index) => ({
      id: `${restaurantId}_sec_${index}`,
      title: section.title,
      items: withIds(restaurantId, section.items),
    })),
  };
}

export const mockMenus: Menu[] = [
  menu('rst_grano', [
    {
      title: 'To start',
      items: [
        {
          name: 'Focaccia, Trás-os-Montes olive oil',
          description: 'Baked to order, so it takes twelve minutes.',
          price: 6,
          tags: ['vegetarian'],
        },
        {
          name: 'Vitello tonnato',
          description: 'Slow-cooked veal, tuna and caper emulsion, fried sage.',
          price: 14,
          tags: ['signature'],
        },
        {
          name: 'Burrata, grilled peach, basil oil',
          description: 'Puglian burrata flown in Tuesdays and Fridays.',
          price: 15,
          tags: ['vegetarian'],
        },
      ],
    },
    {
      title: 'Pasta',
      items: [
        {
          name: 'Tagliatelle al ragù',
          description: 'Eight-hour beef and pork ragù, Parmigiano aged 30 months.',
          price: 19,
          tags: ['signature'],
          imageUrl: dishPhoto.pasta,
        },
        {
          name: 'Cacio e pepe',
          description: 'Tonnarelli, Pecorino Romano, Sarawak pepper.',
          price: 17,
          tags: ['vegetarian'],
        },
        {
          name: 'Ravioli of pumpkin and amaretti',
          description: 'Brown butter, sage, toasted hazelnut. Autumn only.',
          price: 20,
          tags: ['vegetarian'],
        },
        {
          name: 'Linguine alle vongole',
          description: 'Algarve clams, white wine, chilli, parsley.',
          price: 22,
          tags: [],
        },
      ],
    },
    {
      title: 'To finish',
      items: [
        {
          name: 'Tiramisù',
          description: 'Made at four each afternoon, served at room temperature.',
          price: 8,
          tags: ['vegetarian', 'signature'],
          imageUrl: dishPhoto.dessert,
        },
        {
          name: 'Affogato',
          description: 'Fior di latte, double espresso, a splash of Frangelico.',
          price: 7,
          tags: ['vegetarian', 'gluten-free'],
        },
      ],
    },
  ]),

  menu('rst_bluefig', [
    {
      title: 'Cold plates',
      items: [
        {
          name: 'Hummus, confit garlic, olive oil',
          description: 'Chickpeas cooked overnight. Comes with two flatbreads.',
          price: 8,
          tags: ['vegetarian', 'vegan'],
        },
        {
          name: 'Baba ganoush',
          description: 'Aubergine charred whole over coals, tahini, pomegranate.',
          price: 8.5,
          tags: ['vegetarian', 'vegan'],
        },
        {
          name: 'Labneh, za’atar, cucumber',
          description: 'Strained for two days. Best with the hot flatbread.',
          price: 7,
          tags: ['vegetarian'],
        },
      ],
    },
    {
      title: 'From the coals',
      items: [
        {
          name: 'Lamb shoulder, seven hours',
          description: 'For two to share. Order it when you sit down.',
          price: 46,
          tags: ['signature'],
        },
        {
          name: 'Chicken musakhan',
          description: 'Sumac onions, pine nuts, taboon bread.',
          price: 19,
          tags: [],
        },
        {
          name: 'Cauliflower, tahini, date molasses',
          description: 'Whole head, charred hard, no apology.',
          price: 14,
          tags: ['vegetarian', 'vegan', 'signature'],
        },
        {
          name: 'Adana kofte',
          description: 'Hand-minced lamb, Urfa chilli, grilled tomato.',
          price: 17,
          tags: ['spicy', 'gluten-free'],
        },
      ],
    },
  ]),

  menu('rst_pombal', [
    {
      title: 'Coffee',
      items: [
        {
          name: 'Espresso',
          description: 'House blend: Brazil, Ethiopia, a little Colombia.',
          price: 1.4,
          tags: ['vegetarian'],
        },
        {
          name: 'Flat white',
          description: 'Double ristretto, whole milk. Oat on request.',
          price: 3.2,
          tags: ['vegetarian'],
          imageUrl: dishPhoto.coffee,
        },
        {
          name: 'Filter of the week',
          description: 'Changes Monday. Ask what is on — they like being asked.',
          price: 3.8,
          tags: ['vegetarian', 'vegan', 'signature'],
        },
      ],
    },
    {
      title: 'Counter',
      items: [
        {
          name: 'Pastel de nata',
          description: 'Out of the oven at 9, 12 and 4.',
          price: 1.6,
          tags: ['vegetarian', 'signature'],
          imageUrl: dishPhoto.pastry,
        },
        {
          name: 'Sourdough toast, avocado, chilli',
          description: 'On Forno Vinte bread, which is two streets away.',
          price: 8.5,
          tags: ['vegetarian', 'vegan'],
        },
        {
          name: 'Ham and cheese tosta',
          description: 'Presunto, Serra da Estrela cheese, cultured butter.',
          price: 7,
          tags: [],
        },
      ],
    },
  ]),

  menu('rst_kissaten', [
    {
      title: 'Omakase',
      items: [
        {
          name: 'Twenty-course omakase',
          description:
            'Whatever came off the Setúbal boats that morning, in the order the chef wants you to eat it. Allergies accommodated when flagged at booking.',
          price: 185,
          tags: ['signature'],
          imageUrl: dishPhoto.sushi,
        },
      ],
    },
    {
      title: 'Pairings',
      items: [
        {
          name: 'Sake pairing, six pours',
          description: 'Junmai through koshu, poured to follow the courses.',
          price: 95,
          tags: [],
        },
        {
          name: 'Non-alcoholic pairing',
          description: 'Cold-brewed teas, verjus, house shrubs. Six pours.',
          price: 55,
          tags: ['vegan'],
        },
      ],
    },
  ]),

  menu('rst_tamarind', [
    {
      title: 'From the tandoor',
      items: [
        {
          name: 'Amritsari fish tikka',
          description: 'Ajwain, gram flour, lime. Sea bass rather than the usual cod.',
          price: 16,
          tags: ['gluten-free'],
        },
        {
          name: 'Paneer tikka',
          description: 'House-set paneer, mustard oil, kasundi.',
          price: 13,
          tags: ['vegetarian', 'gluten-free'],
        },
      ],
    },
    {
      title: 'Curries',
      items: [
        {
          name: 'Kerala meen curry',
          description: 'Coconut, kokum, curry leaf. Hot, and it stays hot.',
          price: 21,
          tags: ['spicy', 'gluten-free', 'signature'],
          imageUrl: dishPhoto.curry,
        },
        {
          name: 'Laal maas',
          description: 'Mathania chilli, lamb on the bone, ghee. Rajasthani hot.',
          price: 23,
          tags: ['spicy', 'signature'],
        },
        {
          name: 'Dal makhani',
          description: 'Twenty-four hours on low heat. Ask for it with the roti.',
          price: 12,
          tags: ['vegetarian', 'gluten-free'],
        },
      ],
    },
  ]),

  menu('rst_ember', [
    {
      title: 'The grill',
      items: [
        {
          name: 'Ribeye, dry-aged 45 days',
          description: '400g, on the bone, served with bone marrow butter.',
          price: 58,
          tags: ['signature', 'gluten-free'],
          imageUrl: dishPhoto.steak,
        },
        {
          name: 'Alentejo pork presa',
          description: 'Black pig, cooked pink, burnt lemon.',
          price: 32,
          tags: ['gluten-free'],
        },
      ],
    },
    {
      title: 'Bar',
      items: [
        {
          name: 'Martini, stirred, 5:1',
          description: 'Gin or vodka, lemon or olive. They will not judge either way.',
          price: 14,
          tags: ['signature', 'vegan'],
        },
        {
          name: 'Old fashioned, rye',
          description: 'Rittenhouse, demerara, two dashes. One large cube.',
          price: 15,
          tags: ['vegan'],
        },
      ],
    },
  ]),

  menu('rst_marisqueira', [
    {
      title: 'From the ice',
      items: [
        {
          name: 'Sea bass, grilled whole',
          description: 'Priced by weight, roughly €38 for a fish for two.',
          price: 38,
          tags: ['gluten-free', 'signature'],
        },
        {
          name: 'Oysters, half dozen',
          description: 'Ria Formosa. Lemon, or the shallot vinegar, not both.',
          price: 16,
          tags: ['gluten-free'],
          imageUrl: dishPhoto.oysters,
        },
        {
          name: 'Percebes',
          description: 'Thursday and Friday only, and only while they last.',
          price: 34,
          tags: ['gluten-free'],
        },
      ],
    },
  ]),

  menu('rst_maiz', [
    {
      title: 'Tacos',
      items: [
        {
          name: 'Al pastor',
          description: 'Off the trompo, pineapple, salsa roja. Three per order.',
          price: 11,
          tags: ['signature'],
          imageUrl: dishPhoto.tacos,
        },
        {
          name: 'Hongos',
          description: 'Mushrooms, epazote, salsa verde. Three per order.',
          price: 10,
          tags: ['vegetarian', 'vegan'],
        },
        {
          name: 'Pescado',
          description: 'Battered corvina, chipotle mayo, cabbage.',
          price: 12,
          tags: [],
        },
      ],
    },
    {
      title: 'Mezcal',
      items: [
        {
          name: 'Espadín flight',
          description: 'Three pours, three producers, one region.',
          price: 21,
          tags: ['vegan'],
        },
      ],
    },
  ]),
];

export const menuByRestaurantId = new Map(mockMenus.map((m) => [m.restaurantId, m]));

/**
 * Fallback for venues without a written menu. Built from the venue's own name
 * and cuisine so it never reads as another restaurant's food pasted in.
 */
export function genericMenu(restaurantId: string, restaurantName: string, currency: string): Menu {
  return menu(
    restaurantId,
    [
      {
        title: 'Kitchen',
        items: [
          {
            name: 'Chef’s selection, three courses',
            description: `The set menu at ${restaurantName}, changing with the market.`,
            price: 34,
            tags: ['signature'],
          },
          {
            name: 'Seasonal vegetable plate',
            description: 'Whatever is best that week, cooked over fire.',
            price: 16,
            tags: ['vegetarian', 'vegan'],
          },
          {
            name: 'Catch of the day',
            description: 'Priced on the board. Ask the floor what came in.',
            price: 26,
            tags: ['gluten-free'],
          },
        ],
      },
      {
        title: 'Desserts',
        items: [
          {
            name: 'Dessert of the day',
            description: 'One thing, made that morning.',
            price: 8,
            tags: ['vegetarian'],
          },
        ],
      },
    ],
    currency,
  );
}

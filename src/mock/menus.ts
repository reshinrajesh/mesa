import type { Menu, MenuItem } from '@/types';

import { dishPhoto } from './images';

/**
 * Menus for every venue. Restaurants without a bespoke menu below fall back to
 * `genericMenu`, which is built from the venue's own cuisine rather than being
 * a hardcoded copy of somebody else's food.
 *
 * Prices are rupees, and the spread is the point: a tiffin plate at ₹90 and a
 * tasting menu at ₹3,800 are the same app screen, so the price column has to
 * hold four digits without wrapping and the tier filter has to mean something
 * across two orders of magnitude.
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
  currency = 'INR',
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
  menu('rst_tiffin', [
    {
      title: 'Tiffin',
      items: [
        {
          name: 'Benne masala dosa',
          description: 'Stone-ground batter, white butter, potato palya, two chutneys.',
          price: 90,
          tags: ['vegetarian', 'signature'],
          imageUrl: dishPhoto.curry,
        },
        {
          name: 'Idli vada set',
          description: 'Two idlis, one vada, sambar poured at the table.',
          price: 70,
          tags: ['vegetarian'],
        },
        {
          name: 'Khara bath',
          description: 'Rava upma with curry leaf and cashew, kesari bath on the side.',
          price: 65,
          tags: ['vegetarian'],
        },
        {
          name: 'Rava idli',
          description: 'Only until eleven, and only on the days the kitchen says so.',
          price: 75,
          tags: ['vegetarian'],
        },
      ],
    },
    {
      title: 'Coffee',
      items: [
        {
          name: 'Filter coffee',
          description: 'Chicory blend, decoction drawn that hour, served by the tumbler.',
          price: 30,
          tags: ['vegetarian', 'signature'],
        },
        {
          name: 'Bella coffee',
          description: 'Jaggery instead of sugar. Ask before you assume it is sweeter.',
          price: 35,
          tags: ['vegetarian'],
        },
      ],
    },
  ]),

  menu('rst_dumhouse', [
    {
      title: 'From the pot',
      items: [
        {
          name: 'Mutton dum biryani',
          description: 'Sealed at four, opened at seven. Sold until the pot is empty.',
          price: 420,
          tags: ['signature', 'spicy'],
          imageUrl: dishPhoto.curry,
        },
        {
          name: 'Chicken dum biryani',
          description: 'Leg pieces unless you ask otherwise, and you should not.',
          price: 340,
          tags: ['spicy'],
        },
        {
          name: 'Vegetable dum biryani',
          description: 'Cooked in its own pot, not lifted out of the meat one.',
          price: 280,
          tags: ['vegetarian'],
        },
      ],
    },
    {
      title: 'Alongside',
      items: [
        {
          name: 'Mirchi ka salan',
          description: 'Peanut and sesame gravy, long green chillies.',
          price: 120,
          tags: ['vegetarian', 'spicy'],
        },
        {
          name: 'Double ka meetha',
          description: 'Fried bread, saffron milk, a great deal of ghee.',
          price: 140,
          tags: ['vegetarian'],
        },
      ],
    },
  ]),

  menu('rst_ilaya', [
    {
      title: 'The menu',
      items: [
        {
          name: 'Eleven courses',
          description:
            'One sitting a night, from the Konkan coast to the Kaveri delta. Allergies at booking, please.',
          price: 3800,
          tags: ['signature'],
          imageUrl: dishPhoto.steak,
        },
        {
          name: 'Eleven courses, vegetarian',
          description: 'Written separately rather than adapted, and the same length.',
          price: 3400,
          tags: ['vegetarian', 'signature'],
        },
      ],
    },
    {
      title: 'With it',
      items: [
        {
          name: 'Wine pairing',
          description: 'Seven pours, four of them Indian.',
          price: 2600,
          tags: [],
        },
        {
          name: 'Non-alcoholic pairing',
          description: 'Ferments and infusions made in the kitchen. Not an afterthought.',
          price: 1400,
          tags: ['vegetarian'],
        },
      ],
    },
  ]),

  menu('rst_kundapura', [
    {
      title: 'From the coast',
      items: [
        {
          name: 'Anjal tawa fry',
          description: 'Kingfish, rava crust, cut thick. Priced by the day.',
          price: 480,
          tags: ['signature', 'spicy'],
          imageUrl: dishPhoto.oysters,
        },
        {
          name: 'Chicken ghee roast',
          description: 'Kundapura style, and properly hot. The board is not exaggerating.',
          price: 380,
          tags: ['spicy', 'signature'],
        },
        {
          name: 'Kori rotti',
          description: 'Assembled at the table so the wafers still snap.',
          price: 320,
          tags: ['spicy'],
        },
        {
          name: 'Neer dosa, three',
          description: 'Rice batter, no fermentation, pressed thin.',
          price: 90,
          tags: ['vegetarian', 'gluten-free'],
        },
      ],
    },
    {
      title: 'To finish',
      items: [
        {
          name: 'Gadbad',
          description: 'The full glass, layered as it should be. Shareable, in theory.',
          price: 180,
          tags: ['vegetarian'],
        },
      ],
    },
  ]),

  menu('rst_thindi', [
    {
      title: 'Chaat counter',
      items: [
        {
          name: 'Masala puri',
          description: 'Peas gravy ladled over crushed puris, onion and sev on top.',
          price: 80,
          tags: ['vegetarian', 'spicy', 'signature'],
          imageUrl: dishPhoto.tacos,
        },
        {
          name: 'Congress kadlekai',
          description: 'Spiced split peanuts. The thing to order while you decide.',
          price: 40,
          tags: ['vegetarian', 'vegan', 'gluten-free'],
        },
        {
          name: 'Dahi puri',
          description: 'Set curd, tamarind, mint. Eaten in one, not two.',
          price: 90,
          tags: ['vegetarian'],
        },
      ],
    },
    {
      title: 'Sweet counter',
      items: [
        {
          name: 'Holige',
          description: 'Made through the afternoon, sold until it runs out, which is early.',
          price: 60,
          tags: ['vegetarian', 'signature'],
        },
        {
          name: 'Badam milk',
          description: 'Served hot in a steel tumbler, saffron on top.',
          price: 70,
          tags: ['vegetarian'],
        },
      ],
    },
  ]),

  menu('rst_kadamba', [
    {
      title: 'The leaf',
      items: [
        {
          name: 'Weekday meals',
          description:
            'Rice, two palyas, sambar, rasam, curd, one sweet. Unlimited except the sweet.',
          price: 220,
          tags: ['vegetarian', 'signature'],
          imageUrl: dishPhoto.curry,
        },
        {
          name: 'Festival meals',
          description: 'Three sweets, obbattu among them. Only on the days it says outside.',
          price: 320,
          tags: ['vegetarian'],
        },
      ],
    },
    {
      title: 'Extra rounds',
      items: [
        {
          name: 'Bisi bele bath',
          description: 'Served with khara boondi that has not been sitting.',
          price: 140,
          tags: ['vegetarian', 'spicy'],
        },
        {
          name: 'Curd rice',
          description: 'Pomegranate, curry leaf tempering. The last round, always.',
          price: 90,
          tags: ['vegetarian', 'gluten-free'],
        },
      ],
    },
  ]),

  menu('rst_emberclay', [
    {
      title: 'From the tandoor',
      items: [
        {
          name: 'Kakori kebab',
          description: 'Minced overnight, cooked on a skewer that never leaves the clay.',
          price: 520,
          tags: ['signature'],
          imageUrl: dishPhoto.steak,
        },
        {
          name: 'Tandoori bhutta malai',
          description: 'Corn kernels in cream and cheese, charred hard.',
          price: 340,
          tags: ['vegetarian'],
        },
        {
          name: 'Sikandari raan',
          description: 'A whole leg, ordered an hour ahead or not at all.',
          price: 1450,
          tags: ['signature'],
        },
      ],
    },
    {
      title: 'Curries and breads',
      items: [
        {
          name: 'Dal Ember',
          description: 'Twenty-four hours over coals. There is no faster version.',
          price: 380,
          tags: ['vegetarian', 'signature'],
        },
        {
          name: 'Laccha paratha',
          description: 'Pulled to order, so it arrives when it arrives.',
          price: 90,
          tags: ['vegetarian'],
        },
      ],
    },
  ]),

  menu('rst_guntur', [
    {
      title: 'Meals',
      items: [
        {
          name: 'Andhra meals, non-veg',
          description: 'Rice, four curries, gongura, and a chilli count printed beside it.',
          price: 320,
          tags: ['spicy', 'signature'],
          imageUrl: dishPhoto.curry,
        },
        {
          name: 'Andhra meals, veg',
          description: 'Same rice, same gongura, no apology.',
          price: 240,
          tags: ['vegetarian', 'spicy'],
        },
      ],
    },
    {
      title: 'Ordered separately',
      items: [
        {
          name: 'Natu kodi pulusu',
          description: 'Country chicken, cooked to order. Thirty minutes, and worth them.',
          price: 460,
          tags: ['spicy', 'signature'],
        },
        {
          name: 'Gongura mutton',
          description: 'Sorrel leaves cut through the fat. Made weekly, sold daily.',
          price: 520,
          tags: ['spicy'],
        },
      ],
    },
  ]),

  menu('rst_backwater', [
    {
      title: 'From the water',
      items: [
        {
          name: 'Karimeen pollichathu',
          description: 'Wrapped in banana leaf, cooked on the pan. Only when it arrives.',
          price: 620,
          tags: ['signature'],
          imageUrl: dishPhoto.oysters,
        },
        {
          name: 'Fish moilee',
          description: 'Coconut milk, green chilli, no chilli powder anywhere near it.',
          price: 420,
          tags: ['gluten-free'],
        },
      ],
    },
    {
      title: 'From four o’clock',
      items: [
        {
          name: 'Appam, two',
          description: 'Batter set that morning. This is why the kitchen will not do them at noon.',
          price: 80,
          tags: ['vegetarian', 'signature'],
        },
        {
          name: 'Kadala curry',
          description: 'Black chana, roasted coconut, the appam’s other half.',
          price: 180,
          tags: ['vegetarian', 'vegan'],
        },
      ],
    },
  ]),

  menu('rst_colonnade', [
    {
      title: 'All day',
      items: [
        {
          name: 'Mutton cutlet',
          description: 'Two, with beetroot salad. On the menu since 1952 and unchanged.',
          price: 260,
          tags: ['signature'],
          imageUrl: dishPhoto.steak,
        },
        {
          name: 'Chicken stew and appam',
          description: 'White pepper, coconut milk, no shortcuts and no colour.',
          price: 340,
          tags: [],
        },
        {
          name: 'Bread pudding',
          description: 'Made in a tray at eleven, gone by three.',
          price: 160,
          tags: ['vegetarian'],
        },
      ],
    },
    {
      title: 'Cold',
      items: [
        {
          name: 'Cold coffee',
          description: 'A tall glass, no ice cream unless you insist.',
          price: 150,
          tags: ['vegetarian', 'signature'],
        },
      ],
    },
  ]),

  menu('rst_filterfoam', [
    {
      title: 'Coffee',
      items: [
        {
          name: 'Estate pourover',
          description: 'Chikmagalur or Coorg, whichever is on. Ask which and why.',
          price: 220,
          tags: ['vegetarian', 'signature'],
          imageUrl: dishPhoto.coffee,
        },
        {
          name: 'Steel filter',
          description: 'The same beans through the other apparatus, and quicker.',
          price: 120,
          tags: ['vegetarian'],
        },
        {
          name: 'Cold brew, sixteen hours',
          description: 'Steeped overnight, served over one large cube.',
          price: 240,
          tags: ['vegetarian', 'vegan'],
        },
      ],
    },
    {
      title: 'Counter',
      items: [
        {
          name: 'Bun maska',
          description: 'The best thing here, and the cheapest. Both facts are known.',
          price: 90,
          tags: ['vegetarian', 'signature'],
        },
        {
          name: 'Ragi banana loaf',
          description: 'Baked daily, denser than it looks.',
          price: 180,
          tags: ['vegetarian'],
        },
      ],
    },
  ]),

  menu('rst_copperkettle', [
    {
      title: 'On tap',
      items: [
        {
          name: 'Coffee stout',
          description: 'Chikmagalur beans in the mash. The reason to come in the evening.',
          price: 380,
          tags: ['signature'],
          imageUrl: dishPhoto.coffee,
        },
        {
          name: 'Wheat, unfiltered',
          description: 'Poured cloudy on purpose. Ask for the orange if you like.',
          price: 340,
          tags: [],
        },
        {
          name: 'Tasting flight, six',
          description: 'Everything on at that moment, in order of weight.',
          price: 690,
          tags: ['signature'],
        },
      ],
    },
    {
      title: 'To eat',
      items: [
        {
          name: 'Ghee roast chicken sliders',
          description: 'Three, with the coast’s spice and a bun that holds.',
          price: 420,
          tags: ['spicy'],
        },
        {
          name: 'Masala fries',
          description: 'Podi, curry leaf, lime. Ordered by every second table.',
          price: 260,
          tags: ['vegetarian'],
        },
      ],
    },
  ]),

  menu('rst_naru', [
    {
      title: 'Counter',
      items: [
        {
          name: 'Omakase, fifteen pieces',
          description: 'Whatever came up from Mangaluru and Kochi that week.',
          price: 4200,
          tags: ['signature'],
          imageUrl: dishPhoto.sushi,
        },
        {
          name: 'Omakase, nine pieces',
          description: 'The shorter sitting, at nine o’clock only.',
          price: 2800,
          tags: ['signature'],
        },
      ],
    },
    {
      title: 'Alongside',
      items: [
        {
          name: 'Sake flight, three',
          description: 'Poured to the course, not to the clock.',
          price: 1900,
          tags: [],
        },
      ],
    },
  ]),

  menu('rst_whitefield', [
    {
      title: 'Village plates',
      items: [
        {
          name: 'Ragi mudde and bassaru',
          description: 'Assembled at the table the first time, without being asked twice.',
          price: 180,
          tags: ['signature', 'gluten-free'],
          imageUrl: dishPhoto.curry,
        },
        {
          name: 'Jolada rotti oota',
          description: 'Sorghum rotti, yennegai, curd. The plate the courtyard was built for.',
          price: 260,
          tags: ['vegetarian'],
        },
        {
          name: 'Nati koli saaru',
          description: 'Sundays only, and the kitchen stops when the birds run out.',
          price: 420,
          tags: ['spicy', 'signature'],
        },
      ],
    },
    {
      title: 'After',
      items: [
        {
          name: 'Kayi holige',
          description: 'Coconut and jaggery, with a spoon of ghee poured on top.',
          price: 120,
          tags: ['vegetarian'],
        },
      ],
    },
  ]),

  menu('rst_sixthcross', [
    {
      title: 'From the oven',
      items: [
        {
          name: 'Honey cake',
          description: 'Sells out most afternoons. No orders taken, no exceptions made.',
          price: 60,
          tags: ['vegetarian', 'signature'],
          imageUrl: dishPhoto.pastry,
        },
        {
          name: 'Dilkhush',
          description: 'Coconut, tutti frutti, and more of both than seems wise.',
          price: 70,
          tags: ['vegetarian'],
        },
        {
          name: 'Khara bun',
          description: 'Green chilli and curry leaf through the dough. Best warm, so come at four.',
          price: 45,
          tags: ['vegetarian', 'spicy'],
        },
      ],
    },
  ]),

  menu('rst_forno', [
    {
      title: 'Pizza',
      items: [
        {
          name: 'Margherita',
          description: 'Two-day dough, four-hundred-degree oven, ninety seconds.',
          price: 480,
          tags: ['vegetarian', 'signature'],
          imageUrl: dishPhoto.pizza,
        },
        {
          name: 'Nduja and honey',
          description: 'Hot, sweet, and the one the kitchen would order.',
          price: 620,
          tags: ['spicy'],
        },
      ],
    },
    {
      title: 'Pasta',
      items: [
        {
          name: 'Cacio e pepe',
          description: 'Three ingredients, so all three have to be right.',
          price: 520,
          tags: ['vegetarian'],
        },
        {
          name: 'Ragu bianco',
          description: 'Cooked out over four hours, no tomato anywhere in it.',
          price: 640,
          tags: [],
        },
      ],
    },
  ]),
];

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
            price: 1200,
            tags: ['signature'],
          },
          {
            name: 'Vegetable plate of the day',
            description: 'Whatever the market had that morning, cooked over fire.',
            price: 420,
            tags: ['vegetarian', 'vegan'],
          },
          {
            name: 'Catch of the day',
            description: 'Priced on the board. Ask the floor what came in.',
            price: 780,
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
            price: 240,
            tags: ['vegetarian'],
          },
        ],
      },
    ],
    currency,
  );
}

export const menuByRestaurantId = new Map(mockMenus.map((m) => [m.restaurantId, m]));

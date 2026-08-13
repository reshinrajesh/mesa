/**
 * Photography.
 *
 * Mock imagery is remote so the repo stays small and the app boots without a
 * download step. Every consumer renders through `RestaurantImage`, which falls
 * back to a typographic monogram card if a URL fails — a broken photo must
 * never leave a grey rectangle in a design that leans this hard on imagery.
 */

const UNSPLASH = 'https://images.unsplash.com/photo-';

function photo(id: string, width = 1200): string {
  return `${UNSPLASH}${id}?auto=format&fit=crop&w=${width}&q=80`;
}

/** Curated pools, grouped so a venue's gallery stays tonally coherent. */
export const imagePool = {
  fineDining: [
    photo('1517248135467-4c7edcad34c4'),
    photo('1414235077428-338989a2e8c0'),
    photo('1552566626-52f8b828add9'),
    photo('1424847651672-bf20a4b0982b'),
  ],
  trattoria: [
    photo('1555396273-367ea4eb4db5'),
    photo('1565299624946-b28f40a0ae38'),
    photo('1498579150354-977475b7ea0b'),
    photo('1481931098730-318b6f776db0'),
  ],
  cafe: [
    photo('1554118811-1e0d58224f24'),
    photo('1559339352-11d035aa65de'),
    photo('1501339847302-ac426a4a7cbb'),
    photo('1509042239860-f550ce710b93'),
  ],
  bakery: [
    photo('1509440159596-0249088772ff'),
    photo('1608198093002-ad4e005484ec'),
    photo('1486427944299-d1955d23e34d'),
    photo('1517433670267-08bbd4be890f'),
  ],
  japanese: [
    photo('1579584425555-c3ce17fd4351'),
    photo('1553621042-f6e147245754'),
    photo('1617196034796-73dfa7b1fd56'),
    photo('1580822184713-fc5400e7fe10'),
  ],
  seafood: [
    photo('1544943910-4c1dc44aab44'),
    photo('1559737558-2f5a35f4523b'),
    photo('1519708227418-c8fd9a32b7a2'),
    photo('1467003909585-2f8a72700288'),
  ],
  indian: [
    photo('1585937421612-70a008356fbe'),
    photo('1517244683847-7456b63c5969'),
    photo('1631452180519-c014fe946bc7'),
    photo('1596797038530-2c107229654b'),
  ],
  bistro: [
    photo('1466978913421-dad2ebd01d17'),
    photo('1600891964092-4316c288032e'),
    photo('1414235077428-338989a2e8c0'),
    photo('1541557435984-1c79685a082b'),
  ],
  bar: [
    photo('1470337458703-46ad1756a187'),
    photo('1514933651103-005eec06c04b'),
    photo('1551024709-8f23befc6f87'),
    photo('1572116469696-31de0f17cc34'),
  ],
  mexican: [
    photo('1565299585323-38d6b0865b47'),
    photo('1552332386-f8dd00dc2f85'),
    photo('1613514785940-daed07799d9b'),
    photo('1504544750208-dc0358e63f7f'),
  ],
  thai: [
    photo('1559314809-0d155014e29e'),
    photo('1562565652-a0d8f0c59eb4'),
    photo('1455619452474-d2be8b1e70cd'),
    photo('1543826173-70651703c5a4'),
  ],
  mediterranean: [
    photo('1544025162-d76694265947'),
    photo('1540189549336-e6e99c3679fe'),
    photo('1529042410759-befb1204b468'),
    photo('1476224203421-9ac39bcb3327'),
  ],
  korean: [
    photo('1580651315530-69c8e0026377'),
    photo('1590301157890-4810ed352733'),
    photo('1553163147-622ab57be1c7'),
    photo('1498654896293-37aacf113fd9'),
  ],
  vegetarian: [
    photo('1512621776951-a57141f2eefd'),
    photo('1546069901-ba9599a7e63c'),
    photo('1490645935967-10de6ba17061'),
    photo('1466637574441-749b8f19452f'),
  ],
} as const;

export const dishPhoto = {
  pasta: photo('1621996346565-e3dbc646d9a9', 600),
  pizza: photo('1513104890138-7c749659a591', 600),
  steak: photo('1600891964092-4316c288032e', 600),
  sushi: photo('1579871494447-9811cf80d66c', 600),
  ramen: photo('1569718212165-3a8278d5f624', 600),
  curry: photo('1585937421612-70a008356fbe', 600),
  salad: photo('1512621776951-a57141f2eefd', 600),
  coffee: photo('1495474472287-4d71bcdd2085', 600),
  pastry: photo('1509440159596-0249088772ff', 600),
  oysters: photo('1573225342350-16731dd9bf3d', 600),
  tacos: photo('1565299585323-38d6b0865b47', 600),
  dessert: photo('1551024506-0bccd828d307', 600),
};

export const avatarPhoto = [
  photo('1494790108377-be9c29b29330', 200),
  photo('1500648767791-00dcc994a43e', 200),
  photo('1438761681033-6461ffad8d80', 200),
  photo('1507003211169-0a1dd7228f2d', 200),
  photo('1544005313-94ddf0286df2', 200),
  photo('1531427186611-ecfd6d936c79', 200),
];

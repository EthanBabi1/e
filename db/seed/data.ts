export const CLASSES = [
  { name: "Kid Kart", minAge: 5, maxAge: 6, baseLapMs: 46000 },
  { name: "Cadet", minAge: 7, maxAge: 9, baseLapMs: 42000 },
  { name: "Junior Sportsman", minAge: 10, maxAge: 15, baseLapMs: 37500 },
  { name: "Senior Sportsman", minAge: 16, maxAge: 39, baseLapMs: 34000 },
  { name: "Masters", minAge: 40, maxAge: 58, baseLapMs: 35500 },
] as const;

// Generic placeholder names for fictional seed racers — not modeled on any
// real person. Every record generated from this pool is flagged
// `isFictionalDemo: true` and rendered with a demo watermark (rule 4).
export const FIRST_NAMES = [
  "Avery", "Mason", "Ella", "Logan", "Chloe", "Owen", "Grace", "Wyatt",
  "Nora", "Elliot", "Harper", "Jasper", "Willa", "Miles", "Ruby", "Silas",
  "Ivy", "Finn", "Sadie", "Theo", "Maya", "Cole", "Piper", "Reid",
  "Adelyn", "Beau", "Sloane", "Rhett", "Wren", "Ezra", "June", "Asher",
  "Nova", "Dash", "Tessa", "Rocco", "Marlowe", "Gus", "Freya", "Knox",
];

export const LAST_NAMES = [
  "Whitaker", "Bell", "Marsh", "Novak", "Doyle", "Preston", "Locke",
  "Sawyer", "Kessler", "Hartman", "Pierce", "Blackwood", "Sinclair",
  "Vance", "Dunmore", "Ashby", "Corwin", "Fenwick", "Hollis", "Radcliffe",
  "Farrow", "Quade", "Winslet", "Merrow", "Cobb", "Larkin", "Osei",
  "Dubois", "Iverson", "Castellan", "Brandt", "Ochoa", "Whitfield",
  "Alderman", "Pemberton", "Strand", "Voss", "Kilbride", "Sorrel", "Byrne",
];

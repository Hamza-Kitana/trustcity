/** القائمة الأولية (كما في الموقع قبل التخزين الديناميكي) — بدون معرفات */
export type StreamerSeedRow = {
  name: string;
  role: string;
  bio: string;
  streamUrl: string;
  image: string;
};

export const STREAMERS_SEED: StreamerSeedRow[] = [
  {
    name: "F-0",
    role: "صانع محتوى معتمد",
    bio: "بث مباشر على Kick.",
    streamUrl: "https://kick.com/alshayeeb1",
    image: "/hg.webp",
  },
  {
    name: "F-1",
    role: "صانع محتوى معتمد",
    bio: "بث مباشر على Kick.",
    streamUrl: "https://kick.com/ayla-ab",
    image: "/54aa9fff-9262-404a-ae4b-116542f7d571-fullsize.webp",
  },
  {
    name: "جون سميث",
    role: "صانع محتوى معتمد",
    bio: "بث مباشر على Kick.",
    streamUrl: "https://kick.com/produbai",
    image: "/02685ed8-6c04-4c89-993c-06f81df59b63-fullsize.webp",
  },
  {
    name: "جون سيرا",
    role: "صانع محتوى معتمد",
    bio: "بث مباشر على Kick.",
    streamUrl: "https://kick.com/quabeh",
    image: "/image-6-1.png",
  },
  {
    name: "اسمر",
    role: "صانع محتوى معتمد",
    bio: "بث مباشر على Kick.",
    streamUrl: "https://kick.com/1asmar1",
    image: "/bb8acb02-b4d0-44d0-820e-569b7cf67b03-fullsize.webp",
  },
  {
    name: "ابو عرب",
    role: "صانع محتوى معتمد",
    bio: "بث مباشر على Kick.",
    streamUrl: "https://kick.com/k1krm",
    image: "/4cf98d7e-34fd-4f84-ac21-643fb80d5b82-fullsize.webp",
  },
  {
    name: "النور",
    role: "صانع محتوى معتمد",
    bio: "بث مباشر على Kick.",
    streamUrl: "https://kick.com/al-nooor",
    image: "/c02263ea-636d-43bb-a7f0-abeee47f8a6d-fullsize.webp",
  },
  {
    name: "عمر صلاحات",
    role: "صانع محتوى معتمد",
    bio: "بث مباشر على Kick.",
    streamUrl: "https://kick.com/salahat8",
    image: "/5ae78459-1a81-4c71-9113-f54a2e73c266-fullsize.webp",
  },
  {
    name: "كوسوفي",
    role: "صانع محتوى معتمد",
    bio: "بث مباشر على Kick.",
    streamUrl: "https://kick.com/ogxkosovy",
    image: "/e670f797-a27c-4f78-b237-778c4bb4b43d-fullsize_1.webp",
  },
  {
    name: "ريكسن",
    role: "صانع محتوى معتمد",
    bio: "بث مباشر على Kick.",
    streamUrl: "https://kick.com/ryxenx",
    image: "/58354d06-4da1-4a93-a091-1b89f7fe65e0-fullsize.webp",
  },
  {
    name: "برلين",
    role: "صانع محتوى معتمد",
    bio: "بث مباشر على Kick.",
    streamUrl: "https://kick.com/br-berlin",
    image: "/bb0cfddc-f84e-4916-a3d9-0a6e40f98c22-fullsize.webp",
  },
  {
    name: "ابو العبد",
    role: "صانع محتوى معتمد",
    bio: "بث مباشر على Kick.",
    streamUrl: "https://kick.com/aboel3abed",
    image: "/99d0feb3-1054-4f3c-8f62-149bbc80663d-fullsize.webp",
  },
  {
    name: "دارك انجل",
    role: "صانع محتوى معتمد",
    bio: "بث مباشر على Kick.",
    streamUrl: "https://kick.com/adnanko",
    image: "/c28eea64-9bbf-4772-976e-9a1f889293e0-fullsize.webp",
  },
  {
    name: "دونقل",
    role: "صانع محتوى معتمد",
    bio: "بث مباشر على Kick.",
    streamUrl: "https://kick.com/don9ol",
    image: "/cb920be8-f314-433b-a4e4-a1c41e52775f-fullsize.webp",
  },
  {
    name: "سوبزي",
    role: "صانع محتوى معتمد",
    bio: "بث مباشر على Kick.",
    streamUrl: "https://kick.com/subzi-tv",
    image: "/a077cb35-ee9d-42e0-9564-0d12d3a40b52-fullsize.webp",
  },
  {
    name: "جيمس مورفي",
    role: "صانع محتوى معتمد",
    bio: "بث مباشر على Kick.",
    streamUrl: "https://kick.com/kazroo",
    image: "/7b26fe2e-373a-42cf-be4c-1ed4e465d488-fullsize.webp",
  },
  {
    name: "حربيش",
    role: "صانع محتوى معتمد",
    bio: "بث مباشر على Kick.",
    streamUrl: "https://kick.com/harbash12",
    image: "/9f018b3a-2793-4749-b5b3-bab3ecb8e830-fullsize.webp",
  },
  {
    name: "ابو يوسف",
    role: "صانع محتوى معتمد",
    bio: "بث مباشر على Kick.",
    streamUrl: "https://kick.com/abuyousef1",
    image: "/trustLogo.png",
  },
];

const PRIORITY_NAMES = ["جيمس مورفي", "ابو يوسف"] as const;

/** نفس ترتيب العرض السابق: الأولويتان ثم البقية */
export function getOrderedSeed(): StreamerSeedRow[] {
  const names = new Set<string>(PRIORITY_NAMES);
  const priority = PRIORITY_NAMES.map((n) => STREAMERS_SEED.find((s) => s.name === n)).filter(
    (x): x is StreamerSeedRow => Boolean(x),
  );
  const rest = STREAMERS_SEED.filter((s) => !names.has(s.name));
  return [...priority, ...rest];
}

import type { ChromaGridItem } from "@/components/ChromaGrid";
import type { RosterPerson } from "@/components/InstitutionRoster";

export type InstitutionRosterData = {
  leader: RosterPerson;
  deputy: RosterPerson;
  members: (ChromaGridItem & { hidden?: boolean })[];
};

const g =
  (from: string, to = "#000") =>
  (deg: number) =>
    `linear-gradient(${deg}deg, ${from}, ${to})`;

/** صور مبدئية متميزة لكل عضو (pravatar) */
const face = (n: number) => `https://i.pravatar.cc/400?img=${n}`;

/** وزارة الصحة (طاقم الإسعاف والطوارئ) */
export const healthRoster: InstitutionRosterData = {
  leader: {
    name: "الوزير سيراف",
    title: "وزير الصحة",
    image: "https://images.unsplash.com/photo-1612276529731-4b21494e6d71?auto=format&fit=crop&w=500&q=80",
    tagline: "المسؤول الأول عن ملف الصحة والإسعاف وجودة الاستجابة الطبية في المدينة.",
    bio: "يشرف على استراتيجية الطوارئ والمستشفيات الميدانية، ويتابع جاهزية طاقم الإسعاف والمعدات والمركبات مع تقارير أداء دورية أمام الإدارة العليا.",
    highlights: [
      "إقرار السياسات الصحية ولائحة الإسعاف وتمويل الوحدات الطبية.",
      "التنسيق مع غرفة عمليات الإسعاف والمستشفيات في الحالات الحرجة.",
      "تمثيل قطاع الصحة أمام المؤسسات الحكومية الأخرى في المدينة.",
    ],
  },
  deputy: {
    name: "المسعف ريسكيو",
    title: "نائب وزير الصحة",
    image: "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=500&q=80",
    tagline: "الإشراف التنفيذي على الإسعاف الميداني وبروتوكولات الطوارئ.",
    bio: "يدعم وزير الصحة في الإنعاش والحالات الحرجة؛ يخلفه في غيابه ويرفع تقارير الأداء وتدريب المسعفين ومتابعة زمن الاستجابة في كل منطقة.",
    highlights: [
      "تطبيق بروتوكولات الإنعاش والإسعاف الأولي على مستوى المدينة.",
      "إشراف ورش الطوارئ للطاقم الجديد ومتابعة المناوبات الليلية.",
      "رفع تقارير مجدولة لوزير الصحة حول جودة الخدمة الميدانية.",
    ],
  },
  members: [
    { image: face(12), title: "المسعف ميدك", subtitle: "مسعف ميداني — استجابة سريعة", borderColor: "#10B981", gradient: g("#059669")(145) },
    { image: face(47), title: "المسعفة هيلث", subtitle: "أخصائية إسعاف — فرز الحالات", borderColor: "#34D399", gradient: g("#047857")(165) },
    { image: face(33), title: "المسعف بولس", subtitle: "إخلاء وإنعاش — وحدة ألفا", borderColor: "#6EE7B7", gradient: g("#047857")(155) },
    { image: face(59), title: "المسعفة نورا", subtitle: "تمريض طوارئ — تعزيز عيادة", borderColor: "#5EEAD4", gradient: g("#0D9488")(170) },
    { image: face(45), title: "المسعف ستيريل", subtitle: "معدات وحدة الإنعاش المتقدم", borderColor: "#2DD4BF", gradient: g("#0F766E")(140) },
    { image: face(32), title: "المسعف كيو آر", subtitle: "استجابة مناطق الشمال", borderColor: "#34D399", gradient: g("#065F46")(160) },
    { image: face(68), title: "المسعفة ياسمين", subtitle: "فرز طبي — مناوبة ليلية", borderColor: "#A7F3D0", gradient: g("#059669")(175) },
    { image: face(27), title: "المسعف رايدر", subtitle: "إخلاء مركبات وساحات", borderColor: "#10B981", gradient: g("#065F46")(130) },
    { image: face(44), title: "المسعفة ليلى", subtitle: "توثيق حالات وERP طبي", borderColor: "#6EE7B7", gradient: g("#047857")(185) },
    { image: face(52), title: "المسعف تراكر", subtitle: "تنسيق مع الشرطة — كوارث", borderColor: "#34D399", gradient: g("#0F766E")(195) },
  ],
};

/** القيادة العليا لوزارة الداخلية — صفحة النظرة العامة فقط */
export const interiorMinistryOverview: InstitutionRosterData = {
  leader: {
    name: "الوزير فـالكون",
    title: "وزير الداخلية",
    image: "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=500&q=80",
    tagline: "القيادة العليا للمنظومة الأمنية وغرفة العمليات ولجان الانضباط.",
    bio: "يرأس التخطيط الأمني العام وغرفة العمليات المركزية، ويتابع جاهزية الشرطة والشيرف والاستخبارات والمارينز بالتنسيق مع الإدارة العليا.",
    highlights: [
      "اعتماد السياسات الأمنية وخطط المطاردات والكمائن وفق لوائح المدينة.",
      "الإشراف على التنسيق بين أذرع وزارة الداخلية الأربعة.",
      "تمثيل الوزارة أمام باقي الفصائل الحكومية.",
    ],
  },
  deputy: {
    name: "الضابط فانتوم",
    title: "نائب وزير الداخلية",
    image: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=500&q=80",
    tagline: "التنفيذ اليومي للملفات الأمنية الحرجة وسياسات التدريب بين الأذرع.",
    bio: "يدعم وزير الداخلية في متابعة الأذرع التشغيلية، والبلاغات الساخنة، والانضباط والتدريب المشترك بين الشرطة والشيرف والـ CIA والمارينز.",
    highlights: [
      "متابعة جاهزية الأذرع الأربعة والموارد المشتركة.",
      "تنسيق الاستجابة للأحداث الكبرى والعمليات المشتركة.",
      "ورش تدريب دورية مع قادة الأقسام.",
    ],
  },
  members: [],
};

/** فرع الشرطة (LSPD) */
export const policeDepartmentRoster: InstitutionRosterData = {
  leader: {
    name: "العقيد أطلس",
    title: "قائد شرطة المدينة",
    image: "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=500&q=80",
    tagline: "الإشراف على الدوريات والبلاغات المدنية وغرفة عمليات LSPD.",
    bio: "يقود جهاز الشرطة الحضرية: توزيع الدوريات، المطاردات، والتعامل مع الجرائم اليومية وفق تعليمات وزارة الداخلية.",
    highlights: [
      "اعتماد خطط الدوريات والاشتباك وفق لوائح المدينة.",
      "ربط غرفة العمليات مع باقي أذرع الوزارة عند الحاجة.",
      "متابعة الانضباط والتحقيقات الداخلية للضباط.",
    ],
  },
  deputy: {
    name: "الرائد رادار",
    title: "نائب قائد الشرطة",
    image: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=500&q=80",
    tagline: "البلاغات الساخنة والاستجابة السريعة وتدريب الضباط الميدانيين.",
    bio: "يدعم القائد في إدارة البلاغات الحرجة، وتفعيل فرق الاستجابة، ورصد الأداء اليومي للدوريات.",
    highlights: [
      "تنسيق الاستجابة مع الشيرف والمارينز في العمليات المشتركة.",
      "متابعة الدوريات الليلية والمناطق الحساسة.",
    ],
  },
  members: [
    { image: face(15), title: "الضابط أطلس", subtitle: "مقدم — انتشار ميداني", borderColor: "#22D3EE", gradient: g("#0891B2")(160) },
    { image: face(13), title: "الضابط رادار", subtitle: "نقيب — بلاغات ساخنة", borderColor: "#38BDF8", gradient: g("#0284C7")(195) },
    { image: face(17), title: "الضابط فايبر", subtitle: "ملازم أول — استجابة سريعة", borderColor: "#67E8F9", gradient: g("#0E7490")(210) },
  ],
};

/** فرع الشيرف (Sheriff) */
export const sheriffDepartmentRoster: InstitutionRosterData = {
  leader: {
    name: "مارشال",
    title: "قائد الشيرف",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80",
    tagline: "المناطق الفاتحة والطرق السريعة والدعم الميداني للشرطة الحضرية.",
    bio: "يقود قوات الشيرف في الدوريات الريفية والمطارات البعيدة، والملاحقة طويلة المدى، والتنسيق مع تحقيقات المخدرات والعصابات.",
    highlights: [
      "إدارة السيطرة على الطرق والكمائن خارج النواة الحضرية.",
      "التنسيق مع الشرطة في العمليات المشتركة.",
      "تطبيق لوائح السجن والنقل تحت الحراسة.",
    ],
  },
  deputy: {
    name: "غريفز",
    title: "نائب الشيرف",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=500&q=80",
    tagline: "الاستجابة للبلاغات النائية وتأمين المواقع الكبرى.",
    bio: "يدعم قائد الشيرف في توزيع الوحدات الميدانية والدوريات الليلية في الأطراف، ومتابعة فرق SWAT التابعة للشرف.",
    highlights: [
      "تفعيل فرق التكتيك عند الأحداث الكبرى.",
      "المراجعة الدورية لخطط الطوارئ في المقاطعة.",
    ],
  },
  members: [
    { image: face(51), title: "نائب كوانتم", subtitle: "دوريات مقاطعة — يومي", borderColor: "#A5F3FC", gradient: g("#155E75")(135) },
    { image: face(60), title: "المفتش غوست", subtitle: "SWAT — أزمات ومفاوضات", borderColor: "#38BDF8", gradient: g("#0369A1")(175) },
    { image: face(31), title: "المحققة ستيلا", subtitle: "مخدرات وتحري مقاطعة", borderColor: "#22D3EE", gradient: g("#0E7490")(165) },
  ],
};

/** فرع الاستخبارات (CIA) */
export const ciaDepartmentRoster: InstitutionRosterData = {
  leader: {
    name: "المدير أومبرا",
    title: "مدير هيئة الاستخبارات",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=500&q=80",
    tagline: "جمع المعلومات، العمليات الخفية، والتنسيق مع القيادة السياسية.",
    bio: "يرأس جهاز الاستخبارات الداخلي والخارجي للمدينة: مصادر، مراقبة، وتحليل التهديدات قبل تصعيدها ميدانياً.",
    highlights: [
      "اعتماد تقارير التهديد والتنسيق مع الشرطة والمارينز.",
      "حماية سرية العمليات والمصادر.",
    ],
  },
  deputy: {
    name: "نائب المديرة فيكتوريا",
    title: "نائب مدير الاستخبارات",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=500&q=80",
    tagline: "التحليل الاستخباراتي والربط مع غرف العمليات.",
    bio: "تشرف على فرق التحليل، توثيق الأدلة الاستخباراتية، وتمرير التنبيهات الحرجة للأذرع التنفيذية.",
    highlights: [
      "إدارة غرفة التحليل والربط مع LSPD.",
      "متابعة الجرائم المنظمة والعصابات.",
    ],
  },
  members: [
    { image: face(46), title: "العميل برايفت", subtitle: "مراقبة ومطاردات استخباراتية", borderColor: "#67E8F9", gradient: g("#155E75")(150) },
    { image: face(55), title: "المحلل هيلكس", subtitle: "استخبارات ميدانية — تغطية ليلية", borderColor: "#7DD3FC", gradient: g("#0369A1")(140) },
  ],
};

/** قيادة وزارة الداخلية — صفحة المركز /interior */
export const interiorMinistryHubRoster: InstitutionRosterData = {
  leader: {
    name: "الوزير كايدن",
    title: "وزير الداخلية",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=500&q=80",
    tagline: "الإشراف على أذرع الوزارة: الشرطة، الشيرف، الاستخبارات، المارينز، وFPI.",
    bio: "يمثل القيادة السياسية والتنظيمية لوزارة الداخلية، ويوجّه التوازن بين الأجهزة الأمنية ويُقرّر فتح الملفات الحساسة بين الفروع.",
    highlights: [
      "اعتماد السياسات العامة وتنسيق الأزمات الكبرى بين الأذرع.",
      "متابعة التعيينات القيادية ومعايير الانضباط المؤسسي.",
    ],
  },
  deputy: {
    name: "نائب الوزير لينا",
    title: "نائب وزير الداخلية",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=500&q=80",
    tagline: "تنسيق العمليات المشتركة وغرف التنسيق بين LSPD والشيرف وFPI.",
    bio: "تدير اجتماعات القيادة الأسبوعية، وتتابع تنفيذ قرارات الوزير، وتضمن تواصل الأذرع الخمسة في الملفات العابرة للحدود.",
    highlights: [
      "ربط غرف العمليات بين الشرطة وFPI في التحقيقات المعقّدة.",
      "متابعة مؤشرات الأداء والبلاغات الحرجة على مستوى الوزارة.",
    ],
  },
  members: [
    { image: face(40), title: "مستشار أمني", subtitle: "تنسيق سياسات — داخلي", borderColor: "#38BDF8", gradient: g("#1E3A8A")(170) },
    { image: face(48), title: "منسق أزمات", subtitle: "غرفة تنسيق وزارية", borderColor: "#67E8F9", gradient: g("#0C4A6E")(160) },
  ],
};

/** فرع FPI — التحقيق الفدرالي / الوحدة التحقيقية */
export const fpiDepartmentRoster: InstitutionRosterData = {
  leader: {
    name: "العميد فانكس",
    title: "قائد FPI",
    image: "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=500&q=80",
    tagline: "التحقيقات الفدرالية، الملفات المعقّدة، والتنسيق مع الادعاء والشرطة.",
    bio: "يقود وحدة FPI في متابعة الجرائم المنظمة، الاحتيال، والقضايا العابرة للأجهزة، مع صلاحيات تحقيق موسّعة ضمن إطار الوزارة.",
    highlights: [
      "اعتماد بروتوكولات التحقيق والأدلة الجنائية.",
      "التنسيق مع LSPD والشيرف في القضايا المشتركة.",
      "إدارة فرق الاختصاص والتحليل الجنائي.",
    ],
  },
  deputy: {
    name: "الرائد ساين",
    title: "نائب قائد FPI",
    image: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=500&q=80",
    tagline: "غرفة التحقيقات، إدارة الوكلاء الميدانيين، ومتابعة الملفات المفتوحة.",
    bio: "يدعم القائد في توزيع القضايا، مراجعة التقارير الاستخباراتية، وضمان التزام الفرق بمعايير السرية والإجراء.",
    highlights: [
      "متابعة سلسلة الحراسة للأدلة والشهود.",
      "تفعيل فرق الاستجابة السريعة للتحقيق.",
    ],
  },
  members: [
    { image: face(22), title: "الوكيل فولت", subtitle: "تحقيق ميداني — قضايا كبرى", borderColor: "#FB7185", gradient: g("#9F1239")(175) },
    { image: face(33), title: "المحققة نوفا", subtitle: "تحليل أدلة وجنائي", borderColor: "#FDA4AF", gradient: g("#BE123C")(165) },
    { image: face(44), title: "الوكيل غراي", subtitle: "تنسيق مع الادعاء", borderColor: "#FB7185", gradient: g("#881337")(155) },
  ],
};

/** فرع المارينز */
export const marinesDepartmentRoster: InstitutionRosterData = {
  leader: {
    name: "العقيد ستيل ثندر",
    title: "قائد كتيبة المارينز",
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=500&q=80",
    tagline: "العمليات العسكرية الثقيلة، التأمين، والدعم في الأزمات الكبرى.",
    bio: "يقود قوات المارينز في التدخل عند التصعيد العسكري، حماية المنشآت الحساسة، ودعم الشرطة في العمليات عالية الخطورة.",
    highlights: [
      "تخطيط العمليات التكتيكية والاشتباك المنضبط.",
      "التنسيق مع الاستخبارات والـ SWAT عند الحاجة.",
    ],
  },
  deputy: {
    name: "الميجور ستورم",
    title: "نائب القائد العسكري",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80",
    tagline: "التدريب القتالي والاستجابة السريعة للكتيبة.",
    bio: "يدعم القائد في جاهزية الوحدات، التدريبات المشتركة، وتوزيع القوات في الميدان.",
    highlights: [
      "إدارة نقاط التفتيش العسكرية والطوارئ.",
      "متابعة المعدات والعتاد الحساس.",
    ],
  },
  members: [
    { image: face(26), title: "الرقيب رايفن", subtitle: "غرفة عمليات — تنسيق نيران", borderColor: "#38BDF8", gradient: g("#0C4A6E")(185) },
    { image: face(61), title: "العريف كروس", subtitle: "أمن منشآت وتأمين مواقع", borderColor: "#A5F3FC", gradient: g("#164E63")(155) },
  ],
};

/** توافق مع الروابط القديمة — استخدم healthRoster */
export const emsRoster = healthRoster;

export const oversightRoster: InstitutionRosterData = {
  leader: {
    name: "المراقب أوريون",
    title: "رئيس مؤسسة الرقابة",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=500&q=80",
    tagline: "ضمان الجودة، الشفافية، وتطبيق اللوائح على الجميع بالتساوي.",
    bio: "يضع معايير الجودة والمساءلة، ويعتمد تقارير التدقيق الصادرة عن الفرق الميدانية، ويتابع تنفيذ القرارات الإدارية مع الإدارة العليا للمدينة.",
    highlights: [
      "اعتماد معايير تقييم الأداء للفصائل والموظفين المعتمدين.",
      "مراجعة البلاغات الجماعية والشكاوى المعقدة قبل الإحالة النهائية.",
      "الإشراف على سياسات الخصوصية وسرية بيانات التحقيق.",
    ],
  },
  deputy: {
    name: "المراقبة فاليري",
    title: "نائب رئيس المؤسسة",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=500&q=80",
    tagline: "تنسيق المراجعات الميدانية ومتابعة التزام الفصائل بالسياسات.",
    bio: "تتابع التزام الفصائل بالسياسات، وتنسق جلسات المراجعة مع الإدارة العليا، وتضمن وصول التقارير الدورية في الوقت المحدد.",
    highlights: [
      "جدولة مراجعات دورية لكل قسم مع تقارير ملخصة للرئيس.",
      "متابعة تنفيذ توصيات التدقيق وإغلاق الملفات المعلقة.",
      "بناء جسور تواصل بين الرقابة والمجتمع اللاعبين للشفافية.",
    ],
  },
  members: [
    { image: face(11), title: "المحقق سترايك", subtitle: "تدقيق بلاغات اللاعبين", borderColor: "#F59E0B", gradient: g("#D97706")(150) },
    { image: face(14), title: "المراجع كلاود", subtitle: "تحليل أداء الأقسام", borderColor: "#FBBF24", gradient: g("#B45309")(175) },
    { image: face(56), title: "المدقق نكسس", subtitle: "توثيق المخالفات", borderColor: "#FCD34D", gradient: g("#92400E")(190) },
    { image: face(38), title: "المراقب إيكو", subtitle: "مراجعات ميدانية — عصابات", borderColor: "#FB923C", gradient: g("#C2410C")(165) },
    { image: face(49), title: "المدققة روز", subtitle: "جودة تقارير الإدارات", borderColor: "#F59E0B", gradient: g("#B45309")(155) },
    { image: face(67), title: "المحقق فيموس", subtitle: "بلاغات تجمعات وباندات", borderColor: "#FBBF24", gradient: g("#92400E")(170) },
    { image: face(36), title: "المراجع آرك", subtitle: "لوائح RP وسيناريوهات", borderColor: "#FCD34D", gradient: g("#D97706")(180) },
    { image: face(43), title: "المدققة لينا", subtitle: "شكاوى لاعبين وتوثيق", borderColor: "#FB923C", gradient: g("#9A3412")(160) },
    { image: face(57), title: "المراقب درفت", subtitle: "أداء الشرطة والإسعاف", borderColor: "#F59E0B", gradient: g("#78350F")(175) },
    { image: face(29), title: "المحقق نوفايت", subtitle: "تراخيص ومخالفات إدارية", borderColor: "#FBBF24", gradient: g("#B45309")(145) },
  ],
};

export const lawyerRoster: InstitutionRosterData = {
  leader: {
    name: "المحامي جاستس",
    title: "رئيس هيئة المحاماة — وزارة العدل",
    image: "https://images.unsplash.com/photo-1555374018-13a8994ab246?auto=format&fit=crop&w=500&q=80",
    tagline: "استراتيجية الدفاع في القضايا الكبرى وتمثيل الموكلين بثقة.",
    bio: "يقود استراتيجية الدفاع والقضايا الكبرى، ويعتمد المذكرات الرئيسية أمام المحاكم، ويحدد سياسة المكتب في القضايا الإعلامية والحساسة.",
    highlights: [
      "اختيار فرق المرافعة وتوجيه الخط الدفاعي في القضايا الطويلة.",
      "اعتماد الصلحيات والعروض الرسمية أمام النيابة والمحكمة.",
      "تمثيل هيئة المحاماة في الاجتماعات مع القضاء والنيابة والأجهزة الأمنية.",
    ],
  },
  deputy: {
    name: "المحامية فيرديكت",
    title: "نائب رئيس هيئة المحاماة",
    image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=500&q=80",
    tagline: "الدعاوى الجنائية، الأدلة، والمرافعات الثانوية والاستئناف.",
    bio: "مسؤولة عن الدعاوى الجنائية والتنسيق مع فرق الأدلة والمرافعات الثانوية؛ تخلف الرئيس في الجلسات الحرجة وتتابع جودة المذكرات الفنية.",
    highlights: [
      "مراجعة الأدلة والخبراء قبل تقديمها في الجلسات.",
      "إدارة ملفات الاستئناف والطعون ضمن وزارة العدل.",
      "دورات توجيهية للمحامين الجدد حول أسلوب المرافعة في المدينة.",
    ],
  },
  members: [
    { image: face(18), title: "المحامي لو أند أوردر", subtitle: "مرافعات وجلسات", borderColor: "#EA580C", gradient: g("#C2410C")(155) },
    { image: face(41), title: "المحامية كاونسيل", subtitle: "استشارات وقضايا مدنية", borderColor: "#FB923C", gradient: g("#9A3412")(175) },
    { image: face(54), title: "المحامي ديفنس", subtitle: "دفاع جنائي أول", borderColor: "#EA580C", gradient: g("#B45309")(165) },
    { image: face(34), title: "المحامية آيلا", subtitle: "عقود وتأسيس شركات", borderColor: "#F97316", gradient: g("#C2410C")(170) },
    { image: face(62), title: "المحامي بروتو", subtitle: "تمثيل أمام النيابة", borderColor: "#FB923C", gradient: g("#9A3412")(160) },
    { image: face(28), title: "المحامية فيرا", subtitle: "تعويضات ومدني", borderColor: "#EA580C", gradient: g("#78350F")(180) },
    { image: face(50), title: "المحامي كلايم", subtitle: "قضايا شرطة وانتهاكات", borderColor: "#F97316", gradient: g("#B45309")(150) },
    { image: face(23), title: "المحامي أوربان", subtitle: "جرائم منظمات وعصابات", borderColor: "#FB923C", gradient: g("#C2410C")(185) },
    { image: face(66), title: "المحامية نكسس", subtitle: "استئناف وطعون", borderColor: "#EA580C", gradient: g("#9A3412")(175) },
    { image: face(40), title: "المحامي سيف", subtitle: "استشارات عاجلة 24/7", borderColor: "#F97316", gradient: g("#B45309")(195) },
  ],
};

export const developerRoster: InstitutionRosterData = {
  leader: {
    name: "المبرمج آرتكس",
    title: "رئيس مؤسسة المبرمجين",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500&q=80",
    tagline: "خارطة الطريق التقنية، الجودة، والاستقرار بين السكربت والبنية.",
    bio: "يدير خارطة الطريق التقنية، جودة الإصدارات، وتنسيق الفرق بين السكربت والبنية؛ يعتمد معايير المراجعة قبل أي إطلاق على البيئة الحية.",
    highlights: [
      "اعتماد الإصدارات الرئيسية والتنسيق مع الإدارة حول الأولويات.",
      "سياسات الأمان العامة للقواعد والواجهات الحساسة.",
      "حوكمة Git والفروع وفريق الطوارئ عند الأعطال الحرجة.",
    ],
  },
  deputy: {
    name: "المبرمجة نيكست",
    title: "نائب رئيس المؤسسة",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=80",
    tagline: "CI، المراجعة الآلية، الأمان، ومتابعة الأداء بعد كل تحديث.",
    bio: "مسؤولة عن CI والمراجعة، الأمان، ومتابعة الأداء والاستقرار بعد كل تحديث؛ تتابع سجلات الأخطاء وتنسق مع السيرفر لإصلاحات الطوارئ.",
    highlights: [
      "إدارة خط أنابيب البناء والاختبار قبل الدمج للفرع الرئيسي.",
      "مراقبة الموارد والاستجابة الزمنية بعد النشرات الكبرى.",
      "جلسات ما بعد الحادث مع الفريق لتوثيق الأسباب والحلول.",
    ],
  },
  members: [
    { image: face(16), title: "سكربت كور", subtitle: "FiveM / Lua", borderColor: "#FB7185", gradient: g("#BE123C")(145) },
    { image: face(30), title: "واجهات فنتوم", subtitle: "React / UI", borderColor: "#FB7185", gradient: g("#9F1239")(210) },
    { image: face(64), title: "بنية هيفي", subtitle: "سيرفرات ومراقبة", borderColor: "#06B6D4", gradient: g("#0E7490")(180) },
    { image: face(19), title: "باك إند رايدر", subtitle: "Node / APIs", borderColor: "#FB7185", gradient: g("#9F1239")(165) },
    { image: face(47), title: "ديف أوبس مايجور", subtitle: "CI / Docker", borderColor: "#FDA4AF", gradient: g("#BE123C")(175) },
    { image: face(22), title: "أمان شيلد", subtitle: "صلاحيات ومكافحة غش", borderColor: "#22D3EE", gradient: g("#0891B2")(155) },
    { image: face(55), title: "قواعد داتا لين", subtitle: "SQL / Redis", borderColor: "#818CF8", gradient: g("#4F46E5")(185) },
    { image: face(9), title: "فرونت ريفولف", subtitle: "تصميم نظام وتجربة", borderColor: "#FDA4AF", gradient: g("#BE123C")(160) },
    { image: face(65), title: "برمجيات لوكس", subtitle: "اختبار واختبار حمل", borderColor: "#67E8F9", gradient: g("#0E7490")(170) },
    { image: face(70), title: "سكربت شادو", subtitle: "أحداث وميزات موسمية", borderColor: "#D946EF", gradient: g("#86198F")(175) },
  ],
};

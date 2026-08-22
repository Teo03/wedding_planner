/**
 * UI copy in Macedonian and English.
 *
 * MK is the default: the catalog covers Macedonia and most couples using it
 * will read Macedonian. EN is the fallback for any key MK hasn't got yet.
 */
export const LANGUAGES = ["mk", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = {
  mk: "Македонски",
  en: "English",
};

export const en = {
  appName: "Wedding Planner",
  tagline: "Plan your wedding in Macedonia",

  nav: {
    home: "Home",
    categories: "Categories",
    vendors: "All vendors",
    planList: "Wedding Plan List",
    allCategories: "All categories",
    signIn: "Sign in",
    signOut: "Sign out",
    guests: "Guests",
    currency: "Currency",
    language: "Language",
    menu: "Menu",
    close: "Close",
    plan: "Plan",
    weddingSettings: "Wedding settings",
  },

  home: {
    heroLead:
      "Browse every kind of vendor, compare packages, and build your wedding plan as you go.",
    startPlan: "Start your plan",
    browseByCategory: "Browse by category",
    topRated: "Top rated vendors",
    seeAll: "See all",
  },

  browse: {
    title: "All vendors",
    filters: "Filters",
    allCities: "All cities",
    maxPrice: "Max price",
    search: "Search…",
    minRating: "Minimum rating",
    anyRating: "Any rating",
    ratedOnly: "Rated only",
    sortBy: "Sort by",
    sortName: "Name",
    sortRatingDesc: "Highest rated",
    sortRatingAsc: "Lowest rated",
    all: "All",
    bride: "Bride",
    groom: "Groom",
    noResults: "No vendors match these filters.",
    resultCount: "{count} vendors",
    clearFilters: "Clear filters",
    loading: "Loading…",
    page: "Page {page} of {pages}",
    prev: "Previous",
    next: "Next",
  },

  vendor: {
    packages: "Packages",
    noPackages: "No packages listed.",
    gallery: "Gallery",
    contact: "Contact",
    call: "Call {phone}",
    website: "Website",
    email: "Email",
    from: "from",
    capacity: "Capacity {min}–{max} guests",
    addToPlan: "Add to plan",
    removeFromPlan: "Remove",
    estimateFor: "Est. for {guests} guests",
    photoCredit: "Photo: {credit}",
    notFound: "Vendor not found.",
  },

  rating: {
    reviews: "Reviews",
    noRating: "No ratings yet",
    beFirst: "Be the first to review",
    googleRating: "Google rating",
    siteRating: "Member rating",
    basedOn: "based on {count} reviews",
    fromGoogle: "from Google",
    writeReview: "Write a review",
    editReview: "Edit your review",
    yourRating: "Your rating",
    reviewTitle: "Title",
    reviewBody: "Your review",
    submit: "Post review",
    saving: "Saving…",
    deleteReview: "Delete",
    noReviews: "No reviews yet.",
    yourReview: "Your review",
    ratingRequired: "Pick a rating from 1 to 5 stars.",
    signInToReview: "Sign in to leave a review.",
  },

  price: {
    fixed: "{amount} fixed",
    startingAt: "from {amount}",
    perHour: "{amount} / hour",
    perGuest: "{amount} / guest",
    fromPerGuest: "from {amount} / guest",
    tiered: "tiered pricing",
  },

  estimate: {
    priced: "Priced for {guests} guests.",
    priced_minimum:
      "Priced for {guests} guests (vendor minimum) because {requested} is below the minimum.",
    need_guests: "Enter a guest count to price this offer.",
    no_price: "No price set for this offer.",
    no_per_guest_price: "No per-guest price set.",
    no_tier: "No price tier matches {guests} guests.",
    flat_fixed: "Flat package price.",
    flat_per_hour: "Hourly rate; multiply by the number of booked hours.",
    flat_starting_at: "Starting price; final quote depends on the vendor.",
  },

  plan: {
    title: "Wedding Plan List",
    empty: "Your wedding plan list is empty",
    emptyLead: "Add packages from vendor pages to build a running estimate.",
    browseVendors: "Browse vendors",
    clear: "Clear",
    estimatedTotal: "Estimated total",
    someNeedQuote: "some items need a quote",
    remove: "Remove",
  },

  auth: {
    signIn: "Sign in",
    signUp: "Create account",
    username: "Username",
    password: "Password",
    email: "Email",
    firstName: "First name",
    lastName: "Last name",
    noAccount: "No account yet?",
    haveAccount: "Already have an account?",
    loadingAccount: "Loading account…",
    signInRequired: "Sign in to browse the catalog.",
    signingIn: "Signing in…",
    signInFailed: "Could not sign in.",
    creating: "Creating account…",
    createFailed: "Could not create the account.",
    newHere: "New here?",
    createAccount: "Create an account",
    errors: {
      usernameRequired: "Username is required.",
      emailRequired: "Email is required.",
      emailInvalid: "Enter a valid email address.",
      passwordRequired: "Password is required.",
      usernameTaken: "Username is already taken.",
      emailRegistered: "Email is already registered.",
      passwordRequirements: "Password does not meet requirements: {errors}",
      passwordTooShort:
        "This password is too short. It must contain at least {minLength} characters.",
      passwordTooCommon: "This password is too common.",
      passwordEntirelyNumeric: "This password is entirely numeric.",
      passwordTooSimilar: "This password is too similar to your account details.",
    },
  },

  footer: "Wedding vendor catalog · Macedonia",
} as const;

/** Same shape as `en`; anything missing falls back to the English string. */
export const mk: DeepPartial<typeof en> = {
  appName: "Свадбен Планер",
  tagline: "Испланирајте ја вашата свадба во Македонија",

  nav: {
    home: "Дома",
    categories: "Категории",
    vendors: "Сите понудувачи",
    planList: "Список за свадба",
    allCategories: "Сите категории",
    signIn: "Најави се",
    signOut: "Одјави се",
    guests: "Гости",
    currency: "Валута",
    language: "Јазик",
    menu: "Мени",
    close: "Затвори",
    plan: "План",
    weddingSettings: "Поставки за свадбата",
  },

  home: {
    heroLead:
      "Разгледајте ги сите видови понудувачи, споредете пакети и составете го вашиот свадбен список.",
    startPlan: "Започнете план",
    browseByCategory: "Разгледајте по категорија",
    topRated: "Најдобро оценети",
    seeAll: "Види ги сите",
  },

  browse: {
    title: "Сите понудувачи",
    filters: "Филтри",
    allCities: "Сите градови",
    maxPrice: "Макс. цена",
    search: "Пребарај…",
    minRating: "Минимална оценка",
    anyRating: "Сите оценки",
    ratedOnly: "Само оценети",
    sortBy: "Подреди по",
    sortName: "Име",
    sortRatingDesc: "Најдобро оценети",
    sortRatingAsc: "Најслабо оценети",
    all: "Сите",
    bride: "Невеста",
    groom: "Младоженец",
    noResults: "Ниту еден понудувач не одговара на филтрите.",
    resultCount: "{count} понудувачи",
    clearFilters: "Исчисти филтри",
    loading: "Се вчитува…",
    page: "Страница {page} од {pages}",
    prev: "Претходна",
    next: "Следна",
  },

  vendor: {
    packages: "Пакети",
    noPackages: "Нема објавени пакети.",
    gallery: "Галерија",
    contact: "Контакт",
    call: "Јави се на {phone}",
    website: "Веб-страница",
    email: "Е-пошта",
    from: "од",
    capacity: "Капацитет {min}–{max} гости",
    addToPlan: "Додај во список",
    removeFromPlan: "Отстрани",
    estimateFor: "Проценка за {guests} гости",
    photoCredit: "Фотографија: {credit}",
    notFound: "Понудувачот не е пронајден.",
  },

  rating: {
    reviews: "Рецензии",
    noRating: "Сè уште нема оценки",
    beFirst: "Бидете прв што ќе оцени",
    googleRating: "Google оценка",
    siteRating: "Оценка од корисници",
    basedOn: "од {count} рецензии",
    fromGoogle: "од Google",
    writeReview: "Напиши рецензија",
    editReview: "Измени ја рецензијата",
    yourRating: "Вашата оценка",
    reviewTitle: "Наслов",
    reviewBody: "Вашата рецензија",
    submit: "Објави",
    saving: "Се зачувува…",
    deleteReview: "Избриши",
    noReviews: "Сè уште нема рецензии.",
    yourReview: "Вашата рецензија",
    ratingRequired: "Изберете оценка од 1 до 5 ѕвезди.",
    signInToReview: "Најавете се за да оставите рецензија.",
  },

  price: {
    fixed: "{amount} фиксно",
    startingAt: "од {amount}",
    perHour: "{amount} / час",
    perGuest: "{amount} / гостин",
    fromPerGuest: "од {amount} / гостин",
    tiered: "цена по ранг",
  },

  estimate: {
    priced: "Цена за {guests} гости.",
    priced_minimum:
      "Цената е за {guests} гости (минимум на понудувачот), бидејќи {requested} е под минимумот.",
    need_guests: "Внесете број на гости за да се пресмета цената.",
    no_price: "Нема поставена цена за оваа понуда.",
    no_per_guest_price: "Нема поставена цена по гостин.",
    no_tier: "Нема ценовен ранг за {guests} гости.",
    flat_fixed: "Фиксна цена на пакетот.",
    flat_per_hour: "Цена по час; помножете со бројот на резервирани часови.",
    flat_starting_at: "Почетна цена; конечната понуда зависи од понудувачот.",
  },

  plan: {
    title: "Список за свадба",
    empty: "Вашиот список за свадба е празен",
    emptyLead:
      "Додајте пакети од страниците на понудувачите за да добиете проценка.",
    browseVendors: "Разгледај понудувачи",
    clear: "Исчисти",
    estimatedTotal: "Проценет вкупен износ",
    someNeedQuote: "за некои ставки треба понуда",
    remove: "Отстрани",
  },

  auth: {
    signIn: "Најави се",
    signUp: "Креирај сметка",
    username: "Корисничко име",
    password: "Лозинка",
    email: "Е-пошта",
    firstName: "Име",
    lastName: "Презиме",
    noAccount: "Немате сметка?",
    haveAccount: "Веќе имате сметка?",
    loadingAccount: "Се вчитува сметката…",
    signInRequired: "Најавете се за да го разгледате каталогот.",
    signingIn: "Се најавувате…",
    signInFailed: "Најавата не успеа.",
    creating: "Се креира сметка…",
    createFailed: "Сметката не е креирана.",
    newHere: "Немате сметка?",
    createAccount: "Креирајте сметка",
    errors: {
      usernameRequired: "Внесете корисничко име.",
      emailRequired: "Внесете е-пошта.",
      emailInvalid: "Внесете валидна е-пошта.",
      passwordRequired: "Внесете лозинка.",
      usernameTaken: "Корисничкото име е веќе зафатено.",
      emailRegistered: "Е-поштата е веќе регистрирана.",
      passwordRequirements: "Лозинката не ги исполнува условите: {errors}",
      passwordTooShort:
        "Лозинката е прекратка. Мора да содржи најмалку {minLength} знаци.",
      passwordTooCommon: "Лозинката е премногу честа.",
      passwordEntirelyNumeric: "Лозинката е составена само од бројки.",
      passwordTooSimilar:
        "Лозинката е премногу слична на податоците од вашата сметка.",
    },
  },

  footer: "Каталог на свадбени понудувачи · Македонија",
};

/** Same nesting as `en`, but leaves widen to `string`: `en` is `as const`, so
 *  without this every MK value would have to equal the English literal. */
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]>;
};

export const dictionaries = { en, mk } as const;

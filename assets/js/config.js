/** @type {AppConfig} */
export const config = {
  sheetId: "1iynju4_Vo3yKMhG_ZvmOJAywTZW_zN6Ou37F7ui7Wkc",
  refreshMs: 30_000,
  sheets: {
    sponsorship: "Sponsorship",
    expense: "Expense",
  },
  contributions: {
    csvFiles: [
      "data/contributions/Transaction_Details_Aug_2026.csv",
      "data/contributions/Transaction_Details_Sep_2026.csv",
    ],
  },
  /** Public Google Drive folder with bill screenshots */
  billsDriveUrl:
    "https://drive.google.com/drive/folders/1R8lm7ydjEs7svT9TovSGuEs19jM6F6fo?usp=sharing",
  /**
   * Shown when expenses exceed collections. Add names when ready.
   * @type {string[]}
   */
  volunteerNames: [
    "Akash",
    "Gyan",
    "Bipin",
    "Anshuman",
    "Purna",
    "Ajit",
    "Biswajit",
    "Rishav",
    "Sudhanshu",
    "Ishan",
    "Shakti",
  ],
  volunteerNote:
    "Expenses exceeded collections. The additional amount was borne by volunteers.",
  /**
   * Event gallery (Photos button). Add images under assets/images/photos/.
   * @type {{ src: string, alt: string, caption?: string }[]}
   */
  galleryPhotos: [
    {
      src: "assets/images/photos/ganesh-puja-01.jpg",
      alt: "Ganesh idol and pandal decoration for Ganesh Puja 2026",
      caption: "Ganesh Puja 2026 — pandal",
    },
    {
      src: "assets/images/photos/event-lamp-lighting.jpeg",
      alt: "Volunteers lighting the traditional lamp on stage",
      caption: "Inauguration — lamp lighting",
    },
    {
      src: "assets/images/photos/event-felicitation.jpeg",
      alt: "Volunteer honored with a ceremonial shawl on stage",
      caption: "Senior citizens felicitation",
    },
    {
      src: "assets/images/photos/event-volunteers-group.jpeg",
      alt: "Cultural committee volunteers lined up on stage",
      caption: "Senior Citizen felicitation",
    },
    {
      src: "assets/images/photos/event-shawl-ceremony.jpeg",
      alt: "Shawl presentation to a committee member during the event",
      caption: "Shawl ceremony",
    },
  ],
  /**
   * Thank-you note on the dashboard (edit volunteerNames when you have the full list).
   * @type {{ title: string, toResidents: string, toVolunteers: string, volunteerNames: string[] }}
   */
  thanks: {
    title: "Thank you",
    toResidents:
      "Heartfelt thanks to all residents of BDA Flats Konadasapura Phase 2 for your generous support, contributions, and participation. Ganesh Puja 2026 was made possible by our community coming together.",
    toVolunteers:
      "With deep gratitude to every volunteer whose time, effort, and dedication made this puja successful.",
    volunteerNames: [
      "Akash",
      "Gyan",
      "Bipin",
      "Ajit",
      "Rupesh",
      "Sudhanshu",
      "Shakti",
      "Ishan",
      "Biswajit",
      "Deepak",
      "Mahesh",
      "Rahul",
      "Aditi",
      "Arun",
      "Khushi",
      "Ashish",
      "Purna",
      "Anshuman",
      "Rishav",
      "Janmajay",
      "Prabhu",
      "Raj Gopal",
      "Saroj",
      "Rakesh",
      "Gandhi",
      "Gaurav",
      "Subas",
      "Rachit",
      "Prashant",
      "Sakshi",
      "Biswa",
      "Pramila Aunty",
      "Aditya Pathak"
    ],
  },
  /**
   * YouTube videos (Photos gallery). Add or edit titles as needed.
   * @type {{ youtubeUrl: string, title?: string }[]}
   */
  eventVideos: [
    {
      youtubeUrl: "https://youtu.be/O_KiqL6Rrfg",
      title: "Ganesh Puja 2026 — event video 1",
    },
    {
      youtubeUrl: "https://youtu.be/GF2Wy5A-TdI",
      title: "Ganesh Puja 2026 — event video 2",
    },
    {
      youtubeUrl: "https://youtu.be/zIFroIVtDbA",
      title: "Ganesh Puja 2026 — event video 3",
    },
  ],
  /** After Cloudflare Pages deploy, set this to your https://….pages.dev URL */
  publicSiteUrl: "",
  verify: {
    googleSheet:
      "https://docs.google.com/spreadsheets/d/1iynju4_Vo3yKMhG_ZvmOJAywTZW_zN6Ou37F7ui7Wkc/edit",
    bankCsvAug: "data/contributions/Transaction_Details_Aug_2026.csv",
    bankCsvSep: "data/contributions/Transaction_Details_Sep_2026.csv",
  },
};

/**
 * @typedef {{
 *   sheetId: string,
 *   refreshMs: number,
 *   sheets: { sponsorship: string, expense: string },
 *   contributions: { csvFiles: string[] },
 *   billsDriveUrl: string,
 *   volunteerNames: string[],
 *   volunteerNote: string,
 *   galleryPhotos: { src: string, alt: string, caption?: string }[],
 *   thanks: { title: string, toResidents: string, toVolunteers: string, volunteerNames: string[] },
 *   eventVideos: { youtubeUrl: string, title?: string }[],
 *   publicSiteUrl: string,
 *   verify: { googleSheet: string, bankCsvAug: string, bankCsvSep: string },
 * }} AppConfig
 */

export function sheetGvizUrl(sheetName, sheetId = config.sheetId) {
  const params = new URLSearchParams({
    tqx: "out:json",
    sheet: sheetName,
  });
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?${params}`;
}

export function sheetEditUrl(sheetId = config.sheetId) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
}

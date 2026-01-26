import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Mio Admin",
  version: packageJson.version,
  copyright: `${currentYear} Mio.`,
  meta: {
    title: "Mio Admin - Story Generation Platform",
    description:
      "Admin dashboard for Mio - the personalized audio story generation platform for children.",
  },
};

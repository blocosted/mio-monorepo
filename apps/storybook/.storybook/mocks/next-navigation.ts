// Mock for next/navigation in Storybook
export const useRouter = () => ({
  push: (url: string) => console.log("[Storybook] router.push:", url),
  replace: (url: string) => console.log("[Storybook] router.replace:", url),
  back: () => console.log("[Storybook] router.back"),
  forward: () => console.log("[Storybook] router.forward"),
  refresh: () => console.log("[Storybook] router.refresh"),
  prefetch: (url: string) => console.log("[Storybook] router.prefetch:", url),
});

export const usePathname = () => "/storybook";

export const useSearchParams = () => new URLSearchParams();

export const useParams = () => ({});

export const redirect = (url: string) => {
  console.log("[Storybook] redirect:", url);
};

export const notFound = () => {
  console.log("[Storybook] notFound");
};

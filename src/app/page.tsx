import { HomeComposition } from "@/components/home/HomeComposition";

/**
 * The public homepage.
 *
 * The composition itself lives in `HomeComposition` so the admin preview can
 * render the identical tree against draft data. Everything that makes this the
 * PUBLIC one — the hour of ISR, the anonymous database client — belongs here
 * and deliberately not there.
 */
export const revalidate = 3600;

export default async function HomePage() {
  return <HomeComposition />;
}

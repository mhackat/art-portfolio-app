/**
 * Personas used by the admin "seed demo artists" tool.
 *
 * Shared with scripts/upload-demo-artworks.ts, which reconstructs the seeded
 * usernames as `${username}_${runId}` — so the uploader never has to be told
 * who was created, only which run to target.
 */
export type DemoArtist = {
  username: string;
  displayName: string;
  bio: string;
};

export const DEMO_ARTISTS: DemoArtist[] = [
  { username: "maraellison", displayName: "Mara Ellison", bio: "Oil painter working in long, slow layers. Mostly weather." },
  { username: "tobiasreyn", displayName: "Tobias Reyn", bio: "Digital collage and printmaking. Interested in ruins." },
  { username: "ineskowalski", displayName: "Ines Kowalski", bio: "Studies of light on architecture, made mostly at dawn." },
  { username: "hollisbrant", displayName: "Hollis Brant", bio: "Abstract colour fields. I stop when it stops arguing." },
  { username: "ayofadare", displayName: "Ayo Fadare", bio: "Portraiture and pattern. Textiles keep creeping in." },
  { username: "renatavogel", displayName: "Renata Vogel", bio: "Landscapes rebuilt from memory rather than reference." },
  { username: "casparwynn", displayName: "Caspar Wynn", bio: "Ink, brush, and a lot of discarded paper." },
  { username: "delphineaubert", displayName: "Delphine Aubert", bio: "Botanical work with an unreliable sense of scale." },
  { username: "nikolaiprei", displayName: "Nikolai Prei", bio: "Machines that never existed, drawn as if documented." },
  { username: "surinakamura", displayName: "Suri Nakamura", bio: "Quiet interiors. Nothing happens, carefully." },
  { username: "odilemarchand", displayName: "Odile Marchand", bio: "Textile-led abstraction, dyed then overpainted." },
  { username: "emekanwosu", displayName: "Emeka Nwosu", bio: "Crowds, markets, motion. Painting as note-taking." },
  { username: "gretalindqvist", displayName: "Greta Lindqvist", bio: "Northern light, long winters, very few colours." },
  { username: "ravimistry", displayName: "Ravi Mistry", bio: "Geometric constructions that drift out of true on purpose." },
  { username: "junoalvarez", displayName: "Juno Alvarez", bio: "Studio still lifes assembled from things I should throw away." },
  { username: "petrahalloran", displayName: "Petra Halloran", bio: "Seascapes. I am aware this is a cliché and continue anyway." },
  { username: "anselmkoch", displayName: "Anselm Koch", bio: "Charcoal, mostly. Figures dissolving at the edges." },
  { username: "liorabenami", displayName: "Liora Ben-Ami", bio: "Desert palettes and hard shadows, worked flat." },
  { username: "tomasferreira", displayName: "Tomas Ferreira", bio: "Night scenes lit by one unreliable source." },
  { username: "wrencastellan", displayName: "Wren Castellan", bio: "Small paintings of large weather systems." },
];

/** Keeps the endpoint and the uploader in agreement about generated identities. */
export function seededUsername(base: string, runId: string): string {
  return `${base}_${runId}`;
}

export function seededEmail(base: string, runId: string, domain = "example.com"): string {
  return `${base}.${runId}@${domain}`;
}

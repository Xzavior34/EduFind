// Fetch courses from external platforms like edX and freeCodeCamp
export async function fetchEdxCourses() {
  try {
    const res = await fetch("https://www.edx.org/api/v1/catalog/search?limit=50");
    if (!res.ok) throw new Error("Failed to fetch edX courses");
    const data = await res.json();
    return data.results.map((c: any) => ({
      id: `edx-${c.key}`,
      slug: c.key,
      title: c.title,
      short_description: c.short_description || "",
      long_description: c.long_description || "",
      thumbnail_url: c.media?.image?.uri || "",
      duration_minutes: 0,
      level: c.level || "All",
      category: c.subjects?.[0]?.name || "General",
      tags: c.keywords || [],
      price: 0,
      is_free: true,
      avg_rating: 0,
      review_count: 0,
      published_at: c.start || "",
      instructor: { id: "edx", name: c.org, bio: "", avatar_url: "" }
    }));
  } catch (err) {
    console.error("fetchEdxCourses error", err);
    return [];
  }
}

export async function fetchFreeCodeCampCourses() {
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/freeCodeCamp/freeCodeCamp/main/curriculum/curriculum.json"
    );
    const data = await res.json();
    return data.map((c: any, i: number) => ({
      id: `fcc-${i}`,
      slug: `fcc-${i}`,
      title: c.name,
      short_description: c.description || "",
      long_description: c.description || "",
      thumbnail_url: "",
      duration_minutes: 0,
      level: "All",
      category: "Web Dev",
      tags: [],
      price: 0,
      is_free: true,
      avg_rating: 0,
      review_count: 0,
      published_at: "",
      instructor: { id: "fcc", name: "freeCodeCamp", bio: "", avatar_url: "" }
    }));
  } catch (err) {
    console.error("fetchFreeCodeCampCourses error", err);
    return [];
  }
                   }

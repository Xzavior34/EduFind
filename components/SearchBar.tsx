import { useState, useRef } from "react";

export default function SearchBar({ onResults }: { onResults: (courses: any[]) => void }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const timeout = useRef<NodeJS.Timeout>();

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      fetchCourses(e.target.value);
    }, 350); // Debounce for performance
  };

  const fetchCourses = async (q: string) => {
    if (!q) {
      setSuggestions([]);
      onResults([]);
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/courses?q=${encodeURIComponent(q)}&per_page=8`);
    const data = await res.json();
    setSuggestions(data.results || []);
    onResults(data.results || []);
    setLoading(false);
  };

  return (
    <div className="relative w-full max-w-lg">
      <input
        type="search"
        value={query}
        onChange={handleInput}
        placeholder="Search courses..."
        className="w-full px-4 py-2 border border-gray-300 rounded-md"
        aria-label="Search courses"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={!!suggestions.length}
        aria-controls="search-suggestions"
      />
      {loading && (
        <div className="absolute right-3 top-2 text-gray-400 animate-spin">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
        </div>
      )}
      {suggestions.length > 0 && (
        <ul
          id="search-suggestions"
          className="absolute z-10 bg-white border border-gray-200 mt-1 rounded-md w-full shadow-lg max-h-64 overflow-auto"
        >
          {suggestions.map((course) => (
            <li
              key={course.id}
              className="px-4 py-2 hover:bg-neutralBg cursor-pointer"
              onClick={() => window.location.href = `/courses/${course.slug}`}
              tabIndex={0}
              aria-label={course.title}
            >
              <span className="font-medium">{course.title}</span>
              <span className="text-xs text-gray-500 ml-2">{course.category}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

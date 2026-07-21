'use client';
import { useEffect, useState } from 'react';

interface Anime {
  id?: number;
  title: string;
  rating: number;
  episodes: number;
  genres: string[];
}

export default function Home() {
  const [trendingList, setTrendingList] = useState<Anime[]>([]);
  const [vaultList, setVaultList] = useState<Anime[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Anime[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [sortOrder, setSortOrder] = useState<'none' | 'rating-desc' | 'rating-asc'>('none');
  
  // New Genre Selection State
  const [selectedGenre, setSelectedGenre] = useState<string>('All');

  // Colors dictionary for rendering gorgeous dynamic badges
  const getGenreBadgeColor = (genre: string) => {
    const colors: { [key: string]: string } = {
      'Action': 'bg-red-500/20 text-red-300 border-red-500/30',
      'Fantasy': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      'Adventure': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      'Sci-Fi': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'Drama': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      'Comedy': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      'Mystery': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      'Suspense': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    };
    return colors[genre] || 'bg-slate-700/40 text-slate-300 border-slate-600/30';
  };

  useEffect(() => {
    // 1. Fetch live trending anime (returns 50 items with genres)
    fetch('/api/anime/trending')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTrendingList(data);
        setIsLoadingTrending(false);
      })
      .catch((err) => console.error("Error fetching trending:", err));

    // 2. Fetch user's saved vault
    fetchVault();
  }, []);

  const fetchVault = () => {
    fetch('/api/anime/vault')
      .then((res) => res.json())
      .then((data) => setVaultList(data))
      .catch((err) => console.error("Error fetching vault:", err));
  };

  // Extract all unique genres present in our trending list
  const getUniqueGenres = () => {
    const genresSet = new Set<string>();
    trendingList.forEach((anime) => {
      anime.genres?.forEach((g) => genresSet.add(g));
    });
    return ['All', ...Array.from(genresSet).sort()];
  };

  const uniqueGenres = getUniqueGenres();

  // Filter the trending list dynamically based on user selection
  const getFilteredTrending = () => {
    if (selectedGenre === 'All') return trendingList;
    return trendingList.filter((anime) => anime.genres?.includes(selectedGenre));
  };

  const filteredTrending = getFilteredTrending();

  // Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);

    try {
      const response = await fetch(`/api/anime/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setSearchResults(data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Add selected anime to Vault database
  const handleAddToVault = async (anime: Anime) => {
    try {
      const response = await fetch('/api/anime/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: anime.title,
          rating: anime.rating,
          episodes: anime.episodes,
          genres: anime.genres || [],
        }),
      });

      if (response.ok) {
        fetchVault();
      }
    } catch (error) {
      console.error("Failed to save:", error);
    }
  };

  // Sort Vault calculations
  const getSortedVault = () => {
    const list = [...vaultList];
    if (sortOrder === 'rating-desc') return list.sort((a, b) => b.rating - a.rating);
    if (sortOrder === 'rating-asc') return list.sort((a, b) => a.rating - b.rating);
    return list;
  };

  const sortedVault = getSortedVault();

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-start p-6 space-y-8">
      {/* Header */}
      <div className="text-center mt-4">
        <h1 className="text-4xl font-extrabold text-violet-400 mb-2">My Anime Vault</h1>
        <p className="text-slate-400">Divided by Genres • Real-time Sync • Advanced Collection Engine</p>
      </div>

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COMPONENT: 50 Trending Anime (7/12 layout width) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Search Card */}
          <div className="bg-slate-800 rounded-lg p-5 shadow-lg border border-slate-700">
            <h2 className="text-lg font-bold mb-4 text-violet-300">🔍 Real-time Search Engine</h2>
            <form onSubmit={handleSearch} className="flex space-x-2">
              <input
                type="text"
                placeholder="Search globally (e.g., Jujutsu Kaisen, Steins;Gate)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-slate-700/50 border border-slate-600 rounded p-2 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm"
                required
              />
              <button
                type="submit"
                className="bg-violet-600 hover:bg-violet-500 active:bg-violet-700 px-5 rounded text-sm font-bold transition shadow-md cursor-pointer"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </form>

            {/* Live Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-4 p-3 bg-slate-900/40 rounded-lg border border-slate-700 space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Search Results</h3>
                  <button onClick={() => setSearchResults([])} className="text-xs text-rose-400 hover:underline">Clear</button>
                </div>
                {searchResults.map((anime, index) => (
                  <div key={index} className="flex justify-between items-center bg-slate-700/30 p-2.5 rounded border border-slate-700">
                    <div className="max-w-[70%] space-y-1">
                      <span className="font-semibold text-white block truncate text-sm">{anime.title}</span>
                      <div className="flex flex-wrap gap-1">
                        {anime.genres?.map((g) => (
                          <span key={g} className="text-[10px] px-1.5 py-0.5 rounded border bg-slate-800 text-slate-400 border-slate-700">
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddToVault(anime)}
                      className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-xs px-3 py-1.5 rounded font-bold transition cursor-pointer"
                    >
                      ➕ Save
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Master Browsing Feed */}
          <div className="bg-slate-800 rounded-lg p-5 shadow-lg border border-slate-700 flex flex-col h-[650px]">
            <div className="border-b border-slate-700 pb-3 mb-4">
              <h2 className="text-lg font-bold text-violet-300">🔥 Live Global Database</h2>
              <p className="text-xs text-slate-400 mt-0.5">Showing 50 top-rated shows categorized dynamically</p>
            </div>

            {/* DYNAMIC GENRE NAVIGATION BAR */}
            <div className="flex overflow-x-auto space-x-2 pb-3 mb-4 scrollbar-thin scrollbar-thumb-slate-700">
              {uniqueGenres.map((genre) => (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={`text-xs px-3 py-1.5 rounded-full font-bold transition flex-shrink-0 cursor-pointer ${
                    selectedGenre === genre
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
                  }`}
                >
                  {genre} {genre !== 'All' ? `(${trendingList.filter(a => a.genres?.includes(genre)).length})` : ''}
                </button>
              ))}
            </div>

            {/* Scrollable Categorized List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
              {isLoadingTrending ? (
                <div className="text-center text-slate-500 text-sm mt-20 animate-pulse">
                  Querying genres and fetching 50 trending anime...
                </div>
              ) : filteredTrending.length === 0 ? (
                <p className="text-slate-500 text-center text-sm mt-12">No anime found in this genre categorization.</p>
              ) : (
                filteredTrending.map((anime, index) => (
                  <div key={index} className="flex justify-between items-center bg-slate-700/20 p-3.5 rounded-md border border-slate-700/40 hover:border-slate-600 transition">
                    <div className="max-w-[70%] space-y-1.5">
                      <span className="font-semibold text-white block truncate text-sm">{anime.title}</span>
                      
                      {/* Active Badges */}
                      <div className="flex flex-wrap gap-1">
                        {anime.genres?.map((g) => (
                          <span key={g} className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${getGenreBadgeColor(g)}`}>
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 flex-shrink-0">
                      <span className="text-xs font-bold text-amber-400">⭐ {anime.rating}</span>
                      <button
                        onClick={() => handleAddToVault(anime)}
                        className="bg-slate-700 hover:bg-violet-600 text-white text-xs px-2.5 py-1.5 rounded font-bold transition cursor-pointer"
                      >
                        ➕ Save
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COMPONENT: Personal Saved Vault (5/12 layout width) */}
        <div className="lg:col-span-5 bg-slate-800 rounded-lg p-5 shadow-lg border border-slate-700 flex flex-col h-[820px]">
          <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
            <div>
              <h2 className="text-lg font-bold text-violet-300">⭐ Your Personal Vault</h2>
              <p className="text-xs text-slate-400 mt-0.5">Locally stored collection ({vaultList.length} total)</p>
            </div>
            
            {/* Sorting Toggles */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">Sort:</span>
              <button
                onClick={() => setSortOrder(sortOrder === 'rating-desc' ? 'none' : 'rating-desc')}
                className={`text-xs px-2.5 py-1 rounded font-semibold border transition ${
                  sortOrder === 'rating-desc' 
                    ? 'bg-violet-600 border-violet-500 text-white shadow-md' 
                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                }`}
              >
                ⭐ High
              </button>
              <button
                onClick={() => setSortOrder(sortOrder === 'rating-asc' ? 'none' : 'rating-asc')}
                className={`text-xs px-2.5 py-1 rounded font-semibold border transition ${
                  sortOrder === 'rating-asc' 
                    ? 'bg-violet-600 border-violet-500 text-white shadow-md' 
                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                }`}
              >
                ⭐ Low
              </button>
            </div>
          </div>

          {/* Saved Vault Scroll Area */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
            {sortedVault.length === 0 ? (
              <p className="text-slate-500 text-center text-sm mt-12">Your Vault is currently empty.</p>
            ) : (
              sortedVault.map((anime) => (
                <div key={anime.id} className="bg-slate-700/40 p-3.5 rounded-md border border-slate-700 hover:border-slate-600 transition flex flex-col space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-white block text-sm max-w-[80%] leading-tight">{anime.title}</span>
                    <span className="bg-violet-600/20 text-violet-300 border border-violet-500/30 text-xs px-2 py-0.5 rounded font-bold">
                      ⭐ {anime.rating}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-slate-400">{anime.episodes} Episodes</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {anime.genres?.map((g) => (
                        <span key={g} className="text-[9px] px-1 py-0.2 bg-slate-800 text-slate-400 border border-slate-700 rounded">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}